import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:baranda_student/data/demo_store.dart';
import 'package:baranda_student/design/theme.dart';
import 'package:baranda_student/features/home/home_shell.dart';
import 'package:baranda_student/features/login/login_screen.dart';

void main() {
  setUp(() async {
    await DemoStore.instance.load();
  });

  // A phone-shaped viewport: the default 800x600 test surface is shorter than
  // the login screen and pushes the primary button off-screen.
  setUpAll(() {
    TestWidgetsFlutterBinding.ensureInitialized();
  });

  void usePhoneSurface(WidgetTester tester) {
    tester.view.devicePixelRatio = 3.0;
    tester.view.physicalSize = const Size(1080, 2400);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
  }

  test('demo credentials are accepted and wrong ones rejected', () {
    expect(DemoStore.instance.login(DemoStore.demoStudentId, DemoStore.demoPassword), isTrue);
    expect(DemoStore.instance.login('STU-2026-9999', 'demo1234'), isFalse);
    expect(DemoStore.instance.login(DemoStore.demoStudentId, 'wrong'), isFalse);
  });

  // Every tab reads the shared store; this is what broke the first release APK.
  testWidgets('all five tabs render real data without crashing', (tester) async {
    await tester.pumpWidget(
      MaterialApp(theme: buildBarandaStudentTheme(), home: const HomeShell()),
    );
    await tester.pumpAndSettle();

    expect(find.text('Attendance · উপস্থিতি'), findsOneWidget);
    expect(find.textContaining('91%'), findsWidgets);

    await tester.tap(find.text('Homework'));
    await tester.pumpAndSettle();
    expect(find.text('Homework'), findsWidgets);
    expect(find.textContaining('Exercise 7.2'), findsOneWidget);

    await tester.tap(find.text('Tutor'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Shikha'), findsOneWidget);

    await tester.tap(find.text('Marks'));
    await tester.pumpAndSettle();
    expect(find.text('Score trend · স্কোর'), findsOneWidget);
    expect(find.textContaining('Half-Yearly'), findsWidgets);

    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();
    expect(find.text('Student ID'), findsOneWidget);
    expect(find.text(DemoStore.demoStudentId), findsOneWidget);

    expect(tester.takeException(), isNull);
  });

  testWidgets('login with the demo credential reaches Home', (tester) async {
    usePhoneSurface(tester);
    await tester.pumpWidget(
      MaterialApp(theme: buildBarandaStudentTheme(), home: const LoginScreen()),
    );

    await tester.enterText(find.byType(TextField).first, DemoStore.demoStudentId);
    await tester.enterText(find.byType(TextField).last, DemoStore.demoPassword);
    await tester.ensureVisible(find.text('Log in · লগ ইন'));
    await tester.tap(find.text('Log in · লগ ইন'));
    await tester.pumpAndSettle();

    expect(find.text('Attendance · উপস্থিতি'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
