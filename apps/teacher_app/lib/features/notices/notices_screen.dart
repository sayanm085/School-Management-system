import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../l10n/app_language.dart';
import '../../widgets/hazira_widgets.dart';

class NoticesScreen extends StatelessWidget {
  const NoticesScreen({super.key, required this.seed});

  final SeedData seed;

  @override
  Widget build(BuildContext context) {
    final s = context.strings;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
      children: [
        Eyebrow(text: s['notices']),
        const SizedBox(height: 4),
        Text(
          s['noticesTitle'],
          style: context.localized(
            size: 25,
            weight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          s['noticesSubtitle'],
          style: context.localized(
            size: 11,
            color: AppColors.inkSecondary,
          ),
        ),
        const SizedBox(height: 18),
        for (final notice in seed.notices) ...[
          _NoticeCard(notice: notice),
          const SizedBox(height: 10),
        ],
        const SizedBox(height: 4),
        Text(
          s['noticesNote'],
          style: context.localized(
            size: 10,
            color: AppColors.inkTertiary,
            height: 1.5,
          ),
        ),
      ],
    );
  }
}

class _NoticeCard extends StatelessWidget {
  const _NoticeCard({required this.notice});

  final NoticeItem notice;

  @override
  Widget build(BuildContext context) {
    return HaziraCard(
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
                  color: AppColors.blueTint,
                  borderRadius: BorderRadius.circular(11),
                ),
                child: const Icon(
                  Icons.campaign_outlined,
                  size: 17,
                  color: AppColors.blue,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  notice.title,
                  style: latinText(size: 13, weight: FontWeight.w600),
                ),
              ),
              Text(
                formatShortDate(notice.publishedAt),
                style: latinText(
                  size: 9,
                  color: AppColors.inkTertiary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            context.isBengali ? notice.bodyBn : notice.bodyEn,
            style: context.localized(
              size: 12,
              color: AppColors.ink,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }
}
