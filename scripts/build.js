const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const copyTargets = ['public', 'src', 'assets'];
const mirroredRootPages = [
  {
    source: 'public/index.html',
    output: 'index.html',
    replacements: [
      ['./icon.svg', './public/icon.svg'],
      ['./app.css', './public/app.css'],
      ['../src/storefront/custom-storefront.css', './src/storefront/custom-storefront.css'],
      ['../src/shared/diagnostics-core.js', './src/shared/diagnostics-core.js'],
      ['../src/storefront/custom-storefront.js', './src/storefront/custom-storefront.js'],
      ['../src/admin/app.js', './src/admin/app.js'],
    ],
  },
  {
    source: 'public/privacy.html',
    output: 'privacy.html',
    replacements: [
      ['./app.css', './public/app.css'],
    ],
  },
  {
    source: 'public/support.html',
    output: 'support.html',
    replacements: [
      ['./app.css', './public/app.css'],
    ],
  },
];

const redirectPages = [
  {
    output: 'public/index.html',
    target: '../',
    title: 'Redirecting to Storefront Error Radar',
  },
];

function resetDist() {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
}

function copyTree(relativePath) {
  const fromPath = path.join(rootDir, relativePath);
  const toPath = path.join(distDir, relativePath);

  fs.cpSync(fromPath, toPath, { recursive: true });
}

function ensureExpectedFiles() {
  const requiredFiles = [
    'index.html',
    'privacy.html',
    'support.html',
    'public/index.html',
    'public/storefront-test.html',
    'public/app.css',
    'public/privacy.html',
    'public/support.html',
    'src/admin/app.js',
    'src/shared/diagnostics-core.js',
    'src/storefront/custom-storefront.js',
    'src/storefront/custom-storefront.css',
    'assets/marketplace/README.md',
    'assets/marketplace/icon.svg',
    'assets/marketplace/listing-cover.svg',
    'assets/marketplace/exported/screenshot-1-dashboard-1600x1000.png',
  ];

  requiredFiles.forEach(function (relativePath) {
    const filePath = path.join(distDir, relativePath);

    if (!fs.existsSync(filePath)) {
      throw new Error('Build output is missing ' + relativePath);
    }
  });
}

function mirrorPublicPagesToRoot() {
  mirroredRootPages.forEach(function (page) {
    const sourcePath = path.join(rootDir, page.source);
    const outputPath = path.join(distDir, page.output);
    let content = fs.readFileSync(sourcePath, 'utf8');

    page.replacements.forEach(function (replacement) {
      const fromValue = replacement[0];
      const toValue = replacement[1];

      content = content.split(fromValue).join(toValue);
    });

    fs.writeFileSync(outputPath, content);
  });
}

function writeRedirectPages() {
  redirectPages.forEach(function (page) {
    const outputPath = path.join(distDir, page.output);
    const content = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '  <meta charset="UTF-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '  <title>' + page.title + '</title>',
      '  <link rel="canonical" href="' + page.target + '">',
      '  <meta http-equiv="refresh" content="0; url=' + page.target + '">',
      '  <script>',
      '    (function () {',
      '      var nextUrl = ' + JSON.stringify(page.target) + ' + (window.location.search || "") + (window.location.hash || "");',
      '      window.location.replace(nextUrl);',
      '    }());',
      '  </script>',
      '</head>',
      '<body>',
      '  <p>Redirecting to the published app entry point. <a href="' + page.target + '">Continue</a>.</p>',
      '</body>',
      '</html>',
      '',
    ].join('\n');

    fs.writeFileSync(outputPath, content);
  });
}

function writeBuildMeta() {
  const payload = {
    builtAt: new Date().toISOString(),
    mode: 'static-owner-dashboard',
    targets: copyTargets,
  };

  fs.writeFileSync(path.join(distDir, 'build-meta.json'), JSON.stringify(payload, null, 2) + '\n');
}

resetDist();
copyTargets.forEach(copyTree);
copyTree('_headers');
mirrorPublicPagesToRoot();
writeRedirectPages();
ensureExpectedFiles();
writeBuildMeta();

console.log('Static build completed in dist/');