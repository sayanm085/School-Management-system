import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'tokens.dart';

ThemeData buildBarandaStudentTheme() {
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
        TargetPlatform.android: CupertinoPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      },
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
      hintStyle: const TextStyle(
        fontFamily: 'Inter',
        fontSize: 15,
        color: AppColors.inkTertiary,
      ),
    ),
  );
}

const List<BoxShadow> cardShadow = [
  BoxShadow(color: Color(0x0A000000), blurRadius: 2, offset: Offset(0, 1)),
  BoxShadow(color: Color(0x0F000000), blurRadius: 24, offset: Offset(0, 8)),
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
