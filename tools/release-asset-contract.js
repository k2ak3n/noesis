const fs = require('fs');
const path = require('path');

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const expectedWidth = 512;
const expectedHeight = 288;

function inspectPng(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing required screenshot: ${file}`);

  const data = fs.readFileSync(file);
  if (data.length < 24 || !data.subarray(0, 8).equals(pngSignature)) {
    throw new Error(`Screenshot must be a PNG: ${file}`);
  }
  if (data.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error(`Screenshot is missing a PNG IHDR header: ${file}`);
  }

  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
  };
}

function validate(file) {
  const { width, height } = inspectPng(file);
  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(`Screenshot must be ${expectedWidth}x${expectedHeight}; found ${width}x${height}.`);
  }
  console.log(`Release asset contract passed: ${path.basename(file)} is ${width}x${height} PNG.`);
}

if (require.main === module) {
  const file = process.argv[2] || path.join(__dirname, '..', 'screenshot.png');
  try {
    validate(file);
  } catch (error) {
    console.error(`Release asset contract failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { expectedHeight, expectedWidth, inspectPng, validate };
