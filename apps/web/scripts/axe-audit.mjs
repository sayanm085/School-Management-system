import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

const base = "http://localhost:3001";
const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);

const results = [];
async function audit(name) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  results.push({
    name,
    violations: result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.slice(0, 5).map((node) => node.target),
    })),
  });
}

await audit("login");

await page.getByRole("button", { name: /Headmaster/ }).click();
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.waitForURL("**/console/dashboard", { timeout: 15000 });
await page.waitForTimeout(500);

for (const [name, route] of [
  ["dashboard", "/console/dashboard"],
  ["students", "/console/students"],
  ["student-profile", "/console/students/stu-0288"],
  ["admissions-detail", "/console/admissions/adm-001"],
  ["attendance", "/console/attendance/VIII-B"],
  ["timetable", "/console/timetable"],
  ["exams-detail", "/console/exams/exam-half-2026"],
  ["fees-bill", "/console/fees/bills/bill-0101"],
  ["salary-bill", "/console/salary/salary-2026-10"],
  ["analytics", "/console/analytics"],
  ["notices", "/console/notices"],
  ["settings", "/console/settings"],
  ["audit", "/console/audit"],
]) {
  await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(350);
  await audit(name);
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
