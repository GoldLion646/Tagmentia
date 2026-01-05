# Tagmentia "Share to Tagmentia" Integration Guide

## Overview

Complete system-level sharing integration for Tagmentia across **Web (PWA)**, **Android**, and **iOS** platforms. Users can save YouTube, TikTok, Instagram, and Loom videos directly from any app using the native share menu.

## ✅ Supported Platforms (Allowlist Only)

- **YouTube**: `youtube.com`, `youtu.be`, `m.youtube.com`
- **TikTok**: `tiktok.com`, `vm.tiktok.com`
- **Instagram**: `instagram.com` (public Reels and Posts)
- **Snapchat**: `snapchat.com`, `story.snapchat.com`, `t.snapchat.com`
- **Loom**: `loom.com`, `www.loom.com` (share links)

**Unsupported platforms are blocked** with a clear message: *"This video site isn't supported yet. Currently supported: YouTube, TikTok, Instagram, Snapchat, Loom."*

## Features Implemented

### 1. **Backend Edge Function** (`save-shared-link`)
- **Endpoint**: POST to `save-shared-link` edge function
- **Features**:
  - ✅ URL validation and canonicalization
  - ✅ Platform allowlist enforcement (YouTube, TikTok, Instagram, Snapchat, Loom only)
  - ✅ Automatic thumbnail fetching with multi-strategy fallbacks
  - ✅ WebP thumbnail storage in Supabase Storage
  - ✅ Duplicate detection (same canonical URL per user)
  - ✅ Plan quota enforcement
  - ✅ Authentication required
  - ✅ Rate limiting: 60 requests/hour per user (via Supabase)

### 2. **Thumbnail Fetching** (`save-shared-link` + `refresh-thumbnail`)
- **Multi-step strategy** with retries and fallbacks:
  - **YouTube**: Direct image URLs (`maxresdefault.jpg`, `hqdefault.jpg`) → oEmbed → Open Graph
  - **TikTok**: oEmbed API → Open Graph HTML scraping
  - **Instagram**: oEmbed API → Open Graph HTML scraping
  - **Snapchat**: Open Graph HTML scraping
  - **Loom**: oEmbed API → Open Graph HTML scraping
- **Storage**: Thumbnails stored as WebP in `video-thumbnails/` bucket
- **Retry**: Users can retry failed thumbnails via the UI (calls `refresh-thumbnail` edge function)
- **Timeout**: 3s per attempt, max 2 retries with exponential backoff
- **Graceful failure**: If all strategies fail, video is saved without thumbnail (user can retry later)

### 2. **URL Normalization** (`src/utils/urlNormalization.ts`)
- Canonicalizes URLs from different platforms
- **YouTube**: Handles `youtu.be`, `youtube.com`, `m.youtube.com`
  - Preserves timestamp parameter (`t=`)
  - Strips tracking params (`utm_*`, `list`, `index`, `feature`)
- **TikTok**: Normalizes `vm.tiktok.com` and standard URLs
- **Instagram**: Normalizes reels and post URLs
- Blocks dangerous schemes (`javascript:`, `data:`)

### 3. **URL Normalization and Validation** (`src/utils/urlNormalization.ts`)
- **Canonicalization** before saving:
  - **YouTube**: Expands `youtu.be` → `youtube.com/watch?v=...`; preserves timestamp (`t=`); strips tracking params (`utm_*`, `list`, `index`, `feature`)
  - **TikTok**: Normalizes URLs and strips tracking params
  - **Instagram**: Normalizes Reels and Post URLs; strips tracking params
- **Security**: Blocks dangerous schemes (`javascript:`, `data:`)
- **Platform detection**: Returns `youtube`, `instagram`, `tiktok`, or `null` for unsupported
- **Deduplication**: Uses canonical URL as cache key

