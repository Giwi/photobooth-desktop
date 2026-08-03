#!/bin/sh
# Build a single self-extracting Linux executable from the electrobun bundle.
# Usage: bash scripts/build-self-exec.sh [bundle-dir]
set -e

BUNDLE="${1:-build/dev-linux-x64/Photobooth-dev}"
OUT="dist/Photobooth-linux-x64.sh"

if [ ! -d "$BUNDLE/bin" ]; then
  echo "Bundle not found: $BUNDLE (run 'bun run build' first)" >&2
  exit 1
fi

mkdir -p dist
TARBALL="$(mktemp /tmp/photobooth.XXXXXX.tar.gz)"
trap 'rm -f "$TARBALL"' EXIT

tar czf "$TARBALL" -C "$BUNDLE" .

# Preamble: extract the archive below and launch
{
  cat <<'EOF'
#!/bin/sh
set -e
SELF="$0"
LINE=$(awk '/^__ARCHIVE_BELOW__$/ { print NR + 1; exit 0 }' "$SELF")
RUN_DIR=$(mktemp -d /tmp/photobooth.XXXXXX)
trap 'rm -rf "$RUN_DIR"' EXIT INT TERM
echo "Extracting Photobooth..."
tail -n +"$LINE" "$SELF" | tar xzf - -C "$RUN_DIR"
cd "$RUN_DIR"
./bin/launcher "$@"
EOF
  echo "__ARCHIVE_BELOW__"
  cat "$TARBALL"
} > "$OUT"

chmod +x "$OUT"
echo "Built $OUT ($(du -h "$OUT" | cut -f1))"
