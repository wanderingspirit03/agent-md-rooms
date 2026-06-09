"use client";

import type { RoomPersona } from "../../lib/personas";
import { cn } from "../../lib/utils";

interface PersonaAvatarProps {
  persona?: RoomPersona | null;
  compact?: boolean;
  className?: string;
}

export function PersonaAvatar({ persona, compact = false, className }: PersonaAvatarProps) {
  const seed = persona ? hashString(`${persona.id}:${persona.kind}:${persona.name}`) : 0;
  const isAgent = persona?.kind === "agent";
  const background = persona?.color || "#7e8486";
  const sizeClass = compact ? "h-4 w-4" : "h-6 w-6";
  const fold = foldGlyph(seed, isAgent);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]",
        sizeClass,
        className,
      )}
      style={{ backgroundColor: background }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="h-full w-full" focusable="false">
        <path d={fold.paper} fill="rgba(255,255,255,0.88)" />
        <path d={fold.shade} fill="rgba(255,255,255,0.38)" />
        <path d={fold.cut} fill="rgba(0,0,0,0.18)" />
        <circle cx={fold.dot.x} cy={fold.dot.y} r={fold.dot.r} fill="rgba(0,0,0,0.24)" />
        {isAgent ? (
          <path
            d={fold.line}
            fill="none"
            stroke="rgba(0,0,0,0.24)"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        ) : null}
      </svg>
    </span>
  );
}

function foldGlyph(seed: number, isAgent: boolean) {
  const variant = seed % 4;
  const lean = ((seed >>> 3) % 5) - 2;
  const notch = 7 + ((seed >>> 5) % 5);
  const dot = {
    x: 9 + ((seed >>> 7) % 14),
    y: 9 + ((seed >>> 11) % 14),
    r: 1.4 + ((seed >>> 13) % 3) * 0.25,
  };

  if (isAgent) {
    const paper = [
      `M9 ${5 + lean}h13l5 5v17H9z`,
      `M8 ${6 + lean}h15l4 7-3 15H8z`,
      `M10 ${4 + lean}h12l6 6-2 18H7l3-7z`,
      `M7 ${8 + lean}l13-3 6 6-3 17H8z`,
    ][variant];
    const shade = [
      "M22 5v7h7z",
      "M23 6v7h4z",
      "M22 4v8h8z",
      "M20 5v8l6-2z",
    ][variant];
    const cut = `M12 ${notch}h8v2h-8z`;
    const line = `M12 ${22 - (seed % 4)}h10`;
    return { paper, shade, cut, line, dot };
  }

  const paper = [
    `M9 ${6 + lean}h13l4 5-3 16H8z`,
    `M10 ${5 + lean}h12l5 8-5 15H8l2-6z`,
    `M8 ${8 + lean}l13-3 5 6-2 17H9z`,
    `M9 ${5 + lean}h14l3 14-8 8H7z`,
  ][variant];
  const shade = [
    "M22 6v6h6z",
    "M22 5v8h5z",
    "M21 5v8l5-2z",
    "M23 5l3 14-6-4z",
  ][variant];
  const cut = `M11 ${notch}l7 1-1.5 2-6.5-1z`;
  const line = "";
  return { paper, shade, cut, line, dot };
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
