import '../models/user_profile.dart';

abstract class UserRepository {
  Stream<UserProfile?> watchCurrentUser();

  Future<UserProfile?> fetchCurrentUser();

  Future<void> upsertUser(UserProfile profile);
}
