# 📱 SecondaryScreen

> Turn any Android phone or iOS device into an ultra-low-latency, **144 Hz secondary display** for your Mac over USB — with zero commercial software, pure native hardware acceleration, and full touch interaction.

[![macOS](https://img.shields.io/badge/macOS-Sonoma%20%7C%20Sequoia-black?style=flat&logo=apple)](https://apple.com)
[![Android](https://img.shields.io/badge/Android-8.0%2B%20(API%2026%E2%80%9334)-green?style=flat&logo=android)](https://android.com)
[![FPS](https://img.shields.io/badge/Refresh%20Rate-Up%20to%20144%20Hz-blueviolet?style=flat)](https://github.com/GalvanMoto/SecondaryScreen)
[![Latency](https://img.shields.io/badge/Latency-%3C%207ms%20(USB)-success?style=flat)](https://github.com/GalvanMoto/SecondaryScreen)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ✨ Features

- **⚡ Up to 144 Hz Ultra-High Refresh Rate**: Direct hardware VSync synchronization on 120Hz/144Hz pOLED panels (e.g., Motorola Edge 40 Neo) with Apple `ScreenCaptureKit` capturing at 144 FPS.
- **📱 True Notch Screen Wrap**: Full edge-to-edge immersion (`LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS`) wrapping cleanly around front camera punch-holes with interactive **Wrap / Safe Mode** toggle.
- **🎨 Liquid Retina Color Matching**: Calibrated `CGColorSpace.sRGB` color profile matching MacBook Air / Pro Liquid Retina screen colors on OLED panels.
- **👆 Real-Time Touch & Mouse Injection**: Multi-touch taps and drags streamed over USB and injected directly as macOS `CGEvent` mouse clicks and drags.
- **🔄 Dynamic Resolution & Auto-Rotation**: Single-tap rotation dynamically switching between Portrait (`1080×2400`) and Landscape (`2400×1080`) virtual displays.
- **🚀 Zero-Lag Frame Backpressure**: Non-blocking frame-dropping algorithm preventing TCP socket buffer congestion and visual lag.
- **🚫 Zero Commercial Bloat**: No subscriptions, no Duet Display, no Splashtop, no web browser tabs.

---

## 🏛️ Architecture & Protocols

```
┌────────────────────────────────────────────────────────┐
│                      macOS Host                        │
│                                                        │
│  [ScreenCaptureKit] ──► [sRGB Compression] ──► 144 FPS │
│          ▲                                        │    │
│  [InputInjector] ◄──── [Port 5252 Socket] ◄───────┘    │
└───────────────────────────┬────────────────────────────┘
                            │ USB Tunnel (adb reverse)
┌───────────────────────────▼────────────────────────────┐
│                    Android / Phone                     │
│                                                        │
│  [Native TCP Client] ──► [Hardware Bitmap Decoder]     │
│                                  │                     │
│  [Touch Event Listener] ◄─ [SurfaceView (BLAST Queue)] │
│                                  │                     │
│                    144 Hz pOLED Display                │
└────────────────────────────────────────────────────────┘
```

The streamer uses a lightweight binary framing protocol:
- **Magic**: 4 bytes `SCRN` (`0x53, 0x43, 0x52, 0x4E`)
- **Length**: 4 bytes Big-Endian UInt32 payload length
- **Payload**: High-quality hardware-encoded JPEG frame
- **Upstream Input**: Newline-delimited JSON (`{"type":"down|move|up","x":0.5,"y":0.5}\n`)

---

## 📂 Repository Contents

| Component | Path | Description |
|---|---|---|
| **macOS Swift Streamer** | [`macos-host/`](macos-host/) | Native Swift host using `ScreenCaptureKit`, `Network.framework`, and `CoreGraphics`. |
| **Standalone Android App** | [`android-app/`](android-app/) | Production APK source code using hardware `SurfaceView`, notch cutout handling, and 144Hz display mode. |
| **Pre-built Signed APK** | [`SecondaryScreen.apk`](SecondaryScreen.apk) | Ready-to-install signed APK for instant deployment. |
| **Android Kotlin Client** | [`android-client/`](android-client/) | Full Gradle/Android Studio Kotlin client project. |
| **iOS Swift Client** | [`ios-client/`](ios-client/) | SwiftUI client for turning iPhones and iPads into secondary Mac displays. |
| **Automation Scripts** | [`scripts/`](scripts/) | Automated APK build and host streamer launch scripts. |

---

## 🚀 Complete Step-by-Step Setup Guide

### 1. Prerequisites on Mac
1. **macOS Sonoma (14.0+)** or **macOS Sequoia (15.0+)**.
2. **ADB (Android Platform Tools)**:
   ```bash
   brew install android-platform-tools
   ```
3. **SimpleDisplay** (Helper for creating virtual display on macOS):
   ```bash
   brew install --cask simpledisplay
   ```
   *Or download the `.dmg` from [SimpleDisplay GitHub Releases](https://github.com/mhaeuser/SimpleDisplay/releases).*

---

### 2. Enable USB Debugging on Your Android Phone
1. Go to **Settings** > **About Phone**.
2. Tap **Build Number** 7 times until Developer Mode is unlocked.
3. Go to **Settings** > **System** > **Developer Options**.
4. Enable **USB Debugging**.
5. Connect your phone to your Mac with a USB-C cable. Tap **"Always allow from this computer"** when prompted on your phone.

---

### 3. Install the App on Your Phone (One Command)

You can either install the pre-built signed APK directly:
```bash
adb install SecondaryScreen.apk
```
Or compile and sign from source using the included automated build script:
```bash
./scripts/build-and-install-apk.sh
```

---

### 4. Start the macOS Streamer

Run the launch script on your Mac:
```bash
./scripts/start-secondary-host.sh
```
*What this script does automatically:*
1. Checks for ADB and SimpleDisplay.
2. Creates the `PhoneDisplay` virtual screen matching your phone's native resolution and refresh rate.
3. Binds the USB reverse tunnel (`adb reverse tcp:5252 tcp:5252`).
4. Starts the 144 FPS hardware capture server.

---

### 5. Launch & Enjoy!
Tap the **Secondary Screen** icon on your phone's home screen. Your Mac secondary display will appear instantly with zero lag!

---

## 🎮 On-Screen Controls

- **`📱 Notch: Wrap`**: Toggles between:
  - **Wrap Mode**: Extends 100% of the Mac desktop behind and around the front punch-hole camera.
  - **Safe Mode**: Adds safe-area padding below the camera cutout so menu items are never obstructed.
- **`🔄 Rotate`**: Switches display dynamically between **Portrait (`1080×2400`)** and **Landscape (`2400×1080`)**.
- **Touch Screen**: Tap, drag, or scroll anywhere on the phone to control macOS windows and pointer.

---

## 🔧 Troubleshooting

### 1. "Device unauthorized" or phone not found
Check ADB connection:
```bash
adb devices
```
If it says `unauthorized`, unlock your phone and accept the USB Debugging RSA key prompt.

### 2. Screen Recording permission prompt on Mac
On the first run, macOS will prompt for **Screen Recording** access for `secondary-host`:
1. Open **System Settings** > **Privacy & Security** > **Screen & System Audio Recording**.
2. Toggle ON the permission for `secondary-host` (or your Terminal / IDE).

### 3. Port 5252 already in use
If another process is using port 5252:
```bash
pkill -9 -f "secondary-host"
lsof -i :5252
```

---

## 📄 License

MIT License. Free and open source for personal and commercial pair programming.
Created by [GalvanMoto](https://github.com/GalvanMoto).
