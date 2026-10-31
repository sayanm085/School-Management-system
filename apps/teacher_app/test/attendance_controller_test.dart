import 'package:flutter_test/flutter_test.dart';
import 'package:hazira/data/attendance_controller.dart';
import 'package:hazira/data/models.dart';
import 'package:hazira/data/seed_loader.dart';
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

  test('marks, undoes and submits an attendance register', () async {
    final controller = await AttendanceController.load(
      sectionId: seed.section.id,
      students: seed.students,
    );

    expect(controller.markedCount, 0);
    expect(controller.submitted, isFalse);

    final first = seed.students.first;
    controller.mark(first.id, AttendanceStatus.present);
    expect(controller.statusFor(first.id), AttendanceStatus.present);
    expect(controller.markedCount, 1);

    controller.mark(seed.students[1].id, AttendanceStatus.absent);
    expect(controller.counts[AttendanceStatus.present], 1);
    expect(controller.counts[AttendanceStatus.absent], 1);

    controller.undo();
    expect(controller.statusFor(seed.students[1].id), isNull);
    expect(controller.markedCount, 1);

    await controller.submit();
    expect(controller.submitted, isTrue);
    expect(await AttendanceController.pendingSyncCount(), 1);

    await AttendanceController.syncNow();
    expect(await AttendanceController.pendingSyncCount(), 0);
  });

  test('restores saved marks for the same section', () async {
    final first = seed.students.first;
    final controller = await AttendanceController.load(
      sectionId: seed.section.id,
      students: seed.students,
    );
    controller.mark(first.id, AttendanceStatus.late);

    final restored = await AttendanceController.load(
      sectionId: seed.section.id,
      students: seed.students,
    );
    expect(restored.statusFor(first.id), AttendanceStatus.late);
    expect(restored.markedCount, 1);
  });
}
