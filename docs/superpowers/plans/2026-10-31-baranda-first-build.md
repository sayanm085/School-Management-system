# Baranda First Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first complete, navigable Baranda staff console and Hazira Flutter teacher app with Civic Modern design, realistic seeded data, and no backend.

**Architecture:** A Next.js App Router console backed by a typed local repository over deterministic seed data and `localStorage`; a Flutter teacher app backed by Drift with an offline attendance queue; shared design tokens generated from one JSON source into CSS and Dart.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS v4, Radix UI, Motion, cmdk, Sonner, Vaul, TanStack Table, React Hook Form, Zod, Zustand, D3 scales, Vitest, Playwright, axe-core. Flutter 3.47, Dart 3, Riverpod, go_router, Drift, SQLite, shared_preferences, Noto Sans Bengali, Inter.

**Spec:** [2026-10-31-baranda-school-operations-design.md](../specs/2026-10-31-baranda-school-operations-design.md)

## Global Constraints

- Node.js 24, npm 11; Flutter 3.47.5; macOS arm64. Do not upgrade the machine's toolchain.
- No backend, no real authentication, no real payments, no network data at runtime. All demo data is local and synthetic.
- No student or guardian login in this build. The student app is a later product.
- Every visible string comes from the EN/BN dictionary. Bengali text uses Noto Sans Bengali; no serif anywhere.
- Civic Modern only: #F5F5F7 canvas, white grouped cards, floating glass chrome, iOS system colors, SF-style sans, 8px grid, 20px card radius.
- No cream, paper texture, ledger rules, faux memo styling, all-caps mono labels, stock classroom photos, or emoji.
- WCAG 2.2 AA: 4.5:1 text, 3:1 large/UI, 44px web targets, 48dp Flutter targets, visible focus, keyboard paths, reduced motion, no color-only status.
- Motion: `transform`/`opacity` only; no `transition: all`, no `scale(0)`, no `ease-in`; no animation on command palette, search, nav, or language toggle; springs for gestures; reduced motion cross-fades.
- Amounts are integer paise in data; display with Indian grouping and `₹`.
- No keychain, code signing, or Android keystore prompts. Flutter demo session uses `shared_preferences`.
- Preserve final web builds and Flutter artifacts before any clean.
- Version control: do not create git commits unless the user explicitly authorizes git. Each task ends with a test/screenshot checkpoint; use Qoder file history for recovery.
- Verification is evidence-based: run the command, read the output, capture the screenshot, inspect it. A build passing is not UI verification.

---

## File Structure

```
apps/web/
  src/app/
    (auth)/login/page.tsx
    (console)/layout.tsx
    (console)/dashboard/page.tsx
    (console)/students/...
    (console)/admissions/...
    (console)/attendance/...
    (console)/staff-attendance/page.tsx
    (console)/exams/...
    (console)/fees/...
    (console)/salary/...
    (console)/analytics/...
    (console)/notices/page.tsx
    (console)/reports/page.tsx
    (console)/settings/page.tsx
    (console)/audit/page.tsx
    design/page.tsx
    layout.tsx
    page.tsx
  src/components/
    shell/ brand/ ui/ data/ attendance/ exams/ fees/ salary/ charts/ print/
  src/lib/
    auth/ data/ i18n/ store/ utils/ types.ts
  src/data/seed/
  src/styles/globals.css
  tests/
apps/teacher_app/
  lib/app/ lib/design/ lib/features/ lib/data/ lib/sync/
  assets/fonts/ assets/avatars/ assets/seed/ assets/seal.svg
  test/ integration_test/
design/tokens.json
tools/generate-tokens.mjs
tools/generate-demo-data.mjs
```

---

### Task 1: Repository, tokens, fonts, and web scaffold

**Files:**
- Create: `apps/web/package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/styles/globals.css`, `src/lib/utils/cn.ts`
- Create: `design/tokens.json`, `tools/generate-tokens.mjs`, `tools/generate-tokens.test.mjs`
- Generate: `apps/web/src/styles/tokens.css`, `apps/teacher_app/lib/design/tokens.dart`
- Test: `tools/generate-tokens.test.mjs`

**Interfaces:**
- Produces: `design/tokens.json`; `tokens.css` CSS variables; `tokens.dart` Dart constants; `cn(...classes)` utility.

- [ ] **Step 1: Create the web app skeleton**

Create `apps/web` with Next.js App Router, TypeScript, Tailwind v4, and the dependencies listed in Global Constraints. Do not use the default starter page beyond a placeholder. The app must start with `npm run dev`.

- [ ] **Step 2: Write the failing token test**

