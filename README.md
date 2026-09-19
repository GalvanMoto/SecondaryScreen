# 📱 SecondaryScreen

> Transform any Android phone or iOS device into an ultra-low-latency, 144 Hz secondary display for your Mac over USB — with zero commercial software, pure native hardware acceleration, and full touch interaction.

[![macOS](https://img.shields.io/badge/macOS-Sonoma%20%7C%20Sequoia-black?style=flat&logo=apple)](https://apple.com)
[![Android](https://img.shields.io/badge/Android-8.0%2B%20(API%2026%E2%80%9334)-green?style=flat&logo=android)](https://android.com)
[![FPS](https://img.shields.io/badge/Refresh%20Rate-Up%20to%20144%20Hz-blueviolet?style=flat)](https://github.com)
[![Latency](https://img.shields.io/badge/Latency-%3C%207ms%20(USB)-success?style=flat)](https://github.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ✨ Features

- **⚡ Up to 144 Hz Ultra-High Refresh Rate**: Direct hardware VSync synchronization on 120Hz/144Hz panels (e.g., Motorola Edge 40 Neo pOLED) with Apple `ScreenCaptureKit` capturing at 144 FPS.
- **📱 True Notch Screen Wrap**: Full edge-to-edge immersion (`LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS`) wrapping cleanly around front camera cutouts with interactive **Wrap / Safe Mode** toggle.
- **🎨 Liquid Retina Color Matching**: Calibrated `sRGB` color space output with lossy compression tuning matching the MacBook Air / Pro Liquid Retina screen.
- **👆 Real-Time Touch Input**: Multi-touch and drag coordinates streamed back over USB and injected directly as macOS `CGEvent` mouse clicks and drags.
- **🔄 Dynamic Resolution & Auto-Rotation**: Single-tap rotation dynamically switching between Portrait (`1080×2400`) and Landscape (`2400×1080`) virtual displays.
- **🚀 Zero-Lag Frame Backpressure**: Non-blocking frame-dropping algorithm preventing TCP socket buffer congestion and audio/visual lag.
- **💻 ADB Web Command Center**: Included Next.js real-time telemetry dashboard for managing connected devices, SQLite logs, screen mirroring, shell commands, and AI Copilot.

---

## 🏛️ Architecture & Ecosystem

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

---

## 📂 Repository Contents

| Component | Path | Description |
|---|---|---|
| **macOS Swift Streamer** | [`macos-host/`](macos-host/) | High-performance Native Swift host using `ScreenCaptureKit`, `Network.framework`, and `CoreGraphics`. |
| **Standalone Android App** | [`android-app/`](android-app/) | Production APK source code using hardware `SurfaceView`, notch cutout handling, and 144Hz display mode. |
| **Android Kotlin Client** | [`android-client/`](android-client/) | Full Gradle/Android Studio Kotlin client project. |
| **iOS Swift Client** | [`ios-client/`](ios-client/) | SwiftUI client for turning iPhones and iPads into secondary Mac displays. |
| **Signed Android APK** | [`SecondaryScreen.apk`](SecondaryScreen.apk) | Pre-compiled, signed APK ready to install via ADB. |
| **Next.js Command Center** | [`src/`](src/) | Full-stack ADB management dashboard with screen mirroring and telemetry. |
| **Automation Scripts** | [`scripts/`](scripts/) | One-click launch, build, and installation scripts. |

---

## 🚀 Quick Start Guide

### Prerequisites
- macOS Sonoma (14.0+) or Sequoia (15.0+)
- Android device with USB Debugging enabled (or iOS device)
- Android SDK or ADB installed (`brew install android-platform-tools`)

### 1. Build and Install the Phone App
Connect your Android phone via USB and run:
```bash
./scripts/build-and-install-apk.sh
```
*This compiles, packages, signs, and installs `SecondaryScreen.apk` onto your phone automatically.*

### 2. Start the macOS Streamer
Run the launch script on your Mac:
```bash
./scripts/start-secondary-host.sh
```
*This automatically establishes the USB reverse tunnel (`5252`), ensures the virtual display is mounted, and starts the 144 FPS capture server.*

### 3. Tap and Stream
Tap the **Secondary Screen** app on your phone. Your Mac desktop will appear instantly at native resolution and 144 Hz!

---

## 🎮 Interactive Controls

- **`📱 Notch: Wrap`**: Toggles between edge-to-edge drawing around the camera punch-hole and safe-area padding below the cutout.
- **`🔄 Rotate`**: Switches orientation dynamically between Portrait (`1080x2400`) and Landscape (`2400x1080`).
- **Touch Screen**: Tap or drag anywhere on the phone screen to control macOS windows and cursor.

---

## 🛠️ Next.js Web Command Center (Optional)

To run the web-based ADB device manager and screen controller:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📄 License

MIT License. Free and open source for personal and commercial pair programming.
