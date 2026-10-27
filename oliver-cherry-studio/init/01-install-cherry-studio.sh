#!/usr/bin/with-contenv bash

# First-run installer for Cherry Studio inside the linuxserver KasmVNC base image.
# Everything is extracted into /config (persistent) so the app and its
# dependencies survive container recreation without re-downloading.

set -e

CHERRY_VERSION="2.1.8"
BASE="/config/cherry-studio"
ARCH_TAG="$(uname -m)"
case "$ARCH_TAG" in
  x86_64) ARCH_TAG="x64"; GNU_TRIPLET="x86_64-linux-gnu" ;;
  aarch64) ARCH_TAG="arm64"; GNU_TRIPLET="aarch64-linux-gnu" ;;
  *) echo "Unsupported architecture: $ARCH_TAG"; exit 1 ;;
esac

MARKER="$BASE/.installed-${CHERRY_VERSION}-${ARCH_TAG}"

# Keep openbox launching only Cherry Studio (single application, no desktop).
# Written unconditionally so a stale default autostart from the base image
# (xterm) can never win over our launcher.
OB="/config/.config/openbox"
mkdir -p "$OB"
printf '%s\n' '/config/cherry-studio/start-cherry.sh &' >"$OB/autostart"

if [ -f "$MARKER" ]; then
  chown -R abc:abc "$OB"
  echo "Cherry Studio ${CHERRY_VERSION} already installed."
  exit 0
fi

echo "Installing Cherry Studio ${CHERRY_VERSION} (${ARCH_TAG})..."

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq || true

# Electron runtime dependencies (Debian/Ubuntu noble t64 package names).
PKGS="libasound2t64 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 \
libdrm2 libgbm1 libgtk-3-0t64 libnss3 libxkbcommon0 libxcomposite1 \
libxdamage1 libxfixes3 libxrandr2 libpango-1.0-0 libcairo2 \
libatspi2.0-0t64 libxshmfence1"

# Download the full dependency closure into the apt cache, then unpack it into
# a persistent directory under /config instead of installing system-wide.
mkdir -p "$BASE/deplibs" "/tmp/cherry-install"
cd /tmp/cherry-install
apt-get install -y --no-install-recommends --download-only $PKGS || true

curl -fsSL -o cherry.deb \
  "https://github.com/CherryHQ/cherry-studio/releases/download/v${CHERRY_VERSION}/Cherry-Studio-${CHERRY_VERSION}-linux-${ARCH_TAG}.deb"
dpkg-deb -x cherry.deb "$BASE/app"

for deb in /var/cache/apt/archives/*.deb; do
  [ -e "$deb" ] || continue
  dpkg-deb -x "$deb" "$BASE/deplibs"
done
rm -f /var/cache/apt/archives/*.deb

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
DIR="/config/cherry-studio"
export LD_LIBRARY_PATH="\$DIR/deplibs/usr/lib/${GNU_TRIPLET}:\$DIR/deplibs/lib/${GNU_TRIPLET}:\$(dirname "$BIN"):\${LD_LIBRARY_PATH}"
exec "$BIN" --no-sandbox --disable-dev-shm-usage "\$@"
EOF

chmod +x "$BASE/start-cherry.sh"
touch "$MARKER"

chown -R abc:abc "$BASE" "$OB"
rm -rf /tmp/cherry-install

echo "Cherry Studio ${CHERRY_VERSION} installed."
