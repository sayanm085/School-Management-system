# Baranda Student App — design

Date: 2026-11-03. Status: approved (wave-2 mockups, same day). Build order follows the
2026-11-01 backend architecture's demo-first pattern (`DATA_SOURCE=demo → api`).

## 1. What this is

A second Flutter app, `apps/student_app`, Android-first, for the students of Baranda Vidyapith.
The student signs in with a school-issued **Student ID** (e.g. `STU-2026-0147`) + password and sees
everything that concerns them: today, attendance, fees, exams, marks and mock tests, homework,
syllabus and what was covered in class today, notices — plus **Shikha**, an AI tutor grounded in
the student's own textbooks, answerable in Bengali or English.

Companion to `apps/teacher_app` (Hazira, staff-side) and `apps/web` (staff console). Design quality
bar: the teacher app's token system, which is already Apple's — this spec **reuses it verbatim**
rather than inventing a second language.

## 2. Locked decisions

| Decision | Choice | Notes |
| --- | --- | --- |
| Platform | Flutter, Android first | Same toolchain as teacher_app (Flutter 3.47, `~/dev-tools/flutter`, Android SDK `~/dev-tools/android-sdk`) |
| Design | Apple system tokens from `apps/teacher_app/lib/design/tokens.dart` — iOS palette `#007AFF` / `#F5F5F7` / tints, Inter + NotoSansBengali, radii 10/14/20/24/28, Emil motion curves | `apple-design-hig` + `emil-design-eng` reviewed; wave-2 mockups in `docs/superpowers/mockups/2026-11-03-student-app/` are the approved reference |
| Student login | New **Student ID + password**, issued by the school office | Distinct from admission numbers; no SMS/OTP dependency |
| Homework data | **Full loop** — teachers (or office) publish homework + daily coverage; students read | New domain on the backend + a publish surface on web first |
| AI grounding | **Textbook RAG** — WBBSE textbooks ingested (PDF → chunks → embeddings → pgvector), tutor cites textbook+page | Not context-only, not textbook-less |
| AI provider | **Google Gemini Flash**, proxied through the API; the key never ships in the app | Cheap enough for hundreds of students; strong Bengali |
| Login on app v1 | Demo mode first (`DATA_SOURCE=demo` pattern), flips to live API when the backend track lands | Same migration path Hazira followed |

## 3. App surface (approved screens)

Canonical bottom navigation, five tabs, never varying: **Home · Homework · Tutor · Marks · Profile**.

1. **Login** — school seal (navy/gold), iOS grouped form (Student ID, Password with reveal), blue
   pill button, school footnote. No marketing gradient.
2. **Home / Today** — greeting header (avatar, class/roll), large title "Today · আজ"; attendance
   ring card; fees (Paid ✓ / due) + next exam countdown split card; today's classes horizontal
   chips; notice strip when something is new.
3. **Homework** — segmented Due today / This week / Done; cards with subject icon, due pill,
   check-off; **"Covered today"** tinted section with what each period covered and an
   **Ask the Tutor** hand-off that opens the tutor pre-seeded with that lesson.
4. **Tutor (Shikha)** — iMessage-style chat; student asks in Bengali or English; answers may embed
   a worked example block and always carry a `Textbook · <class> · p. N` citation chip when RAG
   grounds them; quick chips: Explain simpler / Give me practice / In Bengali.
5. **Marks** — term segmented control; score trend chart; subject bars with deltas; mock-test
   tiles (score rings, "Practice suggested" when weak).
6. **Syllabus** (reached from Home "See all" and Profile) — today's live class timeline with
   per-period coverage; chapter progress; exam syllabus checklist with exam date pill.
7. **Profile** — student identity card (seal, name bn/en, class/roll, Student ID), fee summary,
   notices list, settings (language, notifications), logout.

## 4. Design system (no new tokens beyond the teacher app's)

