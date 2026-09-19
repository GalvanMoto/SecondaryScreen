import Foundation
import CoreGraphics

public final class InputInjector {
    public static let shared = InputInjector()
    
    // Bounds of target secondary display in global coordinates
    public var targetBounds: CGRect = .zero
    
    private init() {}
    
    public func updateTargetDisplay(displayID: CGDirectDisplayID) {
        targetBounds = CGDisplayBounds(displayID)
        print("[InputInjector] Target display bounds set to: \(targetBounds)")
    }
    
    public func handleInput(json: [String: Any]) {
        guard let type = json["type"] as? String,
              let normX = json["x"] as? Double,
              let normY = json["y"] as? Double else {
            return
        }
        
        // Convert normalized coordinates (0.0 - 1.0) to screen coordinates
        let screenX = targetBounds.origin.x + (CGFloat(normX) * targetBounds.width)
        let screenY = targetBounds.origin.y + (CGFloat(normY) * targetBounds.height)
        let point = CGPoint(x: screenX, y: screenY)
        
        switch type {
        case "down":
            postMouseEvent(type: .leftMouseDown, point: point)
        case "move":
            postMouseEvent(type: .leftMouseDragged, point: point)
        case "up":
            postMouseEvent(type: .leftMouseUp, point: point)
        case "scroll":
            let deltaY = json["deltaY"] as? Int32 ?? 0
            postScrollEvent(deltaY: deltaY)
        default:
            break
        }
    }
    
    private func postMouseEvent(type: CGEventType, point: CGPoint) {
        guard let event = CGEvent(mouseEventSource: nil, mouseType: type, mouseCursorPosition: point, mouseButton: .left) else {
            return
        }
        event.post(tap: .cghidEventTap)
    }
    
    private func postScrollEvent(deltaY: Int32) {
        guard let event = CGEvent(scrollWheelEvent2Source: nil, units: .pixel, wheelCount: 1, wheel1: deltaY, wheel2: 0, wheel3: 0) else {
            return
        }
        event.post(tap: .cghidEventTap)
    }
}
