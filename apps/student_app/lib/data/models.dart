class DemoSchool {
  final String nameEn;
  final String nameBn;
  final String code;
  final String? udise;
  const DemoSchool({
    required this.nameEn,
    required this.nameBn,
    required this.code,
    this.udise,
  });
}

class DemoStudent {
  final String id;
  final String studentId;
  final String admissionNo;
  final String nameEn;
  final String nameBn;
  final String classLevel;
  final String section;
  final String? room;
  final String rollNo;
  final String guardianName;
  final String guardianPhoneMasked;
  const DemoStudent({
    required this.id,
    required this.studentId,
    required this.admissionNo,
    required this.nameEn,
    required this.nameBn,
    required this.classLevel,
    required this.section,
    this.room,
    required this.rollNo,
    required this.guardianName,
    required this.guardianPhoneMasked,
  });

  String get classLabel => 'Class $classLevel · $section';
}

class AttendanceDay {
  final String date;
  final String status; // present | absent | late
  const AttendanceDay({required this.date, required this.status});
}

class Exam {
  final String id;
  final String name;
  final String term;
  final String startDate;
  final String endDate;
  final String status;
  const Exam({
    required this.id,
    required this.name,
    required this.term,
    required this.startDate,
    required this.endDate,
    required this.status,
  });
}

class ExamMark {
  final String examId;
  final String subjectId;
  final String subjectEn;
  final String subjectBn;
  final int total;
  final int maxMarks;
  final String examDate;
  const ExamMark({
    required this.examId,
    required this.subjectId,
    required this.subjectEn,
    required this.subjectBn,
    required this.total,
    required this.maxMarks,
    required this.examDate,
  });
  int get pct => (100 * total / maxMarks).round();
}

class MockTest {
  final String id;
  final String subjectEn;
  final String topicEn;
  final String topicBn;
  final int scorePct;
  final String date;
  const MockTest({
    required this.id,
    required this.subjectEn,
    required this.topicEn,
    required this.topicBn,
    required this.scorePct,
    required this.date,
  });
}

class TrendPoint {
  final String label;
  final int pct;
  const TrendPoint({required this.label, required this.pct});
}

class BillItem {
  final String nameEn;
  final String nameBn;
  final int amountPaise;
  const BillItem({
    required this.nameEn,
    required this.nameBn,
    required this.amountPaise,
  });
}

class Bill {
  final String id;
  final String billNo;
  final String period;
  final int totalPaise;
  final int duePaise;
  final String status; // paid | unpaid
  final String dueDate;
  final List<BillItem> items;
  const Bill({
    required this.id,
    required this.billNo,
    required this.period,
    required this.totalPaise,
    required this.duePaise,
    required this.status,
    required this.dueDate,
    required this.items,
  });
  bool get isPaid => status == 'paid' || duePaise == 0;
}

class Payment {
  final String receiptNo;
  final int amountPaise;
  final String method;
  final String paidAt;
  const Payment({
    required this.receiptNo,
    required this.amountPaise,
    required this.method,
    required this.paidAt,
  });
}

class Period {
  final String day;
  final int period;
  final String start;
  final String end;
  final String subjectId;
  final String subjectEn;
  final String subjectBn;
  final String room;
  const Period({
    required this.day,
    required this.period,
    required this.start,
    required this.end,
    required this.subjectId,
    required this.subjectEn,
    required this.subjectBn,
    required this.room,
  });
}

class Notice {
  final String id;
  final String title;
  final String bodyEn;
  final String bodyBn;
  final String publishedAt;
  const Notice({
    required this.id,
    required this.title,
    required this.bodyEn,
    required this.bodyBn,
    required this.publishedAt,
  });
}

class HomeworkItem {
  final String id;
  final String subjectId;
  final String titleEn;
  final String titleBn;
  final String assigned;
  final String due;
  bool done;
  HomeworkItem({
    required this.id,
    required this.subjectId,
    required this.titleEn,
    required this.titleBn,
    required this.assigned,
    required this.due,
    required this.done,
  });
}

class CoveragePeriod {
  final int period;
  final String subjectId;
  final String room;
  final String coveredEn;
  final String coveredBn;
  const CoveragePeriod({
    required this.period,
    required this.subjectId,
    required this.room,
    required this.coveredEn,
    required this.coveredBn,
  });
}

class ChapterProgress {
  final String nameEn;
  final String nameBn;
  final int pct;
  const ChapterProgress({
    required this.nameEn,
    required this.nameBn,
    required this.pct,
  });
}

class SubjectProgress {
  final String subjectId;
  final List<ChapterProgress> chapters;
  const SubjectProgress({required this.subjectId, required this.chapters});
}

class SyllabusItem {
  final String titleEn;
  final String titleBn;
  final bool done;
  const SyllabusItem({
    required this.titleEn,
    required this.titleBn,
    required this.done,
  });
}

class DemoData {
  final DemoSchool school;
  final DemoStudent student;
  final int attendancePct;
  final List<AttendanceDay> attendanceDays;
  final List<Exam> exams;
  final List<MockTest> mocks;
  final List<ExamMark> marks;
  final List<TrendPoint> scoreTrend;
  final List<Bill> bills;
  final List<Payment> payments;
  final List<Period> timetable;
  final List<Notice> notices;
  final List<HomeworkItem> homework;
  final String coverageDate;
  final List<CoveragePeriod> coverageToday;
  final List<SubjectProgress> chapterProgress;
  final List<SyllabusItem> examSyllabus;

  DemoData({
    required this.school,
    required this.student,
    required this.attendancePct,
    required this.attendanceDays,
    required this.exams,
    required this.mocks,
    required this.marks,
    required this.scoreTrend,
    required this.bills,
    required this.payments,
    required this.timetable,
    required this.notices,
    required this.homework,
    required this.coverageDate,
    required this.coverageToday,
    required this.chapterProgress,
    required this.examSyllabus,
  });

  Bill? get currentBill {
    for (final b in bills) {
      if (!b.isPaid) return b;
    }
    return bills.isEmpty ? null : bills.last;
  }

  Exam? get nextExam {
    final upcoming = exams
        .where((e) => e.status != 'published' || true)
        .toList()
      ..sort((a, b) => a.startDate.compareTo(b.startDate));
    for (final e in upcoming) {
      if (e.startDate.compareTo('2026-11-03') >= 0) return e;
    }
    return exams.isEmpty ? null : exams.first;
  }

  List<Period> periodsFor(String day) {
    final rows = timetable.where((p) => p.day == day).toList()
      ..sort((a, b) => a.period.compareTo(b.period));
    return rows;
  }
}
