const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

const requiredFiles = [
  'public/index.html',
  'public/privacy.html',
  'public/support.html',
  'docs/PUBLISHING.md',
  'assets/marketplace/README.md',
  'assets/marketplace/icon.svg',
  'assets/marketplace/listing-cover.svg',
  'assets/marketplace/screenshot-1-dashboard.svg',
  'assets/marketplace/screenshot-2-demo-preview.svg',
  'assets/marketplace/screenshot-3-settings.svg',
  'assets/marketplace/exported/icon-512.png',
  'assets/marketplace/exported/listing-cover-1600x900.png',
  'assets/marketplace/exported/screenshot-1-dashboard-1600x1000.png',
  'assets/marketplace/exported/screenshot-2-demo-preview-1600x1000.png',
  'assets/marketplace/exported/screenshot-3-settings-1600x1000.png',
  '.github/workflows/publish-readiness.yml'
];

const requiredSupportSnippets = [
  'Storefront Error Radar Support',
  'Diagnostic workflow',
  'Privacy Notice',
  'github.com/devlinduldulao/ecwid-storefront-error-radar/issues'
];

const requiredPrivacySnippets = [
  'browser-local',
  'does not run for live shoppers',
  'Export JSON'
];

function assertExists(relativePath) {
  const filePath = path.join(rootDir, relativePath);

  if (!fs.existsSync(filePath)) {
    throw new Error(relativePath + ' is missing');
  }
}

function assertIncludes(relativePath, snippet) {
  const filePath = path.join(rootDir, relativePath);
  const content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes(snippet)) {
    throw new Error(relativePath + ' is missing required text: ' + snippet);
  }
}

console.log('\nPublish readiness check\n');

requiredFiles.forEach(assertExists);
requiredSupportSnippets.forEach(function (snippet) {
  assertIncludes('public/support.html', snippet);
});
requiredPrivacySnippets.forEach(function (snippet) {
  assertIncludes('public/privacy.html', snippet);
});

assertIncludes('docs/PUBLISHING.md', 'support URL');
assertIncludes('docs/PUBLISHING.md', 'privacy URL');
assertIncludes('docs/PUBLISHING.md', 'https://devlinduldulao.github.io/ecwid-storefront-error-radar/public/index.html');
assertIncludes('assets/marketplace/README.md', 'icon');
assertIncludes('assets/marketplace/README.md', 'listing banner or cover image');
assertIncludes('assets/marketplace/README.md', 'exported');

console.log('  OK publish-facing pages, docs, workflows, and artwork sources are present.\n');