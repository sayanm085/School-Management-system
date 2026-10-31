import 'dart:convert';

import 'package:flutter/services.dart';

import 'models.dart';

class SeedLoader {
  static Future<SeedData> load() async {
    final text = await rootBundle.loadString('assets/seed/seed.json');
    return SeedData.fromJson(jsonDecode(text) as Map<String, dynamic>);
  }
}
