import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../data/attendance_controller.dart';
import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../l10n/app_language.dart';
import '../../widgets/hazira_widgets.dart';
import 'summary_screen.dart';

class AttendanceDeckScreen extends StatefulWidget {
  const AttendanceDeckScreen({super.key, required this.seed});

  final SeedData seed;

  @override
  State<AttendanceDeckScreen> createState() => _AttendanceDeckScreenState();
}

class _AttendanceDeckScreenState extends State<AttendanceDeckScreen> {
  late final Future<AttendanceController> _controllerFuture;
  final PageController _pageController = PageController();
  int _index = 0;
  bool _busy = false;
  AttendanceStatus? _stamp;

  @override
  void initState() {
    super.initState();
    _controllerFuture = AttendanceController.load(
      sectionId: widget.seed.section.id,
      students: widget.seed.students,
    );
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _mark(
    AttendanceController controller,
    Student student,
    AttendanceStatus status,
  ) {
    if (_busy) return;
    setState(() {
      _busy = true;
      _stamp = status;
    });
    HapticFeedback.mediumImpact();
    controller.mark(student.id, status);
    final s = context.strings;
    final studentName = context.isBengali ? student.nameBn : student.nameEn;
    final statusLabel = context.isBengali ? status.labelBn : status.labelEn;

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          duration: const Duration(seconds: 2),
          content: Text('$studentName · $statusLabel'),
          action: SnackBarAction(
            label: s['undo'],
            textColor: AppColors.blue,
            onPressed: controller.undo,
          ),
        ),
      );

