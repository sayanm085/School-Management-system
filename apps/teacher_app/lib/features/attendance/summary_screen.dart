import 'package:flutter/material.dart';

import '../../data/attendance_controller.dart';
import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../l10n/app_language.dart';
import '../../widgets/hazira_widgets.dart';

class SummaryScreen extends StatefulWidget {
  const SummaryScreen({
    super.key,
    required this.seed,
    required this.controller,
  });

  final SeedData seed;
  final AttendanceController controller;

  @override
  State<SummaryScreen> createState() => _SummaryScreenState();
}

class _SummaryScreenState extends State<SummaryScreen> {
  bool _submitting = false;
  late bool _done;

  @override
  void initState() {
    super.initState();
    _done = widget.controller.submitted;
  }

  Future<void> _submit() async {
    if (widget.controller.markedCount < widget.seed.students.length) return;
    setState(() => _submitting = true);
    await widget.controller.submit();
    if (!mounted) return;
    setState(() {
      _submitting = false;
      _done = true;
    });
  }

  void _home() {
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.controller,
      builder: (context, _) {
        final s = context.strings;
        final total = widget.seed.students.length;
        final counts = widget.controller.counts;
        final marked = widget.controller.markedCount;
        final unmarked = total - marked;
        final absentees = widget.seed.students
            .where(
              (student) =>
                  widget.controller.statusFor(student.id) ==
                      AttendanceStatus.absent ||
                  widget.controller.statusFor(student.id) ==
                      AttendanceStatus.late ||
                  widget.controller.statusFor(student.id) ==
                      AttendanceStatus.leave,
            )
            .toList();

        return Scaffold(
          backgroundColor: AppColors.canvas,
          body: SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 4, 16, 2),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        tooltip: s['back'],
                        icon: const Icon(
                          Icons.arrow_back_ios_new_rounded,
                          size: 18,
                        ),
                      ),
                      Expanded(
                        child: Text(
                          s['summary'],
                          style: context.localized(
                            size: 17,
                            weight: FontWeight.w600,
                          ),
                        ),
                      ),
                      StatusChip(
                        label: _done ? s['submitted'] : s['draft'],
                        color: _done
                            ? AppColors.greenText
                            : AppColors.orangeStrong,
                        background:
                            _done ? AppColors.greenTint : AppColors.orangeTint,
                        dense: true,
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
                    children: [
                      Eyebrow(text: s['summary']),
                      const SizedBox(height: 4),
                      Text(
                        s['todayAttendance'],
                        style: context.localized(
                          size: 27,
                          weight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${widget.seed.section.label} · ${formatDateEn(SeedData.today)}',
                        style: latinText(
                          size: 11,
                          color: AppColors.inkSecondary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      HaziraCard(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                ProgressRing(
                                  value: total == 0 ? 0 : marked / total,
                                  size: 52,
                                  stroke: 4,
                                  color: _done
                                      ? AppColors.green
                                      : AppColors.blue,
                                  child: Text(
                                    '$marked',
                                    style: latinText(
                                      size: 11,
                                      weight: FontWeight.w600,
                                      color: _done
                                          ? AppColors.greenText
                                          : AppColors.blueText,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '$marked / $total ${s['marked']}',
                                        style: context.localized(
                                          size: 15,
                                          weight: FontWeight.w600,
                                        ),
                                      ),
                                      Text(
                                        unmarked == 0
                                            ? s['allStudentsMarked']
                                            : '$unmarked ${s['remaining']}',
                                        style: context.localized(
                                          size: 10,
                                          color: unmarked == 0
                                              ? AppColors.greenText
                                              : AppColors.orangeStrong,
                                          height: 1.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                _Count(
                                  value: counts[AttendanceStatus.present] ?? 0,
                                  label: s['present'],
                                  color: AppColors.greenText,
                                ),
                                _Count(
                                  value: counts[AttendanceStatus.absent] ?? 0,
                                  label: s['absent'],
                                  color: AppColors.redText,
                                ),
                                _Count(
                                  value: counts[AttendanceStatus.late] ?? 0,
                                  label: s['late'],
                                  color: AppColors.orangeStrong,
                                ),
                                _Count(
                                  value: counts[AttendanceStatus.leave] ?? 0,
                                  label: s['leave'],
                                  color: AppColors.inkSecondary,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      if (_done) ...[
                        const SizedBox(height: 12),
                        HaziraCard(
                          padding: const EdgeInsets.all(16),
                          color: AppColors.greenTint,
                          child: Row(
                            children: [
                              Container(
                                width: 38,
                                height: 38,
                                decoration: const BoxDecoration(
                                  color: AppColors.surface,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.cloud_done_outlined,
                                  size: 19,
                                  color: AppColors.greenText,
                                ),
                              ),
                              const SizedBox(width: 11),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      s['savedOffline'],
                                      style: context.localized(
                                        size: 12,
                                        weight: FontWeight.w600,
                                        color: AppColors.greenText,
                                      ),
                                    ),
                                    Text(
                                      '${s['savedOnPhone']} · ${s['sync']}',
                                      style: context.localized(
                                        size: 10,
                                        color: AppColors.greenText,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 18),
                      Text(
                        s['absentAndLeave'],
                        style: context.localized(
                          size: 16,
                          weight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 10),
                      if (absentees.isEmpty)
                        HaziraCard(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.check_circle_outline_rounded,
                                size: 20,
                                color: AppColors.greenText,
                              ),
                              const SizedBox(width: 9),
                              Text(
                                s['allPresent'],
                                style: context.localized(
                                  size: 12,
                                  color: AppColors.greenText,
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        HaziraCard(
                          padding: EdgeInsets.zero,
                          child: Column(
                            children: [
                              for (var index = 0;
                                  index < absentees.length;
                                  index += 1) ...[
                                _AbsenteeRow(
                                  student: absentees[index],
                                  status: widget.controller.statusFor(
                                    absentees[index].id,
                                  )!,
                                ),
                                if (index < absentees.length - 1)
                                  const Divider(height: 1),
                              ],
                            ],
                          ),
                        ),
                      if (unmarked > 0) ...[
                        const SizedBox(height: 12),
                        HaziraCard(
                          padding: const EdgeInsets.all(14),
                          color: AppColors.orangeTint,
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(
                                Icons.warning_amber_rounded,
                                size: 18,
                                color: AppColors.orangeStrong,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  s['mustMarkAll'],
                                  style: context.localized(
                                    size: 10,
                                    color: AppColors.orangeStrong,
                                    height: 1.55,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 18),
                      if (_done)
                        SizedBox(
                          width: double.infinity,
                          child: HaziraPrimaryButton(
                            label: s['home'],
                            icon: Icons.home_rounded,
                            onPressed: _home,
                          ),
                        )
                      else
                        SizedBox(
                          width: double.infinity,
                          child: HaziraPrimaryButton(
                            label: _submitting
                                ? s['submitting']
                                : s['submitAttendance'],
                            icon: Icons.cloud_upload_outlined,
                            onPressed: unmarked == 0 && !_submitting
                                ? _submit
                                : null,
                          ),
                        ),
                      const SizedBox(height: 10),
                      Text(
                        s['submitNote'],
                        textAlign: TextAlign.center,
                        style: context.localized(
                          size: 9,
                          color: AppColors.inkTertiary,
                          height: 1.6,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _Count extends StatelessWidget {
  const _Count({
    required this.value,
    required this.label,
    required this.color,
  });

  final int value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            '$value',
            style: latinText(size: 22, weight: FontWeight.w600, color: color),
          ),
          Text(
            label,
            style: context.localized(
              size: 9.5,
              color: AppColors.inkTertiary,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _AbsenteeRow extends StatelessWidget {
  const _AbsenteeRow({required this.student, required this.status});

  final Student student;
  final AttendanceStatus status;

  @override
  Widget build(BuildContext context) {
    final s = context.strings;
    final studentName =
        context.isBengali ? student.nameBn : student.nameEn;
    final statusLabel =
        context.isBengali ? status.labelBn : status.labelEn;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      child: Row(
        children: [
          HaziraAvatar(asset: student.avatarAsset, size: 36),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  studentName,
                  style: context.localized(
                    size: 13,
                    weight: FontWeight.w600,
                  ),
                ),
                Text(
                  '${s['roll']} ${student.rollNo}',
                  style: context.localized(
                    size: 10,
                    color: AppColors.inkSecondary,
                  ),
                ),
              ],
            ),
          ),
          StatusChip(
            label: statusLabel,
            color: statusColor(status),
            background: statusTint(status),
            dense: true,
          ),
        ],
      ),
    );
  }
}
