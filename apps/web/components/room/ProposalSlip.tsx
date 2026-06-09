"use client";

import { Check, Circle, Eye, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { PersonaChip } from "./PersonaChip";
import type { Proposal } from "./types";

interface ProposalSlipProps {
  proposal: Proposal;
  onOpen: (proposal: Proposal) => void;
  onAccept?: (proposal: Proposal) => void;
  onReject?: (proposal: Proposal) => void;
}

export function ProposalSlip({ proposal, onOpen, onAccept, onReject }: ProposalSlipProps) {
  const state =
    proposal.status === "accepted"
      ? { label: "Accepted", icon: Check, className: "text-emerald-400", accentClassName: "border-l-emerald-400/55" }
      : proposal.status === "rejected"
        ? { label: "Rejected", icon: X, className: "text-rose-400", accentClassName: "border-l-rose-400/50" }
        : { label: "Pending suggestion", icon: Circle, className: "text-midnight-strong", accentClassName: "border-l-midnight/55" };
  const Icon = state.icon;
  const anchorText = proposal.selectedQuote
    ? proposal.selectedQuote
    : proposal.anchorType === "block"
      ? "Section suggestion"
      : "Whole-document suggestion";
  const renderedAnchor = proposal.selectedQuote ? `"${anchorText}"` : anchorText;

  return (
    <article
      className={cn(
        "group rounded-md border border-transparent border-l-2 px-2 py-2",
        "transition-colors hover:border-studio-line hover:bg-studio-sunken/80 focus-within:border-studio-line focus-within:bg-studio-sunken/70",
        state.accentClassName,
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn("mt-1 h-3.5 w-3.5 shrink-0", state.className)} aria-hidden />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen(proposal)}
            aria-label={`Open ${state.label.toLowerCase()} ${proposal.title}`}
            className="block w-full rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-strong"
          >
            <p className="line-clamp-2 text-sm font-medium leading-5 text-ink">{proposal.title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-subtle">
              <span className={proposal.selectedQuote ? "text-midnight-strong" : "text-ink-subtle"}>{renderedAnchor}</span>
              {proposal.comment ? <span className="text-ink-muted"> · {proposal.comment}</span> : null}
            </p>
          </button>
          <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
            <PersonaChip persona={proposal.persona} compact />
            <span className="shrink-0 font-mono text-[11px] text-ink-subtle">{formatTime(proposal.createdAt)}</span>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1">
        {proposal.status === "pending" && (
          <>
            <button
              type="button"
              aria-label={`Accept ${proposal.title}`}
              title="Accept"
              className="inline-flex h-9 w-9 items-center justify-center rounded text-ink-subtle transition-colors hover:bg-midnight-soft hover:text-midnight-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-strong"
              onClick={() => onAccept?.(proposal)}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Reject ${proposal.title}`}
              title="Reject"
              className="inline-flex h-9 w-9 items-center justify-center rounded text-ink-subtle transition-colors hover:bg-studio-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-strong"
              onClick={() => onReject?.(proposal)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => onOpen(proposal)}
          aria-label={`Open preview for ${proposal.title}`}
          title="Preview"
          className="inline-flex h-9 w-9 items-center justify-center rounded text-ink-subtle transition-colors hover:bg-studio-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-strong"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