- Color: exactly `AppColors` from `apps/teacher_app/lib/design/tokens.dart`. Canvas `#F5F5F7`,
  cards white radius 24/28, ink `#1D1D1F`, separators `#E5E5EA`, one accent `#007AFF`, semantic
  green `#1E8E3E`/`#E8F8ED`, orange `#B25000`/`#FFF3E0`, blue tint `#EAF3FF`. Dark-mode variants
  come free from the same file. Glass only on the floating tab bar (`AppColors.glass`).
- Type: Inter for Latin, NotoSansBengali for Bengali (`bnText`/`latinText` helpers copied), iOS
  large titles 30 bold, 17 body, 15 secondary.
- Motion (`AppMotion`): press-scale 0.97 @ 160 ms `easeOut` on every tappable; screens and cards
  enter on `easeOut 0.23,1,0.32,1` 200–300 ms with 30–80 ms stagger; tab switches animate on
  `easeDrawer 0.32,0.72,0,1`; nothing animates that is used hundreds of times a day; ring/progress
  values animate on first paint only. Reduced-motion: fades replace movement.
- Accessibility: minimum 15 px text on the 9:20 layout, 44 pt targets, contrast from the existing
  token pairs (blue on white 4.5:1+, tints carry dark text), nothing conveyed by color alone
  (due pills carry words, checks carry icons), Bengali and English labels everywhere.

## 5. Data model the app needs (drives the backend track)

Per student: profile + section; attendance summary + recent days; fee bills/payments status;
exams (incl. **type: `mock`**) + own marks; timetable for their section; notices; **homework**
(subject, title, detail, assigned date, due date, status); **daily coverage** (section, date,
period, subject, what was covered); syllabus/chapter progress per subject.

New backend domain (Track B): `homework` and `daily_coverage` tables + publish endpoints
(`teacher` permission, web form first), `student_users` identity (Student ID + Argon2id password,
own refresh family), student-scoped read endpoints returning **only the caller's own data**
(`school_id` + `student_id` from the token; nothing sibling-visible). Reuses B1 auth machinery
(hashed rotating refresh, device sessions, audit) and B2a conventions (problem+json, version,
tenancy FKs).

## 6. Shikha (AI tutor) — v1 shape

- Request path: app → API `/v1/tutor/chat` (student token) → Gemini Flash. Key lives in API env
  only. Per-student rate limit (e.g. 30 msgs/day) and daily token budget.
- Grounding: retrieve top-k chunks from the school's ingested textbooks filtered to the student's
  class/subject; prompt = system guardrails + retrieved chunks + student's current lesson context
  (subject/chapter/covered-today) + conversation. Answers cite `Textbook · <class> · p. N` when a
  chunk supports them; when nothing grounds the answer, the tutor says so and answers generally.
- Safety: minor-appropriate system prompt (no personal data about other people, no
  harmful content, encourage asking teachers), no student PII sent to the provider beyond
  class/subject context, conversations stored per student and visible to guardians/headmaster
  under the privacy matrix, obvious "AI can be wrong" affordance.
- Language: reply in the language of the question (Bengali or English); one-tap "In Bengali".

## 7. Build order (split track, converge)

- **S1a — App on demo data** (this milestone, first): full UI + interactions against a demo store
  generated from `apps/web/src/data/seed.json` for one Class VIII-B student; `flutter analyze`,
  debug APK, emulator screenshots reviewed against the mockups.
- **S1b — Backend**: student identity + read endpoints + homework/coverage publish loop (web).
- **S1c — RAG**: ingest pipeline + chat endpoint; app flips tutor from stub to live.
- **S1d — Converge**: `DATA_SOURCE=api` in the app; demo path retained until UAT.

## 8. Out of scope for v1

Fee payment inside the app (read-only status), guardian multi-student switching, push
notifications (local scheduling only), iOS build, offline sync (Hazira's Drift machinery comes
later if needed), report-card PDFs.
