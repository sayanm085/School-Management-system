import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import 'models.dart';

/// Demo-mode store. Mirrors the `DATA_SOURCE=demo` convention used by the web
/// console and the teacher app: a per-student JSON slice and a fixed demo
/// credential. Replaced by the live API without changing screens.
///
/// One shared instance: screens read `DemoStore.instance`, so the loaded data
/// is visible everywhere after `load()` rather than per-object.
class DemoStore {
  DemoStore._();

  static final DemoStore instance = DemoStore._();

  DemoData? _data;

  static const demoStudentId = 'STU-2026-0277';
  static const demoPassword = 'demo1234';

  bool get isLoaded => _data != null;

  DemoData get data {
    final loaded = _data;
    if (loaded == null) {
      throw StateError('DemoStore.load() must complete before reading data');
    }
    return loaded;
  }

  Future<void> load() async {
    if (_data != null) return;
    final raw = await rootBundle.loadString('assets/seed/student.json');
    final j = jsonDecode(raw) as Map<String, dynamic>;
    _data = _parse(j);
  }

  bool login(String studentId, String password) =>
      studentId.trim().toUpperCase() == demoStudentId &&
      password == demoPassword;
}

DemoData _parse(Map<String, dynamic> j) {
  final school = j['school'] as Map<String, dynamic>;
  final student = j['student'] as Map<String, dynamic>;
  final attendance = j['attendance'] as Map<String, dynamic>;

  List<Map<String, dynamic>> listOf(String key) =>
      (j[key] as List).cast<Map<String, dynamic>>();

  return DemoData(
    school: DemoSchool(
      nameEn: school['nameEn'] as String,
      nameBn: school['nameBn'] as String,
      code: school['code'] as String,
      udise: school['udise'] as String?,
    ),
    student: DemoStudent(
      id: student['id'] as String,
      studentId: student['studentId'] as String,
      admissionNo: student['admissionNo'] as String,
      nameEn: student['nameEn'] as String,
      nameBn: student['nameBn'] as String,
      classLevel: student['classLevel'] as String,
      section: student['section'] as String,
      room: student['room'] as String?,
      rollNo: student['rollNo'] as String,
      guardianName: student['guardianName'] as String,
      guardianPhoneMasked: student['guardianPhoneMasked'] as String,
    ),
    attendancePct: attendance['summaryPct'] as int,
    attendanceDays: (attendance['days'] as List)
        .map((d) => AttendanceDay(
              date: d['date'] as String,
              status: d['status'] as String,
            ))
        .toList(),
    exams: listOf('exams')
        .map((e) => Exam(
              id: e['id'] as String,
              name: e['name'] as String,
              term: e['term'] as String,
              startDate: e['startDate'] as String,
              endDate: e['endDate'] as String,
              status: e['status'] as String,
            ))
        .toList(),
    mocks: listOf('mocks')
        .map((m) => MockTest(
              id: m['id'] as String,
              subjectEn: m['subjectEn'] as String,
              topicEn: m['topicEn'] as String,
              topicBn: m['topicBn'] as String,
              scorePct: m['scorePct'] as int,
              date: m['date'] as String,
            ))
        .toList(),
    marks: listOf('marks')
        .map((m) => ExamMark(
              examId: m['examId'] as String,
              subjectId: m['subjectId'] as String,
              subjectEn: m['subjectEn'] as String,
              subjectBn: m['subjectBn'] as String,
              total: m['total'] as int,
              maxMarks: m['maxMarks'] as int,
              examDate: m['examDate'] as String,
            ))
        .toList(),
    scoreTrend: listOf('scoreTrend')
        .map((t) => TrendPoint(label: t['label'] as String, pct: t['pct'] as int))
        .toList(),
    bills: listOf('bills')
        .map((b) => Bill(
              id: b['id'] as String,
              billNo: b['billNo'] as String,
              period: b['period'] as String,
              totalPaise: b['totalPaise'] as int,
              duePaise: b['duePaise'] as int,
              status: b['status'] as String,
              dueDate: b['dueDate'] as String,
              items: (b['items'] as List)
                  .cast<Map<String, dynamic>>()
                  .map((i) => BillItem(
                        nameEn: i['nameEn'] as String,
                        nameBn: i['nameBn'] as String,
                        amountPaise: i['amountPaise'] as int,
                      ))
                  .toList(),
            ))
        .toList(),
    payments: listOf('payments')
        .map((p) => Payment(
              receiptNo: p['receiptNo'] as String,
              amountPaise: p['amountPaise'] as int,
              method: p['method'] as String,
              paidAt: p['paidAt'] as String,
            ))
        .toList(),
    timetable: listOf('timetable')
        .map((t) => Period(
              day: t['day'] as String,
              period: t['period'] as int,
              start: t['start'] as String,
              end: t['end'] as String,
              subjectId: t['subjectId'] as String,
              subjectEn: t['subjectEn'] as String,
              subjectBn: t['subjectBn'] as String,
              room: t['room'] as String,
            ))
        .toList(),
    notices: listOf('notices')
        .map((n) => Notice(
              id: n['id'] as String,
              title: n['title'] as String,
              bodyEn: n['bodyEn'] as String,
              bodyBn: n['bodyBn'] as String,
              publishedAt: n['publishedAt'] as String,
            ))
        .toList(),
    homework: listOf('homework')
        .map((h) => HomeworkItem(
              id: h['id'] as String,
              subjectId: h['subjectId'] as String,
              titleEn: h['titleEn'] as String,
              titleBn: h['titleBn'] as String,
              assigned: h['assigned'] as String,
              due: h['due'] as String,
              done: h['done'] as bool,
            ))
        .toList(),
    coverageDate: (j['coverageToday'] as Map<String, dynamic>)['date'] as String,
    coverageToday: ((j['coverageToday']
                as Map<String, dynamic>)['periods'] as List)
            .cast<Map<String, dynamic>>()
            .map((c) => CoveragePeriod(
                  period: c['period'] as int,
                  subjectId: c['subjectId'] as String,
                  room: c['room'] as String,
                  coveredEn: c['coveredEn'] as String,
                  coveredBn: c['coveredBn'] as String,
                ))
            .toList(),
    chapterProgress: listOf('chapterProgress')
        .map((p) => SubjectProgress(
              subjectId: p['subjectId'] as String,
              chapters: (p['chapters'] as List)
                  .cast<Map<String, dynamic>>()
                  .map((c) => ChapterProgress(
                        nameEn: c['nameEn'] as String,
                        nameBn: c['nameBn'] as String,
                        pct: c['pct'] as int,
                      ))
                  .toList(),
            ))
        .toList(),
    examSyllabus: ((j['examSyllabus'] as Map<String, dynamic>)['items'] as List)
        .cast<Map<String, dynamic>>()
        .map((i) => SyllabusItem(
              titleEn: i['titleEn'] as String,
              titleBn: i['titleBn'] as String,
              done: i['done'] as bool,
            ))
        .toList(),
  );
}
