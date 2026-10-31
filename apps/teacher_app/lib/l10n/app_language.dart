import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../design/theme.dart';
import '../design/tokens.dart';

enum AppLanguage { english, bengali }

extension AppLanguageCode on AppLanguage {
  String get code => this == AppLanguage.bengali ? 'bn' : 'en';

  static AppLanguage fromCode(String? code) =>
      code == 'bn' ? AppLanguage.bengali : AppLanguage.english;
}

class AppStrings {
  const AppStrings({required this.values, required this.dayLetters});

  final Map<String, String> values;
  final List<String> dayLetters;

  String operator [](String key) => values[key] ?? key;

  static const en = AppStrings(
    dayLetters: ['M', 'T', 'W', 'T', 'F', 'S'],
    values: {
      'appName': 'Hazira',
      'teacherAttendance': 'Teacher attendance',
      'schoolSince': 'Purba Bardhaman · Since 1948',
      'demo': 'Demo',
      'teacherAccess': 'TEACHER ACCESS',
      'signIn': 'Sign in',
      'signInSubtitle': 'Open the console with your employee ID and password.',
      'employeeId': 'Employee ID',
      'password': 'Password',
      'signInAction': 'Sign in',
      'invalidCredentials':
          'The employee ID or password is incorrect. Use the demo account.',
      'demoAccount': 'Demo account',
      'useDemo': 'Use demo',
      'demoHint': 'All demo accounts use demo1234.',
      'demoNotice':
          'An independent demo. It is not connected to Banglar Shiksha.',
      'goodMorning': 'Good morning',
      'halfDay': 'Half day',
      'today': 'Today',
      'attendance': 'Attendance',
      'notices': 'Notices',
      'profile': 'Profile',
      'todayAttendance': "Today's attendance",
      'todaysRegister': "Today's register",
      'students': 'Students',
      'classLabel': 'Class',
      'allMarked': 'All marked',
      'start': 'Start',
      'reviewAgain': 'Review again',
      'takeAttendance': 'Take attendance',
      'myClasses': 'My classes',
      'timetable': 'Timetable',
      'offlineReady': 'Offline ready',
      'savedOnPhone': 'Saved on this phone',
      'marked': 'marked',
      'complete': 'Complete',
      'incomplete': 'Incomplete',
      'editAgain': 'Edit again',
      'startSwipe': 'Start swipe attendance',
      'viewRoster': 'View roster',
      'howItWorks': 'How it works',
      'swipeTitle': 'Swipe up',
      'swipeBody':
          'Swipe up to move to the next student. Swipe down to go back.',
      'tapTitle': 'Tap Present or Absent',
      'tapBody': 'Every mark is saved on this phone immediately.',
      'submitTitle': 'Submit at the end',
      'submitBody': 'Review the summary and submit. Marks are safe offline.',
      'swipeHint': 'Swipe up for next',
      'lastStudent': 'Last student',
      'summary': 'Summary',
      'draft': 'Draft',
      'submitted': 'Submitted',
      'allStudentsMarked': 'Every student is marked.',
      'remaining': 'remaining.',
      'present': 'Present',
      'absent': 'Absent',
      'late': 'Late',
      'leave': 'Leave',
      'holiday': 'Holiday',
      'absentAndLeave': 'Absent and leave',
      'allPresent': 'All students are present.',
      'mustMarkAll': 'Mark every student before submitting.',
      'home': 'Home',
      'submitting': 'Submitting…',
      'submitAttendance': 'Submit attendance',
      'submitNote': 'Submitting saves this register to an offline queue. Demo sync is available from Profile.',
      'roster': 'Roster',
      'swipeMode': 'Swipe mode',
      'allStudents': 'All students',
      'tapToChange': 'Tap a student to change status.',
      'viewSummary': 'View summary',
      'rosterHint': 'In swipe mode, pull down for the next student. Marking moves you forward automatically.',
      'notMarked': 'Not marked',
      'noticesTitle': 'School notices',
      'noticesSubtitle': 'Notices for teachers',
      'noticesNote': 'Notices shown from the local demo seed.',
      'yourAccount': 'Your account',
      'teacherAccount': 'Teacher account · Demo school',
      'sync': 'Sync',
      'pendingSync': 'submissions waiting',
      'allSaved': 'All records saved',
      'demoSync': 'Demo sync · local queue',
      'syncNow': 'Sync now',
      'settings': 'Settings',
      'language': 'Language',
      'appearance': 'Appearance',
      'light': 'Light',
      'version': 'Version',
      'resetDemo': 'Reset demo',
      'logout': 'Log out',
      'privacyNote': 'Independent demo. No real student or staff data is used.',
      'resetTitle': 'Reset the demo?',
      'resetBody': 'This removes attendance drafts, the sync queue and the session from this phone.',
      'cancel': 'Cancel',
      'reset': 'Reset',
      'more': 'More',
      'lateOrLeave': 'Late or Leave',
      'roll': 'Roll',
      'adm': 'ADM',
      'thisWeek': 'THIS WEEK',
      'physicalScience': 'Physical Science',
      'classTeacher': 'Class teacher',
      'subject': 'Subject',
      'todayLabel': 'Today',
      'savedOffline': 'Saved offline',
      'allSynced': 'Everything is already synced.',
      'syncedCount': 'submissions synced.',
      'loadError': 'The local demo seed could not be opened. Try again.',
      'tryAgain': 'Try again',
      'close': 'Close',
      'back': 'Back',
      'rollNumber': 'Roll',
      'section': 'Section',
      'undo': 'Undo',
      'myDay': 'My day',
      'myDaySubtitle': 'Saturday · 6 periods',
      'freeNow': 'Free now',
      'youAreFree': 'You are free this period.',
      'freePeriod': 'Free period',
      'free': 'Free',
      'needsCover': 'Needs cover',
      'takeThisClass': 'Take this class',
      'claimCover': 'Take class',
      'coverNow': 'Cover now',
      'coverBoard': 'Cover board',
      'coverRequests': 'Cover requests',
      'covering': 'Covering',
      'youAreCovering': 'You are covering this class',
      'teaching': 'Teaching',
      'classClaimed': 'Class claimed',
      'classClaimedBody':
          'You are covering this class. It is saved on this phone.',
      'claimConfirmTitle': 'Take this class?',
      'claimConfirmBody': 'You are free in this period. The class will be marked as covered by you on this phone.',
      'coverSavedOnPhone': 'Cover changes stay on this phone in the demo.',
      'absentTeacher': 'Absent teacher',
      'room': 'Room',
      'noCoverRequests': 'No cover requests in your free periods.',
      'laterToday': 'Later today',
      'now': 'Now',
      'coveredByYou': 'Covered by you',
    },
  );

