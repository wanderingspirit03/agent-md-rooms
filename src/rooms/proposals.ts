import { randomUUID } from 'node:crypto';
import type { EncryptedUpdateRecord, IncomingEncryptedUpdate } from '../server/append-log.js';
import type { MarkdownDocumentSummary } from './markdown-snapshot.js';
import { summarizeMarkdown } from './markdown-snapshot.js';
import { assignPersona, type RoomPersona } from './personas.js';
import type { RoomAccess } from './room-reference.js';
import {
  normalizeProjectSnapshot,
  type ProjectSnapshot,
  summarizeProject,
  type ProjectSummary,
} from './project-state.js';
import {
  createTimelineEvent,
  encryptJsonRecord,
  decryptTimelineEvent,
  decryptJsonRecord,
  TIMELINE_EVENT_SENDER_ID_PREFIX,
  type TimelineEvent,
} from './timeline.js';
import {
  CLI_COMMENT_EVENT_SENDER_ID_PREFIX,
  COMMENT_EVENT_SENDER_ID_PREFIX,
  type CommentReply,
} from './comments.js';

export const PROPOSAL_SCHEMA = 'fold.proposal.v1';
export const PROPOSAL_SENDER_ID_PREFIX = 'fold-cli:proposal';
export const DEFAULT_AGENT_PARTICIPANT_FINGERPRINT = 'fold-cli:proposal';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected';

export interface ProposalRecord {
  schema: typeof PROPOSAL_SCHEMA;
  id: string;
  kind: 'whole-document-replacement' | 'file-replacement' | 'project-replacement';
  createdAt: string;
  updatedAt: string;
  title: string;
  comment: string;
  authorKind: 'agent';
  authorPersonaId: string;
  persona: RoomPersona;
  baseVersionId: string;
  base: MarkdownDocumentSummary;
  proposed: MarkdownDocumentSummary & {
    markdown: string;
  };
  proposedMarkdown: string;
  baseProject?: ProjectSummary;
  proposedProject?: ProjectSnapshot;
  path?: string;
  diff: string;
  discussionThreadIds: string[];
}

export interface ProposalView extends ProposalRecord {
  status: ProposalStatus;
  statusUpdatedAt: string;
  replies?: CommentReply[];
}

export interface ProposalReplay {
  proposals: ProposalView[];
  timeline: TimelineEvent[];
}

export interface CreateEncryptedProposalOptions {
  access: RoomAccess;
  baseMarkdown: string;
  proposedMarkdown: string;
  baseProject?: ProjectSnapshot;
  proposedProject?: ProjectSnapshot;
  path?: string;
  title?: string;
  comment?: string;
  participantFingerprint?: string;
}

export async function createEncryptedProposalRecord(
  options: CreateEncryptedProposalOptions,
): Promise<{ update: IncomingEncryptedUpdate; proposal: ProposalView; timelineEvent: TimelineEvent }> {
  const createdAt = new Date().toISOString();
  const id = randomUUID();
  const base = summarizeMarkdown(options.baseMarkdown);
  const proposed = summarizeMarkdown(options.proposedMarkdown);
  const proposedProject = options.proposedProject ? normalizeProjectSnapshot(options.proposedProject) : undefined;
  const baseProject = options.baseProject ? summarizeProject(options.baseProject) : undefined;
  const persona = assignPersona({
    roomId: options.access.roomId,
    participantKind: 'agent',
    participantFingerprint: options.participantFingerprint ?? DEFAULT_AGENT_PARTICIPANT_FINGERPRINT,
  });
  const record: ProposalRecord = {
    schema: PROPOSAL_SCHEMA,
    id,
    kind: proposedProject
      ? (options.path ? 'file-replacement' : 'project-replacement')
      : 'whole-document-replacement',
    createdAt,
    updatedAt: createdAt,
    title: options.title ?? defaultProposalTitle(options.baseMarkdown, options.proposedMarkdown),
    comment: options.comment ?? '',
    authorKind: 'agent',
    authorPersonaId: persona.id,
    persona,
    baseVersionId: base.sha256,
    base,
    proposed: {
      ...proposed,
      markdown: options.proposedMarkdown,
    },
    proposedMarkdown: options.proposedMarkdown,
    baseProject,
    proposedProject,
    path: options.path,
    diff: proposedProject && options.baseProject
      ? projectDiff(options.baseProject, proposedProject)
      : wholeDocumentDiff(options.baseMarkdown, options.proposedMarkdown),
    discussionThreadIds: [],
  };
  const timelineEvent = createTimelineEvent({
    idSeed: `proposal:${id}`,
    type: 'proposal_submitted',
    createdAt,
    actorPersonaId: persona.id,
    proposalId: id,
    documentSha256: record.proposed.sha256,
    message: record.title,
  });
  const proposal: ProposalView = {
    ...record,
    status: 'pending',
    statusUpdatedAt: createdAt,
  };

  return {
    update: await encryptJsonRecord(options.access, `${PROPOSAL_SENDER_ID_PREFIX}:${randomUUID()}`, record),
    proposal,
    timelineEvent,
  };
}

