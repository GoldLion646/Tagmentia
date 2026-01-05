package app.lovable.tagmentia;

import android.content.ContentResolver;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLDecoder;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    
    // PWA Theme Colors
    private static final String PWA_THEME_COLOR = "#9370DB";
    private static final String PWA_PRIMARY_COLOR = "#545DEA";

    // Store pending share URL for cold start scenarios
    private String pendingShareUrl = null;
    private boolean pendingUrlProcessed = false;
    private int webViewReadyRetryCount = 0;
    private boolean webViewReadyTested = false;
    private boolean webViewReadyResult = false;
    private boolean isColdStart = false; // Track if this is a cold start
    private static final int MAX_WEBVIEW_RETRY_COUNT = 8; // Increased for cold starts
    private static final int INITIAL_RETRY_DELAY = 300; // For warm starts
    private static final int COLD_START_INITIAL_DELAY = 800; // Longer delay for cold starts
    private static final int MAX_RETRY_DELAY = 1000; // Increased max delay for cold starts

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Configure system UI to match PWA standalone display
        configureSystemUI();
        
        // Handle intent when activity is created
        Intent intent = getIntent();
        if (intent != null) {
            // Extract URL immediately for cold start (before WebView is ready)
            String extractedUrl = extractUrlFromShareIntent(intent);
            if (extractedUrl != null && !extractedUrl.isEmpty()) {
                pendingShareUrl = extractedUrl;
                pendingUrlProcessed = false;
                webViewReadyRetryCount = 0;
                isColdStart = true; // Mark as cold start
                resetWebViewReadyCache(); // Reset cache for fresh start
                Log.d(TAG, "Extracted URL from share intent (cold start): " + extractedUrl);
            }
            // Still handle intent normally (for when app is already running)
            handleIntent(intent);
        }
    }
    
    @Override
    public void onStart() {
        super.onStart();
        
        // On cold start, start checking for WebView readiness earlier
        // This is called after onCreate but before onResume
        if (pendingShareUrl != null && !pendingUrlProcessed && isColdStart) {
            Log.d(TAG, "onStart: Starting cold start processing check");
            // Use a longer delay for cold starts to allow WebView to initialize
            android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
            handler.postDelayed(() -> {
                if (pendingShareUrl != null && !pendingUrlProcessed) {
                    processPendingShareUrl();
                }
            }, COLD_START_INITIAL_DELAY);
        }
    }
    
    @Override
    public void onResume() {
        super.onResume();
        
        // Reset WebView ready cache when resuming (page might have changed)
        // But don't reset if we're in the middle of processing a cold start
        if (!isColdStart || pendingUrlProcessed) {
            resetWebViewReadyCache();
    }
        
        // Process pending URL when WebView should be ready (cold start scenario)
        if (pendingShareUrl != null && !pendingUrlProcessed) {
            if (isColdStart) {
                Log.d(TAG, "onResume: Cold start - WebView should be initializing");
                // For cold starts, use longer delay and start processing
                // This is a backup in case onStart didn't catch it
                android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
                handler.postDelayed(() -> {
                    if (pendingShareUrl != null && !pendingUrlProcessed) {
                        processPendingShareUrl();
                    }
                }, COLD_START_INITIAL_DELAY);
            } else {
                Log.d(TAG, "onResume: Warm start - processing pending URL");
                // For warm starts (app already running), use shorter delay
                android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
                handler.postDelayed(() -> {
                    processPendingShareUrl();
                }, INITIAL_RETRY_DELAY);
            }
        }
    }
    
    /**
     * Extract URL from share intent (for cold start - before WebView is ready)
     */
    private String extractUrlFromShareIntent(Intent intent) {
        if (intent == null) {
            return null;
        }
        
        String action = intent.getAction();
        String type = intent.getType();
        
        // Only process share intents
        if (!Intent.ACTION_SEND.equals(action) || type == null || !"text/plain".equals(type)) {
            return null;
        }
        
        try {
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            String sharedTitle = intent.getStringExtra(Intent.EXTRA_SUBJECT);
            Uri sharedUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            
            String url = null;
            
            // First, try to extract URL from shared text
            if (sharedText != null && !sharedText.trim().isEmpty()) {
                url = extractUrlFromText(sharedText);
            }
            
            // If no URL found in text, try to get it from the URI
            if ((url == null || url.isEmpty()) && sharedUri != null) {
                String uriString = sharedUri.toString();
                if (isValidUrl(uriString)) {
                    url = uriString;
                } else {
                    url = extractUrlFromText(uriString);
                }
            }
            
            // If still no URL, try using the text itself as URL
            if ((url == null || url.isEmpty()) && sharedText != null && !sharedText.trim().isEmpty()) {
                String trimmedText = sharedText.trim();
                if (isValidUrl(trimmedText)) {
                    url = trimmedText;
                }
            }
            
            // If we still don't have a URL, try aggressive extraction
            if ((url == null || url.isEmpty()) && sharedText != null) {
                url = extractUrlAggressively(sharedText);
            }
            
            // If still no URL, use the raw text
            if ((url == null || url.isEmpty()) && sharedText != null && !sharedText.trim().isEmpty()) {
                url = sharedText.trim();
            }
            
            return url;
        } catch (Exception e) {
            Log.e(TAG, "Error extracting URL from share intent", e);
            return null;
        }
    }
    
    /**
     * Check if WebView is truly ready (not just exists, but can execute JavaScript)
     * Uses multiple checks: Bridge exists, WebView exists, URL loaded, and page progress
     * More lenient checks for cold starts to avoid false negatives
     */
    private boolean isWebViewReady() {
        try {
            if (getBridge() == null || getBridge().getWebView() == null) {
                if (isColdStart) {
                    Log.d(TAG, "Bridge or WebView not yet created (cold start)");
                }
                return false;
            }
            
            android.webkit.WebView webView = getBridge().getWebView();
            
            // Check if WebView has loaded a page
            String currentUrl = webView.getUrl();
            if (currentUrl == null || currentUrl.isEmpty()) {
                if (isColdStart) {
                    Log.d(TAG, "WebView URL not yet loaded (cold start)");
                }
                return false;
            }
            
            // Check if page has finished loading (progress == 100)
            // This is a reliable indicator that the page is ready
            int progress = webView.getProgress();
            if (progress < 100) {
                if (isColdStart && progress > 0) {
                    Log.d(TAG, "WebView progress: " + progress + "% (cold start, still loading)");
                }
                return false;
            }
            
            // Additional check: verify WebView is attached to window and visible
            // This ensures the WebView is fully initialized
            // For cold starts, be more lenient - if progress is 100, assume attached
            if (!webView.isAttachedToWindow()) {
                if (isColdStart && progress == 100) {
                    // On cold start, if progress is 100, proceed anyway
                    Log.d(TAG, "WebView not attached but progress is 100% (cold start, proceeding)");
                } else {
                    return false;
                }
            }
            
            // If we've already tested and it was ready, return cached result
            if (webViewReadyTested && webViewReadyResult) {
                return true;
            }
            
            // Test JavaScript execution capability by attempting a simple evaluation
            // We don't wait for the result, but if it throws an exception, we know it's not ready
            try {
                webView.post(() -> {
                    try {
                        // Simple test: try to evaluate a basic JavaScript expression
                        // If this doesn't throw, JavaScript context is likely ready
                        webView.evaluateJavascript("typeof window !== 'undefined'", result -> {
                            // If we get here, JavaScript execution is working
                            webViewReadyTested = true;
                            webViewReadyResult = (result != null && result.equals("\"boolean\""));
                            if (webViewReadyResult) {
                                Log.d(TAG, "WebView JavaScript execution verified");
                            } else {
                                Log.w(TAG, "WebView JavaScript test returned unexpected result: " + result);
                            }
                        });
                    } catch (Exception e) {
                        Log.w(TAG, "JavaScript test failed", e);
                        webViewReadyTested = true;
                        webViewReadyResult = false;
                    }
                });
                
                // For cold starts, if progress is 100, assume ready even if test is async
                // The async test will update the cache for future checks
                webViewReadyTested = true;
                webViewReadyResult = true;
                Log.d(TAG, "WebView appears ready (progress: " + progress + "%, attached: " + webView.isAttachedToWindow() + ")");
                return true;
                
            } catch (Exception e) {
                Log.w(TAG, "Error testing JavaScript execution", e);
                // For cold starts, if we have progress 100, still return true
                if (isColdStart && progress == 100) {
                    Log.d(TAG, "Cold start: proceeding despite JavaScript test exception (progress 100%)");
                    return true;
                }
                return false;
            }
            
        } catch (Exception e) {
            Log.w(TAG, "Error checking WebView readiness", e);
            return false;
        }
    }
    
    /**
     * Reset WebView readiness cache (call when page navigation occurs)
     */
    private void resetWebViewReadyCache() {
        webViewReadyTested = false;
        webViewReadyResult = false;
    }
    
    /**
     * Process pending share URL once WebView is ready (cold start scenario)
     */
    private void processPendingShareUrl() {
        if (pendingShareUrl == null || pendingUrlProcessed) {
            return;
        }
        
        // Check retry limit
        if (webViewReadyRetryCount >= MAX_WEBVIEW_RETRY_COUNT) {
            Log.e(TAG, "Max retry count reached, giving up on processing pending URL");
            pendingShareUrl = null;
            pendingUrlProcessed = true;
            return;
        }
        
        // Reset cache before checking (force fresh test)
        resetWebViewReadyCache();
        
        // Check if WebView is ready with improved check
        if (!isWebViewReady()) {
            webViewReadyRetryCount++;
            
            // Use different delays for cold vs warm starts
            int baseDelay = isColdStart ? COLD_START_INITIAL_DELAY : INITIAL_RETRY_DELAY;
            // Linear backoff: start with base delay, increase gradually
            int delay = Math.min(baseDelay + (webViewReadyRetryCount * 150), MAX_RETRY_DELAY);
            
            Log.w(TAG, "WebView still not ready (" + (isColdStart ? "cold" : "warm") + " start, retry " + webViewReadyRetryCount + "/" + MAX_WEBVIEW_RETRY_COUNT + "), will retry in " + delay + "ms");
            
            android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
            handler.postDelayed(() -> {
                processPendingShareUrl();
            }, delay);
            return;
        }
        
        // WebView is ready, process the pending URL
        Log.d(TAG, "WebView is ready (" + (isColdStart ? "cold" : "warm") + " start), processing pending share URL: " + pendingShareUrl);
        String urlToProcess = pendingShareUrl;
        pendingShareUrl = null; // Clear pending URL
        pendingUrlProcessed = true;
        webViewReadyRetryCount = 0; // Reset retry counter
        isColdStart = false; // Reset cold start flag
        
        // Store and navigate
        storePendingShare(urlToProcess);
        
        // If URL is "IMAGE_SHARED", navigate directly to add-shared-screen without checking URL
        if ("IMAGE_SHARED".equals(urlToProcess)) {
            Log.d(TAG, "Detected IMAGE_SHARED marker, navigating to /add-shared-screen");
            navigateToPath("/add-shared-screen");
        } else {
            navigateToAddRoute(urlToProcess);
        }
    }

    
    /**
     * Configure system UI (status bar, navigation bar) to match PWA theme
     * Implements edge-to-edge display and immersive mode
     */
    private void configureSystemUI() {
        Window window = getWindow();
        
        if (window == null) {
            return;
        }
        
        // Set status bar color to match PWA theme
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(Color.parseColor(PWA_THEME_COLOR));
            
            // Set light status bar icons (white icons on dark background)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                int flags = window.getDecorView().getSystemUiVisibility();
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                window.getDecorView().setSystemUiVisibility(flags);
            }
        }
        
        // Set navigation bar color
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setNavigationBarColor(Color.parseColor("#000000"));
            
            // Set light navigation bar icons
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                int flags = window.getDecorView().getSystemUiVisibility();
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                window.getDecorView().setSystemUiVisibility(flags);
            }
        }
        // Enable edge-to-edge display (Android 11+)
        // This allows content to extend behind system bars
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Use WindowCompat for better compatibility
            WindowCompat.setDecorFitsSystemWindows(window, false);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            // For older versions, use immersive mode
            int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
            
            window.getDecorView().setSystemUiVisibility(flags);
        }
        
        // Configure window to match PWA standalone display
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        
        Log.d(TAG, "System UI configured to match PWA theme");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        
        // Set the new intent so it's available via getIntent()
        setIntent(intent);
        
        // Handle intent when app is already running
        // With singleTask launchMode, this will reuse the existing activity instance
        // This is called when a share intent arrives while the app is already running
        if (intent != null) {
        handleIntent(intent);
        }
    }

    private void handleIntent(Intent intent) {
        if (intent == null) {
            return;
        }

        String action = intent.getAction();
        Uri data = intent.getData();
        String type = intent.getType();

        Log.d(TAG, "Handling intent - Action: " + action + ", Data: " + data + ", Type: " + type);

        // Handle Share Intent (ACTION_SEND)
        if (Intent.ACTION_SEND.equals(action) && type != null) {
            if ("text/plain".equals(type)) {
                handleShareIntent(intent);
                return;
            } else if (type.startsWith("image/")) {
                handleImageShareIntent(intent);
                return;
            }
        }

        // Handle Share Intent (ACTION_SEND_MULTIPLE) - for multiple images
        if (Intent.ACTION_SEND_MULTIPLE.equals(action) && type != null) {
            if (type.startsWith("image/")) {
                handleMultipleImageShareIntent(intent);
                return;
            }
        }

        // Handle Deep Links (custom scheme and App Links)
        if (Intent.ACTION_VIEW.equals(action) && data != null) {
            handleDeepLink(data);
            return;
        }
    }

    /**
     * Handle share intent from other apps
     * Extracts URL from shared text and stores it for getPendingShare() to read
     * Enhanced to better handle YouTube, TikTok, Instagram, Snapchat shares
     * Also handles Tagement links as deep links
     */
    private void handleShareIntent(Intent intent) {
        try {
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            String sharedTitle = intent.getStringExtra(Intent.EXTRA_SUBJECT);
            Uri sharedUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            
            Log.d(TAG, "Share intent received - Text: " + sharedText + ", Title: " + sharedTitle + ", URI: " + sharedUri);

            String url = null;

            // First, try to extract URL from shared text (most common for YouTube, TikTok, Instagram, Snapchat)
            if (sharedText != null && !sharedText.trim().isEmpty()) {
                url = extractUrlFromText(sharedText);
                Log.d(TAG, "Extracted URL from text: " + url);
            }

            // If no URL found in text, try to get it from the URI
            if ((url == null || url.isEmpty()) && sharedUri != null) {
                String uriString = sharedUri.toString();
                if (isValidUrl(uriString)) {
                    url = uriString;
                    Log.d(TAG, "Using URL from URI: " + url);
                } else {
                    // Try to extract URL from URI string
                    url = extractUrlFromText(uriString);
                    Log.d(TAG, "Extracted URL from URI string: " + url);
                }
            }

            // If still no URL, try using the text itself as URL (might be a plain URL)
            if ((url == null || url.isEmpty()) && sharedText != null && !sharedText.trim().isEmpty()) {
                String trimmedText = sharedText.trim();
                if (isValidUrl(trimmedText)) {
                    url = trimmedText;
                    Log.d(TAG, "Using text as URL: " + url);
                }
            }

            // If we still don't have a URL, try to construct one from the title or text
            if ((url == null || url.isEmpty()) && sharedText != null) {
                // Some apps share text like "Check out this video: [URL]" or just the URL
                // Try more aggressive extraction
                url = extractUrlAggressively(sharedText);
                Log.d(TAG, "Aggressively extracted URL: " + url);
            }
            
            if (url == null || url.isEmpty()) {
                Log.w(TAG, "No URL found in share intent - Text: " + sharedText + ", Title: " + sharedTitle);
                // Store the raw text anyway, let the web app handle it
                if (sharedText != null && !sharedText.trim().isEmpty()) {
                    storePendingShare(sharedText.trim());
                        navigateToAddRoute(sharedText.trim());
                }
                return;
            }

            // Check if the URL is a Tagement link - if so, handle it as a deep link
            if (isTagementLink(url)) {
                Log.d(TAG, "Detected Tagement link in share intent, handling as deep link: " + url);
                try {
                    Uri tagmentUri = Uri.parse(url);
                    handleDeepLink(tagmentUri);
                } catch (Exception e) {
                    Log.e(TAG, "Error handling Tagement link as deep link", e);
                    // Fallback to regular share handling
                    storePendingShare(url);
                    navigateToAddRoute(url);
                }
                return;
            }

            // Store the shared URL in localStorage for getPendingShare() to read
            // Do this BEFORE navigation to ensure it's available even if navigation is delayed
            storePendingShare(url);
            Log.d(TAG, "Stored pending share: " + url);

            // Navigate to /add route with the shared URL
            // This will also pass the URL as a query parameter, but localStorage is the backup
            navigateToAddRoute(url);
            
        } catch (Exception e) {
            Log.e(TAG, "Error handling share intent", e);
        }
    }

    /**
     * Handle image share intent from other apps (single image)
     * Converts content:// URI to base64 data URL and stores it for the React app
     */
    private void handleImageShareIntent(Intent intent) {
        try {
            Uri imageUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            
            Log.d(TAG, "Image share intent received - URI: " + imageUri);

            if (imageUri == null) {
                Log.w(TAG, "No image URI found in share intent");
                return;
            }

            // Convert content:// URI to base64 data URL for web access
            String imageDataUrl = null;
            if (imageUri.toString().startsWith("content://")) {
                imageDataUrl = convertContentUriToDataUrl(imageUri);
                Log.d(TAG, "imageDataUrl=>" + (imageDataUrl != null ? "converted successfully" : "failed")); 
                if (imageDataUrl == null) {
                    Log.e(TAG, "Failed to convert content URI to data URL, using original URI");
                    // Fallback to original URI string (may not work in webview)
                    imageDataUrl = imageUri.toString();
                }
            } else {
                // For non-content URIs (like file://), use as-is
                imageDataUrl = imageUri.toString();
            }

            // For images, the base64 data is already stored in sharedImageBase64 by convertContentUriToDataUrl
            // Don't store the full data URL in pendingShare (too large for localStorage)
            // Instead, store a marker that indicates an image was shared
            // The React app will check sharedImageBase64 directly
            storePendingShare("IMAGE_SHARED");
            Log.d(TAG, "Stored image share marker - base64 data stored separately in sharedImageBase64");

            // Navigate to add-shared-screen page for automatic upload
            navigateToPath("/add-shared-screen");
            
        } catch (Exception e) {
            Log.e(TAG, "Error handling image share intent", e);
        }
    }

    /**
     * Handle multiple image share intent from other apps
     * Converts first image content:// URI to base64 data URL and stores it for the React app
     */
    private void handleMultipleImageShareIntent(Intent intent) {
        try {
            java.util.ArrayList<Uri> imageUris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            
            Log.d(TAG, "Multiple image share intent received - Count: " + (imageUris != null ? imageUris.size() : 0));

            if (imageUris == null || imageUris.isEmpty()) {
                Log.w(TAG, "No image URIs found in share intent");
                return;
            }

            // Get first image URI
            Uri firstImageUri = imageUris.get(0);
            // Convert content:// URI to base64 data URL for web access
            String imageDataUrl = null;
            if (firstImageUri.toString().startsWith("content://")) {
                imageDataUrl = convertContentUriToDataUrl(firstImageUri);
                if (imageDataUrl == null) {
                    Log.e(TAG, "Failed to convert content URI to data URL, using original URI");
                    // Fallback to original URI string (may not work in webview)
                    imageDataUrl = firstImageUri.toString();
                }
            } else {
                // For non-content URIs (like file://), use as-is
                imageDataUrl = firstImageUri.toString();
            }

            // For images, the base64 data is already stored in sharedImageBase64 by convertContentUriToDataUrl
            // Don't store the full data URL in pendingShare (too large for localStorage)
            // Instead, store a marker that indicates an image was shared
            // The React app will check sharedImageBase64 directly
            storePendingShare("IMAGE_SHARED");
            Log.d(TAG, "Stored first image share marker - base64 data stored separately in sharedImageBase64");

            // Navigate to add-shared-screen page for automatic upload
            navigateToPath("/add-shared-screen");
            
        } catch (Exception e) {
            Log.e(TAG, "Error handling multiple image share intent", e);
        }
    }

    /**
     * Convert content:// URI to base64 data URL for web access and File for mobile upload
     * This allows the React app to access images shared from other apps
     * Returns base64 data URL for web access, and also saves a File to cache directory
     */
    private String convertContentUriToDataUrl(Uri contentUri) {
        try {
            ContentResolver resolver = getContentResolver();
            InputStream inputStream = resolver.openInputStream(contentUri);
            
            if (inputStream == null) {
                Log.e(TAG, "Failed to open input stream for content URI: " + contentUri);
                return null;
            }
            
            // Read image bytes
            byte[] buffer = new byte[8192];
            java.io.ByteArrayOutputStream outputStream = new java.io.ByteArrayOutputStream();
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }
            inputStream.close();
            
            byte[] imageBytes = outputStream.toByteArray();
            outputStream.close();
            
            // Determine MIME type
            String mimeType = resolver.getType(contentUri);
            if (mimeType == null || !mimeType.startsWith("image/")) {
                // Default to PNG if MIME type is unknown
                mimeType = "image/png";
            }
            
            // Determine file extension from MIME type
            String extension = "png";
            if (mimeType.contains("jpeg") || mimeType.contains("jpg")) {
                extension = "jpg";
            } else if (mimeType.contains("gif")) {
                extension = "gif";
            } else if (mimeType.contains("webp")) {
                extension = "webp";
            }
            
            // Save to File in cache directory for mobile upload
            File cacheDir = getCacheDir();
            File imageFile = new File(cacheDir, "shared_image_" + System.currentTimeMillis() + "." + extension);
            try (FileOutputStream fileOutputStream = new FileOutputStream(imageFile)) {
                fileOutputStream.write(imageBytes);
                fileOutputStream.flush();
                Log.d(TAG, "Saved image to File: " + imageFile.getAbsolutePath() + " - Size: " + imageFile.length() + " bytes");
            } catch (IOException e) {
                Log.e(TAG, "Failed to save image to File: " + imageFile.getAbsolutePath(), e);
                // Continue with data URL conversion even if file save fails
            }
            
            // Convert to base64 for data URL (web access)
            String base64 = Base64.encodeToString(imageBytes, Base64.NO_WRAP);
            
            // Escape base64 string for JavaScript
            String escapedBase64 = base64
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
            
            // Store base64 in localStorage via JavaScript
            String base64Js = String.format(
                "try { " +
                "  localStorage.setItem('sharedImageBase64', \"%s\"); " +
                "  console.log('Shared image base64 stored'); " +
                "} catch (e) { " +
                "  console.error('Error storing shared image base64:', e); " +
                "}",
                escapedBase64
            );
            
            // Execute JavaScript to store base64
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().post(() -> {
                    getBridge().getWebView().evaluateJavascript(base64Js, null);
                });
            }
            
            // Create data URL
            String dataUrl = "data:" + mimeType + ";base64," + base64;
            
            // Store file path and metadata in localStorage for mobile upload access
            if (imageFile.exists()) {
                String filePath = imageFile.getAbsolutePath();
                String fileName = imageFile.getName();
                long fileSize = imageFile.length();
                
                String escapedPath = filePath
                    .replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r");
                
                String escapedFileName = fileName
                    .replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r");
                
                // Store file path, name, size, and MIME type in localStorage for React app to access
                String js = String.format(
                    "try { " +
                    "  localStorage.setItem('sharedImageFilePath', \"%s\"); " +
                    "  localStorage.setItem('sharedImageFileName', \"%s\"); " +
                    "  localStorage.setItem('sharedImageFileSize', \"%d\"); " +
                    "  localStorage.setItem('sharedImageMimeType', \"%s\"); " +
                    "  console.log('Shared image file stored - Path: %s, Name: %s, Size: %d bytes, MIME: %s'); " +
                    "} catch (e) { " +
                    "  console.error('Error storing shared image file info:', e); " +
                    "}",
                    escapedPath, escapedFileName, fileSize, mimeType,
                    escapedPath, escapedFileName, fileSize, mimeType
                );
                
                // Execute JavaScript to store file info
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().post(() -> {
                        getBridge().getWebView().evaluateJavascript(js, null);
                    });
                }
            }
            
            Log.d(TAG, "Converted content URI to data URL and File - Data URL size: " + imageBytes.length + " bytes, MIME: " + mimeType + ", File: " + (imageFile.exists() ? imageFile.getAbsolutePath() : "not saved"));
            return dataUrl;
            
        } catch (IOException e) {
            Log.e(TAG, "Error converting content URI to data URL: " + contentUri, e);
            return null;
        } catch (Exception e) {
            Log.e(TAG, "Unexpected error converting content URI to data URL: " + contentUri, e);
            return null;
        }
    }

    /**
     * Handle deep links (custom scheme: tagmentia:// or App Links: https://tagmentia.com/*)
     */
    private void handleDeepLink(Uri uri) {
        try {
            String scheme = uri.getScheme();
            String host = uri.getHost();
            String path = uri.getPath();
            String query = uri.getQuery();

            Log.d(TAG, "Deep link received - Scheme: " + scheme + ", Host: " + host + ", Path: " + path);

            // Handle custom scheme: tagmentia://add?url=...
            if ("tagmentia".equals(scheme)) {
                String url = uri.getQueryParameter("url");
                if (url != null && !url.isEmpty()) {
                    // Decode the URL parameter
                    String decodedUrl = URLDecoder.decode(url, "UTF-8");
                    navigateToAddRoute(decodedUrl);
                    return;
                }
                // If no url parameter, navigate to the path directly
                if (path != null && !path.isEmpty()) {
                    navigateToPath(path + (query != null ? "?" + query : ""));
                    return;
                }
            }

            // Handle App Links: https://tagmentia.com/*
            if (("https".equals(scheme) || "http".equals(scheme)) && 
                (host != null && (host.equals("tagmentia.com") || host.endsWith(".tagmentia.com")))) {
                
                // Handle /add path with url parameter
                if ("/add".equals(path)) {
                    String url = uri.getQueryParameter("url");
                    if (url != null && !url.isEmpty()) {
                        String decodedUrl = URLDecoder.decode(url, "UTF-8");
                        navigateToAddRoute(decodedUrl);
                        return;
                    }
                }
                
                // For any other Tagement URL, navigate to it directly in the webview
                String fullPath = path != null ? path : "/";
                if (query != null && !query.isEmpty()) {
                    fullPath += "?" + query;
                }
                navigateToPath(fullPath);
                return;
            }

            // If it's a direct URL in the path or query, try to extract it
            if (query != null && query.contains("url=")) {
                String url = uri.getQueryParameter("url");
                if (url != null && !url.isEmpty()) {
                    String decodedUrl = URLDecoder.decode(url, "UTF-8");
                    navigateToAddRoute(decodedUrl);
                }
            }

        } catch (Exception e) {
            Log.e(TAG, "Error handling deep link", e);
        }
    }

    /**
     * Extract URL from shared text
     * Looks for URLs in the text and returns the first valid one
     * Enhanced to better handle YouTube, TikTok, Instagram, Snapchat shares
     */
    private String extractUrlFromText(String text) {
        if (text == null || text.isEmpty()) {
            return null;
        }

        // Remove whitespace
        text = text.trim();

        // Check if the entire text is a URL
        if (isValidUrl(text)) {
            return text;
        }

        // Try to find URL in the text using regex for better pattern matching
        // Pattern for URLs: http:// or https:// followed by domain
        java.util.regex.Pattern urlPattern = java.util.regex.Pattern.compile(
            "(https?://[^\\s]+|www\\.[^\\s]+|[a-zA-Z0-9-]+\\.[a-zA-Z]{2,}[^\\s]*)",
            java.util.regex.Pattern.CASE_INSENSITIVE
        );
        java.util.regex.Matcher matcher = urlPattern.matcher(text);
        
        while (matcher.find()) {
            String potentialUrl = matcher.group();
            // Clean up the URL
            potentialUrl = potentialUrl.trim();
            // Remove trailing punctuation
            potentialUrl = potentialUrl.replaceAll("[.,;:!?]+$", "");
            // Remove trailing parentheses, brackets, quotes
            potentialUrl = potentialUrl.replaceAll("[\\)\\]\"']+$", "");
            
            // Add https:// if missing
            if (!potentialUrl.startsWith("http://") && !potentialUrl.startsWith("https://")) {
                if (potentialUrl.startsWith("www.")) {
                    potentialUrl = "https://" + potentialUrl;
                } else if (potentialUrl.contains("youtube.com") || potentialUrl.contains("youtu.be") ||
                          potentialUrl.contains("tiktok.com") || potentialUrl.contains("instagram.com") ||
                          potentialUrl.contains("snapchat.com") || potentialUrl.contains("loom.com")) {
                    potentialUrl = "https://" + potentialUrl;
                }
            }
            
            if (isValidUrl(potentialUrl)) {
                return potentialUrl;
            }
        }

        // Fallback: Look for common URL patterns (for cases where regex might miss)
        String[] patterns = {
            "https://youtube.com", "https://www.youtube.com", "https://youtu.be",
            "http://youtube.com", "http://www.youtube.com", "http://youtu.be",
            "https://tiktok.com", "https://www.tiktok.com", "https://vm.tiktok.com",
            "http://tiktok.com", "http://www.tiktok.com", "http://vm.tiktok.com",
            "https://instagram.com", "https://www.instagram.com",
            "http://instagram.com", "http://www.instagram.com",
            "https://snapchat.com", "https://www.snapchat.com",
            "http://snapchat.com", "http://www.snapchat.com",
            "https://loom.com", "https://www.loom.com",
            "youtube.com", "youtu.be", "tiktok.com", "instagram.com", "snapchat.com", "loom.com"
        };

        String lowerText = text.toLowerCase();
        for (String pattern : patterns) {
            int index = lowerText.indexOf(pattern.toLowerCase());
            if (index >= 0) {
                // Extract URL starting from the pattern
                String url = text.substring(index);
                // Remove any trailing whitespace, newlines, or common separators
                url = url.split("[\\s\\n\\r\\t]+")[0];
                // Remove trailing punctuation
                url = url.replaceAll("[.,;:!?\\[\\]()\"']+$", "");
                
                // Add https:// if missing
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    url = "https://" + url;
                }
                
                if (isValidUrl(url)) {
                    return url;
                }
            }
        }

        return null;
    }

    /**
     * Aggressively extract URL from text
     * Tries multiple strategies to find a URL even in messy text
     */
    private String extractUrlAggressively(String text) {
        if (text == null || text.isEmpty()) {
            return null;
        }

        // Try standard extraction first
        String url = extractUrlFromText(text);
        if (url != null && !url.isEmpty()) {
            return url;
        }

        // Try to find URLs in parentheses, brackets, or quotes
        java.util.regex.Pattern quotedUrlPattern = java.util.regex.Pattern.compile(
            "[\\(\\[\\\"'](https?://[^\\s\\)\\]\"']+)[\\)\\]\"']",
            java.util.regex.Pattern.CASE_INSENSITIVE
        );
        java.util.regex.Matcher quotedMatcher = quotedUrlPattern.matcher(text);
        if (quotedMatcher.find()) {
            String quotedUrl = quotedMatcher.group(1);
            if (isValidUrl(quotedUrl)) {
                return quotedUrl;
            }
        }

        // Try to find any string that looks like a domain
        java.util.regex.Pattern domainPattern = java.util.regex.Pattern.compile(
            "([a-zA-Z0-9-]+\\.(youtube|youtu|tiktok|instagram|snapchat|loom)\\.(com|be|net|org)[^\\s]*)",
            java.util.regex.Pattern.CASE_INSENSITIVE
        );
        java.util.regex.Matcher domainMatcher = domainPattern.matcher(text);
        if (domainMatcher.find()) {
            String domainUrl = domainMatcher.group(1);
            domainUrl = domainUrl.replaceAll("[.,;:!?\\[\\]()\"']+$", "");
            if (!domainUrl.startsWith("http://") && !domainUrl.startsWith("https://")) {
                domainUrl = "https://" + domainUrl;
            }
            if (isValidUrl(domainUrl)) {
                return domainUrl;
            }
        }

        return null;
    }

    /**
     * Check if a string is a valid URL
     */
    private boolean isValidUrl(String url) {
        if (url == null || url.isEmpty()) {
            return false;
        }

        try {
            Uri uri = Uri.parse(url);
            String scheme = uri.getScheme();
            return scheme != null && (scheme.equals("http") || scheme.equals("https"));
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Check if a URL is a Tagement link (tagmentia.com or tagmentia://)
     */
    private boolean isTagementLink(String url) {
        if (url == null || url.isEmpty()) {
            return false;
        }

        try {
            Uri uri = Uri.parse(url);
            String scheme = uri.getScheme();
            String host = uri.getHost();

            // Check for custom scheme: tagmentia://
            if ("tagmentia".equals(scheme)) {
                return true;
            }

            // Check for App Links: https://tagmentia.com or https://*.tagmentia.com
            if ("https".equals(scheme) && host != null) {
                if (host.equals("tagmentia.com") || host.endsWith(".tagmentia.com")) {
                    return true;
                }
            }

            // Also check for http://tagmentia.com (for development/testing)
            if ("http".equals(scheme) && host != null) {
                if (host.equals("tagmentia.com") || host.endsWith(".tagmentia.com")) {
                    return true;
                }
            }

            return false;
        } catch (Exception e) {
            Log.e(TAG, "Error checking if URL is Tagement link", e);
            return false;
        }
    }

    /**
     * Navigate to the /add route in the web app with the shared URL
     * Uses JavaScript injection to navigate to the React Router /add route
     * Also ensures the URL is stored in localStorage as a backup
     * @param url The URL to share
     */
    private void navigateToAddRoute(String url) {
        try {
            // Encode the URL for the query parameter
            String encodedUrl = Uri.encode(url, "UTF-8");
            
            Log.d(TAG, "Navigating to /add route with URL: " + url);
            
            // Check if WebView is ready with improved check
            // Don't reset cache here - use cached result if available
            if (!isWebViewReady()) {
                Log.w(TAG, "WebView not ready for navigation, will retry after delay");
                // Retry with linear backoff
                android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
                final String finalUrl = url;
                handler.postDelayed(() -> {
                    navigateToAddRoute(finalUrl);
                }, INITIAL_RETRY_DELAY);
                return;
            }
            
            // Escape the URL for JavaScript
            String escapedUrl = url
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
            
            // Use the bridge to execute JavaScript that navigates to the /add route
            // Also ensure URL is in localStorage as backup, and set it in the input field
            String js = String.format(
                "try { " +
                "  // Store URL in localStorage as backup " +
                "  localStorage.setItem('pendingShare', \"%s\"); " +
                "  " +
                "  // Navigate to /add route with URL in query parameter " +
                "  if (window.location.pathname !== '/add') { " +
                "    if (window.history && window.history.pushState) { " +
                "      window.history.pushState({}, '', '/add?url=%s'); " +
                "      window.dispatchEvent(new PopStateEvent('popstate')); " +
                "    } else { " +
                "      window.location.href = '/add?url=%s'; " +
                "    } " +
                "  } else { " +
                "    // Already on /add, update the URL parameter and trigger React Router " +
                "    const urlParams = new URLSearchParams(window.location.search); " +
                "    urlParams.set('url', decodeURIComponent('%s')); " +
                "    window.history.replaceState({}, '', '/add?' + urlParams.toString()); " +
                "    window.dispatchEvent(new PopStateEvent('popstate')); " +
                "  } " +
                "  console.log('Navigated to /add with URL:', \"%s\"); " +
                "} catch (e) { " +
                "  console.error('Error navigating to /add:', e); " +
                "  // Fallback: simple navigation " +
                "  window.location.href = '/add?url=%s'; " +
                "}",
                escapedUrl, encodedUrl, encodedUrl, encodedUrl, escapedUrl, encodedUrl
            );
            
            // Execute JavaScript on the web view
            getBridge().getWebView().post(() -> {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(js, null);
                }
            });
            
        } catch (Exception e) {
            Log.e(TAG, "Error navigating to add route", e);
            // Fallback: use simpler JavaScript navigation
            try {
                String encodedUrl = Uri.encode(url, "UTF-8");
                String escapedUrl = url
                    .replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r");
                
                String fallbackJs = String.format(
                    "try { " +
                    "  localStorage.setItem('pendingShare', \"%s\"); " +
                    "  window.location.href = '/add?url=%s'; " +
                    "} catch (e) { " +
                    "  window.location.href = '/add?url=%s'; " +
                    "}",
                    escapedUrl, encodedUrl, encodedUrl
                );
                
                // Try to execute fallback JavaScript
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().post(() -> {
                        getBridge().getWebView().evaluateJavascript(fallbackJs, null);
                    });
                } else {
                    Log.w(TAG, "Bridge or WebView not available for fallback navigation");
                }
            } catch (Exception e2) {
                Log.e(TAG, "Fallback navigation also failed", e2);
            }
        }
    }


    /**
     * Store pending share content in localStorage for getPendingShare() to read
     */
    private void storePendingShare(String content) {
        try {
            // Check if WebView is ready with improved check
            // Don't reset cache here - use cached result if available
            if (!isWebViewReady()) {
                Log.w(TAG, "WebView not ready for storing share, will retry after delay");
                android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
                handler.postDelayed(() -> {
                    storePendingShare(content);
                }, INITIAL_RETRY_DELAY);
                return;
            }
            
            // Escape the content for JavaScript
            String escapedContent = content
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
            
            // Store in localStorage
            String js = String.format(
                "try { " +
                "  localStorage.setItem('pendingShare', \"%s\"); " +
                "  console.log('Pending share stored:', \"%s\"); " +
                "} catch (e) { " +
                "  console.error('Error storing pending share:', e); " +
                "}",
                escapedContent, escapedContent
            );
            
            // Execute JavaScript on the web view
            getBridge().getWebView().post(() -> {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(js, null);
                }
            });
            
            Log.d(TAG, "Pending share stored: " + content);
            
        } catch (Exception e) {
            Log.e(TAG, "Error storing pending share", e);
        }
    }

    /**
     * Navigate to a specific path in the web app
     * @param path The path to navigate to (e.g., "/categories", "/add?url=...")
     */
    private void navigateToPath(String path) {
        try {
            // Ensure path starts with /
            if (path == null || path.isEmpty()) {
                path = "/";
            }
            if (!path.startsWith("/")) {
                path = "/" + path;
            }
            
            Log.d(TAG, "Navigating to path: " + path);
            
            // Check if bridge and webview are available
            if (getBridge() == null || getBridge().getWebView() == null) {
                Log.w(TAG, "Bridge or WebView not ready, will retry after delay");
                android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
                final String finalPath = path;
                handler.postDelayed(() -> {
                    navigateToPath(finalPath);
                }, 500);
                return;
            }
            
            // Escape the path for JavaScript
            String escapedPath = path
                .replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
            
            // Navigate to the path
            String js = "if (window.location.pathname + window.location.search !== '" + escapedPath + "') { " +
                       "  if (window.history && window.history.pushState) { " +
                       "    window.history.pushState({}, '', '" + escapedPath + "'); " +
                       "    window.dispatchEvent(new PopStateEvent('popstate')); " +
                       "  } else { " +
                       "    window.location.href = '" + escapedPath + "'; " +
                       "  } " +
                       "}";
            
            // Execute JavaScript on the web view
            getBridge().getWebView().post(() -> {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(js, null);
                }
            });
            
        } catch (Exception e) {
            Log.e(TAG, "Error navigating to path: " + path, e);
        }
    }


}
