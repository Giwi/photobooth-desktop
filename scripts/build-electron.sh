#!/usr/bin/env bash
# Build Electron main, preload, and renderer bundles with esbuild.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

rm -rf dist
mkdir -p dist/renderer

esbuild src/main/index.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist/main.cjs
esbuild src/main/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist/preload.cjs
esbuild src/main/splash-preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist/splash-preload.cjs
esbuild src/mainview/index.tsx --bundle --format=iife --outfile=dist/renderer/index.js

cp src/mainview/html/index.html dist/renderer/index.html
cp src/mainview/styles/index.css dist/renderer/index.css
cp src/mainview/html/splash.html dist/renderer/splash.html
cp src/mainview/assets/splash.png dist/renderer/splash.png
cp src/mainview/assets/icon.png dist/renderer/icon.png
cp -r src/mainview/vendor dist/renderer/vendor

echo "Built dist/main.cjs dist/preload.cjs dist/renderer/"
