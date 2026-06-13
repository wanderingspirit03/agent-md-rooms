import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { MilkdownReadinessLab } from "../../components/MilkdownReadinessLab";

export const metadata = {
  title: "Fold Milkdown Readiness",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MilkdownLabPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const markdown = await readFile(
    join(process.cwd(), "..", "..", "spikes", "document-model", "samples", "long-agent-handoff.md"),
    "utf8",
  );

  return <MilkdownReadinessLab markdown={markdown} />;
}
