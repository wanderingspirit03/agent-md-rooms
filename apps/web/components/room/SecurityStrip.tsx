"use client";

import { LockKeyhole } from "lucide-react";

interface SecurityStripProps {
  connected: boolean;
  ready: boolean;
  error?: string | null;
}

export function SecurityStrip({
  error,
}: SecurityStripProps) {
  if (!error) return null;

  return (
    <div
      role="status"
      aria-label={`E2EE status: ${error}`}
      title={error}
      className="border-t border-studio-line bg-studio-paper px-3 py-1.5 text-[11px] text-ink-subtle sm:px-4"
    >
      <div className="flex min-h-5 items-center gap-2">
        <span className="inline-flex shrink-0 items-center gap-1.5 font-medium text-ink-muted">
          <LockKeyhole className="h-3.5 w-3.5 text-amber-400" />
          E2EE
        </span>
        <span className="min-w-0 truncate text-ink-subtle">{error}</span>
      </div>
    </div>
  );
}
