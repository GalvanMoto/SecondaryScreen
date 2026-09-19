package com.secondaryscreen

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.util.AttributeSet
import android.view.SurfaceHolder
import android.view.SurfaceView

class DisplaySurfaceView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : SurfaceView(context, attrs), SurfaceHolder.Callback {

    private val paint = Paint(Paint.FILTER_BITMAP_FLAG)
    private val destRect = Rect()
    private var isSurfaceReady = false

    init {
        holder.addCallback(this)
        setWillNotDraw(false)
    }

    override fun surfaceCreated(holder: SurfaceHolder) {
        isSurfaceReady = true
    }

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
        destRect.set(0, 0, width, height)
    }

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        isSurfaceReady = false
    }

    fun renderFrame(bitmap: Bitmap) {
        if (!isSurfaceReady) return

        var canvas: Canvas? = null
        try {
            canvas = holder.lockCanvas()
            if (canvas != null) {
                canvas.drawColor(Color.BLACK)
                val srcRect = Rect(0, 0, bitmap.width, bitmap.height)
                canvas.drawBitmap(bitmap, srcRect, destRect, paint)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            if (canvas != null) {
                try {
                    holder.unlockCanvasAndPost(canvas)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }
}
