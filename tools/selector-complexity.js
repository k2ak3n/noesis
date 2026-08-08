const fs = require('fs');

const strict = process.argv.includes('--strict');
const cssPath = process.argv.find((arg) => arg.endsWith('.css')) || 'theme.css';

const budgets = {
  important: 466,
  has: 3,
  selectorsOver180: 108,
  selectorsOver260: 38,
  maxSelectorLength: 486,
};

function extractSelectors(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...withoutComments.matchAll(/([^{}]+)\{/g)]
    .map((match) => match[1].trim())
    .filter((selector) => selector && !selector.startsWith('@') && !selector.includes(';'));
}

function count(pattern, text) {
  return (text.match(pattern) || []).length;
}

function summarize(css) {
  const selectors = extractSelectors(css);
  const longest = selectors
    .map((selector) => ({
      selector: selector.replace(/\s+/g, ' '),
      length: selector.length,
      complexity: count(/[.#:\[]/g, selector),
    }))
    .sort((a, b) => b.length - a.length)
    .slice(0, 12);

  return {
    stats: {
      lines: css.split(/\r?\n/).length,
      bytes: Buffer.byteLength(css),
      important: count(/!important/g, css),
      has: count(/:has\(/g, css),
      is: count(/:is\(/g, css),
      not: count(/:not\(/g, css),
      selectors: selectors.length,
      selectorsOver180: selectors.filter((selector) => selector.length > 180).length,
      selectorsOver260: selectors.filter((selector) => selector.length > 260).length,
      maxSelectorLength: longest[0]?.length || 0,
    },
    longest,
  };
}

const css = fs.readFileSync(cssPath, 'utf8');
const summary = summarize(css);

console.log(`\nnoesis selector complexity audit: ${cssPath}\n`);
console.table([
  { Metric: 'Lines', Value: summary.stats.lines, Budget: '-' },
  { Metric: 'Bytes', Value: summary.stats.bytes, Budget: '-' },
  { Metric: '!important', Value: summary.stats.important, Budget: budgets.important },
  { Metric: ':has()', Value: summary.stats.has, Budget: budgets.has },
  { Metric: ':is()', Value: summary.stats.is, Budget: '-' },
  { Metric: ':not()', Value: summary.stats.not, Budget: '-' },
  { Metric: 'Selectors', Value: summary.stats.selectors, Budget: '-' },
  { Metric: 'Selectors > 180 chars', Value: summary.stats.selectorsOver180, Budget: budgets.selectorsOver180 },
  { Metric: 'Selectors > 260 chars', Value: summary.stats.selectorsOver260, Budget: budgets.selectorsOver260 },
  { Metric: 'Max selector length', Value: summary.stats.maxSelectorLength, Budget: budgets.maxSelectorLength },
]);

console.log('\nLongest selectors:');
for (const entry of summary.longest) {
  console.log(`- ${entry.length} chars, complexity ${entry.complexity}: ${entry.selector}`);
}

const failures = Object.entries(budgets).filter(([metric, budget]) => summary.stats[metric] > budget);
if (failures.length) {
  console.log('\nBudget warnings:');
  for (const [metric, budget] of failures) {
    console.log(`- ${metric}: ${summary.stats[metric]} exceeds ${budget}`);
  }
}

if (strict && failures.length) {
  process.exitCode = 1;
}
