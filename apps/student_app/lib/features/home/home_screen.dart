import 'package:flutter/material.dart';

import '../../data/demo_store.dart';
import '../../data/models.dart';
import '../../design/tokens.dart';
import '../../design/theme.dart';
import '../../design/subjects.dart';
import '../../l10n/strings.dart';
import '../../widgets/common.dart';
import '../../widgets/pressable.dart';
import '../syllabus/syllabus_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  String get _today => _weekdayOf(DateTime.now());

  static String _weekdayOf(DateTime d) =>
      const ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][d.weekday - 1];

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
    final bill = data.currentBill;
    final exam = data.nextExam;
    final todayPeriods = data.periodsFor(_today);

    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
        children: [
          _Header(student: data.student),
          const SizedBox(height: 20),
          LargeTitle(title: t.today, subtitleBn: currentLang == AppLang.en ? 'আজ' : null),
          const SizedBox(height: 16),
          StaggerIn(
            index: 0,
            child: _AttendanceCard(pct: data.attendancePct, days: data.attendanceDays),
          ),
          const SizedBox(height: 14),
          StaggerIn(
            index: 1,
            child: _FeesExamCard(bill: bill, exam: exam),
          ),
          const SizedBox(height: 14),
          StaggerIn(
            index: 2,
            child: AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SectionHeader(
                    title: currentLang == AppLang.en ? "Today's classes · আজকের ক্লাস" : t.todaysClasses,
                    actionLabel: t.seeAll,
                    onAction: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const SyllabusScreen()),
                    ),
                  ),
                  const SizedBox(height: 14),
                  if (todayPeriods.isEmpty)
                    Text(currentLang == AppLang.en ? 'No classes today · আজ ক্লাস নেই' : t.noClasses,
                        style: bnText(size: 15, color: AppColors.inkTertiary))
                  else
                    SizedBox(
                      height: 116,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: todayPeriods.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 10),
                        itemBuilder: (context, i) => _ClassChip(period: todayPeriods[i]),
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (data.notices.isNotEmpty) ...[
            const SizedBox(height: 14),
            StaggerIn(
              index: 3,
              child: _NoticeCard(
                title: data.notices.first.title,
                body: data.notices.first.bodyBn,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final DemoStudent student;
  const _Header({required this.student});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          alignment: Alignment.center,
          decoration: const BoxDecoration(
            color: AppColors.blueTint,
            shape: BoxShape.circle,
          ),
          child: Text(
            student.nameBn.characters.first,
            style: bnText(size: 17, weight: FontWeight.w700, color: AppColors.blue),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('হ্যালো, ${student.nameBn}',
                  style: bnText(size: 18, weight: FontWeight.w700)),
              Text('${student.classLabel} · Roll ${student.rollNo}',
                  style: latinText(size: 14, color: AppColors.inkSecondary)),
            ],
          ),
        ),
        IconButton(
          onPressed: () {},
          icon: const Icon(Icons.notifications_outlined, color: AppColors.inkSecondary),
        ),
      ],
    );
  }
}

class _AttendanceCard extends StatelessWidget {
  final int pct;
  final List<AttendanceDay> days;
  const _AttendanceCard({required this.pct, required this.days});

