const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { expectedHeight, expectedWidth, inspectPng, validate } = require('./release-asset-contract');

function pngHeader(width, height) {
  const data = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(data);
  data.writeUInt32BE(13, 8);
  data.write('IHDR', 12, 'ascii');
  data.writeUInt32BE(width, 16);
  data.writeUInt32BE(height, 20);
  return data;
}

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'noesis-release-assets-'));
const validFile = path.join(directory, 'valid.png');
const wrongSizeFile = path.join(directory, 'wrong-size.png');
const invalidFile = path.join(directory, 'invalid.png');

try {
  fs.writeFileSync(validFile, pngHeader(expectedWidth, expectedHeight));
  fs.writeFileSync(wrongSizeFile, pngHeader(640, 360));
  fs.writeFileSync(invalidFile, Buffer.from('not a PNG'));

  assert.deepStrictEqual(inspectPng(validFile), { width: expectedWidth, height: expectedHeight });
  assert.doesNotThrow(() => validate(validFile));
  assert.throws(() => validate(wrongSizeFile), /512x288/);
  assert.throws(() => inspectPng(invalidFile), /must be a PNG/);
  assert.throws(() => inspectPng(path.join(directory, 'missing.png')), /Missing required screenshot/);
  console.log('Release asset contract tests passed.');
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
