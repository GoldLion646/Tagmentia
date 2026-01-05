import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import DashboardWeb from "./pages/DashboardWeb";
import Categories from "./pages/Categories";
import CategoriesWeb from "./pages/CategoriesWeb";
import CategoriesGrid from "./pages/CategoriesGrid";
import CategoryDetail from "./pages/CategoryDetail";
import CategoryDetailWeb from "./pages/CategoryDetailWeb";
import AddCategory from "./pages/AddCategory";
import AddVideo from "./pages/AddVideo";
import AddSharedVideo from "./pages/AddSharedVideo";
import AddVideoToCategory from "./pages/AddVideoToCategory";
import AddScreenshot from "./pages/AddScreenshot";
import AddSharedScreen from "./pages/AddSharedScreen";
import Search from "./pages/Search";
import SearchWeb from "./pages/SearchWeb";
import Videos from "./pages/Videos";
import VideosWeb from "./pages/VideosWeb";
import VideoDetail from "./pages/VideoDetail";
import Screenshots from "./pages/Screenshots";
import ScreenshotsWeb from "./pages/ScreenshotsWeb";
import Notes from "./pages/Notes";
import NotesWeb from "./pages/NotesWeb";
import RemindersWeb from "./pages/RemindersWeb";
import Reminders from "./pages/Reminders";
import AddNote from "./pages/AddNote";
import Profile from "./pages/Profile";
import ProfileWeb from "./pages/ProfileWeb";
import NotFound from "./pages/NotFound";
import Splash from "./pages/Splash";
import Homepage from "./pages/Homepage";
import Login from "./pages/auth/Login";
import SignUp from "./pages/auth/SignUp";
import VerifyEmail from "./pages/auth/VerifyEmail";
import Onboarding from "./pages/auth/Onboarding";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import MobileWelcomePage from "./pages/auth/MobileWelcomePage";
import AccountSuspended from "./pages/AccountSuspended";
import { AccountDeleted } from "./pages/AccountDeleted";
import { HelpFeedback } from "./pages/HelpFeedback";
import Upgrade from "./pages/Upgrade";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import Support from "./pages/Support";
import AccountDeletion from "./pages/AccountDeletion";
import { AuthWrapper } from "./components/AuthWrapper";
import { RequireAdmin } from "@/components/RequireAdmin";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { UserManagement } from "./pages/admin/UserManagement";
import { WaitlistManagement } from "./pages/admin/WaitlistManagement";
import { BillingOverview } from "./pages/admin/BillingOverview";
import { SubscriptionManagement } from "./pages/admin/SubscriptionManagement";
import { SystemSettings } from "./pages/admin/SystemSettings";
import Messaging from "./pages/admin/Messaging";
import { Configuration } from "./pages/admin/Configuration";
import { BroadcastBar } from "./components/BroadcastBar";
import { PushSubscriptionManager } from "./components/PushSubscriptionManager";
import { FaviconManager } from "./components/FaviconManager";
import { AppLayout } from "./components/AppLayout";
import { useDeepLink } from "./hooks/useDeepLink";
import { NotificationPermissionRequest } from "./components/NotificationPermissionRequest";
import { useRescheduleReminders } from "./hooks/useRescheduleReminders";

const queryClient = new QueryClient();

// Component to handle deep links
function DeepLinkHandler() {
  useDeepLink();
  return null;
}

// Component to bootstrap pending share (web + native)
import { usePendingShareBootstrap } from "./hooks/usePendingShareBootstrap";
function PendingShareHandler() {
  usePendingShareBootstrap();
  return null;
}

// Component to reschedule all reminder notifications on app load
function ReminderRescheduler() {
  useRescheduleReminders();
  return null;
}

