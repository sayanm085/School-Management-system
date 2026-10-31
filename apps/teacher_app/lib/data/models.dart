class SeedData {
  const SeedData({
    required this.school,
    required this.teacher,
    required this.section,
    required this.students,
    required this.subjects,
    required this.notices,
    required this.academicYear,
    required this.periods,
    required this.todayTimetable,
    required this.freePeriods,
    required this.coverBoard,
    required this.currentPeriod,
    required this.now,
  });

  final SchoolInfo school;
  final Teacher teacher;
  final SectionInfo section;
  final List<Student> students;
  final List<SubjectInfo> subjects;
  final List<NoticeItem> notices;
  final String academicYear;
  final List<PeriodInfo> periods;
  final List<TimetableEntry> todayTimetable;
  final List<int> freePeriods;
  final List<CoverBoardEntry> coverBoard;
  final int currentPeriod;
  final String now;

  static DateTime get today => DateTime(2026, 10, 31);

  SubjectInfo? subjectById(String id) {
    for (final subject in subjects) {
      if (subject.id == id) return subject;
    }
    return null;
  }

  factory SeedData.fromJson(Map<String, dynamic> json) {
    final schoolJson = json['school'] as Map<String, dynamic>;
    final yearJson = json['academicYear'] as Map<String, dynamic>;
    return SeedData(
      school: SchoolInfo.fromJson(schoolJson),
      teacher: Teacher.fromJson(json['teacher'] as Map<String, dynamic>),
      section: SectionInfo.fromJson(json['section'] as Map<String, dynamic>),
      students: (json['students'] as List<dynamic>)
          .map((item) => Student.fromJson(item as Map<String, dynamic>))
          .toList(growable: false),
      subjects: (json['subjects'] as List<dynamic>)
          .map((item) => SubjectInfo.fromJson(item as Map<String, dynamic>))
          .toList(growable: false),
      notices: (json['notices'] as List<dynamic>)
          .map((item) => NoticeItem.fromJson(item as Map<String, dynamic>))
          .toList(growable: false),
      academicYear: yearJson['label'] as String,
      periods: (json['periods'] as List<dynamic>? ?? const <dynamic>[])
          .map((item) => PeriodInfo.fromJson(item as Map<String, dynamic>))
          .toList(growable: false),
      todayTimetable:
          (json['todayTimetable'] as List<dynamic>? ?? const <dynamic>[])
              .map(
                (item) => TimetableEntry.fromJson(item as Map<String, dynamic>),
              )
              .toList(growable: false),
      freePeriods: (json['freePeriods'] as List<dynamic>? ?? const <dynamic>[])
          .map((item) => item as int)
          .toList(growable: false),
      coverBoard: (json['coverBoard'] as List<dynamic>? ?? const <dynamic>[])
          .map((item) => CoverBoardEntry.fromJson(item as Map<String, dynamic>))
          .toList(growable: false),
      currentPeriod: json['currentPeriod'] as int? ?? 4,
      now: json['now'] as String? ?? '10:26',
    );
  }
}

class PeriodInfo {
  const PeriodInfo({
    required this.period,
    required this.start,
    required this.end,
  });

  final int period;
  final String start;
  final String end;

  factory PeriodInfo.fromJson(Map<String, dynamic> json) => PeriodInfo(
    period: json['period'] as int,
    start: json['start'] as String,
    end: json['end'] as String,
  );
}

class TimetableEntry {
  const TimetableEntry({
    required this.id,
    required this.period,
    required this.start,
    required this.end,
    required this.sectionId,
    required this.subjectId,
    required this.teacherId,
    required this.room,
  });

  final String id;
  final int period;
  final String start;
  final String end;
  final String sectionId;
  final String subjectId;
  final String teacherId;
  final String room;

  factory TimetableEntry.fromJson(Map<String, dynamic> json) => TimetableEntry(
    id: json['id'] as String,
    period: json['period'] as int,
    start: json['start'] as String,
    end: json['end'] as String,
    sectionId: json['sectionId'] as String,
    subjectId: json['subjectId'] as String,
    teacherId: json['teacherId'] as String,
    room: json['room'] as String,
  );
}

class CoverBoardEntry {
  const CoverBoardEntry({
    required this.entryId,
    required this.period,
    required this.start,
    required this.end,
    required this.sectionId,
    required this.subjectId,
    required this.subjectNameEn,
    required this.subjectNameBn,
    required this.room,
    required this.absentTeacherId,
    required this.absentTeacherNameEn,
    required this.absentTeacherNameBn,
    required this.absentTeacherAvatar,
    required this.substituteTeacherId,
    required this.substituteTeacherNameEn,
    required this.substituteTeacherNameBn,
    required this.status,
    required this.availableToAnanya,
  });

  final String entryId;
  final int period;
  final String start;
  final String end;
  final String sectionId;
  final String subjectId;
  final String subjectNameEn;
  final String subjectNameBn;
  final String room;
  final String absentTeacherId;
  final String absentTeacherNameEn;
  final String absentTeacherNameBn;
  final String absentTeacherAvatar;
  final String? substituteTeacherId;
  final String? substituteTeacherNameEn;
  final String? substituteTeacherNameBn;
  final String status;
  final bool availableToAnanya;

  String get sectionLabel => sectionId.replaceFirst('-', ' ');
  bool get isUncovered => status == 'uncovered';

