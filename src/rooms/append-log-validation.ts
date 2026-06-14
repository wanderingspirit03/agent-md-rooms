import type { EncryptedUpdateRecord } from '../server/append-log.js';

export function assertContiguousRecords(records: EncryptedUpdateRecord[], roomId: string): void {
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
