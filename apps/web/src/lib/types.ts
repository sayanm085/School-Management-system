export type Role =
  | "headmaster"
  | "teacher"
  | "clerk"
  | "management"
  | "support";

export type StaffStatus = "active" | "inactive";

export type AssignmentType =
  | "class_teacher"
  | "subject_teacher"
  | "exam_coordinator"
  | "accountant"
  | "assistant_headmaster";

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "leave"
  | "holiday";

export type AttendanceRisk = "normal" | "low" | "chronic";

export type Gender = "male" | "female";

export type StudentCategory = "general" | "sc" | "st" | "obc";

export type StudentStatus = "active" | "transferred" | "alumni";

export type AdmissionStatus =
  | "submitted"
  | "verified"
  | "approved"
  | "waitlisted"
  | "rejected"
  | "enrolled";

export type ExamStatus =
  | "draft"
  | "scheduled"
  | "marks_entry"
  | "moderation"
  | "published";

export type MarkStatus = "draft" | "submitted" | "moderated";

export type BillStatus = "unpaid" | "partial" | "paid" | "waived";

export type PaymentMethod = "cash" | "upi" | "cheque";

export type SalaryBillStatus =
  | "draft"
  | "prepared"
  | "verified"
  | "approved"
  | "disbursed";

export type NoticeStatus = "draft" | "published" | "archived";

export type NoticeAudience =
  | "all"
  | "teachers"
  | "management"
  | "class"
  | "staff";

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface School {
  id: string;
  nameBn: string;
  nameEn: string;
  code: string;
  udise: string;
  type: string;
  address: string;
  district: string;
  established: number;
  phone: string;
  email: string;
}

export interface AcademicYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Assignment {
  type: AssignmentType;
  sectionId?: string;
  subjectId?: string;
  examId?: string;
}

export interface Staff {
  id: string;
  employeeId: string;
  nameBn: string;
  nameEn: string;
  role: Role;
  designation: string;
  phone: string;
  email: string;
  avatar: string;
  joinedAt: string;
  payLevel: string;
  status: StaffStatus;
  primarySubjectId?: string;
  assignments: Assignment[];
}

export interface Section {
  id: string;
  classLevel: string;
  section: string;
  room: string;
  capacity: number;
  classTeacherId: string;
}

export interface Subject {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
}

export interface StudentDocument {
  type: string;
  label: string;
  verified: boolean;
}

export interface Student {
  id: string;
  admissionNo: string;
  rollNo: string;
  sectionId: string;
  nameBn: string;
  nameEn: string;
  gender: Gender;
  dob: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  category: StudentCategory;
  status: StudentStatus;
  avatar: string;
  admissionDate: string;
  attendanceSeed: number;
  attendanceRisk: AttendanceRisk;
  documents: StudentDocument[];
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  sectionId: string;
  date: string;
  session: "full_day" | "am" | "pm";
  status: AttendanceStatus;
  markedBy: string;
  markedAt: string;
  source: "web" | "app";
  note?: string;
}

export interface StaffAttendance {
  id: string;
  staffId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "present" | "absent" | "leave" | "holiday";
  note?: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  fromDate: string;
  toDate: string;
  type: "casual" | "medical" | "maternity" | "duty";
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
}

export interface ExamReadiness {
  ready: number;
  total: number;
  pending: string[];
}

export interface Exam {
  id: string;
  name: string;
  term: string;
  startDate: string;
  endDate: string;
  status: ExamStatus;
  readiness?: ExamReadiness;
}

export interface ExamSubject {
  id: string;
  examId: string;
  classLevel: string;
  subjectId: string;
  examDate: string;
  maxMarks: number;
  passMarks: number;
  theoryMax: number;
  internalMax: number;
  practicalMax: number;
}

export interface Mark {
  id: string;
  examSubjectId: string;
  studentId: string;
  theory: number;
  internal: number;
  practical: number;
  total: number;
  status: MarkStatus;
  enteredBy: string;
  updatedAt: string;
}

