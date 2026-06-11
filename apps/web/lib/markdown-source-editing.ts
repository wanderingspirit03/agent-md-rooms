export interface MarkdownEditResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

type IndentDirection = "indent" | "outdent";

interface EditedLine {
  start: number;
  end: number;
  delta: number;
  removedPrefix: number;
}

export function editMarkdownIndentation(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  direction: IndentDirection,
): MarkdownEditResult {
  const start = clampPosition(selectionStart, value.length);
  const end = clampPosition(selectionEnd, value.length);
  const normalizedStart = Math.min(start, end);
  const normalizedEnd = Math.max(start, end);
  const blockStart = value.lastIndexOf("\n", Math.max(0, normalizedStart - 1)) + 1;
  const adjustedEnd = normalizedEnd > normalizedStart && value[normalizedEnd - 1] === "\n"
    ? normalizedEnd - 1
    : normalizedEnd;
  const nextBreak = value.indexOf("\n", adjustedEnd);
  const blockEnd = nextBreak === -1 ? value.length : nextBreak;
  const block = value.slice(blockStart, blockEnd);
  const lines = block.split("\n");
  const editedLines: EditedLine[] = [];
  let offset = blockStart;

  const editedBlock = lines.map((line) => {
    const lineStart = offset;
    const lineEnd = lineStart + line.length;
    offset = lineEnd + 1;

    if (direction === "indent") {
      editedLines.push({ start: lineStart, end: lineEnd, delta: 2, removedPrefix: 0 });
      return `  ${line}`;
    }

    const removedPrefix = line.startsWith("\t") ? 1 : Math.min(line.match(/^ {1,2}/)?.[0].length ?? 0, 2);
    editedLines.push({ start: lineStart, end: lineEnd, delta: -removedPrefix, removedPrefix });
    return removedPrefix > 0 ? line.slice(removedPrefix) : line;
  }).join("\n");

  const nextValue = `${value.slice(0, blockStart)}${editedBlock}${value.slice(blockEnd)}`;
  const collapsed = normalizedStart === normalizedEnd;

  return {
    value: nextValue,
    selectionStart: translatePosition(normalizedStart, editedLines, direction, collapsed),
    selectionEnd: translatePosition(normalizedEnd, editedLines, direction, collapsed),
  };
}

function translatePosition(
  position: number,
  editedLines: EditedLine[],
  direction: IndentDirection,
  collapsed: boolean,
) {
  let deltaBefore = 0;

  for (const line of editedLines) {
    if (position < line.start) break;
    if (position > line.end) {
      deltaBefore += line.delta;
      continue;
    }

    if (direction === "indent") {
      return position + deltaBefore + (position > line.start || collapsed ? line.delta : 0);
    }

    const offsetIntoLine = Math.max(0, position - line.start);
    return position + deltaBefore - Math.min(line.removedPrefix, offsetIntoLine);
  }

  return position + deltaBefore;
}

function clampPosition(position: number, max: number) {
  if (Number.isNaN(position)) return 0;
  return Math.max(0, Math.min(max, position));
}
