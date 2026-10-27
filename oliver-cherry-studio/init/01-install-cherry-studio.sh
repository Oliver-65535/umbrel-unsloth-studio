#!/usr/bin/with-contenv bash

# Cherry Studio installer for the linuxserver KasmVNC base image (Umbrel).
# The app itself is extracted into /config and persists across recreations.
# System libraries are apt packages: they live outside /config, so every start
# checks whether they are still present and reinstalls them when missing
# (missing GTK/gsettings breaks native file dialogs -> black window).

set -e

CHERRY_VERSION="2.1.8"
BASE="/config/cherry-studio"
ARCH_TAG="$(uname -m)"
case "$ARCH_TAG" in
  x86_64) ARCH_TAG="x64" ;;
  aarch64) ARCH_TAG="arm64" ;;
  *) echo "Unsupported architecture: $ARCH_TAG"; exit 1 ;;
esac

MARKER="$BASE/.installed-${CHERRY_VERSION}-${ARCH_TAG}"

# Electron/GTK runtime dependencies (Ubuntu noble t64 package names).
PKGS="libasound2t64 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 \
libdrm2 libgbm1 libgtk-3-0t64 libnss3 libxkbcommon0 libxcomposite1 \
libxdamage1 libxfixes3 libxrandr2 libpango-1.0-0 libcairo2 \
libatspi2.0-0t64 libxshmfence1"

# Keep openbox launching only Cherry Studio (single application, no desktop).
OB="/config/.config/openbox"
mkdir -p "$OB"
printf '%s\n' '/config/cherry-studio/start-cherry.sh &' >"$OB/autostart"

deps_present() {
  dpkg -l libgtk-3-0t64 2>/dev/null | grep -q '^ii'
}

if [ -f "$MARKER" ] && deps_present; then
  chown -R abc:abc "$OB"
  echo "Cherry Studio ${CHERRY_VERSION} already installed."
  exit 0
fi

export DEBIAN_FRONTEND=noninteractive
echo "Installing runtime dependencies..."
apt-get update -qq || true
apt-get install -y --no-install-recommends $PKGS

if [ ! -f "$MARKER" ]; then
  echo "Installing Cherry Studio ${CHERRY_VERSION} (${ARCH_TAG})..."
  mkdir -p "/tmp/cherry-install"
  cd /tmp/cherry-install
  curl -fsSL -o cherry.deb \
    "https://github.com/CherryHQ/cherry-studio/releases/download/v${CHERRY_VERSION}/Cherry-Studio-${CHERRY_VERSION}-linux-${ARCH_TAG}.deb"
  dpkg-deb -x cherry.deb "$BASE/app"
  rm -rf /tmp/cherry-install "$BASE/deplibs"
fi

# Locate the Electron binary inside the unpacked .deb layout
# (electron-builder ships it as "/opt/Cherry Studio/CherryStudio").
BIN="$(find "$BASE/app/opt" -maxdepth 2 -type f -name "CherryStudio" | head -1)"
[ -n "$BIN" ] || BIN="$(find "$BASE/app/usr" -type f -name "cherry-studio" | head -1)"
if [ -z "$BIN" ]; then
  echo "Cherry Studio binary not found after extraction."
  exit 1
fi

cat >"$BASE/start-cherry.sh" <<EOF
#!/bin/bash
exec "$BIN" --no-sandbox --disable-dev-shm-usage "\$@"
EOF

chmod +x "$BASE/start-cherry.sh"
touch "$MARKER"

chown -R abc:abc "$BASE" "$OB"

echo "Cherry Studio ${CHERRY_VERSION} ready."
