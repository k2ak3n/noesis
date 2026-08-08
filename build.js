const fs = require('fs');
const path = require('path');
const sass = require('sass');

const root = __dirname;
const sourceSettingsPath = path.join(root, 'src', 'style-settings.yml');
const manifestPath = path.join(root, 'manifest.json');
const themeBuild = {
  name: 'noesis',
  entry: 'src/theme.scss',
  outputDirectory: 'dist/noesis',
};

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function readStyleSettings() {
  return read(sourceSettingsPath)
    .replace(/\r\n/g, '\n')
    .replace(/^name: noesis$/m, `name: ${themeBuild.name}`);
}

function releaseReadme() {
  const releaseSummary = 'Includes the Hack The Box (HTB) visual preset, technical callouts, and every Codebox palette.';
  return `# ${themeBuild.name}\n\n${releaseSummary}\n\n## Install manually\n\nCopy this folder into:\n\n\`\`\`text\n.obsidian/themes/${themeBuild.name}/\n\`\`\`\n\nThen select **${themeBuild.name}** in Obsidian's Appearance settings.\n`;
}

function writeThemeArtifact() {
  const styleSettings = readStyleSettings().replace(/\*\//g, '* /').trim();
  const result = sass.compile(path.join(root, themeBuild.entry), { style: 'expanded' });
  const css = `/* @settings\n${styleSettings}\n*/\n\n${result.css}`;
  const externalUrlRegex = /(?:@import\s+(?:url\(\s*)?['\"]?|url\(\s*['\"]?)(?:https?:)?\/\//gi;

  if (externalUrlRegex.test(css)) {
    throw new Error(`${themeBuild.name}: external http/https references are not allowed.`);
  }

  const outputDirectory = path.join(root, themeBuild.outputDirectory);
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, 'theme.css'), css);
  fs.writeFileSync(path.join(outputDirectory, 'README.md'), releaseReadme());

  const manifest = { ...JSON.parse(read(manifestPath)), name: themeBuild.name };
  fs.writeFileSync(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  fs.writeFileSync(path.join(root, 'theme.css'), css);
  console.log(`Built ${themeBuild.name} -> ${path.relative(root, outputDirectory)}`);
}

try {
  writeThemeArtifact();
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
