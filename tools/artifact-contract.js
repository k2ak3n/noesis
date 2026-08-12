const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'dist', 'noesis');
const styleSettingsPath = path.join(root, 'src', 'style-settings.yml');
const requiredTokens = [
  'noesis-preset-htb',
  'noesis-syntax-vscode',
  'noesis-syntax-one-dark',
  'noesis-syntax-solarized',
  'noesis-syntax-htb',
  'attackchain',
  'noesis-code-contrast',
  'noesis-callouts-on',
  'noesis-callout-style',
  'noesis-callout-headers-hidden',
  'noesis-search-matches-accent',
  'noesis-tab-active-accent',
  '--noesis-current-accent: var(--color-accent);',
  ':is(.tag, .cm-hashtag, .metadata-property .multi-select-pill) {',
  'border-radius: var(--radius-s);',
];

const forbiddenGeneratedTokens = [
  'noesis-tabs-material',
  'noesis-tab-material-active-bg',
  'noesis-accent-source',
  'noesis-custom-accent-color',
  'noesis-accent-custom',
  'noesis-accent-meridian',
  'noesis-accent-laurel',
  'noesis-accent-aster',
  'noesis-accent-solstice',
  'noesis-tags-square',
  'noesis-dataview-compat',
  'noesis-surface-tone',
  'noesis-surface-eleganto',
  'noesis-surface-graphite',
  'noesis-tabs-topline',
  'noesis-stacked-tabs-top-flipped',
  'noesis-stacked-tabs-bottom-flipped',
  'noesis-stacked-tabs-center-flipped',
];
const requiredNativeCalloutSelectors = [
  'body.noesis-callouts-on .callout[data-callout=note] {',
  'body.noesis-callouts-on .callout[data-callout=todo] {',
  'body.noesis-callouts-on .callout:is([data-callout=warning]',
  'body.noesis-callouts-on .callout[data-callout=bug] {',
];

const requiredCustomCalloutSelectors = [
  '.callout[data-callout=definition] {',
  '.callout[data-callout=timeline] {',
  '.callout[data-callout=attackchain] {',
  'body.noesis-callouts-on .callout[data-callout=timeline] .callout-content',
  'body.noesis-callouts-on .callout[data-callout=attackchain] .callout-content',
];
const requiredSurfaceHierarchyTokens = [
  '--noesis-tab-content-bg: var(--background-primary);',
  '--noesis-tab-active-bg: var(--background-primary);',
  '--noesis-tab-strip-bg-base: var(--background-secondary);',
  '--titlebar-background: var(--background-secondary);',
  '--background-secondary: #f9f9f9;',
  'body .workspace .mod-root :is(.workspace-leaf-content, .view-content) {',
  'body .workspace .mod-root .workspace-tabs:not(.mod-stacked) {',
  'background: var(--noesis-tab-active-bg);',
  'border-bottom-color: var(--noesis-tab-indicator);',
  '--noesis-underline-indicator-color: var(--noesis-tab-indicator);',
  'body.noesis-tabs-underline .workspace .mod-root .workspace-tabs:not(.mod-stacked) .workspace-tab-header {',
  'body.noesis-tabs-underline :is(.mod-left-split, .mod-right-split) .workspace-tabs:not(.mod-stacked) .workspace-tab-header-inner {',
  'box-shadow: inset 0 -2px 0 var(--noesis-underline-indicator-color);',
  'stroke-width: var(--icon-stroke, 2);',
  '--noesis-line-tabs-ribbon-surface-bleed: 6px;',
  'padding-block: 0;',
  'align-items: stretch;',
  'box-shadow: 0 calc(-1 * var(--noesis-line-tabs-ribbon-surface-bleed)) 0 var(--noesis-line-tabs-ribbon-active-bg);',
];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const calloutSource = ['src/_callouts.scss', 'src/_technical-callout-types.scss', 'src/_print.scss'].map((file) => read(path.join(root, file))).join('\n');
const workspaceChromeSource = read(path.join(root, 'src', '_workspace-chrome.scss'));

const failures = [];
for (const filename of ['theme.css', 'manifest.json', 'README.md']) {
  if (!fs.existsSync(path.join(directory, filename))) failures.push(`noesis: missing ${filename}`);
}

