# Baranda — School Operations System

**Design specification and first-build plan**

- Date: 31 October 2026
- Status: Art direction approved (Civic Modern); specification awaiting build approval
- Working product names: **Baranda** (web console), **Hazira** (Flutter teacher app)
- Demo school: **Nabagram Uchcha Vidyalaya (Demo)** / **নবগ্রাম উচ্চ বিদ্যালয় (ডেমো)**
- Demo academic year: 2026–27
- Approved art direction: [Civic Modern web](../../../design/concepts/civic-modern-web-2.png) and [Hazira deck](../../../design/concepts/civic-modern-mobile.png)

---

## 1. Executive summary

Baranda is a staff-only school operations system for West Bengal government-sponsored and aided secondary schools. It covers admissions and enrollment, student records, daily attendance, examinations, fee billing and collection, salary bill preparation, school and student analytics, notices, reports, and audit. Hazira is the Flutter teacher app for login and fast, swipe-based class attendance.

West Bengal already operates **Banglar Shiksha 3.0** for state-level school data, and government-school fees and salaries are regulated. Baranda is therefore a **school-level operations layer** that complements the state system: it owns the school's daily workflow, produces clean records, and is designed to export rather than replace. The demo is fictional, clearly labelled, and makes no claim to be an official portal.

The first build is a **complete, navigable simulation** with realistic seeded data and no backend. Every role and module is reachable, the core flows are interactive, payments are recorded rather than processed, and the Flutter attendance app is complete. Real authentication, payments, notifications, and integrations are a later milestone.

The design language is **Civic Modern**: modern Apple foundations (system typography, grouped surfaces, translucent chrome, system colors, spring motion) carrying a Bengali government-school identity through the seal, bilingual copy, and formal record structure. It deliberately rejects the earlier paper-register look.

---

## 2. Context, constraints, and non-goals

### 2.1 Operating context

- West Bengal school education includes primary, upper-primary, secondary (Madhyamik), and higher-secondary stages. The demo models a government-sponsored secondary school, Classes V–X, two sections per class.
- The state's Banglar Shiksha platform already handles state-level student and school data. Baranda does not attempt to replace it.
- Government-school fees are constrained by the RTE framework; the demo uses nominal examination and session charges, not commercial tuition fees.
- Teacher salaries in government schools are disbursed through the treasury. Baranda prepares, verifies, approves, and records salary bills; it does not move money.
- UDISE+ is the national school data system. Baranda's reports are designed to be export-ready, not to submit directly.

### 2.2 Product boundaries

| In scope | Out of scope for the first build |
| --- | --- |
| Staff console: Headmaster, Teacher, Clerk, Management | Student or guardian login |
| Admissions, students, attendance, timetable and cover, exams, fees, salary, analytics, notices, reports, settings, audit | The separate student app (future product) |
| Flutter teacher app: login, class roster, swipe attendance, offline queue, summary, notices, profile | Real payment gateway, bank integration, SMS/WhatsApp delivery |
| Local seeded data, demo authentication, localStorage/Drift persistence | Production backend, real authentication, multi-school tenancy |
| Bilingual English/Bengali UI and print documents | Direct Banglar Shiksha or UDISE submission |
| Light and dark appearances, reduced motion, WCAG 2.2 AA | Biometrics, Apple/Google sign-in, push notifications |
| Print-ready receipts, report cards, salary bills | Library, transport, hostel, payroll banking, board registration |

### 2.3 Explicit assumptions

- The demo school is fictional. No official West Bengal emblem, logo, or government wordmark is used. The seal is an original school mark.
- Demo people, phone numbers, addresses, marks, bills, and salary figures are synthetic. No real student data is used.
- Student and staff portraits are illustrated avatars in the demo. Production photo upload requires guardian consent and a retention policy.
- The clerk records cash, UPI, and cheque payments. Online payment is simulated and belongs to the future student app.
- The salary module is a bill-preparation and disbursement-record workflow, not a treasury or bank integration.
- Bengali labels are first-class. Western Arabic numerals are used for tables and amounts by default; Bengali date formatting is used on Bengali-first surfaces. A Bengali-numeral option is future work.
- The current demo date is **Saturday, 31 October 2026**, a half day. The academic year runs April–March.
- The web console and the Flutter app do **not** share live data in this backend-free first build. Each runs on its own seeded local store. The app's offline and sync states are simulated; live cross-device attendance sync arrives with the backend milestone. The web register uses seeded teacher marks so the demo remains coherent on both surfaces.

### 2.4 Terminology decision

The brief described the two attendance buttons as “pass” and “fail.” In school attendance, the correct states are **Present** and **Absent** (Bengali: উপস্থিত / অনুপস্থিত). The app uses those labels, with Late and Leave available as secondary states. Examination pass/fail is a separate concept in the exam module. This mapping is deliberate and appears consistently across web, app, analytics, and documents.

---

## 3. Users, roles, and permissions

### 3.1 Role model

There are four sign-in roles. Class teacher, subject teacher, exam coordinator, and accountant are **assignments or permission presets**, not separate roles. This mirrors real schools: the same physics teacher may also be VIII B's class teacher and the exam coordinator.

| Role | Primary job | Scope |
| --- | --- | --- |
| **Headmaster / Headmistress** | Run the school, approve, publish, see everything | Whole school |
| **Teacher** | Mark attendance, enter marks, see assigned students, own payslip and leave | Assigned class sections and subjects |
| **Clerk** | Admissions, records, fee collection, salary bill preparation, reports | Whole school operations; no result publication |
| **Management** | Governance oversight: aggregates, trends, finance summary, audit highlights | Whole school, aggregate only |

**Assignments:** `Class Teacher` of a section, `Subject Teacher` for a class-section–subject, `Exam Coordinator` for an exam, `Accountant` for fee/salary operations, and `Assistant Headmaster` for cover-desk management. Assignments grant scoped permissions; they do not change the sign-in role. The Assistant Headmaster can assign and mark cover but does not inherit the Headmaster's approval, fee, or salary powers.

### 3.2 Permission matrix

Legend: **Full** = all records in scope; **Scoped** = only assigned classes/subjects or own record; **Aggregate** = counts and trends, no student-level PII; **—** = no access.

| Capability | Headmaster | Teacher | Clerk | Management |
| --- | --- | --- | --- | --- |
| Dashboard | Full school | My day | Front office | Governance |
| Student records | Full | Scoped view | Full create/edit | Aggregate |
| Admissions | Approve | — | Process and prepare | Aggregate |
| Attendance | Full + approve corrections | Mark assigned classes; request correction | View, correct with reason | Aggregate |
| Staff attendance and leave | Full | Own record | Record and view | Aggregate |
| Timetable and cover | Full assign/complete | View own free periods; claim a class | View | Aggregate |
| Examinations | Setup, moderate, publish | Marks for assigned subjects | View | Aggregate |
| Fees | Full, waive, approve | — | Structure, collect, request waiver | Aggregate |
| Salary | Approve and record disbursement | Own payslip | Prepare and verify | Aggregate |
| Analytics | Whole school | Assigned classes | Finance | Whole school aggregate |
| Notices | Publish any | View | Draft and publish operational notices | View |
| Reports and exports | Full | Class marks | Student and fee exports | Aggregate reports |
| Settings | Full | — | Fee heads only | — |
| Audit log | Full | — | — | Read-only |
| Role management | Full | — | — | — |

### 3.3 Privacy boundary

