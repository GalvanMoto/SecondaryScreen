package com.secondaryscreen

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.DataInputStream
import java.io.OutputStream
import java.net.Socket
import java.nio.charset.StandardCharsets

class SocketStreamClient(
    private val host: String = "127.0.0.1",
    private val port: Int = 5252,
    private val onFrameReceived: (Bitmap) -> Unit,
    private val onStatusChanged: (String) -> Unit
) {
    private var job: Job? = null
    private var socket: Socket? = null
    private var outputStream: OutputStream? = null

    fun start(scope: CoroutineScope) {
        job = scope.launch(Dispatchers.IO) {
            while (isActive) {
                try {
                    onStatusChanged("Connecting to $host:$port...")
                    val s = Socket(host, port)
                    s.tcpNoDelay = true
                    s.sendBufferSize = 64 * 1024
                    s.receiveBufferSize = 1024 * 1024
                    socket = s
                    outputStream = s.getOutputStream()

                    onStatusChanged("Connected! Streaming...")
                    val dis = DataInputStream(s.getInputStream())

                    // Magic: "SCRN" (0x53, 0x43, 0x52, 0x4E)
                    val magic = ByteArray(4)
                    while (isActive) {
                        dis.readFully(magic)
                        val magicStr = String(magic, StandardCharsets.US_ASCII)
                        if (magicStr != "SCRN") {
                            Log.w("SocketStreamClient", "Invalid magic header: $magicStr")
                            break
                        }

                        val length = dis.readInt()
                        if (length <= 0 || length > 10 * 1024 * 1024) {
                            Log.w("SocketStreamClient", "Invalid frame length: $length")
                            break
                        }

                        val frameBytes = ByteArray(length)
                        dis.readFully(frameBytes)

                        val bitmap = BitmapFactory.decodeByteArray(frameBytes, 0, length)
                        if (bitmap != null) {
                            onFrameReceived(bitmap)
                        }
                    }
                } catch (e: Exception) {
                    onStatusChanged("Disconnected. Retrying in 2s...")
                    Log.e("SocketStreamClient", "Stream error: ${e.message}")
                } finally {
                    try { socket?.close() } catch (ignored: Exception) {}
                    socket = null
                    outputStream = null
                    Thread.sleep(2000)
                }
            }
        }
    }

    fun sendInput(jsonString: String) {
        try {
            val bytes = (jsonString + "\n").toByteArray(StandardCharsets.UTF_8)
            outputStream?.apply {
                write(bytes)
                flush()
            }
        } catch (e: Exception) {
            Log.e("SocketStreamClient", "Failed to send input: ${e.message}")
        }
    }

    fun stop() {
        job?.cancel()
        try { socket?.close() } catch (ignored: Exception) {}
        socket = null
        outputStream = null
    }
}
