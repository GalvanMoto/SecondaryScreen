package com.secondaryscreen

import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope

class MainActivity : AppCompatActivity() {

    private lateinit var surfaceView: DisplaySurfaceView
    private lateinit var statusText: TextView
    private var streamClient: SocketStreamClient? = null

    @SuppressLint("ClickableViewAccessibility")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        hideSystemUI()

        val rootLayout = FrameLayout(this).apply {
            setBackgroundColor(android.graphics.Color.BLACK)
        }

        surfaceView = DisplaySurfaceView(this)
        rootLayout.addView(
            surfaceView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )

        statusText = TextView(this).apply {
            setTextColor(android.graphics.Color.WHITE)
            textSize = 14f
            setPadding(32, 32, 32, 32)
            text = "Initializing Secondary Display Client..."
        }
        rootLayout.addView(statusText)

        setContentView(rootLayout)

        // Setup touch handler
        val touchHandler = TouchInputHandler { json ->
            streamClient?.sendInput(json)
        }
        surfaceView.setOnTouchListener(touchHandler)

        // Start stream client
        streamClient = SocketStreamClient(
            host = "127.0.0.1",
            port = 5252,
            onFrameReceived = { bitmap ->
                surfaceView.renderFrame(bitmap)
                runOnUiThread {
                    if (statusText.visibility != View.GONE) {
                        statusText.visibility = View.GONE
                    }
                }
            },
            onStatusChanged = { status ->
                runOnUiThread {
                    statusText.visibility = View.VISIBLE
                    statusText.text = status
                }
            }
        )
        streamClient?.start(lifecycleScope)
    }

    private fun hideSystemUI() {
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            )
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        streamClient?.stop()
    }
}
