import Foundation
import Network
import UIKit
import Combine

public final class StreamReceiver: ObservableObject {
    @Published public var currentImage: UIImage?
    @Published public var connectionState: String = "Disconnected"
    @Published public var isConnected: Bool = false
    
    private var connection: NWConnection?
    private let queue = DispatchQueue(label: "com.secondaryscreen.ios.network", qos: .userInteractive)
    private var isRunning = false
    
    public init() {}
    
    public func connect(host: String = "127.0.0.1", port: UInt16 = 5252) {
        guard !isRunning else { return }
        isRunning = true
        
        let endpoint = NWEndpoint.hostPort(
            host: NWEndpoint.Host(host),
            port: NWEndpoint.Port(rawValue: port) ?? 5252
        )
        
        let conn = NWConnection(to: endpoint, using: .tcp)
        
        conn.stateUpdateHandler = { [weak self] state in
            DispatchQueue.main.async {
                switch state {
                case .ready:
                    self?.connectionState = "Connected"
                    self?.isConnected = true
                    self?.receiveFrameLoop()
                case .failed(let error):
                    self?.connectionState = "Failed: \(error.localizedDescription)"
                    self?.isConnected = false
                    self?.reconnect(host: host, port: port)
                case .waiting(let error):
                    self?.connectionState = "Waiting: \(error.localizedDescription)"
                    self?.isConnected = false
                default:
                    break
                }
            }
        }
        
        conn.start(queue: queue)
        self.connection = conn
    }
    
    private func reconnect(host: String, port: UInt16) {
        guard isRunning else { return }
        connection?.cancel()
        connection = nil
        queue.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            self?.connect(host: host, port: port)
        }
    }
    
    private func receiveFrameLoop() {
        guard let connection = connection else { return }
        
        // Read 8-byte header: 4 bytes Magic ("SCRN") + 4 bytes Length (UInt32 BigEndian)
        connection.receive(minimumIncompleteLength: 8, maximumLength: 8) { [weak self] data, _, isComplete, error in
            guard let self = self, let data = data, data.count == 8, error == nil else {
                return
            }
            
            let magic = String(data: data.subdata(in: 0..<4), encoding: .ascii)
            guard magic == "SCRN" else {
                self.receiveFrameLoop()
                return
            }
            
            let length = data.subdata(in: 4..<8).withUnsafeBytes { $0.load(as: UInt32.self).bigEndian }
            self.readFramePayload(length: Int(length))
        }
    }
    
    private func readFramePayload(length: Int) {
        guard let connection = connection, length > 0 else { return }
        
        connection.receive(minimumIncompleteLength: length, maximumLength: length) { [weak self] data, _, isComplete, error in
            guard let self = self, let data = data, error == nil else { return }
            
            if let image = UIImage(data: data) {
                DispatchQueue.main.async {
                    self.currentImage = image
                }
            }
            
            self.receiveFrameLoop()
        }
    }
    
    public func sendInput(type: String, normalizedX: CGFloat, normalizedY: CGFloat) {
        let json: [String: Any] = [
            "type": type,
            "x": Double(normalizedX),
            "y": Double(normalizedY)
        ]
        
        guard let data = try? JSONSerialization.data(withJSONObject: json),
              var jsonStr = String(data: data, encoding: .utf8) else {
            return
        }
        jsonStr += "\n"
        
        if let sendData = jsonStr.data(using: .utf8) {
            connection?.send(content: sendData, completion: .contentProcessed({ _ in }))
        }
    }
    
    public func disconnect() {
        isRunning = false
        connection?.cancel()
        connection = nil
        DispatchQueue.main.async {
            self.isConnected = false
            self.connectionState = "Disconnected"
            self.currentImage = nil
        }
    }
}