  static const bn = AppStrings(
    dayLetters: ['সো', 'ম', 'বু', 'বৃ', 'শু', 'শ'],
    values: {
      'appName': 'হাজিরা',
      'teacherAttendance': 'শিক্ষক উপস্থিতি',
      'schoolSince': 'পূর্ব বর্ধমান · ১৯৪৮ থেকে',
      'demo': 'ডেমো',
      'teacherAccess': 'শিক্ষক অ্যাক্সেস',
      'signIn': 'সাইন ইন',
      'signInSubtitle': 'কর্মী আইডি ও পাসওয়ার্ড দিয়ে কনসোল খুলুন।',
      'employeeId': 'কর্মী আইডি',
      'password': 'পাসওয়ার্ড',
      'signInAction': 'সাইন ইন করুন',
      'invalidCredentials':
          'কর্মী আইডি বা পাসওয়ার্ড মেলেনি। ডেমো অ্যাকাউন্ট ব্যবহার করুন।',
      'demoAccount': 'ডেমো অ্যাকাউন্ট',
      'useDemo': 'ব্যবহার করুন',
      'demoHint': 'সব ডেমো অ্যাকাউন্টের পাসওয়ার্ড demo1234।',
      'demoNotice':
          'এটি একটি স্বতন্ত্র ডেমো। বাংলার শিক্ষা পোর্টালের সাথে সংযুক্ত নয়।',
      'goodMorning': 'শুভ সকাল',
      'halfDay': 'অর্ধদিবস',
      'today': 'আজ',
      'attendance': 'উপস্থিতি',
      'notices': 'বিজ্ঞপ্তি',
      'profile': 'প্রোফাইল',
      'todayAttendance': 'আজকের উপস্থিতি',
      'todaysRegister': 'আজকের খাতা',
      'students': 'শিক্ষার্থী',
      'classLabel': 'শ্রেণি',
      'allMarked': 'সবাই চিহ্নিত',
      'start': 'শুরু করুন',
      'reviewAgain': 'আবার দেখুন',
      'takeAttendance': 'উপস্থিতি নিন',
      'myClasses': 'আজকের ক্লাস',
      'timetable': 'সময়সূচি',
      'offlineReady': 'অফলাইন প্রস্তুত',
      'savedOnPhone': 'এই ফোনে সংরক্ষিত',
      'marked': 'চিহ্নিত',
      'complete': 'সম্পন্ন',
      'incomplete': 'অসম্পূর্ণ',
      'editAgain': 'আবার সম্পাদনা করুন',
      'startSwipe': 'সোয়াইপ উপস্থিতি শুরু করুন',
      'viewRoster': 'রোস্টার দেখুন',
      'howItWorks': 'কীভাবে কাজ করে',
      'swipeTitle': 'উপরে সোয়াইপ করুন',
      'swipeBody':
          'উপরে সোয়াইপ করলে পরের শিক্ষার্থী, নিচে সোয়াইপ করলে আগেরজন।',
      'tapTitle': 'উপস্থিত বা অনুপস্থিত চাপুন',
      'tapBody': 'প্রতিটি চিহ্ন সঙ্গে সঙ্গে এই ফোনে সংরক্ষিত হয়।',
      'submitTitle': 'শেষে জমা দিন',
      'submitBody': 'সারাংশ দেখে জমা দিন। অফলাইনেও তথ্য হারাবে না।',
      'swipeHint': 'পরের শিক্ষার্থীর জন্য উপরে সোয়াইপ করুন',
      'lastStudent': 'শেষ শিক্ষার্থী',
      'summary': 'সারাংশ',
      'draft': 'খসড়া',
      'submitted': 'জমা হয়েছে',
      'allStudentsMarked': 'সব শিক্ষার্থী চিহ্নিত হয়েছে।',
      'remaining': 'জন বাকি আছে।',
      'present': 'উপস্থিত',
      'absent': 'অনুপস্থিত',
      'late': 'দেরি',
      'leave': 'ছুটি',
      'holiday': 'ছুটি',
      'absentAndLeave': 'অনুপস্থিত ও ছুটি',
      'allPresent': 'সব শিক্ষার্থী উপস্থিত।',
      'mustMarkAll': 'সব শিক্ষার্থী চিহ্নিত না হলে জমা দেওয়া যাবে না।',
      'home': 'হোম',
      'submitting': 'জমা হচ্ছে…',
      'submitAttendance': 'উপস্থিতি জমা দিন',
      'submitNote': 'জমা দিলে এই ফোনে অফলাইন কিউ-তে সংরক্ষিত হবে। ডেমোতে সিঙ্ক পরে প্রোফাইল থেকে করা যায়।',
      'roster': 'রোস্টার',
      'swipeMode': 'সোয়াইপ মোড',
      'allStudents': 'সব শিক্ষার্থী',
      'tapToChange': 'স্ট্যাটাস বদলাতে শিক্ষার্থীর নামে চাপ দিন।',
      'viewSummary': 'সারাংশ দেখুন',
      'rosterHint': 'সোয়াইপ মোডে নিচে টানলে পরের শিক্ষার্থী, চিহ্ন দিলে স্বয়ংক্রিয়ভাবে পরের কার্ডে যাওয়া যায়।',
      'notMarked': 'চিহ্নিত নয়',
      'noticesTitle': 'বিদ্যালয়ের খবর',
      'noticesSubtitle': 'শিক্ষকদের জন্য বিজ্ঞপ্তি',
      'noticesNote': 'বিজ্ঞপ্তি এই ফোনে সংরক্ষিত ডেমো তথ্য থেকে দেখানো হচ্ছে।',
      'yourAccount': 'আপনার অ্যাকাউন্ট',
      'teacherAccount': 'শিক্ষক অ্যাকাউন্ট · ডেমো স্কুল',
      'sync': 'সিঙ্ক',
      'pendingSync': 'সাবমিশন সিঙ্ক বাকি',
      'allSaved': 'সব তথ্য সংরক্ষিত',
      'demoSync': 'ডেমো সিঙ্ক · স্থানীয় কিউ',
      'syncNow': 'এখনই সিঙ্ক করুন',
      'settings': 'সেটিংস',
      'language': 'ভাষা',
      'appearance': 'অ্যাপিয়ারেন্স',
      'light': 'লাইট',
      'version': 'সংস্করণ',
      'resetDemo': 'ডেমো রিসেট করুন',
      'logout': 'লগ আউট',
      'privacyNote': 'স্বতন্ত্র ডেমো। কোনো বাস্তব শিক্ষার্থী বা কর্মীর তথ্য ব্যবহার করা হয়নি।',
      'resetTitle': 'ডেমো রিসেট করবেন?',
      'resetBody': 'এই ফোনে সংরক্ষিত উপস্থিতি, সিঙ্ক কিউ ও সেশন মুছে যাবে।',
      'cancel': 'বাতিল',
      'reset': 'রিসেট',
      'more': 'আরও',
      'lateOrLeave': 'দেরি বা ছুটি',
      'roll': 'রোল',
      'adm': 'ভর্তি',
      'thisWeek': 'এই সপ্তাহ',
      'physicalScience': 'ভৌতবিজ্ঞান',
      'classTeacher': 'শ্রেণি শিক্ষক',
      'subject': 'বিষয়',
      'todayLabel': 'আজ',
      'savedOffline': 'অফলাইনে সংরক্ষিত',
      'allSynced': 'সব তথ্য আগেই সিঙ্ক করা আছে।',
      'syncedCount': 'টি সাবমিশন সিঙ্ক হয়েছে।',
      'loadError': 'ডেমো তথ্য লোড হয়নি। আবার চেষ্টা করুন।',
      'tryAgain': 'আবার চেষ্টা করুন',
      'close': 'বন্ধ করুন',
      'back': 'পিছনে',
      'rollNumber': 'রোল',
      'section': 'শাখা',
      'undo': 'ফিরিয়ে নিন',
      'myDay': 'আমার দিন',
      'myDaySubtitle': 'শনিবার · ৬ পিরিয়ড',
      'freeNow': 'এখন মুক্ত',
      'youAreFree': 'এই পিরিয়ডে আপনি মুক্ত।',
      'freePeriod': 'অবসর পিরিয়ড',
      'free': 'মুক্ত',
      'needsCover': 'শিক্ষক প্রয়োজন',
      'takeThisClass': 'এই ক্লাস নিন',
      'claimCover': 'ক্লাস নিন',
      'coverNow': 'এখন কভার',
      'coverBoard': 'কভার বোর্ড',
      'coverRequests': 'কভার অনুরোধ',
      'covering': 'কভার করছেন',
      'youAreCovering': 'আপনি এই ক্লাসটি নিচ্ছেন',
      'teaching': 'ক্লাস',
      'classClaimed': 'ক্লাস নেওয়া হয়েছে',
      'classClaimedBody':
          'আপনি এই ক্লাসটি নিচ্ছেন। এটি এই ফোনে সংরক্ষিত হয়েছে।',
      'claimConfirmTitle': 'এই ক্লাসটি নেবেন?',
      'claimConfirmBody': 'এই পিরিয়ডে আপনি মুক্ত। এই ফোনে ক্লাসটি আপনার কভার হিসেবে চিহ্নিত হবে।',
      'coverSavedOnPhone': 'ডেমোতে কভার পরিবর্তন এই ফোনেই থাকে।',
      'absentTeacher': 'অনুপস্থিত শিক্ষক',
      'room': 'ঘর',
      'noCoverRequests': 'আপনার অবসর পিরিয়ডে কোনো কভার অনুরোধ নেই।',
      'laterToday': 'আজ পরে',
      'now': 'এখন',
      'coveredByYou': 'আপনি কভার করছেন',
    },
  );
}

