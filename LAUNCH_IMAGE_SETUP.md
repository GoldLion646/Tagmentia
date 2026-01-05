# Launch Image Setup Guide

This guide explains how to replace the launch/splash screen image across **Android** and **iOS** platforms.

## Image Requirements

You need to provide a launch image with the following specifications:
- **Format**: PNG with transparency support
- **Recommended size**: 1242x2688 pixels (iPhone 14 Pro Max size, can be scaled down)
- **Aspect ratio**: 9:19.5 (portrait orientation)
- **Background**: The image should include the gradient background as shown

## Step 1: Prepare Your Launch Image

1. **For Android**: Save your launch image as `splash_image.png` in `android/app/src/main/res/drawable/`
2. **For iOS**: Add your launch image to Xcode Assets (see iOS setup below)
3. **For PWA**: Save launch images in `public/launch-images/` with the sizes listed below
4. The image should be high resolution (at least 1242x2688px) to support all device sizes

## Step 2: Generate Required Sizes

### For Android:
You'll need multiple sizes for different screen densities:
- **mdpi**: 320x640px (1x)
- **hdpi**: 480x960px (1.5x)
- **xhdpi**: 640x1280px (2x)
- **xxhdpi**: 960x1920px (3x)
- **xxxhdpi**: 1280x2560px (4x)

### For iOS:
You'll need sizes for different devices:
- **iPhone SE (1st & 2nd gen)**: 640x1136px
- **iPhone 8/7/6s/6**: 750x1334px
- **iPhone 8 Plus/7 Plus/6s Plus/6 Plus**: 1242x2208px
- **iPhone X/XS/11 Pro**: 1125x2436px
- **iPhone XR/11**: 828x1792px
- **iPhone XS Max/11 Pro Max**: 1242x2688px
- **iPhone 12/12 Pro**: 1170x2532px
- **iPhone 12 Pro Max**: 1284x2778px
- **iPhone 13/13 Pro**: 1170x2532px
- **iPhone 13 Pro Max**: 1284x2778px
- **iPhone 14/14 Pro**: 1179x2556px
- **iPhone 14 Pro Max**: 1290x2796px

## Step 3: Place Images in Correct Locations

### Android:
Place the splash screen image in:
- `android/app/src/main/res/drawable/splash_image.png` (main splash image)

### iOS:
After syncing Capacitor, place launch images in Xcode:
1. Open `ios/App/App.xcworkspace` in Xcode
2. Navigate to `Assets.xcassets` → `LaunchImage.imageset`
3. Add your launch images for each device size

Alternatively, you can use a LaunchScreen.storyboard (recommended for Capacitor).

## Step 4: Update Configuration Files

The following files have been configured:
- ✅ `index.html` - Added PWA launch screen meta tags for iOS devices
- ✅ `public/manifest.json` - Updated background color to match gradient (#9370DB)
- ✅ `android/app/src/main/res/drawable/splash.xml` - Android splash screen configuration with gradient background
- ✅ `android/app/src/main/res/values/styles.xml` - Android SplashTheme configuration
- ✅ `android/AndroidManifest.xml.template` - Updated to use SplashTheme
- ✅ `ios/LaunchScreen.storyboard.template` - iOS launch screen template

**Important**: You still need to:
1. Place your launch image at `android/app/src/main/res/drawable/splash_image.png`
2. Add launch images to iOS Assets in Xcode after running `npx cap sync`
3. Generate and place PWA launch images in `public/launch-images/` (optional, for web)

## Step 5: Sync Capacitor

After placing your images, run:
```bash
npx cap sync
```

This will sync the images to the native projects.

## Testing

### Android:
1. Build and run the app: `npx cap run android`
2. The launch screen should display your image when the app starts

### iOS:
1. Build and run the app: `npx cap run ios`
2. The launch screen should display your image when the app starts

## Notes

- The launch screen is displayed briefly while the app initializes
- For best results, ensure the image is optimized for web (compressed but high quality)
- The background color in `manifest.json` should match your image's background color
- For iOS, you may need to configure the launch screen in Xcode after syncing

