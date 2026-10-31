import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const root = "/Users/sayan/Documents/School Management system";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1024, height: 1024 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

async function render(svgPath, output, transparent = false) {
  const svg = readFileSync(svgPath, "utf8");
  const encoded = Buffer.from(svg).toString("base64");
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${encoded}" width="1024" height="1024" style="display:block"></body></html>`,
  );
  await page.screenshot({ path: output, omitBackground: transparent });
}

await render(
  `${root}/design/hazira-app-icon.svg`,
  `${root}/apps/teacher_app/assets/app_icon.png`,
);
await render(
  `${root}/design/hazira-app-icon-foreground.svg`,
  `${root}/apps/teacher_app/assets/app_icon_foreground.png`,
  true,
);

await browser.close();
console.log("rendered app icons");
