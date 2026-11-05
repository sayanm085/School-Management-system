import 'package:flutter/material.dart';

/// In-app language switch. The whole shell rebuilds on change; strings come
/// from [stringsFor]. Defaults to Bengali-first as the school's day language.
enum AppLang { bn, en }

final ValueNotifier<AppLang> languageNotifier =
    ValueNotifier<AppLang>(AppLang.bn);

AppLang get currentLang => languageNotifier.value;

class T {
  final String home;
  final String homework;
  final String tutor;
  final String marks;
  final String profile;
  final String today;
  final String attendance;
  final String thisTerm;
  final String fees;
  final String nextExam;
  final String paid;
  final String due;
  final String by;
  final String todaysClasses;
  final String seeAll;
  final String noClasses;
  final String logIn;
  final String studentId;
  final String password;
  final String useSchoolId;
  final String wrongCreds;
  final String demoTry;
  final String appSubtitle;
  final String Function(int) daysMissed;
  final String perfect;
  final String Function(int) daysToExam;
  final String examNow;
  final String dueToday;
  final String tomorrow;
  final String done;
  final String thisWeek;
  final String allClear;
  final String nothingDone;
  final String coveredToday;
  final String askTheTutor;
  final String performance;
  final String scoreTrend;
  final String subjects;
  final String mockTests;
  final String practiceSuggested;
  final String goodGoing;
  final String halfYearly;
  final String annual;
  final String syllabus;
  final String chapterProgress;
  final String examSyllabus;
  final String live;
  final String askShikha;
  final String hello;
  final String logOut;
  final String notices;
  final String language;
  final String demoMode;
  final String guardian;
  final String guardianPhone;
  final String admissionNo;
  final String noBills;
  final String aiTutor;
  final String grounded;
  final String askAnything;
  final String explainSimpler;
  final String givePractice;
  final String inBengali;
  final String tutorHello;
  final String tutorIntro;
  final String Function(int, int) topicsDone;
  final String notStarted;

  const T({
    required this.home,
    required this.homework,
    required this.tutor,
    required this.marks,
    required this.profile,
    required this.today,
    required this.attendance,
    required this.thisTerm,
    required this.fees,
    required this.nextExam,
    required this.paid,
    required this.due,
    required this.by,
    required this.todaysClasses,
    required this.seeAll,
    required this.noClasses,
    required this.logIn,
    required this.studentId,
    required this.password,
    required this.useSchoolId,
    required this.wrongCreds,
    required this.demoTry,
    required this.appSubtitle,
    required this.daysMissed,
    required this.perfect,
    required this.daysToExam,
    required this.examNow,
    required this.dueToday,
    required this.tomorrow,
    required this.done,
    required this.thisWeek,
    required this.allClear,
    required this.nothingDone,
    required this.coveredToday,
    required this.askTheTutor,
    required this.performance,
    required this.scoreTrend,
    required this.subjects,
    required this.mockTests,
    required this.practiceSuggested,
    required this.goodGoing,
    required this.halfYearly,
    required this.annual,
    required this.syllabus,
    required this.chapterProgress,
    required this.examSyllabus,
    required this.live,
    required this.askShikha,
    required this.hello,
    required this.logOut,
    required this.notices,
    required this.language,
    required this.demoMode,
    required this.guardian,
    required this.guardianPhone,
    required this.admissionNo,
    required this.noBills,
    required this.aiTutor,
    required this.grounded,
    required this.askAnything,
    required this.explainSimpler,
    required this.givePractice,
    required this.inBengali,
    required this.tutorHello,
    required this.tutorIntro,
    required this.topicsDone,
    required this.notStarted,
  });

  // Closures cannot live in const objects; these are canonical singletons.
  static final T en = T(
    home: 'Home',
    homework: 'Homework',
    tutor: 'Tutor',
    marks: 'Marks',
    profile: 'Profile',
    today: 'Today',
    attendance: 'Attendance',
    thisTerm: 'This term',
    fees: 'Fees',
    nextExam: 'Next exam',
    paid: 'Paid ✓',
    due: 'Due',
    by: 'by',
    todaysClasses: "Today's classes",
    seeAll: 'See all',
    noClasses: 'No classes today',
    logIn: 'Log in',
    studentId: 'Student ID',
    password: 'Password',
    useSchoolId: 'Use the ID given by your school',
    wrongCreds: 'Wrong Student ID or password',
    demoTry: 'Try the demo account',
    appSubtitle: 'Student App',
    daysMissed: (n) => '$n days missed',
    perfect: 'Perfect',
    daysToExam: (n) => '$n days',
    examNow: 'Now',
    dueToday: 'Due today',
    tomorrow: 'Tomorrow',
    done: 'Done',
    thisWeek: 'This week',
    allClear: 'All clear',
    nothingDone: 'Nothing done yet',
    coveredToday: 'Covered today',
    askTheTutor: 'Ask the Tutor',
    performance: 'Performance',
    scoreTrend: 'Score trend',
    subjects: 'Subjects',
    mockTests: 'Mock tests',
    practiceSuggested: 'Practice suggested',
    goodGoing: 'Good going',
    halfYearly: 'Half-Yearly',
    annual: 'Annual',
    syllabus: 'Syllabus',
    chapterProgress: 'Chapter progress',
    examSyllabus: 'Exam syllabus',
    live: 'Live',
    askShikha: "Didn't understand today's lesson? Ask Shikha",
    hello: 'Hello',
    logOut: 'Log out',
    notices: 'Notices',
    language: 'Language',
    demoMode: 'Demo mode',
    guardian: 'Guardian',
    guardianPhone: 'Guardian phone',
    admissionNo: 'Admission no.',
    noBills: 'No bills this session',
    aiTutor: 'AI Tutor',
    grounded: 'Grounded in your textbook',
    askAnything: 'Ask anything…',
    explainSimpler: 'Explain simpler',
    givePractice: 'Give me practice',
    inBengali: 'In Bengali',
    tutorHello: 'Hi! I am Shikha',
    tutorIntro:
        'Ask me anything you did not understand — I explain from your textbook, in Bengali or English.',
    topicsDone: (done, total) => '$done of $total topics done',
    notStarted: 'School day not started yet',
  );

