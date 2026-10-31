import { chromium } from "@playwright/test";

const base = "http://localhost:3001";
const output = "/Users/sayan/Documents/School Management system/design/screenshots";
const browser = await chromium.launch();

async function sessionFor(roleName) {
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
  await page.getByRole("button", { name: new RegExp(roleName) }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/console/dashboard", { timeout: 15000 });
  await page.waitForTimeout(500);
  return { context, page, errors };
}

async function shot(page, path, prefix = "") {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(450);
  const name = path.replaceAll("/", "-").replace(/^-/, "");
  await page.screenshot({
    path: `${output}/${prefix}${name}.png`,
    fullPage: true,
  });
}

const headmaster = await sessionFor("Headmaster");
for (const route of [
  "/console/dashboard",
  "/console/admissions",
  "/console/admissions/adm-001",
  "/console/exams",
  "/console/exams/exam-half-2026",
  "/console/fees",
  "/console/fees/bills/bill-0101",
  "/console/salary",
  "/console/salary/salary-2026-10",
  "/console/analytics",
  "/console/staff-attendance",
  "/console/notices",
  "/console/reports",
  "/console/settings",
  "/console/audit",
]) {
  await shot(headmaster.page, route, "hm-");
}
console.log("HEADMASTER", JSON.stringify(headmaster.errors, null, 2));
await headmaster.context.close();

const clerk = await sessionFor("Clerk");
for (const route of [
  "/console/dashboard",
  "/console/fees",
  "/console/salary",
  "/console/admissions",
]) {
  await shot(clerk.page, route, "clerk-");
}
console.log("CLERK", JSON.stringify(clerk.errors, null, 2));
await clerk.context.close();

const teacher = await sessionFor("Teacher");
for (const route of [
  "/console/dashboard",
  "/console/attendance",
  "/console/students",
  "/console/analytics",
]) {
  await shot(teacher.page, route, "teacher-");
}
console.log("TEACHER", JSON.stringify(teacher.errors, null, 2));
await teacher.context.close();

const management = await sessionFor("Management");
for (const route of ["/console/dashboard", "/console/analytics", "/console/audit"]) {
  await shot(management.page, route, "management-");
}
const managementText = await management.page.locator("body").innerText();
const piiLeak = managementText.includes("Soumyadeep Ghosh");
console.log(
  "MANAGEMENT",
  JSON.stringify({ errors: management.errors, piiLeak }, null, 2),
);
await management.context.close();

await browser.close();
