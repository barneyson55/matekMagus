import 'dart:async';
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../domain/models/user_profile.dart';
import '../../domain/repositories/user_repository.dart';

class LocalUserRepository implements UserRepository {
  LocalUserRepository({
    SharedPreferences? preferences,
    String storageKey = _defaultStorageKey,
  })  : _preferences = preferences,
        _storageKey = storageKey;

  static const String _defaultStorageKey = 'matek_user_profile';

  final SharedPreferences? _preferences;
  final String _storageKey;
  final StreamController<UserProfile?> _controller =
      StreamController<UserProfile?>.broadcast();

  Future<SharedPreferences>? _prefsFuture;

  Future<SharedPreferences> _getPrefs() {
    if (_preferences != null) {
      return Future.value(_preferences);
    }
    return _prefsFuture ??= SharedPreferences.getInstance();
  }

  @override
  Stream<UserProfile?> watchCurrentUser() async* {
    final user = await fetchCurrentUser();
    yield user;
    yield* _controller.stream;
  }

  @override
  Future<UserProfile?> fetchCurrentUser() async {
    final prefs = await _getPrefs();
    final stored = prefs.getString(_storageKey);
    if (stored == null || stored.isEmpty) {
      return null;
    }

    try {
      final decoded = jsonDecode(stored);
      if (decoded is Map) {
        return UserProfile.fromJson(Map<String, dynamic>.from(decoded));
      }
    } on Exception {
      return null;
    }

    return null;
  }

  @override
  Future<void> upsertUser(UserProfile profile) async {
    final prefs = await _getPrefs();
    final payload = jsonEncode(profile.toJson());
    await prefs.setString(_storageKey, payload);
    _controller.add(profile);
  }

  void dispose() {
    _controller.close();
  }
}
