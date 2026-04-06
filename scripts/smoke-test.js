const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`  ❌ ${name} — ${error.message}`);
    failed += 1;
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(__dirname, '..', relativePath));
}

console.log('\nSmoke test — static Ecwid owner dashboard\n');

test('admin dashboard exists', function () {
  if (!exists('public/index.html')) {
    throw new Error('public/index.html is missing');
  }
});

test('standalone preview exists', function () {
  if (!exists('public/storefront-test.html')) {
    throw new Error('public/storefront-test.html is missing');
  }
});

test('publishing support pages exist', function () {
  if (!exists('public/privacy.html')) {
    throw new Error('public/privacy.html is missing');
  }

  if (!exists('public/support.html')) {
    throw new Error('public/support.html is missing');
  }
});

test('build script exists', function () {
  if (!exists('scripts/build.js')) {
    throw new Error('scripts/build.js is missing');
  }
});

test('publishing guide exists', function () {
  if (!exists('docs/PUBLISHING.md')) {
    throw new Error('docs/PUBLISHING.md is missing');
  }
});

test('app market artwork sources exist', function () {
  var assetFiles = [
    'assets/marketplace/icon.svg',
    'assets/marketplace/listing-cover.svg',
    'assets/marketplace/screenshot-1-dashboard.svg',
    'assets/marketplace/screenshot-2-demo-preview.svg',
    'assets/marketplace/screenshot-3-settings.svg',
    'assets/marketplace/exported/icon-512.png',
    'assets/marketplace/exported/listing-cover-1600x900.png',
    'assets/marketplace/exported/screenshot-1-dashboard-1600x1000.png',
    'assets/marketplace/exported/screenshot-2-demo-preview-1600x1000.png',
    'assets/marketplace/exported/screenshot-3-settings-1600x1000.png'
  ];

  assetFiles.forEach(function (relativePath) {
    if (!exists(relativePath)) {
      throw new Error(relativePath + ' is missing');
    }
  });
});

test('dashboard references the diagnostics scripts', function () {
  var html = read('public/index.html');

  if (!html.includes('/src/shared/diagnostics-core.js')) {
    throw new Error('missing diagnostics core script');
  }

  if (!html.includes('/src/admin/app.js')) {
    throw new Error('missing admin app script');
  }
});

test('dashboard describes owner-only mode', function () {
  var html = read('public/index.html');

  if (!html.includes('No shopper monitoring')) {
    throw new Error('owner-only positioning missing');
  }
});

test('dashboard exposes the demo preview toggle', function () {
  var html = read('public/index.html');

  if (!html.includes('id="fake-preview-toggle"')) {
    throw new Error('demo preview toggle missing');
  }
});

test('privacy page describes browser-local diagnostics', function () {
  var html = read('public/privacy.html');

  if (!html.includes('browser-local')) {
    throw new Error('privacy copy should explain browser-local storage');
  }
});

test('static package scripts do not start Express', function () {
  var packageJson = JSON.parse(read('package.json'));
  var scriptValues = Object.values(packageJson.scripts || {}).join(' ');

  if (/src\/server|express|nodemon/.test(scriptValues)) {
    throw new Error('server-oriented scripts still present');
  }
});

test('legacy server entrypoint removed', function () {
  if (exists('src/server/index.js')) {
    throw new Error('src/server/index.js should be removed');
  }
});

test('Docker deployment removed', function () {
  if (exists('Dockerfile') || exists('docker-compose.yml')) {
    throw new Error('Docker deployment files should be removed');
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
