import { describe, expect, it } from "vitest";

import {
  acceptAppendLogRecordSequence,
  createAppendLogSequenceGate,
} from "../../apps/web/lib/append-log-sequence.js";

describe("append-log sequence gate", () => {
  it("accepts contiguous records", () => {
    const gate = createAppendLogSequenceGate();

    expect(acceptAppendLogRecordSequence(gate, 1)).toEqual({ ok: true, nextExpectedSeq: 2 });
    expect(acceptAppendLogRecordSequence(gate, 2)).toEqual({ ok: true, nextExpectedSeq: 3 });
    expect(acceptAppendLogRecordSequence(gate, 3)).toEqual({ ok: true, nextExpectedSeq: 4 });
  });

  it("halts on missing records", () => {
    const gate = createAppendLogSequenceGate();

    expect(acceptAppendLogRecordSequence(gate, 1).ok).toBe(true);
    const result = acceptAppendLogRecordSequence(gate, 3);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("Expected 2, received 3");
    expect(gate.halted).toBe(true);
  });

  it("halts on duplicate records", () => {
    const gate = createAppendLogSequenceGate();

    expect(acceptAppendLogRecordSequence(gate, 1).ok).toBe(true);
    const result = acceptAppendLogRecordSequence(gate, 1);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("Expected 2, received 1");
    expect(gate.halted).toBe(true);
  });

  it("refuses later records after halting", () => {
    const gate = createAppendLogSequenceGate();

    expect(acceptAppendLogRecordSequence(gate, 3).ok).toBe(false);
    const result = acceptAppendLogRecordSequence(gate, 1);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("replay is halted");
  });

  it("halts on invalid sequence values", () => {
    const gate = createAppendLogSequenceGate();

    expect(acceptAppendLogRecordSequence(gate, 0).ok).toBe(false);
    expect(gate.halted).toBe(true);
  });
});
