#!/bin/bash
# Setup script for Storefront Error Radar for Ecwid
# Run: bash scripts/setup.sh

set -e

echo "=== Storefront Error Radar for Ecwid Setup ==="
echo ""

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js 20+ is required. Current: $(node -v 2>/dev/null || echo 'not installed')"
  exit 1
fi
echo "✅ Node.js $(node -v)"

echo ""
echo "Installing package metadata..."
npm install

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Run: npm run dev"
echo "  2. Open: http://localhost:4173/public/storefront-test.html?storeId=YOUR_STORE_ID"
echo "  3. Point your Ecwid app page URL at /public/index.html when deploying"
echo ""
