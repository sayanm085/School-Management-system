import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

const base = "http://localhost:3001";
const browser = await chromium.launch({ channel: "chrome" });
const results = [];

async function audit(page, name) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  results.push({
    name,
    violations: result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.slice(0, 4).map((node) => node.target),
    })),
  });
}

async function session(width, height, account, name, routes) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: account }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/console/dashboard", { timeout: 15000 });
  await page.waitForTimeout(1400);
  for (const [routeName, route] of routes) {
    await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1300);
    await audit(page, `${name}-${routeName}`);
  }
  await context.close();
}

await session(1440, 1000, /Headmaster/, "hm-desktop", [
  ["dashboard", "/console/dashboard"],
  ["timetable", "/console/timetable"],
]);
await session(390, 844, /Headmaster/, "hm-mobile", [
  ["dashboard", "/console/dashboard"],
  ["timetable", "/console/timetable"],
]);
await session(1440, 1000, /Asst\. headmaster/, "ahm-desktop", [
  ["dashboard", "/console/dashboard"],
  ["timetable", "/console/timetable"],
]);
await session(1440, 1000, /Class teacher/, "teacher-desktop", [
  ["dashboard", "/console/dashboard"],
  ["timetable", "/console/timetable"],
]);
await session(390, 844, /Class teacher/, "teacher-mobile", [
  ["dashboard", "/console/dashboard"],
  ["timetable", "/console/timetable"],
]);

console.log(JSON.stringify(results, null, 2));
await browser.close();
