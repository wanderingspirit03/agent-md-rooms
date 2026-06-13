import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Page } from "playwright";

const DEFAULT_URLS = ["http://localhost:3001", "http://localhost:3000"];

async function main() {
  const baseUrl = await resolveBaseUrl();
  const screenshotDir = process.env.FOLD_SMOKE_SCREENSHOT_DIR || join(tmpdir(), "fold-web-milkdown-lab-smoke");
  await mkdir(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const logs: string[] = [];

  try {
    const desktop = await browser.newPage({ viewport: { width: 1360, height: 920 } });
    await preparePage(desktop, "desktop-dark", logs, "dark");
    await desktop.goto(`${baseUrl.replace(/\/$/, "")}/milkdown-lab`, { waitUntil: "networkidle", timeout: 20_000 });
    await assertMilkdownLab(desktop, "desktop dark");
    const desktopDarkScreenshotPath = join(screenshotDir, "desktop-dark-milkdown-lab.png");
    await desktop.screenshot({ path: desktopDarkScreenshotPath, fullPage: true, caret: "initial" });

    const desktopLight = await browser.newPage({ viewport: { width: 1360, height: 920 } });
    await preparePage(desktopLight, "desktop-light", logs, "light");
    await desktopLight.goto(`${baseUrl.replace(/\/$/, "")}/milkdown-lab`, { waitUntil: "networkidle", timeout: 20_000 });
    await assertMilkdownLab(desktopLight, "desktop light");
    const desktopLightScreenshotPath = join(screenshotDir, "desktop-light-milkdown-lab.png");
    await desktopLight.screenshot({ path: desktopLightScreenshotPath, fullPage: true, caret: "initial" });

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    await preparePage(mobile, "mobile-dark", logs, "dark");
    await mobile.goto(`${baseUrl.replace(/\/$/, "")}/milkdown-lab`, { waitUntil: "networkidle", timeout: 20_000 });
    await assertMilkdownLab(mobile, "mobile dark");
    const mobileDarkScreenshotPath = join(screenshotDir, "mobile-dark-milkdown-lab.png");
    await mobile.screenshot({ path: mobileDarkScreenshotPath, fullPage: true, caret: "initial" });

    const errors = logs.filter((entry) => entry.includes("pageerror:") || entry.includes(" console:error:"));
    if (errors.length > 0) {
      throw new Error(`Browser errors during Milkdown lab smoke:\n${errors.join("\n")}`);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          baseUrl,
          desktopDarkScreenshotPath,
          desktopLightScreenshotPath,
          mobileDarkScreenshotPath,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}

async function assertMilkdownLab(page: Page, label: string) {
  await page.getByText("Milkdown readiness").waitFor({ state: "visible", timeout: 10_000 });
  await page.locator('[data-milkdown-status="ready"]').waitFor({ state: "visible", timeout: 12_000 });
  await page.locator('[data-milkdown-lab-editor] .ProseMirror').waitFor({ state: "visible", timeout: 12_000 });
  await page.waitForFunction(
    () => (
      document.body.innerText.includes("Agent Handoff Review") &&
      document.body.innerText.includes("Current Room State") &&
      document.body.innerText.includes("flowchart LR") &&
      /owner:\s*review-agent/.test(document.body.innerText) &&
      document.body.innerText.includes("No product editor swap.")
    ),
    null,
    { timeout: 8_000 },
  );

  const metrics = await page.evaluate(() => {
    const editor = document.querySelector('[data-milkdown-lab-editor]');
    const proseMirror = document.querySelector('[data-milkdown-lab-editor] .ProseMirror');
    const table = proseMirror?.querySelector("table");
    const rect = proseMirror?.getBoundingClientRect();
    return {
      bodyText: document.body.innerText,
      editorHeight: rect?.height || 0,
      tableCellCount: table?.querySelectorAll("th,td").length || 0,
      hasTextarea: Boolean(document.querySelector("textarea")),
      hasRichSourceToggle: Array.from(document.querySelectorAll("button")).some((button) => /rich|source/i.test(button.textContent || "")),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });

  if (metrics.hasTextarea) throw new Error(`${label} lab rendered a textarea instead of Milkdown.`);
  if (metrics.hasRichSourceToggle) throw new Error(`${label} lab introduced nested rich/source chrome.`);
  if (metrics.editorHeight < 560) throw new Error(`${label} Milkdown editor is too short: ${metrics.editorHeight}px.`);
  if (metrics.tableCellCount < 12) throw new Error(`${label} Milkdown table did not render with expected cells.`);
  if (metrics.scrollWidth > metrics.clientWidth) throw new Error(`${label} Milkdown lab created horizontal overflow.`);
}

async function preparePage(page: Page, label: string, logs: string[], theme: "dark" | "light") {
  page.on("console", (message) => {
    if (message.type() === "info" && message.text().includes("React DevTools")) return;
    if (message.type() === "log" && message.text().includes("[HMR]")) return;
    if (message.type() === "error" && message.text().includes("Failed to load resource: the server responded with a status of 404")) return;
    logs.push(`${label} console:${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => logs.push(`${label} pageerror: ${error.message}`));
  await page.addInitScript((nextTheme) => localStorage.setItem("fold:theme", nextTheme), theme);
}

async function resolveBaseUrl() {
  const candidates = [process.env.FOLD_WEB_URL, ...DEFAULT_URLS].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    if (await canReach(candidate)) return candidate;
  }
  throw new Error(
    `No Fold web app responded. Start one first, for example:\n` +
      `  npm run web:dev -- --port 3001\n` +
      `or set FOLD_WEB_URL to an existing app URL.`,
  );
}

async function canReach(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
