import 'dart:async';

import 'package:flutter/foundation.dart';

import '../domain/models/user_profile.dart';
import '../domain/repositories/user_repository.dart';
import '../domain/services/connectivity_service.dart';

class AppState extends ChangeNotifier {
  AppState({
    required UserRepository userRepository,
    required ConnectivityService connectivityService,
    DateTime Function()? now,
  })  : _userRepository = userRepository,
        _connectivityService = connectivityService,
        _now = now ?? DateTime.now;

  final UserRepository _userRepository;
  final ConnectivityService _connectivityService;
  final DateTime Function() _now;
  StreamSubscription<bool>? _connectivitySubscription;

  UserProfile? currentUser;
  bool _isLoading = false;
  bool _isOnline = true;
  bool _connectivityStarted = false;

  bool get isLoading => _isLoading;
  bool get isOnline => _isOnline;

  Future<void> load() async {
    _setLoading(true);
    try {
      final user = await _userRepository.fetchCurrentUser();
      currentUser = user;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> setDisplayName(String displayName) async {
    final existing = currentUser;
    if (existing == null) {
      return;
    }

    final updated = existing.copyWith(
      displayName: displayName,
      updatedAt: _now().toUtc(),
    );

    currentUser = updated;
    notifyListeners();
    await _userRepository.upsertUser(updated);
  }

  Future<void> startConnectivity() async {
    if (_connectivityStarted) {
      return;
    }
    _connectivityStarted = true;

    try {
      final initial = await _connectivityService.checkIsOnline();
      _setOnline(initial);
    } on Exception {
      _setOnline(_isOnline);
    }

    _connectivitySubscription = _connectivityService.watchIsOnline().listen(
      _setOnline,
      onError: (_) => _setOnline(_isOnline),
    );
  }

  void _setLoading(bool value) {
    if (_isLoading == value) {
      return;
    }
    _isLoading = value;
    notifyListeners();
  }

  void _setOnline(bool value) {
    if (_isOnline == value) {
      return;
    }
    _isOnline = value;
    notifyListeners();
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
  }
}
