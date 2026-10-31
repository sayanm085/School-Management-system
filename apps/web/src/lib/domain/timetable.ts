import {
  sectionById,
  staffById,
  subjectById,
  TODAY,
} from "@/lib/data/selectors";
import type {
  Database,
  Staff,
  Substitution,
  TimetableEntry,
} from "@/lib/types";

export type DayCode = TimetableEntry["day"];
export type PeriodTiming = {
  period: number;
  start: string;
  end: string;
};

export const DEMO_DAY: DayCode = "SAT";
export const DEMO_NOW = "10:26";
export const DEMO_PERIOD = 4;

export const SATURDAY_PERIODS: PeriodTiming[] = [
  { period: 1, start: "08:00", end: "08:40" },
  { period: 2, start: "08:45", end: "09:25" },
  { period: 3, start: "09:30", end: "10:10" },
  { period: 4, start: "10:20", end: "11:00" },
  { period: 5, start: "11:05", end: "11:45" },
  { period: 6, start: "11:50", end: "12:30" },
];

export function isAssistantHeadmaster(staff: Staff | null | undefined) {
  return Boolean(
    staff?.assignments.some(
      (assignment) => assignment.type === "assistant_headmaster",
    ),
  );
}

export function canManageCover(staff: Staff | null | undefined) {
  if (!staff) return false;
  return staff.role === "headmaster" || isAssistantHeadmaster(staff);
}

export function canClaimCover(staff: Staff | null | undefined) {
  return staff?.role === "teacher" && staff.status === "active";
}

export function isTeacherAbsent(
  db: Database,
  staffId: string,
  date = TODAY,
) {
  const record = db.staffAttendance.find(
    (item) => item.staffId === staffId && item.date === date,
  );
  if (record?.status === "leave" || record?.status === "absent") return true;

  return db.leaveRequests.some(
    (request) =>
      request.staffId === staffId &&
      request.status === "approved" &&
      request.fromDate <= date &&
      request.toDate >= date,
  );
}

export function entriesForDay(db: Database, day: DayCode = DEMO_DAY) {
  return db.timetable.filter((entry) => entry.day === day);
}

export function entriesForSection(
  db: Database,
  sectionId: string,
  day: DayCode = DEMO_DAY,
) {
  return entriesForDay(db, day).filter(
    (entry) => entry.sectionId === sectionId,
  );
}

export function entriesForTeacher(
  db: Database,
  teacherId: string,
  day: DayCode = DEMO_DAY,
) {
  return entriesForDay(db, day).filter(
    (entry) => entry.teacherId === teacherId,
  );
}

export function substitutionForEntry(
  db: Database,
  entry: TimetableEntry,
  date = TODAY,
) {
  return (
    db.substitutions.find(
      (item) =>
        item.date === date &&
        item.period === entry.period &&
        item.sectionId === entry.sectionId,
    ) ?? null
  );
}

export function substitutionForPeriod(
  db: Database,
  day: DayCode,
  period: number,
  sectionId: string,
  date = TODAY,
) {
  return (
    db.substitutions.find(
      (item) =>
        item.date === date &&
        item.day === day &&
        item.period === period &&
        item.sectionId === sectionId,
    ) ?? null
  );
}

export function isTeacherFreeAt(
  db: Database,
  teacherId: string,
  day: DayCode,
  period: number,
  date = TODAY,
) {
  if (isTeacherAbsent(db, teacherId, date)) return false;
  if (
    db.timetable.some(
      (entry) =>
        entry.day === day &&
        entry.period === period &&
        entry.teacherId === teacherId,
    )
  ) {
    return false;
  }
  if (
    db.substitutions.some(
      (item) =>
        item.date === date &&
        item.period === period &&
        item.substituteTeacherId === teacherId,
    )
  ) {
    return false;
  }
  return true;
}

export type FreeTeacher = {
  staff: Staff;
  load: number;
};

export function freeTeachersAt(
  db: Database,
  day: DayCode,
  period: number,
  date = TODAY,
): FreeTeacher[] {
  const dayEntries = entriesForDay(db, day);
  return db.staff
    .filter((person) => person.role === "teacher" && person.status === "active")
    .filter((person) => isTeacherFreeAt(db, person.id, day, period, date))
    .map((person) => ({
      staff: person,
      load: dayEntries.filter((entry) => entry.teacherId === person.id).length,
    }))
    .sort(
      (left, right) =>
        left.load - right.load ||
        left.staff.nameEn.localeCompare(right.staff.nameEn),
    );
}

export type TeacherSuggestion = FreeTeacher & {
  score: number;
  reason: string;
  exactSubject: boolean;
  primarySubject: boolean;
};

export function suggestTeacherFor(
  db: Database,
  entry: TimetableEntry,
  candidates: FreeTeacher[],
): TeacherSuggestion | null {
  if (candidates.length === 0) return null;
  const subject = subjectById(db, entry.subjectId);
  const section = sectionById(db, entry.sectionId);

  const scored = candidates.map((candidate) => {
    const exactSubject = candidate.staff.assignments.some(
      (assignment) =>
        assignment.type === "subject_teacher" &&
        assignment.sectionId === entry.sectionId &&
        assignment.subjectId === entry.subjectId,
    );
    const primarySubject = candidate.staff.primarySubjectId === entry.subjectId;
    const classTeacher = candidate.staff.assignments.some(
      (assignment) =>
        assignment.type === "class_teacher" &&
        assignment.sectionId === entry.sectionId,
    );
    const assistant = isAssistantHeadmaster(candidate.staff);
    const score =
      (exactSubject ? 70 : 0) +
      (primarySubject ? 30 : 0) +
      (classTeacher ? 10 : 0) -
      (assistant ? 35 : 0) -
      candidate.load * 2;

    const reason = exactSubject
      ? `Teaches ${subject?.nameEn ?? "this subject"} to ${section?.id ?? "this class"}`
      : primarySubject
        ? `${subject?.nameEn ?? "Subject"} teacher · free this period`
        : "Free this period";

    return {
      ...candidate,
      score,
      reason,
      exactSubject,
      primarySubject,
    };
  });

  scored.sort(
    (left, right) =>
      right.score - left.score ||
      left.load - right.load ||
      left.staff.nameEn.localeCompare(right.staff.nameEn),
  );
  return scored[0] ?? null;
}

