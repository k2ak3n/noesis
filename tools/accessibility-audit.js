const fs = require('fs');

const strict = process.argv.includes('--strict');
const cssPath = process.argv.find((arg) => arg.endsWith('.css')) || 'theme.css';

function mix(foreground, background, amount) {
  return foreground.map((channel, index) => channel * amount + background[index] * (1 - amount));
}

function parseColor(value) {
  const color = value.trim();
  const shortHex = color.match(/^#([\da-f]{3})$/i);
  if (shortHex) {
    return {
      rgb: shortHex[1].split('').map((channel) => parseInt(channel + channel, 16)),
      alpha: 1,
    };
  }

  const hex = color.match(/^#([\da-f]{6})$/i);
  if (hex) {
    return {
      rgb: [0, 2, 4].map((index) => parseInt(hex[1].slice(index, index + 2), 16)),
      alpha: 1,
    };
  }

  const rgb = color.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgb) {
    return {
      rgb: rgb.slice(1, 4).map(Number),
      alpha: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }

  throw new Error(`Unsupported literal color: ${value}`);
}

function rgbToHex(rgb) {
  return `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

function relativeLuminance(rgb) {
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(foreground, background) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function result(label, foreground, background, target, note) {
  const ratio = contrast(foreground, background);
  return {
    label,
    foreground: rgbToHex(foreground),
    background: rgbToHex(background),
    ratio,
    target,
    status: ratio >= target ? 'PASS' : 'WARN',
    note,
  };
}

function selectorBlock(css, selector) {
  const marker = `${selector} {`;
  const start = css.indexOf(marker);
  if (start === -1) throw new Error(`Missing selector: ${selector}`);

  const openingBrace = start + marker.length - 1;
  let depth = 0;
  for (let index = openingBrace; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') depth -= 1;
    if (depth === 0) return css.slice(openingBrace + 1, index);
  }
  throw new Error(`Unclosed selector block: ${selector}`);
}

function customProperties(css, selector) {
  const properties = {};
  for (const match of selectorBlock(css, selector).matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
    properties[match[1]] = match[2].trim();
  }
  return properties;
}

function color(properties, name) {
  const value = properties[name];
  if (!value) throw new Error(`Missing ${name}`);
  return parseColor(value);
}

function solidColor(properties, name) {
  const parsed = color(properties, name);
  if (parsed.alpha !== 1) throw new Error(`${name} must be opaque for this audit`);
  return parsed.rgb;
}

function composedColor(properties, name, background) {
  const parsed = color(properties, name);
  return parsed.alpha === 1 ? parsed.rgb : mix(parsed.rgb, background, parsed.alpha);
}

function palette(css) {
  const dark = customProperties(css, 'body.theme-dark');
  const light = customProperties(css, 'body.theme-light');
  const htb = customProperties(css, 'body:is(.theme-dark, .theme-light).noesis-preset-htb');

  const darkBackground = solidColor(dark, '--noesis-bg');
  const lightBackground = solidColor(light, '--noesis-bg');
  return {
    dark: {
      bg: darkBackground,
      text: solidColor(dark, '--noesis-text'),
      muted: solidColor(dark, '--noesis-muted'),
      faint: solidColor(dark, '--noesis-faint'),
      hover: composedColor(dark, '--background-modifier-hover', darkBackground),
    },
    light: {
      bg: lightBackground,
      text: solidColor(light, '--noesis-text'),
      muted: solidColor(light, '--noesis-muted'),
      faint: solidColor(light, '--noesis-faint'),
      hover: composedColor(light, '--background-modifier-hover', lightBackground),
    },
    htb: {
      bg: solidColor(htb, '--noesis-htb-canvas'),
      elevated: solidColor(htb, '--noesis-htb-elevated'),
      text: solidColor(htb, '--noesis-htb-text'),
      muted: solidColor(htb, '--noesis-htb-muted'),
      accent: solidColor(htb, '--noesis-htb-accent'),
      inlineCode: solidColor(htb, '--noesis-htb-inline-code'),
      inlineBg: solidColor(htb, '--noesis-code-inline-bg'),
      sidebarActive: solidColor(htb, '--noesis-sidebar-active-bg'),
    },
  };
}

const css = fs.readFileSync(cssPath, 'utf8');
const palettes = palette(css);
const checks = [
  result('dark text-normal on app background', palettes.dark.text, palettes.dark.bg, 4.5, 'Body text AA'),
  result('dark text-muted on app background', palettes.dark.muted, palettes.dark.bg, 4.5, 'Small UI label AA'),
  result('dark text-faint on app background', palettes.dark.faint, palettes.dark.bg, 3.0, 'Non-essential/supporting text'),
  result('dark sidebar text on hover', palettes.dark.text, palettes.dark.hover, 4.5, 'File explorer hover row'),
  result('dark sidebar muted text on hover', palettes.dark.muted, palettes.dark.hover, 4.5, 'Secondary file explorer text'),

  result('light text-normal on app background', palettes.light.text, palettes.light.bg, 4.5, 'Body text AA'),
  result('light text-muted on app background', palettes.light.muted, palettes.light.bg, 4.5, 'Small UI label AA'),
  result('light text-faint on app background', palettes.light.faint, palettes.light.bg, 3.0, 'Non-essential/supporting text'),
  result('light sidebar text on hover', palettes.light.text, palettes.light.hover, 4.5, 'File explorer hover row'),
  result('light sidebar muted text on hover', palettes.light.muted, palettes.light.hover, 4.5, 'Secondary file explorer text'),

  result('HTB text-normal on canvas', palettes.htb.text, palettes.htb.bg, 4.5, 'Body text AA'),
  result('HTB text-muted on raised panel', palettes.htb.muted, palettes.htb.elevated, 4.5, 'Small UI label AA'),
  result('HTB focus indicator on canvas', palettes.htb.muted, palettes.htb.bg, 3.0, 'WCAG non-text indicator'),
  result('HTB sidebar text on active surface', palettes.htb.text, palettes.htb.sidebarActive, 4.5, 'Selected file/folder row'),
  result('HTB accent on canvas', palettes.htb.accent, palettes.htb.bg, 3.0, 'Icon/accent indicator'),
  result('HTB inline code text', palettes.htb.inlineCode, palettes.htb.inlineBg, 4.5, 'Inline code AA'),
];

const rows = checks.map((check) => ({
  Status: check.status,
  Check: check.label,
  Ratio: `${check.ratio.toFixed(2)}:1`,
  Target: `${check.target.toFixed(1)}:1`,
  FG: check.foreground,
  BG: check.background,
  Note: check.note,
}));

console.log(`\nnoesis static accessibility audit: ${cssPath}`);
console.log('This reads literal theme tokens from the generated stylesheet. It is a smoke test, not a replacement for visual QA in Obsidian.\n');
console.table(rows);

const warnings = checks.filter((check) => check.status !== 'PASS');
if (warnings.length) {
  console.log('\nWarnings:');
  for (const warning of warnings) {
    console.log(`- ${warning.label}: ${warning.ratio.toFixed(2)}:1 against ${warning.target.toFixed(1)}:1`);
  }
  console.log('\nUse `npm run audit:a11y:strict` when you want warnings to fail the command.');
}

if (strict && warnings.length) process.exitCode = 1;
