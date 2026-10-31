import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hazira/data/models.dart';
import 'package:hazira/data/seed_loader.dart';
import 'package:hazira/design/theme.dart';
import 'package:hazira/features/auth/login_screen.dart';
import 'package:hazira/l10n/app_language.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SeedData seed;

  setUpAll(() async {
    seed = await SeedLoader.load();
  });

  testWidgets('login defaults to English and switches to Bengali', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.reset);

    final controller = LanguageController();
    await tester.pumpWidget(
      MaterialApp(
        theme: buildHaziraTheme(),
        home: LanguageScope(
          controller: controller,
          child: LoginScreen(seed: seed, onSignedIn: () {}),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsWidgets);
    expect(find.text('English'), findsOneWidget);
    expect(find.text('বাংলা'), findsOneWidget);

    await expectLater(
      find.byType(LoginScreen),
      matchesGoldenFile('goldens/login-english.png'),
    );

    await tester.tap(find.text('বাংলা'));
    await tester.pumpAndSettle();

    expect(find.text('সাইন ইন'), findsWidgets);
    expect(controller.language, AppLanguage.bengali);
  });
}
