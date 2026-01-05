import { Link, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Play, Grid3x3, Bell, Video, FolderOpen, Plus, Camera } from "lucide-react";
import { Header } from "@/components/Header";
import { useRecentVideos } from "@/hooks/useRecentVideos";
import { useRecentCategories } from "@/hooks/useRecentCategories";
import { useUpcomingReminders } from "@/hooks/useUpcomingReminders";
import { useTotalStats } from "@/hooks/useTotalStats";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { DashboardVideoItem } from "@/components/DashboardVideoItem";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { LayoutToggle } from "@/components/LayoutToggle";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";
import { useToast } from "@/hooks/use-toast";

const DashboardWeb = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { layoutType } = useDeviceDetection();
  const { videos, loading: videosLoading, refetch } = useRecentVideos(5);
  const { categories: recentCategories, loading: categoriesLoading } = useRecentCategories(6);
  const { reminders: upcomingReminders, loading: remindersLoading } = useUpcomingReminders(5);
  const { stats, loading: statsLoading } = useTotalStats();
  const { limits, loading: limitsLoading } = useSubscriptionLimits();
  const [firstName, setFirstName] = useState<string>('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

  useEffect(() => {
    if (layoutType === 'mobile') {
      navigate('/dashboard', { replace: true });
    }
  }, [layoutType, navigate]);

  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue-ocean": return "bg-gradient-blue-ocean";
      case "lime-forest": return "bg-gradient-lime-forest";
      case "green-emerald": return "bg-gradient-green-emerald";
      case "teal-navy": return "bg-gradient-teal-navy";
      case "purple-cosmic": return "bg-gradient-purple-cosmic";
      case "cyan-azure": return "bg-gradient-cyan-azure";
      case "lime-vibrant": return "bg-gradient-lime-vibrant";
      case "red-fire": return "bg-gradient-red-fire";
      case "orange-sunset": return "bg-gradient-orange-sunset";
      default: return "bg-gradient-blue-ocean";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header>
        <LayoutToggle />
      </Header>
      
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Welcome back{firstName ? ` ${firstName}` : ''}! 👋
            </h1>
            <p className="text-lg text-muted-foreground">
              Here's what's happening with your videos today.
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:shadow-elevated w-48"
              onClick={() => navigate('/categories/add')}
            >
              <FolderOpen className="w-5 h-5 mr-2" />
              Add Category
            </Button>
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:shadow-elevated w-48"
              onClick={() => navigate('/add-video')}
            >
              <Video className="w-5 h-5 mr-2" />
              Add Video
            </Button>
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:shadow-elevated w-48"
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
              <Camera className="w-5 h-5 mr-2" />
              Add Screenshot
            </Button>
          </div>
        </div>

        {/* Statistics Grid - 5 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="shadow-card hover:shadow-elevated transition-all cursor-pointer" onClick={() => navigate('/categories-web')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary">
                  <FolderOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  {statsLoading || limitsLoading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                  ) : (
                    <p className="text-2xl font-bold text-foreground">
                      {stats.totalCategories}
                      {limits && limits.max_categories !== -1 && (
                        <span className="text-base text-muted-foreground">/{limits.max_categories}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elevated transition-all cursor-pointer" onClick={() => navigate('/videos-web')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Videos</p>
                  {statsLoading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{stats.totalVideos}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elevated transition-all cursor-pointer" onClick={() => navigate('/screenshots-web')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Screenshots</p>
                  {statsLoading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{stats.totalScreenshots}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elevated transition-all cursor-pointer" onClick={() => navigate('/reminders-web')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <Bell className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reminders</p>
                  {remindersLoading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{upcomingReminders.length}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="shadow-card hover:shadow-elevated transition-all cursor-pointer"
            onClick={() => {
              const planName = limits?.plan_name || 'Free';
              if (planName.toLowerCase().includes('free')) {
                setShowUpgradeModal(true);
              }
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  {limitsLoading ? (
                    <div className="h-8 w-20 bg-muted animate-pulse rounded"></div>
                  ) : (
                    <p className="text-2xl font-bold text-foreground">
                      {(limits?.plan_name || 'Free').replace(' Plan', '').replace(' (Admin)', '')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - 3 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Categories - spans 1 column */}
          <Card className="shadow-card lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid3x3 className="w-5 h-5 text-primary" />
                Quick Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>
                  ))}
                </div>
              ) : recentCategories.length > 0 ? (
                <div className="space-y-3">
                  {recentCategories.slice(0, 6).map((category) => (
                    <Link key={category.id} to={`/category-web/${category.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-card hover:shadow-card transition-all">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          getColorClasses(category.color)
                        )}>
                          <Play className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate">{category.name}</h3>
                          <p className="text-sm text-muted-foreground">{category.videoCount} items</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  <Link to="/categories-web">
                    <Button variant="outline" className="w-full mt-2">
                      View All Categories
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Grid3x3 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No categories yet</p>
                  <Link to="/categories/add">
                    <Button className="mt-4 bg-gradient-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Category
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Videos - spans 2 columns */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                Recent
              </CardTitle>
            </CardHeader>
            <CardContent>
              {videosLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-lg"></div>
                  ))}
                </div>
              ) : videos.length > 0 ? (
                <div className="space-y-3">
                  {videos.map((video) => {
                    let platform = 'video';
                    
                    // Check if this is a screenshot collection
                    if (video.url === 'https://placeholder.com' || video.title?.startsWith('Screenshots -')) {
                      platform = 'screenshot';
                    } else if (video.tags && video.tags.length > 0) {
                      const platformTag = video.tags.find(tag => 
                        ['youtube', 'tiktok', 'instagram', 'snapchat', 'vimeo', 'twitter'].includes(tag.toLowerCase())
                      );
                      if (platformTag) platform = platformTag;
                    }
                    
                    if (platform === 'video' && video.url) {
                      const url = video.url.toLowerCase();
                      if (url.includes('youtube.com') || url.includes('youtu.be')) platform = 'youtube';
                      else if (url.includes('tiktok.com')) platform = 'tiktok';
                      else if (url.includes('instagram.com')) platform = 'instagram';
                      else if (url.includes('snapchat.com')) platform = 'snapchat';
                      else if (url.includes('vimeo.com')) platform = 'vimeo';
                      else if (url.includes('twitter.com') || url.includes('x.com')) platform = 'twitter';
                    }

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
                  <Link to="/videos-web">
                    <Button variant="outline" className="w-full mt-4">
                      View All Videos
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Video className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No videos yet</p>
                  <Button 
                    className="mt-4 bg-gradient-primary"
                    onClick={() => navigate('/add-video')}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Add Video
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <UpgradePromptModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentPlan={limits?.plan_name || 'Free Plan'}
        feature="unlimited categories and videos"
        limitType="plan_upgrade"
      />
    </div>
  );
};

export default DashboardWeb;
