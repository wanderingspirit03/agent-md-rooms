import type { CommandContext } from '@stricli/core';
import type { ExportResult, PatchResult, PublishResult, StatusResult } from './results.js';

export function writeJson(context: CommandContext, value: unknown): void {
  context.process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function writePublishHuman(context: CommandContext, result: PublishResult): void {
  context.process.stdout.write([
    '✓ Published encrypted Markdown room',
    `→ Room URL: ${result.room.url}`,
    `→ Token: ${result.room.token}`,
    `→ Server records: ${result.server.recordCount}`,
    result.metadata.saved
      ? `→ Saved metadata: ${result.metadata.path}`
      : '→ Metadata not saved (--no-save)',
    '',
  ].join('\n'));
}

export function writeExportHuman(context: CommandContext, result: ExportResult): void {
  if (result.output.written) {
    context.process.stdout.write([
      `✓ Exported Markdown to ${result.output.path}`,
      `→ Source room: ${result.room.serverRoomUrl}`,
      `→ Server records: ${result.server.recordCount}`,
      '',
    ].join('\n'));
    return;
  }

  context.process.stdout.write(result.document.markdown);
}

export function writeStatusHuman(context: CommandContext, result: StatusResult): void {
  context.process.stdout.write([
    result.metadata.found ? '✓ Local room metadata found' : '⚠ Local room metadata not found',
    `→ Room: ${result.room.serverRoomUrl}`,
    `→ Metadata: ${result.metadata.path}`,
    result.document ? `→ Markdown bytes: ${result.document.bytes}` : '→ Markdown bytes: unknown',
    `→ Server records: ${result.server.recordCount}`,
    '',
  ].join('\n'));
}

export function writePatchHuman(context: CommandContext, result: PatchResult): void {
  context.process.stdout.write([
    '✓ Submitted encrypted patch suggestion',
    `→ Room: ${result.room.serverRoomUrl}`,
    `→ Suggestion: ${result.suggestion.id}`,
    `→ Base: ${result.base.sha256}`,
    `→ Proposed: ${result.proposed.sha256}`,
    `→ Server records: ${result.server.recordCount}`,
    '',
  ].join('\n'));
}
