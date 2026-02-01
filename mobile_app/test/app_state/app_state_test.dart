import 'package:flutter_test/flutter_test.dart';
import 'package:matekmagus_mobile/app_state/app_state.dart';
import 'package:matekmagus_mobile/data/in_memory/in_memory_user_repository.dart';
import 'package:matekmagus_mobile/domain/models/user_profile.dart';
import '../support/fake_connectivity_service.dart';

void main() {
  test('AppState notifies listeners on load and mutation', () async {
    final repository = InMemoryUserRepository();
    final connectivity = FakeConnectivityService();
    final user = _buildUser(displayName: 'Ada');
    await repository.upsertUser(user);

    final appState = AppState(
      userRepository: repository,
      connectivityService: connectivity,
      now: () => DateTime.utc(2025, 4, 2, 10, 0, 0),
    );

    var notifications = 0;
    appState.addListener(() {
      notifications += 1;
    });

    await appState.load();

    expect(appState.isLoading, isFalse);
    expect(appState.currentUser?.displayName, 'Ada');
    expect(notifications, 2);

    await appState.setDisplayName('Bela');

    expect(appState.currentUser?.displayName, 'Bela');
    expect(notifications, 3);

    appState.dispose();
    await connectivity.dispose();
    repository.dispose();
  });

  test('AppState updates online state from connectivity', () async {
    final repository = InMemoryUserRepository();
    final connectivity = FakeConnectivityService(initialOnline: true);

    final appState = AppState(
      userRepository: repository,
      connectivityService: connectivity,
      now: () => DateTime.utc(2025, 4, 2, 10, 0, 0),
    );

    await appState.startConnectivity();

    expect(appState.isOnline, isTrue);

    connectivity.emitOnline(false);
    await Future<void>.delayed(Duration.zero);

    expect(appState.isOnline, isFalse);

    appState.dispose();
    await connectivity.dispose();
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
