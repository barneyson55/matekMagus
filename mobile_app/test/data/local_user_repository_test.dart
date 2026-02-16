import 'package:flutter_test/flutter_test.dart';
import 'package:matekmagus_mobile/data/local/local_user_repository.dart';
import 'package:matekmagus_mobile/domain/models/user_profile.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('LocalUserRepository persists profile across instances', () async {
    SharedPreferences.setMockInitialValues({});
    final repository = LocalUserRepository();
    final user = _buildUser(displayName: 'Ada');

    await repository.upsertUser(user);
    repository.dispose();

    final restartedRepository = LocalUserRepository();
    final stored = await restartedRepository.fetchCurrentUser();

    expect(stored, isNotNull);
    expect(stored?.id, user.id);
    expect(stored?.displayName, user.displayName);
    expect(stored?.levelName, user.levelName);
    expect(stored?.updatedAt, user.updatedAt);
    restartedRepository.dispose();
  });

  test('LocalUserRepository emits updates on upsert', () async {
    SharedPreferences.setMockInitialValues({});
    final repository = LocalUserRepository();
    final user = _buildUser(displayName: 'Bela');

    final future = expectLater(
      repository.watchCurrentUser(),
      emitsInOrder(<Object?>[
        isNull,
        predicate<UserProfile?>(
          (profile) => profile?.displayName == user.displayName,
          'matches upserted user display name',
        ),
      ]),
    );

    await repository.upsertUser(user);
    await future;
    repository.dispose();
  });
}

UserProfile _buildUser({required String displayName}) {
  return UserProfile(
    id: 'user-1',
    displayName: displayName,
    totalXp: 42,
    level: 2,
    levelName: 'Alapozo Tanonc',
    xpToNextLevel: 60,
    createdAt: DateTime.utc(2025, 3, 1, 8, 0, 0),
    updatedAt: DateTime.utc(2025, 3, 2, 9, 30, 0),
  );
}
