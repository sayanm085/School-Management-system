import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hazira/data/models.dart';
import 'package:hazira/data/seed_loader.dart';
import 'package:hazira/design/theme.dart';
import 'package:hazira/features/today/today_screen.dart';
import 'package:hazira/l10n/app_language.dart';
import 'package:hazira/widgets/hazira_widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SeedData seed;

  setUpAll(() async {
    seed = await SeedLoader.load();
  });

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('seed exposes a free-period cover request', () {
    expect(seed.currentPeriod, 4);
    expect(seed.freePeriods, contains(4));
    expect(
      seed.coverBoard.any(
        (entry) =>
            entry.period == 4 &&
            entry.isUncovered &&
            entry.availableToAnanya,
      ),
      isTrue,
    );
  });

  testWidgets('teacher sees the free period and claims the class', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.reset);
    final controller = LanguageController();
    addTearDown(controller.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildHaziraTheme(),
        home: LanguageScope(
          controller: controller,
          child: Scaffold(
            body: TodayScreen(
              seed: seed,
              refreshToken: 0,
              onTakeAttendance: () {},
              onOpenRoster: () {},
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final takeThisClass = find.text('Take this class');
    await tester.scrollUntilVisible(takeThisClass, 300);
    expect(find.text('You are free this period.'), findsOneWidget);
    expect(takeThisClass, findsOneWidget);

    await tester.tap(takeThisClass);
    await tester.pumpAndSettle();
    expect(find.text('Take this class?'), findsOneWidget);

    final confirm = find.widgetWithText(HaziraPrimaryButton, 'Take class');
    expect(confirm, findsOneWidget);
    await tester.tap(confirm);
    await tester.pumpAndSettle();

    expect(find.textContaining('Covering'), findsWidgets);
    final preferences = await SharedPreferences.getInstance();
    expect(
      preferences.getStringList('hazira.covers.claimed'),
      contains(
        seed.coverBoard
            .firstWhere(
              (entry) =>
                  entry.period == 4 &&
                  entry.isUncovered &&
                  entry.availableToAnanya,
            )
            .entryId,
      ),
    );
  });
}
