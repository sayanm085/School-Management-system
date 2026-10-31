import { chromium } from "@playwright/test";

const base = "http://localhost:3001";
const output = "/Users/sayan/Documents/School Management system/design/screenshots";

const browser = await chromium.launch({ channel: "chrome" });
const errors = [];

async function newPage(width = 1440, height = 1000) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  return { context, page };
}

async function login(page, account) {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: account }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/console/dashboard", { timeout: 15000 });
  await page.waitForTimeout(1300);
}

const manager = await newPage();
await login(manager.page, /Headmaster/);
const dashboardText = await manager.page.locator("body").innerText();
await manager.page.screenshot({
  path: `${output}/hm-dashboard-cover-alert.png`,
  fullPage: true,
});
const alertVisible =
  (await manager.page.locator("text=A class needs cover").count()) > 0;
const alertText = alertVisible
  ? await manager.page
      .locator("aside")
      .filter({ hasText: "A class needs cover" })
      .first()
      .innerText()
  : "";

await manager.page.goto(`${base}/console/timetable`, {
  waitUntil: "networkidle",
});
await manager.page.waitForTimeout(500);
await manager.page.screenshot({
  path: `${output}/hm-cover-desk.png`,
  fullPage: true,
});
const coverDeskText = await manager.page.locator("body").innerText();
const assignButtons = manager.page.getByRole("button", {
  name: "Assign",
  exact: true,
});
const beforeAssign = await assignButtons.count();
await assignButtons.first().click();
const dialog = manager.page.getByRole("dialog");
await dialog.waitFor();
const dialogText = await dialog.innerText();
await manager.page.screenshot({
  path: `${output}/hm-cover-assign-dialog.png`,
  fullPage: true,
});
const confirmAssign = dialog.getByRole("button", { name: /^Assign / });
await confirmAssign.click();
await manager.page.waitForTimeout(800);
const afterAssign = await manager.page
  .getByRole("button", { name: "Assign", exact: true })
  .count();
await manager.page.screenshot({
  path: `${output}/hm-cover-desk-after-assign.png`,
  fullPage: true,
});

const assistant = await newPage();
await login(assistant.page, /Asst\. headmaster/);
const assistantText = await assistant.page.locator("body").innerText();
await assistant.page.screenshot({
  path: `${output}/ahm-dashboard-cover-alert.png`,
  fullPage: true,
});
await assistant.page.goto(`${base}/console/timetable`, {
  waitUntil: "networkidle",
});
await assistant.page.waitForTimeout(500);
const assistantDeskText = await assistant.page.locator("body").innerText();
await assistant.page.screenshot({
  path: `${output}/ahm-cover-desk.png`,
  fullPage: true,
});

const teacher = await newPage();
await login(teacher.page, /Class teacher/);
const teacherDashboardText = await teacher.page.locator("body").innerText();
await teacher.page.screenshot({
  path: `${output}/teacher-dashboard-free-alert.png`,
  fullPage: true,
});
await teacher.page.goto(`${base}/console/timetable`, {
  waitUntil: "networkidle",
});
await teacher.page.waitForTimeout(500);
const teacherDeskText = await teacher.page.locator("body").innerText();
await teacher.page.screenshot({
  path: `${output}/teacher-cover-desk.png`,
  fullPage: true,
});
const takeButtons = teacher.page.getByRole("button", {
  name: "Take class",
  exact: true,
});
const beforeClaim = await takeButtons.count();
await takeButtons.first().click();
const claimDialog = teacher.page.getByRole("dialog");
await claimDialog.waitFor();
const claimDialogText = await claimDialog.innerText();
await claimDialog.getByRole("button", { name: "Take class", exact: true }).click();
await teacher.page.waitForTimeout(900);
const afterClaimText = await teacher.page.locator("body").innerText();
await teacher.page.screenshot({
  path: `${output}/teacher-cover-desk-after-claim.png`,
  fullPage: true,
});
const registerLink = teacher.page.getByRole("link", { name: "Take register" });
const registerLinkVisible = (await registerLink.count()) > 0;
let registerText = "";
if (registerLinkVisible) {
  await registerLink.first().click();
  await teacher.page.waitForURL("**/console/attendance/VI-A", {
    timeout: 10000,
  });
  await teacher.page.waitForTimeout(500);
  registerText = await teacher.page.locator("body").innerText();
  const updateRegister = teacher.page.getByRole("button", {
    name: "Update register",
  });
  if ((await updateRegister.count()) > 0) {
    await updateRegister.first().click();
    await teacher.page.waitForTimeout(900);
    registerText = await teacher.page.locator("body").innerText();
  }
  await teacher.page.screenshot({
    path: `${output}/teacher-cover-register.png`,
    fullPage: true,
  });
}

const mobile = await newPage(390, 844);
await login(mobile.page, /Headmaster/);
await mobile.page.screenshot({
  path: `${output}/mobile-dashboard-cover.png`,
  fullPage: true,
});
await mobile.page.goto(`${base}/console/timetable`, {
  waitUntil: "networkidle",
});
await mobile.page.waitForTimeout(500);
await mobile.page.screenshot({
  path: `${output}/mobile-cover-desk.png`,
  fullPage: true,
});

const quick = await newPage();
await login(quick.page, /Headmaster/);
const quickAlert = quick.page.getByRole("button", { name: "Assign Minori" });
const quickAlertVisible = (await quickAlert.count()) > 0;
if (quickAlertVisible) {
  await quickAlert.click();
  await quick.page.waitForTimeout(700);
}
await quick.page.goto(`${base}/console/timetable`, {
  waitUntil: "networkidle",
});
await quick.page.waitForTimeout(500);
const quickAfterAssign = await quick.page
  .getByRole("button", { name: "Assign", exact: true })
  .count();

const clerk = await newPage();
await login(clerk.page, /Clerk/);
await clerk.page.screenshot({
  path: `${output}/clerk-dashboard-hero.png`,
  fullPage: true,
});

const management = await newPage();
await login(management.page, /Management/);
await management.page.screenshot({
  path: `${output}/management-dashboard-hero.png`,
  fullPage: true,
});

console.log(
  JSON.stringify(
    {
      errors,
      hm: {
        alertVisible,
        alertMentionsMinori: alertText.includes("Minori"),
        heroHasGreeting: dashboardText.includes("Good morning, Headmaster."),
        coverDeskHasVI: coverDeskText.includes("VI A"),
        coverDeskHasVII: coverDeskText.includes("VII A"),
        beforeAssign,
        afterAssign,
        dialogMentionsMinori: dialogText.includes("Minori"),
      },
      ahm: {
        greeting: assistantText.includes("Good morning, Assistant Headmaster."),
        coverDesk: assistantDeskText.includes("Cover desk"),
        hasUncovered: assistantDeskText.includes("Needs cover"),
      },
      teacher: {
        hero: teacherDashboardText.includes("Good morning, Ananya."),
        hasFreeNow: teacherDashboardText.includes("You are free this period"),
        coverAlert: teacherDashboardText.includes("classes need cover"),
        beforeClaim,
        afterClaimHasCovering: afterClaimText.includes("Covering"),
        claimDialogMentions: claimDialogText.includes("Take this class"),
        registerLinkVisible,
        registerOpened: registerText.includes("VI-A register"),
        coverCompleted: registerText.includes("Cover completed."),
      },
      quick: {
        alertVisible: quickAlertVisible,
        remainingAfterAlertAssign: quickAfterAssign,
      },
    },
    null,
    2,
  ),
);

await browser.close();
