#!/usr/bin/env bash
# Same flow as Players Paradise / Vegas One — uses Homebrew openjdk@21 when present.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

resolve_java_home() {
  if [[ -n "${JAVA_HOME:-}" ]] && [[ -x "${JAVA_HOME}/bin/java" ]]; then
    echo "$JAVA_HOME"
    return 0
  fi
  for candidate in \
    "/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" \
    "/usr/local/opt/openjdk@21" \
    "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" \
    "/opt/homebrew/opt/openjdk@21" \
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home"; do
    if [[ -x "$candidate/bin/java" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  if command -v /usr/libexec/java_home >/dev/null 2>&1; then
    local jh
    jh=$(/usr/libexec/java_home -v 21 2>/dev/null || /usr/libexec/java_home -v 17 2>/dev/null || true)
    if [[ -n "$jh" ]] && [[ -x "$jh/bin/java" ]]; then
      echo "$jh"
      return 0
    fi
  fi
  return 1
}

if ! JAVA_HOME="$(resolve_java_home)"; then
  echo "ERROR: JDK not found. Same fix as other Desktop apps:"
  echo "  brew install openjdk@21"
  exit 1
fi

export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"
echo "Using JAVA_HOME=$JAVA_HOME"
java -version

npm run icons:android
npx cap copy android

# Shrink embedded assets (Players Paradise pattern — remote WebView loads hoodgames.com)
rm -rf \
  android/app/src/main/assets/public/images \
  android/app/src/main/assets/public/icons \
  android/app/src/main/assets/public/download/*.apk \
  android/app/src/main/assets/public/*.apk 2>/dev/null || true

cd android
./gradlew assembleDebug
cd "$ROOT"

mkdir -p public/download
cp android/app/build/outputs/apk/debug/app-debug.apk public/download/hood-games.apk
cp android/app/build/outputs/apk/debug/app-debug.apk public/hood-games.apk
echo "APK ready: public/download/hood-games.apk"
