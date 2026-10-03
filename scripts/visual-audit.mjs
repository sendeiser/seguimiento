import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = "C:\\Users\\TinChoX\\.gemini\\antigravity-ide\\brain\\c7d198b2-7644-4822-bca3-7e1d18f09003\\screenshots";

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

const TARGET_URL = "http://localhost:5174/class-live/9c8e0078-c42a-48fc-bbdf-837685de5887";

async function runAudit() {
  console.log("Starting visual audit with Playwright...");
  const browser = await chromium.launch({ channel: "chrome", headless: true });

  const auditReport = [];

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    // Listen to console errors
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    try {
      await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(2000); // Wait for animations & initial render

      // Check for horizontal overflow on body
      const bodyOverflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        };
      });

      console.log(`  Body overflow check: scrollWidth=${bodyOverflow.scrollWidth}, clientWidth=${bodyOverflow.clientWidth}, overflow=${bodyOverflow.hasHorizontalOverflow}`);

      // Screenshot default view (Cards mode)
      const screenshotCards = path.join(outputDir, `${vp.name}_cards.png`);
      await page.screenshot({ path: screenshotCards, fullPage: false });
      console.log(`  Saved screenshot: ${screenshotCards}`);

      // Find and switch to Table mode (pick visible button)
      const tableButton = page.locator("button[title='Vista Planilla']:visible").first();
      const hasTableBtn = await tableButton.isVisible().catch(() => false);

      if (hasTableBtn) {
        console.log("  Clicking Table/Planilla mode button...");
        await tableButton.click();
        await page.waitForTimeout(1000);

        // Screenshot Detailed Table
        const screenshotDetailed = path.join(outputDir, `${vp.name}_table_detailed.png`);
        await page.screenshot({ path: screenshotDetailed, fullPage: false });
        console.log(`  Saved screenshot: ${screenshotDetailed}`);

        // Click on "Resumen de Promedios" if available
        const summaryTab = page.locator("button:has-text('Resumen de Promedios')").first();
        if (await summaryTab.isVisible().catch(() => false)) {
          console.log("  Clicking 'Resumen de Promedios' tab...");
          await summaryTab.click();
          await page.waitForTimeout(1000);

          const screenshotSummary = path.join(outputDir, `${vp.name}_table_summary.png`);
          await page.screenshot({ path: screenshotSummary, fullPage: false });
          console.log(`  Saved screenshot: ${screenshotSummary}`);
        }

        // Test category filter button "🎯 Exámenes"
        const examPill = page.locator("button:has-text('Exámenes')").first();
        if (await examPill.isVisible().catch(() => false)) {
          console.log("  Testing '🎯 Exámenes' filter pill...");
          await examPill.click();
          await page.waitForTimeout(500);

          const screenshotExamFilter = path.join(outputDir, `${vp.name}_filter_exam.png`);
          await page.screenshot({ path: screenshotExamFilter, fullPage: false });
          console.log(`  Saved screenshot: ${screenshotExamFilter}`);
        }
      } else {
        console.log("  Table button not directly visible by text. Inspecting buttons on page...");
        const buttons = await page.evaluate(() => {
          return Array.from(document.querySelectorAll("button")).map(b => ({
            text: b.textContent?.trim(),
            title: b.title,
            ariaLabel: b.getAttribute("aria-label"),
            classes: b.className,
          }));
        });
        console.log("  Available buttons:", JSON.stringify(buttons, null, 2));
      }

      auditReport.push({
        viewport: vp.name,
        consoleErrors,
        bodyOverflow,
      });

    } catch (err) {
      console.error(`  Error during test for ${vp.name}:`, err.message);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log("\nVisual audit completed! Report:", JSON.stringify(auditReport, null, 2));
}

runAudit();
