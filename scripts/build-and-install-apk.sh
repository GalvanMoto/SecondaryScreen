#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
APP_DIR="$DIR/android-app"
BUILD_DIR="$APP_DIR/build"
SDK_ROOT="/opt/homebrew/share/android-commandlinetools"
BUILD_TOOLS="$SDK_ROOT/build-tools/34.0.0"
PLATFORM="$SDK_ROOT/platforms/android-34/android.jar"
JAVAC="/opt/homebrew/opt/openjdk@17/bin/javac"
KEYTOOL="/opt/homebrew/opt/openjdk@17/bin/keytool"

echo "=================================================="
echo "📦 Compiling Standalone Android Secondary Screen App"
echo "=================================================="

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/gen" "$BUILD_DIR/obj" "$BUILD_DIR/apk" "$BUILD_DIR/res"

# 1. Compile Resources with aapt2
echo "1️⃣  Compiling resources..."
"$BUILD_TOOLS/aapt2" compile --dir "$APP_DIR/res" -o "$BUILD_DIR/res.zip"

# 2. Link Resources & Generate R.java
echo "2️⃣  Linking resources & generating R.java..."
"$BUILD_TOOLS/aapt2" link \
    -I "$PLATFORM" \
    "$BUILD_DIR/res.zip" \
    --manifest "$APP_DIR/AndroidManifest.xml" \
    --java "$BUILD_DIR/gen" \
    -o "$BUILD_DIR/unaligned.apk"

# 3. Compile Java Source Code
echo "3️⃣  Compiling Java source code..."
"$JAVAC" -source 17 -target 17 \
    -cp "$PLATFORM" \
    -d "$BUILD_DIR/obj" \
    $(find "$BUILD_DIR/gen" -name "*.java") \
    $(find "$APP_DIR/src" -name "*.java")

# 4. Dex with D8
echo "4️⃣  Dexing bytecode to classes.dex..."
cd "$BUILD_DIR/obj"
"$BUILD_TOOLS/d8" --release --min-api 26 --output "$BUILD_DIR" $(find . -name "*.class")
cd "$DIR"

# 5. Add classes.dex to APK
echo "5️⃣  Packaging APK..."
cd "$BUILD_DIR"
zip -u "$BUILD_DIR/unaligned.apk" classes.dex
cd "$DIR"

# 6. Zipalign APK
echo "6️⃣  Zipaligning APK..."
"$BUILD_TOOLS/zipalign" -f 4 "$BUILD_DIR/unaligned.apk" "$BUILD_DIR/aligned.apk"

# 7. Create debug keystore if needed & Sign APK
KEYSTORE="$APP_DIR/debug.keystore"
if [ ! -f "$KEYSTORE" ]; then
    echo "🔑 Generating debug keystore..."
    "$KEYTOOL" -genkeypair -keystore "$KEYSTORE" -storepass android -keypass android -alias androiddebugkey -dname "CN=Android Debug,O=Android,C=US" -validity 10000 -keyalg RSA -keysize 2048
fi

echo "7️⃣  Signing APK..."
FINAL_APK="$DIR/SecondaryScreen.apk"
"$BUILD_TOOLS/apksigner" sign \
    --ks "$KEYSTORE" \
    --ks-pass pass:android \
    --key-pass pass:android \
    --ks-key-alias androiddebugkey \
    --out "$FINAL_APK" \
    "$BUILD_DIR/aligned.apk"

echo "✅ APK Built Successfully: $FINAL_APK"

# 8. Install via ADB
if which adb >/dev/null 2>&1; then
    echo "📲 Installing on connected Motorola phone via ADB..."
    adb install -r "$FINAL_APK"
    echo "🚀 Launching Secondary Screen App on Phone..."
    adb shell am start -n com.secondaryscreen.app/.MainActivity
    echo "🎉 Secondary Screen App is now running natively on your phone!"
fi