export async function createProposalAcceptedEvent(
  access: RoomAccess,
  proposal: Pick<ProposalView, 'id' | 'proposed' | 'title'>,
  documentSha256: string,
  actorPersonaId: string,
): Promise<IncomingEncryptedUpdate> {
  const event = createTimelineEvent({
    idSeed: `proposal:${proposal.id}:accepted`,
    type: 'proposal_accepted',
    actorPersonaId,
    proposalId: proposal.id,
    documentSha256,
    message: `Accepted ${proposal.title}`,
  });
  return encryptJsonRecord(access, `${TIMELINE_EVENT_SENDER_ID_PREFIX}:${event.id}`, event);
}

export async function createProposalRejectedEvent(
  access: RoomAccess,
  proposal: Pick<ProposalView, 'id' | 'title'>,
  actorPersonaId: string,
  reason?: string,
): Promise<IncomingEncryptedUpdate> {
  const event = createTimelineEvent({
    idSeed: `proposal:${proposal.id}:rejected`,
    type: 'proposal_rejected',
    actorPersonaId,
    proposalId: proposal.id,
    documentSha256: null,
    message: reason ? `Rejected ${proposal.title}: ${reason}` : `Rejected ${proposal.title}`,
  });
  return encryptJsonRecord(access, `${TIMELINE_EVENT_SENDER_ID_PREFIX}:${event.id}`, event);
}