    Future<void>.delayed(const Duration(milliseconds: 230), () async {
      if (!mounted) return;
      setState(() => _stamp = null);

      final allMarked = controller.markedCount >= widget.seed.students.length;
      if (allMarked || _index >= widget.seed.students.length - 1) {
        _busy = false;
        await Navigator.of(context).pushReplacement(
          MaterialPageRoute<void>(
            builder: (_) =>
                SummaryScreen(seed: widget.seed, controller: controller),
          ),
        );
        return;
      }

      await _pageController.nextPage(
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeOutCubic,
      );
      if (mounted) setState(() => _busy = false);
    });
  }

  Future<void> _openMore(
    AttendanceController controller,
    Student student,
  ) async {
    final s = context.strings;
    final studentName = context.isBengali ? student.nameBn : student.nameEn;
    final status = await showModalBottomSheet<AttendanceStatus>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => SafeArea(
        child: Container(
          margin: const EdgeInsets.all(12),
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(26),
            boxShadow: haziraCardShadow,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.fillSecondary,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                s['more'],
                style: context.localized(size: 18, weight: FontWeight.w600),
              ),
              const SizedBox(height: 2),
              Text(
                studentName,
                style: context.localized(
                  size: 11,
                  color: AppColors.inkSecondary,
                ),
              ),
              const SizedBox(height: 12),
              _MoreOption(
                icon: Icons.schedule_rounded,
                title: s['late'],
                color: AppColors.orangeStrong,
                background: AppColors.orangeTint,
                onTap: () => Navigator.pop(context, AttendanceStatus.late),
              ),
              const SizedBox(height: 8),
              _MoreOption(
                icon: Icons.beach_access_outlined,
                title: s['leave'],
                color: AppColors.inkSecondary,
                background: AppColors.fill,
                onTap: () => Navigator.pop(context, AttendanceStatus.leave),
              ),
            ],
          ),
        ),
      ),
    );

    if (status != null) _mark(controller, student, status);
  }

  Future<void> _openSummary(AttendanceController controller) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            SummaryScreen(seed: widget.seed, controller: controller),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: AppColors.canvas,
        body: SafeArea(
          child: FutureBuilder<AttendanceController>(
            future: _controllerFuture,
            builder: (context, snapshot) {
              if (!snapshot.hasData) {
                return const Center(
                  child: CircularProgressIndicator(
                    strokeWidth: 2.2,
                    color: AppColors.blue,
                  ),
                );
              }
              final controller = snapshot.data!;
              return ListenableBuilder(
                listenable: controller,
                builder: (context, _) {
                  return Column(
                    children: [
                      _DeckHeader(
                        seed: widget.seed,
                        controller: controller,
                        onClose: () => Navigator.of(context).pop(),
                        onSummary: () => _openSummary(controller),
                      ),
                      Expanded(
                        child: Stack(
                          children: [
                            PageView.builder(
                              controller: _pageController,
                              scrollDirection: Axis.vertical,
                              itemCount: widget.seed.students.length,
                              onPageChanged: (index) =>
                                  setState(() => _index = index),
                              itemBuilder: (context, index) {
                                return LayoutBuilder(
                                  builder: (context, constraints) {
                                    final compact = constraints.maxHeight < 620;
                                    return Center(
                                      child: Padding(
                                        padding: const EdgeInsets.fromLTRB(
                                          20,
                                          6,
                                          20,
                                          12,
                                        ),
                                        child: _StudentCard(
                                          student: widget.seed.students[index],
                                          status: controller.statusFor(
                                            widget.seed.students[index].id,
                                          ),
                                          compact: compact,
                                          onPresent: () => _mark(
                                            controller,
                                            widget.seed.students[index],
                                            AttendanceStatus.present,
                                          ),
                                          onAbsent: () => _mark(
                                            controller,
                                            widget.seed.students[index],
                                            AttendanceStatus.absent,
                                          ),
                                          onMore: () => _openMore(
                                            controller,
                                            widget.seed.students[index],
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                );
                              },
                            ),
                            if (_stamp != null)
                              Positioned.fill(
                                child: IgnorePointer(
                                  child: Center(
                                    child: _StampOverlay(status: _stamp!),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      _DeckFooter(
                        index: _index,
                        total: widget.seed.students.length,
                      ),
                    ],
                  );
                },
              );
            },
          ),
        ),
      ),
    );
  }
}

class _DeckHeader extends StatelessWidget {
  const _DeckHeader({
    required this.seed,
    required this.controller,
    required this.onClose,
    required this.onSummary,
  });

  final SeedData seed;
  final AttendanceController controller;
  final VoidCallback onClose;
  final VoidCallback onSummary;

  @override
  Widget build(BuildContext context) {
    final total = seed.students.length;
    final marked = controller.markedCount;
    final s = context.strings;
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 2),
      child: Column(
        children: [
          Row(
            children: [
              IconButton(
                onPressed: onClose,
                tooltip: s['close'],
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
                color: AppColors.ink,
              ),
              Expanded(
                child: Column(
                  children: [
                    Text(
                      seed.section.label,
                      style: latinText(size: 17, weight: FontWeight.w600),
                    ),
                    Text(
                      s['attendance'],
                      style: context.localized(
                        size: 10,
                        color: AppColors.inkSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              ProgressRing(
                value: total == 0 ? 0 : marked / total,
                size: 44,
                stroke: 3.5,
                color: controller.submitted ? AppColors.green : AppColors.blue,
                child: Text(
                  '$marked/$total',
                  style: latinText(
                    size: 9,
                    weight: FontWeight.w600,
                    color: controller.submitted
                        ? AppColors.greenText
                        : AppColors.blueText,
                  ),
                ),
              ),
              const SizedBox(width: 4),
            ],
          ),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              children: [
                Flexible(
                  child: Text(
                    formatDateEn(SeedData.today),
                    overflow: TextOverflow.ellipsis,
                    style: latinText(size: 10, color: AppColors.inkSecondary),
                  ),
                ),
                const SizedBox(width: 6),
                StatusChip(
                  label: s['offlineReady'],
                  color: AppColors.greenText,
                  background: AppColors.greenTint,
                  dense: true,
                ),
                const Spacer(),
                if (marked > 0)
                  TextButton(
                    onPressed: onSummary,
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.blueText,
                      textStyle: context.localized(
                        size: 11,
                        weight: FontWeight.w600,
                      ),
                      minimumSize: const Size(0, 32),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                    child: Text(s['summary']),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StudentCard extends StatelessWidget {
  const _StudentCard({
    required this.student,
    required this.status,
    required this.compact,
    required this.onPresent,
    required this.onAbsent,
    required this.onMore,
  });

  final Student student;
  final AttendanceStatus? status;
  final bool compact;
  final VoidCallback onPresent;
  final VoidCallback onAbsent;
  final VoidCallback onMore;

  @override
  Widget build(BuildContext context) {
    final photoSize = compact ? 82.0 : 100.0;
    final s = context.strings;
    final studentName = context.isBengali ? student.nameBn : student.nameEn;
    final statusLabel = status == null
        ? null
        : context.isBengali
        ? status!.labelBn
        : status!.labelEn;
    return Stack(
      children: [
        Positioned(
          top: 7,
          left: 8,
          right: 8,
          bottom: -7,
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: AppColors.separator),
            ),
          ),
        ),
        HaziraCard(
          radius: 28,
          padding: EdgeInsets.fromLTRB(
            18,
            compact ? 13 : 16,
            18,
            compact ? 12 : 14,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  SectionPill(text: '${s['roll']} ${student.rollNo}'),
                  const Spacer(),
                  Text(
                    '${s['adm']} ${student.admissionNo}',
                    style: latinText(
                      size: 9,
                      color: AppColors.inkTertiary,
                      letterSpacing: 0.4,
                    ),
                  ),
                ],
              ),
              SizedBox(height: compact ? 8 : 12),
              Stack(
                clipBehavior: Clip.none,
                children: [
                  HaziraAvatar(
                    asset: student.avatarAsset,
                    size: photoSize,
                    borderColor: AppColors.blue,
                    borderWidth: 3,
                  ),
                  if (status != null)
                    Positioned(
                      right: -2,
                      bottom: -2,
                      child: Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: statusColor(status!),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.surface,
                            width: 2,
                          ),
                        ),
                        child: Icon(
                          status == AttendanceStatus.absent
                              ? Icons.close_rounded
                              : status == AttendanceStatus.late
                              ? Icons.schedule_rounded
                              : status == AttendanceStatus.leave
                              ? Icons.beach_access_rounded
                              : Icons.check_rounded,
                          size: 15,
                          color: Colors.white,
                        ),
                      ),
                    ),
                ],
              ),
              SizedBox(height: compact ? 8 : 10),
              Text(
                studentName,
                textAlign: TextAlign.center,
                style: context.localized(
                  size: compact ? 24 : 28,
                  weight: FontWeight.w600,
                  height: 1.3,
                ),
              ),
              SizedBox(height: compact ? 7 : 9),
              Wrap(
                alignment: WrapAlignment.center,
                spacing: 5,
                runSpacing: 4,
                children: [
                  SectionPill(
                    text:
                        '${s['classLabel']} ${student.sectionId.split('-').first}',
                  ),
                  SectionPill(
                    text:
                        '${s['section']} ${student.sectionId.split('-').last}',
                  ),
                  SectionPill(text: '${s['roll']} ${student.rollNo}'),
                ],
              ),
              SizedBox(height: compact ? 8 : 10),
              const Divider(height: 1),
              SizedBox(height: compact ? 9 : 12),
              WeekRegisterStrip(
                student: student,
                todayStatus: status,
                compact: compact,
              ),
              SizedBox(height: compact ? 8 : 11),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 9,
                ),
                decoration: BoxDecoration(
                  color: AppColors.fill,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Text(
                      '${s['todayLabel']} · Sat 31 Oct',
                      style: context.localized(
                        size: 10,
                        weight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    if (status == null)
                      Text(
                        s['notMarked'],
                        style: context.localized(
                          size: 10,
                          color: AppColors.inkTertiary,
                        ),
                      )
                    else
                      StatusChip(
                        label: statusLabel!,
                        color: statusColor(status!),
                        background: statusTint(status!),
                        dense: true,
                      ),
                  ],
                ),
              ),
              SizedBox(height: compact ? 9 : 12),
              Row(
                children: [
                  Expanded(
                    child: _MarkButton(
                      key: Key('present-${student.id}'),
                      label: s['present'],
                      icon: Icons.check_rounded,
                      background: AppColors.greenStrong,
                      foreground: Colors.white,
                      border: Colors.transparent,
                      onTap: onPresent,
                    ),
                  ),
                  const SizedBox(width: 9),
                  Expanded(
                    child: _MarkButton(
                      key: Key('absent-${student.id}'),
                      label: s['absent'],
                      icon: Icons.close_rounded,
                      background: AppColors.redTint,
                      foreground: AppColors.redText,
                      border: AppColors.red,
                      onTap: onAbsent,
                    ),
                  ),
                ],
              ),
              SizedBox(height: compact ? 2 : 4),
              TextButton.icon(
                onPressed: onMore,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.inkSecondary,
                  textStyle: context.localized(
                    size: 10,
                    weight: FontWeight.w600,
                  ),
                  minimumSize: const Size(0, 30),
                ),
                icon: const Icon(Icons.more_horiz_rounded, size: 16),
                label: Text(s['lateOrLeave']),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _MarkButton extends StatelessWidget {
  const _MarkButton({
    super.key,
    required this.label,
    required this.icon,
    required this.background,
    required this.foreground,
    required this.border,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color background;
  final Color foreground;
  final Color border;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: background,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          height: 58,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: border),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: foreground),
              const SizedBox(width: 7),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: context.localized(
                    size: 14,
                    weight: FontWeight.w600,
                    color: foreground,
                    height: 1.3,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StampOverlay extends StatelessWidget {
  const _StampOverlay({required this.status});

  final AttendanceStatus status;

  @override
  Widget build(BuildContext context) {
    final color = statusColor(status);
    final s = context.strings;
    final label = context.isBengali ? status.labelBn : status.labelEn;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.9, end: 1),
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOutBack,
      builder: (context, value, child) =>
          Transform.scale(scale: value, child: child),
      child: Transform.rotate(
        angle: -0.06,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.surface.withValues(alpha: 0.94),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color, width: 2),
            boxShadow: haziraCardShadow,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: context.localized(
                  size: 20,
                  weight: FontWeight.w700,
                  color: color,
                  height: 1.3,
                ),
              ),
              Text(
                s['attendance'].toUpperCase(),
                style: context.localized(
                  size: 9,
                  weight: FontWeight.w700,
                  color: color,
                  height: 1.2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DeckFooter extends StatelessWidget {
  const _DeckFooter({required this.index, required this.total});

  final int index;
  final int total;

  @override
  Widget build(BuildContext context) {
    final last = index >= total - 1;
    final s = context.strings;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            last
                ? Icons.check_circle_outline_rounded
                : Icons.keyboard_arrow_up_rounded,
            size: 17,
            color: AppColors.inkTertiary,
          ),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              last ? s['lastStudent'] : s['swipeHint'],
              maxLines: 2,
              textAlign: TextAlign.center,
              style: context.localized(
                size: 10,
                color: AppColors.inkTertiary,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MoreOption extends StatelessWidget {
  const _MoreOption({
    required this.icon,
    required this.title,
    required this.color,
    required this.background,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final Color color;
  final Color background;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: background,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 13),
          child: Row(
            children: [
              Icon(icon, size: 19, color: color),
              const SizedBox(width: 10),
              Text(title, style: bnText(size: 13, weight: FontWeight.w600)),
              const Spacer(),
              Icon(Icons.chevron_right_rounded, size: 18, color: color),
            ],
          ),
        ),
      ),
    );
  }
}
