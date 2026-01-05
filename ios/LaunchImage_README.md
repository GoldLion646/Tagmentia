# iOS Launch Image Setup

## Required Steps

### Option 1: Using LaunchScreen.storyboard (Recommended)

1. After running `npx cap sync`, open `ios/App/App.xcworkspace` in Xcode
2. Navigate to `LaunchScreen.storyboard` in the project navigator
3. The storyboard template has been configured to display your launch image
4. Add your launch image to `Assets.xcassets` → `LaunchImage.imageset`
5. The storyboard will automatically use the LaunchImage asset

### Option 2: Using Assets.xcassets

1. Open `ios/App/App.xcworkspace` in Xcode
2. Navigate to `Assets.xcassets`
3. Create or update `LaunchImage.imageset`
4. Add launch images for different device sizes:
   - 1x: 320x568px (iPhone SE)
   - 2x: 640x1136px, 750x1334px, 828x1792px
   - 3x: 1125x2436px, 1242x2208px, 1242x2688px, 1170x2532px, 1284x2778px, 1179x2556px, 1290x2796px

## Image Requirements

- Format: PNG
- Recommended base size: 1242x2688px (iPhone 14 Pro Max)
- The image should include the gradient background
- Xcode will automatically generate @2x and @3x variants if you provide a high-resolution source

## After Setup

1. Run `npx cap sync` to sync resources
2. Build and test: `npx cap run ios`

