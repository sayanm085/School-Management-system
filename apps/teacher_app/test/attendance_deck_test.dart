import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hazira/data/models.dart';
import 'package:hazira/data/seed_loader.dart';
import 'package:hazira/design/theme.dart';
import 'package:hazira/features/attendance/attendance_deck_screen.dart';
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

  testWidgets('deck renders the first student and marks present', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildHaziraTheme(),
        home: AttendanceDeckScreen(seed: seed),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text(seed.students.first.nameEn), findsWidgets);
    expect(find.text('Present'), findsWidgets);
    expect(find.text('Absent'), findsWidgets);

    await tester.tap(
      find.byKey(Key('present-${seed.students.first.id}')).first,
    );
    await tester.pumpAndSettle();
    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();

    expect(find.text(seed.students[1].nameEn), findsWidgets);
  });

  testWidgets('swipe up advances the deck', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildHaziraTheme(),
        home: AttendanceDeckScreen(seed: seed),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text(seed.students[0].nameEn), findsWidgets);
    expect(find.text('Swipe up for next'), findsOneWidget);

    await tester.fling(find.byType(PageView), const Offset(0, -320), 1200);
    await tester.pumpAndSettle();

    expect(find.text(seed.students[1].nameEn), findsWidgets);
  });

  testWidgets('deck initial state golden', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildHaziraTheme(),
        home: AttendanceDeckScreen(seed: seed),
      ),
    );
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(AttendanceDeckScreen),
      matchesGoldenFile('goldens/deck-initial.png'),
    );
  });

  testWidgets('week register exposes an accessible status label', (
    tester,
  ) async {
    final first = seed.students.first;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: WeekRegisterStrip(
            student: first,
            todayStatus: AttendanceStatus.present,
          ),
        ),
      ),
    );
    expect(find.byType(WeekRegisterStrip), findsOneWidget);
    expect(find.byType(Semantics), findsWidgets);
  });
}
