import 'dart:async';

import '../../domain/models/user_profile.dart';
import '../../domain/repositories/user_repository.dart';

class InMemoryUserRepository implements UserRepository {
  UserProfile? _currentUser;
  final StreamController<UserProfile?> _controller =
      StreamController<UserProfile?>.broadcast();

  @override
  Stream<UserProfile?> watchCurrentUser() async* {
    yield _currentUser;
    yield* _controller.stream;
  }

  @override
  Future<UserProfile?> fetchCurrentUser() async {
    return _currentUser;
  }

  @override
  Future<void> upsertUser(UserProfile profile) async {
    _currentUser = profile;
    _controller.add(_currentUser);
  }

  void dispose() {
    _controller.close();
  }
}
