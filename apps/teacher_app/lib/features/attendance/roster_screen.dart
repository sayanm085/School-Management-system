import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../data/attendance_controller.dart';
import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../l10n/app_language.dart';
import '../../widgets/hazira_widgets.dart';
import 'attendance_deck_screen.dart';
import 'summary_screen.dart';

class RosterScreen extends StatefulWidget {
  const RosterScreen({super.key, required this.seed});

  final SeedData seed;

  @override
  State<RosterScreen> createState() => _RosterScreenState();
}

class _RosterScreenState extends State<RosterScreen> {
  late final Future<AttendanceController> _controllerFuture;

  @override
  void initState() {
    super.initState();
    _controllerFuture = AttendanceController.load(
      sectionId: widget.seed.section.id,
      students: widget.seed.students,
    );
  }

  Future<void> _openStatus(
    AttendanceController controller,
    Student student,
  ) async {
    final s = context.strings;
    final studentName =
        context.isBengali ? student.nameBn : student.nameEn;
    final current = controller.statusFor(student.id);
    final status = await showModalBottomSheet<AttendanceStatus>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => SafeArea(
        child: Container(
          margin: const EdgeInsets.all(12),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
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
              const SizedBox(height: 12),
              Text(
                studentName,
                style: context.localized(
                  size: 17,
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
              const SizedBox(height: 10),
              for (final option in AttendanceStatus.values)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                    option == AttendanceStatus.present
                        ? Icons.check_circle_outline_rounded
                        : option == AttendanceStatus.absent
                            ? Icons.cancel_outlined
                            : option == AttendanceStatus.late
                                ? Icons.schedule_rounded
                                : Icons.beach_access_outlined,
                    color: statusColor(option),
                  ),
                  title: Text(
                    context.isBengali ? option.labelBn : option.labelEn,
                    style: context.localized(
                      size: 13,
                      weight: FontWeight.w500,
                    ),
                  ),
                  trailing: current == option
                      ? const Icon(
                          Icons.check_rounded,
                          size: 18,
                          color: AppColors.blue,
                        )
                      : null,
                  onTap: () => Navigator.pop(context, option),
                ),
            ],
          ),
        ),
      ),
    );

    if (status != null) {
      HapticFeedback.selectionClick();
      controller.mark(student.id, status);
      if (!mounted) return;
      final statusLabel =
          context.isBengali ? status.labelBn : status.labelEn;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text('$studentName · $statusLabel'),
            action: SnackBarAction(
              label: s['undo'],
              textColor: AppColors.blue,
              onPressed: controller.undo,
            ),
          ),
        );
    }
  }

  void _openDeck() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => AttendanceDeckScreen(seed: widget.seed),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
            final s = context.strings;
            return ListenableBuilder(
              listenable: controller,
              builder: (context, _) {
                return Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 4, 16, 2),
                      child: Row(
                        children: [
                          IconButton(
                            onPressed: () => Navigator.of(context).pop(),
                            tooltip: 'Back',
                            icon: const Icon(
                              Icons.arrow_back_ios_new_rounded,
                              size: 18,
                            ),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  s['roster'],
                                  style: context.localized(
                                    size: 17,
                                    weight: FontWeight.w600,
                                  ),
                                ),
                                Text(
                                  '${widget.seed.section.label} · ${widget.seed.students.length} ${s['students']}',
                                  style: context.localized(
                                    size: 9,
                                    color: AppColors.inkSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: _openDeck,
                            style: TextButton.styleFrom(
                              foregroundColor: AppColors.blueText,
                              textStyle: context.localized(
                                size: 10,
                                weight: FontWeight.w600,
                              ),
                            ),
                            child: Text(s['swipeMode']),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: ListView(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
                        children: [
                          Text(
                            s['allStudents'],
                            style: context.localized(
                              size: 24,
                              weight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${controller.markedCount} / ${widget.seed.students.length} ${s['marked']} · ${s['tapToChange']}',
                            style: context.localized(
                              size: 10,
                              color: AppColors.inkSecondary,
                            ),
                          ),
                          const SizedBox(height: 14),
                          HaziraCard(
                            padding: EdgeInsets.zero,
                            child: Column(
                              children: [
                                for (var index = 0;
                                    index < widget.seed.students.length;
                                    index += 1) ...[
                                  _RosterRow(
                                    student: widget.seed.students[index],
                                    status: controller.statusFor(
                                      widget.seed.students[index].id,
                                    ),
                                    onTap: () => _openStatus(
                                      controller,
                                      widget.seed.students[index],
                                    ),
                                  ),
                                  if (index < widget.seed.students.length - 1)
                                    const Divider(height: 1),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),
                          SizedBox(
                            width: double.infinity,
                            child: HaziraPrimaryButton(
                              label: s['viewSummary'],
                              icon: Icons.summarize_outlined,
                              onPressed: controller.markedCount == 0
                                  ? null
                                  : () => Navigator.of(context).push(
                                        MaterialPageRoute<void>(
                                          builder: (_) => SummaryScreen(
                                            seed: widget.seed,
                                            controller: controller,
                                          ),
                                        ),
                                      ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            s['rosterHint'],
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
                );
              },
            );
          },
        ),
      ),
    );
  }
}

class _RosterRow extends StatelessWidget {
  const _RosterRow({
    required this.student,
    required this.status,
    required this.onTap,
  });

  final Student student;
  final AttendanceStatus? status;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final s = context.strings;
    final studentName =
        context.isBengali ? student.nameBn : student.nameEn;
    final statusLabel = status == null
        ? null
        : context.isBengali
            ? status!.labelBn
            : status!.labelEn;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            children: [
              HaziraAvatar(asset: student.avatarAsset, size: 38),
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
              if (status == null)
                StatusChip(
                  label: s['notMarked'],
                  color: AppColors.inkTertiary,
                  background: AppColors.fill,
                  dense: true,
                )
              else
                StatusChip(
                  label: statusLabel!,
                  color: statusColor(status!),
                  background: statusTint(status!),
                  dense: true,
                ),
              const SizedBox(width: 4),
              const Icon(
                Icons.chevron_right_rounded,
                size: 17,
                color: AppColors.inkTertiary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