class LanguageController extends ChangeNotifier {
  AppLanguage _language = AppLanguage.english;
  SharedPreferences? _preferences;

  AppLanguage get language => _language;
  AppStrings get strings =>
      _language == AppLanguage.bengali ? AppStrings.bn : AppStrings.en;

  Future<void> restore(SharedPreferences preferences) async {
    _preferences = preferences;
    _language = AppLanguageCode.fromCode(
      preferences.getString('hazira.language'),
    );
    notifyListeners();
  }

  Future<void> setLanguage(AppLanguage language) async {
    if (_language == language) return;
    _language = language;
    await _preferences?.setString('hazira.language', language.code);
    notifyListeners();
  }
}

class LanguageScope extends InheritedNotifier<LanguageController> {
  const LanguageScope({
    super.key,
    required LanguageController controller,
    required super.child,
  }) : super(notifier: controller);

  static AppStrings stringsOf(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<LanguageScope>();
    return scope?.notifier?.strings ?? AppStrings.en;
  }

  static LanguageController? maybeControllerOf(BuildContext context) {
    return context
        .dependOnInheritedWidgetOfExactType<LanguageScope>()
        ?.notifier;
  }
}

extension LanguageBuildContext on BuildContext {
  AppStrings get strings => LanguageScope.stringsOf(this);
  LanguageController? get languageController =>
      LanguageScope.maybeControllerOf(this);
  bool get isBengali => languageController?.language == AppLanguage.bengali;

  TextStyle localized({
    double size = 14,
    FontWeight weight = FontWeight.w400,
    Color color = AppColors.ink,
    double height = 1.4,
  }) {
    return isBengali
        ? bnText(
            size: size,
            weight: weight,
            color: color,
            height: height + 0.15,
          )
        : latinText(size: size, weight: weight, color: color, height: height);
  }
}
