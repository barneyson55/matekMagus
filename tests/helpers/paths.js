const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const appEntry = path.join(repoRoot, 'main.js');

module.exports = {
  repoRoot,
  appEntry,
};
