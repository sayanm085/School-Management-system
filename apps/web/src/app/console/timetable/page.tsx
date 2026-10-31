"use client";

import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CircleCheck,
  Hand,
  UserRoundX,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { AssignCoverDialog } from "@/components/timetable/AssignCoverDialog";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PermissionDenied } from "@/components/ui/PermissionDenied";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { can } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import { staffById, subjectById, TODAY } from "@/lib/data/selectors";
import {
  DEMO_PERIOD,
  canClaimCover,
  canManageCover,
  coverSummary,
  currentPeriod,
  freePeriodsForTeacher,
  isAssistantHeadmaster,
  isTeacherAbsent,
  isTeacherFreeAt,
  periodProgress,
  teacherCoverOptions,
  teacherDay,
  type UncoveredPeriod,
} from "@/lib/domain/timetable";
import { formatCopy, useCopy } from "@/lib/i18n/copy";
import type { Substitution } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type CoverDialogState = {
  mode: "assign" | "claim";
  item: UncoveredPeriod;
  preselectedTeacherId?: string | null;
};

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sub-${Date.now()}`;
}

function sectionLabel(id: string) {
  return id.replace("-", " ");
}

export default function TimetablePage() {
  const copy = useCopy();
  const locale = useDemoStore((state) => state.locale);
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const commit = useDemoStore((state) => state.commit);
  const router = useRouter();
  const [dialog, setDialog] = useState<CoverDialogState | null>(null);

  if (!session || !can(session.role, "substitutions.view")) {
    return <PermissionDenied />;
  }

  const staff = staffById(db, session.staffId);
  if (!staff) return <PermissionDenied />;

  const currentStaff = staff;
  const currentSession = session;
  const manager = canManageCover(staff);
  const isAhm = isAssistantHeadmaster(staff);
  const teacherMode = !manager && canClaimCover(staff);
  const teacherAbsent = teacherMode && isTeacherAbsent(db, staff.id);
  const summary = coverSummary(db);
  const period = currentPeriod();
  const progress = periodProgress();
  const myDay = teacherMode ? teacherDay(db, staff.id) : [];
  const myCovers = summary.covers.filter(
    (item) => item.substitution.substituteTeacherId === staff.id,
  );
  const freePeriods = teacherMode
    ? freePeriodsForTeacher(db, staff.id)
    : [];
  const coverOptions = teacherMode
    ? teacherCoverOptions(db, staff.id)
    : [];
  const currentRow = myDay.find(
    (row) => row.period.period === DEMO_PERIOD,
  );
  const currentFree = currentRow?.kind === "free";
  const coveredCount = summary.covers.filter(
    (item) => item.substitution.status === "covered",
  ).length;

  function subjectName(subjectId: string | null | undefined) {
    const subject = subjectById(db, subjectId);
    return locale === "bn" ? subject?.nameBn : subject?.nameEn;
  }

  function personName(person: typeof staff | null | undefined) {
    if (!person) return "";
    return locale === "bn" ? person.nameBn : person.nameEn;
  }

  function roomFor(sectionId: string | null | undefined) {
    return (
      db.sections.find((section) => section.id === sectionId)?.room ?? ""
    );
  }

  function openAssign(
    item: UncoveredPeriod,
    preselectedTeacherId?: string | null,
  ) {
    if (!manager) return;
    setDialog({
      mode: "assign",
      item,
      preselectedTeacherId:
        preselectedTeacherId ?? item.suggestion?.staff.id ?? null,
    });
  }

  function openFromGrid(item: UncoveredPeriod) {
    if (manager) {
      openAssign(item);
      return;
    }
    if (!teacherMode) return;
    if (!isTeacherFreeAt(db, currentStaff.id, item.entry.day, item.entry.period)) {
      toast.error(copy.cover.busyThisPeriod);
      return;
    }
    setDialog({ mode: "claim", item });
  }

  function assignCover(item: UncoveredPeriod, teacherId: string) {
    const teacher = staffById(db, teacherId);
    const exists = db.substitutions.some(
      (record) =>
        record.date === TODAY &&
        record.period === item.entry.period &&
        record.sectionId === item.entry.sectionId,
    );
    if (exists) {
      toast.error(copy.cover.covered);
      setDialog(null);
      return;
    }
    if (
      !teacher ||
      !isTeacherFreeAt(db, teacher.id, item.entry.day, item.entry.period)
    ) {
      toast.error(copy.cover.noFreeTeachers);
      return;
    }

    const substitution: Substitution = {
      id: makeId(),
      date: TODAY,
      day: item.entry.day,
      period: item.entry.period,
      sectionId: item.entry.sectionId,
      subjectId: item.entry.subjectId,
      absentTeacherId: item.entry.teacherId,
      substituteTeacherId: teacher.id,
      status: "assigned",
      assignedBy: currentSession.staffId,
      reason: `Assigned from the cover desk · ${item.suggestion?.reason ?? "free this period"}.`,
      createdAt: new Date().toISOString(),
    };

    commit(
      (next) => {
        next.substitutions.push(substitution);
      },
      {
        action: "substitution.assigned",
        entityType: "substitution",
        entityId: substitution.id,
        summary: `${teacher.nameEn} assigned to cover ${sectionLabel(item.entry.sectionId)} ${subjectName(item.entry.subjectId) ?? ""} · P${item.entry.period}`,
      },
    );

    toast.success(copy.cover.coverAssigned, {
      description: formatCopy(copy.cover.coverAssignedBody, {
        teacher: teacher.nameEn,
        section: sectionLabel(item.entry.sectionId),
        subject: subjectName(item.entry.subjectId) ?? "",
        period: item.entry.period,
      }),
    });
    setDialog(null);
  }

  function claimCover(item: UncoveredPeriod, teacherId: string) {
    if (!teacherMode || teacherId !== currentStaff.id) return;
    if (!isTeacherFreeAt(db, currentStaff.id, item.entry.day, item.entry.period)) {
      toast.error(copy.cover.busyThisPeriod);
      return;
    }
    const exists = db.substitutions.some(
      (record) =>
        record.date === TODAY &&
        record.period === item.entry.period &&
        record.sectionId === item.entry.sectionId,
    );
    if (exists) {
      toast.error(copy.cover.covered);
      setDialog(null);
      return;
    }

    const substitution: Substitution = {
      id: makeId(),
      date: TODAY,
      day: item.entry.day,
      period: item.entry.period,
      sectionId: item.entry.sectionId,
      subjectId: item.entry.subjectId,
      absentTeacherId: item.entry.teacherId,
      substituteTeacherId: currentStaff.id,
      status: "assigned",
      assignedBy: currentStaff.id,
      reason: "Claimed from a free period in the cover desk.",
      createdAt: new Date().toISOString(),
    };

    commit(
      (next) => {
        next.substitutions.push(substitution);
      },
      {
        action: "substitution.claimed",
        entityType: "substitution",
        entityId: substitution.id,
        summary: `${currentStaff.nameEn} claimed cover for ${sectionLabel(item.entry.sectionId)} ${subjectName(item.entry.subjectId) ?? ""} · P${item.entry.period}`,
      },
    );

    toast.success(copy.cover.coverClaimed, {
      description: formatCopy(copy.cover.coverClaimedBody, {
        section: sectionLabel(item.entry.sectionId),
        subject: subjectName(item.entry.subjectId) ?? "",
      }),
      action: {
        label: copy.cover.openRegister,
        onClick: () =>
          router.push(`/console/attendance/${item.entry.sectionId}`),
      },
    });
    setDialog(null);
  }

  function markCovered(substitution: Substitution) {
    commit(
      (next) => {
        const record = next.substitutions.find(
          (item) => item.id === substitution.id,
        );
        if (record) record.status = "covered";
      },
      {
        action: "substitution.covered",
        entityType: "substitution",
        entityId: substitution.id,
        summary: `Cover completed for ${sectionLabel(substitution.sectionId)} period ${substitution.period}`,
      },
    );
    toast.success(copy.cover.markedCovered, {
      description: `${sectionLabel(substitution.sectionId)} · P${substitution.period}`,
    });
  }

  const headerActions = (
    <>
      <span className="inline-flex h-8 items-center gap-2 rounded-full bg-[var(--blue-tint)] px-3 text-[10px] font-semibold text-[var(--blue-text)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--blue)]" />
        {formatCopy(copy.cover.periodShort, { period: period.period })} ·{" "}
        {period.start}–{period.end}
      </span>
      <Button asChild variant="secondary" size="sm">
        <Link href="/console/attendance">
          <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.nav.attendance}
        </Link>
      </Button>
    </>
  );

  return (
    <>
      <PageHeader
        eyebrow={`${copy.cover.eyebrow}${
          manager
            ? ` · ${
                isAhm
                  ? copy.dashboard.roleAssistant
                  : copy.dashboard.roleHeadmaster
              }`
            : ""
        }`}
        title={manager ? copy.cover.title : copy.cover.myTimetable}
        subtitle={
          manager ? copy.cover.subtitle : copy.cover.teacherSubtitle
        }
        actions={headerActions}
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title={copy.cover.liveNow}
          value={formatCopy(copy.cover.periodShort, {
            period: period.period,
          })}
          subtitle={`${period.start}–${period.end} · ${formatCopy(
            copy.cover.minutesLeft,
            { minutes: progress.minutesLeft },
          )}`}
          visual={
            <ProgressRing value={progress.percent} size={46} tone="blue" />
          }
        />
        {manager ? (
          <>
            <SummaryCard
              title={copy.cover.classesNeedCover}
              value={summary.uncovered.length}
              subtitle={
                summary.uncovered.length
                  ? formatCopy(copy.cover.uncoveredSubtitle, {
                      count: summary.uncovered.length,
                    })
                  : copy.cover.allCovered
              }
              visual={
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--orange-tint)] text-[var(--orange-strong)]">
                  <UserRoundX className="h-4 w-4" aria-hidden="true" />
                </span>
              }
            />
            <SummaryCard
              title={copy.cover.freeTeachersNow}
              value={summary.freeNow.length}
              subtitle={copy.cover.freeNowSubtitle}
              visual={<Users className="h-5 w-5 text-[var(--blue)]" />}
            />
            <SummaryCard
              title={copy.cover.coversToday}
              value={summary.covers.length}
              subtitle={copy.cover.coversSubtitle}
              visual={
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--green-tint)] text-[var(--green-text)]">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                </span>
              }
            />
          </>
        ) : (
          <>
            <SummaryCard
              title={copy.cover.myFreePeriods}
              value={freePeriods.length}
              subtitle={copy.cover.freePeriodsSubtitle}
              visual={<CircleCheck className="h-5 w-5 text-[var(--green)]" />}
            />
            <SummaryCard
              title={copy.cover.coverDesk}
              value={coverOptions.length}
              subtitle={copy.cover.coverRequestsSubtitle}
              visual={<Hand className="h-5 w-5 text-[var(--orange-strong)]" />}
            />
            <SummaryCard
              title={copy.cover.myCovers}
              value={myCovers.length}
              subtitle={copy.cover.myCoversSubtitle}
              visual={
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--green-tint)] text-[var(--green-text)]">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                </span>
              }
            />
          </>
        )}
      </div>

      {manager ? (
        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(310px,0.75fr)]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{copy.cover.classesNeedCover}</CardTitle>
                <p className="mt-1 text-[11px] text-[var(--ink-secondary)]">
                  {copy.cover.liveNow} ·{" "}
                  {formatCopy(copy.cover.periodOf, { period: period.period })}
                </p>
              </div>
              <Badge tone={summary.uncovered.length ? "warning" : "success"}>
                {summary.uncovered.length}
              </Badge>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              {summary.uncovered.length === 0 ? (
                <div className="flex items-center gap-3 px-5 py-10">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--green-tint)] text-[var(--green-text)]">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold">
                      {copy.cover.allCovered}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--ink-secondary)]">
                      {copy.cover.noCoverDetail}
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--separator)]">
                  {summary.uncovered.map((item) => {
                    const suggestion = item.suggestion;
                    return (
                      <li key={item.entry.id} className="px-5 py-4">
                        <div className="flex flex-wrap items-start gap-3">
                          <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[13px] bg-[var(--orange-tint)] text-[var(--orange-strong)]">
                            <span className="text-[9px] font-bold">
                              P{item.entry.period}
                            </span>
                            <span className="text-[8px] font-medium">
                              {item.entry.start}
                            </span>
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[13px] font-semibold">
                                {sectionLabel(item.entry.sectionId)} ·{" "}
                                {subjectName(item.entry.subjectId)}
                              </p>
                              <StatusPill tone="warning">
                                {copy.cover.needsCover}
                              </StatusPill>
                            </div>
                            <p className="mt-1 text-[10px] text-[var(--ink-secondary)]">
                              {copy.cover.room} {item.entry.room} ·{" "}
                              {personName(item.absentTeacher)} ·{" "}
                              {copy.cover.fromLeave}
                            </p>
                            {suggestion ? (
                              <div className="mt-2.5 flex items-center gap-2 rounded-[11px] bg-[var(--fill)] px-2.5 py-2">
                                <Avatar
                                  name={suggestion.staff.nameEn}
                                  src={suggestion.staff.avatar}
                                  size={28}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[11px] font-semibold">
                                    {personName(suggestion.staff)}
                                    <span className="ml-1.5 text-[9px] font-medium text-[var(--green-text)]">
                                      · {copy.cover.suggested}
                                    </span>
                                  </p>
                                  <p className="truncate text-[9px] text-[var(--ink-secondary)]">
                                    {suggestion.reason}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="mt-2 text-[10px] font-medium text-[var(--orange-strong)]">
                                {copy.cover.noFreeTeachers}
                              </p>
                            )}
                          </div>
                          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                            <Button
                              size="sm"
                              onClick={() => openAssign(item)}
                            >
                              {copy.cover.assign}
                              <ChevronRight
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{copy.cover.freeTeachersNow}</CardTitle>
                <Badge tone="success">{summary.freeNow.length}</Badge>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                <ul
                  tabIndex={0}
                  aria-label={copy.cover.freeTeachersNow}
                  className="max-h-[308px] divide-y divide-[var(--separator)] overflow-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--blue)]"
                >
                  {summary.freeNow.map((candidate) => (
                    <li
                      key={candidate.staff.id}
                      className="flex items-center gap-3 px-5 py-2.5"
                    >
                      <Avatar
                        name={candidate.staff.nameEn}
                        src={candidate.staff.avatar}
                        size={32}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold">
                          {personName(candidate.staff)}
                        </p>
                        <p className="truncate text-[9px] text-[var(--ink-secondary)]">
                          {subjectName(candidate.staff.primarySubjectId)} ·{" "}
                          {formatCopy(copy.cover.load, {
                            count: candidate.load,
                          })}
                        </p>
                      </div>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--green)]" />
                      <span className="text-[9px] font-semibold text-[var(--green-text)]">
                        {copy.cover.freeNow}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-[var(--separator)] px-5 py-3 text-[9px] leading-relaxed text-[var(--ink-tertiary)]">
                  {copy.cover.freeTeacherHint}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{copy.cover.coversToday}</CardTitle>
                <Badge tone="neutral">{summary.covers.length}</Badge>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                {summary.covers.length === 0 ? (
                  <p className="px-5 py-8 text-[11px] text-[var(--ink-secondary)]">
                    {copy.cover.noSubstitutions}
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--separator)]">
                    {summary.covers.map(({ substitution, substitute }) => (
                      <li key={substitution.id} className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            name={substitute?.nameEn ?? "Cover"}
                            src={substitute?.avatar}
                            size={30}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-semibold">
                              {personName(substitute)}
                            </p>
                            <p className="truncate text-[9px] text-[var(--ink-secondary)]">
                              {sectionLabel(substitution.sectionId)} ·{" "}
                              {subjectName(substitution.subjectId)} · P
                              {substitution.period}
                            </p>
                          </div>
                          <StatusPill
                            tone={
                              substitution.status === "covered"
                                ? "success"
                                : "info"
                            }
                          >
                            {substitution.status === "covered"
                              ? copy.cover.covered
                              : copy.cover.assigned}
                          </StatusPill>
                        </div>
                        <div className="mt-2 flex items-center gap-3 pl-[42px]">
                          <Link
                            href={`/console/attendance/${substitution.sectionId}`}
                            className="inline-flex items-center gap-1 text-[9px] font-semibold text-[var(--blue-text)]"
                          >
                            {copy.cover.openRegister}
                            <ArrowUpRight
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                          </Link>
                          {substitution.status === "assigned" ? (
                            <button
                              type="button"
                              onClick={() => markCovered(substitution)}
                              className="inline-flex items-center gap-1 text-[9px] font-semibold text-[var(--green-text)]"
                            >
                              <CheckCircle2
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              {copy.cover.markCovered}
                            </button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(310px,0.75fr)]">
          <Card className="overflow-hidden">
            <div
              className={cn(
                "relative overflow-hidden p-5 text-white sm:p-6",
                currentFree
                  ? "bg-[linear-gradient(135deg,#0B3B6F_0%,#0C4A38_100%)]"
                  : currentRow?.kind === "cover"
                    ? "bg-[linear-gradient(135deg,#0C4A38_0%,#166B32_100%)]"
                    : "bg-[linear-gradient(135deg,#071F3A_0%,#0B3B6F_100%)]",
              )}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/8 blur-2xl"
              />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#E8C66A]">
                    {currentFree
                      ? `${copy.cover.freeNow} · P${period.period}`
                      : `${currentRow?.kind === "cover" ? copy.cover.covering : copy.cover.teaching} · P${period.period}`}{" "}
                    · {period.start}–{period.end}
                  </p>
                  <h2 className="mt-2 max-w-[26ch] text-[clamp(21px,2.6vw,28px)] leading-[1.1] font-semibold tracking-[-0.035em]">
                    {currentFree
                      ? copy.cover.teacherFreeNow
                      : currentRow?.kind === "class"
                        ? `${subjectName(currentRow.entry.subjectId)} · ${sectionLabel(currentRow.entry.sectionId)}`
                        : currentRow?.kind === "cover"
                          ? `${subjectName(currentRow.substitution.subjectId)} · ${sectionLabel(currentRow.substitution.sectionId)}`
                          : copy.cover.noCoverNeeded}
                  </h2>
                  <p className="mt-1.5 max-w-[48ch] text-[11px] leading-relaxed text-white/68">
                    {currentFree
                      ? copy.cover.teacherFreeDetail
                      : currentRow?.kind === "class"
                        ? `${copy.cover.room} ${currentRow.entry.room} · ${copy.cover.openRegister}`
                        : currentRow?.kind === "cover"
                          ? `${copy.cover.room} ${roomFor(currentRow.substitution.sectionId)} · ${copy.cover.covering}`
                          : ""}
                  </p>
                </div>
                {currentRow?.kind === "class" ? (
                  <Button asChild variant="on-dark" size="sm">
                    <Link
                      href={`/console/attendance/${currentRow.entry.sectionId}`}
                    >
                      {copy.cover.takeRegister}
                      <ArrowUpRight
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </Button>
                ) : null}
                {currentRow?.kind === "cover" ? (
                  <Button asChild variant="on-dark" size="sm">
                    <Link
                      href={`/console/attendance/${currentRow.substitution.sectionId}`}
                    >
                      {copy.cover.takeRegister}
                      <ArrowUpRight
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold">
                  {copy.cover.coverDesk}
                </p>
                <span className="text-[10px] text-[var(--ink-tertiary)]">
                  {copy.cover.coverRequestsSubtitle}
                </span>
              </div>
              {teacherAbsent ? (
                <p className="mt-3 rounded-[13px] bg-[var(--orange-tint)] px-3 py-2.5 text-[11px] font-medium text-[var(--orange-strong)]">
                  {copy.cover.onLeave}
                </p>
              ) : null}
              {coverOptions.length === 0 ? (
                <div className="mt-3 flex items-center gap-3 rounded-[14px] bg-[var(--green-tint)] px-3.5 py-3">
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-[var(--green-text)]"
                    aria-hidden="true"
                  />
                  <p className="text-[11px] leading-relaxed text-[var(--green-text)]">
                    {copy.cover.noCoverForYou}
                  </p>
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {coverOptions.map((item) => (
                    <li
                      key={item.entry.id}
                      className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[var(--separator)] bg-[var(--surface)] px-3 py-2.5"
                    >
                      <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-[11px] bg-[var(--orange-tint)] text-[var(--orange-strong)]">
                        <span className="text-[8px] font-bold">
                          P{item.entry.period}
                        </span>
                        <span className="text-[7px]">
                          {item.entry.start}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold">
                          {sectionLabel(item.entry.sectionId)} ·{" "}
                          {subjectName(item.entry.subjectId)}
                        </p>
                        <p className="truncate text-[9px] text-[var(--ink-secondary)]">
                          {item.entry.start}–{item.entry.end} ·{" "}
                          {copy.cover.room} {item.entry.room} ·{" "}
                          {personName(item.absentTeacher)} ·{" "}
                          {copy.cover.absent}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          setDialog({ mode: "claim", item })
                        }
                      >
                        {copy.cover.claimCover}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{copy.cover.myDay}</CardTitle>
                <span className="text-[10px] text-[var(--ink-tertiary)]">
                  {copy.cover.freePeriodsSubtitle}
                </span>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                <ul className="divide-y divide-[var(--separator)]">
                  {myDay.map((row) => {
                    const now = row.period.period === DEMO_PERIOD;
                    const isFree = row.kind === "free";
                    const canCoverPeriod = coverOptions.some(
                      (option) =>
                        option.entry.period === row.period.period,
                    );
                    const title =
                      row.kind === "class"
                        ? subjectName(row.entry.subjectId)
                        : row.kind === "cover"
                          ? subjectName(row.substitution.subjectId)
                          : copy.cover.free;
                    const meta =
                      row.kind === "class"
                        ? `${sectionLabel(row.entry.sectionId)} · ${copy.cover.room} ${row.entry.room}`
                        : row.kind === "cover"
                          ? `${sectionLabel(row.substitution.sectionId)} · ${copy.cover.room} ${roomFor(row.substitution.sectionId)}`
                          : canCoverPeriod
                            ? copy.cover.needsCover
                            : copy.cover.freePeriod;
                    const href =
                      row.kind === "class"
                        ? `/console/attendance/${row.entry.sectionId}`
                        : row.kind === "cover"
                          ? `/console/attendance/${row.substitution.sectionId}`
                          : null;
                    return (
                      <li
                        key={row.period.period}
                        className={cn(
                          "flex items-center gap-3 px-5 py-2.5",
                          now && "bg-[var(--blue-tint)]",
                        )}
                      >
                        <span className="w-10 shrink-0">
                          <span
                            className={cn(
                              "block font-mono text-[10px] font-semibold",
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
                            {now ? `${copy.cover.liveNow} · ` : ""}
                            {meta}
                          </p>
                        </div>
                        {href ? (
                          <Link
                            href={href}
                            aria-label={`${copy.cover.openRegister}: ${sectionLabel(
                              row.kind === "class"
                                ? row.entry.sectionId
                                : row.kind === "cover"
                                  ? row.substitution.sectionId
                                  : "",
                            )}`}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--blue-text)] transition-colors hover:bg-[var(--blue-tint)]"
                          >
                            <ArrowUpRight
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </Link>
                        ) : (
                          <StatusPill
                            tone={
                              isFree
                                ? canCoverPeriod
                                  ? "warning"
                                  : now
                                    ? "success"
                                    : "neutral"
                                : row.kind === "cover"
                                  ? "success"
                                  : "info"
                            }
                            className="shrink-0"
                          >
                            {row.kind === "class"
                              ? copy.cover.teaching
                              : row.kind === "cover"
                                ? copy.cover.covering
                                : now
                                  ? copy.cover.freeNow
                                  : copy.cover.free}
                          </StatusPill>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{copy.cover.myFreePeriods}</CardTitle>
                <Badge tone="success">{freePeriods.length}</Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5 pt-2">
                {freePeriods.length === 0 ? (
                  <p className="text-[11px] text-[var(--ink-secondary)]">
                    {copy.cover.freePeriod}
                  </p>
                ) : (
                  freePeriods.map((item) => (
                    <span
                      key={item.period}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-tint)] px-2.5 py-1 text-[10px] font-semibold text-[var(--green-text)]"
                    >
                      P{item.period}
                      <span className="font-normal text-[var(--green-text)]">
                        {item.start}–{item.end}
                      </span>
                    </span>
                  ))
                )}
              </CardContent>
            </Card>

            {myCovers.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{copy.cover.myCovers}</CardTitle>
                  <Badge tone="success">{myCovers.length}</Badge>
                </CardHeader>
                <CardContent className="p-0 pt-2">
                  <ul className="divide-y divide-[var(--separator)]">
                    {myCovers.map(({ substitution }) => (
                      <li
                        key={substitution.id}
                        className="flex items-center gap-3 px-5 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold">
                            {sectionLabel(substitution.sectionId)} ·{" "}
                            {subjectName(substitution.subjectId)}
                          </p>
                          <p className="text-[9px] text-[var(--ink-secondary)]">
                            P{substitution.period} ·{" "}
                            {substitution.status === "covered"
                              ? copy.cover.covered
                              : copy.cover.assigned}
                          </p>
                        </div>
                        <Link
                          href={`/console/attendance/${substitution.sectionId}`}
                          className="inline-flex items-center gap-1 text-[9px] font-semibold text-[var(--blue-text)]"
                        >
                          {copy.cover.openRegister}
                          <ArrowUpRight
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                        </Link>
                        {substitution.status === "assigned" ? (
                          <button
                            type="button"
                            onClick={() => markCovered(substitution)}
                            className="inline-flex items-center gap-1 text-[9px] font-semibold text-[var(--green-text)]"
                          >
                            <CheckCircle2
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                            {copy.cover.markCovered}
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}

      <Card className="mt-4 overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>{copy.cover.todayGrid}</CardTitle>
            <p className="mt-1 text-[11px] text-[var(--ink-secondary)]">
              {copy.cover.todayGridSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-[var(--ink-tertiary)] sm:hidden">
              {copy.cover.scrollHintShort}
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </span>
            <Badge tone="info">
              {formatCopy(copy.cover.periodShort, { period: period.period })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TimetableGrid
            db={db}
            onSelectUncovered={openFromGrid}
            highlightTeacherId={teacherMode ? staff.id : null}
          />
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <p className="rounded-[12px] bg-[var(--fill)] px-3.5 py-2.5 text-[10px] leading-relaxed text-[var(--ink-secondary)]">
          {copy.cover.helpOne}
        </p>
        <p className="rounded-[12px] bg-[var(--fill)] px-3.5 py-2.5 text-[10px] leading-relaxed text-[var(--ink-secondary)]">
          {copy.cover.helpTwo}
        </p>
      </div>
      <p className="mt-3 text-[10px] text-[var(--ink-tertiary)]">
        {copy.cover.auditNote} {copy.cover.demoOnly}
      </p>

      <AssignCoverDialog
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        item={dialog?.item ?? null}
        mode={dialog?.mode ?? "assign"}
        claimTeacherId={staff.id}
        preselectedTeacherId={dialog?.preselectedTeacherId}
        onConfirm={(teacherId) => {
          if (!dialog) return;
          if (dialog.mode === "assign") {
            assignCover(dialog.item, teacherId);
          } else {
            claimCover(dialog.item, teacherId);
          }
        }}
      />
    </>
  );
}
