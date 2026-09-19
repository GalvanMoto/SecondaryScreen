import Foundation
import Network

final class StreamClient {
    let connection: NWConnection
    var isBusy = false
    
    init(connection: NWConnection) {
        self.connection = connection
    }
}

public final class StreamServer {
    private let port: NWEndpoint.Port
    private var listener: NWListener?
    
    // Thread safety lock
    private let lock = NSLock()
    private var binaryClients: [NWConnection] = []
    private var mjpegClients: [StreamClient] = []
    
    public var onOrientationChanged: ((Bool) -> Void)?
    
    private let serverQueue = DispatchQueue(label: "com.secondaryscreen.server.serial")
    
    public init(port: UInt16 = 5252) {
        self.port = NWEndpoint.Port(rawValue: port) ?? 5252
    }
    
    public func start() throws {
        let params = NWParameters.tcp
        let listener = try NWListener(using: params, on: port)
        
        listener.stateUpdateHandler = { state in
            switch state {
            case .ready:
                print("[StreamServer] High-Speed Stream Server listening on port \(self.port)...")
            case .failed(let error):
                print("[StreamServer] Listener failed: \(error)")
            default:
                break
            }
        }
        
        listener.newConnectionHandler = { [weak self] connection in
            self?.handleNewConnection(connection)
        }
        
        listener.start(queue: serverQueue)
        self.listener = listener
    }
    
    private func handleNewConnection(_ connection: NWConnection) {
        connection.start(queue: serverQueue)
        
        connection.receive(minimumIncompleteLength: 4, maximumLength: 1024) { [weak self] data, _, isComplete, error in
            guard let self = self, let data = data, !data.isEmpty, error == nil else {
                return
            }
            
            let reqStr = String(data: data, encoding: .utf8) ?? ""
            
            if reqStr.starts(with: "GET ") {
                self.handleHTTPRequest(connection: connection, request: reqStr)
            } else {
                print("[StreamServer] 🚀 Native Android binary client connected: \(connection.endpoint)")
                self.lock.lock()
                self.binaryClients.append(connection)
                self.lock.unlock()
                
                // Process the first packet that was already read
                self.processIncomingBinaryData(data)
                self.receiveBinaryInputLoop(connection)
            }
        }
    }
    
    private func handleHTTPRequest(connection: NWConnection, request: String) {
        let lines = request.components(separatedBy: "\r\n")
        guard let requestLine = lines.first else { return }
        let parts = requestLine.components(separatedBy: " ")
        guard parts.count >= 2 else { return }
        
        let path = parts[1]
        
        if path == "/" || path.starts(with: "/?") {
            // Serve Advanced Fullscreen Web Viewer with Auto-Rotation
            let html = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <title>Mac Secondary Screen</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-touch-callout: none; }
                    body, html { width: 100vw; height: 100vh; background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center; touch-action: none; font-family: -apple-system, sans-serif; }
                    #stream { 
                        width: 100%; 
                        height: 100%; 
                        object-fit: contain; 
                        position: absolute; 
                        top: 0; 
                        left: 0; 
                    }
                    .controls {
                        position: fixed; top: 16px; right: 16px;
                        display: flex; gap: 8px; z-index: 9999;
                    }
                    .btn {
                        background: rgba(0,0,0,0.65); color: #fff; border: 1px solid rgba(255,255,255,0.4);
                        padding: 8px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer;
                        backdrop-filter: blur(8px);
                    }
                </style>
            </head>
            <body>
                <div class="controls">
                    <button class="btn" onclick="toggleRotate()">🔄 Rotate</button>
                    <button class="btn" id="fullscreen-btn" onclick="toggleFullscreen()">⛶ Fullscreen</button>
                </div>
                <img id="stream" src="/stream" />

                <script>
                    const stream = document.getElementById('stream');
                    let lastMode = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';

                    function toggleFullscreen() {
                        if (!document.fullscreenElement) {
                            document.documentElement.requestFullscreen().catch(()=>{});
                            document.getElementById('fullscreen-btn').style.display = 'none';
                        }
                    }

