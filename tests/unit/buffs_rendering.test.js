const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { BUFF_FIXTURES } = require('./fixtures/buffs_fixtures');
const { getIconSvg, getIconLabel } = require(path.join(process.cwd(), 'buffs_icons.js'));

test('buff icon mapping covers catalog tokens (scaffold)', () => {
  BUFF_FIXTURES.forEach((buff) => {
    const svg = getIconSvg(buff.iconToken);
    assert.ok(svg && svg.includes('<svg'), 'TODO: ensure each buff icon token has an SVG mapping');
  });
});

test('HUD exposes buff icon container (scaffold)', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  const hasBuffBar = html.includes('data-testid="buffs-bar"');
  assert.ok(hasBuffBar, 'TODO: ensure buff bar container is present');
  BUFF_FIXTURES.forEach((buff) => {
    const label = getIconLabel(buff.iconToken);
    assert.ok(label, 'TODO: ensure each buff icon token has a fallback label');
  });
});
