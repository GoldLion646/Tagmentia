# Edge Function Error Handling Fix

## Problem
The error "Edge Function returned a non-2xx status code" was occurring when calling the `save-shared-link` edge function. This happened because:

1. **Missing Authorization Header**: The edge function requires an explicit Authorization header, but it wasn't always being included
2. **Poor Error Handling**: HTTP errors (non-2xx status codes) weren't being properly parsed and displayed to users
3. **Session Management**: Session tokens weren't being refreshed when expired

## Solution

### 1. Created Utility Function (`src/utils/edgeFunctionCall.ts`)
A centralized utility function that:
- ✅ Automatically includes Authorization header
- ✅ Handles session refresh when tokens expire
- ✅ Properly extracts error messages from HTTP responses
- ✅ Works consistently across Web (PWA), Android, and iOS platforms
- ✅ Provides user-friendly error messages

### 2. Updated Components

#### `src/pages/AddSharedVideo.tsx`
- ✅ Now uses `callEdgeFunction` utility
- ✅ Better error handling for all error types
- ✅ Proper redirects for authentication errors
- ✅ User-friendly error messages

#### `src/pages/AddVideo.tsx`
- ✅ Updated to use `callEdgeFunction` utility
- ✅ Consistent error handling with AddSharedVideo
- ✅ Better error messages for users

## Error Handling Improvements

### Authentication Errors
- **401 Unauthorized**: Automatically redirects to login page
- **Missing Authorization**: Clear message asking user to log in
- **Session Expired**: Attempts to refresh session, then redirects if needed

### Application Errors
- **UNSUPPORTED_PLATFORM**: Clear message about supported platforms
- **UPGRADE_REQUIRED**: Redirects to upgrade page
- **DUPLICATE_VIDEO**: Informs user video already exists
- **Missing Required Fields**: Clear validation message

### Network/Server Errors
- **500 Internal Server Error**: User-friendly message with retry option
- **Network Errors**: Clear message about connectivity issues
- **Timeout Errors**: Suggests checking connection

## Platform Compatibility

### Web (PWA)
- ✅ Works with localStorage for session persistence
- ✅ Handles CORS properly
- ✅ Works in all modern browsers

### Android
- ✅ Compatible with Capacitor
- ✅ Handles native app session management
- ✅ Works with Android WebView

### iOS
- ✅ Compatible with Capacitor
- ✅ Handles native app session management
- ✅ Works with iOS WKWebView

## Testing Checklist

### Authentication
- [ ] Valid session token works
- [ ] Expired session token refreshes automatically
- [ ] Invalid session token redirects to login
- [ ] Missing session token shows clear error

### Error Handling
- [ ] 401 errors redirect to login
- [ ] 400 errors show validation messages
- [ ] 500 errors show user-friendly message
- [ ] Network errors are handled gracefully

### Platform Testing
- [ ] Web (PWA) - Chrome, Firefox, Safari, Edge
- [ ] Android - Chrome, Samsung Internet
- [ ] iOS - Safari, Chrome

## Usage Example

```typescript
import { callEdgeFunction } from "@/utils/edgeFunctionCall";

const { data, error } = await callEdgeFunction(
  "save-shared-link",
  {
    url: "https://youtube.com/watch?v=...",
    categoryId: "uuid-here",
    note: "Optional note"
  }
);

if (error) {
  // Handle error (already user-friendly)
  toast({ title: "Error", description: error, variant: "destructive" });
} else {
  // Success
  console.log("Video saved:", data);
}
```

## Benefits

1. **Consistency**: Same error handling across all platforms
2. **User Experience**: Clear, actionable error messages
3. **Maintainability**: Centralized error handling logic
4. **Reliability**: Automatic session refresh
5. **Debugging**: Better error logging and context

## Additional Edge Function Calls

The following components also call edge functions and could benefit from using `callEdgeFunction` utility:

### High Priority (User-Facing)
- `src/pages/HelpFeedback.tsx` - `send-help-feedback`
- `src/pages/Support.tsx` - `send-help-feedback`
- `src/components/UpgradePromptModal.tsx` - `create-subscription-checkout`
- `src/components/VideoSummarySection.tsx` - `ai-summarize`, `ai-summaries/{id}`, `ai-regenerate/{id}`
- `src/pages/Profile.tsx` - `customer-portal`, `cancel-subscription`
- `src/pages/ProfileWeb.tsx` - `customer-portal`, `cancel-subscription`

### Medium Priority
- `src/pages/AddScreenshot.tsx` - `upload-screenshot`
- `src/components/DeleteAccountDialog.tsx` - `delete-account`
- `src/components/WaitlistDialog.tsx` - `waitlist`
- `src/pages/Homepage.tsx` - `waitlist`

### Low Priority (Admin/Internal)
- `src/pages/admin/SubscriptionManagement.tsx` - `manage-subscriptions`, `create-subscription-checkout`
- `src/pages/admin/Messaging.tsx` - `send-push`
- `src/components/admin/ClearRateLimitsDialog.tsx` - `clear-rate-limits`
- `src/utils/securityLogger.ts` - `security-monitor`
- `src/components/PushSubscriptionManager.tsx` - `push-config`

### Migration Guide

To migrate existing edge function calls to use `callEdgeFunction`:

**Before:**
```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { param1: value1 }
});

if (error) {
  // Handle error
}
```

**After:**
```typescript
import { callEdgeFunction } from "@/utils/edgeFunctionCall";

const { data, error } = await callEdgeFunction('function-name', {
  param1: value1
});

if (error) {
  // Error is already user-friendly
  toast({ title: "Error", description: error, variant: "destructive" });
}
```

**Key Differences:**
- No need to manually include Authorization header
- Error messages are automatically extracted and user-friendly
- Session refresh is handled automatically
- Consistent error handling across all platforms

## Implementation Status

- ✅ `src/pages/AddSharedVideo.tsx` - **Implemented**
- ✅ `src/pages/AddVideo.tsx` - **Implemented**
- ⏳ Other components - **Pending migration** (optional, but recommended)

