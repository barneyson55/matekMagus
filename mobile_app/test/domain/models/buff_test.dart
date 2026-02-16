import 'package:flutter_test/flutter_test.dart';
import 'package:matekmagus_mobile/domain/models/buff.dart';

void main() {
  test('Buff JSON roundtrip uses ISO-8601 dates', () {
    final unlockedAt = DateTime.utc(2025, 2, 3, 4, 5, 6);
    final activeUntil = DateTime.utc(2025, 2, 3, 4, 20, 6);
    final buff = Buff(
      id: 'focus',
      isUnlocked: true,
      isActive: true,
      unlockedAt: unlockedAt,
      activeUntil: activeUntil,
    );

    final json = buff.toJson();

    expect(json['unlockedAt'], unlockedAt.toIso8601String());
    expect(json['activeUntil'], activeUntil.toIso8601String());

    final restored = Buff.fromJson(Map<String, dynamic>.from(json));
    expect(restored.id, buff.id);
    expect(restored.isUnlocked, buff.isUnlocked);
    expect(restored.isActive, buff.isActive);
    expect(restored.unlockedAt, buff.unlockedAt);
    expect(restored.activeUntil, buff.activeUntil);
  });
}
