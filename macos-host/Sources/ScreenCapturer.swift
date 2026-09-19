import Foundation
import ScreenCaptureKit
import CoreMedia
import CoreImage
import ImageIO

public protocol ScreenCapturerDelegate: AnyObject {
    func didCaptureFrame(jpegData: Data)
}

public final class ScreenCapturer: NSObject, SCStreamOutput, SCStreamDelegate {
    public weak var delegate: ScreenCapturerDelegate?
    private var stream: SCStream?
    private let ciContext = CIContext(options: [.useSoftwareRenderer: false])
    private let srgbColorSpace = CGColorSpace(name: CGColorSpace.sRGB) ?? CGColorSpaceCreateDeviceRGB()
    private let frameQueue = DispatchQueue(label: "com.secondaryscreen.framequeue", qos: .userInteractive)
    private var isCapturing = false
    public private(set) var isPortrait = false
    private var isSwitchingOrientation = false
    
    public override init() {
        super.init()
    }
    
    public func startCapture(displayID: CGDirectDisplayID? = nil) async throws {
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
        
        guard let targetDisplay = content.displays.first(where: { display in
            if let displayID = displayID {
                return display.displayID == displayID
            }
            // Prefer external or secondary display if available
            return content.displays.count > 1 ? display != content.displays.first : true
        }) ?? content.displays.first else {
            throw NSError(domain: "ScreenCapturer", code: 1, userInfo: [NSLocalizedDescriptionKey: "No display found"])
        }
        
        isPortrait = targetDisplay.height > targetDisplay.width
        print("[ScreenCapturer] Selected display: ID \(targetDisplay.displayID) [\(targetDisplay.width)x\(targetDisplay.height)] (Portrait: \(isPortrait))")
        InputInjector.shared.updateTargetDisplay(displayID: targetDisplay.displayID)
        
        let filter = SCContentFilter(display: targetDisplay, excludingWindows: [])
        
        let config = SCStreamConfiguration()
        if isPortrait {
            config.width = 1080
            config.height = 2400
        } else {
            config.width = 2400
            config.height = 1080
        }
        config.minimumFrameInterval = CMTime(value: 1, timescale: 144) // 144 FPS High Refresh Rate
        config.queueDepth = 3
        config.showsCursor = true
        config.pixelFormat = kCVPixelFormatType_32BGRA
        
        let scStream = SCStream(filter: filter, configuration: config, delegate: self)
        try scStream.addStreamOutput(self, type: .screen, sampleHandlerQueue: frameQueue)
        try await scStream.startCapture()
        
        self.stream = scStream
        self.isCapturing = true
        print("[ScreenCapturer] ⚡ Ultra-smooth 144 FPS Native ScreenCaptureKit capture started!")
    }
    
    public func stopCapture() async {
        guard isCapturing, let stream = stream else { return }
        try? await stream.stopCapture()
        self.stream = nil
        self.isCapturing = false
    }
    
    public func switchOrientation(toPortrait targetPortrait: Bool) async {
        guard !isSwitchingOrientation else { return }
        if isCapturing && targetPortrait == isPortrait { return }
        
        isSwitchingOrientation = true
        defer { isSwitchingOrientation = false }
        
        print("[ScreenCapturer] 🔄 Switching orientation to: \(targetPortrait ? "Portrait" : "Landscape")...")
        await stopCapture()
        
        let width = targetPortrait ? 1080 : 2400
        let height = targetPortrait ? 2400 : 1080
        
        // Remove and recreate virtual display with native 20:9 resolution
        let removeProc = Process()
        removeProc.executableURL = URL(fileURLWithPath: "/usr/bin/open")
        removeProc.arguments = ["simpledisplay://remove?name=PhoneDisplay"]
        try? removeProc.run()
        removeProc.waitUntilExit()
        
        try? await Task.sleep(nanoseconds: 600_000_000)
        
        let createProc = Process()
        createProc.executableURL = URL(fileURLWithPath: "/usr/bin/open")
        createProc.arguments = ["simpledisplay://create?name=PhoneDisplay&width=\(width)&height=\(height)"]
        try? createProc.run()
        createProc.waitUntilExit()
        
        try? await Task.sleep(nanoseconds: 800_000_000)
        
        do {
            try await startCapture()
            print("[ScreenCapturer] ✅ Orientation switched successfully to \(targetPortrait ? "Portrait" : "Landscape")!")
        } catch {
            print("[ScreenCapturer] ❌ Failed to restart capture after orientation switch: \(error)")
        }
    }
    
    private var frameCount = 0

    // SCStreamOutput callback
    public func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        frameCount += 1
        if frameCount % 60 == 1 {
            print("[ScreenCapturer] Outputting frame #\(frameCount)")
        }
        guard type == .screen, !isSwitchingOrientation else { return }
        guard let pixelBuffer = sampleBuffer.imageBuffer else { return }
        
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let lossyOption = CIImageRepresentationOption(rawValue: "kCGImageDestinationLossyFactor")
        guard let jpegData = ciContext.jpegRepresentation(of: ciImage, colorSpace: srgbColorSpace, options: [lossyOption: 0.80]) else {
            print("[ScreenCapturer] ⚠️ Failed to encode jpeg representation")
            return
        }
        
        delegate?.didCaptureFrame(jpegData: jpegData)
    }
}
