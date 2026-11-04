import 'package:flutter/material.dart';

import '../../data/demo_store.dart';
import '../../data/models.dart';
import '../../design/tokens.dart';
import '../../design/theme.dart';
import '../../widgets/common.dart';
import '../../widgets/pressable.dart';
import '../tutor/tutor_screen.dart';

class SyllabusScreen extends StatelessWidget {
  const SyllabusScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final data = DemoStore.instance.data;
    final doneCount = data.examSyllabus.where((s) => s.done).length;

    return Scaffold(
      appBar: AppBar(title: const Text('Syllabus · সিলেবাস')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionHeader(title: "Today's classes · আজকের ক্লাস"),
                const SizedBox(height: 16),
                for (var i = 0; i < data.coverageToday.length; i++)
                  _TimelineRow(
                    index: i,
                    isLast: i == data.coverageToday.length - 1,
                    coverage: data.coverageToday[i],
                    periods: data.periodsFor('TUE'),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionHeader(title: 'Chapter progress · অধ্যায়'),
                const SizedBox(height: 16),
                for (final sp in data.chapterProgress)
                  for (final c in sp.chapters)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(c.nameEn,
                                    style: latinText(size: 15, weight: FontWeight.w600)),
                              ),
                              Text('${c.pct}%',
                                  style: latinText(size: 15, weight: FontWeight.w800)),
                            ],
                          ),
                          const SizedBox(height: 6),
                          ProgressBar(value: c.pct / 100),
                        ],
                      ),
                    ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SectionHeader(title: 'Exam syllabus · পরীক্ষার সিলেবাস'),
                const SizedBox(height: 4),
                Text('$doneCount of ${data.examSyllabus.length} topics done',
                    style: latinText(size: 13, color: AppColors.inkTertiary)),
                const SizedBox(height: 12),
                for (final s in data.examSyllabus)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 7),
                    child: Row(
                      children: [
                        AnimatedContainer(
                          duration: AppMotion.durationFast,
                          curve: AppMotion.easeOut,
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            color: s.done ? AppColors.blue : Colors.transparent,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: s.done ? AppColors.blue : AppColors.fillSecondary,
                              width: 2,
                            ),
                          ),
                          child: s.done
                              ? const Icon(Icons.check, color: Colors.white, size: 15)
                              : null,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            s.titleEn,
                            style: latinText(
                              size: 16,
                              color: s.done ? AppColors.ink : AppColors.inkSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 10),
                TintPill(
                  label: 'Half-Yearly · 14 Sep',
                  background: AppColors.orangeTint,
                  foreground: AppColors.orangeStrong,
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Pressable(
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => const TutorScreen(seedTopic: 'covered-today'),
              ),
            ),
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.blueTint,
                borderRadius: BorderRadius.circular(AppRadius.xl),
              ),
              child: Row(
                children: [
                  const Icon(Icons.auto_awesome, color: AppColors.blue, size: 22),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      "Didn't understand today's lesson? Ask Shikha · আজকের পাঠ বুঝি নি? শিখাকে জিজ্ঞাসা করো",
                      style: bnText(size: 14, weight: FontWeight.w600),
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: AppColors.blue),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TimelineRow extends StatelessWidget {
  final int index;
  final bool isLast;
  final CoveragePeriod coverage;
  final List<Period> periods;
  const _TimelineRow({
    required this.index,
    required this.isLast,
    required this.coverage,
    required this.periods,
  });

  @override
  Widget build(BuildContext context) {
    final period = periods
        .where((p) => p.period == coverage.period)
        .cast<Period?>()
        .firstWhere((_) => true, orElse: () => null);
    final start = period?.start ?? '--:--';
    final subjectEn = period?.subjectEn ?? coverage.subjectId;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 52,
            child: Text(start, style: latinText(size: 14, weight: FontWeight.w700)),
          ),
          Column(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: index == 1 ? AppColors.blue : AppColors.surface,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.blue, width: 2),
                ),
              ),
              if (!isLast)
                Expanded(child: Container(width: 2, color: AppColors.separator)),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: index == 1 ? AppColors.blueTint : AppColors.canvas,
                borderRadius: BorderRadius.circular(AppRadius.lg),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text('$subjectEn · ${coverage.room}',
                            style: latinText(size: 14, weight: FontWeight.w700)),
                      ),
                      if (index == 1)
                        TintPill(
                          label: 'Live · চলছে',
                          background: AppColors.orangeTint,
                          foreground: AppColors.orangeStrong,
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(coverage.coveredEn,
                      style: latinText(size: 13, color: AppColors.inkSecondary)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
