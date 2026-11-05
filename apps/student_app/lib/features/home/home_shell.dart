import 'package:flutter/material.dart';

import '../../design/tokens.dart';
import '../../design/theme.dart';
import '../../l10n/strings.dart';
import '../home/home_screen.dart';
import '../homework/homework_screen.dart';
import '../marks/marks_screen.dart';
import '../profile/profile_screen.dart';
import '../tutor/tutor_screen.dart';

/// Five tabs, never varying. The shell listens to the language notifier so a
/// switch rebuilds every tab in place.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const _screens = [
    HomeScreen(),
    HomeworkScreen(),
    TutorScreen(),
    MarksScreen(),
    ProfileScreen(),
  ];

  List<_TabSpec> _tabs(T t) => [
        _TabSpec(Icons.home_outlined, Icons.home, t.home),
        _TabSpec(Icons.checklist_outlined, Icons.checklist, t.homework),
        _TabSpec(Icons.school_outlined, Icons.school, t.tutor),
        _TabSpec(Icons.bar_chart_outlined, Icons.bar_chart, t.marks),
        _TabSpec(Icons.person_outlined, Icons.person, t.profile),
      ];

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: languageNotifier,
      builder: (context, _) {
        final t = T.of(currentLang);
        return Scaffold(
          extendBody: true,
          body: AnimatedSwitcher(
            duration: AppMotion.durationFast,
            switchInCurve: AppMotion.easeOut,
            switchOutCurve: AppMotion.easeOut,
            transitionBuilder: (child, animation) => FadeTransition(
              opacity: animation,
              child: child,
            ),
            child: KeyedSubtree(
              key: ValueKey('$_index-${currentLang.name}'),
              child: _screens[_index],
            ),
          ),
          bottomNavigationBar: _TabBar(
            tabs: _tabs(t),
            index: _index,
            onChanged: (i) => setState(() => _index = i),
          ),
        );
      },
    );
  }
}

class _TabSpec {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _TabSpec(this.icon, this.activeIcon, this.label);
}

/// Floating translucent pill pinned to the bottom. The container sizes itself;
/// a Center here would expand into the whole bottom slot and float mid-screen.
class _TabBar extends StatelessWidget {
  final List<_TabSpec> tabs;
  final int index;
  final ValueChanged<int> onChanged;
  const _TabBar({
    required this.tabs,
    required this.index,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.glassStrong,
          borderRadius: BorderRadius.circular(AppRadius.full),
          border: Border.all(color: AppColors.separator),
          boxShadow: const [
            BoxShadow(color: Color(0x14000000), blurRadius: 24, offset: Offset(0, 8)),
          ],
        ),
        child: Row(
          children: [
            for (var i = 0; i < tabs.length; i++)
              Expanded(
                child: _TabItem(
                  spec: tabs[i],
                  active: i == index,
                  onTap: () => onChanged(i),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _TabItem extends StatelessWidget {
  final _TabSpec spec;
  final bool active;
  final VoidCallback onTap;
  const _TabItem({
    required this.spec,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.blue : AppColors.inkTertiary;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedContainer(
        duration: AppMotion.durationFast,
        curve: AppMotion.easeOut,
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: active ? AppColors.blueTint : Colors.transparent,
          borderRadius: BorderRadius.circular(AppRadius.full),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedScale(
              scale: active ? 1.12 : 1.0,
              duration: AppMotion.durationPress,
              curve: AppMotion.easeOut,
              child: AnimatedSwitcher(
                duration: AppMotion.durationPress,
                switchInCurve: AppMotion.easeOut,
                child: Icon(
                  active ? spec.activeIcon : spec.icon,
                  key: ValueKey('$active-${spec.label}'),
                  color: color,
                  size: 22,
                ),
              ),
            ),
            const SizedBox(height: 2),
            Text(spec.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: latinText(
                    size: 11,
                    weight: active ? FontWeight.w700 : FontWeight.w500,
                    color: color)),
          ],
        ),
      ),
    );
  }
}
