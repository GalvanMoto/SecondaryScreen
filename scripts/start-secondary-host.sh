#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
HOST_BIN="$DIR/macos-host/.build/debug/secondary-host"

# Check dependencies
if ! command -v adb >/dev/null 2>&1; then
    echo "❌ ADB not found in PATH."
    echo "💡 Install ADB using Homebrew: brew install android-platform-tools"
    exit 1
fi

if ! [ -d "/Applications/SimpleDisplay.app" ]; then
    echo "⚠️  SimpleDisplay.app not found in /Applications."
    echo "💡 Download it from: https://github.com/mhaeuser/SimpleDisplay/releases"
    echo "   or install via Homebrew: brew install --cask simpledisplay"
fi

if [ ! -f "$HOST_BIN" ]; then
    echo "📦 Building macOS Swift Host streamer..."
    (cd "$DIR/macos-host" && swift build)
fi

echo "🖥️  Checking Virtual Display..."
if ! system_profiler SPDisplaysDataType | grep -q "PhoneDisplay"; then
    echo "⚡ Creating PhoneDisplay (1080x2400 @ 144Hz)..."
    open "simpledisplay://create?name=PhoneDisplay&width=1080&height=2400&refreshRate=144" || true
    sleep 1
fi

echo "🔌 Setting up ADB reverse tunnel for port 5252..."
adb reverse tcp:5252 tcp:5252 || true

echo "🚀 Starting macOS Native Secondary Screen Host on port 5252..."
exec "$HOST_BIN"
