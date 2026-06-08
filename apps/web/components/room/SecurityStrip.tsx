"use client";

import { LockKeyhole } from "lucide-react";
import { cn } from "../../lib/utils";

interface SecurityStripProps {
  connected: boolean;
  ready: boolean;
  error?: string | null;
}

export function SecurityStrip({
  connected,
  ready,
  error,
}: SecurityStripProps) {
  const e2eeLabel = !connected ? "E2EE offline" : !ready ? "E2EE replaying" : "E2EE";

  return (
    <div
      className={cn(
        "border-t border-studio-line px-3 py-1.5 text-[11px] sm:px-4",
        error
          ? "bg-amber-950/40 text-amber-200"
          : "bg-studio-sunken text-ink-muted",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink">
          <LockKeyhole className="h-3.5 w-3.5" />
          {e2eeLabel}
        </span>
        {error && <span className="basis-full text-sm font-medium">{error}</span>}
      </div>
    </div>
  );
}
