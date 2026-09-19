package com.secondaryscreen

import android.view.MotionEvent
import android.view.View
import org.json.JSONObject

class TouchInputHandler(private val onInputEvent: (String) -> Unit) : View.OnTouchListener {

    override fun onTouch(view: View, event: MotionEvent): Boolean {
        val width = view.width.toFloat()
        val height = view.height.toFloat()
        if (width <= 0 || height <= 0) return false

        val normX = (event.x / width).coerceIn(0f, 1f)
        val normY = (event.y / height).coerceIn(0f, 1f)

        val actionType = when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> "down"
            MotionEvent.ACTION_MOVE -> "move"
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> "up"
            else -> return false
        }

        val json = JSONObject().apply {
            put("type", actionType)
            put("x", normX.toDouble())
            put("y", normY.toDouble())
        }

        onInputEvent(json.toString())
        return true
    }
}
