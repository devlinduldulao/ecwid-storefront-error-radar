const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const rootDir = path.join(__dirname, '..');

test('build emits a root index redirect for GitHub Pages', function () {
  childProcess.execFileSync('node', ['scripts/build.js'], {
    cwd: rootDir,
    stdio: 'pipe',
  });

  const rootIndex = fs.readFileSync(path.join(rootDir, 'dist', 'index.html'), 'utf8');

  assert.match(rootIndex, /url=\.\/public\/index\.html/);
  assert.match(rootIndex, /window\.location\.replace\("\.\/public\/index\.html" \+ window\.location\.search \+ window\.location\.hash\)/);
});