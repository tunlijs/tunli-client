#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BINARY_NAME="tunli-launcher"
BINARY="$SCRIPT_DIR/../dist-sea/$BINARY_NAME"

cd "$SCRIPT_DIR/.."
mkdir -p dist-sea

echo "→ Bundling launcher with esbuild..."
npx esbuild dist/launcher-main.js \
  --bundle \
  --platform=node \
  --format=esm \
  --outfile=dist/tunli-launcher-bundle.js \
  --minify \
  --external:react-devtools-core \
  --external:fsevents \
  --define:process.env.NODE_ENV='"production"' \
  --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);" \
  --alias:react-devtools-core=node:buffer

echo "→ Building launcher SEA binary..."
node --build-sea sea-config-launcher.json

if [[ "$(uname)" == "Darwin" ]]; then
  echo "→ Signing launcher binary (macOS)..."
  codesign --remove-signature "$BINARY"
  codesign --sign - "$BINARY"
fi

echo "→ Packaging launcher..."
# Package as 'tunli' so the extracted binary has the correct name
cp "$BINARY" "$SCRIPT_DIR/../dist-sea/tunli"
tar -czf "$BINARY.tar.gz" -C "$SCRIPT_DIR/../dist-sea" "tunli"
rm "$SCRIPT_DIR/../dist-sea/tunli"

echo ""
echo "✓ Launcher ready: dist-sea/$BINARY_NAME"
echo "  Size binary: $(du -sh "$BINARY" | cut -f1)"
echo "  Size packed: $(du -sh "$BINARY.tar.gz" | cut -f1)"
