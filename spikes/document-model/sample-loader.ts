import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface MarkdownSample {
  name: string;
  path: string;
  markdown: string;
}

export const MARKDOWN_SAMPLE_NAMES = [
  'agent-plan.md',
  'code-report.md',
  'rich-agent-output.md',
  'long-agent-handoff.md',
] as const;

export type MarkdownSampleName = typeof MARKDOWN_SAMPLE_NAMES[number];

export async function loadMarkdownSamples(): Promise<MarkdownSample[]> {
  return Promise.all(MARKDOWN_SAMPLE_NAMES.map(async (name) => {
    const path = join('spikes/document-model/samples', name);
    return {
      name,
      path,
      markdown: await readFile(path, 'utf8'),
    };
  }));
}

export function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, '\n');
}