const App = () => {
  // Check if we're on the admin subdomain
  const isAdminSubdomain = window.location.hostname.startsWith('admin.');

  if (isAdminSubdomain) {
    // Admin-only routing for admin.tagmentia.com
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthWrapper>
              <DeepLinkHandler />
              <BroadcastBar />
              <PushSubscriptionManager />
              <NotificationPermissionRequest />
              <ReminderRescheduler />
              <FaviconManager />
              <Routes>
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<UserManagement />} />
                  <Route path="waitlist" element={<WaitlistManagement />} />
                  <Route path="messaging" element={<Messaging />} />
                  <Route path="billing" element={<BillingOverview />} />
                  <Route path="subscriptions" element={<SubscriptionManagement />} />
                  <Route path="configuration" element={<Configuration />} />
                  <Route path="settings" element={<SystemSettings />} />
                </Route>
                <Route path="/account-suspended" element={<AccountSuspended />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthWrapper>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Main app routing for tagmentia.com
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
          <BrowserRouter>
            <AuthWrapper>
              <PendingShareHandler />
              <DeepLinkHandler />
              <BroadcastBar />
              <PushSubscriptionManager />
              <NotificationPermissionRequest />
              <ReminderRescheduler />
              <FaviconManager />
              <Routes>
                {/* Admin routes - wrapped in AdminLayout */}
                <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<UserManagement />} />
                  <Route path="waitlist" element={<WaitlistManagement />} />
                  <Route path="messaging" element={<Messaging />} />
                  <Route path="billing" element={<BillingOverview />} />
                  <Route path="subscriptions" element={<SubscriptionManagement />} />
                  <Route path="configuration" element={<Configuration />} />
                  <Route path="settings" element={<SystemSettings />} />
                </Route>
                
                {/* Auth routes - no layout */}
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/signup" element={<SignUp />} />
                <Route path="/auth/verify-email" element={<VerifyEmail />} />
                <Route path="/auth/onboarding" element={<Onboarding />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                <Route path="/account-suspended" element={<AccountSuspended />} />
                <Route path="/account-deleted" element={<AccountDeleted />} />
                
                {/* Public Homepage */}
                <Route path="/" element={<MobileWelcomePage />} />
                <Route path="/home" element={<MobileWelcomePage />} />
                
                {/* Public Legal Pages */}
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/support" element={<Support />} />
                <Route path="/account-deletion" element={<AccountDeletion />} />
                
                {/* User routes - wrapped in AppLayout */}
                <Route element={<AppLayout><Outlet /></AppLayout>}>
                  <Route path="/splash" element={<Splash />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/dashboard-web" element={<DashboardWeb />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/categories-web" element={<CategoriesWeb />} />
                  <Route path="/categories-grid" element={<CategoriesGrid />} />
                  <Route path="/categories/add" element={<AddCategory />} />
                  <Route path="/add" element={<AddSharedVideo />} />
                  <Route path="/category/:id" element={<CategoryDetail />} />
                  <Route path="/category-web/:id" element={<CategoryDetailWeb />} />
                  <Route path="/category/:categoryId/add-video" element={<AddVideo />} />
                  <Route path="/category/:categoryId/add-shared-video" element={<AddVideoToCategory />} />
                  <Route path="/add-video" element={<AddVideo />} />
                  <Route path="/category/:categoryId/add-screenshot" element={<AddScreenshot />} />
                  <Route path="/add-screenshot" element={<AddScreenshot />} />
                  <Route path="/category/:categoryId/add-shared-screen" element={<AddSharedScreen />} />
                  <Route path="/add-shared-screen" element={<AddSharedScreen />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/search-web" element={<SearchWeb />} />
                  <Route path="/videos" element={<Videos />} />
                  <Route path="/videos-web" element={<VideosWeb />} />
              <Route path="/reminders-web" element={<RemindersWeb />} />
              <Route path="/reminders" element={<Reminders />} />
                  <Route path="/video/:id" element={<VideoDetail />} />
                  <Route path="/video-web/:id" element={<VideoDetail />} />
                  <Route path="/screenshots" element={<Screenshots />} />
                  <Route path="/screenshots-web" element={<ScreenshotsWeb />} />
                  <Route path="/notes" element={<Notes />} />
                  <Route path="/notes-web" element={<NotesWeb />} />
                  <Route path="/notes/add" element={<AddNote />} />
                  <Route path="/account" element={<Profile />} />
                  <Route path="/account-web" element={<ProfileWeb />} />
                  <Route path="/help-feedback" element={<HelpFeedback />} />
                  <Route path="/upgrade" element={<Upgrade />} />
                  <Route path="/users" element={<RequireAdmin><UserManagement /></RequireAdmin>} />
                  <Route path="/settings" element={<RequireAdmin><SystemSettings /></RequireAdmin>} />
                </Route>
                
                {/* 404 - Not Found */}
                <Route path="*" element={<NotFound />} />
              </Routes>
          </AuthWrapper>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
