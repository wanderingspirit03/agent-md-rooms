import type { EncryptedUpdateRecord } from '../server/append-log.js';
import { replayCommentsFromRecords, type RoomComment } from './comments.js';
import { decryptProjectSnapshotsFromRecords, type ProjectSnapshot } from './project-state.js';
import { replayProposalsFromRecords, type ProposalReplay } from './proposals.js';
import type { RoomAccess } from './room-reference.js';
import { decryptTimelineEventsFromRecords, type TimelineEvent } from './timeline.js';

export interface RoomReplay {
  projectSnapshots: ProjectSnapshot[];
  proposals: ProposalReplay;
  comments: RoomComment[];
  timeline: TimelineEvent[];
}

export async function replayRoomRecords(
  access: RoomAccess,
  records: EncryptedUpdateRecord[],
): Promise<RoomReplay> {
  const [projectSnapshots, proposals, comments, timeline] = await Promise.all([
    decryptProjectSnapshotsFromRecords(access, records),
    replayProposalsFromRecords(access, records),
    replayCommentsFromRecords(access, records),
    decryptTimelineEventsFromRecords(access, records),
  ]);

  return {
    projectSnapshots,
    proposals,
    comments,
    timeline,
  };
}
