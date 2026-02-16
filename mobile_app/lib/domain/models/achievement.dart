class Achievement {
  const Achievement({
    required this.id,
    required this.isUnlocked,
    this.unlockedAt,
    this.grantedXp = 0,
  });

  final String id;
  final bool isUnlocked;
  final DateTime? unlockedAt;
  final int grantedXp;

  Achievement copyWith({
    String? id,
    bool? isUnlocked,
    DateTime? unlockedAt,
    int? grantedXp,
  }) {
    return Achievement(
      id: id ?? this.id,
      isUnlocked: isUnlocked ?? this.isUnlocked,
      unlockedAt: unlockedAt ?? this.unlockedAt,
      grantedXp: grantedXp ?? this.grantedXp,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'isUnlocked': isUnlocked,
      'unlockedAt': unlockedAt?.toIso8601String(),
      'grantedXp': grantedXp,
    };
  }

  factory Achievement.fromJson(Map<String, dynamic> json) {
    return Achievement(
      id: json['id'] as String,
      isUnlocked: json['isUnlocked'] as bool? ?? false,
      unlockedAt: _parseDateTime(json['unlockedAt']),
      grantedXp: (json['grantedXp'] as num?)?.toInt() ?? 0,
    );
  }
}

DateTime? _parseDateTime(Object? value) {
  if (value is String && value.isNotEmpty) {
    return DateTime.tryParse(value);
  }
  return null;
}
