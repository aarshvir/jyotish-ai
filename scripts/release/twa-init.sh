#!/bin/bash
# C) Android wrapper build initialization (non-interactive)
# Generates twa-manifest.json and Android project skeleton

set -e

MANIFEST_URL="https://www.vedichour.com/manifest.webmanifest"
PACKAGE_NAME="com.vedichour.app"
APP_NAME="VedicHour"

echo "=== C) TWA Bubblewrap Init ==="
echo "Manifest URL: $MANIFEST_URL"
echo "Package: $PACKAGE_NAME"
echo "App: $APP_NAME"
echo ""

# Run non-interactive init with env variables or default responses
npx @bubblewrap/cli init \
  --manifest "$MANIFEST_URL" \
  --package_name "$PACKAGE_NAME" \
  --launcher_name "$APP_NAME" \
  2>&1 | tee bubblewrap-init.log

if [ $? -eq 0 ]; then
  echo "✓ Bubblewrap init PASS"
  if [ -f "twa-manifest.json" ]; then
    echo "✓ twa-manifest.json generated"
  fi
else
  echo "✗ Bubblewrap init FAIL (see bubblewrap-init.log)"
  exit 1
fi
