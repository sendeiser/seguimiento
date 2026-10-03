import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const outputDir = "C:\\Users\\TinChoX\\.gemini\\antigravity-ide\\brain\\c7d198b2-7644-4822-bca3-7e1d18f09003\\screenshots";

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

const TARGET_URL = "http://localhost:5174/live/9ecc143a-02fb-4f81-8326-d68f150cae7a";

async function runAudit() {
  console.log("Starting visual audit for Student View with Playwright...");
  const browser = await chromium.launch({ channel: "chrome", headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    try {
      await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(2000);

      // Screenshot Progreso tab
      const screenshotProgress = path.join(outputDir, `${vp.name}_student_progress.png`);
      await page.screenshot({ path: screenshotProgress, fullPage: false });
      console.log(`  Saved screenshot: ${screenshotProgress}`);

      // Click Bazar tab
      const bazarBtn = page.locator("button:has-text('Bazar')").first();
      if (await bazarBtn.isVisible().catch(() => false)) {
        await bazarBtn.click();
        await page.waitForTimeout(1000);
        const screenshotBazar = path.join(outputDir, `${vp.name}_student_bazar.png`);
        await page.screenshot({ path: screenshotBazar, fullPage: false });
        console.log(`  Saved screenshot: ${screenshotBazar}`);
      }

      // Check overflow
      const bodyOverflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        };
      });
      console.log(`  Body overflow check: overflow=${bodyOverflow.hasHorizontalOverflow}`);
    } catch (err) {
      console.error(`Error on ${vp.name}:`, err.message);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log("\nStudent view visual audit finished successfully!");
}

runAudit();
