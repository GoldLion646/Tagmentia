import { Link, useNavigate, Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Play, Grid3x3, Bell, Video, FolderOpen, Camera } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Capacitor } from "@capacitor/core";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Header } from "@/components/Header";
import { useRecentVideos } from "@/hooks/useRecentVideos";
import { useRecentCategories } from "@/hooks/useRecentCategories";
import { useUpcomingReminders } from "@/hooks/useUpcomingReminders";
import { useTotalStats } from "@/hooks/useTotalStats";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { DashboardVideoItem } from "@/components/DashboardVideoItem";
import { PlanLimitIndicator } from "@/components/PlanLimitIndicator";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { useToast } from "@/hooks/use-toast";
import { isSupportedUrl, getPlatform } from "@/utils/urlNormalization";
import { callEdgeFunction } from "@/utils/edgeFunctionCall";
import MobileWelcomePage from "./auth/MobileWelcomePage";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { layoutType } = useDeviceDetection();
  const { videos, loading: videosLoading, refetch } = useRecentVideos(4);
  const { categories: recentCategories, loading: categoriesLoading } = useRecentCategories(4);
  const { reminders: upcomingReminders, loading: remindersLoading } = useUpcomingReminders(5);
  const { stats, loading: statsLoading } = useTotalStats();
  const { limits, loading: limitsLoading } = useSubscriptionLimits();
  const [firstName, setFirstName] = useState<string>('');
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    setCurrentSlide(carouselApi.selectedScrollSnap());

    carouselApi.on("select", () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('id', user.id)
            .maybeSingle();
          
          if (error) {
            console.error('Error fetching profile:', error);
            return;
          }
          
          if (profile?.first_name) {
            setFirstName(profile.first_name);
          }
        }
      } catch (error) {
        console.error('Error in fetchUserProfile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  // Redirect to web version if on desktop
  useEffect(() => {
    if (layoutType === 'web') {
      navigate('/dashboard-web', { replace: true });
    }
  }, [layoutType, navigate]);

  // Handle back button press - show exit confirmation dialog
  useEffect(() => {
    // Only handle on native platforms (Android/iOS)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let cleanup: (() => void) | null = null;

    // Dynamically import Capacitor App plugin only on native platforms
    import('@capacitor/app').then(async ({ App }) => {
      // Listen for back button press
      const listener = await App.addListener('backButton', () => {
        // Only show dialog if we're on the dashboard route
        if (location.pathname === '/dashboard') {
          setShowExitDialog(true);
        }
      });

      cleanup = () => {
        listener.remove();
      };
    }).catch((error) => {
      console.warn('Capacitor App plugin not available:', error);
    });

    return () => {
      // Cleanup listener on unmount
      cleanup?.();
    };
  }, [location.pathname]);

  const handleExitApp = async () => {
    try {
      const { App } = await import('@capacitor/app');
      App.exitApp();
    } catch (error) {
      console.error('Error exiting app:', error);
    }
  };

  const truncateTitle = (title: string, maxWords: number = 4) => {
    const words = title.split(' ');
    if (words.length <= maxWords) return title;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const getFirstSentence = (text: string) => {
    if (!text) return '';
    const sentences = text.split(/[.!?]+/);
    const firstSentence = sentences[0]?.trim();
    if (!firstSentence) return '';
    if (firstSentence.length > 60) {
      return firstSentence.substring(0, 60) + '...';
    }
    return firstSentence + '.';
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue-ocean":
        return "bg-gradient-blue-ocean";
      case "lime-forest":
        return "bg-gradient-lime-forest";
      case "green-emerald":
        return "bg-gradient-green-emerald";
      case "teal-navy":
        return "bg-gradient-teal-navy";
      case "purple-cosmic":
        return "bg-gradient-purple-cosmic";
      case "cyan-azure":
        return "bg-gradient-cyan-azure";
      case "lime-vibrant":
        return "bg-gradient-lime-vibrant";
      case "red-fire":
        return "bg-gradient-red-fire";
      case "orange-sunset":
        return "bg-gradient-orange-sunset";
      // Backwards compatibility
      case "blue-cyan":
        return "bg-gradient-blue-ocean";
      case "pink-purple":
        return "bg-gradient-purple-cosmic";
      case "blue-deep":
        return "bg-gradient-teal-navy";
      case "purple-deep":
        return "bg-gradient-purple-cosmic";
      case "cyan-blue":
        return "bg-gradient-cyan-azure";
      case "red-orange":
        return "bg-gradient-lime-forest";
      case "blue-purple":
        return "bg-gradient-purple-cosmic";
      case "orange-yellow":
        return "bg-gradient-lime-vibrant";
      case "green-mint":
        return "bg-gradient-green-emerald";
      default:
        return "bg-gradient-blue-ocean";
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  /**
   * Check if a string is a valid URL
   */
  const isValidUrl = (string: string): boolean => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  /**
   * Extract URL from clipboard text (handles cases where URL might be in a longer text)
   */
  const extractUrlFromText = (text: string): string | null => {
    if (!text) return null;
    
    // First, try if the entire text is a URL
    if (isValidUrl(text.trim())) {
      return text.trim();
    }
    
    // Try to find URL pattern in the text
    const urlPattern = /(https?:\/\/[^\s]+)/gi;
    const matches = text.match(urlPattern);
    if (matches && matches.length > 0) {
      // Return the first valid URL found
      for (const match of matches) {
        if (isValidUrl(match)) {
          return match;
        }
      }
    }
    
    return null;
  };

  /**
   * Clear clipboard content
   */
  const clearClipboard = async () => {
    try {
      // Try Capacitor Clipboard plugin first
      try {
        const { Clipboard } = await import('@capacitor/clipboard');
        await Clipboard.write({ string: '' });
        console.log('✅ Clipboard cleared via Capacitor plugin');
      } catch (capacitorError) {
        // Fallback to navigator.clipboard
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText('');
          console.log('✅ Clipboard cleared via navigator API');
        }
      }
    } catch (error) {
      console.error('⚠️ Failed to clear clipboard:', error);
      // Don't show error to user - clearing clipboard is not critical
    }
  };

  /**
   * Get pending share from storage
   * When user taps "Share" in an app, Android collects the content (text/image/link/file)
   * and stores it. This function reads what is about to be shared.
   */
  const getPendingShare = (): string | null => {
    try {
      const pendingShare = localStorage.getItem('pendingShare');
      if (pendingShare) {
        // Clear it after reading
        localStorage.removeItem('pendingShare');
        return pendingShare;
      }
      return null;
    } catch (error) {
      console.error('Error getting pending share:', error);
      return null;
    }
  };

  /**
   * Handle category click - navigate to AddVideoToCategory page if URL found,
   * otherwise navigate to category detail page
   */
  const handleCategoryClick2 = async (categoryId: string) => {
    // Check for pending share first (from Android share intent)
    const pendingShare = getPendingShare();
    
    let urlToPass = "";
    
    // Only check clipboard on native platforms (iOS/Android)
    if (Capacitor.isNativePlatform()) {
      try {
        let clipboardText: string | null = null;
    
        // Try to use Capacitor Clipboard plugin (works better on native platforms)
        try {
          const { Clipboard } = await import('@capacitor/clipboard');
          const result = await Clipboard.read();
          clipboardText = result.value || null;
          console.log('📋 Clipboard read via Capacitor plugin:', clipboardText ? `Yes (length: ${clipboardText.length})` : 'Empty');
        } catch (capacitorError) {
          // Fallback to navigator.clipboard if Capacitor plugin fails
          console.log('⚠️ Capacitor Clipboard plugin failed, trying navigator.clipboard...');
          if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
            clipboardText = await navigator.clipboard.readText();
            console.log('📋 Clipboard read via navigator API:', clipboardText ? `Yes (length: ${clipboardText.length})` : 'Empty');
          }
        }
 
        // Use pending share if available, otherwise use clipboard text
        const textToProcess = pendingShare || (clipboardText && clipboardText.trim() ? clipboardText : null);
        
        if (textToProcess) {
          // Try to extract URL from text (pending share or clipboard)
          const url = extractUrlFromText(textToProcess);
          console.log('🔗 Extracted URL:', url);
          
          if (url && isSupportedUrl(url)) {
            // URL found and is supported - pass it to AddVideoToCategory
            urlToPass = url;
          } else if (url) {
            // URL found but not supported - still pass it, AddVideoToCategory will handle it
            urlToPass = url;
          }
        }
      } catch (error) {
        // Clipboard access failed - silently continue
        console.error('❌ Clipboard access error:', error);
      }
    }
    
    // If URL found, route accordingly
    if (urlToPass) {
      const params = new URLSearchParams();
      params.set('url', urlToPass);
      
      // If URL starts with "data:image", route to AddSharedScreen
      if (urlToPass.startsWith('data:image')) {
        navigate(`/category/${categoryId}/add-shared-screen?${params.toString()}`);
              } else {
        // Regular URL - route to AddVideoToCategory
        navigate(`/category/${categoryId}/add-shared-video?${params.toString()}`);
              }
    } else {
      // If no URL found, navigate to category detail page
              navigate(`/category/${categoryId}`);
    }

    urlToPass = "";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pb-20 px-4 pt-6">
        {/* Welcome Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Welcome back{firstName ? ` ${firstName}` : ''}! 👋
          </h2>
          <p className="text-muted-foreground">
            Here's what's happening with your videos today.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Total Categories Card */}
          <Link to="/categories">
            <Card className="shadow-card hover:shadow-elevated transition-all duration-200 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary">
                    <FolderOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Categories</p>
                    {statsLoading || limitsLoading ? (
                      <div className="h-6 w-8 bg-muted animate-pulse rounded"></div>
                    ) : (
                      <div>
                        <p className="text-xl font-semibold text-foreground">
                          {stats.totalCategories}
                          {limits && limits.max_categories !== -1 && (
                            <span className="text-base text-muted-foreground">/{limits.max_categories}</span>
                          )}
                        </p>
                        {limits && limits.max_categories !== -1 && (
                          <p className="text-xs text-muted-foreground">
                            {Math.max(0, limits.max_categories - stats.totalCategories)} remaining
                          </p>
                        )}
                        {limits && limits.max_categories === -1 && (
                          <p className="text-xs text-muted-foreground">Unlimited</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Total Videos Card */}
          <Link to="/videos">
            <Card className="shadow-card hover:shadow-elevated transition-all duration-200 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary">
                    <Video className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Videos</p>
                    {statsLoading || limitsLoading ? (
                      <div className="h-6 w-8 bg-muted animate-pulse rounded"></div>
                    ) : (
                      <div>
                        <p className="text-xl font-semibold text-foreground">{stats.totalVideos}</p>
                        {limits && limits.max_videos_per_category !== -1 ? (
                          <p className="text-xs text-muted-foreground">
                            Max {limits.max_videos_per_category} per category
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Unlimited</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Screenshots Card */}
          <Link to="/screenshots">
            <Card className="shadow-card hover:shadow-elevated transition-all duration-200 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Screenshots</p>
                    {statsLoading ? (
                      <div className="h-6 w-8 bg-muted animate-pulse rounded"></div>
                    ) : (
                      <div>
                        <p className="text-xl font-semibold text-foreground">{stats.totalScreenshots}</p>
                        <p className="text-xs text-muted-foreground">&nbsp;</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Reminders Card */}
          <Link to="/reminders">
            <Card className="shadow-card hover:shadow-elevated transition-all duration-200 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted border border-border">
                    <Bell className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Reminders</p>
                    {remindersLoading ? (
                      <div className="h-6 w-8 bg-muted animate-pulse rounded"></div>
                    ) : (
                      <div>
                        <p className="text-xl font-semibold text-foreground">{upcomingReminders.length}</p>
                        <p className="text-xs text-muted-foreground">&nbsp;</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Plan Information Card */}
        {limits && !limitsLoading && (
          <Card className="mb-6 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Current Plan</p>
                  <p className="text-lg font-semibold text-primary">
                    {limits.plan_name.replace(' Plan', '').replace(' (Admin)', '')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-muted-foreground">
                      Categories: {stats.totalCategories}{limits.max_categories !== -1 ? `/${limits.max_categories}` : ' (Unlimited)'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Access Section */}
        <Card className="mb-6 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-primary" />
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoriesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 animate-pulse">
                    <div className="w-10 h-10 bg-muted rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                      <div className="h-3 bg-muted rounded w-1/3"></div>
                    </div>
                    <div className="h-3 bg-muted rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : recentCategories.length > 0 ? (
              recentCategories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => handleCategoryClick2(category.id)}
                  className="block cursor-pointer"
                >
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-card hover:shadow-card transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center",
                        getColorClasses(category.color)
                      )}>
                        <Play className="w-5 h-5 flex-shrink-0 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">
                          {category.name.length > 12 ? `${category.name.slice(0, 12)}...` : category.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{category.videoCount} items</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{category.lastAccessed}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Grid3x3 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No categories yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first category to organize videos
                </p>
              </div>
            )}
            
            <div className="flex flex-col md:flex-row gap-2 mt-4">
              <Link to="/categories/add" className="w-full md:flex-1">
                <Button className="w-full h-10 md:h-9 bg-gradient-primary hover:shadow-card transition-all duration-300 text-sm md:text-xs">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </Link>
              <Link to="/add-video" className="w-full md:flex-1">
                <Button className="w-full h-10 md:h-9 bg-gradient-primary hover:shadow-card transition-all duration-300 text-sm md:text-xs">
                  <Video className="w-4 h-4 mr-2" />
                  Add Video
                </Button>
              </Link>
              <Button 
                className="w-full md:flex-1 h-10 md:h-9 bg-gradient-primary hover:shadow-card transition-all duration-300 text-sm md:text-xs"
                onClick={() => {
                  // Check if there's a shared image in localStorage
                  const sharedImageBase64 = localStorage.getItem('sharedImageBase64');
                  if (sharedImageBase64 && sharedImageBase64.startsWith('data:image/')) {
                    navigate('/add-shared-screen');
                  } else {
                    navigate('/add-screenshot');
                  }
                }}
              >
                <Camera className="w-4 h-4 mr-2" />
                Add Screenshot
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Videos Section */}
        <Card className="mb-6 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Video className="w-5 h-5 text-primary" />
              Recent
            </CardTitle>
          </CardHeader>
          <CardContent>
            {videosLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 animate-pulse">
                    <div className="w-16 h-12 bg-muted rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : videos.length > 0 ? (
              <>
                {/* Mobile Carousel View */}
                <div className="md:hidden">
                  <Carousel className="w-full" setApi={setCarouselApi}>
                    <CarouselContent>
                      {videos.map((video) => {
                        // Use platform from database, or detect from tags/URL as fallback
                        let platform = video.platform || 'video'; // Use DB platform or default
                        
                        // Check if this is a screenshot collection
                        if (!video.platform && (video.url === 'https://placeholder.com' || video.title?.startsWith('Screenshots -'))) {
                          platform = 'screenshot';
                        } else if (!video.platform && video.tags && video.tags.length > 0) {
                          const platformTag = video.tags.find(tag => 
                            ['youtube', 'tiktok', 'instagram', 'snapchat', 'vimeo', 'twitter'].includes(tag.toLowerCase())
                          );
                          if (platformTag) platform = platformTag;
                        }
                        
                        // Fallback to URL detection if no platform found
                        if (platform === 'video' && video.url) {
                          const url = video.url.toLowerCase();
                          if (url.includes('youtube.com') || url.includes('youtu.be')) platform = 'youtube';
                          else if (url.includes('tiktok.com')) platform = 'tiktok';
                          else if (url.includes('instagram.com')) platform = 'instagram';
                          else if (url.includes('snapchat.com')) platform = 'snapchat';
                          else if (url.includes('vimeo.com')) platform = 'vimeo';
                          else if (url.includes('twitter.com') || url.includes('x.com')) platform = 'twitter';
                        }
                        
                        // Transform the video data to match VideoItem interface
                        const videoItemData = {
                          id: video.id,
                          title: video.title,
                          platform,
                          thumbnail: video.thumbnail_url || '',
                          duration: video.duration ? video.duration.toString() : undefined,
                          hasReminder: !!video.reminder_date,
                          reminderDate: video.reminder_date || undefined,
                          hasNotes: !!video.description,
                          addedDate: video.created_at,
                          url: video.url,
                          description: video.description || '',
                          tags: video.tags || [],
                          categoryId: video.category_id || undefined
                        };
                        
                        return (
                          <CarouselItem key={video.id}>
                            <DashboardVideoItem 
                              video={videoItemData} 
                              onVideoUpdated={refetch}
                            />
                          </CarouselItem>
                        );
                      })}
                    </CarouselContent>
                  </Carousel>
                  
                  {/* Carousel Dots */}
                  <div className="flex justify-center gap-2 mt-4">
                    {videos.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => carouselApi?.scrollTo(index)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all duration-200",
                          currentSlide === index 
                            ? "bg-primary w-6" 
                            : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                        )}
                        aria-label={`Go to slide ${index + 1}`}
                        style={{ minHeight: '0.5rem', minWidth: '0.5rem' }} // Force small size, override touch target rule
                      />
                    ))}
                  </div>
                </div>

                {/* Desktop List View */}
                <div className="hidden md:block space-y-3">
                  {videos.map((video) => {
                    // Use platform from database, or detect from tags/URL as fallback
                    let platform = video.platform || 'video'; // Use DB platform or default
                    
                    // Check if this is a screenshot collection
                    if (!video.platform && (video.url === 'https://placeholder.com' || video.title?.startsWith('Screenshots -'))) {
                      platform = 'screenshot';
                    } else if (!video.platform && video.tags && video.tags.length > 0) {
                      const platformTag = video.tags.find(tag => 
                        ['youtube', 'tiktok', 'instagram', 'snapchat', 'vimeo', 'twitter'].includes(tag.toLowerCase())
                      );
                      if (platformTag) platform = platformTag;
                    }
                    
                    // Fallback to URL detection if no platform found
                    if (platform === 'video' && video.url) {
                      const url = video.url.toLowerCase();
                      if (url.includes('youtube.com') || url.includes('youtu.be')) platform = 'youtube';
                      else if (url.includes('tiktok.com')) platform = 'tiktok';
                      else if (url.includes('instagram.com')) platform = 'instagram';
                      else if (url.includes('snapchat.com')) platform = 'snapchat';
                      else if (url.includes('vimeo.com')) platform = 'vimeo';
                      else if (url.includes('twitter.com') || url.includes('x.com')) platform = 'twitter';
                    }

                    // Transform the video data to match VideoItem interface
                    const videoItemData = {
                      id: video.id,
                      title: video.title,
                      platform,
                      thumbnail: video.thumbnail_url || '',
                      duration: video.duration ? video.duration.toString() : undefined,
                      hasReminder: !!video.reminder_date,
                      reminderDate: video.reminder_date || undefined,
                      hasNotes: !!video.description,
                      addedDate: video.created_at,
                      url: video.url,
                      description: video.description || '',
                      tags: video.tags || [],
                      categoryId: video.category_id || undefined
                    };
                    
                    return (
                      <DashboardVideoItem 
                        key={video.id} 
                        video={videoItemData} 
                        onVideoUpdated={refetch}
                      />
                    );
                  })}
                  
                  <Link to="/videos">
                    <Button className="w-full mt-4 bg-gradient-primary hover:shadow-elevated transition-all duration-300">
                      <Video className="w-4 h-4 mr-2" />
                      View All Videos
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Video className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No videos yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add your first video to get started
                </p>
                <Link to="/add-video">
                  <Button className="mt-4 bg-gradient-primary hover:shadow-elevated transition-all duration-300">
                    <Play className="w-4 h-4 mr-2" />
                    Add Video
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reminders Section */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5 text-primary" />
              Upcoming Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {remindersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 animate-pulse">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                    <div className="h-4 bg-muted rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : upcomingReminders.length > 0 ? (
              <div className="space-y-3">
                {upcomingReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/video/${reminder.id}`)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-muted border border-border flex-shrink-0">
                        <Bell className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">
                          {reminder.title.length > 15 ? `${reminder.title.slice(0, 15)}...` : reminder.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{reminder.category}</p>
                        {reminder.description && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {getFirstSentence(reminder.description)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sm font-medium text-primary">{reminder.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No upcoming reminders</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add reminders to your saved videos to see them here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit App</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to exit the app?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitDialog(false)}>
              No
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExitApp}
              className="bg-destructive hover:bg-destructive/90"
            >
              Yes, Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;