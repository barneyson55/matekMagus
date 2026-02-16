class Buff {
  const Buff({
    required this.id,
    required this.isUnlocked,
    required this.isActive,
    this.unlockedAt,
    this.activeUntil,
  });

  final String id;
  final bool isUnlocked;
  final bool isActive;
  final DateTime? unlockedAt;
  final DateTime? activeUntil;

  Buff copyWith({
    String? id,
    bool? isUnlocked,
    bool? isActive,
    DateTime? unlockedAt,
    DateTime? activeUntil,
  }) {
    return Buff(
      id: id ?? this.id,
      isUnlocked: isUnlocked ?? this.isUnlocked,
      isActive: isActive ?? this.isActive,
      unlockedAt: unlockedAt ?? this.unlockedAt,
      activeUntil: activeUntil ?? this.activeUntil,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'isUnlocked': isUnlocked,
      'isActive': isActive,
      'unlockedAt': unlockedAt?.toIso8601String(),
      'activeUntil': activeUntil?.toIso8601String(),
    };
  }

  factory Buff.fromJson(Map<String, dynamic> json) {
    return Buff(
      id: json['id'] as String,
      isUnlocked: json['isUnlocked'] as bool? ?? false,
      isActive: json['isActive'] as bool? ?? false,
      unlockedAt: _parseDateTime(json['unlockedAt']),
      activeUntil: _parseDateTime(json['activeUntil']),
    );
  }
}

DateTime? _parseDateTime(Object? value) {
  if (value is String && value.isNotEmpty) {
    return DateTime.tryParse(value);
  }
  return null;
}
