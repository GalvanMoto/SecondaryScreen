package com.secondaryscreen.app;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.DisplayCutout;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.io.DataInputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity implements SurfaceHolder.Callback {

    private static final String TAG = "SecondaryScreen";
    private static final String HOST = "127.0.0.1";
    private static final int PORT = 5252;

    private SurfaceView surfaceView;
    private SurfaceHolder surfaceHolder;
    private TextView statusOverlay;
    private TextView notchBtn;
    
    // Notch wrap state
    private volatile boolean notchWrap = true;
    private int cutoutTop = 0;
    private int cutoutBottom = 0;
    private int cutoutLeft = 0;
    private int cutoutRight = 0;
    
    // Active display rect for touch mapping
    private final Rect currentDisplayRect = new Rect();

    private volatile boolean isRunning = false;
    private Thread streamThread;
    private Socket clientSocket;
    private OutputStream socketOutput;
    private final Object socketLock = new Object();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen awake
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Extend completely into camera cutout notch and request 144Hz refresh rate
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
            
            // Request native 144Hz pOLED refresh rate mode
            android.view.Display display = getDisplay();
            if (display != null) {
                for (android.view.Display.Mode mode : display.getSupportedModes()) {
                    if (Math.round(mode.getRefreshRate()) == 144) {
                        lp.preferredDisplayModeId = mode.getModeId();
                        lp.preferredRefreshRate = mode.getRefreshRate();
                        Log.d(TAG, "🚀 Unlocked native 144Hz display mode: " + mode.getModeId() + " (" + mode.getRefreshRate() + "Hz)");
                        break;
                    }
                }
            }
            
            getWindow().setAttributes(lp);
            getWindow().setDecorFitsSystemWindows(false);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        // Listen for notch / cutout insets
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                DisplayCutout cutout = insets.getDisplayCutout();
                if (cutout != null) {
                    cutoutTop = cutout.getSafeInsetTop();
                    cutoutBottom = cutout.getSafeInsetBottom();
                    cutoutLeft = cutout.getSafeInsetLeft();
                    cutoutRight = cutout.getSafeInsetRight();
                    Log.d(TAG, "Cutout safe insets: Top=" + cutoutTop + ", Bottom=" + cutoutBottom + ", Left=" + cutoutLeft + ", Right=" + cutoutRight);
                }
            }
            return insets;
        });

        surfaceView = new SurfaceView(this);
        surfaceView.getHolder().addCallback(this);
        root.addView(surfaceView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        // Floating status text
        statusOverlay = new TextView(this);
        statusOverlay.setTextColor(Color.WHITE);
        statusOverlay.setTextSize(14f);
        statusOverlay.setPadding(32, 48, 32, 32);
        statusOverlay.setText("Connecting to Mac secondary display...");
        root.addView(statusOverlay, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ));

        // Top Controls Bar (Rotate + Notch Wrap)
        LinearLayout controls = new LinearLayout(this);
        controls.setOrientation(LinearLayout.HORIZONTAL);
        FrameLayout.LayoutParams controlsParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        );
        controlsParams.setMargins(0, 48, 48, 0);
        controlsParams.gravity = Gravity.TOP | Gravity.END;
        controls.setLayoutParams(controlsParams);

        // Notch Wrap Toggle button
        notchBtn = new TextView(this);
        notchBtn.setText("📱 Notch: Wrap");
        notchBtn.setTextColor(Color.WHITE);
        notchBtn.setTextSize(12f);
        notchBtn.setBackgroundColor(Color.argb(175, 20, 20, 20));
        notchBtn.setPadding(24, 14, 24, 14);
        notchBtn.setOnClickListener(v -> toggleNotchWrap());
        controls.addView(notchBtn);

        // Spacer
        View spacer = new View(this);
        spacer.setLayoutParams(new LinearLayout.LayoutParams(16, 1));
        controls.addView(spacer);

        // Rotate button
        TextView rotateBtn = new TextView(this);
        rotateBtn.setText("🔄 Rotate");
        rotateBtn.setTextColor(Color.WHITE);
        rotateBtn.setTextSize(12f);
        rotateBtn.setBackgroundColor(Color.argb(175, 20, 20, 20));
        rotateBtn.setPadding(24, 14, 24, 14);
        rotateBtn.setOnClickListener(v -> toggleOrientation());
        controls.addView(rotateBtn);

        root.addView(controls);

        setContentView(root);

        root.post(this::hideSystemUI);
    }

    private void toggleNotchWrap() {
        notchWrap = !notchWrap;
        notchBtn.setText(notchWrap ? "📱 Notch: Wrap" : "📱 Notch: Safe");
    }

    private void toggleOrientation() {
        int current = getResources().getConfiguration().orientation;
        if (current == Configuration.ORIENTATION_PORTRAIT) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
            sendSocketMessage("{\"type\":\"orientation\",\"mode\":\"landscape\"}\n");
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
            sendSocketMessage("{\"type\":\"orientation\",\"mode\":\"portrait\"}\n");
        }
    }

    private void hideSystemUI() {
        View decorView = getWindow().getDecorView();
        if (decorView == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = decorView.getWindowInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }
        } else {
            decorView.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
    }

    @Override
    public void surfaceCreated(SurfaceHolder holder) {
        surfaceHolder = holder;
        isRunning = true;
        startStreamingThread();
    }

    @Override
    public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) {
        surfaceHolder = holder;
    }

    @Override
    public void surfaceDestroyed(SurfaceHolder holder) {
        isRunning = false;
        stopStreamingThread();
    }

    private void startStreamingThread() {
        if (streamThread != null && streamThread.isAlive()) return;
        isRunning = true;
        streamThread = new Thread(this::runStreamLoop, "DisplayStreamThread");
        streamThread.setPriority(Thread.MAX_PRIORITY);
        streamThread.start();
    }

    private void stopStreamingThread() {
        isRunning = false;
        closeSocket();
        if (streamThread != null) {
            streamThread.interrupt();
            streamThread = null;
        }
    }

    private void runStreamLoop() {
        byte[] magic = new byte[4];
        byte[] frameBuffer = new byte[4 * 1024 * 1024];
        Paint paint = new Paint(Paint.FILTER_BITMAP_FLAG);
        Rect destRect = new Rect();

        BitmapFactory.Options opts = new BitmapFactory.Options();
        opts.inPreferredConfig = Bitmap.Config.RGB_565;

        while (isRunning) {
            try {
                runOnUiThread(() -> statusOverlay.setVisibility(View.VISIBLE));
                Socket socket = new Socket();
                socket.setTcpNoDelay(true);
                socket.connect(new InetSocketAddress(HOST, PORT), 3000);

                synchronized (socketLock) {
                    clientSocket = socket;
                    socketOutput = socket.getOutputStream();
                }

                // Send initial orientation
                boolean isPortrait = getResources().getConfiguration().orientation == Configuration.ORIENTATION_PORTRAIT;
                String initialOri = "{\"type\":\"orientation\",\"mode\":\"" + (isPortrait ? "portrait" : "landscape") + "\"}\n";
                sendSocketMessage(initialOri);

                runOnUiThread(() -> statusOverlay.setVisibility(View.GONE));
                DataInputStream dis = new DataInputStream(socket.getInputStream());

                while (isRunning && !socket.isClosed()) {
                    // Read magic "SCRN"
                    dis.readFully(magic);
                    if (magic[0] != 0x53 || magic[1] != 0x43 || magic[2] != 0x52 || magic[3] != 0x4E) {
                        Log.w(TAG, "Sync byte mismatch, reconnecting...");
                        break;
                    }

                    // Read 4-byte frame length
                    int frameLen = dis.readInt();
                    if (frameLen <= 0 || frameLen > frameBuffer.length) {
                        Log.w(TAG, "Invalid frame length: " + frameLen);
                        break;
                    }

                    // Read exact frame payload
                    dis.readFully(frameBuffer, 0, frameLen);

                    // Decode JPEG directly into native Bitmap
                    Bitmap bmp = BitmapFactory.decodeByteArray(frameBuffer, 0, frameLen, opts);
                    if (bmp != null && surfaceHolder != null) {
                        Canvas canvas = null;
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                canvas = surfaceHolder.lockHardwareCanvas();
                            } else {
                                canvas = surfaceHolder.lockCanvas();
                            }

                            if (canvas != null) {
                                int cw = canvas.getWidth();
                                int ch = canvas.getHeight();

                                if (notchWrap) {
                                    // Notch Wrap: Full edge-to-edge wrap around the camera cutout
                                    destRect.set(0, 0, cw, ch);
                                } else {
                                    // Notch Safe: Shift display cleanly below/inside cutout safe area
                                    destRect.set(cutoutLeft, cutoutTop, cw - cutoutRight, ch - cutoutBottom);
                                    canvas.drawColor(Color.BLACK);
                                }

                                synchronized (currentDisplayRect) {
                                    currentDisplayRect.set(destRect);
                                }

                                canvas.drawBitmap(bmp, null, destRect, paint);
                            }
                        } catch (Exception e) {
                            Log.e(TAG, "Draw canvas error: " + e.getMessage());
                        } finally {
                            if (canvas != null) {
                                surfaceHolder.unlockCanvasAndPost(canvas);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                if (isRunning) {
                    Log.d(TAG, "Stream loop retry: " + e.getMessage());
                    runOnUiThread(() -> {
                        statusOverlay.setText("Connecting to Mac display on USB...");
                        statusOverlay.setVisibility(View.VISIBLE);
                    });
                    try { Thread.sleep(1500); } catch (InterruptedException ignored) {}
                }
            } finally {
                closeSocket();
            }
        }
    }

    private void sendSocketMessage(String msg) {
        new Thread(() -> {
            synchronized (socketLock) {
                try {
                    if (socketOutput != null) {
                        socketOutput.write(msg.getBytes(StandardCharsets.UTF_8));
                        socketOutput.flush();
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Failed to send touch input: " + e.getMessage());
                }
            }
        }).start();
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        if (surfaceView == null) return super.onTouchEvent(event);

        int action = event.getActionMasked();
        String type;
        if (action == MotionEvent.ACTION_DOWN) {
            type = "down";
        } else if (action == MotionEvent.ACTION_MOVE) {
            type = "move";
        } else if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_CANCEL) {
            type = "up";
        } else {
            return super.onTouchEvent(event);
        }

        int left, top, width, height;
        synchronized (currentDisplayRect) {
            left = currentDisplayRect.left;
            top = currentDisplayRect.top;
            width = currentDisplayRect.width();
            height = currentDisplayRect.height();
        }

        if (width <= 0 || height <= 0) return true;

        float normX = Math.max(0f, Math.min(1f, (event.getX() - left) / width));
        float normY = Math.max(0f, Math.min(1f, (event.getY() - top) / height));

        String json = String.format(
            java.util.Locale.US,
            "{\"type\":\"%s\",\"x\":%.4f,\"y\":%.4f}\n",
            type, normX, normY
        );
        sendSocketMessage(json);
        return true;
    }

    private void closeSocket() {
        synchronized (socketLock) {
            try {
                if (socketOutput != null) {
                    socketOutput.close();
                    socketOutput = null;
                }
                if (clientSocket != null) {
                    clientSocket.close();
                    clientSocket = null;
                }
            } catch (Exception ignored) {}
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideSystemUI();
        isRunning = true;
        if (surfaceHolder != null) {
            startStreamingThread();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        isRunning = false;
        stopStreamingThread();
    }

    @Override
    protected void onDestroy() {
        isRunning = false;
        stopStreamingThread();
        super.onDestroy();
    }
}
