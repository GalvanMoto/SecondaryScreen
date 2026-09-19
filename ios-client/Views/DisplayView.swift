import SwiftUI

public struct DisplayView: View {
    @StateObject private var receiver = StreamReceiver()
    @State private var hostInput: String = "127.0.0.1"
    
    public init() {}
    
    public var body: some View {
        GeometryReader { geometry in
            ZStack {
                Color.black.ignoresSafeArea()
                
                if let image = receiver.currentImage {
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: geometry.size.width, height: geometry.size.height)
                        .gesture(
                            DragGesture(minimumDistance: 0)
                                .onChanged { value in
                                    let normX = value.location.x / geometry.size.width
                                    let normY = value.location.y / geometry.size.height
                                    receiver.sendInput(type: "move", normalizedX: normX, normalizedY: normY)
                                }
                                .onEnded { value in
                                    let normX = value.location.x / geometry.size.width
                                    let normY = value.location.y / geometry.size.height
                                    receiver.sendInput(type: "up", normalizedX: normX, normalizedY: normY)
                                }
                        )
                } else {
                    VStack(spacing: 20) {
                        Image(systemName: "display.2")
                            .font(.system(size: 64))
                            .foregroundColor(.blue)
                        
                        Text("Secondary Display for Mac")
                            .font(.title2)
                            .bold()
                            .foregroundColor(.white)
                        
                        Text(receiver.connectionState)
                            .font(.subheadline)
                            .foregroundColor(.gray)
                        
                        Button(action: {
                            receiver.connect(host: hostInput, port: 5252)
                        }) {
                            Text("Connect to Mac")
                                .bold()
                                .padding(.horizontal, 24)
                                .padding(.vertical, 12)
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                        }
                    }
                }
            }
        }
        .onAppear {
            receiver.connect(host: "127.0.0.1", port: 5252)
        }
        .onDisappear {
            receiver.disconnect()
        }
        .statusBar(hidden: true)
    }
}
