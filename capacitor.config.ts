import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.tagmentia',
  appName: 'Tagmentia',
  webDir: 'dist',
  // Server URL removed for production - app will load from local assets
  // Uncomment below for development/testing with remote server:
  // server: {
  //   url: 'https://4b1dcae9-a659-43c6-a79c-09b65b0857eb.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    // Deep linking and share support
    App: {
      deepLinkingEnabled: true
    }
  },
  // iOS Universal Links and Share Extension
  ios: {
    associatedDomains: ['applinks:tagmentia.com', 'applinks:*.tagmentia.com'],
    scheme: 'tagmentia',
    // Share Extension will use App Groups to communicate with main app
    // Configure in Xcode: Signing & Capabilities → App Groups → group.app.lovable.tagmentia
  },
  // Android App Links and Share Intent
  android: {
    allowMixedContent: true,
    // Share Intent configuration (add to AndroidManifest.xml):
    // <intent-filter>
    //   <action android:name="android.intent.action.SEND" />
    //   <category android:name="android.intent.category.DEFAULT" />
    //   <data android:mimeType="text/plain" />
    // </intent-filter>
    //
    // App Links configuration (add to AndroidManifest.xml):
    // <intent-filter android:autoVerify="true">
    //   <action android:name="android.intent.action.VIEW" />
    //   <category android:name="android.intent.category.DEFAULT" />
    //   <category android:name="android.intent.category.BROWSABLE" />
    //   <data android:scheme="https" android:host="tagmentia.com" android:pathPrefix="/add" />
    // </intent-filter>
  }
};

export default config;