Management never sees guardian phone numbers, addresses, individual attendance, individual marks, or individual fee ledgers. It sees counts, percentages, trends, and finance totals. Every student-level export is permission-gated and audit-logged. The demo masks phone numbers and never stores full Aadhaar numbers.

### 3.4 Demo accounts

| Role | Name | Employee ID | Password | Landing |
| --- | --- | --- | --- | --- |
| Headmaster | Amitava Sen | HM-001 | `demo1234` | Morning Register |
| Assistant Headmaster | Subhas Das | TCH-001 | `demo1234` | Morning Register (cover) |
| Teacher · class teacher | Ananya Sen | TCH-027 | `demo1234` | My Day |
| Teacher · English | Minori Das | TCH-023 | `demo1234` | My Day |
| Clerk | Suman Dey | CLK-014 | `demo1234` | Front Office |
| Management | Dr. Debabrata Roy | MC-003 | `demo1234` | Governance |

The Flutter app uses the teacher account. The login screen offers a visible “Use demo account” action and clearly labels demo mode.

---

## 4. Information architecture

### 4.1 Web console

```
/login
/console
  /dashboard                     role-specific landing
  /students                      list, filters, export
  /students/[id]                 profile: Overview, Attendance, Results, Fees, Documents, Timeline
  /students/new                  add student
  /students/[id]/edit            edit student
  /admissions                    application queue
  /admissions/[id]               application detail and verification
  /admissions/new                walk-in application
  /attendance                    daily register picker
  /attendance/[sectionId]        daily register
  /attendance/[sectionId]/history
  /attendance/corrections        correction queue
  /staff-attendance              staff check-in and leave
  /timetable                     timetable, free teachers, cover desk
  /exams                         exam list
  /exams/[id]                    setup, schedule, readiness
  /exams/[id]/marks              marks entry grid
  /exams/[id]/results            moderation, results, publish
  /exams/[id]/report-cards       print centre
  /fees                          collection dashboard
  /fees/structure                fee heads and class structures
  /fees/bills                    bills and dues
  /fees/bills/[id]               bill detail and collect payment
  /fees/receipts/[id]            printable receipt
  /fees/concessions              waivers and approvals
  /salary                        monthly bill dashboard
  /salary/[month]                bill detail, verify, approve, disburse
  /salary/payslips/[id]          printable payslip
  /analytics                     school analytics
  /analytics/students/[id]       student analytics
  /notices                       notice board
  /reports                       report catalogue and exports
  /settings                      school, academic, classes, subjects, roles, fee heads, salary components
  /audit                         audit log
  /design                        internal design-system gallery
```

Role navigation hides unreachable sections, and route guards reject direct access.

### 4.2 Flutter app (Hazira)

```
/login
/today                     greeting, date, classes, free-period cover card, pending attendance, notices
/attendance/:sectionId     full-screen card deck
/attendance/:sectionId/summary
/attendance/:sectionId/roster
/students/:id              quick student view (read-only)
/notices
/profile                   language, sync status, logout, version
```

Bottom tabs: **Today**, **Attendance**, **Notices**, **Profile**. The deck is presented full-screen with a visible close/back control; it is never a dead end.

---

## 5. Core workflows

### 5.1 Enrollment and admissions

1. Clerk opens **Admissions** and selects a new or existing application.
2. Clerk records applicant details, class applied for, guardian contacts, and previous school.
3. Clerk verifies documents: birth certificate, Aadhaar (masked), previous report card, guardian ID, photograph, and any category or residence certificate.
4. Clerk assigns a class and section, checks capacity, and records a decision.
5. Headmaster approves the admission. The system creates the student record, admission number, and roll number in one transaction.
6. Clerk prints the admission slip and ID card. The student appears in the class roster and attendance register.
7. Bulk import accepts a CSV with validation, duplicate detection, and a dry-run summary before commit.
8. Transfer/TC checks outstanding dues, records the leaving date and reason, generates a transfer certificate, and changes the student's status to Transferred or Alumni.

States: `Draft → Submitted → Documents verified → Approved → Enrolled`, with `Waitlisted`, `Rejected`, and `Withdrawn`. Every transition is audit-logged.

### 5.2 Attendance

**Teacher app (primary path):**
1. Teacher signs in and sees Today. The class teacher's section is first; other assigned sections follow.
2. Teacher opens the section. The deck shows one student at a time: photo, Bengali and English name, roll number, class and section, this week's register, and today's status.
3. A marked student advances to the next card. Present and Absent are the primary actions; Late and Leave are available in a secondary action sheet. A review-before-submit summary prevents accidental submissions.
4. The teacher can swipe down for the next student, swipe up for the previous student, or use the buttons. The deck is never gesture-only.
5. Marks are saved locally immediately. If offline, the app shows **Saved offline** and syncs when a connection returns. The app is the source of truth for the teacher's own draft until submission.
6. On submit, the register is locked for the teacher in the app. In the production architecture it would also appear in the web console; in this backend-free build the app and web are separate seeded demos, so the web register shows its own seeded attendance. Corrections require a reason and are audit-logged; the Headmaster approves sensitive corrections.
7. A list/roster view is always available as an alternative to the deck, and supports keyboard/screen-reader use.

**Web console:**
- Daily register by class and section, with Present, Absent, Late, Leave, and Holiday states.
- Weekly grid and student history.
- Correction queue with before/after, reason, actor, and approval.
- Staff attendance: daily check-in/out and leave; feeds salary bill preparation.

States: `Not started → In progress (draft) → Submitted → Locked → Corrected (audited)`.

### 5.3 Free periods and cover

1. The timetable stores every section's period, subject, room, and regular teacher for the week. Saturday is a six-period half day.
2. Staff attendance and approved leave mark a teacher absent. The system derives an **uncovered period** wherever that teacher has a class and no substitution exists.
3. The Headmaster or Assistant Headmaster opens the **cover desk**. It shows the live period, uncovered classes, every teacher who is free (no class, no cover, no approved leave), and a suggested substitute ranked by subject fit and today's load.
4. When a suitable free teacher exists, a cover alert appears automatically. The manager can assign in one action from the alert or open the desk to choose another teacher.
5. A teacher sees their own free periods and any classes waiting for cover in the web console or the Hazira app. They can claim a class only if they are free in that period.
6. The substitution is `assigned`; the substitute can open the class register for that period. After teaching, the record is marked `covered`.
7. Every assignment, claim, and completion writes an audit event. Cover changes in the backend-free demo stay in their local store.

### 5.4 Examinations

1. Exam coordinator creates an exam (Half-Yearly, Annual, Pre-Board, or a custom assessment) and selects classes and subjects.
2. For each class–subject, the coordinator sets the exam date, maximum marks, pass marks, and the theory/internal/practical split.
3. Subject teachers enter marks in a grid with keyboard navigation, validation, and progress. Drafts are saved automatically.
4. The coordinator moderates: checks missing marks, outliers, and subject totals; records moderation notes.
5. The Headmaster verifies and publishes results. The system calculates totals, percentages, grades, subject pass/fail, overall pass/fail, and rank using the configured rules.
6. Report cards are generated bilingually and are print-ready. Results and analytics update.
7. A readiness panel shows subjects missing marks, teachers who have not submitted, and schedule conflicts.

Default pass rule: at least 33% in every subject and at least 40% aggregate, configurable in Settings. Grades use a configurable A1–E scale. Marks are stored as integers; totals are derived, never hand-edited after publication without a moderation event.

States: `Draft → Scheduled → Marks entry → Moderation → Verified → Published`. Publication is irreversible without an audit-logged reopening.