```js
// tools/generate-tokens.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generate } from './generate-tokens.mjs';

test('generates CSS and Dart tokens from the same source', () => {
  const { css, dart } = generate(readFileSync(new URL('../design/tokens.json', import.meta.url), 'utf8'));
  assert.match(css, /--canvas:\s*#F5F5F7/);
  assert.match(css, /--blue:\s*#007AFF/);
  assert.match(dart, /static const canvas = Color\(0xFFF5F5F7\)/);
  assert.match(dart, /static const blue = Color\(0xFF007AFF\)/);
});
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `node --test tools/generate-tokens.test.mjs`
Expected: FAIL because `generate` does not exist.

- [ ] **Step 4: Implement the token source and generator**

`design/tokens.json` must contain the complete Civic Modern light/dark colors from spec §7.2, the type scale, spacing, radii, shadows, materials, and motion values. The generator converts camelCase keys to kebab-case CSS variables and Dart lowerCamelCase constants, prefixes colors with `0xFF`, and writes both outputs. It must fail loudly on a missing color or motion token.

- [ ] **Step 5: Wire fonts and global styles**

Use `next/font/google` for **Inter** and **Noto Sans Bengali**. Set the body font to the system SF stack with Inter fallback; set `lang` from the locale provider. Import `tokens.css` and Tailwind. Base body: `background: var(--canvas); color: var(--ink); -webkit-font-smoothing: antialiased;`.

- [ ] **Step 6: Verify tokens, build, and first screenshot**

Run:
- `node --test tools/generate-tokens.test.mjs`
- `npm run build`
- `npm run dev` and open `http://localhost:3000`

Expected: test passes, build succeeds, a blank Civic Modern canvas renders. Capture a screenshot of the placeholder and inspect it.

---

### Task 2: Design-system primitives and gallery

**Files:**
- Create: `src/lib/utils/cn.ts`, `src/components/ui/Button.tsx`, `Badge.tsx`, `StatusPill.tsx`, `Card.tsx`, `Input.tsx`, `Select.tsx`, `Dialog.tsx`, `Sheet.tsx`, `Tooltip.tsx`, `Tabs.tsx`, `SegmentedControl.tsx`, `EmptyState.tsx`, `Skeleton.tsx`, `Toast.tsx`, `SchoolSeal.tsx`, `Avatar.tsx`
- Create: `src/app/design/page.tsx`
- Test: `src/components/ui/button.test.tsx`, `src/components/ui/dialog.test.tsx`

**Interfaces:**
- Consumes: CSS variables, `cn`.
- Produces: `Button({ variant, size, loading, ...props })`, `StatusPill({ tone, children })`, `Dialog`, `Sheet`, `SchoolSeal({ size })`, `Avatar({ name, src, size })`.

- [ ] **Step 1: Write failing component tests**