export interface Result {
  examId: string;
  studentId: string;
  total: number;
  percentage: number;
  grade: string;
  rank: number;
  pass: boolean;
  subjectsFailed: string[];
}

export interface FeeHead {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  frequency: "annual" | "term" | "monthly";
}

export interface FeeStructure {
  id: string;
  academicYearId: string;
  classLevel: string;
  feeHeadId: string;
  amountPaise: number;
  dueDate: string;
}

export interface BillItem {
  id: string;
  feeHeadId: string;
  nameBn: string;
  nameEn: string;
  amountPaise: number;
}

export interface Bill {
  id: string;
  billNo: string;
  studentId: string;
  academicYearId: string;
  period: string;
  totalPaise: number;
  concessionPaise: number;
  duePaise: number;
  status: BillStatus;
  dueDate: string;
  items: BillItem[];
}

export interface Payment {
  id: string;
  receiptNo: string;
  billId: string;
  studentId: string;
  amountPaise: number;
  method: PaymentMethod;
  reference: string;
  paidAt: string;
  collectedBy: string;
  status: "posted" | "void";
}

export interface Concession {
  id: string;
  studentId: string;
  feeHeadId: string;
  type: "amount" | "percent";
  value: number;
  reason: string;
  approvedBy: string;
  validFrom: string;
  validTo: string;
}

export interface SalaryStructure {
  id: string;
  staffId: string;
  basicPayPaise: number;
  payLevel: string;
  daPercent: number;
  hraPercent: number;
  medicalPaise: number;
  otherAllowancePaise: number;
  standardDeductionPaise: number;
}

export interface SalaryBill {
  id: string;
  month: number;
  year: number;
  status: SalaryBillStatus;
  totalEarningsPaise: number;
  totalDeductionsPaise: number;
  netPayPaise: number;
  preparedBy: string;
  verifiedBy?: string;
  approvedBy?: string;
  disbursedAt?: string;
}

export interface SalaryLine {
  id: string;
  salaryBillId: string;
  staffId: string;
  payableDays: number;
  leaveDays: number;
  earningsPaise: number;
  deductionsPaise: number;
  netPayPaise: number;
}

export interface Notice {
  id: string;
  title: string;
  bodyEn: string;
  bodyBn: string;
  audience: NoticeAudience;
  publishedBy: string;
  publishedAt: string;
  status: NoticeStatus;
}

export interface AdmissionApplication {
  id: string;
  applicationNo: string;
  nameBn: string;
  nameEn: string;
  classApplied: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  status: AdmissionStatus;
  documents: StudentDocument[];
  decision?: string;
  notes?: string;
  createdAt: string;
  gender?: Gender;
  dob?: string;
  studentId?: string;
}

export interface TimetableEntry {
  id: string;
  day: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
  period: number;
  start: string;
  end: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  room: string;
}

export interface Substitution {
  id: string;
  date: string;
  day: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
  period: number;
  sectionId: string;
  subjectId: string;
  absentTeacherId: string;
  substituteTeacherId: string;
  status: "assigned" | "covered";
  assignedBy: string;
  reason: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
}

export interface Database {
  school: School;
  academicYear: AcademicYear;
  sections: Section[];
  subjects: Subject[];
  staff: Staff[];
  students: Student[];
  admissions: AdmissionApplication[];
  attendance: AttendanceRecord[];
  staffAttendance: StaffAttendance[];
  leaveRequests: LeaveRequest[];
  exams: Exam[];
  examSubjects: ExamSubject[];
  marks: Mark[];
  feeHeads: FeeHead[];
  feeStructures: FeeStructure[];
  bills: Bill[];
  payments: Payment[];
  concessions: Concession[];
  salaryStructures: SalaryStructure[];
  salaryBills: SalaryBill[];
  salaryLines: SalaryLine[];
  notices: Notice[];
  timetable: TimetableEntry[];
  substitutions: Substitution[];
  audit: AuditEvent[];
}