### 5.5 Fees and bills

1. Clerk defines fee heads (Examination, Session, Laboratory, Library, Sports, Development) and class-wise structures for the academic year.
2. Clerk generates bills individually or in bulk. Each bill has a number, due date, line items, concession, and balance.
3. Clerk collects payment by cash, UPI, or cheque, records the reference, and issues a numbered receipt.
4. The student ledger shows bills, payments, concessions, and balance. Receipts are printable and searchable.
5. Concessions and waivers require a reason; above a configurable limit, Headmaster approval is required.
6. Daily collection, dues, and defaulters are reported. A payment link action is present but explicitly marked **simulated / coming with student app**; it does not process money.
7. Voiding a receipt requires a reason and creates an audit event; the original is retained.

States: `Draft → Issued → Partially paid → Paid / Waived / Void`. Amounts are stored in paise; display uses Indian digit grouping.

### 5.6 Salary

1. Clerk maintains each staff member's pay structure: pay level, basic pay, DA, HRA, medical allowance, other allowances, and deductions (GPF, tax, cooperative, loans).
2. At month end, the clerk prepares a salary bill. Attendance and approved leave adjust payable days; arrears and one-time adjustments are line items.
3. The clerk verifies the bill; the Headmaster approves it. Approval locks the lines.
4. The clerk records disbursement (date, mode, reference) and generates payslips. No bank integration is implied.
5. The dashboard shows prepared, verified, approved, and disbursed totals, plus staff on leave and missing pay structures.

States: `Draft → Prepared → Verified → Approved → Disbursed`. Reopening an approved bill requires Headmaster action and an audit event.

### 5.7 Analytics

Analytics are rule-based and explainable. No opaque AI score is shown.

- **Attendance:** term-to-date percentage, class comparison, day-of-week pattern, consecutive absences, chronic absenteeism.
- **Academic:** subject averages, pass percentage, grade distribution, class comparison, subject heatmap, students with two or more failing subjects.
- **Fees:** collection against demand, dues ageing, defaulters, concession impact.
- **Staff:** attendance, leave, vacancies, salary bill status.
- **Student risk flags:** attendance below 75%, three or more consecutive absences, two or more subjects below pass mark, fees overdue by two or more months. Each flag states its rule and evidence.
- **Management view:** aggregate only. Headmaster and teacher views respect scope.

All charts have accessible table alternatives and do not rely on color alone.

### 5.8 Notices

Headmaster and clerk compose notices with a title, bilingual body, audience (whole school, teachers, a class section, management), publish date, and optional attachment. Publishing is simulated for SMS/email; the in-app notice board is real. Notices appear in the Flutter app.

### 5.9 Audit

Every create, update, delete, approval, publish, export, correction, payment, waiver, salary approval, and role change writes an append-only audit event: actor, action, entity, before/after summary, timestamp, and source. The Headmaster sees all; Management sees a read-only governance view; the Clerk sees operations; the Teacher sees their own actions where relevant.

---

## 6. Screen inventory

### 6.1 Web screens

| Screen | Roles | Purpose | Key components |
| --- | --- | --- | --- |
| Login | All | School code, employee ID, password, demo access | Seal, bilingual school name, form, role hint |
| Morning Register | Headmaster | School day, attendance, fees, exams, attention, activity | School-day timeline, summary cards, grouped class rows, attention list |
| Front Office | Clerk | Admissions, collection, documents, quick actions | Queue, collection summary, quick actions, reminders |
| My Day | Teacher | Timetable, classes to mark, tasks, notices | Day timeline, pending registers, class cards |
| Governance | Management | Aggregates, trends, finance summary, audit highlights | Aggregate charts, no PII, export |
| Students | HM, Clerk, Teacher (scoped) | Find and manage students | Search, filters, grouped table, bulk actions |
| Student record | HM, Clerk, Teacher (scoped) | Identity, attendance, results, fees, documents | Header, tabs, weekly heat register, subject bars, fee ledger |
| Add/edit student | HM, Clerk | Create or update a student | Sectioned form, validation, document checklist |
| Admissions queue | HM, Clerk | Process applications | Status tabs, search, SLA, bulk import |
| Admission detail | HM, Clerk | Verify, decide, enroll | Document viewer, checklist, decision, audit trail |
| Attendance register | HM, Teacher, Clerk | Mark or review a class | Class picker, weekly grid, status cells, submit |
| Attendance history | HM, Teacher, Clerk | Student or class history | Month grid, filters, export |
| Corrections | HM, Clerk | Review correction requests | Before/after, reason, approve/reject |
| Staff attendance | HM, Clerk | Check-in/out, leave | Daily list, leave calendar, status |
| Exams | HM, Teacher, Clerk | Exam list and readiness | Status, classes, missing marks, schedule |
| Exam setup | HM, Exam Coordinator | Configure subjects and rules | Subject rows, marks split, dates, validation |
| Marks entry | Teacher, HM | Enter and review marks | Keyboard grid, progress, autosave, outliers |
| Results | HM, Exam Coordinator | Moderate and publish | Missing marks, totals, pass/fail preview, publish |
| Report cards | HM, Clerk | Print bilingual report cards | Print preview, batch, demo verification QR |
| Fees | HM, Clerk | Collection overview | Collected/due, defaulters, daily trend |
| Fee structure | HM, Clerk | Define heads and class amounts | Editable matrix, effective dates |
| Bills | HM, Clerk | Find and manage bills | Filters, status, bulk generate |
| Bill detail | HM, Clerk | Collect payment and issue receipt | Line items, payment form, receipt |
| Receipt | HM, Clerk | Printable receipt | Bilingual, seal, number, demo verification QR |
| Concessions | HM, Clerk | Waivers and approvals | Request, reason, limit, approval |
| Salary | HM, Clerk | Monthly bill status | Prepared/verified/approved/disbursed, staff on leave |
| Salary bill | HM, Clerk | Prepare, verify, approve, disburse | Staff lines, adjustments, totals, approval |
| Payslip | HM, Clerk, Teacher (own) | Printable payslip | Earnings, deductions, net pay, seal |
| Analytics | HM, Teacher (class), Clerk (finance), Management (aggregate) | Trends and risk | Heat register, subject bars, class table, risk flags |
| Notices | HM, Clerk, Teacher, Management | Notice board | Compose, audience, publish, archive |
| Reports | HM, Clerk, Management | Export centre | Report cards, registers, collection, salary, UDISE/UDISE-style CSV |
| Settings | HM, Clerk (fee heads) | Configure the school | School, year, classes, subjects, roles, fees, salary components |
| Audit | HM, Management | Trace sensitive actions | Filters, actor, entity, before/after |
| Design system | Internal | Component and token reference | Tokens, type, components, motion, states |

Every list has loading, empty, error, and permission-denied states. Every destructive or money-related action has a confirmation with the amount, student/staff, and consequence.

### 6.2 Flutter screens

| Screen | Purpose | Key details |
| --- | --- | --- |
| Login | Teacher sign-in | Seal, bilingual school name, employee ID, password, demo access, language toggle, offline note |
| Today | Daily home | Greeting, date, school day, pending registers, classes, notices, sync status |
| Attendance deck | Primary attendance flow | Card stack, photo, names, roll, weekly register, Present/Absent, Late/Leave sheet, progress, offline pill, swipe hint |
| Summary | Review and submit | Present/absent/late counts, absentee list, undo, submit, save offline |
| Roster | Non-gesture alternative | Grouped list, status chips, bulk mark, search |
| Student quick view | Context | Photo, identity, this-week register, guardian contact (masked), recent marks summary |
| Notices | School communication | List, detail, attachments, read state |
| Profile | Settings | Name, employee ID, school, language, theme, sync status, logout, version |

