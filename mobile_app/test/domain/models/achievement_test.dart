import 'package:flutter_test/flutter_test.dart';
import 'package:matekmagus_mobile/domain/models/achievement.dart';

void main() {
  test('Achievement JSON roundtrip uses ISO-8601 dates', () {
    final unlockedAt = DateTime.utc(2025, 1, 2, 3, 4, 5);
    final achievement = Achievement(
      id: 'first_test',
      isUnlocked: true,
      unlockedAt: unlockedAt,
      grantedXp: 50,
    );

    final json = achievement.toJson();

    expect(json['unlockedAt'], unlockedAt.toIso8601String());

    final restored = Achievement.fromJson(Map<String, dynamic>.from(json));
    expect(restored.id, achievement.id);
    expect(restored.isUnlocked, achievement.isUnlocked);
    expect(restored.unlockedAt, achievement.unlockedAt);
    expect(restored.grantedXp, achievement.grantedXp);
  });
}
