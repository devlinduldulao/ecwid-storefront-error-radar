const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const copyTargets = ['public', 'src', 'assets'];

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

function writeRootIndexRedirect() {
  const html = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>Storefront Error Radar for Ecwid</title>',
    '  <meta http-equiv="refresh" content="0; url=./public/index.html">',
    '  <script>',
    '    window.location.replace("./public/index.html" + window.location.search + window.location.hash);',
    '  </script>',
    '</head>',
    '<body>',
    '  <p>Redirecting to <a href="./public/index.html">Storefront Error Radar</a>.</p>',
    '</body>',
    '</html>',
    ''
  ].join('\n');

  fs.writeFileSync(path.join(distDir, 'index.html'), html);
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
writeRootIndexRedirect();
ensureExpectedFiles();
writeBuildMeta();

console.log('Static build completed in dist/');