import 'achievement.dart';
import 'buff.dart';

class UserProfile {
  const UserProfile({
    required this.id,
    required this.displayName,
    required this.totalXp,
    required this.level,
    required this.levelName,
    required this.xpToNextLevel,
    this.achievements = const [],
    this.buffs = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String displayName;
  final int totalXp;
  final int level;
  final String levelName;
  final int xpToNextLevel;
  final List<Achievement> achievements;
  final List<Buff> buffs;
  final DateTime createdAt;
  final DateTime updatedAt;

  UserProfile copyWith({
    String? id,
    String? displayName,
    int? totalXp,
    int? level,
    String? levelName,
    int? xpToNextLevel,
    List<Achievement>? achievements,
    List<Buff>? buffs,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserProfile(
      id: id ?? this.id,
      displayName: displayName ?? this.displayName,
      totalXp: totalXp ?? this.totalXp,
      level: level ?? this.level,
      levelName: levelName ?? this.levelName,
      xpToNextLevel: xpToNextLevel ?? this.xpToNextLevel,
      achievements: achievements ?? this.achievements,
      buffs: buffs ?? this.buffs,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'displayName': displayName,
      'totalXp': totalXp,
      'level': level,
      'levelName': levelName,
      'xpToNextLevel': xpToNextLevel,
      'achievements': achievements.map((entry) => entry.toJson()).toList(),
      'buffs': buffs.map((entry) => entry.toJson()).toList(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      displayName: json['displayName'] as String? ?? '',
      totalXp: (json['totalXp'] as num?)?.toInt() ?? 0,
      level: (json['level'] as num?)?.toInt() ?? 1,
      levelName: json['levelName'] as String? ?? '',
      xpToNextLevel: (json['xpToNextLevel'] as num?)?.toInt() ?? 0,
      achievements: _parseAchievements(json['achievements']),
      buffs: _parseBuffs(json['buffs']),
      createdAt: _parseRequiredDate(json['createdAt']),
      updatedAt: _parseRequiredDate(json['updatedAt']),
    );
  }
}

List<Achievement> _parseAchievements(Object? value) {
  if (value is List) {
    return value
        .whereType<Map>()
        .map((entry) => Achievement.fromJson(Map<String, dynamic>.from(entry)))
        .toList();
  }
  return const [];
}

List<Buff> _parseBuffs(Object? value) {
  if (value is List) {
    return value
        .whereType<Map>()
        .map((entry) => Buff.fromJson(Map<String, dynamic>.from(entry)))
        .toList();
  }
  return const [];
}

DateTime _parseRequiredDate(Object? value) {
  if (value is String && value.isNotEmpty) {
    final parsed = DateTime.tryParse(value);
    if (parsed != null) {
      return parsed;
    }
  }
  return DateTime.fromMillisecondsSinceEpoch(0, isUtc: true);
}
