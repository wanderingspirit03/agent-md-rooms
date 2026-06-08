export interface MarkdownProperties {
  content: string;
  propertySource: string;
  properties: Array<{ key: string; value: string }>;
}

export function extractMarkdownProperties(markdown: string): MarkdownProperties {
  const frontmatterMatch = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(markdown);
  if (frontmatterMatch) {
    return {
      content: markdown.slice(frontmatterMatch[0].length),
      propertySource: frontmatterMatch[0],
      properties: parsePropertyLines(frontmatterMatch[1]),
    };
  }

  const lines = markdown.split("\n");
  const propertyLines: string[] = [];
  let index = 0;
  while (index < lines.length && /^[A-Za-z0-9_-]+:\s+.+/.test(lines[index])) {
    propertyLines.push(lines[index]);
    index += 1;
  }

  if (propertyLines.length >= 2) {
    const contentStart = lines[index]?.trim() === "" ? index + 1 : index;
    return {
      content: lines.slice(contentStart).join("\n"),
      propertySource: `${propertyLines.join("\n")}\n\n`,
      properties: parsePropertyLines(propertyLines.join("\n")),
    };
  }

  return { content: markdown, propertySource: "", properties: [] };
}

function parsePropertyLines(value: string) {
  return value
    .split("\n")
    .map((line) => {
      const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());
      if (!match) return null;
      return { key: match[1], value: match[2] };
    })
    .filter((property): property is { key: string; value: string } => Boolean(property));
}