export async function replayProposalsFromRecords(
  access: RoomAccess,
  records: EncryptedUpdateRecord[],
): Promise<ProposalReplay> {
  assertContiguousRecords(records, access.roomId);
  const proposals = new Map<string, ProposalView>();
  const timeline: TimelineEvent[] = [];

  for (const record of records) {
    if (record.senderId.startsWith(PROPOSAL_SENDER_ID_PREFIX)) {
      const proposal = await decryptProposalRecord(access, record, record.senderId);
      if (proposals.has(proposal.id)) continue;
      proposals.set(proposal.id, {
        ...proposal,
        status: 'pending',
        statusUpdatedAt: proposal.updatedAt,
        replies: [],
      });
      continue;
    }

    if (isProposalDiscussionEventSender(record.senderId)) {
      const event = await decryptJsonRecord(access, record, record.senderId);
      if (!isProposalReplyEvent(event)) continue;
      const current = proposals.get(event.proposalId);
      if (!current) continue;
      const replies = current.replies || [];
      if (replies.some((reply) => reply.id === event.reply.id)) continue;
      proposals.set(current.id, {
        ...current,
        replies: [...replies, event.reply].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
      });
      continue;
    }

    if (!record.senderId.startsWith(TIMELINE_EVENT_SENDER_ID_PREFIX)) continue;
    const event = await decryptTimelineEvent(access, record, record.senderId);
    timeline.push(event);
    if (!event.proposalId) continue;

    const current = proposals.get(event.proposalId);
    if (!current || current.status !== 'pending') continue;
    if (event.type === 'proposal_accepted') {
      proposals.set(current.id, {
        ...current,
        status: 'accepted',
        statusUpdatedAt: event.createdAt,
      });
    } else if (event.type === 'proposal_rejected') {
      proposals.set(current.id, {
        ...current,
        status: 'rejected',
        statusUpdatedAt: event.createdAt,
      });
    }
  }

  return {
    proposals: [...proposals.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    timeline: timeline.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
  };
}

function isProposalDiscussionEventSender(senderId: string) {
  return senderId.startsWith(COMMENT_EVENT_SENDER_ID_PREFIX) || senderId.startsWith(CLI_COMMENT_EVENT_SENDER_ID_PREFIX);
}

function isProposalReplyEvent(value: unknown): value is { type: 'proposal_replied'; proposalId: string; reply: CommentReply } {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { type?: unknown; proposalId?: unknown; reply?: Partial<CommentReply> };
  const reply = candidate.reply;
  return candidate.type === 'proposal_replied'
    && typeof candidate.proposalId === 'string'
    && Boolean(reply)
    && typeof reply?.id === 'string'
    && typeof reply.authorPersonaId === 'string'
    && reply.persona?.schema === 'fold.persona.v1'
    && typeof reply.text === 'string'
    && typeof reply.createdAt === 'string';
}

export async function decryptProposalRecord(
  access: RoomAccess,
  payload: Pick<EncryptedUpdateRecord, 'nonce' | 'ciphertext'>,
  senderId: string,
): Promise<ProposalRecord> {
  const value = await decryptJsonRecord(access, payload, senderId);
  if (!isProposalRecord(value)) {
    throw new Error('Invalid encrypted proposal payload');
  }
  return value;
}

function wholeDocumentDiff(baseMarkdown: string, proposedMarkdown: string): string {
  if (baseMarkdown === proposedMarkdown) return '';
  return [
    '--- current.md',
    '+++ proposed.md',
    '@@ whole-document-replacement @@',
    ...baseMarkdown.split('\n').map((line) => `-${line}`),
    ...proposedMarkdown.split('\n').map((line) => `+${line}`),
  ].join('\n');
}

function defaultProposalTitle(baseMarkdown: string, proposedMarkdown: string): string {
  const baseLines = lineCount(baseMarkdown);
  const proposedLines = lineCount(proposedMarkdown);
  return `Whole-document proposal (${baseLines} lines -> ${proposedLines} lines)`;
}

function lineCount(markdown: string): number {
  if (!markdown) return 0;
  return markdown.split('\n').length;
}

function isProposalRecord(value: unknown): value is ProposalRecord {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ProposalRecord>;
  return (
    candidate.schema === PROPOSAL_SCHEMA &&
    (
      candidate.kind === 'whole-document-replacement' ||
      candidate.kind === 'file-replacement' ||
      candidate.kind === 'project-replacement'
    ) &&
    typeof candidate.id === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.comment === 'string' &&
    candidate.authorKind === 'agent' &&
    typeof candidate.authorPersonaId === 'string' &&
    Boolean(candidate.persona) &&
    typeof candidate.persona?.id === 'string' &&
    typeof candidate.baseVersionId === 'string' &&
    Boolean(candidate.base) &&
    typeof candidate.base?.sha256 === 'string' &&
    Boolean(candidate.proposed) &&
    typeof candidate.proposed?.sha256 === 'string' &&
    typeof candidate.proposed?.markdown === 'string' &&
    typeof candidate.proposedMarkdown === 'string' &&
    (candidate.path === undefined || typeof candidate.path === 'string') &&
    (candidate.baseProject === undefined || typeof candidate.baseProject.sha256 === 'string') &&
    (candidate.proposedProject === undefined || Array.isArray(candidate.proposedProject.files)) &&
    typeof candidate.diff === 'string' &&
    Array.isArray(candidate.discussionThreadIds)
  );
}

function projectDiff(baseProject: ProjectSnapshot, proposedProject: ProjectSnapshot): string {
  const base = new Map(normalizeProjectSnapshot(baseProject).files.map((file) => [file.path, file.markdown]));
  const proposed = new Map(normalizeProjectSnapshot(proposedProject).files.map((file) => [file.path, file.markdown]));
  const paths = [...new Set([...base.keys(), ...proposed.keys()])].sort();
  const lines: string[] = [];
  for (const path of paths) {
    const before = base.get(path);
    const after = proposed.get(path);
    if (before === after) continue;
    lines.push(`--- ${path}`);
    lines.push(`+++ ${path}`);
    lines.push('@@ file-replacement @@');
    if (before !== undefined) lines.push(...before.split('\n').map((line) => `-${line}`));
    if (after !== undefined) lines.push(...after.split('\n').map((line) => `+${line}`));
  }
  return lines.join('\n');
}

function assertContiguousRecords(records: EncryptedUpdateRecord[], roomId: string): void {
  let expectedSeq = 1;
  for (const record of records) {
    if (record.roomId !== roomId) {
      throw new Error(`Received update for unexpected room ${JSON.stringify(record.roomId)}`);
    }
    if (!Number.isSafeInteger(record.seq) || record.seq < 1) {
      throw new Error(`Received invalid append-log sequence ${record.seq}`);
    }
    if (record.seq !== expectedSeq) {
      throw new Error(`Detected missing, duplicate, or reordered append-log sequence ${record.seq}; expected ${expectedSeq}`);
    }
    expectedSeq += 1;
  }
}