export type UncoveredPeriod = {
  entry: TimetableEntry;
  section: ReturnType<typeof sectionById>;
  subject: ReturnType<typeof subjectById>;
  absentTeacher: Staff | null;
  freeTeachers: FreeTeacher[];
  suggestion: TeacherSuggestion | null;
};

export function uncoveredPeriods(
  db: Database,
  date = TODAY,
  day: DayCode = DEMO_DAY,
): UncoveredPeriod[] {
  return entriesForDay(db, day)
    .filter(
      (entry) =>
        isTeacherAbsent(db, entry.teacherId, date) &&
        !substitutionForEntry(db, entry, date),
    )
    .map((entry) => {
      const freeTeachers = freeTeachersAt(db, day, entry.period, date);
      return {
        entry,
        section: sectionById(db, entry.sectionId),
        subject: subjectById(db, entry.subjectId),
        absentTeacher: staffById(db, entry.teacherId),
        freeTeachers,
        suggestion: suggestTeacherFor(db, entry, freeTeachers),
      };
    })
    .sort(
      (left, right) =>
        left.entry.period - right.entry.period ||
        left.entry.sectionId.localeCompare(right.entry.sectionId),
    );
}

export type CoverRecord = {
  substitution: Substitution;
  section: ReturnType<typeof sectionById>;
  subject: ReturnType<typeof subjectById>;
  absentTeacher: Staff | null;
  substitute: Staff | null;
};

export function coversForDay(
  db: Database,
  date = TODAY,
  day: DayCode = DEMO_DAY,
): CoverRecord[] {
  return db.substitutions
    .filter((item) => item.date === date && item.day === day)
    .map((substitution) => ({
      substitution,
      section: sectionById(db, substitution.sectionId),
      subject: subjectById(db, substitution.subjectId),
      absentTeacher: staffById(db, substitution.absentTeacherId),
      substitute: staffById(db, substitution.substituteTeacherId),
    }))
    .sort((left, right) => left.substitution.period - right.substitution.period);
}

export type TeacherDayRow =
  | {
      kind: "class";
      period: PeriodTiming;
      entry: TimetableEntry;
    }
  | {
      kind: "cover";
      period: PeriodTiming;
      substitution: Substitution;
    }
  | {
      kind: "free";
      period: PeriodTiming;
    };

export function teacherDay(
  db: Database,
  teacherId: string,
  day: DayCode = DEMO_DAY,
  date = TODAY,
): TeacherDayRow[] {
  const own = entriesForTeacher(db, teacherId, day);
  const covers = db.substitutions.filter(
    (item) =>
      item.date === date &&
      item.day === day &&
      item.substituteTeacherId === teacherId,
  );

  return SATURDAY_PERIODS.map((period) => {
    const entry = own.find((item) => item.period === period.period);
    if (entry) return { kind: "class" as const, period, entry };
    const substitution = covers.find(
      (item) => item.period === period.period,
    );
    if (substitution) {
      return { kind: "cover" as const, period, substitution };
    }
    return { kind: "free" as const, period };
  });
}

export function freePeriodsForTeacher(
  db: Database,
  teacherId: string,
  day: DayCode = DEMO_DAY,
  date = TODAY,
) {
  return SATURDAY_PERIODS.filter((period) =>
    isTeacherFreeAt(db, teacherId, day, period.period, date),
  );
}

export function teacherCoverOptions(
  db: Database,
  teacherId: string,
  date = TODAY,
) {
  return uncoveredPeriods(db, date).filter((item) =>
    isTeacherFreeAt(db, teacherId, DEMO_DAY, item.entry.period, date),
  );
}

export function currentPeriod() {
  return (
    SATURDAY_PERIODS.find((period) => period.period === DEMO_PERIOD) ??
    SATURDAY_PERIODS[0]
  );
}

export function periodProgress() {
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const period = currentPeriod();
  const start = toMinutes(period.start);
  const end = toMinutes(period.end);
  const now = toMinutes(DEMO_NOW);
  const elapsed = Math.min(Math.max(now - start, 0), end - start);
  return {
    percent: Math.round((elapsed / (end - start)) * 100),
    minutesElapsed: elapsed,
    minutesLeft: end - now,
  };
}

export function coverSummary(db: Database, date = TODAY) {
  const uncovered = uncoveredPeriods(db, date);
  const current = currentPeriod();
  const freeNow = freeTeachersAt(db, DEMO_DAY, current.period, date);
  const covers = coversForDay(db, date);
  return {
    uncovered,
    freeNow,
    covers,
    current,
    nextCover: uncovered[0] ?? null,
  };
}

export function coverOptionForEntry(
  db: Database,
  entry: TimetableEntry,
  teacherId: string,
  date = TODAY,
) {
  if (!isTeacherFreeAt(db, teacherId, entry.day, entry.period, date)) {
    return null;
  }
  const freeTeachers = freeTeachersAt(db, entry.day, entry.period, date);
  return suggestTeacherFor(db, entry, freeTeachers);
}
