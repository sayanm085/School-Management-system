import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../data/models.dart';
import 'tokens.dart';

ThemeData buildHaziraTheme() {
  const scheme = ColorScheme.light(
    primary: AppColors.blue,
    onPrimary: Colors.white,
    secondary: AppColors.greenStrong,
    onSecondary: Colors.white,
    surface: AppColors.surface,
    onSurface: AppColors.ink,
    error: AppColors.redStrong,
    onError: Colors.white,
    outline: AppColors.separator,
    outlineVariant: AppColors.fillSecondary,
    surfaceContainerHighest: AppColors.fill,
  );

  final base = ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: AppColors.canvas,
    fontFamily: 'Inter',
    splashFactory: NoSplash.splashFactory,
    highlightColor: Colors.transparent,
  );

  return base.copyWith(
    textTheme: base.textTheme.apply(
      fontFamily: 'Inter',
      bodyColor: AppColors.ink,
      displayColor: AppColors.ink,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      foregroundColor: AppColors.ink,
      centerTitle: false,
    ),
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        TargetPlatform.android: CupertinoPageTransitionsBuilder(),
        TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
        TargetPlatform.windows: CupertinoPageTransitionsBuilder(),
        TargetPlatform.linux: CupertinoPageTransitionsBuilder(),
      },
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: AppColors.ink,
      contentTextStyle: const TextStyle(
        fontFamily: 'Inter',
        fontFamilyFallback: ['NotoSansBengali'],
        fontSize: 13,
        color: AppColors.canvas,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
    ),
    dividerTheme: const DividerThemeData(
      color: AppColors.separator,
      thickness: 1,
      space: 1,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.separator),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.separator),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.blue, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.red),
      ),
      hintStyle: const TextStyle(
        fontFamily: 'Inter',
        fontSize: 15,
        color: AppColors.inkTertiary,
      ),
    ),
  );
}

const List<BoxShadow> haziraCardShadow = [
  BoxShadow(
    color: Color(0x0A000000),
    blurRadius: 2,
    offset: Offset(0, 1),
  ),
  BoxShadow(
    color: Color(0x0F000000),
    blurRadius: 24,
    offset: Offset(0, 8),
  ),
];

TextStyle bnText({
  double size = 15,
  FontWeight weight = FontWeight.w400,
  Color color = AppColors.ink,
  double height = 1.45,
  double letterSpacing = -0.2,
}) {
  return TextStyle(
    fontFamily: 'NotoSansBengali',
    fontFamilyFallback: const ['Inter'],
    fontSize: size,
    fontWeight: weight,
    color: color,
    height: height,
    letterSpacing: letterSpacing,
  );
}

TextStyle latinText({
  double size = 15,
  FontWeight weight = FontWeight.w400,
  Color color = AppColors.ink,
  double height = 1.4,
  double letterSpacing = -0.1,
}) {
  return TextStyle(
    fontFamily: 'Inter',
    fontFamilyFallback: const ['NotoSansBengali'],
    fontSize: size,
    fontWeight: weight,
    color: color,
    height: height,
    letterSpacing: letterSpacing,
  );
}

String formatDateEn(DateTime date) => DateFormat('EEE, d MMM yyyy').format(date);

String formatShortDate(DateTime date) =>
    DateFormat('d MMM').format(date);

String maskPhone(String value) {
  if (value.length < 8) return value;
  return '${value.substring(0, 2)}XXXXX${value.substring(value.length - 3)}';
}

Color statusColor(AttendanceStatus status) {
  switch (status) {
    case AttendanceStatus.present:
      return AppColors.greenStrong;
    case AttendanceStatus.absent:
      return AppColors.redStrong;
    case AttendanceStatus.late:
      return AppColors.orangeStrong;
    case AttendanceStatus.leave:
      return AppColors.inkSecondary;
  }
}

Color statusTint(AttendanceStatus status) {
  switch (status) {
    case AttendanceStatus.present:
      return AppColors.greenTint;
    case AttendanceStatus.absent:
      return AppColors.redTint;
    case AttendanceStatus.late:
      return AppColors.orangeTint;
    case AttendanceStatus.leave:
      return AppColors.fill;
  }
}

String statusGlyph(AttendanceStatus status) {
  switch (status) {
    case AttendanceStatus.present:
      return '✓';
    case AttendanceStatus.absent:
      return '✕';
    case AttendanceStatus.late:
      return '!';
    case AttendanceStatus.leave:
      return '–';
  }
}
