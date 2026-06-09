"use client";

import { MessageSquarePlus } from "lucide-react";

interface SelectionAnchorProps {
  quote: string;
  onAddNote: () => void;
}

export function SelectionAnchor({ quote, onAddNote }: SelectionAnchorProps) {
  return (
    <div
      data-selection-anchor
      className="rounded-md border border-midnight/25 bg-studio-paper px-2.5 py-2 text-ink shadow-[0_10px_28px_rgba(0,0,0,0.16)]"
    >
      <div className="flex max-w-[280px] items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-xs text-ink-subtle">"{quote}"</p>
        <button
          type="button"
          aria-label="Add inline comment"
          title="Add comment"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-midnight-strong transition-colors hover:bg-midnight-mark hover:text-midnight-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-strong md:h-9 md:w-9"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onAddNote();
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onAddNote();
          }}
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
