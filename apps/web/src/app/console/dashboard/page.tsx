"use client";

import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileText,
  GraduationCap,
  Hand,
  Plus,
  UserPlus,
  UserRoundX,
  Users,
} from "lucide-react";
import Link from "next/link";

import { AttentionList } from "@/components/dashboard/AttentionList";
import { ClassRows } from "@/components/dashboard/ClassRows";
import { CoverBoardCard } from "@/components/dashboard/CoverBoardCard";
import {
  DashboardHero,
  HeroChip,
  HeroPanel,
  HeroStat,
} from "@/components/dashboard/DashboardHero";
import { FreeTeachersCard } from "@/components/dashboard/FreeTeachersCard";
import { NoticesCard } from "@/components/dashboard/NoticesCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { SchoolPulsePanel } from "@/components/dashboard/SchoolPulsePanel";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SegmentedBar } from "@/components/ui/SegmentedBar";
import { useDemoStore } from "@/lib/data/repository";
import {
  examReadiness,
  feeSummary,
  leaveSummary,
  overdueBills,
  resultForStudent,
  schoolAttendance,
  staffById,
  teacherSections,
  TODAY,
  todayRecordsForSection,
} from "@/lib/data/selectors";
import {
  DEMO_PERIOD,
  coverSummary,
  freePeriodsForTeacher,
  isAssistantHeadmaster,
  teacherCoverOptions,
  teacherDay,
} from "@/lib/domain/timetable";
import { formatINR, formatShortDate, formatDate } from "@/lib/format";
import { formatCopy, useCopy } from "@/lib/i18n/copy";
import type { Staff } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const admissionTone = {
  submitted: "warning",
  verified: "info",
  approved: "success",
  waitlisted: "neutral",
  rejected: "danger",
  enrolled: "success",
} as const;

function givenNameOf(staff: Staff, locale: "en" | "bn") {
  const raw = locale === "bn" ? staff.nameBn : staff.nameEn;
  return raw
    .replace(/^(Dr\.|ড\.|Mr\.|Mrs\.|Ms\.)\s+/i, "")
    .split(" ")[0];
}