---

## 7. Design system — Civic Modern

### 7.1 Thesis and signature

**Thesis:** a modern school operating system that feels native on Apple devices and credible in a government office. The interface is quiet, precise, and fast; the identity comes from Bengali typography, the school seal, and the formal record language, not from vintage textures.

**Signature elements:**
1. **The school-day timeline** on the Headmaster dashboard: the day's periods and events as a calm, live band, with the current period highlighted. It gives the console a point of view no generic dashboard has.
2. **The Hazira card deck and stamp:** one student per screen, a weekly register, two decisive actions, a physical stamp on mark, and a spring-driven deal to the next card. It is the product's most memorable interaction.
3. **The weekly register strip:** a compact seven-day record used in the app, student profile, and class rows. Green/red is always paired with a check/cross and a text label.
4. **The bilingual seal lockup:** Bengali school name above, English below, seal at the side. It appears at login, in the sidebar, on receipts, report cards, and payslips — nowhere else.

**What it is not:** no serif headings, no cream paper, no faux ledger rules, no all-caps mono labels, no glass on content cards, no gradients for decoration, no stock classroom photography, no emoji.

### 7.2 Color tokens

Light appearance:

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#F5F5F7` | App background |
| `surface` | `#FFFFFF` | Cards, sheets, tables |
| `surface-elevated` | `#FFFFFF` | Popovers, floating panels |
| `ink` | `#1D1D1F` | Primary text |
| `ink-secondary` | `#6E6E73` | Secondary text, supporting labels |
| `ink-tertiary` | `#8E8E93` | Disabled, timestamps |
| `separator` | `rgba(60,60,67,0.12)` | Inset dividers |
| `fill` | `#F2F2F7` | Inset rows, fields |
| `fill-secondary` | `#E5E5EA` | Chips, tracks |
| `blue` | `#007AFF` | Icons, focus, active nav |
| `blue-strong` | `#0071E3` | Primary button fill with white text |
| `blue-text` | `#0066CC` | Links and blue text on white |
| `blue-tint` | `#EAF3FF` | Selected nav, blue-tinted surfaces |
| `green` | `#34C759` | Ring, icon, present accent |
| `green-strong` | `#1E8E3E` | Present filled button with white text |
| `green-text` | `#166B32` | Green text on light surfaces |
| `green-tint` | `#E8F8ED` | Present cell background |
| `red` | `#FF3B30` | Absent icon, destructive accent |
| `red-strong` | `#D70015` | Absent filled button with white text |
| `red-text` | `#C4000A` | Red text on light surfaces |
| `red-tint` | `#FFEBE9` | Absent cell background |
| `orange` | `#FF9500` | Warning icon |
| `orange-strong` | `#B25000` | Warning text on light surfaces |
| `orange-tint` | `#FFF3E0` | Warning surface |
| `seal-navy` | `#0B3B6F` | Seal, formal documents |
| `seal-red` | `#B42318` | Seal accent |
| `seal-gold` | `#C99700` | Seal accent |

Dark appearance:

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#000000` | App background |
| `surface` | `#1C1C1E` | Cards, sheets |
| `surface-elevated` | `#2C2C2E` | Popovers, raised panels |
| `ink` | `#F5F5F7` | Primary text |
| `ink-secondary` | `#AEAEB2` | Secondary text |
| `ink-tertiary` | `#8E8E93` | Disabled, timestamps |
| `separator` | `rgba(84,84,88,0.65)` | Dividers |
| `fill` | `#2C2C2E` | Inset rows, fields |
| `blue` | `#0A84FF` | Icons, focus |
| `blue-strong` | `#0A6CDB` | Primary button fill with white text |
| `green` | `#30D158` | Present accent |
| `green-strong` | `#30D158` with `#0A1A0F` text | Present filled button |
| `red` | `#FF453A` | Absent accent |
| `red-strong` | `#D70015` | Absent filled button with white text |
| `orange` | `#FF9F0A` | Warning |

Contrast rules:
- Body text uses `ink` or `ink-secondary`; no text uses `ink-tertiary` below 12px.
- Small text on white uses `blue-text`, `green-text`, `red-text`, or `orange-strong`, never the bright system fill colors.
- Filled buttons use `blue-strong`, `green-strong`, or `red-strong` with white (or the specified dark text) and are verified at 4.5:1.
- Status is never conveyed by color alone: every state carries an icon, a label, or both.
- Glass surfaces fall back to opaque `surface` under `prefers-reduced-transparency: reduce`.
- Every token pairing is measured during implementation; the table is a starting point, not a claim.

### 7.3 Typography

| Role | Family | Weight | Size / line-height |
| --- | --- | --- | --- |
| Large title | System SF Pro / Inter | 650 | 34/40 web, 30/36 app |
| Title 2 | System | 600 | 28/34 |
| Title 3 | System | 600 | 22/28 |
| Headline | System | 600 | 17/22 |
| Body | System | 400 | 15/22 web, 17/24 app |
| Callout | System | 400 | 16/21 |
| Subhead | System | 500 | 15/20 |
| Footnote | System | 400 | 13/18 |
| Caption | System | 500 | 12/16 |
| Code / IDs | SF Mono / ui-monospace | 400 | 12/16 |

- Bengali: **Noto Sans Bengali** 400/500/600/700 for all UI and documents. No Bengali serif.
- Latin: system SF Pro on Apple platforms; **Inter** as the bundled fallback on other platforms.
- Bengali line-height is 1.65–1.8; Latin body is 1.45.
- Tracking: large titles `-0.03em`, titles `-0.02em`, body `-0.01em`, captions `0`.
- Data uses `font-variant-numeric: tabular-nums`.
- Text scaling: layouts must survive 200% on web and the largest Dynamic Type setting on iOS; no fixed-height text containers.
- Uppercase is not used for labels. Sentence case is the default.

### 7.4 Spacing, radii, elevation

- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Page padding: 32 web, 20 mobile.
- Radii: 10 small controls, 14 inputs and buttons, 20 cards, 24 panels, 28 mobile student card, 999 pills.
- Shadows:
  - Card: `0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)`.
  - Floating sidebar: `0 12px 40px rgba(0,0,0,0.08)`.
  - Mobile deck card: `0 2px 8px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.10)`.
- Materials: sidebar `rgba(255,255,255,0.72)` + `backdrop-filter: blur(30px) saturate(180%)`; top chrome `rgba(255,255,255,0.80)` + blur 20px. Content cards are opaque. Dark equivalents use `rgba(28,28,30,0.72)`.
- Borders: 1px `separator` for inset rows; cards may use a 1px `rgba(0,0,0,0.04)` border instead of a shadow on dense screens.

### 7.5 Components

**Foundation:** Button (primary, secondary, tinted, destructive, ghost, link; sizes 44/36/32; loading; icon), IconButton, SegmentedControl, Tabs, Sidebar, TopBar, Toolbar, SearchField, CommandPalette, PageHeader, Breadcrumb, Card, Panel, Sheet, Dialog, Popover, Tooltip, Toast, Badge, StatusPill, Avatar, PhotoFrame, EmptyState, Skeleton, ProgressRing, ProgressBar, Stepper, Pagination, Checkbox, Radio, Switch, TextField, Select, Combobox, DatePicker, FileUpload, FormSection, ErrorSummary.

