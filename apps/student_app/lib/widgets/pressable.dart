import 'package:flutter/material.dart';

import '../design/tokens.dart';

/// Press feedback for every tappable: scale 0.97 over 160 ms ease-out.
/// The interface should feel like it heard the touch.
class Pressable extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  const Pressable({super.key, required this.child, this.onTap});

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: widget.onTap == null
          ? null
          : (_) => setState(() => _down = true),
      onTapCancel: widget.onTap == null
          ? null
          : () => setState(() => _down = false),
      onTapUp: widget.onTap == null
          ? null
          : (_) => setState(() => _down = false),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _down ? 0.97 : 1,
        duration: AppMotion.durationPress,
        curve: AppMotion.easeOut,
        child: widget.child,
      ),
    );
  }
}

/// Entrance helper: cards appear from 0.96 + transparent, staggered.
/// Ease-out only; exits are faster than entrances; nothing blocks interaction.
class StaggerIn extends StatefulWidget {
  final Widget child;
  final int index;
  const StaggerIn({super.key, required this.child, this.index = 0});

  @override
  State<StaggerIn> createState() => _StaggerInState();
}

class _StaggerInState extends State<StaggerIn> {
  bool _shown = false;

  @override
  void initState() {
    super.initState();
    Future.delayed(Duration(milliseconds: 60 * widget.index.clamp(0, 6)), () {
      if (mounted) setState(() => _shown = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: _shown ? 1 : 0,
      duration: AppMotion.durationBase,
      curve: AppMotion.easeOut,
      child: AnimatedSlide(
        offset: _shown ? Offset.zero : const Offset(0, 0.02),
        duration: AppMotion.durationBase,
        curve: AppMotion.easeOut,
        child: widget.child,
      ),
    );
  }
}
