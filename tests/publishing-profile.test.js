const test = require('node:test');
const assert = require('node:assert/strict');

const { readProjectFile } = require('./helpers/browser-harness');

function loadProfile() {
  return JSON.parse(readProjectFile('config/publishing-profile.json'));
}

test('publishing profile points to the deployed GitHub Pages host and public pages', function () {
  const profile = loadProfile();

  assert.equal(profile.hostBaseUrl, 'https://devlinduldulao.github.io/ecwid-storefront-error-radar');
  assert.equal(profile.supportUrl, '/public/support.html');
  assert.equal(profile.privacyPolicyUrl, '/public/privacy.html');
  assert.equal(profile.demoUrl, '/public/index.html');
});

test('publishing profile references marketplace assets that exist in the repo', function () {
  const profile = loadProfile();

  assert.equal(profile.assets.iconSource, 'assets/marketplace/icon.svg');
  assert.equal(profile.assets.iconPng, 'assets/marketplace/exported/icon.png');
  assert.equal(profile.assets.listingBannerSource, 'assets/marketplace/listing-cover.svg');
  assert.equal(profile.assets.listingBannerPng, 'assets/marketplace/exported/listing-cover-1600x900.png');
  assert.equal(profile.screenshots.length, 3);
});