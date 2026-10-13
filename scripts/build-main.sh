#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BINARY_NAME="tunli-main"
BINARY="$SCRIPT_DIR/../dist-sea/$BINARY_NAME"

cd "$SCRIPT_DIR/.."
rm -rf dist-sea
mkdir -p dist-sea

APP_VERSION=$(node -p "require('./package.json').version")

echo "→ Bundling with esbuild (version: $APP_VERSION)..."
npx esbuild dist/sea-main.js \
  --bundle \
  --platform=node \
  --format=esm \
  --outfile=dist/tunli-main-bundle.js \
  --minify \
  --external:react-devtools-core \
  --external:fsevents \
  --define:process.env.NODE_ENV='"production"' \
  --define:__APP_VERSION__="\"$APP_VERSION\"" \
  --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);" \
  --alias:react-devtools-core=node:buffer

# fail the build if a compile-time constant was left undefined (crashes the binary at startup)
if grep -q '__APP_VERSION__' dist/tunli-main-bundle.js; then
  echo "✗ __APP_VERSION__ is not replaced in the main bundle" >&2
  exit 1
fi

echo "→ Building SEA binary..."
node --build-sea sea-config-main.json

if [[ "$(uname)" == "Darwin" ]]; then
  echo "→ Signing binary (macOS)..."
  codesign --remove-signature "$BINARY"
  codesign --sign - "$BINARY"
fi

echo "→ Packaging..."
tar -czf "$BINARY.tar.gz" -C "$SCRIPT_DIR/../dist-sea" "$BINARY_NAME"

echo ""
echo "✓ Binary ready: bin/$BINARY_NAME"
echo "  Size binary: $(du -sh "$BINARY" | cut -f1)"
echo "  Size packed: $(du -sh "$BINARY.tar.gz" | cut -f1)"
