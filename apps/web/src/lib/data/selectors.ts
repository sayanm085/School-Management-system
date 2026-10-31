import { formatShortDate } from "@/lib/format";
import type {
  AttendanceRecord,
  AttendanceStatus,
  Bill,
  Database,
  Exam,
  ExamSubject,
  Mark,
  Section,
  Staff,
  Student,
  Subject,
} from "@/lib/types";

export const TODAY = "2026-10-31";

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function staffById(db: Database, id: string | null | undefined) {
  return db.staff.find((person) => person.id === id) ?? null;
}

export function studentById(db: Database, id: string | null | undefined) {
  return db.students.find((student) => student.id === id) ?? null;
}

export function sectionById(db: Database, id: string | null | undefined) {
  return db.sections.find((section) => section.id === id) ?? null;
}

export function subjectById(db: Database, id: string | null | undefined) {
  return db.subjects.find((subject) => subject.id === id) ?? null;
}

export function studentsInSection(db: Database, sectionId: string) {
  return db.students
    .filter((student) => student.sectionId === sectionId)
    .sort((a, b) => Number(a.rollNo) - Number(b.rollNo));
}

export function classTeacherFor(db: Database, sectionId: string) {
  const section = sectionById(db, sectionId);
  return staffById(db, section?.classTeacherId);
}

export function teacherSections(db: Database, staff: Staff | null) {
  if (!staff) return [];
  const ids = new Set<string>();
  for (const assignment of staff.assignments) {
    if (assignment.sectionId) ids.add(assignment.sectionId);
  }
  return db.sections.filter((section) => ids.has(section.id));
}

export function attendanceHistoryFor(student: Student) {
  const random = mulberry32(student.attendanceSeed);
  const weeks: string[] = [];

  for (let week = 0; week < 12; week += 1) {
    let row = "";
    for (let day = 0; day < 6; day += 1) {
      if (week === 11 && day === 5) {
        row += "-";
        continue;
      }
      const value = random();
      if (student.attendanceRisk === "chronic") {
        row += value < 0.6 ? "P" : value < 0.88 ? "A" : value < 0.96 ? "L" : "H";
      } else if (student.attendanceRisk === "low") {
        row += value < 0.78 ? "P" : value < 0.92 ? "A" : value < 0.97 ? "L" : "H";
      } else {
        row += value < 0.94 ? "P" : value < 0.97 ? "A" : value < 0.99 ? "L" : "H";
      }
    }
    weeks.push(row);
  }

  return weeks;
}

const statusToChar: Record<AttendanceStatus, string> = {
  present: "P",
  absent: "A",
  late: "L",
  leave: "L",
  holiday: "H",
};

export function todayRecordsForSection(db: Database, sectionId: string) {
  return db.attendance.filter(
    (record) => record.date === TODAY && record.sectionId === sectionId,
  );
}

export function todayRecordForStudent(db: Database, studentId: string) {
  return (
    db.attendance.find(
      (record) => record.date === TODAY && record.studentId === studentId,
    ) ?? null
  );
}

export function effectiveHistory(db: Database, student: Student) {
  const history = attendanceHistoryFor(student);
  const record = todayRecordForStudent(db, student.id);
  if (!record) return history;

  const last = history[history.length - 1] ?? "------";
  history[history.length - 1] = `${last.slice(0, 5)}${statusToChar[record.status]}`;
  return history;
}

export function attendanceSummary(db: Database, student: Student) {
  const rows = effectiveHistory(db, student);
  let present = 0;
  let absent = 0;
  let late = 0;
  let holiday = 0;

  for (const row of rows) {
    for (const char of row) {
      if (char === "P") present += 1;
      else if (char === "A") absent += 1;
      else if (char === "L") late += 1;
      else if (char === "H") holiday += 1;
    }
  }

  const marked = present + absent + late;
  return {
    present,
    absent,
    late,
    holiday,
    marked,
    percentage: marked === 0 ? 0 : (present / marked) * 100,
  };
}

export function schoolAttendance(db: Database) {
  let present = 0;
  let absent = 0;
  let late = 0;

  for (const student of db.students) {
    const summary = attendanceSummary(db, student);
    present += summary.present;
    absent += summary.absent;
    late += summary.late;
  }

  const marked = present + absent + late;
  return {
    present,
    absent,
    late,
    total: db.students.length,
    marked,
    percentage: marked === 0 ? 0 : (present / marked) * 100,
  };
}

