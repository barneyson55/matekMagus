import 'package:flutter_test/flutter_test.dart';

import 'package:matekmagus_mobile/main.dart';

import 'support/fake_connectivity_service.dart';

void main() {
  testWidgets('Home screen renders empty state', (WidgetTester tester) async {
    final connectivity = FakeConnectivityService(initialOnline: true);
    addTearDown(() => connectivity.dispose());

    await tester.pumpWidget(MyApp(connectivityService: connectivity));
    await tester.pumpAndSettle();

    expect(find.text('Matek Mester'), findsOneWidget);
    expect(find.text('Nincs betoltott felhasznalo.'), findsOneWidget);
    expect(find.byKey(const Key('offline-banner')), findsNothing);
  });

  testWidgets('Offline banner toggles with connectivity changes',
      (WidgetTester tester) async {
    final connectivity = FakeConnectivityService(initialOnline: false);
    addTearDown(() => connectivity.dispose());

    await tester.pumpWidget(MyApp(connectivityService: connectivity));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('offline-banner')), findsOneWidget);
    expect(find.text('Nincs internetkapcsolat.'), findsOneWidget);

    connectivity.emitOnline(true);
    await tester.pump();

    expect(find.byKey(const Key('offline-banner')), findsNothing);
  });
}
