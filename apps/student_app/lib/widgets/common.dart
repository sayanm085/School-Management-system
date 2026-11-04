import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../data/models.dart';
import '../design/tokens.dart';
import '../design/theme.dart';
import 'pressable.dart';

class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        boxShadow: cardShadow,
      ),
      child: child,
    );
  }
}

class TintPill extends StatelessWidget {
  final String label;
  final Color background;
  final Color foreground;
  const TintPill({
    super.key,
    required this.label,
    required this.background,
    required this.foreground,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Text(label, style: latinText(size: 13, weight: FontWeight.w600, color: foreground)),
    );
  }
}

class SectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  const SectionHeader({
    super.key,
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Text(title, style: latinText(size: 17, weight: FontWeight.w700))),
        if (actionLabel != null)
          Pressable(
            onTap: onAction,
            child: Text(actionLabel!,
                style: latinText(size: 15, weight: FontWeight.w600, color: AppColors.blue)),
          ),
      ],
    );
  }
}

/// Large title row used by every tab: iOS large title + optional trailing.
class LargeTitle extends StatelessWidget {
  final String title;
  final String? subtitleBn;
  const LargeTitle({super.key, required this.title, this.subtitleBn});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: latinText(size: 30, weight: FontWeight.w800, letterSpacing: -0.8)),
        if (subtitleBn != null) ...[
          const SizedBox(height: 2),
          Text(subtitleBn!, style: bnText(size: 13, color: AppColors.inkTertiary)),
        ],
      ],
    );
  }
}

/// Progress ring: animates on first paint only, then holds.
class ProgressRing extends StatelessWidget {
  final double value; // 0..1
  final double size;
  final double stroke;
  final Color color;
  final Color? trackColor;
  final Widget? center;
  const ProgressRing({
    super.key,
    required this.value,
    this.size = 96,
    this.stroke = 10,
    this.color = AppColors.blue,
    this.trackColor,
    this.center,
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: value.clamp(0, 1)),
      duration: AppMotion.durationSlow,
      curve: AppMotion.easeOut,
      builder: (context, v, child) => SizedBox(
        width: size,
        height: size,
        child: CustomPaint(
          painter: _RingPainter(
            value: v,
            stroke: stroke,
            color: color,
            track: trackColor ?? AppColors.fill,
          ),
          child: Center(child: child),
        ),
      ),
      child: center,
    );
  }
}

class _RingPainter extends CustomPainter {
  final double value;
  final double stroke;
  final Color color;
  final Color track;
  _RingPainter({
    required this.value,
    required this.stroke,
    required this.color,
    required this.track,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final radius = (size.shortestSide - stroke) / 2;
    final center = Offset(size.width / 2, size.height / 2);
    final rect = Rect.fromCircle(center: center, radius: radius);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    paint.color = track;
    canvas.drawArc(rect, 0, math.pi * 2, false, paint);
    paint.color = color;
    canvas.drawArc(rect, -math.pi / 2, math.pi * 2 * value, false, paint);
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.value != value || old.color != color || old.track != track;
}

/// Horizontal progress bar with rounded caps.
class ProgressBar extends StatelessWidget {
  final double value;
  final Color color;
  const ProgressBar({super.key, required this.value, this.color = AppColors.blue});

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: value.clamp(0, 1)),
      duration: AppMotion.durationSlow,
      curve: AppMotion.easeOut,
      builder: (context, v, _) => ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: LinearProgressIndicator(
          value: v,
          minHeight: 8,
          backgroundColor: AppColors.fill,
          valueColor: AlwaysStoppedAnimation(color),
        ),
      ),
    );
  }
}

/// Score trend line chart, iOS-clean: blue line, fading fill, labelled points.
class TrendChart extends StatelessWidget {
  final List<TrendPoint> points;
  const TrendChart({super.key, required this.points});

  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) return const SizedBox(height: 160);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: AppMotion.durationSlow,
      curve: AppMotion.easeOut,
      builder: (context, t, _) => SizedBox(
        height: 170,
        child: CustomPaint(
          painter: _TrendPainter(points: points, reveal: t),
          child: const SizedBox.expand(),
        ),
      ),
    );
  }
}

class _TrendPainter extends CustomPainter {
  final List<TrendPoint> points;
  final double reveal;
  _TrendPainter({required this.points, required this.reveal});

  @override
  void paint(Canvas canvas, Size size) {
    const leftPad = 8.0, rightPad = 8.0;
    final w = size.width - leftPad - rightPad;
    final h = size.height - 28;
    final stepX = points.length > 1 ? w / (points.length - 1) : w;
    Offset xy(int i) => Offset(
          leftPad + stepX * i,
          h * (1 - (points[i].pct - 50) / 50),
        );

    final path = Path()..moveTo(xy(0).dx, xy(0).dy);
    for (var i = 1; i < points.length; i++) {
      path.lineTo(xy(i).dx, xy(i).dy);
    }
    final fill = Path.from(path)
      ..lineTo(leftPad + stepX * (points.length - 1), h)
      ..lineTo(leftPad, h)
      ..close();

    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [AppColors.blue.withValues(alpha: 0.14), AppColors.blue.withValues(alpha: 0)],
      ).createShader(Rect.fromLTWH(0, 0, size.width, h));

    canvas.save();
    canvas.clipRect(Rect.fromLTWH(0, 0, size.width * reveal, size.height));
    canvas.drawPath(fill, fillPaint);

    final line = Paint()
      ..color = AppColors.blue
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(path, line);

    final dotFill = Paint()..color = AppColors.surface;
    final dotRing = Paint()
      ..color = AppColors.blue
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;
    for (var i = 0; i < points.length; i++) {
      canvas.drawCircle(xy(i), 5, dotFill);
      canvas.drawCircle(xy(i), 5, dotRing);
    }
    canvas.restore();

    final tp = TextPainter(textDirection: TextDirection.ltr);
    for (var i = 0; i < points.length; i++) {
      tp.text = TextSpan(
        text: points[i].label,
        style: latinText(size: 12, color: AppColors.inkTertiary),
      );
      tp.layout();
      tp.paint(canvas, Offset(xy(i).dx - tp.width / 2, h + 8));
    }
  }

  @override
  bool shouldRepaint(_TrendPainter old) => old.reveal != reveal;
}
