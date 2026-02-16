import 'package:flutter_test/flutter_test.dart';
import 'package:matekmagus_mobile/domain/models/achievement.dart';
import 'package:matekmagus_mobile/domain/models/buff.dart';
import 'package:matekmagus_mobile/domain/models/user_profile.dart';

void main() {
  test('UserProfile JSON roundtrip includes nested models', () {
    final createdAt = DateTime.utc(2025, 3, 4, 5, 6, 7);
    final updatedAt = DateTime.utc(2025, 3, 5, 6, 7, 8);
    final achievement = Achievement(
      id: 'first_test',
      isUnlocked: true,
      unlockedAt: DateTime.utc(2025, 3, 4, 7, 0, 0),
      grantedXp: 25,
    );
    final buff = Buff(
      id: 'focus',
      isUnlocked: true,
      isActive: false,
      unlockedAt: DateTime.utc(2025, 3, 4, 8, 0, 0),
    );

    final profile = UserProfile(
      id: 'user-1',
      displayName: 'Ada',
      totalXp: 120,
      level: 3,
      levelName: 'Alapozo Tanonc',
      xpToNextLevel: 40,
      achievements: [achievement],
      buffs: [buff],
      createdAt: createdAt,
      updatedAt: updatedAt,
    );

    final json = profile.toJson();

    expect(json['createdAt'], createdAt.toIso8601String());
    expect(json['updatedAt'], updatedAt.toIso8601String());

    final restored = UserProfile.fromJson(Map<String, dynamic>.from(json));
    expect(restored.id, profile.id);
    expect(restored.displayName, profile.displayName);
    expect(restored.totalXp, profile.totalXp);
    expect(restored.level, profile.level);
    expect(restored.levelName, profile.levelName);
    expect(restored.xpToNextLevel, profile.xpToNextLevel);
    expect(restored.achievements.length, 1);
    expect(restored.achievements.first.id, achievement.id);
    expect(restored.buffs.length, 1);
    expect(restored.buffs.first.id, buff.id);
    expect(restored.createdAt, createdAt);
    expect(restored.updatedAt, updatedAt);
  });
}
