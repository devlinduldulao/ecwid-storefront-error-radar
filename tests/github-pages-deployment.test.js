const test = require('node:test');
const assert = require('node:assert/strict');

const { readProjectFile } = require('./helpers/browser-harness');

const publicPages = [
  'public/index.html',
  'public/storefront-test.html',
  'public/privacy.html',
  'public/support.html',
];

test('public HTML entry points use repository-safe relative asset paths', function () {
  publicPages.forEach(function (filePath) {
    const content = readProjectFile(filePath);

    assert.equal(/(?:href|src)="\/(?:public|src)\//.test(content), false, filePath + ' contains a root-absolute local asset path');
  });
});

test('support page links to the privacy notice without a root-absolute path', function () {
  const content = readProjectFile('public/support.html');

  assert.match(content, /href="\.\/privacy\.html"/);
});