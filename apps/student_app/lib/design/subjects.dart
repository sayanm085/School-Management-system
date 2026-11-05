import 'package:flutter/material.dart';

import '../data/models.dart';
import '../l10n/strings.dart';
import 'tokens.dart';

/// One colour means one subject. Apple extended system palette (StudentColors
/// in tokens.dart) on tints; unknown subjects fall back to the primary blue.
SubjectColors subjectColors(String subjectId) {
  switch (subjectId) {
    case 'math':
      return const SubjectColors(AppColors.blueTint, AppColors.blue);
    case 'psci':
      return const SubjectColors(StudentColors.tealTint, StudentColors.teal);
    case 'lsci':
      return const SubjectColors(StudentColors.mintTint, StudentColors.mint);
    case 'hist':
      return const SubjectColors(StudentColors.purpleTint, StudentColors.purple);
    case 'geo':
      return const SubjectColors(AppColors.orangeTint, AppColors.orangeStrong);
    case 'eng':
      return const SubjectColors(StudentColors.pinkTint, StudentColors.pink);
    case 'ben':
      return const SubjectColors(StudentColors.indigoTint, StudentColors.indigo);
    default:
      return const SubjectColors(AppColors.blueTint, AppColors.blue);
  }
}

IconData subjectIcon(String subjectId) {
  switch (subjectId) {
    case 'math':
      return Icons.calculate_outlined;
    case 'psci':
      return Icons.science_outlined;
    case 'lsci':
      return Icons.eco_outlined;
    case 'hist':
      return Icons.history_edu_outlined;
    case 'geo':
      return Icons.public_outlined;
    case 'eng':
      return Icons.translate_outlined;
    case 'ben':
      return Icons.menu_book_outlined;
    default:
      return Icons.school_outlined;
  }
}

String langText(String en, String bn) =>
    currentLang == AppLang.en ? en : bn;

/// Helpers used across screens for a period/homework subject row.
String subjectTitle(Period p) => currentLang == AppLang.en ? p.subjectEn : p.subjectBn;
