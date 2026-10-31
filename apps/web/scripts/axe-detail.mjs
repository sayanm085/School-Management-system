import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

const base = "http://localhost:3001";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.getByRole("button", { name: /Headmaster/ }).click();
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.waitForURL("**/console/dashboard", { timeout: 15000 });
await page.waitForTimeout(500);
await page.goto(`${base}/console/students`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);

const result = await new AxeBuilder({ page })
  .withTags(["wcag2aa"])
  .include("body")
  .analyze();

for (const violation of result.violations) {
  if (violation.id !== "color-contrast") continue;
  for (const node of violation.nodes) {
    console.log(
      JSON.stringify(
        {
          target: node.target,
          html: node.html.slice(0, 220),
          failureSummary: node.failureSummary,
        },
        null,
        2,
      ),
    );
  }
}

const primary = page.locator(".bg-\\[var\\(--blue-strong\\)\\]").first();
console.log(
  "PRIMARY",
  await primary.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      tag: element.tagName,
      text: element.textContent,
      color: style.color,
      backgroundColor: style.backgroundColor,
    };
  }),
);

await browser.close();
