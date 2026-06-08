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
      className="border-t border-studio-line bg-amber-950/40 px-3 py-1.5 text-[11px] text-amber-200 sm:px-4"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink">
          <LockKeyhole className="h-3.5 w-3.5" />
          E2EE
        </span>
        <span className="basis-full text-sm font-medium">{error}</span>
      </div>
    </div>
  );
}
