import { describe, expect, it } from "vitest";
import { editMarkdownIndentation } from "../../apps/web/lib/markdown-source-editing.js";

describe("editMarkdownIndentation", () => {
  it("indents the current line when the selection is collapsed", () => {
    const result = editMarkdownIndentation("- item", 2, 2, "indent");

    expect(result.value).toBe("  - item");
    expect(result.selectionStart).toBe(4);
    expect(result.selectionEnd).toBe(4);
  });

  it("indents every selected line without swallowing the next line", () => {
    const source = "- one\n- two\n- three";
    const result = editMarkdownIndentation(source, 0, "- one\n- two\n".length, "indent");

    expect(result.value).toBe("  - one\n  - two\n- three");
    expect(result.selectionStart).toBe(0);
    expect(result.selectionEnd).toBe("  - one\n  - two\n".length);
  });

  it("outdents selected Markdown lines by spaces or tabs", () => {
    const source = "  - one\n\t- two\n- three";
    const result = editMarkdownIndentation(source, 0, "  - one\n\t- two".length, "outdent");

    expect(result.value).toBe("- one\n- two\n- three");
    expect(result.selectionStart).toBe(0);
    expect(result.selectionEnd).toBe("- one\n- two".length);
  });

  it("does not move a cursor before the start of a partially outdented line", () => {
    const result = editMarkdownIndentation("  nested", 1, 1, "outdent");

    expect(result.value).toBe("nested");
    expect(result.selectionStart).toBe(0);
    expect(result.selectionEnd).toBe(0);
  });
});
