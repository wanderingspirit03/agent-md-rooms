"use client";

import { Circle, Clock3, FileText, ListChecks, MessageSquare } from "lucide-react";
import type { RoomPersona } from "../../lib/personas";
import { cn } from "../../lib/utils";
import { MarginThread } from "./MarginThread";
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
      <div className="space-y-3 px-3 py-3">
        <div className="border-b border-studio-line px-1 pb-3">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-3.5 w-3.5 shrink-0 text-ink-subtle" />
              <p className="truncate text-xs font-medium text-ink">{filePath}</p>
            </div>
            <ParticipantDots participants={participants} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <ReviewCount
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              count={comments.length}
              label="comments"
              singularLabel="comment"
            />
            <ReviewCount
              icon={<ListChecks className="h-3.5 w-3.5" />}
              count={pendingProposals.length}
              label="pending"
              singularLabel="pending suggestion"
              pluralLabel="pending suggestions"
            />
          </div>
        </div>

        <section className="space-y-1">
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

        <section className="space-y-1 border-t border-studio-line pt-3">
          <RailHeading title="Suggestions" count={proposals.length} />
          {recentProposals.length === 0 ? (
            <SoftRailState text="No suggestions." />
          ) : (
            recentProposals.map((proposal) => (
              <ProposalSlip
                key={proposal.id}
                proposal={proposal}
                onOpen={onOpenProposal}
                onAccept={onAcceptProposal}
                onReject={onRejectProposal}
              />
            ))
          )}
        </section>

        <section className="space-y-1 border-t border-studio-line pb-6 pt-3">
          <RailHeading title="Activity" count={timeline.length} />
          {recentTimeline.length === 0 ? (
            <SoftRailState text="No activity." />
          ) : (
            <div className="space-y-0.5">
              {recentTimeline.map((event) => (
                <div key={event.id} className="flex gap-2 rounded-md px-1.5 py-1.5 hover:bg-studio-sunken">
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

function ParticipantDots({ participants }: { participants: RoomPersona[] }) {
  if (participants.length === 0) return null;

  const visible = participants.slice(0, 4);
  const hiddenCount = Math.max(0, participants.length - visible.length);
  const label = participants.map((persona) => persona.name).join(", ");

  return (
    <div className="flex shrink-0 items-center" role="group" aria-label={`Participants: ${label}`} title={label}>
      {visible.map((persona, index) => (
        <span
          key={persona.id}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border border-rail text-[10px] font-semibold text-white",
            index > 0 && "-ml-1.5",
          )}
          style={{ backgroundColor: persona.color }}
          aria-hidden="true"
        >
          {persona.name.slice(0, 1)}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span
          className="-ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-rail bg-studio-sunken px-1 text-[10px] font-medium text-ink-subtle"
          aria-hidden="true"
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

function ReviewCount({
  icon,
  count,
  label,
  singularLabel,
  pluralLabel,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  singularLabel: string;
  pluralLabel?: string;
}) {
  const accessibleLabel = `${count} ${count === 1 ? singularLabel : pluralLabel || label}`;

  return (
    <span
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className="inline-flex h-6 min-w-0 items-center gap-1.5 rounded border border-studio-line bg-rail px-2 text-[11px] text-ink-subtle"
    >
      <span className="text-ink-subtle">{icon}</span>
      <span className="font-mono text-ink-muted">{count}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function RailHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between px-1.5">
      <h3 className="text-xs font-medium uppercase text-ink-subtle">{title}</h3>
      <span className="font-mono text-[11px] text-ink-subtle">{count}</span>
    </div>
  );
}

function PrimaryEmptyRailState() {
  return (
    <div className="flex items-center gap-2 px-1.5 py-2 text-xs text-ink-subtle">
      <Circle className="h-3 w-3" />
      <span>No comments.</span>
    </div>
  );
}

function SoftRailState({ text }: { text: string }) {
  return <p className="px-1.5 py-2 text-xs leading-5 text-ink-subtle">{text}</p>;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
