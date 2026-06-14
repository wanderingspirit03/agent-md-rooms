interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  return (
    <figure
      className="my-6 overflow-hidden rounded-md border border-document-edge bg-black/[0.025]"
      data-mermaid-diagram="placeholder"
    >
      <figcaption className="flex items-center justify-between border-b border-document-edge px-4 py-2.5">
        <span className="font-mono text-xs text-document-muted">Mermaid</span>
        <span className="font-mono text-xs text-document-subtle">Source</span>
      </figcaption>
      <div className="space-y-3 p-4">
        <p className="text-sm text-document-muted">Mermaid diagram preview is disabled in shared rooms.</p>
        <pre className="overflow-x-auto rounded-md bg-document p-3 font-mono text-xs leading-5 text-document-muted">
          {chart}
        </pre>
      </div>
    </figure>
  );
}
