import type { MarkdownDocumentSummary } from '../rooms/markdown-snapshot.js';

export interface PublicRoomResult {
  roomId: string;
  serverUrl: string;
  serverRoomUrl: string;
  url: string;
  token: string;
  hasClientKey: true;
}

export interface MetadataResult {
  path: string;
  saved: boolean;
}

export interface PublishResult {
  schema: 'mdroom.publish.result.v1';
  ok: true;
  mode: 'server-backed';
  room: PublicRoomResult;
  metadata: MetadataResult;
  document: MarkdownDocumentSummary;
  server: {
    recordCount: number;
    latestSeq: number;
  };
}

export interface ExportResult {
  schema: 'mdroom.export.result.v1';
  ok: true;
  mode: 'server-backed';
  room: PublicRoomResult;
  metadata: {
    path: string;
    found: boolean;
  };
  output: {
    path: string | null;
    written: boolean;
    bytes: number;
    sha256: string;
  };
  document: MarkdownDocumentSummary & {
    markdown: string;
  };
  server: {
    recordCount: number;
    latestSeq: number | null;
  };
}

export interface StatusResult {
  schema: 'mdroom.status.result.v1';
  ok: true;
  mode: 'server-backed';
  room: PublicRoomResult;
  metadata: {
    path: string;
    found: boolean;
    sourcePath: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
  document: MarkdownDocumentSummary | null;
  server: {
    checked: true;
    recordCount: number;
    latestSeq: number | null;
  };
}

export interface PatchResult {
  schema: 'mdroom.patch.result.v1';
  ok: true;
  mode: 'suggestion';
  room: PublicRoomResult;
  metadata: {
    path: string;
    found: boolean;
  };
  base: MarkdownDocumentSummary;
  proposed: MarkdownDocumentSummary;
  suggestion: {
    id: string;
    kind: 'whole-document-replacement';
    baseSha256: string;
    proposedSha256: string;
  };
  server: {
    recordCount: number;
    latestSeq: number;
  };
}
