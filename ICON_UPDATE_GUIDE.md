# Launch Icon Update Guide

The launch icon has been updated to match the new Tagmentia logo design. The icon features:
- **Top-left**: Quarter-circle with cyan-blue to blue gradient
- **Top-right**: Purple-blue (indigo) triangle pointing right
- **Bottom-right**: Quarter-circle with light blue to darker blue gradient
- **Bottom-left**: Empty white space
- **Background**: White

## ✅ Android Configuration Complete

The following Android files have been updated:
- ✅ `android/app/src/main/res/drawable/ic_launcher_foreground.xml` - New logo design
- ✅ `android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml` - API 24+ version
- ✅ `android/app/src/main/res/drawable/ic_launcher_background.xml` - White background
- ✅ `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` - Adaptive icon config
- ✅ `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml` - Round icon config

### Android PNG Generation (Optional)

For older Android versions (pre-API 26), PNG files are needed. These can be generated from the XML files or from a source image:

**Required sizes:**
- `mipmap-mdpi/`: 432×432px
- `mipmap-hdpi/`: 648×648px
- `mipmap-xhdpi/`: 864×864px
- `mipmap-xxhdpi/`: 1296×1296px
- `mipmap-xxxhdpi/`: 1728×1728px

**Files to update:**
- `ic_launcher.png` (square icon)
- `ic_launcher_round.png` (round icon)
- `ic_launcher_foreground.png` (foreground only)

**Note**: Modern Android devices (API 26+) will use the adaptive icon XML files automatically.

## 📱 iOS Configuration

For iOS, you need to add the icon to Xcode:

1. **Open the iOS project in Xcode:**
   ```bash
   npx cap sync ios
   open ios/App/App.xcworkspace
   ```

2. **Navigate to Assets:**
   - In Xcode, go to `App` → `Assets.xcassets` → `AppIcon`

3. **Add icon images:**
   - Drag and drop your icon image (1024×1024px) into the AppIcon set
   - Xcode will automatically generate the required sizes
   - Or manually add sizes:
     - 20pt (@2x, @3x) - 40×40, 60×60
     - 29pt (@2x, @3x) - 58×58, 87×87
     - 40pt (@2x, @3x) - 80×80, 120×120
     - 60pt (@2x, @3x) - 120×120, 180×180
     - 1024×1024 (App Store)

4. **Alternative: Use an icon generator tool:**
   - Use tools like [AppIcon.co](https://www.appicon.co/) or [IconKitchen](https://icon.kitchen/)
   - Upload your 1024×1024px source image
   - Download the generated iOS icon set
   - Import into Xcode Assets

## 🎨 Icon Design Specifications

- **Format**: PNG with transparency (for foreground elements)
- **Background**: White (#FFFFFF)
- **Colors**:
  - Top-left gradient: Cyan-blue (#00BFFF) to Blue (#0066CC)
  - Triangle: Indigo (#4B0082)
  - Bottom-right gradient: Light blue (#87CEEB) to Darker blue (#1E90FF)
- **Safe zone**: Keep important elements within the center 66% of the icon (Android adaptive icon requirement)

## 🔄 Testing

After updating the icons:

1. **Android:**
   ```bash
   npx cap sync android
   npx cap run android
   ```

2. **iOS:**
   ```bash
   npx cap sync ios
   npx cap run ios
   ```

3. **Check the icon:**
   - Install the app on a device or emulator
   - Verify the icon appears correctly on the home screen
   - Check both square and round icon variants (Android)

## 📝 Notes

- The XML vector drawables will automatically scale for different screen densities
- For best results, ensure your source image is at least 1024×1024px
- The white background ensures the icon looks good on both light and dark themes
- Android adaptive icons support different shapes (square, round, squircle) based on device settings

