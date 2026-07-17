#!/bin/bash
set -e

LAUNCHER=$(find build -name launcher -type f 2>/dev/null | head -1)
ICON=$(find build -name icon.svg -type f 2>/dev/null | head -1)
TEMPLATE="src/mainview/assets/photobooth.desktop"

if [ -z "$LAUNCHER" ]; then
  echo "Build not found. Run 'bun run build' first."
  exit 1
fi

mkdir -p ~/.local/bin ~/.local/share/applications
ln -sf "$LAUNCHER" ~/.local/bin/photobooth
sed "s|%%LAUNCHER%%|$HOME/.local/bin/photobooth|g; s|%%ICON%%|$ICON|g" < "$TEMPLATE" > ~/.local/share/applications/photobooth.desktop
update-desktop-database ~/.local/share/applications/ 2>/dev/null || true
chmod +x ~/.local/bin/photobooth

echo "Desktop file: ~/.local/share/applications/photobooth.desktop"
echo "Launcher: ~/.local/bin/photobooth"
echo "Icon: $ICON"
