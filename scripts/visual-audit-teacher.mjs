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

async function runAudit() {
  console.log("Starting visual audit for Teacher Dashboard & Class View...");
  const browser = await chromium.launch({ channel: "chrome", headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

    // 1. Teacher Dashboard
    await page.goto("http://localhost:5174/dev/teacher-preview", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const dashPath = path.join(outputDir, `${vp.name}_teacher_dashboard.png`);
    await page.screenshot({ path: dashPath });
    console.log(`  Saved screenshot: ${dashPath}`);

    // Check overflow
    const dashOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    console.log(`  Dashboard body overflow check: overflow=${dashOverflow}`);

    // 2. Class View
    await page.goto("http://localhost:5174/dev/class-preview/5cd0f241-ab2d-4f93-a1cb-96d0b47a8cb1", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const classPath = path.join(outputDir, `${vp.name}_teacher_class_view.png`);
    await page.screenshot({ path: classPath });
    console.log(`  Saved screenshot: ${classPath}`);

    const classOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    console.log(`  Class View body overflow check: overflow=${classOverflow}`);

    await page.close();
  }

  await browser.close();
  console.log("\nTeacher visual audit finished successfully!");
}

runAudit().catch(err => {
  console.error("Audit failed:", err);
  process.exit(1);
});