  factory CoverBoardEntry.fromJson(Map<String, dynamic> json) =>
      CoverBoardEntry(
        entryId: json['entryId'] as String,
        period: json['period'] as int,
        start: json['start'] as String,
        end: json['end'] as String,
        sectionId: json['sectionId'] as String,
        subjectId: json['subjectId'] as String,
        subjectNameEn: json['subjectNameEn'] as String? ?? '',
        subjectNameBn: json['subjectNameBn'] as String? ?? '',
        room: json['room'] as String? ?? '',
        absentTeacherId: json['absentTeacherId'] as String? ?? '',
        absentTeacherNameEn: json['absentTeacherNameEn'] as String? ?? '',
        absentTeacherNameBn: json['absentTeacherNameBn'] as String? ?? '',
        absentTeacherAvatar: json['absentTeacherAvatar'] as String? ?? '',
        substituteTeacherId: json['substituteTeacherId'] as String?,
        substituteTeacherNameEn: json['substituteTeacherNameEn'] as String?,
        substituteTeacherNameBn: json['substituteTeacherNameBn'] as String?,
        status: json['status'] as String? ?? 'uncovered',
        availableToAnanya: json['availableToAnanya'] as bool? ?? false,
      );
}

class SchoolInfo {
  const SchoolInfo({
    required this.nameBn,
    required this.nameEn,
    required this.code,
    required this.district,
    required this.established,
  });

  final String nameBn;
  final String nameEn;
  final String code;
  final String district;
  final int established;

  factory SchoolInfo.fromJson(Map<String, dynamic> json) => SchoolInfo(
    nameBn: json['nameBn'] as String,
    nameEn: json['nameEn'] as String,
    code: json['code'] as String,
    district: json['district'] as String,
    established: json['established'] as int,
  );
}

class Teacher {
  const Teacher({
    required this.id,
    required this.employeeId,
    required this.nameBn,
    required this.nameEn,
    required this.designation,
    required this.avatar,
  });

  final String id;
  final String employeeId;
  final String nameBn;
  final String nameEn;
  final String designation;
  final String avatar;

  String get avatarAsset => avatar.replaceFirst('/avatars/', 'assets/avatars/');

  factory Teacher.fromJson(Map<String, dynamic> json) => Teacher(
    id: json['id'] as String,
    employeeId: json['employeeId'] as String,
    nameBn: json['nameBn'] as String,
    nameEn: json['nameEn'] as String,
    designation: json['designation'] as String,
    avatar: json['avatar'] as String,
  );
}

class SectionInfo {
  const SectionInfo({
    required this.id,
    required this.classLevel,
    required this.section,
    required this.classTeacherId,
  });

  final String id;
  final String classLevel;
  final String section;
  final String classTeacherId;

  String get label => '$classLevel $section';

  factory SectionInfo.fromJson(Map<String, dynamic> json) => SectionInfo(
    id: json['id'] as String,
    classLevel: json['classLevel'] as String,
    section: json['section'] as String,
    classTeacherId: json['classTeacherId'] as String,
  );
}

class Student {
  const Student({
    required this.id,
    required this.admissionNo,
    required this.rollNo,
    required this.nameBn,
    required this.nameEn,
    required this.avatar,
    required this.sectionId,
    required this.guardianName,
    required this.guardianPhone,
    required this.attendanceHistory,
  });

  final String id;
  final String admissionNo;
  final String rollNo;
  final String nameBn;
  final String nameEn;
  final String avatar;
  final String sectionId;
  final String guardianName;
  final String guardianPhone;
  final List<String> attendanceHistory;

  String get avatarAsset => avatar.replaceFirst('/avatars/', 'assets/avatars/');

  String get lastWeek =>
      attendanceHistory.isNotEmpty ? attendanceHistory.last : '------';

  factory Student.fromJson(Map<String, dynamic> json) => Student(
    id: json['id'] as String,
    admissionNo: json['admissionNo'] as String,
    rollNo: json['rollNo'] as String,
    nameBn: json['nameBn'] as String,
    nameEn: json['nameEn'] as String,
    avatar: json['avatar'] as String,
    sectionId: json['sectionId'] as String,
    guardianName: json['guardianName'] as String,
    guardianPhone: json['guardianPhone'] as String,
    attendanceHistory:
        (json['attendanceHistory'] as List<dynamic>? ?? const <dynamic>[])
            .map((item) => item as String)
            .toList(growable: false),
  );
}

class SubjectInfo {
  const SubjectInfo({
    required this.id,
    required this.nameBn,
    required this.nameEn,
  });

  final String id;
  final String nameBn;
  final String nameEn;

  factory SubjectInfo.fromJson(Map<String, dynamic> json) => SubjectInfo(
    id: json['id'] as String,
    nameBn: json['nameBn'] as String,
    nameEn: json['nameEn'] as String,
  );
}

class NoticeItem {
  const NoticeItem({
    required this.id,
    required this.title,
    required this.bodyEn,
    required this.bodyBn,
    required this.publishedAt,
  });

  final String id;
  final String title;
  final String bodyEn;
  final String bodyBn;
  final DateTime publishedAt;

  factory NoticeItem.fromJson(Map<String, dynamic> json) => NoticeItem(
    id: json['id'] as String,
    title: json['title'] as String,
    bodyEn: json['bodyEn'] as String,
    bodyBn: json['bodyBn'] as String,
    publishedAt: DateTime.parse(json['publishedAt'] as String),
  );
}

enum AttendanceStatus { present, absent, late, leave }

extension AttendanceStatusCopy on AttendanceStatus {
  String get labelBn {
    switch (this) {
      case AttendanceStatus.present:
        return 'উপস্থিত';
      case AttendanceStatus.absent:
        return 'অনুপস্থিত';
      case AttendanceStatus.late:
        return 'দেরি';
      case AttendanceStatus.leave:
        return 'ছুটি';
    }
  }

  String get labelEn {
    switch (this) {
      case AttendanceStatus.present:
        return 'Present';
      case AttendanceStatus.absent:
        return 'Absent';
      case AttendanceStatus.late:
        return 'Late';
      case AttendanceStatus.leave:
        return 'Leave';
    }
  }
}