Test that `Button` renders its label, exposes `aria-busy` when loading, and is not clickable when disabled; test that `Dialog` renders a title, traps focus, and closes on Escape.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm run test -- button.test.tsx dialog.test.tsx`
Expected: FAIL because components do not exist.

- [ ] **Step 3: Implement the primitives**

Use Radix for Dialog, Select, Tabs, Tooltip, Switch, Checkbox; Vaul for Sheet; Sonner for Toast; cva + `cn` for variants. Implement the school seal as an original vector component (book, river line, `NUV · 1948`) with no external image. `Avatar` uses an image when present, otherwise initials on a deterministic warm background.

- [ ] **Step 4: Build the `/design` gallery**

Render every color token with its hex and contrast note, the type scale in Latin and Bengali, spacing, radii, buttons in all states, status pills, inputs, tabs, a dialog trigger, a sheet trigger, an empty state, a skeleton, and the seal at three sizes. The gallery must be usable as a visual regression target.

- [ ] **Step 5: Verify and screenshot**

Run tests, `npm run build`, and screenshot `/design` at 1440 and 390. Inspect for contrast, clipping, and Bengali shaping. No placeholder text.

---

### Task 3: Domain types, deterministic demo data, and repository

**Files:**
- Create: `src/lib/types.ts`, `src/lib/data/repository.ts`, `src/lib/data/selectors.ts`, `src/lib/data/repository.test.ts`
- Create: `tools/generate-demo-data.mjs`, `tools/generate-demo-data.test.mjs`
- Generate: `src/data/seed/*.json`, `apps/teacher_app/assets/seed/*.json`
- Create: `tools/fetch-avatars.mjs` and `src/assets/avatars/*.svg`

**Interfaces:**
- Consumes: nothing.
- Produces: all entity types from spec §8.1; `createInitialData()`, `loadStore()`, `saveStore()`, `resetStore()`, `mutate(store, event)`, `audit(actor, action, entity, before, after)`, selectors for student, section, attendance, fees, salary.

- [ ] **Step 1: Write the failing data invariants test**

```ts
import { describe, it, expect } from 'vitest';
import { createInitialData } from './repository';

describe('demo data', () => {
  const db = createInitialData();
  it('has 480 students, 12 sections, 24 teachers and 48 in VIII B', () => {
    expect(db.students).toHaveLength(480);
    expect(db.sections).toHaveLength(12);
    expect(db.staff.filter(s => s.role === 'teacher')).toHaveLength(24);
    expect(db.students.filter(s => s.classSectionId === 'VIII-B')).toHaveLength(48);
  });
  it('has unique admission and roll numbers', () => {
    expect(new Set(db.students.map(s => s.admissionNo)).size).toBe(480);
    expect(new Set(db.students.map(s => `${s.classSectionId}:${s.rollNo}`)).size).toBe(480);
  });
  it('keeps fees and salary balanced in paise', () => {
    for (const bill of db.bills) {
      const paid = db.payments.filter(p => p.billId === bill.id && p.status === 'posted')
        .reduce((sum, p) => sum + p.amountPaise, 0);
      expect(bill.duePaise).toBe(bill.totalPaise - bill.concessionPaise - paid);
    }
    for (const line of db.salaryLines) {
      expect(line.netPayPaise).toBe(line.earningsPaise - line.deductionsPaise);
    }
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm run test -- repository.test.ts`
Expected: FAIL because `createInitialData` does not exist.

- [ ] **Step 3: Implement the generator and repository**

Use a small seeded PRNG (mulberry32) so data is identical every run. Generate the school, 12 sections, 480 students, 24 teachers, 6 non-teaching staff, assignments, 12 weeks of attendance, two exams with marks and results, fee structures and bills, salary structures and one prepared October bill, notices, and audit events. Use Bengali names with English transliterations from curated lists; mask guardian phones; use `NUV-2026-####` admission numbers and `R-####` receipt numbers. Generate 16 illustrated avatars locally with DiceBear (`@dicebear/core` + `@dicebear/collection`, CC BY 4.0 attribution in the About/settings screen); no AI-generated child photos.

- [ ] **Step 4: Implement the repository with audit**

The repository exposes typed collections, `mutate` clones the store, applies the change, appends an audit event, and persists. `loadStore` validates the schema version; a mismatch resets to seed with a visible banner. `resetStore` clears localStorage and returns seed data. Every financial and approval mutation creates an audit event.

- [ ] **Step 5: Run invariant and repository tests**

Run: `npm run test -- repository.test.ts`
Expected: PASS. Then run a second generator invocation and compare checksums to prove determinism.

---

### Task 4: Auth, permissions, shell, and login

**Files:**
- Create: `src/lib/auth/permissions.ts`, `src/lib/auth/demo-accounts.ts`, `src/lib/store/session.ts`, `src/components/auth/RequirePermission.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(console)/layout.tsx`, `src/components/shell/{Sidebar,TopBar,CommandPalette,LanguageToggle,ThemeToggle,DemoBadge}.tsx`, `src/lib/i18n/{en.ts,bn.ts,provider.tsx}`
- Test: `src/lib/auth/permissions.test.ts`, `src/app/(auth)/login.test.tsx`, `tests/e2e/auth.spec.ts`

**Interfaces:**
- Consumes: repository, types.
- Produces: `can(role, permission, scope?)`, `DEMO_ACCOUNTS`, `useSession()`, `RequirePermission`, `useLocale()`, `t(key)`, console shell.

- [ ] **Step 1: Write the failing permission matrix test**

Test the full spec §3.2 matrix: Headmaster full; Teacher scoped to assigned sections/subjects; Clerk full on students/fees/salary preparation; Management aggregate-only and denied student PII; all roles denied unknown permissions. Include class-teacher and subject-teacher assignment scoping.

- [ ] **Step 2: Run and confirm failure**

Run: `npm run test -- permissions.test.ts`
Expected: FAIL because `can` does not exist.

- [ ] **Step 3: Implement auth, permissions, and session**

Use the four demo accounts from spec §3.4 with visible demo passwords. Store the session in Zustand + localStorage. `can` implements role presets plus assignments; `RequirePermission` redirects to `/login` or renders a permission-denied state. No real security is implied; the demo badge is always visible.

- [ ] **Step 4: Build login and the console shell**

Login: seal, bilingual school name, school code, employee ID, password, demo account buttons, language toggle. Shell: floating glass sidebar with school lockup, academic-year pill, role navigation, demo badge, language/theme controls, profile; top bar with breadcrumb, search trigger, notification button, locale and profile. Command palette opens instantly with no animation; it searches students, staff, bills, and routes within permission scope.

- [ ] **Step 5: Add bilingual dictionaries and theme**

Every visible string in the shell and login comes from `en.ts`/`bn.ts`. Bengali text uses `lang="bn"`. Theme follows system by default, with a manual toggle. Reduced-transparency falls back to opaque chrome.

- [ ] **Step 6: Verify and screenshot**

Run permission tests and Playwright auth spec; sign in as all four roles; screenshot login, HM sidebar, and management sidebar at 1440 and 390. Confirm the management account cannot open a student record URL.

---

### Task 5: Role dashboards

**Files:**
- Create: `src/app/(console)/dashboard/page.tsx`, `src/components/dashboard/{SchoolDayTimeline,SummaryCard,AttentionList,ClassRows,QuickActions}.tsx`
- Test: `tests/e2e/dashboards.spec.ts`, `src/components/dashboard/school-day.test.tsx`

**Interfaces:**
- Consumes: session, repository selectors, school-day data.
- Produces: role-specific dashboard render; the school-day timeline used later on attendance pages.

- [ ] **Step 1: Write the failing dashboard tests**

Assert HM sees “Morning Register,” the current period, attendance 94.2%, fee collection, exam readiness, needs-attention items, and class rows. Assert Teacher sees “My Day,” Clerk sees “Front Office,” Management sees “Governance” and no student names or guardian phones.

- [ ] **Step 2: Implement the dashboards**

HM hero: school-day timeline with 07:45 Assembly through 14:00 Dismissal, current P4 Physical Science highlighted in blue; summary cards for attendance, fee collection, exam readiness; grouped class rows; needs-attention list; recent activity. Clerk: admissions queue, today's collection, pending documents. Teacher: timetable, pending registers, notices. Management: aggregate trends, finance summary, audit highlights, no PII. Use the spec's components and tokens; no generic KPI wall.

- [ ] **Step 3: Add first-load stagger**

Only the dashboard cards use a one-time 300ms rise with 40ms stagger. Filters and refreshes do not replay it. Respect reduced motion.

- [ ] **Step 4: Verify and screenshot**

Run Playwright dashboards spec; screenshot all four roles at 1440 and 768. Inspect the timeline, the Bengali lockup, and management's privacy.

---

### Task 6: Students and admissions

**Files:**
- Create: `src/app/(console)/students/page.tsx`, `students/[id]/page.tsx`, `students/new/page.tsx`, `students/[id]/edit/page.tsx`, `src/app/(console)/admissions/page.tsx`, `admissions/[id]/page.tsx`, `admissions/new/page.tsx`
- Create: `src/components/students/{StudentTable,StudentHeader,StudentTabs,AttendanceHeatRegister,SubjectBars,FeeLedger,DocumentChecklist}.tsx`, `src/components/admissions/{ApplicationQueue,ApplicationForm,DocumentVerifier}.tsx`
- Create: `src/lib/domain/{students,admissions}.ts`
- Test: `src/lib/domain/students.test.ts`, `admissions.test.ts`, `tests/e2e/students-admissions.spec.ts`

**Interfaces:**
- Consumes: repository, permissions, routes.
- Produces: `createStudent`, `updateStudent`, `transferStudent`, `approveApplication`, `assignRoll`, `parseBulkStudents`.

- [ ] **Step 1: Write failing domain tests**

Test admission number uniqueness, roll assignment within a section, duplicate detection on bulk import, status transitions, and transfer blocking when dues exist.

- [ ] **Step 2: Implement the domain functions and pages**

Students list with search/filter/class/section/status; profile with Overview, Attendance, Results, Fees, Documents, Timeline; add/edit with Zod validation; document upload placeholders with local file references; transfer/TC with dues check. Admissions queue with status tabs; detail with document checklist and decision; approve creates the student, admission number, and roll number; bulk import has a dry-run summary.

- [ ] **Step 3: Use the weekly heat register**

Render a 12-week × 6-day grid with green present, red absent, amber late, grey holiday, and blank no-entry cells. Every cell has an accessible label; the legend is visible. The same component is used on the student profile and analytics.

- [ ] **Step 4: Verify and screenshot**

Run domain tests and Playwright flow: create application → verify documents → approve → student appears in VIII B roster → open profile. Screenshot list, profile, and admissions detail at 1440 and 768.

---

### Task 7: Attendance web and staff attendance

**Files:**
- Create: `src/app/(console)/attendance/page.tsx`, `attendance/[sectionId]/page.tsx`, `attendance/[sectionId]/history/page.tsx`, `attendance/corrections/page.tsx`, `src/app/(console)/staff-attendance/page.tsx`
- Create: `src/components/attendance/{RegisterGrid,RegisterCell,CorrectionDialog,WeeklyStrip,StaffAttendanceList,LeaveDialog}.tsx`
- Create: `src/lib/domain/attendance.ts`
- Test: `src/lib/domain/attendance.test.ts`, `tests/e2e/attendance.spec.ts`

**Interfaces:**
- Consumes: repository, permissions, dashboards components.
- Produces: `markAttendance`, `submitRegister`, `requestCorrection`, `approveCorrection`, `staffCheckIn`, `requestLeave`.

- [ ] **Step 1: Write failing attendance tests**

Test unique student/date/session, present/absent/late/leave/holiday statuses, submission locking, correction requiring a reason, Headmaster approval, staff leave affecting payable days, and audit events.

- [ ] **Step 2: Implement the register and corrections**

Class/section picker with today's state; weekly grid; bulk mark present then adjust; submit with summary; locked state after submit; correction queue with before/after and reason; staff attendance with check-in/out and leave. The Flutter app writes its own local records; web and app are separate demos until the backend milestone. The web register uses seeded teacher marks so both demos tell the same story.

- [ ] **Step 3: Add accessible status cells**

Each cell uses an icon + text label, not color alone, and supports keyboard selection. The register has a table caption and header associations.

- [ ] **Step 4: Verify and screenshot**

Run tests and Playwright: mark VIII B, submit, request correction, approve, verify audit and analytics count. Screenshot register and corrections at 1440 and 768.

---

### Task 7b: Timetable and cover

**Files:**
- Create: `src/lib/domain/timetable.ts`
- Create: `src/app/console/timetable/page.tsx`
- Create: `src/components/timetable/{TimetableGrid,AssignCoverDialog}.tsx`
- Create: `src/components/dashboard/{DashboardHero,SchoolPulsePanel,CoverBoardCard,FreeTeachersCard}.tsx`
- Create: `src/components/shell/CoverAlert.tsx`
- Update: `tools/generate-demo-data.mjs`, `src/lib/data/repository.ts`, `src/lib/auth/permissions.ts`, `src/components/shell/nav.ts`, `src/components/shell/TopBar.tsx`, `src/components/shell/ProfileMenu.tsx`, `src/lib/i18n/copy.ts`
- Test: `scripts/verify-cover.mjs`, `scripts/axe-cover.mjs`

**Interfaces:**
- Consumes: repository, staff attendance, approved leave, timetable.
- Produces: `uncoveredPeriods`, `freeTeachersAt`, `suggestTeacherFor`, `teacherDay`, `teacherCoverOptions`, `coverSummary`, `canManageCover`, `canClaimCover`.

- [x] **Step 1: Seed the timetable and cover scenario**

Generate a six-period Saturday half day for all sections, a full weekday timetable, an Assistant Headmaster, an English teacher (Minori Das) who is free at P4, one covered period, and two uncovered periods. Keep the seed deterministic.

- [x] **Step 2: Derive cover and suggestions**

Mark a period uncovered only when the regular teacher is absent and no substitution exists. A teacher is free only with no timetable entry, no substitution, and no approved leave. Rank suggestions by exact section–subject assignment, primary subject, and daily load.

- [x] **Step 3: Build the cover desk and automatic alert**

The Headmaster and Assistant Headmaster see the live period, uncovered classes, free teachers, one-action assignment, and a dismissible automatic cover alert. Teachers see their free periods, can claim a class only when free, and unlock the class register for that period. Every action is audit-logged.

- [x] **Step 4: Replace the dashboard header**

Use the navy Civic Modern hero with a live school-day panel, half-day ribbon, contextual actions, and a cover banner. Add a floating glass top bar and the cover alert on all console routes.

- [x] **Step 5: Verify, screenshot, and audit**

Playwright: alert visible for HM/AHM → assign from the alert → cover count drops; assign from the desk; teacher claim → register opens. Screenshot desktop/mobile. Axe: zero WCAG 2.2 AA violations on the dashboard and cover desk for HM, AHM, and teacher.

---

### Task 8: Examinations

**Files:**
- Create: `src/app/(console)/exams/page.tsx`, `exams/[id]/page.tsx`, `exams/[id]/marks/page.tsx`, `exams/[id]/results/page.tsx`, `exams/[id]/report-cards/page.tsx`
- Create: `src/components/exams/{ExamSetup,MarksGrid,ResultPreview,ReportCard,ReadinessPanel}.tsx`
- Create: `src/lib/domain/exams.ts`
- Test: `src/lib/domain/exams.test.ts`, `tests/e2e/exams.spec.ts`

**Interfaces:**
- Consumes: repository, permissions, students.
- Produces: `createExam`, `calculateSubjectResult`, `calculateResults`, `publishResults`, `renderReportCard`.

- [ ] **Step 1: Write failing result tests**

```ts
it('passes only when every subject and the aggregate pass', () => {
  const result = calculateResult({ Bengali: 45, English: 34, Mathematics: 32, Science: 60, History: 55 });
  expect(result.pass).toBe(false);
  expect(result.subjectsFailed).toEqual(['Mathematics']);
  expect(result.percentage).toBeCloseTo(45.2, 1);
});
it('ranks ties densely within a section', () => {
  const ranked = rankResults([{ studentId: 'a', total: 400 }, { studentId: 'b', total: 400 }, { studentId: 'c', total: 380 }]);
  expect(ranked.map(r => r.rank)).toEqual([1, 1, 2]);
});
```

- [ ] **Step 2: Implement exam setup and marks**

Exam list with status; setup for subjects, dates, max/pass marks, theory/internal/practical split; readiness panel; marks grid with keyboard navigation, autosave, validation, and outliers. Marks cannot exceed the subject maximum.

- [ ] **Step 3: Implement results, publication, and report cards**

Moderation view with missing marks and totals; calculate pass/fail per subject and overall; rank within section; publish locks the exam; report cards are bilingual and print-ready with the seal and a demo verification QR.

- [ ] **Step 4: Verify and screenshot**

Run tests and Playwright: set up exam → enter marks → moderate → publish → open report card. Screenshot marks grid and results at 1440; print preview at A4.

---

### Task 9: Fees and receipts

**Files:**
- Create: `src/app/(console)/fees/page.tsx`, `fees/structure/page.tsx`, `fees/bills/page.tsx`, `fees/bills/[id]/page.tsx`, `fees/receipts/[id]/page.tsx`, `fees/concessions/page.tsx`
- Create: `src/components/fees/{FeeStructureGrid,BillTable,CollectPaymentDialog,Receipt,ConcessionDialog}.tsx`
- Create: `src/lib/domain/fees.ts`
- Test: `src/lib/domain/fees.test.ts`, `tests/e2e/fees.spec.ts`

**Interfaces:**
- Consumes: repository, permissions, students.
- Produces: `generateBills`, `collectPayment`, `voidPayment`, `applyConcession`, `calculateBalance`, `nextReceiptNo`.

- [ ] **Step 1: Write failing fee tests**

Test bill total − concession − payments = due; reject overpayment; reject a waiver above the clerk limit without HM approval; generate sequential receipt numbers; voiding retains the original and writes an audit event.

- [ ] **Step 2: Implement fee structures, bills, and collection**

Class-wise fee structures; bulk and individual bill generation; bill detail with line items; payment dialog for cash/UPI/cheque with reference; receipt preview; concessions; defaulters; daily collection.

- [ ] **Step 3: Implement the printable receipt**

Bilingual receipt with school seal, receipt number, student, class, line items, amount in words, method, date, collector, and demo QR. Print CSS must fit A5/A4 without clipping.

- [ ] **Step 4: Verify and screenshot**

Run tests and Playwright: generate a bill → collect partial → collect balance → print receipt → attempt overpayment and see the error. Screenshot fees dashboard and receipt.

---

### Task 10: Salary bills and payslips

**Files:**
- Create: `src/app/(console)/salary/page.tsx`, `salary/[month]/page.tsx`, `salary/payslips/[id]/page.tsx`
- Create: `src/components/salary/{SalaryTable,SalaryLineEditor,ApprovalBar,Payslip}.tsx`
- Create: `src/lib/domain/salary.ts`
- Test: `src/lib/domain/salary.test.ts`, `tests/e2e/salary.spec.ts`

**Interfaces:**
- Consumes: repository, permissions, staff attendance/leave.
- Produces: `prepareSalaryBill`, `calculateSalaryLine`, `verifyBill`, `approveBill`, `disburseBill`, `renderPayslip`.

- [ ] **Step 1: Write failing salary tests**

Test payable days from attendance and approved leave; earnings minus deductions = net; approved bills cannot be edited; reopening requires HM action and audit; disbursement records date/mode/reference.

- [ ] **Step 2: Implement salary workflow**

Salary dashboard with monthly totals and staff on leave; bill detail with lines and adjustments; verify → approve → disburse; payslip with bilingual labels and seal; no bank integration.

- [ ] **Step 3: Verify and screenshot**

Run tests and Playwright: prepare October → verify → approve → disburse → print payslip; confirm the approved bill is locked. Screenshot dashboard, bill, payslip.

---

### Task 11: Analytics, notices, reports, settings, audit

**Files:**
- Create: `src/app/(console)/analytics/page.tsx`, `analytics/students/[id]/page.tsx`, `notices/page.tsx`, `reports/page.tsx`, `settings/page.tsx`, `audit/page.tsx`
- Create: `src/components/analytics/{RiskFlag,SubjectBars,ClassComparison,AttendanceTrend,FeeTrend}.tsx`, `src/components/notices/NoticeComposer.tsx`, `src/components/reports/ReportTable.tsx`, `src/components/settings/SettingsSections.tsx`, `src/components/audit/AuditTable.tsx`
- Create: `src/lib/domain/analytics.ts`, `src/lib/domain/reports.ts`
- Test: `src/lib/domain/analytics.test.ts`, `tests/e2e/admin.spec.ts`

**Interfaces:**
- Consumes: repository, permissions, all domain selectors.
- Produces: `computeRiskFlags(student)`, `schoolAnalytics(filters)`, `exportCsv(report)`, `publishNotice`, `updateSettings`.

- [ ] **Step 1: Write failing analytics tests**

Test each risk rule and evidence: attendance below 75%, 3+ consecutive absences, 2+ failing subjects, fees overdue 2+ months. Test management aggregate projection excludes names and phone numbers. Test CSV export headers and audit event.

- [ ] **Step 2: Implement analytics and risk flags**

School analytics: attendance trend, subject performance, class comparison, fee collection, staff attendance. Student analytics: heat register, subject bars, fee ledger, risk flags with rule text. Charts are SVG with accessible table alternatives.

- [ ] **Step 3: Implement notices, reports, settings, audit**

Notice composer with audience and bilingual body; reports catalogue with CSV exports; settings for school, year, classes, subjects, fee heads, salary components, roles; audit table with filters and before/after.

- [ ] **Step 4: Verify and screenshot**

Run tests and Playwright: management sees no PII; export a report and verify the audit event; change a fee head and see it in a new bill; publish a notice and see it in the Flutter seed later. Screenshot analytics and settings.

---

### Task 12: Flutter foundation — theme, data, login, today, notices, profile

**Files:**
- Create: `apps/teacher_app/pubspec.yaml`, `lib/main.dart`, `lib/app/app.dart`, `lib/app/router.dart`
- Create: `lib/design/{tokens.dart,theme.dart}`, `lib/data/{database.dart,tables.dart,seed.dart,repository.dart}`, `lib/features/auth/{login_screen.dart,auth_controller.dart}`, `lib/features/today/today_screen.dart`, `lib/features/notices/notices_screen.dart`, `lib/features/profile/profile_screen.dart`
- Create: `assets/fonts/NotoSansBengali.ttf`, `assets/fonts/Inter.ttf`, `assets/seal.svg`, `assets/avatars/*.svg`, `assets/seed/*.json`
- Test: `test/auth_test.dart`, `test/seed_test.dart`, `test/widget/today_test.dart`

**Interfaces:**
- Consumes: generated `tokens.dart`, Flutter seed JSON.
- Produces: Drift database, `AuthController`, `TodayScreen`, `NoticesScreen`, `ProfileScreen`, router.

- [ ] **Step 1: Scaffold Flutter and bundle assets**

Run `flutter create --org bd.baranda --platforms=ios,android apps/teacher_app`. Add Riverpod, go_router, Drift, sqlite3_flutter_libs, path_provider, path, intl, flutter_svg, shared_preferences. Bundle Noto Sans Bengali and Inter; set them in `pubspec.yaml`. Copy the seal and avatars. Do not add keychain or signing dependencies.

- [ ] **Step 2: Write failing seed and auth tests**

Test 48 VIII B students, unique rolls, the demo teacher account, wrong password rejection, and session persistence via shared_preferences. Test that the today screen shows the teacher's pending register.

- [ ] **Step 3: Implement theme, database, auth, and navigation**

Theme from tokens: #F2F2F7 background, white cards, blue/green/red system colors, Bengali semibold names, no serif. Drift tables for staff session, students, attendance drafts, queue, notices. Seed on first run. Router with `/login`, shell tabs, and full-screen attendance route. Login: seal, bilingual school name, employee ID, password, demo button, language toggle, offline note.

- [ ] **Step 4: Implement Today, Notices, Profile**

Today: greeting, date, school day, pending registers, assigned classes, notices, sync status. Notices: list/detail. Profile: teacher identity, language, theme, sync, logout, demo reset, version. No dead ends; every screen has a back or tab.

- [ ] **Step 5: Verify and screenshot**

Run `flutter test`; run on iOS Simulator or Android emulator; screenshot login, today, notices, profile. Inspect Bengali shaping and safe areas.

---

### Task 13: Hazira attendance deck, summary, roster, offline queue

**Files:**
- Create: `lib/features/attendance/{attendance_screen.dart,attendance_controller.dart,roll_call_card.dart,week_register.dart,deck_pager.dart,summary_screen.dart,roster_screen.dart,student_quick_view.dart}`
- Create: `lib/sync/{sync_service.dart,sync_status.dart}`
- Create: `lib/features/attendance/attendance_actions.dart`
- Test: `test/attendance_controller_test.dart`, `test/widget/deck_test.dart`, `integration_test/attendance_flow_test.dart`

**Interfaces:**
- Consumes: repository, Drift, auth.
- Produces: `AttendanceController` with `students`, `index`, `marks`, `mark(status)`, `undo()`, `next()`, `previous()`, `submit()`, `syncStatus`.

- [ ] **Step 1: Write failing controller tests**

Test marking present/absent/late/leave, undo restores the previous state, next/previous boundaries, summary counts, submit locks, restart persistence, and the queue entry created on submit.

- [ ] **Step 2: Implement the deck**

Use a vertical `PageView` with `reverse: true` so a downward swipe advances to the next student and an upward swipe returns. Cards transform with scale/opacity based on page offset; a second card peeks behind. Buttons advance with a 300ms ease-out page animation. Marking is a deliberate tap with a stamp and `HapticFeedback.mediumImpact()`. The deck respects reduce-motion and has a full roster alternative.

- [ ] **Step 3: Implement summary, roster, and offline queue**

Summary: counts, absentee list, undo, review, submit, save offline. Roster: grouped list, status chips, bulk mark, search. Offline: Drift write on every mark; submit enqueues an idempotent operation; sync status displays Saved offline / Syncing / Synced; demo sync toggles from Profile. No data loss on restart.

- [ ] **Step 4: Verify on device and with tests**

Run `flutter test`, `flutter test integration_test/attendance_flow_test.dart`, and a golden test for the deck at 390×844. On the simulator, mark 48 students, undo one, submit, restart, and confirm persistence. Capture screenshots of deck, stamp state, summary, roster, offline banner. Test a physical phone if available; otherwise state that hardware verification is pending.

---

### Task 14: QA, accessibility, screenshots, and final report

**Files:**
- Create: `tests/e2e/{auth,dashboards,students-admissions,attendance,exams,fees,salary,admin}.spec.ts`, `tests/e2e/accessibility.spec.ts`, `tests/visual.spec.ts`
- Create: `scripts/capture-screenshots.mjs`, `scripts/check-contrast.mjs`
- Test: all web and Flutter suites.

**Interfaces:**
- Consumes: the complete app.
- Produces: test results, screenshot set, contrast report, final verification note.

- [ ] **Step 1: Run the full web test suite**

Run `npm run test`, `npx playwright test`, and the axe scans. Expected: all pass. Fix failures at the source, not by weakening assertions.

- [ ] **Step 2: Run the full Flutter suite**

Run `flutter analyze`, `flutter test`, `flutter test integration_test/attendance_flow_test.dart`. Expected: no analyzer errors, all tests pass.

- [ ] **Step 3: Measure contrast and capture screenshots**

Run the contrast script on every foreground/background pair used in buttons, status pills, text, and charts. Capture 1440, 1024, 768, and 390 screenshots for login, all four dashboards, student profile, attendance register, marks grid, fee receipt, salary payslip, analytics, and the Hazira deck/summary/roster. Open every screenshot and inspect it; do not claim visual verification from a build.

- [ ] **Step 4: Test the golden paths and edge cases**

Web: enroll → attendance → marks → results → report card → bill → payment → receipt → salary → payslip; permission denial; management PII; offline? (web is online). Flutter: login → deck → mark 48 → undo → summary → submit → restart → sync; offline; reduced motion; screen reader labels.

- [ ] **Step 5: Preserve artifacts and write the final report**

Copy the web build and Flutter artifacts to a stable output folder before any clean. The final report must state what passed, what was verified visually, what needs a physical device, and any remaining limitations. No success claim without command output or a screenshot.
