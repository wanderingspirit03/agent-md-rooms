"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { FileText, PenLine } from "lucide-react";
import { Textarea } from "./ui/textarea";

interface MarkdownSourceEditorProps {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  onCommit?: (markdown: string) => void;
}

export default function MarkdownSourceEditor({
  initialMarkdown,
  onChange,
  onCommit,
}: MarkdownSourceEditorProps) {
  const onChangeRef = useRef(onChange);
  const onCommitRef = useRef(onCommit);
  const [markdown, setMarkdown] = useState(initialMarkdown);

  onChangeRef.current = onChange;
  onCommitRef.current = onCommit;

  const counts = useMemo(() => ({
    lines: markdown.split("\n").length,
    words: markdown.trim() ? markdown.trim().split(/\s+/).length : 0,
  }), [markdown]);

  useEffect(() => {
    setMarkdown(initialMarkdown);
  }, [initialMarkdown]);

  const handleSourceChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextMarkdown = event.target.value;
    setMarkdown(nextMarkdown);
    onChangeRef.current(nextMarkdown);
  };

  return (
    <div data-editor-shell="true" className="overflow-hidden rounded-md border border-studio-line bg-studio-paper shadow-[0_28px_90px_rgba(0,0,0,0.24)]">
      <div data-editor-header="true" className="flex items-center justify-between border-b border-studio-line bg-studio-sunken px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
            <PenLine className="h-3.5 w-3.5 text-midnight-strong" />
            Markdown source
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <FileText className="h-3.5 w-3.5" />
          <span>{counts.lines} lines</span>
          <span>{counts.words} words</span>
        </div>
      </div>
      <div className="relative min-h-[620px] bg-document">
        <Textarea
          aria-label="Markdown source"
          value={markdown}
          onChange={handleSourceChange}
          onBlur={() => onCommitRef.current?.(markdown)}
          spellCheck={false}
          className="min-h-[620px] resize-none rounded-none border-0 bg-document px-6 py-6 font-mono text-[13px] leading-6 text-document-ink shadow-none outline-none placeholder:text-document-subtle focus-visible:ring-0 sm:px-12 sm:py-10 lg:px-16"
        />
      </div>
    </div>
  );
}