### 4. **Add Shared Video UI** (`/add`)
- **Clean, minimal interface** optimized for quick saves
- **URL validation**: Shows unsupported platform warning immediately
- **Platform badge**: Displays YouTube, Instagram, or TikTok icon
- **Category picker**: Auto-selects if only one category exists
- **Optional note field**: For user annotations
- **Thumbnail preview**: Shows fetched thumbnail (or placeholder)
- **Success feedback**: Auto-redirect with confirmation
- **Error handling**: 
  - Unsupported platform → blocking warning
  - Quota exceeded → upgrade prompt
  - Duplicate detection → shows existing category
  - Thumbnail failure → allows retry

### 5. **PWA Web Share Target** (`public/manifest.json`)
- **Platforms**: Works on Android Chrome, Edge, Samsung Internet when PWA is installed
- **Configuration**: `share_target` in manifest receives `title`, `text`, and `url`
- **Action**: Opens `/add?url=<shared-url>` with pre-filled data
- **User flow**: Share from any app → Select "Tagmentia" → Opens PWA → Video saved

### 6. **Deep Linking** (Capacitor - iOS/Android)
- **Custom scheme**: `tagmentia://add?url=<encoded>` (works immediately)
- **Universal Links (iOS)**: `https://tagmentia.com/add?url=<encoded>` (requires domain verification)
- **App Links (Android)**: `https://tagmentia.com/add?url=<encoded>` (requires domain verification)
- **Associated Domains**: Configured in `capacitor.config.ts` and `.well-known/apple-app-site-association`
- **Share Extension (iOS)**: Native Share Sheet integration via Xcode Share Extension target

### 7. **Thumbnail Retry Function** (`refresh-thumbnail`)
- **Endpoint**: POST to `refresh-thumbnail` edge function
- **Parameters**: `{ videoId: string }`
- **Behavior**: Re-runs the full thumbnail fetch strategy for an existing video
- **Security**: Owner-only access (validates user owns the video)
- **Use case**: Retry when initial fetch fails or platform served a better thumbnail later

## Platform-Specific Setup

### **Android Native Setup**

To enable Share Intents on Android, add to `android/app/src/main/AndroidManifest.xml` inside the main activity:

```xml
<activity android:name=".MainActivity">
  <!-- Existing intent filters -->
  
  <!-- Share Intent Receiver -->
  <intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="text/plain" />
  </intent-filter>
  
  <!-- App Links -->
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data 
      android:scheme="https"
      android:host="tagmentia.com"
      android:pathPrefix="/add" />
  </intent-filter>
  
  <!-- Custom Scheme -->
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="tagmentia" />
  </intent-filter>
</activity>
```

Then add this to your `MainActivity.java` or `MainActivity.kt`:

```kotlin
import android.content.Intent
import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        intent?.let { handleIntent(it) }
    }

    private fun handleIntent(intent: Intent) {
        when (intent.action) {
            Intent.ACTION_SEND -> {
                if (intent.type == "text/plain") {
                    val sharedUrl = intent.getStringExtra(Intent.EXTRA_TEXT)
                    sharedUrl?.let {
                        // Redirect to add page with URL
                        val bridge = this.bridge
                        bridge.eval("window.location.href = '/add?url=' + encodeURIComponent('$it');", null)
                    }
                }
            }
        }
    }
}
```

### **iOS Native Setup**

#### 1. **Share Extension** (recommended for "Share Sheet" support)

Create a new Share Extension target in Xcode:
- File → New → Target → Share Extension
- Name it `TagmentiaShareExtension`

In `ShareViewController.swift`:

```swift
import UIKit
import Social

class ShareViewController: SLComposeServiceViewController {
    override func isContentValid() -> Bool {
        return true
    }

    override func didSelectPost() {
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
              let itemProvider = extensionItem.attachments?.first else {
            extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
            return
        }

        if itemProvider.hasItemConformingToTypeIdentifier("public.url") {
            itemProvider.loadItem(forTypeIdentifier: "public.url", options: nil) { [weak self] (url, error) in
                if let shareURL = url as? URL {
                    let encodedURL = shareURL.absoluteString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
                    let appURL = URL(string: "tagmentia://add?url=\(encodedURL)")!
                    self?.open(url: appURL)
                }
                self?.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
            }
        }
    }

    private func open(url: URL) {
        var responder: UIResponder? = self
        while responder != nil {
            if let application = responder as? UIApplication {
                application.open(url, options: [:], completionHandler: nil)
                return
            }
            responder = responder?.next
        }
    }
}
```

