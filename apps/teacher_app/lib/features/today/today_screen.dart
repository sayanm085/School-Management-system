import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../l10n/app_language.dart';
import '../../widgets/hazira_widgets.dart';

class TodayScreen extends StatefulWidget {
  const TodayScreen({
    super.key,
    required this.seed,
    required this.refreshToken,
    required this.onTakeAttendance,
    required this.onOpenRoster,
  });

  final SeedData seed;
  final int refreshToken;
  final VoidCallback onTakeAttendance;
  final VoidCallback onOpenRoster;

  @override
  State<TodayScreen> createState() => _TodayScreenState();
}

class _TodayScreenState extends State<TodayScreen> {
  static const _claimsKey = 'hazira.covers.claimed';
  Set<String> _claimed = {};

  @override
  void initState() {
    super.initState();
    _loadClaims();
  }

  Future<void> _loadClaims() async {
    final preferences = await SharedPreferences.getInstance();
    final ids = preferences.getStringList(_claimsKey) ?? const [];
    if (!mounted) return;
    setState(() => _claimed = ids.toSet());
  }

  Future<bool> _submitted() async {
    final preferences = await SharedPreferences.getInstance();
    return preferences.getBool('hazira.submitted.${widget.seed.section.id}') ??
        false;
  }

  Future<void> _claim(CoverBoardEntry entry) async {
    final next = {..._claimed, entry.entryId};
    setState(() => _claimed = next);
    final preferences = await SharedPreferences.getInstance();
    await preferences.setStringList(_claimsKey, next.toList());
    if (!mounted) return;
    final s = context.strings;
    final subject = context.isBengali
        ? entry.subjectNameBn
        : entry.subjectNameEn;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            '${s['classClaimed']} · ${entry.sectionLabel} $subject',
          ),
        ),
      );
  }

  Future<void> _openClaimSheet(CoverBoardEntry entry) async {
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ClaimSheet(entry: entry),
    );
    if (confirmed == true) {
      await _claim(entry);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = context.strings;
    final seed = widget.seed;
    final teacher = seed.teacher;
    final teacherName = context.isBengali ? teacher.nameBn : teacher.nameEn;
    final firstName = teacherName.split(' ').first;

    final currentOwn = _firstOrNull(
      seed.todayTimetable,
      (entry) => entry.period == seed.currentPeriod,
    );
    final currentClaimed = _firstOrNull(
      seed.coverBoard,
      (entry) =>
          entry.period == seed.currentPeriod &&
          _claimed.contains(entry.entryId),
    );
    final currentRequest = _firstOrNull(
      seed.coverBoard,
      (entry) =>
          entry.period == seed.currentPeriod &&
          entry.isUncovered &&
          entry.availableToAnanya &&
          !_claimed.contains(entry.entryId),
    );
    final laterRequests = seed.coverBoard
        .where(
          (entry) =>
              entry.isUncovered &&
              entry.availableToAnanya &&
              entry.period > seed.currentPeriod &&
              !_claimed.contains(entry.entryId),
        )
        .toList(growable: false);
    final claimedCovers = seed.coverBoard
        .where((entry) => _claimed.contains(entry.entryId))
        .toList(growable: false);

    return ListView(
      key: ValueKey(widget.refreshToken),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Eyebrow(text: s['todayLabel']),
                  const SizedBox(height: 4),
                  Text(
                    '${s['goodMorning']}, $firstName',
                    style: context.localized(size: 24, weight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${formatDateEn(SeedData.today)} · ${s['halfDay']}',
                    style: context.localized(
                      size: 11,
                      color: AppColors.inkSecondary,
                    ),
                  ),
                ],
              ),
            ),
            HaziraAvatar(
              asset: teacher.avatarAsset,
              size: 48,
              borderColor: AppColors.blueTint,
              borderWidth: 3,
            ),
          ],
        ),
        const SizedBox(height: 18),
        FutureBuilder<bool>(
          future: _submitted(),
          builder: (context, snapshot) {
            final submitted = snapshot.data ?? false;
            return _AttendanceHero(
              seed: seed,
              submitted: submitted,
              onTakeAttendance: widget.onTakeAttendance,
              onOpenRoster: widget.onOpenRoster,
            );
          },
        ),
        if (currentOwn == null || currentClaimed != null) ...[
          const SizedBox(height: 18),
          _CoverNowCard(
            seed: seed,
            currentClaimed: currentClaimed,
            currentRequest: currentRequest,
            laterRequests: laterRequests,
            onClaim: _openClaimSheet,
          ),
        ],
        const SizedBox(height: 18),
        Row(
          children: [
            Text(
              s['myDay'],
              style: context.localized(size: 16, weight: FontWeight.w600),
            ),
            const Spacer(),
            Text(
              s['myDaySubtitle'],
              style: context.localized(size: 10, color: AppColors.inkTertiary),
            ),
          ],
        ),
        const SizedBox(height: 10),
        HaziraCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              for (var index = 0; index < seed.periods.length; index += 1) ...[
                _DayRow(
                  seed: seed,
                  period: seed.periods[index],
                  entry: _firstOrNull(
                    seed.todayTimetable,
                    (item) => item.period == seed.periods[index].period,
                  ),
                  cover: _firstOrNull(
                    seed.coverBoard,
                    (item) =>
                        item.period == seed.periods[index].period &&
                        (item.availableToAnanya ||
                            _claimed.contains(item.entryId)),
                  ),
                  claimed: _claimed.contains(
                    _firstOrNull(
                          seed.coverBoard,
                          (item) =>
                              item.period == seed.periods[index].period &&
                              item.availableToAnanya,
                        )?.entryId ??
                        '',
                  ),
                  current: seed.periods[index].period == seed.currentPeriod,
                  onClaim: _openClaimSheet,
                ),
                if (index < seed.periods.length - 1) const Divider(height: 1),
              ],
            ],
          ),
        ),
        if (claimedCovers.isNotEmpty) ...[
          const SizedBox(height: 10),
          Text(
            s['coverSavedOnPhone'],
            style: context.localized(size: 10, color: AppColors.inkTertiary),
          ),
        ],
        const SizedBox(height: 18),
        Row(
          children: [
            Text(
              s['notices'],
              style: context.localized(size: 16, weight: FontWeight.w600),
            ),
            const Spacer(),
            Text(
              s['noticesSubtitle'],
              style: context.localized(size: 10, color: AppColors.inkTertiary),
            ),
          ],
        ),
        const SizedBox(height: 10),
        for (final notice in seed.notices.take(2)) ...[
          _NoticePreview(notice: notice),
          const SizedBox(height: 8),
        ],
        const SizedBox(height: 8),
        Row(
          children: [
            Container(
              width: 7,
              height: 7,
              decoration: const BoxDecoration(
                color: AppColors.greenStrong,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 7),
            Text(
              '${s['offlineReady']} · ${s['savedOnPhone']}',
              style: context.localized(size: 10, color: AppColors.inkSecondary),
            ),
          ],
        ),
      ],
    );
  }
}