**Data:** GroupedList, DataTable (TanStack, accessible), RowActions, FilterBar, SummaryCard, Metric, Sparkline, SegmentedBar, HeatRegister, SubjectBars, AttendanceCell, RegisterStrip, SchoolDayTimeline, TeacherLoad, RiskFlag, AuditRow, PrintDocument.

**Hazira:** RollCallCard, WeekRegister, ActionPair, ProgressRing, OfflinePill, SyncBanner, DeckHint, Stamp, SummarySheet, RosterRow, StudentQuickView.

Every component defines default, hover (pointer fine only), active/pressed, focus-visible, disabled, loading, error, and dark appearance. Interactive targets are at least 44×44 CSS px on web and 48×48 dp in Flutter.

### 7.6 Motion system

Motion is part of the design, not a layer added later. Every animation has a named purpose and passes the frequency gate.

| Moment | Tool | Properties | Values | Purpose |
| --- | --- | --- | --- | --- |
| Button press | CSS transition | `transform` | `scale(0.97)`, 160ms, `--ease-out` | Feedback |
| Nav selection | CSS transition | `background-color`, `color` | 160ms ease | State indication; no sliding indicator |
| Page content change | CSS/Motion | `opacity`, `transform` | 200ms, 4px rise, ease-out | Prevent jarring change; high-frequency, keep subtle |
| Command palette / search | None | — | Instant | 100+/day, keyboard-initiated |
| Dashboard cards first load | CSS animation | `opacity`, `transform` | 300ms, 8px rise, 40ms stagger, max 4 items | Spatial consistency; once, never on filter |
| Student row → profile | Motion shared layout | `transform`, `opacity` | Spring, duration 0.4, bounce 0 | Spatial consistency |
| Modal / dialog | CSS/Motion | `opacity`, `transform` | 250ms, scale 0.96→1, centered origin | State change |
| Drawer / sheet | CSS/Motion | `transform` | 500ms `--ease-drawer`; drag-to-dismiss with spring | Spatial consistency |
| Toast | CSS transition | `opacity`, `transform` | 400ms ease, enter/exit same path | Feedback |
| Attendance card drag | Pointer events + Motion/Flutter | `transform` | 1:1 tracking, velocity handoff, momentum projection, rubber-band | Direct manipulation |
| Card settle | Spring | `transform` | duration 0.45, bounce 0.12 after a flick; bounce 0 otherwise | Physical settle |
| Mark stamp | CSS/Flutter | `transform`, `opacity` | scale 1.15→1, 220ms, haptic same frame | Confirmation |
| End-of-roll celebration | CSS/Flutter | `opacity`, `transform` | One orchestrated confirmation, reduced under reduced motion | Delight, rare only |

Hard rules:
- Never `transition: all`; list exact properties.
- Animate only `transform` and `opacity` (and `clip-path` where a recipe calls for it). Do not animate layout properties.
- Never enter from `scale(0)`; use `scale(0.95–0.97)` with opacity.
- No `ease-in` on UI; use the custom ease-out tokens.
- No animation on keyboard-initiated actions or actions used 100+ times a day.
- Springs for gestures, CSS transitions for rapid state changes, CSS animations for predetermined motion under load.
- In Motion, use the full `transform` string where the animation must survive a busy main thread.
- Do not drive a child's transform from a CSS variable on a parent.
- Do not animate box-shadow; use `filter: drop-shadow()` if a shadow must move.
- Keep animated blur under 20px.
- Add `will-change` only after observing a shift or measured dropped frames.
- Reduced motion: replace transforms/springs with 200ms opacity cross-fades; keep color/state changes; never remove feedback entirely.
- Reduced transparency: opaque chrome, no blur.
- Hover motion only under `@media (hover: hover) and (pointer: fine)`.

Attendance deck details:
- Vertical card stack, one student per screen. **Swipe down advances; swipe up returns.** Buttons also advance. A visible hint says “Swipe down for next student.”
- The drag starts on pointer-down with an 8–10px hysteresis; the card tracks the pointer 1:1; velocity is sampled from the last few moves; on release, velocity is handed to a spring; the landing target uses momentum projection with deceleration 0.998; at the ends, rubber-band resistance.
- Marking Present/Absent is never a gesture: it is a deliberate button press with a stamp and haptic. The card then settles to the next student.
- Undo is available in a toast for at least 5 seconds; the review sheet lists all marks before submit.
- If the user interrupts a card animation, it retargets from its current on-screen position and velocity; no waiting for the animation to finish.
- The deck is unavailable to screen readers as the only path: the roster is a full alternative, and every card has accessible labels.

### 7.7 Accessibility

Target: **WCAG 2.2 AA** on web, Apple accessibility conventions on iOS.

- Text contrast 4.5:1; large text and UI components 3:1; measured from tokens.
- All controls 44×44 CSS px / 48×48 dp; spacing between adjacent targets.
- Visible focus ring on every interactive element; logical focus order; focus trapped only in modals; focus returns to the trigger.
- Keyboard support for all console actions, including the marks grid and command palette; no keyboard trap.
- `lang="bn"` on Bengali text; screen-reader labels for icons, status cells, and the deck.
- Status is never color-only: register cells include a check/cross/dash and accessible text; risk flags include labels.
- Respect `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`.
- Text scaling to 200% without clipping; no fixed heights on text.
- Inputs at least 16px on mobile to prevent iOS zoom; `touch-action: manipulation`; no user-scalable=no.
- Safe areas: `viewport-fit=cover`, `env(safe-area-inset-*)`; `100dvh` for app shells.
- No hover-only information; no auto-playing media; no time-limited actions without extension.
- Flutter: Semantics labels, textScaler support, accessible navigation, no gesture-only actions, haptics optional.

### 7.8 Bilingual rules and content voice

- Every user-visible string comes from a dictionary; no hardcoded copy in components. English and Bengali are complete at build time.
- Context-aware default: the web console opens in English. **Hazira opens in English by default**; a persistent English/বাংলা switch on the Login and Profile screens changes all app labels, day letters, status labels, and primary names. Selecting Bengali is optional; the English experience is complete on its own. Student-facing printed documents (receipts, report cards, payslips) remain bilingual. A persistent web language toggle is available in the sidebar, top bar, login, and profile.
- Dates: `31 Oct 2026` in English, `৩১ অক্টো ২০২৬` or `৩১ অক্টোবর ২০২৬` in Bengali, using `Intl`/`intl`. Never mix scripts mid-label except for proper nouns.
- Amounts: `₹42,500` with Indian grouping; no decimals for whole rupees; paise only when needed.
- Names: Bengali first, English second; the English name is a transliteration, not a translation.
- Labels are specific: “Collect payment,” not “Submit”; “Publish results,” not “Save”; “Submit attendance,” not “Done.”
- Errors state what happened and how to fix it; no apologies, no jargon.
- Empty states invite the next action; no dead ends. Every full-screen route has a visible back/close control.
- Tone: calm, respectful, official but plain. No exclamation marks, no emoji, no marketing voice.

### 7.9 Design references applied