#### 2. **Universal Links**

Update `ios/App/App/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>tagmentia</string>
        </array>
    </dict>
</array>
```

Enable Associated Domains in Xcode:
- Target → Signing & Capabilities → + Capability → Associated Domains
- Add: `applinks:tagmentia.com`

Update Team ID in `public/.well-known/apple-app-site-association` (replace `TEAMID`).

#### 3. **Handle URLs in App**

In `AppDelegate.swift`:

```swift
func application(_ application: UIApplication,
                 continue userActivity: NSUserActivity,
                 restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
       let url = userActivity.webpageURL {
        // Handle universal link
        NotificationCenter.default.post(name: .capacitorOpenURL, object: url)
        return true
    }
    return false
}
```

### **Web/PWA Setup**

Already configured! Users need to:
1. Install Tagmentia as PWA (Android Chrome: Settings → Add to Home Screen)
2. Share a YouTube/Instagram/TikTok/Snapchat/Loom video
3. Select "Tagmentia" from share sheet
4. App opens to `/add` with pre-filled URL

### **Loom Workflow**

When sharing from Loom:
1. **On Loom**: Open the video you want to save
2. **Share the video**: Use the native share button in Loom
3. **Select Tagmentia**: Choose "Tagmentia" from the share menu
4. **Select category**: Choose the category you want to save the video to
5. **Automatic save**: The link is automatically saved and synced across **Android** and **iOS** platforms

## Testing

### **Android**
```bash
# Test share intent
adb shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT "https://youtube.com/watch?v=dQw4w9WgXcQ"

# Test app link
adb shell am start -a android.intent.action.VIEW -d "https://tagmentia.com/add?url=https://youtube.com/watch?v=dQw4w9WgXcQ"

# Test custom scheme
adb shell am start -a android.intent.action.VIEW -d "tagmentia://add?url=https://youtube.com/watch?v=dQw4w9WgXcQ"
```

### **iOS**
```bash
# Test custom scheme
xcrun simctl openurl booted "tagmentia://add?url=https://youtube.com/watch?v=dQw4w9WgXcQ"

# Test universal link (requires .well-known file served)
xcrun simctl openurl booted "https://tagmentia.com/add?url=https://youtube.com/watch?v=dQw4w9WgXcQ"
```

### **PWA (Android Chrome)**
1. Install PWA from Chrome menu
2. Open YouTube app
3. Share a video
4. Look for "Tagmentia" in share sheet
5. Should open PWA to `/add` page

## API Usage

### Save Shared Link
```typescript
const { data, error } = await supabase.functions.invoke('save-shared-link', {
  body: {
    url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    categoryId: 'uuid-here',
    note: 'Optional note',
    reminderAt: null // optional ISO timestamp
  }
});

// Response:
{
  id: 'video-uuid',
  url: 'canonical-url',
  canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  platform: 'youtube',
  categoryId: 'uuid',
  message: 'Video saved successfully'
}

// Or if duplicate:
{
  duplicate: true,
  message: 'This video is already saved',
  existingCategoryId: 'uuid'
}

// Or if quota exceeded:
{
  error: 'Quota exceeded',
  message: "You've reached your plan limit",
  requiresUpgrade: true
}
```

## Supported Platforms (Allowlist)

✅ **YouTube**
- `youtube.com/watch?v=...`
- `youtu.be/...`
- `m.youtube.com/watch?v=...`
- Thumbnail: Direct image URL (best quality) → oEmbed → Open Graph

✅ **Instagram**
- `instagram.com/p/...` (posts)
- `instagram.com/reel/...` (reels)
- **Note**: Only public posts/reels are supported
- Thumbnail: oEmbed API → Open Graph scraping

