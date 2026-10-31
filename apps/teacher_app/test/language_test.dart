import 'package:flutter_test/flutter_test.dart';
import 'package:hazira/l10n/app_language.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('defaults to English and persists a language change', () async {
    SharedPreferences.setMockInitialValues({});
    final preferences = await SharedPreferences.getInstance();
    final controller = LanguageController();
    await controller.restore(preferences);

    expect(controller.language, AppLanguage.english);
    expect(controller.strings['signIn'], 'Sign in');
    expect(controller.strings['present'], 'Present');

    await controller.setLanguage(AppLanguage.bengali);
    expect(controller.language, AppLanguage.bengali);
    expect(controller.strings['signIn'], 'সাইন ইন');
    expect(controller.strings['present'], 'উপস্থিত');

    final restored = LanguageController();
    await restored.restore(preferences);
    expect(restored.language, AppLanguage.bengali);
    expect(restored.strings['signIn'], 'সাইন ইন');
  });
}