- Apple Human Interface Guidelines: Accessibility, Layout, Typography, Color, Buttons, Navigation and search, Lists and tables, Sheets, Modality, Motion, Gestures, Materials, Writing. The installed `apple-design-hig` and `apple-design-web` skills are the review lens.
- Emil Kowalski: animation decision gates, custom easing tokens, springs, interruptible gestures, velocity handoff, momentum projection, reduced motion, performance rules, and the mobile-native baseline. The installed `emil-animate`, `emil-animation-performance`, `emil-review-animations`, and `emil-mobile-native` skills are the implementation lens.
- Government credibility comes from content, not decoration: the seal, the bilingual lockup, formal document titles, memo/receipt numbers, and print-ready records. No official emblem is reproduced.

---

## 8. Data model

### 8.1 Entities

| Entity | Key fields | Relationships / notes |
| --- | --- | --- |
| `School` | id, nameBn, nameEn, code, udise, type, address, district, established, sealAsset | One demo school; `schoolId` on all records for future tenancy |
| `AcademicYear` | id, label, startDate, endDate, isActive | One active year in the demo |
| `Staff` | id, employeeId, nameBn, nameEn, role, phone, email, photoAsset, joinedAt, status, payLevel | Has assignments and salary structure |
| `RolePreset` | id, name, permissions[] | Headmaster, Teacher, Clerk, Management |
| `Assignment` | id, staffId, type (class_teacher, subject_teacher, exam_coordinator, accountant), classSectionId?, subjectId?, examId? | Scoped permissions |
| `ClassSection` | id, classLevel (V–X), section (A/B), room, capacity, classTeacherId | 12 sections in the demo |
| `Subject` | id, code, nameBn, nameEn, type | Bengali, English, Mathematics, Physical Science, Life Science, History, Geography, Work Education, Physical Education |
| `Student` | id, admissionNo, rollNo, nameBn, nameEn, classSectionId, gender, dob, guardianName, guardianPhone, address, category, status, photoAsset, admissionDate | Soft delete; status active/transferred/alumni |
| `AdmissionApplication` | id, applicationNo, applicant fields, classApplied, documents[], status, decision, notes, createdAt | Transitions audited |
| `AttendanceRecord` | id, studentId, classSectionId, date, session, status, markedBy, markedAt, source, deviceId, note, correctionOfId | Unique student/date/session; status present/absent/late/leave/holiday |
| `StaffAttendance` | id, staffId, date, checkIn, checkOut, status, leaveType, note | Feeds salary payable days |
| `LeaveRequest` | id, staffId, fromDate, toDate, type, reason, status, approvedBy | Audit |
| `Exam` | id, name, term, academicYearId, startDate, endDate, status | Half-Yearly, Annual, Pre-Board, custom |
| `ExamSubject` | id, examId, classLevel, subjectId, examDate, maxMarks, passMarks, theoryMax, internalMax, practicalMax | Unique exam/class/subject |
| `Mark` | id, examSubjectId, studentId, theory, internal, practical, total, status, enteredBy, updatedAt | Unique examSubject/student; drafts allowed |
| `Result` | id, examId, studentId, total, percentage, grade, rank, pass, subjectsFailed, publishedAt | Derived; recomputed on publish |
| `FeeHead` | id, code, nameBn, nameEn, frequency, refundable | Examination, Session, Laboratory, etc. |
| `FeeStructure` | id, academicYearId, classLevel, feeHeadId, amountPaise, dueDate | Class-wise |
| `Bill` | id, billNo, studentId, academicYearId, period, totalPaise, concessionPaise, duePaise, status, dueDate | Line items separate |
| `BillItem` | id, billId, feeHeadId, amountPaise, description | Append-only after issue |
| `Payment` | id, receiptNo, billId, studentId, amountPaise, method, reference, paidAt, collectedBy, note, status | Void creates audit event; never deletes |
| `Concession` | id, studentId, feeHeadId, type, value, reason, approvedBy, validFrom, validTo | Amount or percent |
| `SalaryComponent` | id, name, type (earning/deduction), calculation (fixed/percent), value | School-level configuration |
| `SalaryStructure` | id, staffId, basicPayPaise, payLevel, effectiveFrom, components[] | One active structure per staff |
| `SalaryBill` | id, month, year, status, totalEarningsPaise, totalDeductionsPaise, netPayPaise, preparedBy, verifiedBy, approvedBy, disbursedAt | One per month |
| `SalaryLine` | id, salaryBillId, staffId, payableDays, leaveDays, earningsPaise, deductionsPaise, netPayPaise, payslipNo | Unique bill/staff |
| `TimetableEntry` | id, day, period, start, end, sectionId, subjectId, teacherId, room | One regular class per section/period |
| `Substitution` | id, date, day, period, sectionId, subjectId, absentTeacherId, substituteTeacherId, status, assignedBy, reason, createdAt | `assigned` → `covered`; append-only history |
| `Notice` | id, title, bodyEn, bodyBn, audience, publishedBy, publishedAt, status, attachments[] | In-app delivery in demo |
| `Document` | id, entityType, entityId, type, fileName, url, verified, uploadedBy | Local demo references |
| `AuditEvent` | id, actorId, action, entityType, entityId, before, after, source, createdAt | Append-only |
| `SyncQueue` | id, clientId, operationId, type, payload, status, createdAt, syncedAt | Future offline sync; app-local in demo |

### 8.2 Rules and constraints

- IDs are UUIDs generated client-side for offline compatibility. Human-readable numbers are separate: admission number, receipt number, bill number, payslip number, memo number.
- Amounts are integer paise. No floating-point money.
- Attendance uniqueness: `(studentId, date, session)`. Session defaults to `full_day`; AM/PM is reserved for future period attendance.
- Roll numbers are unique within a class section and academic year. Admission numbers are unique across the school.
- Bills are immutable after issue except for payments, concessions, and status; corrections create a new audit event.
- Marks cannot exceed the subject maximum. Totals are derived. Published results require a moderation event to reopen.
- Salary lines cannot be edited after approval without a reopening event and Headmaster approval.
- Audit events are append-only and never edited or deleted.
- Student and staff records are soft-deleted; historical attendance, marks, bills, and salary records remain.
- All reads and writes are scoped by school. Management queries use aggregate projections that exclude PII.

### 8.3 Derived rules

- **Attendance percentage** = present days ÷ (working days − approved leave/holiday), term-to-date.
- **Subject pass** = total marks ≥ pass mark for that exam subject. **Overall pass** = every subject passed and aggregate ≥ 40% (configurable).
- **Grade** = configured A1–E bands. Rank is dense rank by total within the class section; ties share a rank.
- **Fee balance** = bill total − concession − payments. Paid when balance ≤ 0; partial when 0 < paid < due; overdue when due date passes.
- **Salary net** = earnings − deductions; payable days derived from staff attendance and approved leave.
- **Uncovered period** = a timetable entry whose regular teacher is absent (staff attendance `leave`/`absent` or approved leave) and has no substitution for that date, period, and section.
- **Free teacher** = an active teacher with no timetable entry, no substitution, and no approved leave in the selected period. Suggestions rank exact section–subject assignment first, then primary subject, then lower daily load; the Assistant Headmaster is discounted as a substitute so teaching staff are preferred.
- **Risk flags** are rule-based and explainable:
  - Attendance < 75% term-to-date, or 3+ consecutive absences.
  - Two or more subjects below pass mark in the latest published exam.
  - Fees overdue by 2+ months.
  - A combination of two or more flags surfaces as “needs attention,” never as an opaque score.

---

## 9. Technical architecture

### 9.1 Repository layout

```
/
  apps/
    web/                 Next.js staff console
    teacher_app/         Flutter Hazira app
  design/
    tokens.json          single source of truth for color, type, spacing, motion
    concepts/            approved and archived concept frames
  tools/
    generate-tokens.mjs  tokens.json → CSS variables + Dart constants
    generate-demo-data.ts
  docs/
    superpowers/specs/   this specification and later plans
```