export function feeSummary(db: Database) {
  const octoberBills = db.bills.filter((bill) =>
    bill.dueDate.startsWith("2026-10"),
  );
  const demandPaise = octoberBills.reduce(
    (sum, bill) => sum + bill.totalPaise - bill.concessionPaise,
    0,
  );
  const collectedPaise = db.payments
    .filter(
      (payment) =>
        payment.status === "posted" && payment.paidAt.startsWith("2026-10"),
    )
    .reduce((sum, payment) => sum + payment.amountPaise, 0);

  return { demandPaise, collectedPaise };
}

export function overdueBills(db: Database) {
  return db.bills
    .filter((bill) => bill.duePaise > 0 && bill.dueDate < TODAY)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function examReadiness(db: Database) {
  const exam = db.exams.find((item) => item.id === "exam-annual-2027");
  return exam?.readiness ?? null;
}

export function leaveSummary(db: Database) {
  const active = db.leaveRequests.filter(
    (request) =>
      request.fromDate <= TODAY &&
      request.toDate >= TODAY &&
      request.status !== "rejected",
  );
  return {
    onLeave: active.length,
    pending: active.filter((request) => request.status === "pending").length,
  };
}

export type AttentionItem = {
  kind: "attendance" | "fees" | "salary";
  title: string;
  detail: string;
  href: string;
  tone: "danger" | "warning" | "info";
  count: number;
};

export function needsAttention(db: Database): AttentionItem[] {
  const riskStudents = db.students.filter(
    (student) => student.attendanceRisk !== "normal",
  );
  const overdue = overdueBills(db);
  const salaryPending = db.salaryBills.filter(
    (bill) => bill.status === "prepared",
  );

  return [
    {
      kind: "attendance",
      title: `${riskStudents.length} students need attendance follow-up`,
      detail: "Below 75% or repeated absence this term",
      href: "/analytics",
      tone: "danger",
      count: riskStudents.length,
    },
    {
      kind: "fees",
      title: `${overdue.length} fee bills overdue`,
      detail: overdue.length
        ? `Oldest due ${formatShortDate(overdue[0].dueDate)}`
        : "No dues",
      href: "/fees/bills",
      tone: "warning",
      count: overdue.length,
    },
    {
      kind: "salary",
      title: `${salaryPending.length} salary bill awaiting approval`,
      detail: salaryPending.length
        ? "October 2026 · prepared 31 Oct"
        : "All bills approved",
      href: "/salary",
      tone: "info",
      count: salaryPending.length,
    },
  ];
}

export type ClassRow = {
  section: Section;
  teacher: Staff | null;
  present: number;
  absent: number;
  marked: boolean;
};

export function classesInSession(db: Database): ClassRow[] {
  const ids = ["VIII-A", "VIII-B", "IX-A", "X-B"];
  return ids
    .map((id) => sectionById(db, id))
    .filter((section): section is Section => Boolean(section))
    .map((section) => {
      const records = todayRecordsForSection(db, section.id);
      const present = records.filter(
        (record) => record.status === "present" || record.status === "late",
      ).length;
      const absent = records.filter(
        (record) => record.status === "absent",
      ).length;
      return {
        section,
        teacher: classTeacherFor(db, section.id),
        present,
        absent,
        marked: records.length > 0,
      };
    });
}

export function recentActivity(db: Database, limit = 4) {
  return [...db.audit]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function examSubjectsForClass(
  db: Database,
  classLevel: string,
  examId = "exam-half-2026",
) {
  return db.examSubjects.filter(
    (subject) =>
      subject.examId === examId && subject.classLevel === classLevel,
  );
}

export function markForStudent(
  db: Database,
  examSubjectId: string,
  studentId: string,
) {
  return (
    db.marks.find(
      (mark) =>
        mark.examSubjectId === examSubjectId && mark.studentId === studentId,
    ) ?? null
  );
}

export function subjectResultsForStudent(db: Database, student: Student) {
  const classLevel = student.sectionId.split("-")[0];
  const examSubjects = examSubjectsForClass(db, classLevel);
  return examSubjects.map((examSubject) => {
    const subject = subjectById(db, examSubject.subjectId);
    const mark = markForStudent(db, examSubject.id, student.id);
    return {
      examSubject,
      subject,
      mark,
      total: mark?.total ?? 0,
      maxMarks: examSubject.maxMarks,
      pass: (mark?.total ?? 0) >= examSubject.passMarks,
    };
  });
}

export function resultForStudent(db: Database, student: Student) {
  const subjects = subjectResultsForStudent(db, student);
  const total = subjects.reduce((sum, subject) => sum + subject.total, 0);
  const max = subjects.reduce((sum, subject) => sum + subject.maxMarks, 0);
  const subjectsFailed = subjects
    .filter((subject) => !subject.pass)
    .map((subject) => subject.subject?.code ?? "—");
  const percentage = max === 0 ? 0 : (total / max) * 100;

  return {
    subjects,
    total,
    max,
    percentage,
    grade: gradeFor(percentage),
    pass: subjectsFailed.length === 0 && percentage >= 40,
    subjectsFailed,
  };
}

export function gradeFor(percentage: number) {
  if (percentage >= 90) return "A1";
  if (percentage >= 80) return "A2";
  if (percentage >= 70) return "B1";
  if (percentage >= 60) return "B2";
  if (percentage >= 50) return "C1";
  if (percentage >= 40) return "C2";
  if (percentage >= 33) return "D";
  return "E";
}

export function rankForStudent(db: Database, student: Student) {
  const sectionStudents = studentsInSection(db, student.sectionId);
  const scores = sectionStudents
    .map((candidate) => ({
      id: candidate.id,
      total: resultForStudent(db, candidate).total,
    }))
    .sort((a, b) => b.total - a.total);

  let rank = 0;
  let lastTotal: number | null = null;

  for (let index = 0; index < scores.length; index += 1) {
    if (scores[index].total !== lastTotal) {
      rank = index + 1;
      lastTotal = scores[index].total;
    }
    if (scores[index].id === student.id) return { rank, total: scores.length };
  }

  return { rank: 0, total: scores.length };
}

export function feeLedgerForStudent(db: Database, studentId: string) {
  const bills = db.bills.filter((bill) => bill.studentId === studentId);
  const billIds = new Set(bills.map((bill) => bill.id));
  const payments = db.payments.filter((payment) =>
    billIds.has(payment.billId),
  );
  const totalPaise = bills.reduce((sum, bill) => sum + bill.totalPaise, 0);
  const concessionPaise = bills.reduce(
    (sum, bill) => sum + bill.concessionPaise,
    0,
  );
  const paidPaise = payments
    .filter((payment) => payment.status === "posted")
    .reduce((sum, payment) => sum + payment.amountPaise, 0);
  return {
    bills,
    payments,
    totalPaise,
    concessionPaise,
    paidPaise,
    duePaise: totalPaise - concessionPaise - paidPaise,
  };
}

export type RiskFlag = {
  label: string;
  detail: string;
  tone: "danger" | "warning" | "info";
};

export function riskFlagsForStudent(
  db: Database,
  student: Student,
): RiskFlag[] {
  const summary = attendanceSummary(db, student);
  const result = resultForStudent(db, student);
  const ledger = feeLedgerForStudent(db, student.id);
  const flags: RiskFlag[] = [];

  if (summary.percentage < 75) {
    flags.push({
      label: "Attendance below 75%",
      detail: `${summary.percentage.toFixed(1)}% this term`,
      tone: "danger",
    });
  }

  const flatHistory = effectiveHistory(db, student).join("");
  if (flatHistory.includes("AAA")) {
    flags.push({
      label: "Repeated absence",
      detail: "Three or more consecutive school days",
      tone: "warning",
    });
  }

  if (result.subjectsFailed.length >= 2) {
    flags.push({
      label: `${result.subjectsFailed.length} subjects below pass`,
      detail: result.subjectsFailed.join(", "),
      tone: "warning",
    });
  }

  if (ledger.duePaise > 0 && ledger.bills.some((bill) => bill.dueDate < TODAY)) {
    flags.push({
      label: "Fee bill overdue",
      detail: "Payment is past the due date",
      tone: "info",
    });
  }

  return flags;
}

export function examById(db: Database, id: string): Exam | null {
  return db.exams.find((exam) => exam.id === id) ?? null;
}

export function examSubjectById(db: Database, id: string): ExamSubject | null {
  return db.examSubjects.find((subject) => subject.id === id) ?? null;
}

export function marksForExamSubject(db: Database, examSubjectId: string) {
  return db.marks.filter((mark) => mark.examSubjectId === examSubjectId);
}

export function markAsAttendanceStatus(status: string): AttendanceStatus {
  if (status === "present" || status === "absent" || status === "late") {
    return status;
  }
  return "present";
}

export function studentAttendanceGrid(db: Database, student: Student) {
  return effectiveHistory(db, student).map((row) => row.split(""));
}

export function attendanceRecordStatus(
  record: AttendanceRecord | null,
): AttendanceStatus | null {
  return record?.status ?? null;
}

export function billStatusTone(status: Bill["status"]) {
  if (status === "paid") return "success" as const;
  if (status === "partial") return "warning" as const;
  if (status === "waived") return "info" as const;
  return "danger" as const;
}

export function markStatusTone(mark: Mark | null) {
  if (!mark) return "neutral" as const;
  return mark.total >= 33 ? ("success" as const) : ("danger" as const);
}

export function subjectName(subject: Subject | null) {
  return subject?.nameEn ?? "Subject";
}
