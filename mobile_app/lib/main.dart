import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'app_state/app_state.dart';
import 'data/connectivity/connectivity_plus_service.dart';
import 'data/in_memory/in_memory_user_repository.dart';
import 'domain/repositories/user_repository.dart';
import 'domain/services/connectivity_service.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({
    super.key,
    this.userRepository,
    this.connectivityService,
  });

  final UserRepository? userRepository;
  final ConnectivityService? connectivityService;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<UserRepository>(
          create: (_) => userRepository ?? InMemoryUserRepository(),
          dispose: (_, repository) {
            if (repository is InMemoryUserRepository) {
              repository.dispose();
            }
          },
        ),
        Provider<ConnectivityService>(
          create: (_) => connectivityService ?? ConnectivityPlusService(),
        ),
        ChangeNotifierProvider<AppState>(
          create: (context) => AppState(
            userRepository: context.read<UserRepository>(),
            connectivityService: context.read<ConnectivityService>(),
          )
            ..load()
            ..startConnectivity(),
        ),
      ],
      child: MaterialApp(
        title: 'Matek Mester',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
          useMaterial3: true,
        ),
        home: const HomeScreen(),
      ),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final user = appState.currentUser;
    final displayName = (user?.displayName ?? '').trim();
    final greeting = displayName.isEmpty
        ? 'Nincs betoltott felhasznalo.'
        : 'Udvozolunk, $displayName';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Matek Mester'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            if (!appState.isOnline)
              const OfflineBanner(key: Key('offline-banner')),
            Expanded(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (appState.isLoading)
                        const CircularProgressIndicator()
                      else
                        Text(
                          greeting,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed:
                            appState.isLoading ? null : () => appState.load(),
                        child: const Text('Ujratoltes'),
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: appState.isLoading || user == null
                            ? null
                            : () => appState.setDisplayName(
                                  '${user.displayName} (frissitve)',
                                ),
                        child: const Text('Nev frissitese'),
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

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Material(
      color: colorScheme.errorContainer,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            Icon(
              Icons.wifi_off,
              color: colorScheme.onErrorContainer,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Nincs internetkapcsolat.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onErrorContainer,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
