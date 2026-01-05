# iOS Image Sharing Setup

This guide explains how to configure iOS to receive image shares so Tagmentia appears in the share menu when sharing screenshots/images.

## Step 1: Add CFBundleDocumentTypes to Info.plist

1. Open your iOS project in Xcode:
   ```
   ios/App/App.xcworkspace
   ```

2. In Xcode, select the **App** target (not the project)

3. Go to the **Info** tab

4. Scroll down to **Document Types** section

5. Click the **+** button to add a new document type

6. Configure the document type as follows:
   - **Name**: Images
   - **Types**: `public.image`
   - **Icon**: (optional, can leave empty)
   - **Additional document type properties**: Click **+** and add:
     - Key: `LSItemContentTypes`
     - Type: Array
     - Values:
       - `public.png`
       - `public.jpeg`
       - `public.jpeg-2000`
       - `com.compuserve.gif`
       - `com.microsoft.bmp`
       - `public.tiff`
       - `com.apple.icns`
       - `com.microsoft.ico`

## Step 2: Add UTI (Uniform Type Identifier) Support

Alternatively, you can add this directly to `Info.plist`:

1. Right-click on `Info.plist` in Xcode
2. Select **Open As** → **Source Code**
3. Add the following inside the `<dict>` root element:

```xml
<key>CFBundleDocumentTypes</key>
<array>
    <dict>
        <key>CFBundleTypeName</key>
        <string>Images</string>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>LSItemContentTypes</key>
        <array>
            <string>public.image</string>
            <string>public.png</string>
            <string>public.jpeg</string>
            <string>public.jpeg-2000</string>
            <string>com.compuserve.gif</string>
            <string>com.microsoft.bmp</string>
            <string>public.tiff</string>
            <string>com.apple.icns</string>
            <string>com.microsoft.ico</string>
        </array>
    </dict>
</array>
```

## Step 3: Verify AppDelegate Handles Image Shares

Ensure your `AppDelegate.swift` handles image shares. The app should already handle this via Capacitor, but verify the file exists at:
```
ios/App/App/AppDelegate.swift
```

## Step 4: Rebuild the App

After making these changes:

1. Clean the build folder: **Product** → **Clean Build Folder** (Shift+Cmd+K)
2. Rebuild the app: **Product** → **Build** (Cmd+B)
3. Run on device or simulator

## Step 5: Test Image Sharing

1. Open Photos app (or any app with images)
2. Select an image
3. Tap the Share button
4. **Tagmentia should now appear in the share menu**
5. Tap Tagmentia to share the image

## Troubleshooting

### App doesn't appear in share menu:
- Ensure `CFBundleDocumentTypes` is correctly added to Info.plist
- Verify the app is installed (not just running from Xcode)
- Try uninstalling and reinstalling the app
- Check that the bundle identifier matches

### Images not opening in app:
- Verify AppDelegate handles the share intent
- Check console logs for errors
- Ensure the `/add-screenshot` route exists in your web app

## Notes

- The app will navigate to `/add-screenshot` route when an image is shared
- The user will need to manually select the image file (native-to-web file transfer requires additional setup)
- For automatic file handling, consider using Capacitor Filesystem plugin in the future

