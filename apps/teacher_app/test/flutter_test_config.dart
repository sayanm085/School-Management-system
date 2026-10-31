import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  TestWidgetsFlutterBinding.ensureInitialized();

  final inter = FontLoader('Inter')
    ..addFont(rootBundle.load('assets/fonts/Inter.ttf'));
  final bengali = FontLoader('NotoSansBengali')
    ..addFont(rootBundle.load('assets/fonts/NotoSansBengali.ttf'));

  await Future.wait([inter.load(), bengali.load()]);
  await testMain();
}