  static final T bn = T(
    home: 'হোম',
    homework: 'হোমওয়ার্ক',
    tutor: 'টিউটর',
    marks: 'মার্কস',
    profile: 'প্রোফাইল',
    today: 'আজ',
    attendance: 'উপস্থিতি',
    thisTerm: 'এই শিক্ষাবর্ষ',
    fees: 'ফি',
    nextExam: 'পরীক্ষা',
    paid: 'পরিশোধিত ✓',
    due: 'বকেয়া',
    by: 'এর মধ্যে',
    todaysClasses: 'আজকের ক্লাস',
    seeAll: 'সব দেখো',
    noClasses: 'আজ ক্লাস নেই',
    logIn: 'লগ ইন',
    studentId: 'শিক্ষার্থী আইডি',
    password: 'পাসওয়ার্ড',
    useSchoolId: 'স্কুল দেওয়া আইডি ব্যবহার করুন',
    wrongCreds: 'ভুল আইডি বা পাসওয়ার্ড',
    demoTry: 'ডেমো অ্যাকাউন্ট দিয়ে ঢুকুন',
    appSubtitle: 'শিক্ষার্থী অ্যাপ',
    daysMissed: (n) => '$n দিন অনুপস্থিত',
    perfect: 'চমৎকার',
    daysToExam: (n) => '$n দিন',
    examNow: 'চলছে',
    dueToday: 'আজ জমা দেওয়ার',
    tomorrow: 'কাল',
    done: 'সম্পন্ন',
    thisWeek: 'এই সপ্তাহ',
    allClear: 'সব ঠিক আছে',
    nothingDone: 'এখনো হয়নি',
    coveredToday: 'আজ কভার হয়েছে',
    askTheTutor: 'টিউটরকে জিজ্ঞাসা করো',
    performance: 'পারফরম্যান্স',
    scoreTrend: 'স্কোরের ধারা',
    subjects: 'বিষয়',
    mockTests: 'মক টেস্ট',
    practiceSuggested: 'অভ্যাস দরকার',
    goodGoing: 'ভালো চলছে',
    halfYearly: 'অর্ধবার্ষিক',
    annual: 'বার্ষিক',
    syllabus: 'সিলেবাস',
    chapterProgress: 'অধ্যায় অগ্রগতি',
    examSyllabus: 'পরীক্ষার সিলেবাস',
    live: 'চলছে',
    askShikha: 'আজকের পাঠ বুঝি নি? শিখাকে জিজ্ঞাসা করো',
    hello: 'হ্যালো',
    logOut: 'লগ আউট',
    notices: 'নোটিশ',
    language: 'ভাষা',
    demoMode: 'ডেমো মোড',
    guardian: 'অভিভাবক',
    guardianPhone: 'অভিভাবকের ফোন',
    admissionNo: 'ভর্তি নং',
    noBills: 'এই বছর বিল নেই',
    aiTutor: 'এআই শিক্ষক',
    grounded: 'তোমার বইয়ের উপর ভিত্তি করে',
    askAnything: 'যা খুশি জিজ্ঞাসা করো…',
    explainSimpler: 'আরও সহজ করে বলো',
    givePractice: 'অভ্যাস দাও',
    inBengali: 'বাংলায়',
    tutorHello: 'হ্যালো! আমি শিখা',
    tutorIntro:
        'যা বুঝি না জিজ্ঞাসা করো — বইয়ের পাতা ধরে বাংলায় বা ইংরেজিতে বুঝিয়ে দিচ্ছি।',
    topicsDone: (done, total) => '$total টির মধ্যে $done টি সম্পন্ন',
    notStarted: 'স্কুল এখনো শুরু হয়নি',
  );

  static T of(AppLang lang) => lang == AppLang.en ? en : bn;
}

/// Subject colour system: Apple's extended system palette on tints. One colour
/// means one subject — used for icon tiles, chips and chart bars.
class SubjectColors {
  final Color tint;
  final Color strong;
  const SubjectColors(this.tint, this.strong);
}
