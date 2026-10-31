import 'package:flutter/material.dart';

import '../../data/attendance_controller.dart';
import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../l10n/app_language.dart';
import '../../widgets/hazira_widgets.dart';

class AttendanceHomeScreen extends StatelessWidget {
  const AttendanceHomeScreen({
    super.key,
    required this.seed,
    required this.refreshToken,
    required this.onStartAttendance,
    required this.onOpenRoster,
  });

  final SeedData seed;
  final int refreshToken;
  final VoidCallback onStartAttendance;
  final VoidCallback onOpenRoster;

  @override
  Widget build(BuildContext context) {
    final s = context.strings;
    return FutureBuilder<AttendanceController>(
      key: ValueKey(refreshToken),
      future: AttendanceController.load(
        sectionId: seed.section.id,
        students: seed.students,
      ),
      builder: (context, snapshot) {
        final controller = snapshot.data;
        final marked = controller?.markedCount ?? 0;
        final submitted = controller?.submitted ?? false;
        final total = seed.students.length;
        final progress = total == 0 ? 0.0 : marked / total;

        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Eyebrow(text: s['attendance']),
                      const SizedBox(height: 4),
                      Text(
                        s['todaysRegister'],
                        style: context.localized(
                          size: 25,
                          weight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${seed.section.label} · ${formatDateEn(SeedData.today)}',
                        style: context.localized(
                          size: 11,
                          color: AppColors.inkSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                ProgressRing(
                  value: progress,
                  size: 52,
                  stroke: 4,
                  color: submitted ? AppColors.green : AppColors.blue,
                  child: Text(
                    '$marked',
                    style: latinText(
                      size: 11,
                      weight: FontWeight.w600,
                      color:
                          submitted ? AppColors.greenText : AppColors.blueText,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            HaziraCard(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: AppColors.blueTint,
                          borderRadius: BorderRadius.circular(13),
                        ),
                        child: const Icon(
                          Icons.groups_2_outlined,
                          size: 21,
                          color: AppColors.blue,
                        ),
                      ),
                      const SizedBox(width: 11),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${seed.section.label} · ${s['classLabel']}',
                              style: context.localized(
                                size: 16,
                                weight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              '${seed.students.length} ${s['students']} · ${s['classTeacher']}',
                              style: context.localized(
                                size: 10,
                                color: AppColors.inkSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      StatusChip(
                        label: submitted ? s['submitted'] : s['incomplete'],
                        color: submitted
                            ? AppColors.greenText
                            : AppColors.orangeStrong,
                        background: submitted
                            ? AppColors.greenTint
                            : AppColors.orangeTint,
                        dense: true,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: progress,
                      minHeight: 6,
                      backgroundColor: AppColors.fill,
                      valueColor: AlwaysStoppedAnimation(
                        submitted ? AppColors.green : AppColors.blue,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Text(
                        '$marked / $total ${s['marked']}',
                        style: context.localized(
                          size: 10,
                          color: AppColors.inkSecondary,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        submitted ? s['complete'] : s['incomplete'],
                        style: context.localized(
                          size: 10,
                          color: submitted
                              ? AppColors.greenText
                              : AppColors.inkTertiary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: HaziraPrimaryButton(
                      label: submitted ? s['editAgain'] : s['startSwipe'],
                      icon: submitted
                          ? Icons.edit_outlined
                          : Icons.swipe_down_rounded,
                      onPressed: onStartAttendance,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: HaziraSecondaryButton(
                      label: s['viewRoster'],
                      icon: Icons.list_alt_rounded,
                      onPressed: onOpenRoster,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Text(
              s['howItWorks'],
              style: context.localized(
                size: 16,
                weight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            HaziraCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _HowRow(
                    icon: Icons.swipe_down_rounded,
                    title: s['swipeTitle'],
                    body: s['swipeBody'],
                  ),
                  const SizedBox(height: 14),
                  _HowRow(
                    icon: Icons.touch_app_outlined,
                    title: s['tapTitle'],
                    body: s['tapBody'],
                  ),
                  const SizedBox(height: 14),
                  _HowRow(
                    icon: Icons.cloud_done_outlined,
                    title: s['submitTitle'],
                    body: s['submitBody'],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                const Icon(
                  Icons.cloud_done_outlined,
                  size: 15,
                  color: AppColors.greenText,
                ),
                const SizedBox(width: 6),
                Text(
                  '${s['offlineReady']} · ${s['savedOnPhone']}',
                  style: context.localized(
                    size: 10,
                    color: AppColors.inkSecondary,
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );
  }
}

class _HowRow extends StatelessWidget {
  const _HowRow({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: AppColors.fill,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 16, color: AppColors.inkSecondary),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: context.localized(
                  size: 12,
                  weight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 1),
              Text(
                body,
                style: context.localized(
                  size: 10,
                  color: AppColors.inkSecondary,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
