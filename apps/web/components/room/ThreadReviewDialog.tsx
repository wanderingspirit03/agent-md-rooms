"use client";

import { CheckCircle, Quote, XCircle } from "lucide-react";
import MarkdownRenderer from "../MarkdownRenderer";
import { extractMarkdownProperties } from "../../lib/markdown-properties";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { PersonaChip } from "./PersonaChip";
import type { Proposal } from "./types";

interface ThreadReviewDialogProps {
  proposal: Proposal | null;
  onClose: () => void;
  onAccept: (proposal: Proposal) => void;
  onReject: (proposal: Proposal) => void;
}

export function ThreadReviewDialog({
  proposal,
  onClose,
  onAccept,
  onReject,
}: ThreadReviewDialogProps) {
  const parsedProposal = proposal ? extractMarkdownProperties(proposal.proposedMarkdown) : null;

  return (
    <Dialog open={Boolean(proposal)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl border-studio-line bg-studio-paper text-ink">
        {proposal && (
          <>
            <DialogHeader>
              <div className="mb-2 flex items-center justify-between gap-3">
                <StatusText status={proposal.status} />
                <PersonaChip persona={proposal.persona} compact />
              </div>
              <DialogTitle>{proposal.title}</DialogTitle>
              <DialogDescription>
                {proposal.comment || "Suggested Markdown replacement attached to this review thread."}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border border-studio-line bg-studio-sunken p-3">
              <p className="text-xs font-medium uppercase text-ink-subtle">Thread anchor</p>
              {proposal.selectedQuote ? (
                <div className="mt-2 flex gap-2 rounded-md border border-studio-line bg-studio-sunken px-2 py-1.5 text-xs leading-5 text-ink-muted">
                  <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-midnight-strong" />
                  <span className="line-clamp-2">{proposal.selectedQuote}</span>
                </div>
              ) : (
                <p className="mt-1 text-sm text-ink-muted">
                  {proposal.anchorType === "block" ? "Section suggestion" : "Whole-document suggestion"}
                </p>
              )}
            </div>

            <p className="text-xs font-medium uppercase text-ink-subtle">Preview replacement</p>
            <div className="max-h-[52dvh] overflow-y-auto rounded-md border border-document-edge bg-document p-5">
              {parsedProposal?.properties.length ? (
                <div className="mb-6 rounded-md border border-document-edge bg-black/[0.025] px-3 py-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {parsedProposal.properties.map((property) => (
                      <span key={property.key} className="text-xs leading-5 text-document-subtle">
                        <span className="font-medium text-document-muted">{property.key}</span>
                        <span className="mx-1 text-document-subtle">:</span>
                        <span>{property.value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <MarkdownRenderer content={parsedProposal?.content ?? proposal.proposedMarkdown} />
            </div>

            {proposal.status === "pending" && (
              <DialogFooter>
                <Button variant="outline" onClick={() => onReject(proposal)}>
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
                <Button onClick={() => onAccept(proposal)}>
                  <CheckCircle className="h-4 w-4" />
                  Accept replacement
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatusText({ status }: { status: Proposal["status"] }) {
  const className =
    status === "accepted" ? "text-emerald-400" : status === "rejected" ? "text-rose-400" : "text-midnight-strong";
  const label =
    status === "accepted" ? "Accepted suggestion" : status === "rejected" ? "Rejected suggestion" : "Open suggested edit";

  return <span className={`text-xs font-medium ${className}`}>{label}</span>;
}
