"use client";

import { Circle, Clock3, MessagesSquare } from "lucide-react";
import type { RoomPersona } from "../../lib/personas";
import { MarginThread } from "./MarginThread";
import { PersonaChip } from "./PersonaChip";
import { ProposalSlip } from "./ProposalSlip";
import type { ChatComment, Proposal, TimelineEvent } from "./types";

interface AgentBenchProps {
  filePath: string;
  comments: ChatComment[];
  proposals: Proposal[];
  timeline: TimelineEvent[];
  participants: RoomPersona[];
  selectedQuote: string;
  onOpenProposal: (proposal: Proposal) => void;
  onAcceptProposal: (proposal: Proposal) => void;
  onRejectProposal: (proposal: Proposal) => void;
}

export function AgentBench({
  filePath,
  comments,
  proposals,
  timeline,
  participants,
  selectedQuote,
  onOpenProposal,
  onAcceptProposal,
  onRejectProposal,
}: AgentBenchProps) {
  const pendingProposals = proposals.filter((proposal) => proposal.status === "pending");
  const recentProposals = proposals.slice(0, 5);
  const recentTimeline = timeline.slice(0, 4);

  return (
    <aside className="h-[calc(82dvh-48px)] overflow-y-auto bg-rail text-ink md:h-[calc(100dvh-48px)]">
      <div className="space-y-4 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-ink-subtle">Review</p>
            <h2 className="mt-1 text-base font-semibold text-ink">File notes</h2>
            <p className="mt-0.5 max-w-[250px] truncate text-[11px] text-ink-subtle">{filePath}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-ink-subtle">
            <MessagesSquare className="h-3.5 w-3.5" />
            <span>{comments.length + pendingProposals.length}</span>
          </div>
        </div>

        {participants.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-hidden">
            {participants.slice(0, 5).map((persona) => (
              <PersonaChip key={persona.id} persona={persona} compact />
            ))}
          </div>
        )}

        <section className="space-y-2 border-t border-studio-line pt-3">
          <RailHeading title="Comments" count={comments.length} />
          {selectedQuote && <MarginThread selectedQuote={selectedQuote} />}
          {comments.length === 0 && !selectedQuote ? (
            <PrimaryEmptyRailState />
          ) : (
            comments.map((comment) => (
              <MarginThread key={comment.id} comment={comment} />
            ))
          )}
        </section>

        <section className="space-y-2 border-t border-studio-line pt-3">
          <RailHeading title="Suggested edits" count={proposals.length} />
          {recentProposals.length === 0 ? (
            <SoftRailState text="No suggestions." />
          ) : (
            recentProposals.map((proposal) => (
              <ProposalSlip key={proposal.id} proposal={proposal} onOpen={onOpenProposal} />
            ))
          )}
        </section>

        <section className="space-y-2 border-t border-studio-line pb-6 pt-3">
          <RailHeading title="Activity" count={timeline.length} />
          {recentTimeline.length === 0 ? (
            <SoftRailState text="No activity." />
          ) : (
            <div className="space-y-2">
              {recentTimeline.map((event) => (
                <div key={event.id} className="flex gap-2 rounded-md px-1 py-1">
                  <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-subtle" />
                  <div className="min-w-0">
                    <p className="truncate text-xs leading-5 text-ink-muted">{event.message}</p>
                    <p className="font-mono text-[11px] text-ink-subtle">{formatTime(event.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}

function RailHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <span className="font-mono text-[11px] text-ink-subtle">{count}</span>
    </div>
  );
}

function PrimaryEmptyRailState() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-studio-line bg-studio-sunken px-3 py-2 text-xs text-ink-subtle">
      <Circle className="h-3 w-3" />
      <span>No comments.</span>
    </div>
  );
}

function SoftRailState({ text }: { text: string }) {
  return <p className="rounded-md bg-studio-sunken px-3 py-2 text-xs leading-5 text-ink-subtle">{text}</p>;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
