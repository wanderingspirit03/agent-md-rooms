export interface AppendLogSequenceGate {
  expectedSeq: number;
  halted: boolean;
}

export type AppendLogSequenceResult =
  | { ok: true; nextExpectedSeq: number }
  | { ok: false; message: string };

export function createAppendLogSequenceGate(startSeq = 1): AppendLogSequenceGate {
  return {
    expectedSeq: startSeq,
    halted: false,
  };
}

export function acceptAppendLogRecordSequence(
  gate: AppendLogSequenceGate,
  seq: unknown,
): AppendLogSequenceResult {
  if (gate.halted) {
    return {
      ok: false,
      message: `Append-log replay is halted after a previous sequence error. Expected ${gate.expectedSeq}.`,
    };
  }

  if (!Number.isSafeInteger(seq) || typeof seq !== "number" || seq < 1) {
    gate.halted = true;
    return {
      ok: false,
      message: `Received invalid append-log sequence ${String(seq)}.`,
    };
  }

  if (seq !== gate.expectedSeq) {
    gate.halted = true;
    return {
      ok: false,
      message: `Missing, duplicate, or reordered append-log record. Expected ${gate.expectedSeq}, received ${seq}.`,
    };
  }

  gate.expectedSeq += 1;
  return {
    ok: true,
    nextExpectedSeq: gate.expectedSeq,
  };
}
