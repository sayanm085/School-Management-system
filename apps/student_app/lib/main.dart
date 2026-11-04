import 'package:flutter/material.dart';

import 'data/demo_store.dart';
import 'design/theme.dart';
import 'features/home/home_shell.dart';
import 'features/login/login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final store = DemoStore.instance;
  await store.load();
  runApp(const BarandaStudentApp());
}

class BarandaStudentApp extends StatelessWidget {
  const BarandaStudentApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Baranda Student',
      debugShowCheckedModeBanner: false,
      theme: buildBarandaStudentTheme(),
      home: const LoginScreen(),
      routes: {'/home': (_) => const HomeShell()},
    );
  }
}
