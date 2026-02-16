const SUMMARY_FIXTURE = {
  xp: 1240,
  level: {
    level: 5,
    levelName: 'Szorgalmas Gyakorló',
    xpIntoLevel: 40,
    xpForNext: 66,
    xpToNext: 26,
  },
  quests: {
    mainTopics: {
      algebra_modulzaro: 'ACTIVE',
    },
    subtopics: {
      algebrai_kif_temazaro: 'COMPLETED',
    },
    topics: {
      halmazmuveletek: 'ACTIVE',
    },
  },
  completions: {
    algebrai_kif_temazaro: {
      normal: { grade: 5, timestamp: '2026-01-20T10:00:00.000Z', xp: 180 },
    },
  },
  practiceXp: {
    halmazmuveletek: 12,
  },
  achievements: {
    first_test: {
      isUnlocked: true,
      unlockedAt: '2026-01-20T10:00:00.000Z',
      grantedXp: 0,
    },
  },
  achievementCatalog: [
    {
      id: 'first_test',
      title: 'Első teszteredmény',
      description: 'Első sikeres teszt (jegy ≥ 2).',
      xpReward: 0,
      category: 'performance',
    },
  ],
};

const RESULTS_FIXTURE = [
  {
    topicId: 'halmazmuveletek',
    topicName: 'Halmazműveletek',
    grade: 4,
    percentage: 80,
    timestamp: '2026-01-21T12:00:00.000Z',
  },
  {
    topicId: 'algebrai_kif_temazaro',
    topicName: 'Algebrai kifejezések',
    grade: 5,
    percentage: 92,
    timestamp: '2026-01-20T10:00:00.000Z',
  },
];

module.exports = {
  SUMMARY_FIXTURE,
  RESULTS_FIXTURE,
};
