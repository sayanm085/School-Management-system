import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../data/models.dart';
import '../design/theme.dart';
import '../design/tokens.dart';
import '../l10n/app_language.dart';

class HaziraCard extends StatelessWidget {
  const HaziraCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.radius = 24,
    this.color = AppColors.surface,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final content = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: AppColors.separator),
        boxShadow: haziraCardShadow,
      ),
      child: child,
    );

    if (onTap == null) return content;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(radius),
        onTap: onTap,
        child: content,
      ),
    );
  }
}

class SchoolSeal extends StatelessWidget {
  const SchoolSeal({super.key, this.size = 48});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/seal.svg',
      width: size,
      height: size,
      semanticsLabel: 'School seal',
    );
  }
}

class HaziraAvatar extends StatelessWidget {
  const HaziraAvatar({
    super.key,
    required this.asset,
    this.size = 44,
    this.borderColor,
    this.borderWidth = 2,
  });

  final String asset;
  final double size;
  final Color? borderColor;
  final double borderWidth;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      padding: EdgeInsets.all(borderColor == null ? 0 : borderWidth),
      decoration: BoxDecoration(
        color: AppColors.fill,
        shape: BoxShape.circle,
        border: borderColor == null
            ? null
            : Border.all(color: borderColor!, width: borderWidth),
      ),
      child: ClipOval(
        child: SvgPicture.asset(
          asset,
          fit: BoxFit.cover,
          placeholderBuilder: (_) => const ColoredBox(color: AppColors.fill),
        ),
      ),
    );
  }
}

class SectionPill extends StatelessWidget {
  const SectionPill({super.key, required this.text, this.tone});

  final String text;
  final Color? tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: tone ?? AppColors.fill,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: latinText(
          size: 11,
          weight: FontWeight.w600,
          color: AppColors.inkSecondary,
        ),
      ),
    );
  }
}

class StatusChip extends StatelessWidget {
  const StatusChip({
    super.key,
    required this.label,
    required this.color,
    required this.background,
    this.dense = false,
  });

  final String label;
  final Color color;
  final Color background;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: dense ? 8 : 10,
        vertical: dense ? 4 : 5,
      ),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: latinText(
          size: dense ? 10 : 11,
          weight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}

class WeekRegisterStrip extends StatelessWidget {
  const WeekRegisterStrip({
    super.key,
    required this.student,
    this.todayStatus,
    this.compact = false,
  });

  final Student student;
  final AttendanceStatus? todayStatus;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final s = context.strings;
    final chars = student.lastWeek.padRight(6, '-').substring(0, 6).split('');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          s['thisWeek'],
          style: context.localized(
            size: 10,
            weight: FontWeight.w600,
            color: AppColors.inkTertiary,
            height: 1.3,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            for (var index = 0; index < 6; index += 1) ...[
              Expanded(
                child: _DayCell(
                  day: s.dayLetters[index],
                  char: index == 5 && todayStatus != null
                      ? _statusChar(todayStatus!)
                      : chars[index],
                  status: index == 5 ? todayStatus : null,
                  isToday: index == 5,
                  compact: compact,
                ),
              ),
              if (index < 5) const SizedBox(width: 6),
            ],
          ],
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 14,
          runSpacing: 6,
          children: [
            _LegendDot(
              color: AppColors.greenStrong,
              label: s['present'],
            ),
            _LegendDot(color: AppColors.redStrong, label: s['absent']),
            _LegendDot(color: AppColors.orange, label: s['late']),
            _LegendDot(
              color: AppColors.fillSecondary,
              label: s['holiday'],
            ),
          ],
        ),
      ],
    );
  }

  String _statusChar(AttendanceStatus status) {
    switch (status) {
      case AttendanceStatus.present:
        return 'P';
      case AttendanceStatus.absent:
        return 'A';
      case AttendanceStatus.late:
        return 'L';
      case AttendanceStatus.leave:
        return 'L';
    }
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.char,
    required this.status,
    required this.isToday,
    required this.compact,
  });

  final String day;
  final String char;
  final AttendanceStatus? status;
  final bool isToday;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final color = switch (char) {
      'P' => AppColors.greenStrong,
      'A' => AppColors.redStrong,
      'L' => AppColors.orangeStrong,
      'H' => AppColors.inkTertiary,
      _ => AppColors.inkTertiary,
    };
    final background = switch (char) {
      'P' => AppColors.greenTint,
      'A' => AppColors.redTint,
      'L' => AppColors.orangeTint,
      'H' => AppColors.fill,
      _ => AppColors.surface,
    };
    final glyph = switch (char) {
      'P' => '✓',
      'A' => '✕',
      'L' => '!',
      'H' => '–',
      _ => '',
    };

    return Semantics(
      label: '$day: ${_charLabel(context)}',
      child: Container(
        height: compact ? 42 : 54,
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isToday ? AppColors.blue : AppColors.separator,
            width: isToday ? 1.5 : 1,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              day,
              style: context.localized(
                size: 9,
                weight: FontWeight.w600,
                color: color,
                height: 1.2,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              glyph,
              style: latinText(size: 13, weight: FontWeight.w700, color: color),
            ),
          ],
        ),
      ),
    );
  }

  String _charLabel(BuildContext context) {
    final s = context.strings;
    if (status != null) {
      return context.isBengali ? status!.labelBn : status!.labelEn;
    }
    switch (char) {
      case 'P':
        return s['present'];
      case 'A':
        return s['absent'];
      case 'L':
        return s['late'];
      case 'H':
        return s['holiday'];
      default:
        return s['notMarked'];
    }
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: context.localized(
            size: 10,
            color: AppColors.inkSecondary,
          ),
        ),
      ],
    );
  }
}

