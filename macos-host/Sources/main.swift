import Foundation
import CoreGraphics

class AppCoordinator: ScreenCapturerDelegate {
    let capturer = ScreenCapturer()
    let server = StreamServer(port: 5252)
    
    init() {
        capturer.delegate = self
        server.onOrientationChanged = { [weak self] isPortrait in
            guard let self = self else { return }
            Task {
                await self.capturer.switchOrientation(toPortrait: isPortrait)
            }
        }
    }
    
    func start() async {
        print("==================================================")
        print("🚀 macOS Native Secondary Screen Host Starting...")
        print("==================================================")
        
        do {
            try server.start()
        } catch {
            print("❌ Failed to start server: \(error)")
            exit(1)
        }
        
        if !CGPreflightScreenCaptureAccess() {
            print("⚠️  Screen Recording permission needed.")
            _ = CGRequestScreenCaptureAccess()
            print("⏳ Waiting for Screen Recording toggle in System Settings...")
            
            while !CGPreflightScreenCaptureAccess() {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
            }
            print("✅ Screen Recording permission GRANTED!")
        }
        
        do {
            try await capturer.startCapture()
            print("⚡ Secondary screen streamer LIVE on port 5252 at 60 FPS!")
            print("👉 Open http://localhost:5252 on your phone!")
        } catch {
            print("❌ Failed to start screen capture: \(error)")
            exit(1)
        }
    }
    
    func didCaptureFrame(jpegData: Data) {
        server.broadcastFrame(jpegData: jpegData)
    }
}

let coordinator = AppCoordinator()

Task {
    await coordinator.start()
}

dispatchMain()
