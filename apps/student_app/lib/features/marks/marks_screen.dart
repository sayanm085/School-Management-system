import 'package:flutter/material.dart';

import '../../data/demo_store.dart';
import '../../data/models.dart';
import '../../design/tokens.dart';
import '../../design/theme.dart';
import '../../widgets/common.dart';
import '../../widgets/pressable.dart';

class MarksScreen extends StatelessWidget {
  const MarksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final data = DemoStore.instance.data;
    final marks = data.marks.toList()
      ..sort((a, b) => b.pct.compareTo(a.pct));

    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
        children: [
          const LargeTitle(title: 'Performance', subtitleBn: 'পারফরম্যান্স'),
          const SizedBox(height: 16),
          _TermControl(),
          const SizedBox(height: 16),
          StaggerIn(
            index: 0,
            child: AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SectionHeader(title: 'Score trend · স্কোর'),
                  const SizedBox(height: 12),
                  TrendChart(points: data.scoreTrend),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          StaggerIn(
            index: 1,
            child: AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SectionHeader(title: 'Subjects · বিষয়'),
                  const SizedBox(height: 16),
                  for (var i = 0; i < marks.length; i++) ...[
                    _SubjectRow(mark: marks[i]),
                    if (i != marks.length - 1) const SizedBox(height: 14),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          StaggerIn(
            index: 2,
            child: AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SectionHeader(title: 'Mock tests · মক টেস্ট'),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      for (var i = 0; i < data.mocks.length; i++) ...[
                        if (i > 0) const SizedBox(width: 12),
                        Expanded(child: _MockTile(mock: data.mocks[i])),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TermControl extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: AppColors.fill,
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Row(
        children: [
          Expanded(
            child: Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(AppRadius.full),
                boxShadow: const [
                  BoxShadow(color: Color(0x14000000), blurRadius: 8, offset: Offset(0, 2)),
                ],
              ),
              child: Text('Half-Yearly', style: latinText(size: 14, weight: FontWeight.w700)),
            ),
          ),
          Expanded(
            child: Center(
              child: Text('Annual',
                  style: latinText(size: 14, weight: FontWeight.w500, color: AppColors.inkSecondary)),
            ),
          ),
        ],
      ),
    );
  }
}

class _SubjectRow extends StatelessWidget {
  final ExamMark mark;
  const _SubjectRow({required this.mark});

  @override
  Widget build(BuildContext context) {
    final good = mark.pct >= 70;
    final color = good ? AppColors.blue : AppColors.orange;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(mark.subjectEn,
                  style: latinText(size: 15, weight: FontWeight.w600)),
            ),
            Text('${mark.total}/${mark.maxMarks}',
                style: latinText(size: 15, weight: FontWeight.w800)),
            const SizedBox(width: 8),
            Text('${mark.pct}%',
                style: latinText(
                  size: 13,
                  weight: FontWeight.w700,
                  color: good ? AppColors.greenText : AppColors.orangeStrong,
                )),
          ],
        ),
        const SizedBox(height: 6),
        ProgressBar(value: mark.pct / 100, color: color),
      ],
    );
  }
}

class _MockTile extends StatelessWidget {
  final MockTest mock;
  const _MockTile({required this.mock});

  @override
  Widget build(BuildContext context) {
    final weak = mock.scorePct < 70;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.canvas,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.separator),
      ),
      child: Column(
        children: [
          ProgressRing(
            value: mock.scorePct / 100,
            size: 76,
            stroke: 8,
            color: weak ? AppColors.orange : AppColors.blue,
            center: Text('${mock.scorePct}%',
                style: latinText(size: 18, weight: FontWeight.w800)),
          ),
          const SizedBox(height: 10),
          Text(mock.topicEn,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: latinText(size: 13, weight: FontWeight.w700)),
          const SizedBox(height: 4),
          if (weak)
            TintPill(
              label: 'Practice suggested',
              background: AppColors.orangeTint,
              foreground: AppColors.orangeStrong,
            )
          else
            TintPill(
              label: 'Good going',
              background: AppColors.greenTint,
              foreground: AppColors.greenText,
            ),
        ],
      ),
    );
  }
}