const manifest = JSON.parse(read(path.join(directory, 'manifest.json')));
if (manifest.name !== 'noesis') failures.push('noesis: manifest name mismatch');
if (manifest.minAppVersion !== '1.13.0') failures.push('noesis: minAppVersion must be 1.13.0 for native callout colors');

const css = read(path.join(directory, 'theme.css'));
for (const token of requiredTokens) {
  if (!css.includes(token)) failures.push(`noesis: missing ${token}`);
}
if (!css.includes('default: noesis-preset-default')) failures.push('noesis: Default must be the default visual preset');
for (const selector of requiredNativeCalloutSelectors) {
  if (!css.includes(selector)) failures.push(`noesis: missing native callout compatibility selector ${selector}`);
}
for (const selector of requiredCustomCalloutSelectors) {
  if (!css.includes(selector)) failures.push(`noesis: missing custom callout selector ${selector}`);
}
for (const token of requiredSurfaceHierarchyTokens) {
  if (!css.includes(token)) failures.push(`noesis: missing surface hierarchy token ${token}`);
}
for (const token of forbiddenGeneratedTokens) {
  if (css.includes(token)) failures.push(`noesis: generated CSS must not include ${token}`);
}
for (const token of ['!important', ':has(']) {
  if (css.includes(token)) failures.push(`noesis: generated CSS must not include ${token}`);
}
for (const text of [css, calloutSource]) {
  if (/--callout-color:\s*\d+\s*,\s*\d+\s*,\s*\d+/.test(text)) failures.push('noesis: callout colors must use valid CSS color values');
  if (/rgba?\(var\(--callout-color\)/.test(text)) failures.push('noesis: callout colors must not use legacy rgb()/rgba() wrappers');
  if (/body:not\(\.noesis-callouts-on\)\s+\.callout/.test(text)) failures.push('noesis: disabled custom callouts must use Obsidian native styling');
}
if (/&\.is-active \.workspace-tab-header-inner\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--noesis-tab-indicator\)/s.test(workspaceChromeSource)) failures.push('noesis: root Pills active tabs must use the document surface, not an accent-tinted fill');
if (/box-shadow:\s*0\s+calc\(-1 \* var\(--noesis-underline-selection-surface-bleed\)\)\s+0\s+var\(--noesis-tab-active-bg\)/.test(workspaceChromeSource)) failures.push('noesis: Underline root tabs must align to the strip instead of painting a clipped shadow');
if (/(?:noesis-surface-tone|noesis-colors-surface-subcategory)/.test(read(styleSettingsPath))) failures.push('noesis: Style Settings must not include retired surface palette controls');
if (read(styleSettingsPath).includes('noesis-tabs-material')) failures.push('noesis: Style Settings must not include the Material tab style');
if (/(?:noesis-accent-source|noesis-custom-accent-color)/.test(read(styleSettingsPath))) failures.push('noesis: Style Settings must use Obsidian accent only');
if (read(styleSettingsPath).includes('noesis-tags-square')) failures.push('noesis: Style Settings must not include the retired Square Tags toggle');
if (read(styleSettingsPath).includes('noesis-dataview-compat')) failures.push('noesis: Style Settings must not include the retired Dataview compatibility toggle');
if (read(path.join(root, 'theme.css')) !== css) failures.push('Root theme.css must mirror the noesis artifact');

const styleSettingIds = [...new Set(
  [...read(styleSettingsPath).matchAll(/^\s+id:\s*([^\s]+)\s*$/gm)].map((match) => match[1]),
)];
for (const id of styleSettingIds) {
  if (!css.includes(`id: ${id}`)) failures.push(`noesis: generated CSS is missing Style Settings control ${id}`);
}

const classToggleIds = read(styleSettingsPath)
  .split(/^\s{2}-\s*$/m)
  .filter((block) => /^\s{4}type:\s+class-toggle\s*$/m.test(block))
  .map((block) => block.match(/^\s{4}id:\s*([^\s]+)\s*$/m)?.[1])
  .filter(Boolean);
for (const id of classToggleIds) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp('\\.' + escapedId + '(?![\\w-])').test(css)) {
    failures.push('noesis: class-toggle ' + id + ' has no generated CSS selector');
  }
}

if (failures.length) {
  console.error('Artifact contract failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log('Artifact contract passed: noesis includes the complete feature set.');
