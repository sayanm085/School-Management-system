import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../data/demo_store.dart';
import '../../design/tokens.dart';
import '../../design/theme.dart';
import '../../widgets/common.dart';
import '../../widgets/pressable.dart';
import '../home/home_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _id = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    final store = DemoStore.instance;
    if (!store.login(_id.text, _password.text)) {
      setState(() => _error = 'Wrong Student ID or password · ভুল আইডি বা পাসওয়ার্ড');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    await store.load();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (_, _, _) => const HomeShell(),
        transitionsBuilder: (_, animation, _, child) => FadeTransition(
          opacity: CurvedAnimation(parent: animation, curve: AppMotion.easeOut),
          child: child,
        ),
        transitionDuration: AppMotion.durationBase,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              shrinkWrap: true,
              children: [
                const SizedBox(height: 40),
                const _Seal(size: 72),
                const SizedBox(height: 16),
                Center(
                  child: Text('Baranda',
                      style: latinText(size: 30, weight: FontWeight.w800, letterSpacing: -0.8)),
                ),
                const SizedBox(height: 4),
                Center(
                  child: Text('শিক্ষার্থী অ্যাপ · Student App',
                      style: bnText(size: 15, color: AppColors.inkSecondary)),
                ),
                const SizedBox(height: 48),
                Text('Log in', style: latinText(size: 30, weight: FontWeight.w800, letterSpacing: -0.8)),
                const SizedBox(height: 16),
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(AppRadius.xl),
                    boxShadow: cardShadow,
                  ),
                  child: Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 16, 20, 14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Student ID',
                                style: latinText(size: 15, color: AppColors.inkSecondary)),
                            const SizedBox(height: 4),
                            TextField(
                              controller: _id,
                              textInputAction: TextInputAction.next,
                              style: latinText(size: 17),
                              decoration: const InputDecoration(
                                fillColor: AppColors.surface,
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                contentPadding: EdgeInsets.zero,
                                hintText: 'STU-2026-…',
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Divider(height: 1, indent: 20, endIndent: 20),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Password',
                                style: latinText(size: 15, color: AppColors.inkSecondary)),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _password,
                                    obscureText: _obscure,
                                    onSubmitted: (_) => _submit(),
                                    style: latinText(size: 17),
                                    decoration: const InputDecoration(
                                      fillColor: AppColors.surface,
                                      border: InputBorder.none,
                                      enabledBorder: InputBorder.none,
                                      focusedBorder: InputBorder.none,
                                      contentPadding: EdgeInsets.zero,
                                    ),
                                  ),
                                ),
                                IconButton(
                                  onPressed: () => setState(() => _obscure = !_obscure),
                                  icon: Icon(
                                    _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                    color: AppColors.blue,
                                    size: 22,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, textAlign: TextAlign.center, style: bnText(size: 14, color: AppColors.redText)),
                ],
                const SizedBox(height: 24),
                Pressable(
                  onTap: _busy ? null : _submit,
                  child: Container(
                    height: 54,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppColors.blue,
                      borderRadius: BorderRadius.circular(AppRadius.full),
                    ),
                    child: _busy
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              valueColor: AlwaysStoppedAnimation(Colors.white),
                            ),
                          )
                        : Text('Log in · লগ ইন',
                            style: bnText(size: 17, weight: FontWeight.w700, color: Colors.white)),
                  ),
                ),
                const SizedBox(height: 16),
                Center(
                  child: Text(
                    'Use the ID given by your school · স্কুল দেওয়া আইডি ব্যবহার করুন',
                    textAlign: TextAlign.center,
                    style: bnText(size: 14, color: AppColors.inkTertiary),
                  ),
                ),
                const SizedBox(height: 12),
                Center(
                  child: TintPill(
                    label: 'Demo · $DemoStore.demoStudentId / ${DemoStore.demoPassword}',
                    background: AppColors.orangeTint,
                    foreground: AppColors.orangeStrong,
                  ),
                ),
                const SizedBox(height: 40),
                Center(
                  child: Text('Baranda Vidyapith · WB-NAB-001',
                      style: latinText(size: 13, color: AppColors.inkTertiary)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// School seal drawn from the app's own seal tokens (navy shield, gold trim,
/// torch and open book) so no external asset is needed for v1.
class _Seal extends StatelessWidget {
  final double size;
  const _Seal({required this.size});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _SealPainter()),
    );
  }
}

class _SealPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, h = size.height;
    final shield = Path()
      ..moveTo(w * 0.5, h * 0.02)
      ..lineTo(w * 0.92, h * 0.14)
      ..lineTo(w * 0.92, h * 0.55)
      ..quadraticBezierTo(w * 0.92, h * 0.85, w * 0.5, h * 0.98)
      ..quadraticBezierTo(w * 0.08, h * 0.85, w * 0.08, h * 0.55)
      ..lineTo(w * 0.08, h * 0.14)
      ..close();

    canvas.drawShadow(shield, const Color(0x33000000), 4, false);
    canvas.drawPath(shield, Paint()..color = AppColors.sealNavy);

    final trim = Paint()
      ..color = AppColors.sealGold
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.035;
    canvas.drawPath(shield, trim);

    final white = Paint()..color = Colors.white;
    // Open book: two quads.
    final book = Path()
      ..moveTo(w * 0.30, h * 0.62)
      ..quadraticBezierTo(w * 0.40, h * 0.55, w * 0.50, h * 0.62)
      ..quadraticBezierTo(w * 0.60, h * 0.55, w * 0.70, h * 0.62)
      ..lineTo(w * 0.70, h * 0.72)
      ..quadraticBezierTo(w * 0.60, h * 0.65, w * 0.50, h * 0.72)
      ..quadraticBezierTo(w * 0.40, h * 0.65, w * 0.30, h * 0.72)
      ..close();
    canvas.drawPath(book, white);
    // Torch flame.
    final flame = Path()
      ..moveTo(w * 0.50, h * 0.16)
      ..quadraticBezierTo(w * 0.60, h * 0.26, w * 0.50, h * 0.34)
      ..quadraticBezierTo(w * 0.40, h * 0.26, w * 0.50, h * 0.16)
      ..close();
    canvas.drawPath(flame, Paint()..color = AppColors.sealGold);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.46, h * 0.35, w * 0.08, h * 0.18),
        Radius.circular(w * 0.02),
      ),
      white,
    );
    // Star.
    final star = Paint()..color = AppColors.sealGold;
    final c = Offset(w * 0.5, h * 0.84);
    final starPath = Path();
    for (var i = 0; i < 5; i++) {
      final a1 = -math.pi / 2 + i * 2 * math.pi / 5;
      final a2 = a1 + math.pi / 5;
      starPath.lineTo(c.dx + w * 0.07 * math.cos(a1), c.dy + w * 0.07 * math.sin(a1));
      starPath.lineTo(c.dx + w * 0.03 * math.cos(a2), c.dy + w * 0.03 * math.sin(a2));
    }
    starPath.close();
    canvas.drawPath(starPath, star);
  }

  @override
  bool shouldRepaint(_) => false;
}
