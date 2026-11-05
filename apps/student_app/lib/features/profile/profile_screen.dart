import 'package:flutter/material.dart';

import '../../data/demo_store.dart';
import '../../design/tokens.dart';
import '../../design/theme.dart';
import '../../l10n/strings.dart';
import '../../widgets/common.dart';
import '../../widgets/pressable.dart';
import '../login/login_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: languageNotifier,
      builder: (context, _) => _build(context),
    );
  }

  Widget _build(BuildContext context) {
    final t = T.of(currentLang);
    final data = DemoStore.instance.data;
    final s = data.student;
    final bill = data.currentBill;

    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
        children: [
          LargeTitle(
            title: currentLang == AppLang.en ? 'Profile' : 'প্রোফাইল',
            subtitleBn: currentLang == AppLang.en ? 'প্রোফাইল' : null),
          const SizedBox(height: 16),
          StaggerIn(
            index: 0,
            child: AppCard(
              child: Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                      color: AppColors.blueTint,
                      shape: BoxShape.circle,
                    ),
                    child: Text(s.nameBn.characters.first,
                        style: bnText(size: 22, weight: FontWeight.w700, color: AppColors.blue)),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(s.nameBn, style: bnText(size: 18, weight: FontWeight.w700)),
                        Text(s.nameEn, style: latinText(size: 14, color: AppColors.inkSecondary)),
                        const SizedBox(height: 4),
                        Text('${s.classLabel} · Roll ${s.rollNo}',
                            style: latinText(size: 14, weight: FontWeight.w600, color: AppColors.blue)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          StaggerIn(
            index: 1,
            child: AppCard(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
              child: Column(
                children: [
                  _Row(label: t.studentId, value: s.studentId),
                  const Divider(height: 1),
                  _Row(label: t.admissionNo, value: s.admissionNo),
                  const Divider(height: 1),
                  _Row(label: t.guardian, value: s.guardianName, bn: true),
                  const Divider(height: 1),
                  _Row(label: t.guardianPhone, value: s.guardianPhoneMasked),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          StaggerIn(
            index: 2,
            child: AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SectionHeader(
                    title: currentLang == AppLang.en ? 'Fees · ফি' : t.fees),
                  const SizedBox(height: 10),
                  if (bill == null)
                    Text(t.noBills,
                        style: bnText(size: 14, color: AppColors.inkTertiary))
                  else
                    Column(
                      children: [
                        for (final item in bill.items)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(item.nameEn,
                                      style: latinText(size: 15)),
                                ),
                                Text('₹ ${(item.amountPaise / 100).toStringAsFixed(0)}',
                                    style: latinText(size: 15, weight: FontWeight.w600)),
                              ],
                            ),
                          ),
                        const Divider(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: Text(bill.period, style: latinText(size: 14, color: AppColors.inkSecondary)),
                            ),
                            TintPill(
                              label: bill.isPaid
                                  ? t.paid
                                  : '${t.due} ₹ ${(bill.duePaise / 100).toStringAsFixed(0)} · ${bill.dueDate}',
                              background: bill.isPaid ? AppColors.greenTint : AppColors.orangeTint,
                              foreground: bill.isPaid ? AppColors.greenText : AppColors.orangeStrong,
                            ),
                          ],
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          StaggerIn(
            index: 3,
            child: AppCard(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
              child: Column(
                children: [
                  _ActionRow(
                    icon: Icons.campaign_outlined,
                    label: currentLang == AppLang.en ? 'Notices · নোটিশ' : t.notices,
                    detail: '${data.notices.length}',
                  ),
                  const Divider(height: 1),
                  _ActionRow(
                    icon: Icons.translate,
                    label: currentLang == AppLang.en ? 'Language · ভাষা' : t.language,
                    detail: currentLang == AppLang.en ? 'বাংলা' : 'English',
                    onTap: () => languageNotifier.value =
                        currentLang == AppLang.en ? AppLang.bn : AppLang.en,
                  ),
                  const Divider(height: 1),
                  _ActionRow(
                    icon: Icons.info_outline,
                    label: 'Baranda Vidyapith',
                    detail: t.demoMode,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          StaggerIn(
            index: 4,
            child: Pressable(
              onTap: () => Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
              ),
              child: Container(
                height: 52,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                  border: Border.all(color: AppColors.separator),
                ),
                child: Text(currentLang == AppLang.en ? 'Log out · লগ আউট' : t.logOut,
                    style: bnText(size: 16, weight: FontWeight.w600, color: AppColors.redText)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  final bool bn;
  const _Row({required this.label, required this.value, this.bn = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 13),
      child: Row(
        children: [
          Expanded(child: Text(label, style: latinText(size: 15, color: AppColors.inkSecondary))),
          Text(value,
              style: bn
                  ? bnText(size: 15, weight: FontWeight.w600)
                  : latinText(size: 15, weight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _ActionRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String detail;
  final VoidCallback? onTap;
  const _ActionRow({
    required this.icon,
    required this.label,
    required this.detail,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Row(
        children: [
          Icon(icon, size: 22, color: AppColors.inkSecondary),
          const SizedBox(width: 14),
          Expanded(child: Text(label, style: bnText(size: 15, weight: FontWeight.w600))),
          Text(detail, style: latinText(size: 14, color: AppColors.inkTertiary)),
          const SizedBox(width: 4),
          const Icon(Icons.chevron_right, color: AppColors.inkTertiary, size: 20),
        ],
      ),
      ),
    );
  }
}