No backend in the first build. The data layer is deliberately isolated so a real API can replace it without rewriting screens.

### 9.2 Web console

- **Framework:** Next.js (App Router), React, TypeScript strict.
- **Styling:** Tailwind CSS v4 with CSS custom properties generated from `design/tokens.json`. No component library visual theme; custom components.
- **Primitives:** Radix UI for dialog, popover, select, tabs, tooltip, switch, checkbox; `cmdk` for the command palette; `sonner` for toasts; `vaul` for mobile sheets.
- **Motion:** `motion` for springs, shared layout, exit animations, and gesture-driven values; CSS transitions/animations for predetermined motion and busy-main-thread cases.
- **Data:** typed repository over seeded JSON; Zustand with persistence to `localStorage`; deterministic demo generator; reset action. Every mutation writes an audit event and updates derived selectors. Schema version is stored; a mismatch resets the demo with a clear message.
- **Auth:** demo session with seeded accounts; route guards by role/permission; a visible demo badge. No real credentials or tokens.
- **i18n:** dictionary modules for English and Bengali; locale provider; `lang` attributes; Intl date/number formatting.
- **Theme:** light/dark/system via CSS variables; no app-level forced theme.
- **Charts:** hand-built SVG components using `d3-scale`/`d3-shape` only where useful; every chart has an accessible table alternative.
- **Tables:** TanStack Table for sorting, filtering, selection, and column visibility; custom grouped-row styling; keyboard navigation.
- **Forms:** React Hook Form + Zod; inline validation; error summary; autosave for drafts.
- **Print:** dedicated print styles and components for receipts, report cards, payslips, and registers; `window.print` in the demo.
- **Testing:** Vitest + React Testing Library for domain logic and components; Playwright for role-based end-to-end flows; axe-core for accessibility; screenshot comparisons at 1440, 1024, 768, and 390.
- **Performance:** route-level code splitting; font subsetting; no heavy animation on tables/charts; GPU-friendly motion.

### 9.3 Flutter teacher app

- **Framework:** Flutter stable (currently 3.47), Dart 3.
- **Structure:** `lib/app`, `lib/design`, `lib/features/{auth,today,attendance,notices,profile}`, `lib/data`, `lib/sync`.
- **State:** Riverpod; `go_router`; immutable view models.
- **Local data:** Drift (SQLite) for students, sections, attendance drafts, queue, notices, and session metadata. Seed on first run. No keychain or signing prompts in the demo; session stored in `shared_preferences`. Production moves secrets to secure storage later.
- **Offline:** every mark persists immediately; submissions enter a queue with a client-generated idempotency key; sync status is visible; conflicts preserve the local draft until resolved; the demo simulates sync and never loses marks.
- **Theme:** custom ThemeData from the same tokens; Inter + Noto Sans Bengali bundled; light/dark/system; Cupertino page transitions on iOS; custom components rather than default Material visuals.
- **Attendance deck:** custom vertical card stack built on a scrollable/page controller with a spring settle; 1:1 drag, velocity handoff, momentum projection, rubber-band, haptics; accessible roster alternative; reduce-motion support through `MediaQuery.disableAnimations`/accessible navigation.
- **Fonts/assets:** bundled Noto Sans Bengali, Inter, a vector school seal, and a set of illustrated avatars. No network assets.
- **Testing:** unit tests for attendance state and sync; widget tests for the deck, summary, and roster; integration test for login → mark 48 → undo → submit; golden tests at 390×844 and a larger phone; semantics tests.
- **Build:** iOS Simulator or Android emulator, no signing. The completed app is copied to a stable output folder; no destructive clean without preserving artifacts.

### 9.4 Shared tokens

`design/tokens.json` is the source of truth for color, typography, spacing, radii, shadows, materials, and motion. `tools/generate-tokens.mjs` emits:

- `apps/web/src/styles/tokens.css` (CSS variables, light/dark).
- `apps/teacher_app/lib/design/tokens.dart` (Dart constants and theme helpers).

The generated files are committed and checked for drift. Hand-editing generated tokens is prohibited.

### 9.5 Future backend (not in this build)

- PostgreSQL with Drizzle ORM; modular monolith; per-school tenancy.
- Authentication with phone OTP and password, MFA for Headmaster/Clerk; hashed passwords; session rotation.
- Object storage for documents and photos; signed URLs; consent flags.
- Audit log, background jobs (Redis/BullMQ) for notifications and exports.
- Payment gateway integration for the student app; never store card data.
- Offline sync API with idempotency, conflict resolution, and device registration.
- Banglar Shiksha/UDISE export adapters; never direct submission without authorization.
- Data residency in India; encrypted backups; retention policy; field-level access.

### 9.6 Security and privacy for the demo

- Only synthetic data; no real student, guardian, or staff information.
- Demo passwords are visible and clearly labelled; no real authentication is implied.
- No full Aadhaar numbers, no health records, no financial account numbers.
- Management aggregates exclude PII.
- Exports are permission-gated and audit-logged.
- The UI states “Demo school · Not connected to Banglar Shiksha” in the sidebar and on printed documents.
- Production security is explicitly deferred to the backend milestone.

---

## 10. Demo school and seeded data

### 10.1 School

- **Name:** Nabagram Uchcha Vidyalaya (Demo) / নবগ্রাম উচ্চ বিদ্যালয় (ডেমো)
- **Code:** WB-NAB-001; **UDISE (fictional):** 19000000001
- **Location:** Nabagram, Purba Bardhaman, West Bengal
- **Type:** Government-sponsored co-educational secondary school
- **Established:** 1948
- **Academic year:** 2026–27 (April–March)
- **Classes:** V–X, sections A and B (12 sections)
- **Students:** 480; **Teaching staff:** 24; **Non-teaching:** 6
- **Demo date:** Saturday, 31 October 2026 (half day)

### 10.2 Seeded patterns

