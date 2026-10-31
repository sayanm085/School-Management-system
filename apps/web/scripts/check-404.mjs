import { chromium } from "@playwright/test";

const base = "http://localhost:3001";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const failures = new Set();

page.on("response", (response) => {
  if (response.status() >= 400) {
    failures.add(`${response.status()} ${response.url()}`);
  }
});

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.getByRole("button", { name: /Headmaster/ }).click();
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.waitForURL("**/console/dashboard", { timeout: 15000 });

for (const route of [
  "/console/dashboard",
  "/console/admissions/adm-001",
  "/console/exams/exam-half-2026",
  "/console/fees/bills/bill-0101",
  "/console/salary/salary-2026-10",
  "/console/analytics",
]) {
  await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
}

console.log(JSON.stringify([...failures], null, 2));
await browser.close();
