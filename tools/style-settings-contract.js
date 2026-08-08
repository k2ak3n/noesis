const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const settingsPath = path.join(root, 'src', 'style-settings.yml');
const generatedThemePath = path.join(root, 'dist', 'noesis', 'theme.css');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function scssFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return scssFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.scss') ? [fullPath] : [];
  });
}

function hasClass(source, className) {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\.${escaped}(?![\\w-])`).test(source);
}

function controls(settings) {
  return settings
    .split(/^\s{2}-\s*$/m)
    .map((block) => {
      const type = block.match(/^\s{4}type:\s+(class-toggle|class-select)\s*$/m)?.[1];
      const id = block.match(/^\s{4}id:\s*([^\s]+)\s*$/m)?.[1];
      if (!type || !id) return null;
      const values = type === 'class-select'
        ? [...block.matchAll(/^\s{8}value:\s*([^\s]+)\s*$/gm)].map((match) => match[1])
        : [id];
      return { id, type, values };
    })
    .filter(Boolean);
}

const settings = read(settingsPath);
const source = scssFiles(path.join(root, 'src')).map(read).join('\n');
const generated = read(generatedThemePath).replace(/^\/\* @settings[\s\S]*?\*\/\s*/, '');
const rows = controls(settings).flatMap((control) => control.values.map((value) => ({
  Control: control.id,
  Type: control.type,
  Value: value,
  Source: hasClass(source, value) ? 'PASS' : 'MISSING',
  Generated: hasClass(generated, value) ? 'PASS' : 'MISSING',
})));

console.log('\nnoesis Style Settings contract');
console.table(rows);

const failures = rows.filter((row) => row.Source !== 'PASS' || row.Generated !== 'PASS');
const htbInlineLeak = source.includes('--noesis-code-inline-color: #C3E88D;');

if (failures.length || htbInlineLeak) {
  console.error('\nEvery class-toggle and class-select value must have a source and generated CSS selector.');
  for (const failure of failures) {
    console.error(`- ${failure.Control}: ${failure.Value} is missing from ${failure.Source === 'PASS' ? 'generated CSS' : failure.Generated === 'PASS' ? 'source' : 'source and generated CSS'}`);
  }
  if (htbInlineLeak) console.error('- Inline Code must not inherit HTB syntax green.');
  process.exitCode = 1;
}
