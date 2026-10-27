#!/usr/bin/with-contenv bash

# LM Studio installer for the linuxserver KasmVNC base image (Umbrel).
# Installs three things:
#   1. The desktop AppImage (extracted, no FUSE needed) -> streamed GUI
#   2. llmster + lms CLI via the official installer      -> headless daemon
#   3. Shared Umbrel folders as symlinks inside $HOME    -> file dialogs
# Everything app-owned lives in /config and persists across recreations; system
# libraries are apt packages and get reinstalled whenever they are missing.

set -e

BASE="/config/lmstudio"
ARCH_RAW="$(uname -m)"
case "$ARCH_RAW" in
  x86_64) ARCH_TAG="x64" ;;
  aarch64) ARCH_TAG="arm64" ;;
  *) echo "Unsupported architecture: $ARCH_RAW"; exit 1 ;;
esac

# Electron/GTK runtime dependencies (Ubuntu noble t64 package names) plus the
# FUSE/atomic libraries required by the AppImage runtime and llmster.
PKGS="libasound2t64 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 \
libdrm2 libgbm1 libgtk-3-0t64 libnss3 libxkbcommon0 libxcomposite1 \
libxdamage1 libxfixes3 libxrandr2 libpango-1.0-0 libcairo2 \
libatspi2.0-0t64 libxshmfence1 libfuse2t64 libatomic1 libgomp1"

deps_present() {
  dpkg -l libgtk-3-0t64 >/dev/null 2>&1 | grep -q '^ii' &&
  dpkg -l libatomic1 >/dev/null 2>&1 | grep -q '^ii'
}

if ! deps_present; then
  export DEBIAN_FRONTEND=noninteractive
  echo "Installing runtime dependencies..."
  apt-get update -qq || true
  apt-get install -y --no-install-recommends $PKGS
fi

# Resolve the current stable AppImage URL (lmstudio.ai redirects to a
# versioned file on their CDN). Falls back to whatever is already installed.
mkdir -p "$BASE"
VERSION=""
LOCATION="$(curl -sI --max-time 60 "https://lmstudio.ai/download/latest/linux/${ARCH_TAG}?format=appimage" \
  | awk 'tolower($1)=="location:"{print $2}' | tr -d '\r' | tail -1)"
if [ -n "$LOCATION" ]; then
  VERSION="$(basename "$LOCATION")"
  VERSION="${VERSION%-x64.AppImage}"
  VERSION="${VERSION%-arm64.AppImage}"
  VERSION="${VERSION#LM-Studio-}"
fi

MARKER="$BASE/.installed-version"
if [ -z "$VERSION" ]; then
  if [ -f "$MARKER" ] && [ -x "$BASE/app/squashfs-root/AppRun" ]; then
    echo "Could not resolve latest version; keeping the installed one."
    VERSION="$(cat "$MARKER")"
  else
    echo "Could not resolve the latest LM Studio AppImage URL."
    exit 1
  fi
fi

if [ ! -x "$BASE/app/squashfs-root/AppRun" ] || [ "$(cat "$MARKER" 2>/dev/null)" != "$VERSION" ]; then
  echo "Installing LM Studio ${VERSION} (${ARCH_TAG})..."
  rm -rf "$BASE/app"
  mkdir -p "$BASE/app"
  chown abc:abc "$BASE" "$BASE/app"
  if [ ! -f "$BASE/LMStudio.AppImage" ]; then
    curl -fSL --retry 3 --retry-delay 5 --max-time 1800 \
      -o "$BASE/LMStudio.AppImage" \
      "https://lmstudio.ai/download/latest/linux/${ARCH_TAG}?format=appimage"
  fi
  chmod 755 "$BASE/LMStudio.AppImage"
  su abc -s /bin/bash -c "cd '$BASE/app' && HOME=/tmp '$BASE/LMStudio.AppImage' --appimage-extract >/dev/null"
  rm -f "$BASE/LMStudio.AppImage"
  printf '%s\n' "$VERSION" >"$MARKER"
fi

# llmster + lms CLI (official installer, installs into /config/.lmstudio).
if [ ! -x "/config/.lmstudio/bin/lms" ]; then
  echo "Installing llmster..."
  su abc -s /bin/bash -c "curl -fsSL https://lmstudio.ai/install.sh | HOME=/config bash"
fi

# Store downloaded models on the shared host folder so they survive wipes of
# the app data and can be reached by other apps too.
mkdir -p "/media/Models" 2>/dev/null || true
chown abc:abc "/media/Models" 2>/dev/null || true
chmod 0777 "/media/Models" 2>/dev/null || true
mkdir -p /config/.lmstudio
ln -sfn /media/Models /config/.lmstudio/models

# Surface Umbrel's shared folders inside the app's home directory.
ln -sfn /media/Downloads /config/Downloads 2>/dev/null || true
ln -sfn /media/Documents /config/Documents 2>/dev/null || true
ln -sfn /media/Data /config/Data 2>/dev/null || true
ln -sfn /media/Models /config/Models 2>/dev/null || true
for d in /media/Data; do
  chown abc:abc "$d" 2>/dev/null || true
  chmod 0777 "$d" 2>/dev/null || true
done

# Keep openbox launching only LM Studio (single application, no desktop).
OB="/config/.config/openbox"
mkdir -p "$OB"
printf '%s\n' '/config/lmstudio/start-lmstudio.sh &' >"$OB/autostart"

BIN="$BASE/app/squashfs-root/AppRun"

# Relaunch loop: in single-application mode there is no desktop to fall back
# to, so closing the LM Studio window must bring it back instead of leaving a
# black screen. Use Umbrel's Stop/Restart to shut the app down. The llmster
# daemon is started first so lms/server work immediately.
cat >"$BASE/start-lmstudio.sh" <<EOF
#!/bin/bash
export PATH="/config/.lmstudio/bin:\$PATH"
lms daemon up >/dev/null 2>&1 || true
while true; do
  "$BIN" --no-sandbox --disable-dev-shm-usage
  sleep 2
done
EOF

chmod +x "$BASE/start-lmstudio.sh"
chown -R abc:abc "$BASE" "$OB" /config/.lmstudio 2>/dev/null || true

echo "LM Studio ${VERSION} ready."
