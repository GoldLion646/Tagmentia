# Device Detection & Automatic Layout Routing

## Overview

This application automatically detects the user's device/screen size and routes them to the appropriate layout version:
- **Mobile Layout** (≤ 768px): Optimized mobile UI with bottom tab navigation
- **Web/Desktop Layout** (≥ 769px): Desktop UI with left sidebar navigation

## How It Works

### 1. Detection Hooks

**`useDeviceDetection.tsx`**
- Detects viewport width and classifies device type: `mobile`, `tablet`, or `desktop`
- Determines layout type: `mobile` or `web`
- Respects user preferences stored in `localStorage` (key: `preferred_layout`)
- Provides `setPreferredLayout()` to manually override auto-detection
- Debounced resize listener (250ms) for performance

**`useLayoutBreakpoint.tsx`**
- Simplified breakpoint detection specifically for sidebar collapse
- Used by `AppLayout` and `LeftSidebarNav` components
- Manages sidebar collapsed state in `localStorage` (key: `sidebar_collapsed`)

### 2. Paired Routes

Every major screen has two versions with identical functionality but different UIs:

| Mobile Route | Web Route | Component |
|-------------|-----------|-----------|
| `/dashboard` | `/dashboard-web` | Dashboard |
| `/categories` | `/categories-web` | Categories |
| `/category/:id` | `/category-web/:id` | Category Detail |
| `/videos` | `/videos-web` | Videos |
| `/video/:id` | `/video-web/:id` | Video Detail |
| `/notes` | `/notes-web` | Notes |
| `/search` | `/search-web` | Search |
| `/account` | `/account-web` | Profile/Account |

### 3. Automatic Routing

**`LayoutRouter.tsx`**
- Wraps all app routes in `App.tsx`
- Monitors current route and device layout type
- Automatically redirects to paired route when layout changes
- Preserves URL parameters (e.g., `:id`) during redirects
- Uses `navigate(..., { replace: true })` to avoid breaking back button

Example flow:
1. User opens `/dashboard` on desktop (width: 1920px)
2. `LayoutRouter` detects `layoutType === 'web'` but route is mobile
3. Automatically redirects to `/dashboard-web`
4. User sees desktop-optimized layout with sidebar

### 4. Layout Components

**`AppLayout.tsx`**
- Single source of truth for navigation rendering
- Conditionally renders based on `isMobile` from `useLayoutBreakpoint`
- Shows `<Navigation />` (bottom tabs) on mobile
- Shows `<LeftSidebarNav />` on desktop
- Adjusts main content margins based on sidebar state

**`Navigation.tsx`** (Mobile)
- Fixed bottom tab bar
- Large tap targets (44px+)
- 5 primary routes: Dashboard, Categories, Search, Notes, Account
- Active state highlighting

**`LeftSidebarNav.tsx`** (Desktop)
- Collapsible sidebar (240px → 72px)
- Sections with icons
- Active route highlighting with left accent bar (#545DEA)
- Collapse state persists via `localStorage`

### 5. Layout Toggle

**`LayoutToggle.tsx`**
- Available in web layout headers
- Allows users to manually switch between Mobile/Web views
- Sets `preferredLayout` in `localStorage`
- Triggers route change via `LayoutRouter`

### 6. Shared Business Logic

All data fetching, mutations, and business logic are in shared hooks:
- `useNotes()` - Notes CRUD
- `useRecentVideos()` - Recent videos
- `useRecentCategories()` - Recent categories
- `useSubscriptionLimits()` - Plan limits
- `useTotalStats()` - Usage statistics
- etc.

**Only the presentation layer differs between mobile/web versions.**

### 7. No Layout Flash

- Breakpoint detection happens during first render
- Uses `window.innerWidth` synchronously (not async)
- No placeholder needed - layout renders correctly immediately
- Resize changes are debounced to avoid thrashing

## User Preference Override

Users can override automatic detection:

```typescript
const { layoutType, setPreferredLayout } = useDeviceDetection();

// Force mobile layout on desktop
setPreferredLayout('mobile');

// Force web layout on mobile
setPreferredLayout('web');

// Clear preference, use auto-detection
setPreferredLayout(null);
```

Preference is stored in `localStorage` under key `preferred_layout`.

## Testing Checklist

✅ **Breakpoints:**
- Test at 375px (iPhone), 768px (iPad portrait), 1024px (iPad landscape), 1440px, 1920px
- Verify correct navigation component renders at each width
- Confirm no overlapping UI elements

✅ **Route Parity:**
- All paired routes load same data with different layouts
- Deep links work: `/category/123` → correct layout + same data
- Query params persist across layout switches

✅ **State Preservation:**
- Auth state persists across layout changes
- Form data not lost when switching layouts
- Sidebar collapse state persists between sessions

✅ **Responsive Behavior:**
- Resize window from mobile → desktop: automatically redirects
- Resize from desktop → mobile: redirects to mobile route
- No visible flash or jank during transition

✅ **Accessibility:**
- Keyboard navigation works in both layouts
- Focus management correct during route changes
- `aria-current="page"` on active nav items
- Screen reader announcements for route changes

## Architecture Decisions

### Why Paired Routes Instead of Responsive CSS?

1. **Performance**: Load only the code needed for current layout
2. **Maintainability**: Clear separation between mobile/desktop logic
3. **User Experience**: Optimized interactions per device (touch vs mouse)
4. **Code Splitting**: Smaller bundle sizes per layout
5. **Flexibility**: Completely different UIs when needed

### Why Client-Side Detection Only?

- Lovable projects are static SPAs (Vite + React)
- No server-side rendering (SSR) needed
- `window.innerWidth` is synchronous and accurate
- User-Agent detection is unreliable (tablets can report as desktop)

### Why localStorage for Preferences?

- Persists across sessions
- No backend needed
- Instant access (synchronous)
- Can be cleared easily for testing

## Future Enhancements

1. **Tablet-Specific Layout**: Add third layout for 769-1024px range
2. **Layout Analytics**: Track which layouts users prefer
3. **Smooth Transitions**: Add animation between layout switches
4. **Progressive Web App**: Install separate mobile/desktop experiences
5. **URL Strategy**: Consider separate domains (m.app.com vs app.com)

## Common Pitfalls to Avoid

❌ Don't duplicate business logic between layouts
✅ Use shared hooks for all data operations

❌ Don't use different route parameters
✅ Keep URL structure identical (only suffix differs)

❌ Don't forget to add new screens to both layouts
✅ Always create paired routes for new features

❌ Don't ignore tablet users
✅ Tablets use web layout but with responsive grids

❌ Don't break deep links
✅ Test all URLs work on both layouts
