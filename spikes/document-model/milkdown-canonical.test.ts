import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  analyzeMilkdownCanonicalRoundTrip,
  summarizeMilkdownCanonicalReports,
} from "./milkdown-canonical.js";
import { MARKDOWN_SAMPLE_NAMES } from "./sample-loader.js";

const sampleDir = join(import.meta.dirname, "samples");

function readSample(name: string): string {
  return readFileSync(join(sampleDir, name), "utf8");
}

describe("milkdown editor candidate", () => {
  it("parses and serializes every Markdown fixture through the hidden Milkdown harness", async () => {
    for (const sample of MARKDOWN_SAMPLE_NAMES) {
      const report = await analyzeMilkdownCanonicalRoundTrip(readSample(sample));

      expect(report.output.length).toBeGreaterThan(0);
      expect(report.nodeCounts.paragraph ?? 0).toBeGreaterThan(0);
    }
  });

  it("loses frontmatter while keeping GFM task-list Markdown syntax", async () => {
    const report = await analyzeMilkdownCanonicalRoundTrip(readSample("agent-plan.md"));

    expect(report.exactRoundTrip).toBe(false);
    expect(report.lostFeatureNames).toContain("frontmatter");
    expect(report.preservedFeatureNames).toContain("taskLists");
    expect(report.output).not.toMatch(/^---\ntitle: Agent Plan\nowner: coding-agent\n---/);
    expect(report.output).toContain("* [x] Verify E2EE spike");
    expect(report.output).not.toContain("- [x] Verify E2EE spike");
  });

  it("preserves pipe table structure while normalizing table separators", async () => {
    const report = await analyzeMilkdownCanonicalRoundTrip(readSample("code-report.md"));

    expect(report.exactRoundTrip).toBe(false);
    expect(report.preservedFeatureNames).toContain("tables");
    expect(report.preservedFeatureNames).toContain("fencedCode");
    expect(report.preservedFeatureNames).toContain("inlineCode");
    expect(report.output).toMatch(/\| Area\s+\| Status\s+\| Notes\s+\|/);
    expect(report.output).toMatch(/\| -{2,}\s+\| -{2,}\s+\| -{2,}\s+\|/);
  });

  it("preserves Mermaid, math fences, inline math, links, and images", async () => {
    const report = await analyzeMilkdownCanonicalRoundTrip(
      readSample("rich-agent-output.md"),
    );

    expect(report.preservedFeatureNames).toContain("mermaidFence");
    expect(report.preservedFeatureNames).toContain("mathFence");
    expect(report.preservedFeatureNames).toContain("inlineMath");
    expect(report.preservedFeatureNames).toContain("links");
    expect(report.preservedFeatureNames).toContain("images");
    expect(report.output).toContain("```mermaid\nflowchart LR");
    expect(report.output).toContain("```math\n\\sum_{i=1}^{n}");
    expect(report.output).toContain(
      "[Project repo](https://github.com/wanderingspirit03/fold)",
    );
    expect(report.output).toContain("![Diagram](./diagram.png)");
  });

  it("keeps most required features in the long handoff but still fails exact fidelity", async () => {
    const report = await analyzeMilkdownCanonicalRoundTrip(
      readSample("long-agent-handoff.md"),
    );

    expect(report.exactRoundTrip).toBe(false);
    expect(report.lostFeatureNames).toContain("frontmatter");
    expect(report.preservedFeatureNames).toContain("taskLists");
    expect(report.preservedFeatureNames).toContain("tables");
    expect(report.preservedFeatureNames).toContain("fencedCode");
    expect(report.preservedFeatureNames).toContain("mermaidFence");
    expect(report.preservedFeatureNames).toContain("mathFence");
  });

  it("summarizes Milkdown feature preservation across the sample set", async () => {
    const reports = [];

    for (const sample of MARKDOWN_SAMPLE_NAMES) {
      reports.push(await analyzeMilkdownCanonicalRoundTrip(readSample(sample)));
    }

    const summary = summarizeMilkdownCanonicalReports(reports);

    expect(summary.frontmatter).toEqual({ detected: 2, preserved: 0 });
    expect(summary.taskLists).toEqual({ detected: 2, preserved: 2 });
    expect(summary.tables).toEqual({ detected: 2, preserved: 2 });
    expect(summary.fencedCode).toEqual({ detected: 3, preserved: 3 });
    expect(summary.mermaidFence).toEqual({ detected: 2, preserved: 2 });
    expect(summary.mathFence).toEqual({ detected: 2, preserved: 2 });
    expect(summary.links).toEqual({ detected: 2, preserved: 2 });
    expect(summary.images).toEqual({ detected: 2, preserved: 2 });
  });
});
