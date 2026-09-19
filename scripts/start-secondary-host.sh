#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
HOST_BIN="$DIR/macos-host/.build/debug/secondary-host"

if [ ! -f "$HOST_BIN" ]; then
    echo "📦 Building macOS Swift Host streamer..."
    (cd "$DIR/macos-host" && swift build)
fi

echo "🖥️  Checking Virtual Display..."
if ! system_profiler SPDisplaysDataType | grep -q "PhoneDisplay"; then
    echo "⚡ Creating PhoneDisplay (1920x1080 @ 60Hz)..."
    open "simpledisplay://create?name=PhoneDisplay&width=1920&height=1080"
    sleep 1
fi

echo "🔌 Setting up ADB reverse tunnel for port 5252..."
if which adb >/dev/null 2>&1; then
    adb reverse tcp:5252 tcp:5252 || true
fi

echo "🚀 Starting macOS Native Secondary Screen Host on port 5252..."
exec "$HOST_BIN"
