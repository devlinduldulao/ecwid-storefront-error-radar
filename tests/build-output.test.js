const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const rootDir = path.join(__dirname, '..');

test('build emits a real root index page for GitHub Pages', function () {
  childProcess.execFileSync('node', ['scripts/build.js'], {
    cwd: rootDir,
    stdio: 'pipe',
  });

  const rootIndex = fs.readFileSync(path.join(rootDir, 'dist', 'index.html'), 'utf8');

  assert.doesNotMatch(rootIndex, /window\.location\.replace\(/);
  assert.match(rootIndex, /href="\.\/public\/app\.css"/);
  assert.match(rootIndex, /href="\.\/src\/storefront\/custom-storefront\.css"/);
  assert.match(rootIndex, /src="\.\/src\/admin\/app\.js"/);
});

test('build mirrors publish-facing support pages into the deploy root', function () {
  childProcess.execFileSync('node', ['scripts/build.js'], {
    cwd: rootDir,
    stdio: 'pipe',
  });

  const rootSupport = fs.readFileSync(path.join(rootDir, 'dist', 'support.html'), 'utf8');
  const rootPrivacy = fs.readFileSync(path.join(rootDir, 'dist', 'privacy.html'), 'utf8');

  assert.match(rootSupport, /href="\.\/public\/app\.css"/);
  assert.match(rootSupport, /devlinduldulao\.github\.io\/ecwid-storefront-error-radar\//);
  assert.match(rootPrivacy, /href="\.\/public\/app\.css"/);
});