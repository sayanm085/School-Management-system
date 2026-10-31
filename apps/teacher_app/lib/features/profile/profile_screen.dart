import 'package:flutter/material.dart';

import '../../data/attendance_controller.dart';
import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../l10n/app_language.dart';
import '../../widgets/hazira_widgets.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({
    super.key,
    required this.seed,
    required this.onLogout,
    required this.onResetDemo,
  });

  final SeedData seed;
  final VoidCallback onLogout;
  final VoidCallback onResetDemo;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  int _refresh = 0;

  Future<void> _sync() async {
    final synced = await AttendanceController.syncNow();
    if (!mounted) return;
    setState(() => _refresh += 1);
    final s = context.strings;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            synced == 0
                ? s['allSynced']
                : '$synced ${s['syncedCount']}',
          ),
        ),
      );
  }

  Future<void> _confirmReset() async {
    final s = context.strings;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
        title: Text(
          s['resetTitle'],
          style: context.localized(
            size: 18,
            weight: FontWeight.w600,
          ),
        ),
        content: Text(
          s['resetBody'],
          style: context.localized(
            size: 12,
            color: AppColors.inkSecondary,
            height: 1.6,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(s['cancel']),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.redStrong,
            ),
            child: Text(s['reset']),
          ),
        ],
      ),
    );
    if (confirmed == true) widget.onResetDemo();
  }

  @override
  Widget build(BuildContext context) {
    final s = context.strings;
    final controller = context.languageController;
    final teacherName = context.isBengali
        ? widget.seed.teacher.nameBn
        : widget.seed.teacher.nameEn;
    final schoolName = context.isBengali
        ? widget.seed.school.nameBn
        : widget.seed.school.nameEn;
    final language = controller?.language ?? AppLanguage.english;

    return FutureBuilder<int>(
      key: ValueKey(_refresh),
      future: AttendanceController.pendingSyncCount(),
      builder: (context, snapshot) {
        final pending = snapshot.data ?? 0;
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          children: [
            Eyebrow(text: s['profile']),
            const SizedBox(height: 4),
            Text(
              s['yourAccount'],
              style: context.localized(
                size: 25,
                weight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              s['teacherAccount'],
              style: context.localized(
                size: 11,
                color: AppColors.inkSecondary,
              ),
            ),
            const SizedBox(height: 18),
            HaziraCard(
              padding: const EdgeInsets.all(18),
              child: Row(
                children: [
                  HaziraAvatar(
                    asset: widget.seed.teacher.avatarAsset,
                    size: 64,
                    borderColor: AppColors.blueTint,
                    borderWidth: 3,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          teacherName,
                          style: context.localized(
                            size: 18,
                            weight: FontWeight.w600,
                            height: 1.4,
                          ),
                        ),
                        Text(
                          widget.seed.teacher.designation,
                          style: context.localized(
                            size: 12,
                            color: AppColors.inkSecondary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.seed.teacher.employeeId,
                          style: latinText(
                            size: 10,
                            color: AppColors.inkTertiary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            HaziraCard(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const SchoolSeal(size: 40),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          schoolName,
                          style: context.localized(
                            size: 13,
                            weight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          '${widget.seed.school.district} · ${s['demo']}',
                          style: context.localized(
                            size: 10,
                            color: AppColors.inkSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  StatusChip(
                    label: s['demo'],
                    color: AppColors.blueText,
                    background: AppColors.blueTint,
                    dense: true,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Text(
              s['sync'],
              style: context.localized(
                size: 16,
                weight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            HaziraCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: pending > 0
                              ? AppColors.orangeTint
                              : AppColors.greenTint,
                          borderRadius: BorderRadius.circular(11),
                        ),
                        child: Icon(
                          pending > 0
                              ? Icons.cloud_upload_outlined
                              : Icons.cloud_done_outlined,
                          size: 17,
                          color: pending > 0
                              ? AppColors.orangeStrong
                              : AppColors.greenText,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              pending > 0
                                  ? '$pending ${s['pendingSync']}'
                                  : s['allSaved'],
                              style: context.localized(
                                size: 12,
                                weight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              s['demoSync'],
                              style: context.localized(
                                size: 10,
                                color: AppColors.inkSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: HaziraSecondaryButton(
                      label: s['syncNow'],
                      icon: Icons.sync_rounded,
                      onPressed: _sync,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Text(
              s['settings'],
              style: context.localized(
                size: 16,
                weight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            HaziraCard(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  _SettingRow(
                    icon: Icons.translate_rounded,
                    title: s['language'],
                    trailing: HaziraLanguageSwitch(
                      language: language,
                      onChanged: controller?.setLanguage,
                    ),
                  ),
                  const Divider(height: 1),
                  _SettingRow(
                    icon: Icons.light_mode_outlined,
                    title: s['appearance'],
                    value: s['light'],
                  ),
                  const Divider(height: 1),
                  _SettingRow(
                    icon: Icons.info_outline_rounded,
                    title: s['version'],
                    value: 'Hazira 0.1.0',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            HaziraCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: HaziraSecondaryButton(
                      label: s['resetDemo'],
                      icon: Icons.restart_alt_rounded,
                      onPressed: _confirmReset,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: TextButton(
                      onPressed: widget.onLogout,
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.redText,
                        minimumSize: const Size.fromHeight(48),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.logout_rounded, size: 17),
                          const SizedBox(width: 7),
                          Text(
                            s['logout'],
                            style: context.localized(
                              size: 13,
                              weight: FontWeight.w600,
                              color: AppColors.redText,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              s['privacyNote'],
              textAlign: TextAlign.center,
              style: context.localized(
                size: 9,
                color: AppColors.inkTertiary,
                height: 1.6,
              ),
            ),
          ],
        );
      },
    );
  }
}

class _SettingRow extends StatelessWidget {
  const _SettingRow({
    required this.icon,
    required this.title,
    this.value,
    this.trailing,
  });

  final IconData icon;
  final String title;
  final String? value;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 11),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.inkTertiary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              title,
              style: context.localized(
                size: 12,
                weight: FontWeight.w500,
              ),
            ),
          ),
          if (trailing != null)
            trailing!
          else
            Text(
              value ?? '',
              style: context.localized(
                size: 10,
                color: AppColors.inkSecondary,
              ),
            ),
        ],
      ),
    );
  }
}
