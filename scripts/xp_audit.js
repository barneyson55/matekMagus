#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const ROOT_DIR = path.resolve(__dirname, '..');
const DOC_PATH = path.join(ROOT_DIR, 'docs', 'XP_AUDIT.md');
const xpConfig = require(path.join(ROOT_DIR, 'xp_config.js'));

function formatNumber(value) {
  const num = Number(value) || 0;
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function computeFormulaTotal(baseXp, growth, maxLevel) {
  let total = 0;
  for (let level = 1; level <= maxLevel; level += 1) {
    total += Math.round(baseXp * Math.pow(growth, level - 1));
  }
  return total;
}

function loadMainContext(rootDir) {
  const mainPath = path.join(rootDir, 'main.js');
  if (!fs.existsSync(mainPath)) {
    throw new Error('main.js not found; run from repo root.');
  }
  const code = fs.readFileSync(mainPath, 'utf8');
  const requireFromMain = createRequire(mainPath);

  const electronStub = {
    app: {
      setPath() {},
      getPath() {
        return path.join(rootDir, '.xp_audit_tmp');
      },
      whenReady() {
        return { then() {} };
      },
      on() {},
      quit() {},
    },
    BrowserWindow: class {
      constructor() {}
      loadFile() {}
      static getAllWindows() {
        return [];
      }
    },
    session: {
      defaultSession: {
        webRequest: {
          onHeadersReceived() {},
        },
      },
    },
    ipcMain: {
      on() {},
      handle() {},
    },
  };

  const sandbox = {
    console,
    process,
    Buffer,
    __dirname: path.dirname(mainPath),
    __filename: mainPath,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    require: (id) => {
      if (id === 'electron') return electronStub;
      return requireFromMain(id);
    },
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(code, context, { filename: mainPath });
  return context;
}

function readBinding(context, expression, fallback = undefined) {
  try {
    const value = vm.runInContext(expression, context);
    return value === undefined ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function buildLevelSection({ levelTable, maxLevel, baseXp, growth, xpCap }) {
  const totalXpCode = levelTable[levelTable.length - 1].xpEnd;
  const finalSegment = Math.round(baseXp * Math.pow(growth, maxLevel - 1));
  const formulaTotal = computeFormulaTotal(baseXp, growth, maxLevel);
  const resolvedCap = Number.isFinite(xpCap) ? xpCap : formulaTotal;

  const lines = [];
  lines.push('### Level curve (code)');
  lines.push(`- MAX_LEVEL: ${maxLevel}`);
  lines.push(`- LEVEL_BASE_XP: ${baseXp}`);
  lines.push(`- LEVEL_GROWTH: ${growth}`);
  lines.push(`- Total XP to reach level ${maxLevel} (code table end): ${formatNumber(totalXpCode)}`);
  lines.push(`- Level ${maxLevel} segment size (formula): ${formatNumber(finalSegment)}`);
  lines.push(`- Formula total XP (levels 1-${maxLevel}): ${formatNumber(formulaTotal)}`);
  lines.push(`- XP cap (clamp at max level): ${formatNumber(resolvedCap)}`);
  lines.push('');
  lines.push('### Per-level XP deltas (code table)');
  lines.push('| Level | XP to next | XP start | XP end |');
  lines.push('| --- | --- | --- | --- |');
  levelTable.forEach((entry) => {
    lines.push(`| ${entry.level} | ${formatNumber(entry.xpToNext)} | ${formatNumber(entry.xpStart)} | ${formatNumber(entry.xpEnd)} |`);
  });
  lines.push('');
  return {
    lines,
    totalXpCode,
    formulaTotal,
    xpCap: resolvedCap,
    finalSegment,
  };
}

function buildRewardSection({
  counts,
  aliasEntries,
  achievementsTotal,
  achievementsWithXp,
  achievementsCount,
  scenarios,
  totalXpCode,
  formulaTotal,
}) {
  const lines = [];
  lines.push('### Reward source inventory (grade 5 assumptions)');
  lines.push(`- Topics counted: fotema ${counts.fotema}, altema ${counts.altema}, temakor ${counts.temakor}`);
  if (aliasEntries.length) {
    const renderedAliases = aliasEntries.map(([from, to]) => `${from} -> ${to}`).join(', ');
    lines.push(`- Alias excluded from totals: ${renderedAliases}`);
  }
  lines.push(`- Achievement XP total: ${formatNumber(achievementsTotal)} (${achievementsWithXp} of ${achievementsCount} achievements grant XP)`);
  lines.push('- Practice XP: per-question rewards recorded; global XP clamped at cap.');
  lines.push('');
  lines.push('### Reachability (tests + achievements)');
  lines.push('| Scenario | Test XP | Level (test) | Test+Ach XP | Level (test+ach) | >= code max | >= constitution max |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  scenarios.forEach((scenario) => {
    const reachesCode = scenario.testXp >= totalXpCode ? 'yes' : 'no';
    const reachesConstitution = scenario.testXp >= formulaTotal ? 'yes' : 'no';
    const reachesCodeWithAch = scenario.testPlusAch >= totalXpCode ? 'yes' : 'no';
    const reachesConstitutionWithAch = scenario.testPlusAch >= formulaTotal ? 'yes' : 'no';
    lines.push(`| ${scenario.label} | ${formatNumber(scenario.testXp)} | ${scenario.level} | ${formatNumber(scenario.testPlusAch)} | ${scenario.levelWithAch} | ${reachesCode}/${reachesCodeWithAch} | ${reachesConstitution}/${reachesConstitutionWithAch} |`);
  });
  lines.push('');
  lines.push('- Reachability columns show `test-only / test+ach` results for each scenario.');
  lines.push('');
  return lines;
}

function renderAuditReport() {
  const context = loadMainContext(ROOT_DIR);

  const levelTable = readBinding(
    context,
    'typeof buildLevelTable === "function" ? buildLevelTable() : LEVEL_TABLE',
    null
  );
  if (!Array.isArray(levelTable) || levelTable.length === 0) {
    throw new Error('LEVEL_TABLE unavailable in main.js context.');
  }

  const maxLevel = readBinding(context, 'MAX_LEVEL', levelTable[levelTable.length - 1].level);
  const baseXp = readBinding(context, 'LEVEL_BASE_XP', 50);
  const growth = readBinding(context, 'LEVEL_GROWTH', 1.07);

  const configCap = Number(xpConfig.XP_CAP);
  const levelSection = buildLevelSection({
    levelTable,
    maxLevel,
    baseXp,
    growth,
    xpCap: configCap,
  });

  const aliasMap = readBinding(context, 'TOPIC_ID_ALIASES', {}) || {};
  const aliasEntries = Object.entries(aliasMap);
  const seen = new Set();
  const counts = { fotema: 0, altema: 0, temakor: 0 };
  const totals = {
    fotema: 0,
    altema: { konnyu: 0, normal: 0, nehez: 0 },
    temakor: { konnyu: 0, normal: 0, nehez: 0 },
  };
  const difficulties = ['konnyu', 'normal', 'nehez'];

  const calculateTestXp = readBinding(context, 'calculateTestXp', null);
  if (typeof calculateTestXp !== 'function') {
    throw new Error('calculateTestXp unavailable in main.js context.');
  }
  const calcXp = (topicId, grade, difficulty) => calculateTestXp({
    topicId,
    grade,
    normalizedDifficulty: difficulty,
  });

  Object.entries(xpConfig.TOPIC_CONFIG).forEach(([topicId, config]) => {
    const canonical = aliasMap[topicId] || topicId;
    if (seen.has(canonical)) return;
    seen.add(canonical);

    if (config.levelType === xpConfig.LEVEL_TYPES.FOTEMA) {
      totals.fotema += calcXp(canonical, 5, null);
      counts.fotema += 1;
      return;
    }

    if (config.levelType === xpConfig.LEVEL_TYPES.ALTEMA) {
      difficulties.forEach((diff) => {
        totals.altema[diff] += calcXp(canonical, 5, diff);
      });
      counts.altema += 1;
      return;
    }

    if (config.levelType === xpConfig.LEVEL_TYPES.TEMAKOR) {
      difficulties.forEach((diff) => {
        totals.temakor[diff] += calcXp(canonical, 5, diff);
      });
      counts.temakor += 1;
    }
  });

  const totalByDiff = {
    konnyu: totals.fotema + totals.altema.konnyu + totals.temakor.konnyu,
    normal: totals.fotema + totals.altema.normal + totals.temakor.normal,
    nehez: totals.fotema + totals.altema.nehez + totals.temakor.nehez,
  };
  const totalAllDiffs = totals.fotema
    + difficulties.reduce((sum, diff) => sum + totals.altema[diff] + totals.temakor[diff], 0);

  const achievements = readBinding(context, 'ACHIEVEMENT_CATALOG', []);
  const achievementList = Array.isArray(achievements) ? achievements : [];
  const achievementsTotal = achievementList.reduce((sum, entry) => {
    const reward = Number(entry && entry.xpReward ? entry.xpReward : 0);
    return sum + (Number.isFinite(reward) ? reward : 0);
  }, 0);
  const achievementsWithXp = achievementList.filter((entry) => Number(entry && entry.xpReward) > 0).length;

  const calculateLevelStats = readBinding(context, 'calculateLevelStats', null);
  if (typeof calculateLevelStats !== 'function') {
    throw new Error('calculateLevelStats unavailable in main.js context.');
  }
  const levelForXp = (xp) => calculateLevelStats(xp).level;

  const scenarios = [
    { key: 'konnyu', label: 'konnyu only (1 diff)', testXp: totalByDiff.konnyu },
    { key: 'normal', label: 'normal only (1 diff)', testXp: totalByDiff.normal },
    { key: 'nehez', label: 'nehez only (1 diff)', testXp: totalByDiff.nehez },
    { key: 'all', label: 'all difficulties', testXp: totalAllDiffs },
  ].map((scenario) => {
    const testPlusAch = scenario.testXp + achievementsTotal;
    return {
      ...scenario,
      testPlusAch,
      level: levelForXp(scenario.testXp),
      levelWithAch: levelForXp(testPlusAch),
    };
  });

  const rewardLines = buildRewardSection({
    counts,
    aliasEntries,
    achievementsTotal,
    achievementsWithXp,
    achievementsCount: achievementList.length,
    scenarios,
    totalXpCode: levelSection.totalXpCode,
    formulaTotal: levelSection.formulaTotal,
  });

  const lines = [];
  const dateStamp = new Date().toISOString().slice(0, 10);
  lines.push(`Generated: ${dateStamp}`);
  lines.push('');
  lines.push(...levelSection.lines);
  lines.push(...rewardLines);
  return lines.join('\n');
}

function updateDoc() {
  const content = renderAuditReport();
  const begin = '<!-- xp_audit:begin -->';
  const end = '<!-- xp_audit:end -->';
  let doc = '';
  if (fs.existsSync(DOC_PATH)) {
    doc = fs.readFileSync(DOC_PATH, 'utf8');
  }
  if (!doc.includes(begin) || !doc.includes(end)) {
    const suffix = doc.trimEnd();
    const base = suffix.length ? `${suffix}\n\n` : '';
    doc = `${base}## Scripted Metrics\n${begin}\n${content}\n${end}\n`;
  } else {
    const escapedBegin = begin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escapedBegin}[\\s\\S]*?${escapedEnd}`, 'm');
    doc = doc.replace(pattern, `${begin}\n${content}\n${end}`);
  }
  fs.writeFileSync(DOC_PATH, doc);
}

try {
  updateDoc();
  console.log('XP audit updated:', DOC_PATH);
} catch (error) {
  console.error('XP audit failed:', error.message);
  process.exit(1);
}
