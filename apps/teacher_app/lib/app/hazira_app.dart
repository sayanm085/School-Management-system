import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/models.dart';
import '../data/seed_loader.dart';
import '../design/theme.dart';
import '../design/tokens.dart';
import '../features/auth/login_screen.dart';
import '../features/home/home_shell.dart';
import '../l10n/app_language.dart';
import '../widgets/hazira_widgets.dart';

class HaziraApp extends StatefulWidget {
  const HaziraApp({super.key});

  @override
  State<HaziraApp> createState() => _HaziraAppState();
}

class _HaziraAppState extends State<HaziraApp> {
  SeedData? _seed;
  SharedPreferences? _preferences;
  bool _loading = true;
  bool _signedIn = false;
  Object? _error;
  late final LanguageController _languageController;

  @override
  void initState() {
    super.initState();
    _languageController = LanguageController();
    _bootstrap();
  }

  @override
  void dispose() {
    _languageController.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final seed = await SeedLoader.load();
      final preferences = await SharedPreferences.getInstance();
      await _languageController.restore(preferences);
      if (!mounted) return;
      setState(() {
        _seed = seed;
        _preferences = preferences;
        _signedIn = preferences.getBool('hazira.signedIn') ?? false;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error;
        _loading = false;
      });
    }
  }

  void _signedInNow() {
    _preferences?.setBool('hazira.signedIn', true);
    setState(() => _signedIn = true);
  }

  void _logout() {
    _preferences?.setBool('hazira.signedIn', false);
    setState(() => _signedIn = false);
  }

  Future<void> _resetDemo() async {
    await _preferences?.clear();
    if (!mounted) return;
    setState(() => _signedIn = false);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Hazira',
      debugShowCheckedModeBanner: false,
      theme: buildHaziraTheme(),
      home: LanguageScope(
        controller: _languageController,
        child: _loading
            ? const _SplashScreen()
            : _error != null
                ? _ErrorScreen(onRetry: _bootstrap)
                : !_signedIn
                    ? LoginScreen(
                        seed: _seed!,
                        onSignedIn: _signedInNow,
                      )
                    : HomeShell(
                        seed: _seed!,
                        onLogout: _logout,
                        onResetDemo: _resetDemo,
                      ),
      ),
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SchoolSeal(size: 68),
            const SizedBox(height: 16),
            Text(
              context.strings['appName'],
              style: bnText(size: 34, weight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Text(
              '${context.strings['teacherAttendance']} · Baranda',
              style: latinText(size: 12, color: AppColors.inkSecondary),
            ),
            const SizedBox(height: 24),
            const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                strokeWidth: 2.2,
                color: AppColors.blue,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorScreen extends StatelessWidget {
  const _ErrorScreen({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SchoolSeal(size: 54),
              const SizedBox(height: 18),
              Text(
                context.strings['loadError'],
                textAlign: TextAlign.center,
                style: bnText(size: 22, weight: FontWeight.w600),
              ),
              const SizedBox(height: 20),
              HaziraPrimaryButton(
                label: context.strings['tryAgain'],
                onPressed: onRetry,
                icon: Icons.refresh_rounded,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
