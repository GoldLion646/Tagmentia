# Testing Share Intent Without YouTube

This guide shows you how to test the share intent functionality without using YouTube or other apps.

## Prerequisites

1. **Android device connected** via USB with USB debugging enabled
2. **ADB (Android Debug Bridge)** installed and working
3. **Tagmentia app installed** on your device

## Quick Test Commands

### Test 1: Simple YouTube URL
```bash
adb shell am start -a android.intent.action.SEND \
  -t "text/plain" \
  --es android.intent.extra.TEXT "https://www.youtube.com/watch?v=dQw4w9WgXcQ" \
  -n app.lovable.tagmentia/app.lovable.tagmentia.MainActivity
```

### Test 2: YouTube Short URL (youtu.be)
```bash
adb shell am start -a android.intent.action.SEND \
  -t "text/plain" \
  --es android.intent.extra.TEXT "https://youtu.be/dQw4w9WgXcQ" \
  -n app.lovable.tagmentia/app.lovable.tagmentia.MainActivity
```

### Test 3: YouTube URL with Text
```bash
adb shell am start -a android.intent.action.SEND \
  -t "text/plain" \
  --es android.intent.extra.TEXT "Check out this amazing video: https://www.youtube.com/watch?v=dQw4w9WgXcQ" \
  -n app.lovable.tagmentia/app.lovable.tagmentia.MainActivity
```

### Test 4: TikTok URL
```bash
adb shell am start -a android.intent.action.SEND \
  -t "text/plain" \
  --es android.intent.extra.TEXT "https://www.tiktok.com/@user/video/1234567890" \
  -n app.lovable.tagmentia/app.lovable.tagmentia.MainActivity
```

### Test 5: Instagram URL
```bash
adb shell am start -a android.intent.action.SEND \
  -t "text/plain" \
  --es android.intent.extra.TEXT "https://www.instagram.com/p/ABC123/" \
  -n app.lovable.tagmentia/app.lovable.tagmentia.MainActivity
```

## Using Test Scripts

### Windows
```bash
test-share-intent.bat
```

### Linux/Mac
```bash
chmod +x test-share-intent.sh
./test-share-intent.sh
```

## Manual Testing Steps

1. **Connect your device** via USB
2. **Enable USB debugging** on your device
3. **Verify ADB connection**:
   ```bash
   adb devices
   ```
   You should see your device listed

4. **Run a test command** (use any of the commands above)

5. **Check the app** - The Tagmentia app should open automatically with the shared URL

6. **Check logs** (optional):
   ```bash
   adb logcat | grep MainActivity
   ```
   Or on Windows:
   ```bash
   adb logcat | findstr MainActivity
   ```

## Expected Behavior

When you run a test command:
1. ✅ The Tagmentia app should open automatically
2. ✅ The app should navigate to the `/add` route
3. ✅ The video URL should be pre-filled in the form
4. ✅ The platform should be detected (YouTube, TikTok, etc.)

## Troubleshooting

### Device not found
```bash
adb devices
# If empty, check USB debugging is enabled
```

### App doesn't open
- Make sure the app is installed: `adb shell pm list packages | grep tagmentia`
- Check if the package name is correct: `app.lovable.tagmentia`

### URL not captured
- Check logs: `adb logcat | grep MainActivity`
- Verify the intent filter in `AndroidManifest.xml` includes `text/plain`

### Test with a custom URL
Replace the URL in any command with your own:
```bash
adb shell am start -a android.intent.action.SEND \
  -t "text/plain" \
  --es android.intent.extra.TEXT "YOUR_URL_HERE" \
  -n app.lovable.tagmentia/app.lovable.tagmentia.MainActivity
```

## Alternative: Use Android Studio

1. Open Android Studio
2. Go to **Run > Edit Configurations**
3. Add a new **Android App** configuration
4. In **Launch Options**, select **Specified Activity**
5. Enter: `app.lovable.tagmentia.MainActivity`
6. Add **Intent extras**:
   - Key: `android.intent.extra.TEXT`
   - Value: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
7. Run the configuration