class _CoverNowCard extends StatelessWidget {
  const _CoverNowCard({
    required this.seed,
    required this.currentClaimed,
    required this.currentRequest,
    required this.laterRequests,
    required this.onClaim,
  });

  final SeedData seed;
  final CoverBoardEntry? currentClaimed;
  final CoverBoardEntry? currentRequest;
  final List<CoverBoardEntry> laterRequests;
  final ValueChanged<CoverBoardEntry> onClaim;

  @override
  Widget build(BuildContext context) {
    final s = context.strings;
    final period = seed.periods.firstWhere(
      (item) => item.period == seed.currentPeriod,
      orElse: () => seed.periods.first,
    );
    final featured = currentClaimed ?? currentRequest;
    final isCovering = currentClaimed != null;
    final hasRequest = currentRequest != null && !isCovering;
    final subject = featured == null
        ? ''
        : context.isBengali
        ? featured.subjectNameBn
        : featured.subjectNameEn;
    final absent = featured == null
        ? ''
        : context.isBengali
        ? featured.absentTeacherNameBn
        : featured.absentTeacherNameEn;
    final showFooter = isCovering || hasRequest || laterRequests.isNotEmpty;

    return HaziraCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 0),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: AppColors.greenStrong,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  isCovering ? s['covering'] : s['freeNow'],
                  style: context.localized(
                    size: 12,
                    weight: FontWeight.w600,
                    color: AppColors.greenText,
                  ),
                ),
                const Spacer(),
                Text(
                  'P${period.period} · ${period.start}–${period.end}',
                  style: latinText(
                    size: 12,
                    weight: FontWeight.w500,
                    color: AppColors.inkTertiary,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 8, 18, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isCovering
                      ? '${featured?.sectionLabel ?? ''} · $subject'
                      : s['youAreFree'],
                  style: context.localized(
                    size: 21,
                    weight: FontWeight.w600,
                    height: 1.25,
                  ),
                ),
                if (hasRequest) ...[
                  const SizedBox(height: 12),
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      Text(
                        '${featured!.sectionLabel} · $subject',
                        style: context.localized(
                          size: 15,
                          weight: FontWeight.w600,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.orangeTint,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          s['needsCover'],
                          style: context.localized(
                            size: 11,
                            weight: FontWeight.w600,
                            color: AppColors.orangeStrong,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${s['room']} ${featured.room} · $absent · ${s['absent']}',
                    style: context.localized(
                      size: 12,
                      color: AppColors.inkSecondary,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: HaziraPrimaryButton(
                      label: s['takeThisClass'],
                      icon: Icons.hail_rounded,
                      height: 50,
                      onPressed: () => onClaim(featured),
                    ),
                  ),
                ] else if (isCovering) ...[
                  const SizedBox(height: 4),
                  Text(
                    '${s['room']} ${featured!.room} · ${s['coveredByYou']}',
                    style: context.localized(
                      size: 12,
                      color: AppColors.inkSecondary,
                      height: 1.5,
                    ),
                  ),
                ] else if (laterRequests.isEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    s['noCoverRequests'],
                    style: context.localized(
                      size: 13,
                      color: AppColors.inkSecondary,
                      height: 1.5,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (laterRequests.isNotEmpty) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 14, 18, 4),
              child: Text(
                s['laterToday'],
                style: context.localized(
                  size: 13,
                  weight: FontWeight.w600,
                  color: AppColors.inkSecondary,
                ),
              ),
            ),
            for (final entry in laterRequests)
              _LaterCoverRow(entry: entry, onClaim: () => onClaim(entry)),
            const SizedBox(height: 4),
          ],
          if (showFooter)
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 0, 18, 14),
              child: Text(
                s['coverSavedOnPhone'],
                style: context.localized(
                  size: 11,
                  color: AppColors.inkTertiary,
                  height: 1.5,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _LaterCoverRow extends StatelessWidget {
  const _LaterCoverRow({required this.entry, required this.onClaim});

  final CoverBoardEntry entry;
  final VoidCallback onClaim;

  @override
  Widget build(BuildContext context) {
    final s = context.strings;
    final subject = context.isBengali
        ? entry.subjectNameBn
        : entry.subjectNameEn;
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 2, 8, 2),
      child: Row(
        children: [
          SizedBox(
            width: 52,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'P${entry.period}',
                  style: latinText(
                    size: 12,
                    weight: FontWeight.w600,
                    color: AppColors.inkSecondary,
                  ),
                ),
                Text(
                  entry.start,
                  style: latinText(size: 11, color: AppColors.inkTertiary),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${entry.sectionLabel} · $subject',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: context.localized(size: 13, weight: FontWeight.w600),
                ),
                Text(
                  '${s['room']} ${entry.room}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: context.localized(
                    size: 11,
                    color: AppColors.inkSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 4),
          SizedBox(
            height: 44,
            child: TextButton(
              onPressed: onClaim,
              style: TextButton.styleFrom(
                foregroundColor: AppColors.blueText,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                minimumSize: const Size(44, 44),
              ),
              child: Text(
                s['claimCover'],
                style: latinText(
                  size: 13,
                  weight: FontWeight.w600,
                  color: AppColors.blueText,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DayRow extends StatelessWidget {
  const _DayRow({
    required this.seed,
    required this.period,
    required this.entry,
    required this.cover,
    required this.claimed,
    required this.current,
    required this.onClaim,
  });

  final SeedData seed;
  final PeriodInfo period;
  final TimetableEntry? entry;
  final CoverBoardEntry? cover;
  final bool claimed;
  final bool current;
  final ValueChanged<CoverBoardEntry> onClaim;

  @override
  Widget build(BuildContext context) {
    final s = context.strings;
    final subject = entry == null
        ? seed.subjectById(cover?.subjectId ?? '')
        : seed.subjectById(entry!.subjectId);
    final subjectName = subject == null
        ? ''
        : (context.isBengali ? subject.nameBn : subject.nameEn);
    final coverSubject = cover == null
        ? ''
        : context.isBengali
        ? cover!.subjectNameBn
        : cover!.subjectNameEn;
    final absent = cover == null
        ? ''
        : context.isBengali
        ? cover!.absentTeacherNameBn
        : cover!.absentTeacherNameEn;

    final bool teaching = entry != null;
    final bool needsCover =
        !teaching && cover != null && cover!.isUncovered && !claimed;
    final bool covering = claimed && cover != null;

    late final String title;
    late final String meta;
    late final Color tint;
    late final Color ink;

    if (teaching) {
      title = subjectName;
      meta =
          '${entry!.sectionId.replaceFirst('-', ' ')} · ${s['room']} ${entry!.room}';
      tint = AppColors.blueTint;
      ink = AppColors.blueText;
    } else if (covering) {
      title = coverSubject;
      meta = '${cover!.sectionLabel} · ${s['room']} ${cover!.room}';
      tint = AppColors.greenTint;
      ink = AppColors.greenText;
    } else if (needsCover) {
      title = '${cover!.sectionLabel} · $coverSubject';
      meta = '${s['room']} ${cover!.room} · $absent · ${s['absentTeacher']}';
      tint = AppColors.orangeTint;
      ink = AppColors.orangeStrong;
    } else {
      title = s['free'];
      meta = s['freePeriod'];
      tint = AppColors.fill;
      ink = AppColors.inkSecondary;
    }

    return Container(
      color: current ? AppColors.blueTint.withValues(alpha: 0.55) : null,
      padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 11),
      child: Row(
        children: [
          SizedBox(
            width: 42,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  period.start,
                  style: latinText(
                    size: 11,
                    weight: FontWeight.w600,
                    color: current ? AppColors.blueText : AppColors.inkTertiary,
                  ),
                ),
                Text(
                  'P${period.period}',
                  style: latinText(size: 8, color: AppColors.inkTertiary),
                ),
              ],
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: context.localized(
                    size: 12,
                    weight: FontWeight.w600,
                    height: 1.35,
                  ),
                ),
                Text(
                  current ? '${s['now']} · $meta' : meta,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: context.localized(
                    size: 9.5,
                    color: AppColors.inkSecondary,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          if (needsCover)
            GestureDetector(
              onTap: () => onClaim(cover!),
              child: StatusChip(
                label: s['needsCover'],
                color: AppColors.orangeStrong,
                background: AppColors.orangeTint,
                dense: true,
              ),
            )
          else
            StatusChip(
              label: teaching
                  ? s['teaching']
                  : covering
                  ? s['covering']
                  : s['free'],
              color: ink,
              background: tint,
              dense: true,
            ),
        ],
      ),
    );
  }
}

class _ClaimSheet extends StatelessWidget {
  const _ClaimSheet({required this.entry});

  final CoverBoardEntry entry;

  @override
  Widget build(BuildContext context) {
    final s = context.strings;
    final subject = context.isBengali
        ? entry.subjectNameBn
        : entry.subjectNameEn;
    final absent = context.isBengali
        ? entry.absentTeacherNameBn
        : entry.absentTeacherNameEn;
    return SafeArea(
      top: false,
      child: Container(
        margin: const EdgeInsets.all(8),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(28),
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
                  color: AppColors.separator,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: AppColors.greenTint,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.hail_rounded,
                    size: 20,
                    color: AppColors.greenText,
                  ),
                ),
                const SizedBox(width: 11),
                Expanded(
                  child: Text(
                    s['claimConfirmTitle'],
                    style: context.localized(size: 20, weight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.fill,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${entry.sectionLabel} · $subject',
                    style: context.localized(size: 14, weight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'P${entry.period} · ${entry.start}–${entry.end} · ${s['room']} ${entry.room}',
                    style: context.localized(
                      size: 11,
                      color: AppColors.inkSecondary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '$absent · ${s['absentTeacher']}',
                    style: context.localized(
                      size: 11,
                      color: AppColors.orangeStrong,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Text(
              s['claimConfirmBody'],
              style: context.localized(
                size: 12,
                color: AppColors.inkSecondary,
                height: 1.55,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              s['coverSavedOnPhone'],
              style: context.localized(
                size: 10,
                color: AppColors.inkTertiary,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.inkSecondary,
                      minimumSize: const Size(0, 52),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                      ),
                    ),
                    child: Text(
                      s['cancel'],
                      style: context.localized(
                        size: 14,
                        weight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: HaziraPrimaryButton(
                    label: s['claimCover'],
                    onPressed: () => Navigator.of(context).pop(true),
                    height: 52,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AttendanceHero extends StatelessWidget {
  const _AttendanceHero({
    required this.seed,
    required this.submitted,
    required this.onTakeAttendance,
    required this.onOpenRoster,
  });

  final SeedData seed;
  final bool submitted;
  final VoidCallback onTakeAttendance;
  final VoidCallback onOpenRoster;

  @override
  Widget build(BuildContext context) {
    final s = context.strings;
    return HaziraCard(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.blueTint,
                  borderRadius: BorderRadius.circular(13),
                ),
                child: const Icon(
                  Icons.fact_check_rounded,
                  size: 20,
                  color: AppColors.blue,
                ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      s['todayAttendance'],
                      style: context.localized(
                        size: 17,
                        weight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      '${s['todaysRegister']} · ${seed.section.label}',
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
                color: submitted ? AppColors.greenText : AppColors.orangeStrong,
                background: submitted
                    ? AppColors.greenTint
                    : AppColors.orangeTint,
                dense: true,
              ),
            ],
          ),
          const SizedBox(height: 15),
          Row(
            children: [
              _Stat(value: '${seed.students.length}', label: s['students']),
              const SizedBox(width: 22),
              _Stat(value: seed.section.label, label: s['classLabel']),
              const Spacer(),
              Text(
                submitted ? s['allMarked'] : s['start'],
                style: context.localized(
                  size: 11,
                  weight: FontWeight.w600,
                  color: submitted
                      ? AppColors.greenText
                      : AppColors.orangeStrong,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: HaziraPrimaryButton(
                  label: submitted ? s['reviewAgain'] : s['takeAttendance'],
                  icon: submitted
                      ? Icons.visibility_outlined
                      : Icons.swipe_down_rounded,
                  onPressed: onTakeAttendance,
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                width: 56,
                height: 56,
                child: OutlinedButton(
                  onPressed: onOpenRoster,
                  style: OutlinedButton.styleFrom(
                    padding: EdgeInsets.zero,
                    foregroundColor: AppColors.ink,
                    side: const BorderSide(color: AppColors.separator),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  child: const Icon(Icons.list_alt_rounded, size: 20),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: context.localized(size: 20, weight: FontWeight.w600),
        ),
        Text(
          label,
          style: context.localized(
            size: 10,
            color: AppColors.inkTertiary,
            height: 1.4,
          ),
        ),
      ],
    );
  }
}

class _NoticePreview extends StatelessWidget {
  const _NoticePreview({required this.notice});

  final NoticeItem notice;

  @override
  Widget build(BuildContext context) {
    return HaziraCard(
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: AppColors.orangeTint,
              borderRadius: BorderRadius.circular(11),
            ),
            child: const Icon(
              Icons.campaign_outlined,
              size: 17,
              color: AppColors.orangeStrong,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  notice.title,
                  style: context.localized(size: 12, weight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  context.isBengali ? notice.bodyBn : notice.bodyEn,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: context.localized(
                    size: 10,
                    color: AppColors.inkSecondary,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
          Text(
            formatShortDate(notice.publishedAt),
            style: latinText(size: 9, color: AppColors.inkTertiary),
          ),
        ],
      ),
    );
  }
}

T? _firstOrNull<T>(Iterable<T> items, bool Function(T item) test) {
  for (final item in items) {
    if (test(item)) return item;
  }
  return null;
}