class ProgressRing extends StatelessWidget {
  const ProgressRing({
    super.key,
    required this.value,
    this.size = 48,
    this.stroke = 4,
    this.color = AppColors.blue,
    this.child,
  });

  final double value;
  final double size;
  final double stroke;
  final Color color;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size(size, size),
            painter: _RingPainter(
              value: value.clamp(0, 1).toDouble(),
              stroke: stroke,
              color: color,
            ),
          ),
          ?child,
        ],
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({
    required this.value,
    required this.stroke,
    required this.color,
  });

  final double value;
  final double stroke;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = (size.shortestSide - stroke) / 2;
    final background = Paint()
      ..color = AppColors.fillSecondary
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke;
    final foreground = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, background);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * value,
      false,
      foreground,
    );
  }

  @override
  bool shouldRepaint(covariant _RingPainter oldDelegate) =>
      oldDelegate.value != value ||
      oldDelegate.color != color ||
      oldDelegate.stroke != stroke;
}

class HaziraPrimaryButton extends StatelessWidget {
  const HaziraPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.color = AppColors.blueStrong,
    this.foreground = Colors.white,
    this.height = 56,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final Color color;
  final Color foreground;
  final double height;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: color,
          foregroundColor: foreground,
          disabledBackgroundColor: color.withValues(alpha: 0.35),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
          textStyle: latinText(size: 15, weight: FontWeight.w600),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 18),
              const SizedBox(width: 8),
            ],
            Text(label),
          ],
        ),
      ),
    );
  }
}

class HaziraSecondaryButton extends StatelessWidget {
  const HaziraSecondaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.height = 52,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final double height;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.ink,
          side: const BorderSide(color: AppColors.separator),
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: latinText(size: 14, weight: FontWeight.w600),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 17),
              const SizedBox(width: 7),
            ],
            Text(label),
          ],
        ),
      ),
    );
  }
}

class Eyebrow extends StatelessWidget {
  const Eyebrow({super.key, required this.text, this.color = AppColors.blueText});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: latinText(
        size: 10,
        weight: FontWeight.w600,
        color: color,
        letterSpacing: 1.05,
      ),
    );
  }
}

class HaziraLanguageSwitch extends StatelessWidget {
  const HaziraLanguageSwitch({
    super.key,
    required this.language,
    required this.onChanged,
  });

  final AppLanguage language;
  final ValueChanged<AppLanguage>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: AppColors.fill,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _LanguageOption(
            label: 'English',
            selected: language == AppLanguage.english,
            onTap: () => onChanged?.call(AppLanguage.english),
          ),
          _LanguageOption(
            label: 'বাংলা',
            selected: language == AppLanguage.bengali,
            onTap: () => onChanged?.call(AppLanguage.bengali),
          ),
        ],
      ),
    );
  }
}

class _LanguageOption extends StatelessWidget {
  const _LanguageOption({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(9),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: selected ? AppColors.surface : Colors.transparent,
            borderRadius: BorderRadius.circular(9),
            boxShadow: selected
                ? const [
                    BoxShadow(
                      color: Color(0x14000000),
                      blurRadius: 4,
                      offset: Offset(0, 1),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label,
            style: latinText(
              size: 11,
              weight: FontWeight.w600,
              color: selected ? AppColors.ink : AppColors.inkSecondary,
            ),
          ),
        ),
      ),
    );
  }
}

class EmptyStateCard extends StatelessWidget {
  const EmptyStateCard({
    super.key,
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return HaziraCard(
      child: Column(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: const BoxDecoration(
              color: AppColors.fill,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 20, color: AppColors.inkSecondary),
          ),
          const SizedBox(height: 14),
          Text(title, style: latinText(size: 15, weight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(
            body,
            textAlign: TextAlign.center,
            style: latinText(
              size: 12,
              color: AppColors.inkSecondary,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
