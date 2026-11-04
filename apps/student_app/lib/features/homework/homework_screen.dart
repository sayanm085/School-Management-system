import 'package:flutter/material.dart';

import '../../data/demo_store.dart';
import '../../data/models.dart';
import '../../design/tokens.dart';
import '../../design/theme.dart';
import '../../widgets/common.dart';
import '../../widgets/pressable.dart';
import '../tutor/tutor_screen.dart';

class HomeworkScreen extends StatefulWidget {
  const HomeworkScreen({super.key});

  @override
  State<HomeworkScreen> createState() => _HomeworkScreenState();
}

class _Segment {
  final String label;
  const _Segment(this.label);
}

class _HomeworkScreenState extends State<HomeworkScreen> {
  int _segment = 0;
  static const _segments = [_Segment('Due today'), _Segment('This week'), _Segment('Done')];

  static const _today = '2026-11-03';
  static const _weekEnd = '2026-11-09';

  List<HomeworkItem> _bucket() {
    final data = DemoStore.instance.data;
    switch (_segment) {
      case 0:
        return data.homework.where((h) => !h.done && h.due == _today).toList();
      case 1:
        return data.homework
            .where((h) => !h.done && h.due.compareTo(_today) > 0 && h.due.compareTo(_weekEnd) <= 0)
            .toList()
          ..sort((a, b) => a.due.compareTo(b.due));
      default:
        return data.homework.where((h) => h.done).toList()
          ..sort((a, b) => b.due.compareTo(a.due));
    }
  }

  Future<void> _toggle(HomeworkItem h) async {
    setState(() => h.done = !h.done);
  }

  @override
  Widget build(BuildContext context) {
    final data = DemoStore.instance.data;
    final items = _bucket();
    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
        children: [
          const LargeTitle(title: 'Homework', subtitleBn: 'হোমওয়ার্ক'),
          const SizedBox(height: 16),
          _SegmentedControl(
            segments: _segments.map((s) => s.label).toList(),
            index: _segment,
            onChanged: (i) => setState(() => _segment = i),
          ),
          const SizedBox(height: 16),
          if (items.isEmpty)
            AppCard(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Text(
                    _segment == 2 ? 'Nothing done yet · এখনো হয়নি' : 'All clear · সব ঠিক আছে',
                    style: bnText(size: 15, color: AppColors.inkTertiary),
                  ),
                ),
              ),
            )
          else
            ...List.generate(items.length, (i) {
              final h = items[i];
              return Padding(
                padding: EdgeInsets.only(bottom: i == items.length - 1 ? 0 : 12),
                child: StaggerIn(index: i, child: _HomeworkCard(item: h, onToggle: _toggle)),
              );
            }),
          const SizedBox(height: 18),
          StaggerIn(index: 4, child: _CoveredTodayCard(coverage: data.coverageToday)),
        ],
      ),
    );
  }
}

class _SegmentedControl extends StatelessWidget {
  final List<String> segments;
  final int index;
  final ValueChanged<int> onChanged;
  const _SegmentedControl({
    required this.segments,
    required this.index,
    required this.onChanged,
  });

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
          for (var i = 0; i < segments.length; i++)
            Expanded(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => onChanged(i),
                child: AnimatedContainer(
                  duration: AppMotion.durationFast,
                  curve: AppMotion.easeOut,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: i == index ? AppColors.surface : Colors.transparent,
                    borderRadius: BorderRadius.circular(AppRadius.full),
                    boxShadow: i == index
                        ? const [BoxShadow(color: Color(0x14000000), blurRadius: 8, offset: Offset(0, 2))]
                        : null,
                  ),
                  child: Text(
                    segments[i],
                    maxLines: 1,
                    style: latinText(
                      size: 14,
                      weight: i == index ? FontWeight.w700 : FontWeight.w500,
                      color: i == index ? AppColors.ink : AppColors.inkSecondary,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _HomeworkCard extends StatelessWidget {
  final HomeworkItem item;
  final ValueChanged<HomeworkItem> onToggle;
  const _HomeworkCard({required this.item, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    final dueLabel = item.due == '2026-11-03'
        ? 'Due today · আজ'
        : item.due == '2026-11-04'
            ? 'Tomorrow · কাল'
            : item.done
                ? 'Done · সম্পন্ন'
                : item.due;
    final (bg, fg) = item.done
        ? (AppColors.greenTint, AppColors.greenText)
        : item.due == '2026-11-03'
            ? (AppColors.orangeTint, AppColors.orangeStrong)
            : (AppColors.blueTint, AppColors.blue);

    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.blueTint,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: const Icon(Icons.menu_book_outlined, color: AppColors.blue, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.titleEn,
                  style: latinText(
                    size: 16,
                    weight: FontWeight.w600,
                    color: item.done ? AppColors.inkTertiary : AppColors.ink,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 6),
                TintPill(label: dueLabel, background: bg, foreground: fg),
              ],
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () => onToggle(item),
            child: AnimatedContainer(
              duration: AppMotion.durationFast,
              curve: AppMotion.easeOut,
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: item.done ? AppColors.greenStrong : Colors.transparent,
                shape: BoxShape.circle,
                border: Border.all(
                  color: item.done ? AppColors.greenStrong : AppColors.fillSecondary,
                  width: 2,
                ),
              ),
              child: item.done
                  ? const Icon(Icons.check, color: Colors.white, size: 18)
                  : null,
            ),
          ),
        ],
      ),
    );
  }
}

class _CoveredTodayCard extends StatelessWidget {
  final List<CoveragePeriod> coverage;
  const _CoveredTodayCard({required this.coverage});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.blueTint,
        borderRadius: BorderRadius.circular(AppRadius.xl),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_stories_outlined, color: AppColors.blue, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text('Covered today · আজ কভার হয়েছে',
                    style: bnText(size: 15, weight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (coverage.isEmpty)
            Text('School day not started yet · স্কুল এখনো শুরু হয়নি',
                style: bnText(size: 14, color: AppColors.inkSecondary))
          else
            for (final c in coverage)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('P${c.period}', style: latinText(size: 13, weight: FontWeight.w700, color: AppColors.blue)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(c.coveredBn, style: bnText(size: 14, color: AppColors.inkSecondary)),
                    ),
                  ],
                ),
              ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: Pressable(
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const TutorScreen(seedTopic: 'covered-today')),
              ),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Text('Ask the Tutor',
                    style: latinText(size: 14, weight: FontWeight.w700, color: AppColors.blue)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