- **VIII B** has 48 students (the app's demo section); other sections have 38–42.
- Attendance: 12 weeks of history; whole-school attendance 94.2%; three students with 3+ consecutive absences; two students below 75%; one dropout-risk combination.
- Exams: Half-Yearly 2026 published; Annual 2026–27 in setup; 7 of 9 class-subject groups ready. Mathematics is the weakest subject; Physical Science is improving.
- Fees: October demand ₹58,000, collected ₹42,500; two overdue bills; 12 concessions; one recent receipt.
- Salary: October bill prepared and awaiting Headmaster approval; September disbursed; three staff on leave, one unapproved.
- Notices: half-day today; Class IX exam forms due Monday; staff meeting; fire drill.
- Audit: 20 recent events with realistic timestamps.
- Risk flags: three students absent 3+ days, two fee defaulters, one salary approval pending.

### 10.3 People and assets

- Teacher demo: **Ananya Sen**, Assistant Teacher (Physical Science), Class Teacher VIII B, employee TCH-027.
- Headmaster: **Amitava Sen**, HM-001.
- Clerk: **Suman Dey**, CLK-014.
- Management: **Dr. Debabrata Roy**, MC-003.
- Names are drawn from a curated Bengali name list with English transliterations; no real people.
- Portraits are illustrated avatars with consistent lighting and background; no synthetic photographs of minors.
- The school seal is an original vector mark: a circular seal with an open book, a river line, and “NUV · 1948,” in navy, seal red, and gold. It is used on the login, sidebar, receipts, report cards, and payslips, nowhere else.

### 10.4 Reset

Settings → Demo → Reset demo data restores the seed, clears local changes, and returns to the login screen. The reset is confirmed and audit-logged. The Flutter app has a matching reset in Profile → Demo.

---

## 11. Milestones and acceptance criteria

### M0 — Design (complete)

- Research completed: WB context, Banglar Shiksha, UDISE, roles, WBBSE pattern, salary levels, bilingual typography.
- Skills installed: `apple-design-hig`, `apple-design-web`, `emil-design-eng`, `emil-animate`, `emil-animation-performance`, `emil-mobile-native`, `emil-review-animations`, `emil-find-animation-opportunities`.
- Art direction approved: Civic Modern.
- This specification.

### M1 — Foundation

Deliverables:
- Web scaffold (Next.js, TypeScript, Tailwind, tokens, fonts).
- Design-system gallery at `/design` with color, type, spacing, components, motion states.
- Demo login, role guards, console shell, language toggle, theme toggle, demo badge.
- Seeded data generator and repository; localStorage persistence; reset.
- Flutter scaffold, theme, fonts, seal, avatars, login, today shell, local database.
- Shared token generator and drift check.

Acceptance:
- Sign in as all four roles; correct navigation and permission denial.
- Language toggle translates every visible string; Bengali shapes correctly.
- Light/dark appearances; reduced motion and reduced transparency respected.
- No console errors; no layout break at 390, 768, 1024, 1440.
- Token drift check passes; unit tests for permissions and repository pass.

### M2 — Core web operations

Deliverables:
- Students list, profile, add/edit, documents, transfer/TC.
- Admissions queue, detail, verification, approval, enrollment, bulk import.
- Attendance register, history, corrections, staff attendance and leave.
- Timetable, live free-teacher lookup, uncovered-period derivation, cover desk, auto cover alert, substitute claims, and audit.
- Exams setup, marks entry, moderation, results, report cards, readiness.
- Fees structure, bills, collection, receipts, concessions, dues.
- Salary structures, monthly bill, verify/approve/disburse, payslips.

Acceptance:
- End-to-end: enroll a student → appears in roster → mark attendance → enter marks → publish results → generate report card → issue a bill → collect payment → print receipt → prepare and approve a salary bill → print payslip.
- Validation prevents overpayment, over-marking, duplicate enrollment, and approval of incomplete bills.
- Every sensitive action writes an audit event.
- Print outputs are bilingual, aligned, and contain no clipped text.
- Cover: mark a teacher absent → uncovered periods appear → free teacher suggested → assign or claim → substitute opens the register → complete the cover, with audit at each step.

### M3 — Insight and administration

Deliverables:
- Role dashboards; school and student analytics; risk flags; notices; reports/exports; settings; audit log; command palette; empty/error states.

Acceptance:
- Management sees aggregates only; direct student URLs are denied.
- Analytics tables and charts agree; risk flags show their rule and evidence.
- Exports open correctly and are audit-logged.
- Settings changes flow into new bills, exams, and attendance behavior.

### M4 — Hazira Flutter app

Deliverables:
- Login, Today, attendance deck, summary, roster, student quick view, free-period cover card, notices, profile, offline queue, sync states.
- Light/dark, bilingual, reduced motion, haptics, illustrations, sealed assets.

Acceptance:
- Teacher signs in, opens VIII B, marks all 48 students via swipe and buttons, undoes a mark, reviews, submits; no data loss across app restart.
- Offline mode saves and shows the queue; sync completes when simulated online.
- The teacher sees the current free period and uncovered class, claims it in a confirmation sheet, and the claim persists locally across restart.
- Roster alternative is fully usable without gestures; screen reader labels are correct.
- Deck runs at 60fps on a mid-range phone; springs interrupt cleanly; reduced motion uses cross-fades.
- Golden tests match the approved Civic Modern direction.

### M5 — QA and polish

Deliverables:
- Playwright suites for all roles and core flows; axe scans; contrast measurements; screenshot set at four widths; Flutter integration and golden tests; performance pass; copy review in both languages.

Acceptance:
- WCAG 2.2 AA; no critical or high accessibility findings.
- All core flows pass; no console errors; no dead-end screens.
- Screenshots included in the final report; physical-device verification noted where required.
- The final APK/app build is preserved before any clean; web build output is preserved.

### M6 — Future

Backend, real authentication, student app, payments, notifications, Banglar Shiksha/UDISE adapters, production deployment. Each is a separate spec and approval cycle.

---

## 12. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Government-authorization ambiguity | Demo is clearly labelled; no official emblem or claim; integration is a later compliance track |
| Fee/salary rules vary by school | Configurable heads, structures, pass rules, and components; demo values are illustrative, not legal advice |
| Bengali shaping and line-breaking | Bundle Noto Sans Bengali; test conjuncts, names, and long labels on web and Flutter; screenshot every key screen |
| Realistic student photos of minors | Illustrated avatars in the demo; consent and retention policy before production photos |
| Offline conflicts | Client-generated IDs, idempotency, local draft preservation, explicit sync states; server conflict policy in the backend spec |
| Scope is large | Milestones with vertical slices; core flows deep, edge cases staged; no backend in M1 |
| Apple-style UI becoming generic | The school-day timeline, bilingual seal lockup, and Hazira deck are the signature; no template KPI wall |
| Glass hurting contrast/performance | Glass only on chrome; opaque content; reduced-transparency fallback; limited blur area; measured contrast |
| Motion causing jank or motion sickness | Transform/opacity only; spring budgets; reduced-motion cross-fades; real-device testing |
| “Pass/fail” ambiguity | Attendance uses Present/Absent; exam pass/fail is separate; the mapping is documented in the UI and spec |
| Demo data mistaken for real | Persistent demo badge; fictional names; reset; no real PII |

---

## 13. Build plan

The implementation follows the milestones above with vertical slices and verification at each stage.

1. **Scaffold and tokens** — repository folders, Next.js and Flutter projects, fonts, token generator, design gallery.
2. **Shell and auth** — demo login, role guards, sidebar/top bar, language, theme, command palette, demo reset.
3. **Seed data** — deterministic school, students, staff, attendance, exams, fees, salary, notices, audit; illustrated avatars; vector seal.
4. **Students and admissions** — list, profile, form, documents, workflow, bulk import, transfer.
5. **Attendance** — web register, corrections, staff attendance, weekly register components.
6. **Examinations** — setup, marks grid, moderation, results, report cards, analytics hooks.
7. **Fees** — structures, bills, collection, receipts, concessions, defaulters.
8. **Salary** — structures, bill preparation, verification, approval, disbursement, payslips.
9. **Insight and admin** — dashboards, analytics, risk flags, notices, reports, settings, audit.
10. **Hazira** — login, today, deck, summary, roster, quick view, notices, profile, offline queue.
11. **QA** — tests, axe, contrast, screenshots, Flutter integration/golden, performance, copy.

Each stage ends with: tests passing, no console errors, a real screenshot of the changed screens at the relevant widths, and a short verification note. No stage is marked complete from a build alone; UI is checked visually and interactions are exercised.

---

## 14. Approval

This specification is the source of truth for the first build. The design direction is approved. After explicit build approval:

1. Create the implementation plan with ordered tasks and verification.
2. Build the web console and Flutter app in the approved Civic Modern language.
3. Capture real screenshots and test every core flow.
4. Preserve the final builds before any cleanup.

No production code is written before that approval.
