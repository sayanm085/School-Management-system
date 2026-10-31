import { chromium } from "@playwright/test";

const base = "http://localhost:3001";
const output = "/Users/sayan/Documents/School Management system/design/screenshots";

const browser = await chromium.launch();

async function capture(width, height, suffix) {
  const context = await browser.newContext({
    viewport: { width, height },
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
  await page.screenshot({ path: `${output}/login-${suffix}.png`, fullPage: true });

  await page.getByRole("button", { name: /Headmaster/ }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/console/dashboard", { timeout: 15000 });
  await page.waitForTimeout(700);
  await page.screenshot({
    path: `${output}/dashboard-headmaster-${suffix}.png`,
    fullPage: true,
  });

  console.log(JSON.stringify({ suffix, url: page.url(), errors }, null, 2));
  await context.close();
}

await capture(1440, 1000, "1440");
await capture(390, 844, "390");
await browser.close();
