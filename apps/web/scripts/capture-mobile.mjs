import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

const base = "http://localhost:3001";
const output = "/Users/sayan/Documents/School Management system/design/screenshots";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.screenshot({ path: `${output}/mobile-login.png`, fullPage: true });

await page.getByRole("button", { name: /Headmaster/ }).click();
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.waitForURL("**/console/dashboard", { timeout: 15000 });
await page.waitForTimeout(500);

const reports = [];
for (const [name, route] of [
  ["dashboard", "/console/dashboard"],
  ["students", "/console/students"],
  ["student-profile", "/console/students/stu-0288"],
  ["attendance", "/console/attendance/VIII-B"],
  ["analytics", "/console/analytics"],
  ["fees-bill", "/console/fees/bills/bill-0101"],
]) {
  await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `${output}/mobile-${name}.png`,
    fullPage: true,
  });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  reports.push({
    name,
    violations: result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.slice(0, 4).map((node) => node.target),
    })),
  });
}

console.log(JSON.stringify({ errors, reports }, null, 2));
await browser.close();
