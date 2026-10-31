import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'models.dart';

class _UndoEntry {
  const _UndoEntry(this.studentId, this.previous);

  final String studentId;
  final AttendanceStatus? previous;
}

class AttendanceController extends ChangeNotifier {
  AttendanceController._({
    required this.sectionId,
    required this.students,
    required this._preferences,
    required this._marks,
    required this._submitted,
  });

  final String sectionId;
  final List<Student> students;
  final SharedPreferences _preferences;
  final Map<String, AttendanceStatus> _marks;
  bool _submitted;
  _UndoEntry? _lastUndo;

  static String _marksKey(String sectionId) => 'hazira.marks.$sectionId';
  static String _submittedKey(String sectionId) =>
      'hazira.submitted.$sectionId';

  static Future<AttendanceController> load({
    required String sectionId,
    required List<Student> students,
  }) async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(_marksKey(sectionId));
    final marks = <String, AttendanceStatus>{};
    if (raw != null && raw.isNotEmpty) {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      for (final entry in decoded.entries) {
        final status = AttendanceStatus.values
            .where((value) => value.name == entry.value)
            .firstOrNull;
        if (status != null) marks[entry.key] = status;
      }
    }

    return AttendanceController._(
      sectionId: sectionId,
      students: students,
      preferences: preferences,
      marks: marks,
      submitted: preferences.getBool(_submittedKey(sectionId)) ?? false,
    );
  }

  Map<String, AttendanceStatus> get marks => Map.unmodifiable(_marks);
  bool get submitted => _submitted;
  int get markedCount => _marks.length;

  AttendanceStatus? statusFor(String studentId) => _marks[studentId];

  Map<AttendanceStatus, int> get counts {
    final result = {
      for (final status in AttendanceStatus.values) status: 0,
    };
    for (final status in _marks.values) {
      result[status] = (result[status] ?? 0) + 1;
    }
    return result;
  }

  void mark(String studentId, AttendanceStatus status) {
    _lastUndo = _UndoEntry(studentId, _marks[studentId]);
    _marks[studentId] = status;
    _saveMarks();
    notifyListeners();
  }

  String? undo() {
    final entry = _lastUndo;
    if (entry == null) return null;
    if (entry.previous == null) {
      _marks.remove(entry.studentId);
    } else {
      _marks[entry.studentId] = entry.previous!;
    }
    _lastUndo = null;
    _saveMarks();
    notifyListeners();
    return entry.studentId;
  }

  Future<void> submit() async {
    _submitted = true;
    await _preferences.setBool(_submittedKey(sectionId), true);
    _saveMarks();

    final raw = _preferences.getString('hazira.queue') ?? '[]';
    final queue = (jsonDecode(raw) as List<dynamic>)
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    queue.removeWhere(
      (item) =>
          item['sectionId'] == sectionId && item['synced'] != true,
    );
    queue.insert(0, {
      'sectionId': sectionId,
      'submittedAt': DateTime.now().toIso8601String(),
      'count': _marks.length,
      'marks': _marks.map((key, value) => MapEntry(key, value.name)),
      'synced': false,
    });
    await _preferences.setString('hazira.queue', jsonEncode(queue));
    notifyListeners();
  }

  Future<void> clearSection() async {
    _marks.clear();
    _submitted = false;
    _lastUndo = null;
    await _preferences.remove(_marksKey(sectionId));
    await _preferences.remove(_submittedKey(sectionId));
    notifyListeners();
  }

  void _saveMarks() {
    unawaited(
      _preferences.setString(
        _marksKey(sectionId),
        jsonEncode(
          _marks.map((key, value) => MapEntry(key, value.name)),
        ),
      ),
    );
  }

  static Future<int> pendingSyncCount() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString('hazira.queue') ?? '[]';
    final queue = jsonDecode(raw) as List<dynamic>;
    return queue.where((item) => (item as Map)['synced'] != true).length;
  }

  static Future<int> syncNow() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString('hazira.queue') ?? '[]';
    final queue = (jsonDecode(raw) as List<dynamic>)
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    var synced = 0;
    for (final item in queue) {
      if (item['synced'] != true) {
        item['synced'] = true;
        synced += 1;
      }
    }
    await preferences.setString('hazira.queue', jsonEncode(queue));
    return synced;
  }
}