function CoverHeroBanner({
  uncoveredCount,
  freeCount,
  nextLabel,
  suggestedName,
}: {
  uncoveredCount: number;
  freeCount: number;
  nextLabel: string | null;
  suggestedName: string | null;
}) {
  const copy = useCopy();
  if (uncoveredCount === 0) {
    return (
      <div className="flex flex-col gap-3 border-t border-white/10 bg-white/[0.045] px-6 py-3.5 sm:flex-row sm:items-center sm:px-8 lg:px-9">
        <div className="flex items-start gap-3 sm:min-w-0 sm:flex-1">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7BE0A6]/14 text-[#7BE0A6]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-white/70">
            <span className="font-semibold text-white">
              {copy.cover.allCovered}
            </span>{" "}
            ·{" "}
            {formatCopy(copy.cover.freeTeacherCount, {
              count: freeCount,
            })}
          </p>
        </div>
        <Link
          href="/console/timetable"
          className="inline-flex shrink-0 items-center gap-1 self-start text-[10px] font-semibold text-[#F2D588] transition-opacity hover:opacity-80 sm:self-auto"
        >
          {copy.cover.viewCover}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-white/10 bg-[#C99700]/12 px-6 py-3.5 sm:flex-row sm:items-center sm:px-8 lg:px-9">
      <div className="flex items-start gap-3 sm:min-w-0 sm:flex-1">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C99700]/22 text-[#F2D588]">
          <UserRoundX className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-white/72">
          <span className="font-semibold text-white">
            {formatCopy(copy.cover.coverNeeded, {
              count: uncoveredCount,
            })}
          </span>
          {nextLabel ? <> · {nextLabel}</> : null}
          {suggestedName ? <> · {suggestedName} {copy.cover.freeNow}</> : null}
        </p>
      </div>
      <Button asChild variant="on-dark" size="sm" className="w-full sm:w-auto">
        <Link href="/console/timetable">
          {copy.cover.viewCover}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

export default function DashboardPage() {
  const copy = useCopy();
  const locale = useDemoStore((state) => state.locale);
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);

  if (!session) return null;

  const staff = staffById(db, session.staffId);
  if (!staff) return null;

  const isAhm = isAssistantHeadmaster(staff);
  const attendance = schoolAttendance(db);
  const fees = feeSummary(db);
  const readiness = examReadiness(db);
  const leave = leaveSummary(db);
  const feePercent =
    fees.demandPaise === 0 ? 0 : (fees.collectedPaise / fees.demandPaise) * 100;
  const cover = coverSummary(db);
  const calendarChip = formatDate(TODAY, locale);
  const topNote = `${copy.common.demo} · ${copy.common.academicYear}`;

  function subjectNameFor(subjectId: string | null | undefined) {
    const subject = db.subjects.find((item) => item.id === subjectId);
    return locale === "bn" ? subject?.nameBn : subject?.nameEn;
  }

  function personName(person: Staff | null | undefined) {
    if (!person) return "";
    return locale === "bn" ? person.nameBn : person.nameEn;
  }

  const nextCover = cover.nextCover;
  const nextCoverLabel = nextCover
    ? `${formatCopy(copy.cover.periodShort, {
        period: nextCover.entry.period,
      })} · ${nextCover.entry.sectionId.replace("-", " ")} ${subjectNameFor(nextCover.entry.subjectId) ?? ""}`
    : null;
  const suggestedName = nextCover?.suggestion
    ? personName(nextCover.suggestion.staff)
    : null;
  const gapPeriods = Array.from(
    new Set(cover.uncovered.map((item) => item.entry.period)),
  );
  const greeting =
    session.role === "headmaster"
      ? copy.dashboard.greetingHeadmaster
      : isAhm
        ? copy.dashboard.greetingAssistant
        : session.role === "teacher"
          ? formatCopy(copy.dashboard.greetingTeacher, {
              name: givenNameOf(staff, locale),
            })
          : session.role === "clerk"
            ? formatCopy(copy.dashboard.greetingClerk, {
                name: givenNameOf(staff, locale),
              })
            : formatCopy(copy.dashboard.greetingManagement, {
                name: givenNameOf(staff, locale),
              });
  const heroChips = (
    <>
      <HeroChip>{calendarChip}</HeroChip>
      <HeroChip tone="gold">{copy.common.halfDay}</HeroChip>
      <HeroChip>{copy.dashboard.dayCount}</HeroChip>
    </>
  );

  if (session.role === "headmaster") {
    return (
      <>
        <DashboardHero
          eyebrow={`${copy.dashboard.morningRegister} · ${copy.dashboard.roleHeadmaster}`}
          title={greeting}
          subtitle={copy.dashboard.headmasterLine}
          topNote={topNote}
          chips={heroChips}
          actions={
            <>
              <Button asChild variant="on-dark">
                <Link href="/console/attendance">
                  <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                  {copy.dashboard.takeAttendance}
                </Link>
              </Button>
              <Button asChild variant="on-dark-ghost">
                <Link href="/console/timetable">
                  <UserRoundX className="h-4 w-4" aria-hidden="true" />
                  {copy.cover.coverDesk}
                </Link>
              </Button>
            </>
          }
          aside={
            <SchoolPulsePanel
              uncoveredCount={cover.uncovered.length}
              freeNowCount={cover.freeNow.length}
              gapPeriods={gapPeriods}
              nextCoverLabel={nextCoverLabel}
            />
          }
          banner={
            <CoverHeroBanner
              uncoveredCount={cover.uncovered.length}
              freeCount={cover.freeNow.length}
              nextLabel={nextCoverLabel}
              suggestedName={suggestedName}
            />
          }
        />

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(310px,0.75fr)]">
          <CoverBoardCard />
          <AttentionList />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title={copy.dashboard.attendance}
            value={`${attendance.percentage.toFixed(1)}%`}
            subtitle={`${attendance.total} students · term to date`}
            visual={
              <ProgressRing
                value={attendance.percentage}
                size={50}
                tone="green"
              />
            }
          />
          <SummaryCard
            title={copy.dashboard.feeCollection}
            value={formatINR(fees.collectedPaise)}
            subtitle={`of ${formatINR(fees.demandPaise)} this month`}
            visual={
              <div className="w-20">
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--fill)]">
                  <div
                    className="h-full rounded-full bg-[var(--blue)]"
                    style={{ width: `${feePercent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-right text-[9px] text-[var(--ink-tertiary)]">
                  {Math.round(feePercent)}%
                </p>
              </div>
            }
          />
          <SummaryCard
            title={copy.dashboard.examReadiness}
            value={readiness ? `${readiness.ready} of ${readiness.total}` : "—"}
            subtitle={
              readiness
                ? `${readiness.pending.length} subjects pending`
                : "Annual examination"
            }
            visual={
              readiness ? (
                <SegmentedBar
                  filled={readiness.ready}
                  total={readiness.total}
                  tone="blue"
                />
              ) : undefined
            }
          />
          <SummaryCard
            title={copy.dashboard.staffOnLeave}
            value={leave.onLeave}
            subtitle={`${leave.pending} unapproved`}
            visual={
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--orange-tint)] text-[var(--orange-strong)]">
                <Users className="h-4 w-4" aria-hidden="true" />
              </span>
            }
          />
        </div>

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
          <ClassRows />
          <div className="grid gap-4">
            <NoticesCard />
            <RecentActivity />
          </div>
        </div>
      </>
    );
  }

  if (session.role === "teacher" && isAhm) {
    return (
      <>
        <DashboardHero
          eyebrow={`${copy.dashboard.morningRegister} · ${copy.dashboard.roleAssistant}`}
          title={greeting}
          subtitle={copy.dashboard.assistantLine}
          topNote={topNote}
          chips={heroChips}
          actions={
            <>
              <Button asChild variant="on-dark">
                <Link href="/console/attendance">
                  <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                  {copy.dashboard.takeAttendance}
                </Link>
              </Button>
              <Button asChild variant="on-dark-ghost">
                <Link href="/console/timetable">
                  <UserRoundX className="h-4 w-4" aria-hidden="true" />
                  {copy.cover.viewCover}
                </Link>
              </Button>
            </>
          }
          aside={
            <SchoolPulsePanel
              uncoveredCount={cover.uncovered.length}
              freeNowCount={cover.freeNow.length}
              gapPeriods={gapPeriods}
              nextCoverLabel={nextCoverLabel}
            />
          }
          banner={
            <CoverHeroBanner
              uncoveredCount={cover.uncovered.length}
              freeCount={cover.freeNow.length}
              nextLabel={nextCoverLabel}
              suggestedName={suggestedName}
            />
          }
        />

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(310px,0.75fr)]">
          <CoverBoardCard />
          <FreeTeachersCard />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title={copy.cover.classesNeedCover}
            value={cover.uncovered.length}
            subtitle={
              cover.uncovered.length
                ? formatCopy(copy.cover.uncoveredSubtitle, {
                    count: cover.uncovered.length,
                  })
                : copy.cover.allCovered
            }
            visual={<UserRoundX className="h-5 w-5 text-[var(--orange-strong)]" />}
          />
          <SummaryCard
            title={copy.cover.freeTeachersNow}
            value={cover.freeNow.length}
            subtitle={copy.cover.freeNowSubtitle}
            visual={<Users className="h-5 w-5 text-[var(--blue)]" />}
          />
          <SummaryCard
            title={copy.dashboard.staffOnLeave}
            value={leave.onLeave}
            subtitle={`${leave.pending} unapproved`}
            visual={
              <CalendarClock className="h-5 w-5 text-[var(--orange-strong)]" />
            }
          />
          <SummaryCard
            title={copy.dashboard.classesInSession}
            value={db.sections.length}
            subtitle="Classes V–X · half day"
            visual={<GraduationCap className="h-5 w-5 text-[var(--blue)]" />}
          />
        </div>

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
          <ClassRows />
          <div className="grid gap-4">
            <RecentActivity />
            <NoticesCard />
          </div>
        </div>
      </>
    );
  }

  if (session.role === "teacher") {
    const sections = teacherSections(db, staff);
    const pending = sections.filter(
      (section) => todayRecordsForSection(db, section.id).length === 0,
    ).length;
    const studentCount = sections.reduce(
      (sum, section) =>
        sum +
        db.students.filter((student) => student.sectionId === section.id)
          .length,
      0,
    );
    const myDay = teacherDay(db, staff.id);
    const freePeriods = freePeriodsForTeacher(db, staff.id);
    const coverOptions = teacherCoverOptions(db, staff.id);
    const currentRow = myDay.find(
      (row) => row.period.period === DEMO_PERIOD,
    );
    const currentFree = currentRow?.kind === "free";
    const currentTitle = currentFree
      ? copy.cover.teacherFreeNow
      : currentRow?.kind === "class"
        ? subjectNameFor(currentRow.entry.subjectId)
        : currentRow?.kind === "cover"
          ? subjectNameFor(currentRow.substitution.subjectId)
          : copy.cover.free;
    const currentMeta = currentFree
      ? `${currentRow?.period.start ?? ""}–${currentRow?.period.end ?? ""} · ${copy.cover.freePeriod}`
      : currentRow?.kind === "class"
        ? `${currentRow.entry.sectionId.replace("-", " ")} · ${copy.cover.room} ${currentRow.entry.room}`
        : currentRow?.kind === "cover"
          ? `${currentRow.substitution.sectionId.replace("-", " ")} · ${copy.cover.covering}`
          : "";
    const firstOption = coverOptions[0];

    return (
      <>
        <DashboardHero
          eyebrow={`${copy.dashboard.myDay} · ${staff.designation}`}
          title={greeting}
          subtitle={copy.dashboard.myDaySubtitle}
          topNote={topNote}
          chips={heroChips}
          actions={
            <>
              <Button asChild variant="on-dark">
                <Link href="/console/attendance">
                  <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                  {copy.dashboard.takeAttendance}
                </Link>
              </Button>
              <Button asChild variant="on-dark-ghost">
                <Link href="/console/timetable">
                  <UserRoundX className="h-4 w-4" aria-hidden="true" />
                  {copy.cover.coverDesk}
                </Link>
              </Button>
            </>
          }
          aside={
            <HeroPanel
              title={copy.cover.myDay}
              badge={
                <HeroChip tone="live">
                  {formatCopy(copy.cover.periodShort, { period: DEMO_PERIOD })}{" "}
                  · {currentRow?.period.start}
                </HeroChip>
              }
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/48">
                {currentFree
                  ? copy.cover.freeNow
                  : currentRow?.kind === "cover"
                    ? copy.cover.covering
                    : copy.cover.teaching}
              </p>
              <p className="mt-1.5 text-[22px] leading-tight font-semibold tracking-[-0.03em]">
                {currentTitle}
              </p>
              <p className="mt-1 text-[11px] text-white/58">{currentMeta}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <HeroStat
                  value={freePeriods.length}
                  label={copy.cover.myFreePeriods}
                />
                <HeroStat
                  value={coverOptions.length}
                  label={copy.cover.coverDesk}
                  accent={coverOptions.length > 0}
                />
              </div>
              <div className="mt-3.5 border-t border-white/10 pt-3">
                <Link
                  href="/console/timetable"
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#F2D588] transition-opacity hover:opacity-80"
                >
                  {copy.cover.openMyTimetable}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </HeroPanel>
          }
          banner={
            coverOptions.length > 0 ? (
              <div className="flex flex-col gap-3 border-t border-white/10 bg-[#C99700]/12 px-6 py-3.5 sm:flex-row sm:items-center sm:px-8 lg:px-9">
                <div className="flex items-start gap-3 sm:min-w-0 sm:flex-1">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C99700]/22 text-[#F2D588]">
                    <Hand className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-white/72">
                    <span className="font-semibold text-white">
                      {formatCopy(copy.cover.coverNeeded, {
                        count: coverOptions.length,
                      })}
                    </span>
                    {firstOption
                      ? ` · ${formatCopy(copy.cover.periodShort, {
                          period: firstOption.entry.period,
                        })} ${firstOption.entry.sectionId.replace("-", " ")} ${subjectNameFor(firstOption.entry.subjectId)}`
                      : ""}
                  </p>
                </div>
                <Button
                  asChild
                  variant="on-dark"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Link href="/console/timetable">
                    {copy.cover.claimCover}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 border-t border-white/10 bg-white/[0.045] px-6 py-3.5 sm:flex-row sm:items-center sm:px-8 lg:px-9">
                <div className="flex items-start gap-3 sm:min-w-0 sm:flex-1">
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-[#7BE0A6]"
                    aria-hidden="true"
                  />
                  <p className="min-w-0 flex-1 text-[11px] text-white/68">
                    {copy.cover.noCoverForYou}
                  </p>
                </div>
                <Link
                  href="/console/timetable"
                  className="inline-flex shrink-0 items-center gap-1 self-start text-[10px] font-semibold text-[#F2D588] sm:self-auto"
                >
                  {copy.cover.openMyTimetable}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            )
          }
        />

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="My classes"
            value={sections.length}
            subtitle="Assigned sections this session"
            visual={<Users className="h-5 w-5 text-[var(--blue)]" />}
          />
          <SummaryCard
            title="Registers pending"
            value={pending}
            subtitle="Today · half day"
            visual={
              <SegmentedBar
                filled={sections.length - pending}
                total={sections.length}
                tone="blue"
              />
            }
          />
          <SummaryCard
            title="Students"
            value={studentCount}
            subtitle="In my assigned sections"
          />
          <SummaryCard
            title="Notices"
            value={db.notices.filter((notice) => notice.status === "published").length}
            subtitle="Published for staff"
          />
        </div>

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
          <Card>
            <CardHeader>
              <CardTitle>My classes</CardTitle>
              <Link
                href="/console/attendance"
                className="text-[11px] font-semibold text-[var(--blue-text)]"
              >
                Open attendance
              </Link>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <ul className="divide-y divide-[var(--separator)]">
                {sections.map((section) => {
                  const marked =
                    todayRecordsForSection(db, section.id).length > 0;
                  const subjects = (staff.assignments ?? [])
                    .filter(
                      (assignment) =>
                        assignment.sectionId === section.id &&
                        assignment.subjectId,
                    )
                    .map((assignment) => assignment.subjectId)
                    .filter((subjectId): subjectId is string =>
                      Boolean(subjectId),
                    )
                    .map(
                      (subjectId) =>
                        db.subjects.find(
                          (subject) => subject.id === subjectId,
                        )?.nameEn,
                    )
                    .filter((name): name is string => Boolean(name));
                  return (
                    <li key={section.id}>
                      <Link
                        href={`/console/attendance/${section.id}`}
                        className="flex items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-[var(--fill)]"
                      >
                        <span className="w-12 text-[13px] font-semibold">
                          {section.id.replace("-", " ")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12px] font-medium">
                            {subjects.length
                              ? subjects.join(", ")
                              : "Class teacher"}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-[var(--ink-tertiary)]">
                            {
                              db.students.filter(
                                (student) =>
                                  student.sectionId === section.id,
                              ).length
                            }{" "}
                            students
                          </span>
                        </span>
                        <StatusPill tone={marked ? "success" : "warning"}>
                          {marked
                            ? copy.dashboard.marked
                            : copy.dashboard.pending}
                        </StatusPill>
                        <ChevronRight
                          className="h-4 w-4 text-[var(--ink-tertiary)]"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{copy.cover.myDay}</CardTitle>
                <Badge tone="info">{copy.common.halfDay}</Badge>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                <ul className="divide-y divide-[var(--separator)]">
                  {myDay.map((row) => {
                    const now = row.period.period === DEMO_PERIOD;
                    const optionForRow = coverOptions.find(
                      (option) =>
                        option.entry.period === row.period.period,
                    );
                    const title =
                      row.kind === "class"
                        ? subjectNameFor(row.entry.subjectId)
                        : row.kind === "cover"
                          ? subjectNameFor(row.substitution.subjectId)
                          : optionForRow
                            ? `${optionForRow.entry.sectionId.replace("-", " ")} · ${subjectNameFor(optionForRow.entry.subjectId)}`
                            : copy.cover.free;
                    const meta =
                      row.kind === "class"
                        ? `${row.entry.sectionId.replace("-", " ")} · ${copy.cover.room} ${row.entry.room}`
                        : row.kind === "cover"
                          ? `${row.substitution.sectionId.replace("-", " ")} · ${copy.cover.covering}`
                          : optionForRow
                            ? `${copy.cover.needsCover} · ${copy.cover.room} ${optionForRow.entry.room}`
                            : copy.cover.freePeriod;
                    return (
                      <li
                        key={row.period.period}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5",
                          now && "bg-[var(--blue-tint)]",
                        )}
                      >
                        <span className="w-9 shrink-0">
                          <span
                            className={cn(
                              "block font-mono text-[9px] font-semibold",
                              now
                                ? "text-[var(--blue-text)]"
                                : "text-[var(--ink-tertiary)]",
                            )}
                          >
                            {row.period.start}
                          </span>
                          <span className="block text-[8px] text-[var(--ink-tertiary)]">
                            P{row.period.period}
                          </span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-semibold">
                            {title}
                          </p>
                          <p className="truncate text-[9px] text-[var(--ink-secondary)]">
                            {meta}
                          </p>
                        </div>
                        <StatusPill
                          tone={
                            row.kind === "cover"
                              ? "success"
                              : row.kind === "class"
                                ? "info"
                                : optionForRow
                                  ? "warning"
                                  : now
                                    ? "success"
                                    : "neutral"
                          }
                          className="shrink-0"
                        >
                          {row.kind === "class"
                            ? copy.cover.teaching
                            : row.kind === "cover"
                              ? copy.cover.covering
                              : optionForRow
                                ? copy.cover.needsCover
                                : now
                                  ? copy.cover.freeNow
                                  : copy.cover.free}
                        </StatusPill>
                      </li>
                    );
                  })}
                </ul>
                <div className="border-t border-[var(--separator)] px-4 py-2.5">
                  <Link
                    href="/console/timetable"
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--blue-text)]"
                  >
                    {copy.cover.viewCover}
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              </CardContent>
            </Card>
            <NoticesCard limit={2} />
          </div>
        </div>
      </>
    );
  }

  if (session.role === "clerk") {
    const waiting = db.admissions.filter(
      (admission) =>
        admission.status === "submitted" || admission.status === "verified",
    );
    const pendingDocuments = db.admissions.filter((admission) =>
      admission.documents.some((document) => !document.verified),
    ).length;
    const overdue = overdueBills(db).length;

    return (
      <>
        <DashboardHero
          eyebrow={`${copy.dashboard.frontOffice} · ${staff.designation}`}
          title={greeting}
          subtitle={copy.dashboard.frontOfficeSubtitle}
          topNote={topNote}
          chips={heroChips}
          actions={
            <>
              <Button asChild variant="on-dark">
                <Link href="/console/admissions">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  {copy.dashboard.newAdmission}
                </Link>
              </Button>
              <Button asChild variant="on-dark-ghost">
                <Link href="/console/fees">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Collect payment
                </Link>
              </Button>
            </>
          }
          aside={
            <HeroPanel
              title={copy.dashboard.frontOffice}
              badge={<HeroChip>{copy.common.academicYear}</HeroChip>}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/48">
                Admissions waiting
              </p>
              <p className="mt-1 tabular text-[30px] leading-none font-semibold tracking-[-0.04em]">
                {waiting.length}
              </p>
              <p className="mt-1.5 text-[11px] text-white/58">
                Applications to verify
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <HeroStat value={overdue} label="Overdue bills" accent={overdue > 0} />
                <HeroStat value={pendingDocuments} label="Docs pending" />
              </div>
              <div className="mt-3.5 border-t border-white/10 pt-3">
                <Link
                  href="/console/admissions"
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#F2D588]"
                >
                  Open admissions
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </HeroPanel>
          }
        />

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="This month's collection"
            value={formatINR(fees.collectedPaise)}
            subtitle={`of ${formatINR(fees.demandPaise)} demand`}
            visual={
              <div className="w-20">
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--fill)]">
                  <div
                    className="h-full rounded-full bg-[var(--blue)]"
                    style={{ width: `${feePercent}%` }}
                  />
                </div>
              </div>
            }
          />
          <SummaryCard
            title="Admissions waiting"
            value={waiting.length}
            subtitle="Applications to verify"
            visual={<Users className="h-5 w-5 text-[var(--blue)]" />}
          />
          <SummaryCard
            title="Fee bills overdue"
            value={overdue}
            subtitle="Past the due date"
            visual={<Badge tone="danger">{overdue} due</Badge>}
          />
          <SummaryCard
            title="Documents pending"
            value={pendingDocuments}
            subtitle="Across open applications"
            visual={<FileText className="h-5 w-5 text-[var(--orange-strong)]" />}
          />
        </div>

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Admissions queue</CardTitle>
              <Link
                href="/console/admissions"
                className="text-[11px] font-semibold text-[var(--blue-text)]"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <ul className="divide-y divide-[var(--separator)]">
                {db.admissions.slice(0, 4).map((admission) => (
                  <li key={admission.id}>
                    <Link
                      href={`/console/admissions/${admission.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-[var(--fill)]"
                    >
                      <span className="min-w-0 flex-1">
                        <span
                          className="font-bengali block text-[14px] font-semibold"
                          lang="bn"
                        >
                          {admission.nameBn}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[var(--ink-secondary)]">
                          {admission.nameEn} · Class{" "}
                          {admission.classApplied} ·{" "}
                          {formatShortDate(admission.createdAt)}
                        </span>
                      </span>
                      <StatusPill
                        tone={admissionTone[admission.status] ?? "neutral"}
                      >
                        {admission.status}
                      </StatusPill>
                      <ChevronRight
                        className="h-4 w-4 text-[var(--ink-tertiary)]"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <NoticesCard limit={2} />
            <RecentActivity limit={3} />
          </div>
        </div>
      </>
    );
  }

  const results = db.students.map((student) => resultForStudent(db, student));
  const passRate =
    results.length === 0
      ? 0
      : (results.filter((result) => result.pass).length / results.length) * 100;

  const subjectAverages = db.subjects.map((subject) => {
    const examSubjectIds = new Set(
      db.examSubjects
        .filter(
          (examSubject) =>
            examSubject.examId === "exam-half-2026" &&
            examSubject.subjectId === subject.id,
        )
        .map((examSubject) => examSubject.id),
    );
    const marks = db.marks.filter((mark) =>
      examSubjectIds.has(mark.examSubjectId),
    );
    const average =
      marks.length === 0
        ? 0
        : marks.reduce((sum, mark) => sum + mark.total, 0) / marks.length;
    return { subject, average };
  });

  return (
    <>
      <DashboardHero
        eyebrow={`${copy.dashboard.governance} · ${staff.designation}`}
        title={greeting}
        subtitle={copy.dashboard.governanceSubtitle}
        topNote={topNote}
        chips={heroChips}
        actions={
          <Button asChild variant="on-dark">
            <Link href="/console/reports">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Export summary
            </Link>
          </Button>
        }
        aside={
          <HeroPanel
            title={copy.dashboard.governance}
            badge={<HeroChip>{copy.common.academicYear}</HeroChip>}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/48">
              School attendance
            </p>
            <p className="mt-1 tabular text-[30px] leading-none font-semibold tracking-[-0.04em]">
              {attendance.percentage.toFixed(1)}%
            </p>
            <p className="mt-1.5 text-[11px] text-white/58">
              {attendance.total} students · term to date
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <HeroStat
                value={`${passRate.toFixed(1)}%`}
                label="Pass rate"
                accent
              />
              <HeroStat value={db.sections.length} label="Sections" />
            </div>
            <div className="mt-3.5 border-t border-white/10 pt-3">
              <Link
                href="/console/reports"
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#F2D588]"
              >
                Open reports
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
          </HeroPanel>
        }
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="School attendance"
          value={`${attendance.percentage.toFixed(1)}%`}
          subtitle={`${attendance.total} students · term to date`}
          visual={
            <ProgressRing
              value={attendance.percentage}
              size={46}
              tone="green"
            />
          }
        />
        <SummaryCard
          title="Pass rate"
          value={`${passRate.toFixed(1)}%`}
          subtitle="Half-Yearly Examination"
          visual={<ProgressRing value={passRate} size={46} tone="blue" />}
        />
        <SummaryCard
          title="Fee collection"
          value={formatINR(fees.collectedPaise)}
          subtitle={`of ${formatINR(fees.demandPaise)} this month`}
          visual={
            <div className="w-20">
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--fill)]">
                <div
                  className="h-full rounded-full bg-[var(--blue)]"
                  style={{ width: `${feePercent}%` }}
                />
              </div>
            </div>
          }
        />
        <SummaryCard
          title="Teaching staff"
          value={db.staff.filter((person) => person.role === "teacher").length + 1}
          subtitle="Including the Headmaster"
          visual={<GraduationCap className="h-5 w-5 text-[var(--blue)]" />}
        />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>School health</CardTitle>
            <Badge tone="info">Aggregate only</Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {subjectAverages.map(({ subject, average }) => (
              <div key={subject.id} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-[12px] font-medium">
                  {subject.nameEn}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--fill)]">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      average >= 70
                        ? "bg-[var(--green)]"
                        : average >= 55
                          ? "bg-[var(--orange)]"
                          : "bg-[var(--red)]",
                    )}
                    style={{ width: `${average}%` }}
                  />
                </span>
                <span className="tabular w-10 text-right text-[11px] text-[var(--ink-secondary)]">
                  {average.toFixed(1)}
                </span>
              </div>
            ))}
            <p className="pt-1 text-[10px] text-[var(--ink-tertiary)]">
              Subject averages from the Half-Yearly Examination. No student
              names or guardian details are shown in this view.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <RecentActivity limit={3} />
          <NoticesCard limit={2} />
        </div>
      </div>
    </>
  );
}
