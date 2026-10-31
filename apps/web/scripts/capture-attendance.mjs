import { chromium } from "@playwright/test";

const base = "http://localhost:3001";
const output = "/Users/sayan/Documents/School Management system/design/screenshots";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.getByRole("button", { name: /Headmaster/ }).click();
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.waitForURL("**/console/dashboard", { timeout: 15000 });

await page.goto(`${base}/console/attendance`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({
  path: `${output}/attendance-picker-1440.png`,
  fullPage: true,
});

await page.getByRole("link", { name: /VIII-B/ }).first().click();
await page.waitForURL("**/console/attendance/VIII-B", { timeout: 15000 });
await page.waitForTimeout(400);
await page.screenshot({
  path: `${output}/attendance-register-1440.png`,
  fullPage: true,
});

await page.getByRole("button", { name: "Mark all present" }).click();
await page.waitForTimeout(250);
await page.getByRole("button", { name: "Submit attendance" }).first().click();
await page.waitForTimeout(900);
await page.screenshot({
  path: `${output}/attendance-submitted-1440.png`,
  fullPage: true,
});

await page.goto(`${base}/console/dashboard`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({
  path: `${output}/dashboard-after-attendance-1440.png`,
  fullPage: true,
});

console.log(JSON.stringify({ url: page.url(), errors }, null, 2));
await browser.close();
