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

# Surface Umbrel's shared Downloads folder inside the app's home directory so
# it shows up in file dialogs.
ln -sfn /media/Downloads /config/Downloads 2>/dev/null || true

deps_present() {
  dpkg -l libgtk-3-0t64 2>/dev/null | grep -q '^ii'
}

if ! deps_present; then
  export DEBIAN_FRONTEND=noninteractive
  echo "Installing runtime dependencies..."
  apt-get update -qq || true
  apt-get install -y --no-install-recommends $PKGS
fi

if [ ! -f "$MARKER" ]; then
  echo "Installing Cherry Studio ${CHERRY_VERSION} (${ARCH_TAG})..."
  mkdir -p "$BASE/app" "/tmp/cherry-install"
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

# Relaunch loop: in single-application mode there is no desktop to fall back
# to, so closing the Cherry Studio window must bring it back instead of
# leaving a black screen. Use Umbrel's Stop/Restart to shut the app down.
cat >"$BASE/start-cherry.sh" <<EOF
#!/bin/bash
while true; do
  "$BIN" --no-sandbox --disable-dev-shm-usage
  sleep 2
done
EOF

chmod +x "$BASE/start-cherry.sh"
touch "$MARKER"

chown -R abc:abc "$BASE" "$OB"

echo "Cherry Studio ${CHERRY_VERSION} ready."
