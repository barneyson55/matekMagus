const XP_SAMPLE_RESULTS = [
  {
    topicId: 'halmazmuveletek',
    grade: 4,
    normalizedDifficulty: 'normal',
    timestamp: '2026-01-20T12:00:00.000Z',
    expectedXp: null, // TODO: fill once XP audit confirms formula + rounding.
  },
  {
    topicId: 'algebra_modulzaro',
    grade: 5,
    normalizedDifficulty: null,
    timestamp: '2026-01-21T12:00:00.000Z',
    expectedXp: null, // TODO: add expected XP for main-topic formula.
  },
];

const XP_PRACTICE_SAMPLE = {
  topicId: 'halmazmuveletek',
  xp: 2,
};

const XP_LEVEL_SAMPLE = {
  totalXp: 275,
  expectedLevel: null, // TODO: align with xp_roadmap once audited.
};

module.exports = {
  XP_SAMPLE_RESULTS,
  XP_PRACTICE_SAMPLE,
  XP_LEVEL_SAMPLE,
};
