import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../data/models.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../l10n/app_language.dart';
import '../../widgets/hazira_widgets.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    required this.seed,
    required this.onSignedIn,
  });

  final SeedData seed;
  final VoidCallback onSignedIn;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _employee = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _employee.dispose();
    _password.dispose();
    super.dispose();
  }

  void _fillDemo() {
    setState(() {
      _employee.text = widget.seed.teacher.employeeId;
      _password.text = 'demo1234';
      _error = null;
    });
  }

  void _submit() {
    final employee = _employee.text.trim().toUpperCase();
    final password = _password.text;
    if (employee != widget.seed.teacher.employeeId || password != 'demo1234') {
      setState(() {
        _error = context.strings['invalidCredentials'];
      });
      return;
    }
    setState(() => _error = null);
    widget.onSignedIn();
  }

  @override
  Widget build(BuildContext context) {
    final s = context.strings;
    final bengali = context.isBengali;
    final controller = context.languageController;
    final schoolName = bengali
        ? widget.seed.school.nameBn
        : widget.seed.school.nameEn;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        resizeToAvoidBottomInset: true,
        body: Stack(
          children: [
            Positioned(
              left: 0,
              right: 0,
              top: 0,
              height: 360,
              child: Container(
                decoration: const BoxDecoration(
                  color: Color(0xFF0B3B6F),
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(32),
                    bottomRight: Radius.circular(32),
                  ),
                ),
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 18, 24, 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const SchoolSeal(size: 48),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    schoolName,
                                    style: context.localized(
                                      size: 15,
                                      weight: FontWeight.w600,
                                      color: Colors.white,
                                      height: 1.4,
                                    ),
                                  ),
                                  Text(
                                    s['schoolSince'],
                                    style: context.localized(
                                      size: 10,
                                      color: Colors.white70,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(999),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.16),
                                ),
                              ),
                              child: Text(
                                s['demo'],
                                style: context.localized(
                                  size: 10,
                                  weight: FontWeight.w600,
                                  color: const Color(0xFFE8C66A),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const Spacer(),
                        Text(
                          s['appName'],
                          style: context.localized(
                            size: 44,
                            weight: FontWeight.w600,
                            color: Colors.white,
                            height: 1.15,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${s['teacherAttendance']} · Baranda',
                          style: context.localized(
                            size: 13,
                            color: Colors.white.withValues(alpha: 0.82),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            Container(
                              width: 34,
                              height: 2,
                              color: const Color(0xFFC99700),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              s['schoolSince'],
                              style: context.localized(
                                size: 10,
                                color: Colors.white.withValues(alpha: 0.75),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 340, 20, 28),
                child: HaziraCard(
                  padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              s['language'],
                              style: context.localized(
                                size: 11,
                                weight: FontWeight.w600,
                                color: AppColors.inkSecondary,
                              ),
                            ),
                          ),
                          _LanguageSwitch(
                            language: controller?.language ??
                                AppLanguage.english,
                            onChanged: controller?.setLanguage,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Eyebrow(text: s['teacherAccess']),
                      const SizedBox(height: 8),
                      Text(
                        s['signIn'],
                        style: context.localized(
                          size: 28,
                          weight: FontWeight.w600,
                          height: 1.25,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        s['signInSubtitle'],
                        style: context.localized(
                          size: 12,
                          color: AppColors.inkSecondary,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        s['employeeId'],
                        style: context.localized(
                          size: 12,
                          weight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 7),
                      Semantics(
                        label: s['employeeId'],
                        textField: true,
                        child: TextField(
                          controller: _employee,
                          textCapitalization: TextCapitalization.characters,
                          autocorrect: false,
                          textInputAction: TextInputAction.next,
                          style: latinText(size: 15, weight: FontWeight.w500),
                          decoration: const InputDecoration(
                            hintText: 'TCH-027',
                            prefixIcon: Icon(
                              Icons.badge_outlined,
                              size: 19,
                              color: AppColors.inkTertiary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      Text(
                        s['password'],
                        style: context.localized(
                          size: 12,
                          weight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 7),
                      Semantics(
                        label: s['password'],
                        textField: true,
                        child: TextField(
                          controller: _password,
                          obscureText: _obscure,
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => _submit(),
                          style: latinText(size: 15, weight: FontWeight.w500),
                          decoration: InputDecoration(
                            hintText: 'demo1234',
                            prefixIcon: const Icon(
                              Icons.lock_outline_rounded,
                              size: 19,
                              color: AppColors.inkTertiary,
                            ),
                            suffixIcon: IconButton(
                              onPressed: () =>
                                  setState(() => _obscure = !_obscure),
                              tooltip: _obscure
                                  ? 'Show password'
                                  : 'Hide password',
                              icon: Icon(
                                _obscure
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined,
                                size: 19,
                                color: AppColors.inkTertiary,
                              ),
                            ),
                          ),
                        ),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.redTint,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            _error!,
                            style: context.localized(
                              size: 11,
                              color: AppColors.redText,
                              height: 1.5,
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        child: HaziraPrimaryButton(
                          label: s['signInAction'],
                          icon: Icons.arrow_forward_rounded,
                          onPressed: _submit,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.fill,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    s['demoAccount'],
                                    style: context.localized(
                                      size: 12,
                                      weight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'TCH-027 · demo1234',
                                    style: latinText(
                                      size: 11,
                                      color: AppColors.inkSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            TextButton(
                              onPressed: _fillDemo,
                              style: TextButton.styleFrom(
                                foregroundColor: AppColors.blueText,
                                textStyle: context.localized(
                                  size: 11,
                                  weight: FontWeight.w600,
                                ),
                              ),
                              child: Text(s['useDemo']),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        s['demoNotice'],
                        style: context.localized(
                          size: 10,
                          color: AppColors.inkTertiary,
                          height: 1.55,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LanguageSwitch extends StatelessWidget {
  const _LanguageSwitch({
    required this.language,
    required this.onChanged,
  });

  final AppLanguage language;
  final ValueChanged<AppLanguage>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: AppColors.fill,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _LanguageOption(
            label: 'English',
            selected: language == AppLanguage.english,
            onTap: () => onChanged?.call(AppLanguage.english),
          ),
          _LanguageOption(
            label: 'বাংলা',
            selected: language == AppLanguage.bengali,
            onTap: () => onChanged?.call(AppLanguage.bengali),
          ),
        ],
      ),
    );
  }
}

class _LanguageOption extends StatelessWidget {
  const _LanguageOption({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(9),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: selected ? AppColors.surface : Colors.transparent,
            borderRadius: BorderRadius.circular(9),
            boxShadow: selected
                ? const [
                    BoxShadow(
                      color: Color(0x14000000),
                      blurRadius: 4,
                      offset: Offset(0, 1),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label,
            style: latinText(
              size: 11,
              weight: FontWeight.w600,
              color: selected ? AppColors.ink : AppColors.inkSecondary,
            ),
          ),
        ),
      ),
    );
  }
}