                    function notifyOrientation(mode) {
                        fetch('/orientation?mode=' + mode, { method: 'GET', keepalive: true }).catch(()=>{});
                    }

                    function checkOrientation() {
                        const isPortrait = window.innerHeight > window.innerWidth;
                        const currentMode = isPortrait ? 'portrait' : 'landscape';
                        if (currentMode !== lastMode) {
                            lastMode = currentMode;
                            notifyOrientation(currentMode);
                        }
                    }

                    function toggleRotate() {
                        lastMode = lastMode === 'portrait' ? 'landscape' : 'portrait';
                        notifyOrientation(lastMode);
                    }

                    window.addEventListener('resize', checkOrientation);
                    window.addEventListener('orientationchange', checkOrientation);
                    if (screen.orientation) {
                        screen.orientation.addEventListener('change', checkOrientation);
                    }

                    // Report initial orientation to match phone on start
                    notifyOrientation(lastMode);

                    function sendTouch(type, e) {
                        const touch = e.touches[0] || e.changedTouches[0];
                        if (!touch) return;
                        const rect = stream.getBoundingClientRect();
                        const x = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
                        const y = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));

                        fetch('/input?type=' + type + '&x=' + x.toFixed(4) + '&y=' + y.toFixed(4), { method: 'GET', keepalive: true }).catch(()=>{});
                    }

                    stream.addEventListener('touchstart', (e) => { e.preventDefault(); sendTouch('down', e); }, { passive: false });
                    stream.addEventListener('touchmove', (e) => { e.preventDefault(); sendTouch('move', e); }, { passive: false });
                    stream.addEventListener('touchend', (e) => { e.preventDefault(); sendTouch('up', e); }, { passive: false });
                </script>
            </body>
            </html>
            """
            let response = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: \(html.utf8.count)\r\nConnection: close\r\n\r\n" + html
            connection.send(content: response.data(using: .utf8), completion: .contentProcessed({ _ in
                connection.cancel()
            }))
            
        } else if path.starts(with: "/orientation") {
            let urlComponents = URLComponents(string: path)
            let mode = urlComponents?.queryItems?.first(where: { $0.name == "mode" })?.value ?? "landscape"
            let isPortrait = (mode == "portrait")
            print("[StreamServer] 📱 Phone requested orientation: \(mode.uppercased())")
            onOrientationChanged?(isPortrait)
            
            let response = "HTTP/1.1 204 No Content\r\nConnection: close\r\n\r\n"
            connection.send(content: response.data(using: .utf8), completion: .contentProcessed({ _ in
                connection.cancel()
            }))
            
        } else if path.starts(with: "/stream") {
            // MJPEG Multipart Stream - Must use HTTP/1.0 for unbounded multipart streaming in Chromium
            print("[StreamServer] 📱 Phone stream client requested /stream")
            let header = "HTTP/1.0 200 OK\r\nConnection: close\r\nServer: SecondaryScreen/1.0\r\nCache-Control: no-cache, no-store, must-revalidate\r\nPragma: no-cache\r\nContent-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n"
            let client = StreamClient(connection: connection)
            
            // Add client immediately
            self.lock.lock()
            self.mjpegClients.append(client)
            let count = self.mjpegClients.count
            self.lock.unlock()
            print("[StreamServer] ✅ Phone stream client connected! Active viewers: \(count)")
            
            connection.send(content: header.data(using: .utf8), completion: .contentProcessed({ [weak self] error in
                if let error = error {
                    print("[StreamServer] ❌ Failed to send MJPEG header: \(error)")
                    self?.lock.lock()
                    self?.mjpegClients.removeAll(where: { $0 === client })
                    self?.lock.unlock()
                }
            }))
            
            // Monitor client socket disconnect
            connection.receive(minimumIncompleteLength: 1, maximumLength: 128) { [weak self] _, _, isComplete, error in
                if isComplete || error != nil {
                    self?.lock.lock()
                    self?.mjpegClients.removeAll(where: { $0 === client })
                    let remaining = self?.mjpegClients.count ?? 0
                    self?.lock.unlock()
                    print("[StreamServer] 🔌 Client closed stream. Remaining viewers: \(remaining)")
                }
            }
            
        } else if path.starts(with: "/input") {
            let urlComponents = URLComponents(string: path)
            var json: [String: Any] = [:]
            for item in urlComponents?.queryItems ?? [] {
                if item.name == "type" { json["type"] = item.value }
                else if item.name == "x" { json["x"] = Double(item.value ?? "0") ?? 0 }
                else if item.name == "y" { json["y"] = Double(item.value ?? "0") ?? 0 }
            }
            InputInjector.shared.handleInput(json: json)
            
            let response = "HTTP/1.1 204 No Content\r\nConnection: close\r\n\r\n"
            connection.send(content: response.data(using: .utf8), completion: .contentProcessed({ _ in
                connection.cancel()
            }))
        } else {
            let response = "HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n"
            connection.send(content: response.data(using: .utf8), completion: .contentProcessed({ _ in
                connection.cancel()
            }))
        }
    }
    
    private func processIncomingBinaryData(_ data: Data) {
        guard let str = String(data: data, encoding: .utf8) else { return }
        for line in str.split(separator: "\n") {
            if let lineData = line.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: lineData) as? [String: Any] {
                if let type = json["type"] as? String, type == "orientation" {
                    let isPortrait = (json["mode"] as? String) == "portrait"
                    print("[StreamServer] 📱 Native client requested orientation: \(json["mode"] ?? "")")
                    self.onOrientationChanged?(isPortrait)
                } else {
                    InputInjector.shared.handleInput(json: json)
                }
            }
        }
    }
    
    private func receiveBinaryInputLoop(_ connection: NWConnection) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 4096) { [weak self] data, _, isComplete, error in
            guard let self = self else { return }
            
            if let data = data, !data.isEmpty {
                self.processIncomingBinaryData(data)
            }
            
            if isComplete || error != nil {
                self.lock.lock()
                self.binaryClients.removeAll(where: { $0 === connection })
                self.lock.unlock()
            } else {
                self.receiveBinaryInputLoop(connection)
            }
        }
    }
    
    private var broadcastCount = 0

    public func broadcastFrame(jpegData: Data) {
        lock.lock()
        let currentMjpeg = mjpegClients
        let currentBinary = binaryClients
        lock.unlock()
        
        broadcastCount += 1
        if broadcastCount % 60 == 1 {
            print("[StreamServer] broadcastFrame #\(broadcastCount), MJPEG clients: \(currentMjpeg.count), Binary: \(currentBinary.count)")
        }
        
        // 1. Broadcast to MJPEG HTTP clients
        if !currentMjpeg.isEmpty {
            let partHeader = "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: \(jpegData.count)\r\n\r\n"
            var mjpegPacket = partHeader.data(using: .utf8)!
            mjpegPacket.append(jpegData)
            mjpegPacket.append("\r\n".data(using: .utf8)!)
            
            for client in currentMjpeg {
                if client.isBusy {
                    continue
                }
                client.isBusy = true
                
                client.connection.send(content: mjpegPacket, completion: .contentProcessed({ [weak self] error in
                    client.isBusy = false
                    if let err = error {
                        print("[StreamServer] ⚠️ Client error: \(err)")
                        self?.lock.lock()
                        self?.mjpegClients.removeAll(where: { $0 === client })
                        self?.lock.unlock()
                    }
                }))
            }
        }
        
        // 2. Broadcast to Native Clients (Kotlin / iOS Swift binary sockets)
        if !currentBinary.isEmpty {
            var packet = Data([0x53, 0x43, 0x52, 0x4E]) // "SCRN"
            var length = UInt32(jpegData.count).bigEndian
            withUnsafeBytes(of: &length) { packet.append(contentsOf: $0) }
            packet.append(jpegData)
            
            for client in currentBinary {
                client.send(content: packet, completion: .contentProcessed({ [weak self] error in
                    if error != nil {
                        self?.lock.lock()
                        self?.binaryClients.removeAll(where: { $0 === client })
                        self?.lock.unlock()
                    }
                }))
            }
        }
    }
}
