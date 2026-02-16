const DEFAULT_TIMEOUT_MS = Number.parseInt(
  process.env.MATEK_TEST_TIMEOUT_MS || '15000',
  10
);

const SHORT_TIMEOUT_MS = Number.parseInt(
  process.env.MATEK_TEST_SHORT_TIMEOUT_MS || '5000',
  10
);

module.exports = {
  DEFAULT_TIMEOUT_MS,
  SHORT_TIMEOUT_MS,
};
