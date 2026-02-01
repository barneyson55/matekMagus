import 'package:flutter_test/flutter_test.dart';
import 'package:matekmagus_mobile/data/in_memory/in_memory_user_repository.dart';
import 'package:matekmagus_mobile/domain/models/user_profile.dart';

void main() {
  test('InMemoryUserRepository emits updates on upsert', () async {
    final repository = InMemoryUserRepository();
    final user = _buildUser(displayName: 'Ada');

    final future = expectLater(
      repository.watchCurrentUser(),
      emitsInOrder(<Object?>[
        isNull,
        predicate<UserProfile?>(
          (profile) => profile?.id == user.id,
          'matches upserted user id',
        ),
      ]),
    );

    await repository.upsertUser(user);
    await future;
    repository.dispose();
  });

  test('InMemoryUserRepository upsert replaces the current user', () async {
    final repository = InMemoryUserRepository();
    final first = _buildUser(displayName: 'Ada');
    final updated = first.copyWith(
      displayName: 'Bela',
      updatedAt: DateTime.utc(2025, 4, 1, 12, 0, 0),
    );

    await repository.upsertUser(first);
    await repository.upsertUser(updated);

    final stored = await repository.fetchCurrentUser();
    expect(stored?.displayName, 'Bela');
    expect(stored?.updatedAt, updated.updatedAt);
    repository.dispose();
  });
}

UserProfile _buildUser({required String displayName}) {
  return UserProfile(
    id: 'user-1',
    displayName: displayName,
    totalXp: 0,
    level: 1,
    levelName: 'Kezdo Diak',
    xpToNextLevel: 50,
    createdAt: DateTime.utc(2025, 3, 1, 8, 0, 0),
    updatedAt: DateTime.utc(2025, 3, 1, 8, 0, 0),
  );
}
