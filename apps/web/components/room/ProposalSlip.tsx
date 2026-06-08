"use client";

import { Check, CircleDot, Eye, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { PersonaChip } from "./PersonaChip";
import type { Proposal } from "./types";

interface ProposalSlipProps {
  proposal: Proposal;
  onOpen: (proposal: Proposal) => void;
}

export function ProposalSlip({ proposal, onOpen }: ProposalSlipProps) {
  const state =
    proposal.status === "accepted"
      ? { label: "Accepted", icon: Check, className: "text-emerald-400" }
      : proposal.status === "rejected"
        ? { label: "Rejected", icon: X, className: "text-rose-400" }
        : { label: "Open", icon: CircleDot, className: "text-midnight-strong" };
  const Icon = state.icon;
  const anchorText = proposal.selectedQuote
    ? `Anchored to "${proposal.selectedQuote}"`
    : proposal.anchorType === "block"
      ? "Section suggestion"
      : "Whole-document suggestion";

  return (
    <button
      type="button"
      onClick={() => onOpen(proposal)}
      className={cn(
        "w-full rounded-md border border-transparent px-2.5 py-2.5 text-left",
        "transition-colors hover:border-studio-line hover:bg-studio-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-strong",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", state.className)}>
          <Icon className="h-3.5 w-3.5" />
          {state.label}
        </span>
        <span className="font-mono text-[11px] text-ink-subtle">{formatTime(proposal.createdAt)}</span>
      </div>
      <p className="line-clamp-2 text-sm font-medium leading-5 text-ink">{proposal.title}</p>
      <p className="mt-1 line-clamp-1 border-l-2 border-studio-line px-2 text-[11px] leading-5 text-ink-subtle">{anchorText}</p>
      {proposal.comment && <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">{proposal.comment}</p>}
      <div className="mt-3 flex items-center justify-between gap-2">
        <PersonaChip persona={proposal.persona} compact />
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
          <Eye className="h-3.5 w-3.5" />
          Preview
        </span>
      </div>
    </button>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