✅ **TikTok**
- `tiktok.com/@user/video/...`
- `vm.tiktok.com/...` (short links)
- Thumbnail: oEmbed API → Open Graph scraping

✅ **Snapchat**
- `snapchat.com/spotlight/...`
- `story.snapchat.com/...`
- `t.snapchat.com/...` (short links)
- Thumbnail: Open Graph HTML scraping

✅ **Loom**
- `loom.com/share/...`
- `www.loom.com/share/...`
- Thumbnail: oEmbed API → Open Graph scraping
- **Workflow**: Share from Loom → Select Tagmentia → Choose category → Link automatically saved across Android and iOS

❌ **Unsupported Platforms** (Blocked)
- All other video hosting sites
- Users see: *"This video site isn't supported yet. Currently supported: YouTube, TikTok, Instagram, Snapchat, Loom."*

## Security

- ✅ Validates authenticated users only
- ✅ Blocks `javascript:` and `data:` schemes
- ✅ Strips tracking parameters
- ✅ Rate limited (60 req/hour via Supabase)
- ✅ Plan quota enforcement
- ✅ Input sanitization

## Known Limitations

- **Instagram private/age-gated content**: Thumbnails may not be available (gracefully handled with retry option)
- **TikTok short links** (`vm.tiktok.com`): Normalized but may not resolve to canonical URL instantly
- **iOS Share Extension**: Requires manual Xcode project setup (not auto-generated by Capacitor)
- **PWA Share Target**: Only works on Chromium-based browsers (Chrome, Edge, Samsung Internet) when PWA is installed
- **Domain verification**: Universal Links (iOS) and App Links (Android) require domain ownership verification

## Deployment Checklist

### Web (PWA)
- ✅ `public/manifest.json` configured with `share_target`
- ✅ `/add` route handles URL parameters
- ✅ Platform validation and thumbnail fetching active
- 📋 **User action**: Install PWA from browser (Chrome: Settings → Add to Home Screen)

### Android
1. ✅ `capacitor.config.ts` configured for deep linking
2. 📋 **Add to `android/app/src/main/AndroidManifest.xml`** (see documentation above)
3. 📋 **Add share intent handler to `MainActivity`** (see Kotlin/Java code above)
4. 📋 **Upload `assetlinks.json`** to `https://tagmentia.com/.well-known/assetlinks.json` for App Links verification
5. 📋 **Test**: `adb shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT "https://youtube.com/watch?v=dQw4w9WgXcQ"`

### iOS
1. ✅ `capacitor.config.ts` configured for deep linking
2. ✅ `.well-known/apple-app-site-association` created
3. 📋 **Update Team ID** in `.well-known/apple-app-site-association` (replace `TEAMID` with your Apple Developer Team ID)
4. 📋 **Upload association file** to `https://tagmentia.com/.well-known/apple-app-site-association`
5. 📋 **Create Share Extension** in Xcode (see Swift code above)
6. 📋 **Enable Associated Domains** in Xcode: Target → Signing & Capabilities → + Capability → Associated Domains → Add `applinks:tagmentia.com`
7. 📋 **Configure App Groups** for Share Extension communication
8. 📋 **Test**: `xcrun simctl openurl booted "tagmentia://add?url=https://youtube.com/watch?v=dQw4w9WgXcQ"`

### Testing on Real Devices
1. **Web**: Install PWA, share from YouTube/TikTok/Instagram/Snapchat/Loom, verify "Tagmentia" appears in share sheet
2. **Android**: Install APK, share from any app, verify "Tagmentia" appears and opens correctly
3. **iOS**: Install via TestFlight, share from any app, verify Share Extension works
4. **Cross-platform**: Test duplicate detection, quota enforcement, thumbnail fetching, and retry functionality

## Environment Variables

None required - uses existing Supabase configuration.

## Documentation

- [Capacitor Deep Links](https://capacitorjs.com/docs/guides/deep-links)
- [iOS Universal Links](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app)
- [Android App Links](https://developer.android.com/training/app-links)
- [PWA Web Share Target](https://web.dev/web-share-target/)
