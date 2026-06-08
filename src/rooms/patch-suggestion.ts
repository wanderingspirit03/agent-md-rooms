import { createHash } from 'node:crypto';
import {
  decryptUpdate,
  deriveRoomKey,
  encryptUpdate,
  type EncryptedPayload,
} from '../../spikes/e2ee-yjs-append-log/crypto.js';
import type { IncomingEncryptedUpdate } from '../../spikes/e2ee-yjs-append-log/server.js';
import type { MarkdownDocumentSummary } from './markdown-snapshot.js';
import {
  SUGGESTION_UPDATE_SENDER_ID_PREFIX,
  summarizeMarkdown,
} from './markdown-snapshot.js';
import type { RoomAccess } from './room-reference.js';

export const PATCH_SUGGESTION_KIND = 'whole-document-replacement';
export const PATCH_SUGGESTION_SCHEMA = 'fold.patch-suggestion.v1';

export interface PatchSuggestion {
  schema: typeof PATCH_SUGGESTION_SCHEMA;
  kind: typeof PATCH_SUGGESTION_KIND;
  id: string;
  createdAt: string;
  baseSha256: string;
  proposed: MarkdownDocumentSummary & {
    markdown: string;
  };
  summary: string;
}

export interface EncryptedPatchSuggestion extends EncryptedPayload {
  senderId: string;
  suggestion: {
    id: string;
    kind: typeof PATCH_SUGGESTION_KIND;
    baseSha256: string;
    proposedSha256: string;
  };
}

export async function createEncryptedPatchSuggestion(
  access: RoomAccess,
  baseMarkdown: string,
  proposedMarkdown: string,
  summary?: string,
): Promise<{ update: IncomingEncryptedUpdate; suggestion: EncryptedPatchSuggestion }> {
  const suggestionId = suggestionIdFor(baseMarkdown, proposedMarkdown);
  const senderId = `${SUGGESTION_UPDATE_SENDER_ID_PREFIX}:${suggestionId}`;
  const patch: PatchSuggestion = {
    schema: PATCH_SUGGESTION_SCHEMA,
    kind: PATCH_SUGGESTION_KIND,
    id: suggestionId,
    createdAt: new Date().toISOString(),
    baseSha256: summarizeMarkdown(baseMarkdown).sha256,
    proposed: {
      ...summarizeMarkdown(proposedMarkdown),
      markdown: proposedMarkdown,
    },
    summary: summary ?? defaultPatchSummary(baseMarkdown, proposedMarkdown),
  };

  const roomKey = await deriveRoomKey(access.roomId, access.roomSecret);
  const encrypted = await encryptUpdate(Buffer.from(JSON.stringify(patch), 'utf8'), roomKey, {
    roomId: access.roomId,
    senderId,
  });

  return {
    update: {
      senderId,
      ...encrypted,
    },
    suggestion: {
      senderId,
      ...encrypted,
      suggestion: {
        id: suggestionId,
        kind: PATCH_SUGGESTION_KIND,
        baseSha256: patch.baseSha256,
        proposedSha256: patch.proposed.sha256,
      },
    },
  };
}

export async function decryptPatchSuggestion(
  access: RoomAccess,
  payload: EncryptedPayload,
  senderId: string,
): Promise<PatchSuggestion> {
  const roomKey = await deriveRoomKey(access.roomId, access.roomSecret);
  const bytes = await decryptUpdate(payload, roomKey, {
    roomId: access.roomId,
    senderId,
  });
  const parsed = JSON.parse(Buffer.from(bytes).toString('utf8')) as unknown;
  if (!isPatchSuggestion(parsed)) {
    throw new Error('Invalid encrypted patch suggestion payload');
  }
  return parsed;
}

function suggestionIdFor(baseMarkdown: string, proposedMarkdown: string): string {
  return createHash('sha256')
    .update(baseMarkdown)
    .update('\0')
    .update(proposedMarkdown)
    .digest('hex')
    .slice(0, 24);
}

function defaultPatchSummary(baseMarkdown: string, proposedMarkdown: string): string {
  const baseLines = lineCount(baseMarkdown);
  const proposedLines = lineCount(proposedMarkdown);
  return `Whole-document replacement (${baseLines} lines -> ${proposedLines} lines)`;
}

function lineCount(markdown: string): number {
  if (!markdown) return 0;
  return markdown.split('\n').length;
}

function isPatchSuggestion(value: unknown): value is PatchSuggestion {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PatchSuggestion>;
  return (
    candidate.schema === PATCH_SUGGESTION_SCHEMA &&
    candidate.kind === PATCH_SUGGESTION_KIND &&
    typeof candidate.id === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.baseSha256 === 'string' &&
    typeof candidate.summary === 'string' &&
    Boolean(candidate.proposed) &&
    typeof candidate.proposed?.markdown === 'string' &&
    typeof candidate.proposed?.sha256 === 'string' &&
    typeof candidate.proposed?.bytes === 'number'
  );
}
