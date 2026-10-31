import { chromium } from "@playwright/test";

const base = "http://localhost:3001";
const output = "/Users/sayan/Documents/School Management system/design/screenshots";
const browser = await chromium.launch();

async function login(page, role) {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: new RegExp(role) }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/console/dashboard", { timeout: 15000 });
  await page.waitForTimeout(400);
}

const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

await login(page, "Headmaster");

await page.goto(`${base}/console/admissions/adm-001`, {
  waitUntil: "networkidle",
});
await page.getByRole("button", { name: "Verify documents" }).click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: "Approve and enrol" }).click();
await page.getByRole("button", { name: "Approve and create student" }).click();
await page.waitForURL("**/console/students/**", { timeout: 15000 });
const newStudentUrl = page.url();
await page.screenshot({
  path: `${output}/flow-new-student.png`,
  fullPage: true,
});

await page.goto(`${base}/console/fees/bills/bill-0101`, {
  waitUntil: "networkidle",
});
await page.getByRole("button", { name: /Collect ₹150/ }).click();
await page.waitForURL("**/console/fees/receipts/**", { timeout: 15000 });
const receiptUrl = page.url();
const receiptText = await page.locator("body").innerText();
await page.screenshot({
  path: `${output}/flow-receipt.png`,
  fullPage: true,
});

await page.goto(`${base}/console/salary/salary-2026-10`, {
  waitUntil: "networkidle",
});
await page.getByRole("button", { name: "Verify bill" }).click();
await page.waitForTimeout(350);
await page.getByRole("button", { name: "Approve bill" }).click();
await page.waitForTimeout(350);
await page.getByRole("button", { name: "Record disbursement" }).click();
await page.waitForTimeout(600);
const salaryText = await page.locator("body").innerText();
const salaryDisbursed = salaryText.includes("disbursed");

await page.goto(`${base}/console/attendance/VIII-B`, {
  waitUntil: "networkidle",
});
await page.getByRole("button", { name: "Mark all present" }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Submit attendance" }).first().click();
await page.waitForTimeout(700);
const attendanceText = await page.locator("body").innerText();

const clerkContext = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const clerkPage = await clerkContext.newPage();
await login(clerkPage, "Clerk");
await clerkPage.goto(`${base}/console/salary/salary-2026-10`, {
  waitUntil: "networkidle",
});
const clerkCanApprove =
  (await clerkPage.getByRole("button", { name: "Approve bill" }).count()) > 0;

const managementContext = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const managementPage = await managementContext.newPage();
await login(managementPage, "Management");
await managementPage.goto(`${base}/console/students/stu-0288`, {
  waitUntil: "networkidle",
});
const managementDenied = (
  await managementPage.locator("body").innerText()
).includes("not available for your role");

console.log(
  JSON.stringify(
    {
      errors,
      newStudentUrl,
      receiptUrl,
      receiptHasFeeReceipt: receiptText.includes("FEE RECEIPT"),
      salaryDisbursed,
      attendanceSubmitted: attendanceText.includes("Submitted"),
      clerkCanApprove,
      managementDenied,
    },
    null,
    2,
  ),
);

await browser.close();
