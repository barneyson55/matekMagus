#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = new Set(process.argv.slice(2));
const allowMissing = args.has('--allow-missing');
const showHelp = args.has('--help') || args.has('-h');

if (showHelp) {
  console.log('Usage: node scripts/check_module_consistency.js [--allow-missing]');
  console.log('');
  console.log('Checks that each module referenced by index.html has required tabs');
  console.log('and emits the expected testResult payload fields.');
  process.exit(0);
}

const root = process.cwd();
const indexPath = path.join(root, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('index.html not found in current working directory.');
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const moduleMatches = [...indexHtml.matchAll(/data-src="modules\/([^"]+\.html)"/g)];
const moduleRefs = [...new Set(moduleMatches.map(match => match[1]))].sort();

const excludedModules = new Set([
  'results.html',
  'settings.html',
  'character_sheet.html',
  'placeholder.html',
]);

const modulesToCheck = moduleRefs.filter((ref) => !excludedModules.has(ref));

function decodeHtmlEntities(text) {
  if (!text) return '';
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#([0-9]+);/g, (_match, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, code) => String.fromCharCode(parseInt(code, 16)));
}

function normalizeLabel(text) {
  return decodeHtmlEntities(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function extractTabLabels(html) {
  const labels = [];
  const regex = /<button[^>]*class=["'][^"']*tab-button[^"']*["'][^>]*>([\s\S]*?)<\/button>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const raw = match[1].replace(/<[^>]+>/g, '').trim();
    if (raw) labels.push(raw);
  }
  return labels;
}

function readLocalScripts(htmlPath, html) {
  const scripts = [];
  const dir = path.dirname(htmlPath);
  const regex = /<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const src = match[1];
    if (/^(https?:)?\/\//i.test(src)) continue;
    const localPath = path.resolve(dir, src);
    if (fs.existsSync(localPath)) {
      scripts.push(fs.readFileSync(localPath, 'utf8'));
    }
  }
  return scripts;
}

const requiredTabs = {
  theory: ['elmelet', 'kulcsfogalmak', 'fogalmak', 'alapok'],
  visual: ['vizualis'],
  test: ['teszt'],
  practice: ['gyakorlas'],
};

const requiredResultKeys = [
  'topicId',
  'topicName',
  'difficulty',
  'grade',
  'percentage',
  'timestamp',
  'questions',
];

const missingFiles = [];
const tabIssues = [];
const noTestResult = [];
const payloadIssues = [];

modulesToCheck.forEach((moduleName) => {
  const modulePath = path.join(root, 'modules', moduleName);
  if (!fs.existsSync(modulePath)) {
    missingFiles.push(moduleName);
    return;
  }

  const html = fs.readFileSync(modulePath, 'utf8');
  const tabLabels = extractTabLabels(html).map(normalizeLabel);
  const missingTabs = [];
  if (!tabLabels.length) {
    missingTabs.push('theory', 'visual', 'test', 'practice');
  } else {
    Object.entries(requiredTabs).forEach(([tabKey, keywords]) => {
      const hasTab = tabLabels.some(label => keywords.some(keyword => label.includes(keyword)));
      if (!hasTab) missingTabs.push(tabKey);
    });
  }
  if (missingTabs.length) {
    tabIssues.push({ moduleName, missingTabs, tabLabels });
  }

  const scripts = readLocalScripts(modulePath, html);
  const combinedText = [html, ...scripts].join('\n');
  if (!/testResult/.test(combinedText)) {
    noTestResult.push(moduleName);
    return;
  }

  const missingKeys = requiredResultKeys.filter((key) => {
    const regex = new RegExp(`\\b${key}\\b\\s*:`, 'm');
    return !regex.test(combinedText);
  });
  if (missingKeys.length) {
    payloadIssues.push({ moduleName, missingKeys });
  }
});

function printList(title, items) {
  if (!items.length) return;
  console.log(`\n${title} (${items.length})`);
  items.forEach((item) => {
    console.log(`- ${item}`);
  });
}

console.log('Module consistency report');
console.log(`Referenced modules: ${modulesToCheck.length}`);

if (missingFiles.length) {
  const label = allowMissing ? 'Missing module files (ignored)' : 'Missing module files';
  printList(label, missingFiles);
}

if (tabIssues.length) {
  console.log(`\nModules missing required tabs (${tabIssues.length})`);
  tabIssues.forEach((issue) => {
    const labels = issue.tabLabels.length ? issue.tabLabels.join(', ') : 'none';
    console.log(`- ${issue.moduleName}: missing ${issue.missingTabs.join(', ')} (found: ${labels})`);
  });
}

if (noTestResult.length) {
  printList('Modules missing testResult emission', noTestResult);
}

if (payloadIssues.length) {
  console.log(`\nModules missing expected result payload keys (${payloadIssues.length})`);
  payloadIssues.forEach((issue) => {
    console.log(`- ${issue.moduleName}: missing ${issue.missingKeys.join(', ')}`);
  });
}

const blockingMissing = allowMissing ? [] : missingFiles;
const hasIssues = blockingMissing.length || tabIssues.length || noTestResult.length || payloadIssues.length;

if (!hasIssues) {
  console.log('\nOK: All referenced modules meet tab and payload expectations.');
} else {
  console.log('\nIssues detected.');
}

process.exit(hasIssues ? 1 : 0);
