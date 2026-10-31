import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../data/models.dart';
import '../../design/tokens.dart';
import '../../l10n/app_language.dart';
import '../attendance/attendance_deck_screen.dart';
import '../attendance/attendance_home_screen.dart';
import '../attendance/roster_screen.dart';
import '../notices/notices_screen.dart';
import '../profile/profile_screen.dart';
import '../today/today_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.seed,
    required this.onLogout,
    required this.onResetDemo,
  });

  final SeedData seed;
  final VoidCallback onLogout;
  final VoidCallback onResetDemo;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;
  int _refreshToken = 0;

  Future<void> _openDeck() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        fullscreenDialog: true,
        builder: (_) => AttendanceDeckScreen(seed: widget.seed),
      ),
    );
    if (mounted) setState(() => _refreshToken += 1);
  }

  Future<void> _openRoster() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => RosterScreen(seed: widget.seed),
      ),
    );
    if (mounted) setState(() => _refreshToken += 1);
  }

  @override
  Widget build(BuildContext context) {
    final tabs = [
      TodayScreen(
        seed: widget.seed,
        refreshToken: _refreshToken,
        onTakeAttendance: _openDeck,
        onOpenRoster: _openRoster,
      ),
      AttendanceHomeScreen(
        seed: widget.seed,
        refreshToken: _refreshToken,
        onStartAttendance: _openDeck,
        onOpenRoster: _openRoster,
      ),
      NoticesScreen(seed: widget.seed),
      ProfileScreen(
        seed: widget.seed,
        onLogout: widget.onLogout,
        onResetDemo: widget.onResetDemo,
      ),
    ];

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        body: SafeArea(
          bottom: false,
          child: IndexedStack(index: _index, children: tabs),
        ),
        bottomNavigationBar: _BottomBar(
          index: _index,
          onChanged: (value) => setState(() => _index = value),
        ),
      ),
    );
  }
}

class _BottomBar extends StatelessWidget {
  const _BottomBar({required this.index, required this.onChanged});

  final int index;
  final ValueChanged<int> onChanged;

  static const _items = [
    (Icons.today_outlined, Icons.today_rounded, 'today'),
    (Icons.fact_check_outlined, Icons.fact_check_rounded, 'attendance'),
    (Icons.notifications_none_rounded, Icons.notifications_rounded, 'notices'),
    (Icons.person_outline_rounded, Icons.person_rounded, 'profile'),
  ];

  @override
  Widget build(BuildContext context) {
    final strings = context.strings;
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.separator)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 62,
          child: Row(
            children: [
              for (var itemIndex = 0; itemIndex < _items.length; itemIndex += 1)
                Expanded(
                  child: _NavItem(
                    icon: _items[itemIndex].$1,
                    activeIcon: _items[itemIndex].$2,
                    label: strings[_items[itemIndex].$3],
                    active: itemIndex == index,
                    onTap: () => onChanged(itemIndex),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            curve: Curves.easeOut,
            width: 42,
            height: 26,
            decoration: BoxDecoration(
              color: active ? AppColors.blueTint : Colors.transparent,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Icon(
              active ? activeIcon : icon,
              size: 19,
              color: active ? AppColors.blue : AppColors.inkTertiary,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: context.localized(
              size: 9.5,
              weight: active ? FontWeight.w600 : FontWeight.w400,
              color: active ? AppColors.blueText : AppColors.inkTertiary,
              height: 1.2,
            ),
          ),
        ],
      ),
    );
  }
}