  @override
  Widget build(BuildContext context) {
    final absences = days.where((d) => d.status != 'present').length;
    return AppCard(
      child: Row(
        children: [
          ProgressRing(
            value: pct / 100,
            size: 96,
            stroke: 10,
            center: TweenAnimationBuilder<int>(
              tween: IntTween(begin: 0, end: pct),
              duration: AppMotion.durationSlow,
              curve: AppMotion.easeOut,
              builder: (_, v, _) => Text('$v%',
                  style: latinText(size: 24, weight: FontWeight.w800, letterSpacing: -0.5)),
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(currentLang == AppLang.en ? 'Attendance · উপস্থিতি' : 'উপস্থিতি', style: bnText(size: 16, weight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(currentLang == AppLang.en ? 'This term · এই শিক্ষাবর্ষ' : 'এই শিক্ষাবর্ষ',
                    style: bnText(size: 14, color: AppColors.inkSecondary)),
                const SizedBox(height: 10),
                if (absences > 0)
                  TintPill(
                    label: currentLang == AppLang.en
                        ? '$absences days missed'
                        : T.of(currentLang).daysMissed(absences),
                    background: AppColors.orangeTint,
                    foreground: AppColors.orangeStrong,
                  )
                else
                  TintPill(
                    label: currentLang == AppLang.en ? 'Perfect · চমৎকার' : T.of(currentLang).perfect,
                    background: AppColors.greenTint,
                    foreground: AppColors.greenText,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FeesExamCard extends StatelessWidget {
  final Bill? bill;
  final Exam? exam;
  const _FeesExamCard({required this.bill, required this.exam});

  String get _amount {
    final paise = bill?.duePaise ?? bill?.totalPaise ?? 0;
    final rupees = paise / 100;
    return rupees == rupees.roundToDouble()
        ? '₹ ${rupees.toStringAsFixed(0)}'
        : '₹ ${rupees.toStringAsFixed(2)}';
  }

  int get _daysToExam {
    if (exam == null) return 0;
    final d = DateTime.tryParse(exam!.startDate);
    if (d == null) return 0;
    return d.difference(DateTime.now()).inDays;
  }

  @override
  Widget build(BuildContext context) {
    final paid = bill == null || bill!.isPaid;
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      child: IntrinsicHeight(
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(currentLang == AppLang.en ? 'Fees · ফি' : 'ফি', style: bnText(size: 14, color: AppColors.inkSecondary)),
                  const SizedBox(height: 8),
                  TintPill(
                    label: currentLang == AppLang.en ? (paid ? 'Paid ✓ · পরিশোধিত' : 'Due · বকেয়া') : (paid ? 'পরিশোধিত ✓' : 'বকেয়া'),
                    background: paid ? AppColors.greenTint : AppColors.orangeTint,
                    foreground: paid ? AppColors.greenText : AppColors.orangeStrong,
                  ),
                  const SizedBox(height: 8),
                  Text(_amount, style: latinText(size: 22, weight: FontWeight.w800)),
                  if (!paid && bill != null)
                    Text('${T.of(currentLang).by} ${bill!.dueDate}', style: latinText(size: 13, color: AppColors.inkTertiary)),
                ],
              ),
            ),
            const VerticalDivider(width: 32),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(currentLang == AppLang.en ? 'Next exam · পরীক্ষা' : 'পরীক্ষা', style: bnText(size: 14, color: AppColors.inkSecondary)),
                  const SizedBox(height: 8),
                  TintPill(
                    label: _daysToExam > 0
                        ? (currentLang == AppLang.en ? '$_daysToExam days' : T.of(currentLang).daysToExam(_daysToExam))
                        : (currentLang == AppLang.en ? 'Now' : T.of(currentLang).examNow),
                    background: AppColors.blueTint,
                    foreground: AppColors.blue,
                  ),
                  const SizedBox(height: 8),
                  Text(exam?.name ?? '—',
                      style: latinText(size: 16, weight: FontWeight.w700)),
                  if (exam != null)
                    Text(exam!.startDate, style: latinText(size: 13, color: AppColors.inkTertiary)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ClassChip extends StatelessWidget {
  final Period period;
  const _ClassChip({required this.period});

  @override
  Widget build(BuildContext context) {
    final sc = subjectColors(period.subjectId);
    return Container(
      width: 128,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.canvas,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.separator),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: sc.tint,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Icon(subjectIcon(period.subjectId), color: sc.strong, size: 20),
          ),
          const Spacer(),
          Text(subjectTitle(period),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: latinText(size: 14, weight: FontWeight.w700)),
          const SizedBox(height: 2),
          Text('${period.start} · ${period.room}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: latinText(size: 12, color: AppColors.inkTertiary)),
        ],
      ),
    );
  }
}

class _NoticeCard extends StatelessWidget {
  final String title;
  final String body;
  const _NoticeCard({required this.title, required this.body});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      color: AppColors.surface,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.orangeTint,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: const Icon(Icons.campaign_outlined, color: AppColors.orangeStrong, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: latinText(size: 15, weight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(body, style: bnText(size: 14, color: AppColors.inkSecondary)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
