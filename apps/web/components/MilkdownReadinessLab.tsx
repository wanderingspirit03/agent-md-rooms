"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { defaultValueCtx, Editor, editorViewCtx, rootCtx, serializerCtx } from "@milkdown/core";
import { clipboard } from "@milkdown/plugin-clipboard";
import { cursor } from "@milkdown/plugin-cursor";
import { history } from "@milkdown/plugin-history";
import { commonmark } from "@milkdown/preset-commonmark";
import { gfm } from "@milkdown/preset-gfm";
import type { EditorView } from "@milkdown/prose/view";
import { extractMarkdownProperties } from "../lib/markdown-properties";

interface MilkdownReadinessLabProps {
  markdown: string;
}

type LabStatus = "loading" | "ready" | "error";

export function MilkdownReadinessLab({ markdown }: MilkdownReadinessLabProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<LabStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [exportedMarkdown, setExportedMarkdown] = useState("");
  const parsedMarkdown = useMemo(() => extractMarkdownProperties(markdown), [markdown]);
  const stats = useMemo(() => markdownStats(markdown), [markdown]);

  useEffect(() => {
    let disposed = false;
    let editor: Awaited<ReturnType<ReturnType<typeof Editor.make>["create"]>> | null = null;

    async function setupEditor() {
      if (!rootRef.current) return;

      try {
        setStatus("loading");
        setErrorMessage("");
        const nextEditor = await Editor.make()
          .config((ctx) => {
            ctx.set(rootCtx, rootRef.current!);
            ctx.set(defaultValueCtx, parsedMarkdown.content);
          })
          .use(commonmark)
          .use(gfm)
          .use(history)
          .use(clipboard)
          .use(cursor)
          .create();

        if (disposed) {
          await nextEditor.destroy(true);
          return;
        }

        editor = nextEditor;

        const serialized = editor.action((ctx) => {
          const view = ctx.get(editorViewCtx) as EditorView;
          const serializer = ctx.get(serializerCtx) as { (doc: EditorView["state"]["doc"]): string };
          return serializer(view.state.doc);
        });
        setExportedMarkdown(`${parsedMarkdown.propertySource}${serialized}`);
        setStatus("ready");
      } catch (error) {
        if (disposed) return;
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : String(error));
      }
    }

    void setupEditor();

    return () => {
      disposed = true;
      void editor?.destroy(true);
    };
  }, [parsedMarkdown.content, parsedMarkdown.propertySource]);

  return (
    <main className="min-h-dvh bg-studio text-ink">
      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_280px] md:px-6 md:py-6">
        <section className="min-w-0">
          <div className="mb-3 flex min-h-10 items-center justify-between gap-3 border-b border-studio-line pb-3">
            <div className="min-w-0">
              <p className="text-xs uppercase text-ink-subtle">Milkdown readiness</p>
              <h1 className="truncate text-base font-medium text-ink">Long agent handoff fixture</h1>
            </div>
            <span
              data-milkdown-status={status}
              className="shrink-0 rounded bg-studio-sunken px-2 py-1 text-xs text-ink-muted"
            >
              {status}
            </span>
          </div>
          <div
            data-milkdown-lab-editor
            className="milkdown-readiness-editor min-h-[620px] overflow-hidden rounded-md border border-document-edge bg-document text-document-ink shadow-[0_1px_5px_rgba(0,0,0,0.06),0_1px_0_rgba(255,255,255,0.42)_inset]"
          >
            {parsedMarkdown.properties.length > 0 && (
              <div className="border-b border-document-edge px-6 py-3 sm:px-12">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {parsedMarkdown.properties.map((property, index) => (
                    <span key={`${property.key}:${index}`} className="text-xs leading-5 text-document-subtle">
                      <span className="font-medium text-document-muted">{property.key}</span>
                      <span className="mx-1 text-document-subtle">:</span>
                      <span>{property.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div ref={rootRef} />
          </div>
        </section>

        <aside className="min-w-0 border-t border-studio-line pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
          <div className="space-y-4">
            <section>
              <h2 className="text-xs font-medium uppercase text-ink-subtle">Fixture</h2>
              <dl className="mt-2 grid gap-2 text-sm">
                <LabMetric label="lines" value={stats.lines} />
                <LabMetric label="words" value={stats.words} />
                <LabMetric label="tables" value={stats.tables} />
                <LabMetric label="fences" value={stats.fences} />
              </dl>
            </section>

            <section>
              <h2 className="text-xs font-medium uppercase text-ink-subtle">Gate</h2>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
                <li>Markdown remains canonical.</li>
                <li>No product editor swap.</li>
                <li>No collaboration bridge.</li>
                <li>No nested rich/source toggle.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xs font-medium uppercase text-ink-subtle">Export Probe</h2>
              {status === "error" ? (
                <p className="mt-2 text-sm text-ink-muted">{errorMessage}</p>
              ) : (
                <p className="mt-2 text-sm text-ink-muted">
                  {exportedMarkdown ? `${markdownStats(exportedMarkdown).lines} exported lines` : "Waiting for editor"}
                </p>
              )}
            </section>
          </div>
        </aside>
      </div>
    </main>
  );
}

function LabMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex h-8 items-center justify-between border-b border-studio-line">
      <dt className="text-ink-subtle">{label}</dt>
      <dd className="font-mono text-xs text-ink-muted">{value}</dd>
    </div>
  );
}

function markdownStats(markdown: string) {
  const trimmed = markdown.trim();
  return {
    lines: trimmed ? trimmed.split(/\r?\n/).length : 0,
    words: trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0,
    fences: (markdown.match(/^```/gm) || []).length / 2,
    tables: markdown.split(/\r?\n/).filter((line) => /^\|.+\|$/.test(line.trim())).length,
  };
}
