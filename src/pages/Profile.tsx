import { useState, useEffect, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User, Mail, Calendar, Video, FolderOpen, LogOut, Edit, Save, X, Crown, Bell, BellOff, CreditCard, Trash2, MessageCircle, Camera } from "lucide-react";
import { Header } from "@/components/Header";

import { AvatarUpload } from "@/components/AvatarUpload";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";
import { PromoCodeRedemption } from "@/components/PromoCodeRedemption";
import { DeleteAccountDialog } from "@/components/DeleteAccountDialog";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";

interface ProfileData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  mobile: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  created_at: string;
  totalVideos: number;
  totalCategories: number;
  totalScreenshots: number;
  subscriptionStatus?: string;
  subscriptionEndDate?: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { layoutType } = useDeviceDetection();
  const { limits, loading: subscriptionLoading, refetch } = useSubscriptionLimits();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<{status?: string, endDate?: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [editData, setEditData] = useState({
    first_name: "",
    last_name: "",
    mobile: "",
    birth_date: "",
  });
  const avatarUploadRef = useRef<{ triggerUpload: () => void } | null>(null);

  useEffect(() => {
    if (layoutType === 'web') {
      navigate('/account-web', { replace: true });
    }
  }, [layoutType, navigate]);

  const fetchProfileData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        navigate('/auth/login');
        return;
      }

      // Get profile data from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Get total videos count (excluding screenshot container videos)
      const { count: videosCount } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .neq('platform', 'screenshot');

      // Get total categories count
      const { count: categoriesCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true });

      // Get total screenshots count
      const { count: screenshotsCount } = await supabase
        .from('screenshots')
        .select('*', { count: 'exact', head: true });

      // Get subscription status
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('status, end_date')
        .eq('user_id', user.id)
        .in('status', ['active', 'canceling'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const profileData: ProfileData = {
        id: user.id,
        email: profile?.email || user.email || '',
        first_name: profile?.first_name || null,
        last_name: profile?.last_name || null,
        mobile: profile?.mobile || null,
        birth_date: profile?.birth_date || null,
        avatar_url: profile?.avatar_url || null,
        created_at: user.created_at,
        totalVideos: videosCount || 0,
        totalCategories: categoriesCount || 0,
        totalScreenshots: screenshotsCount || 0,
      };

      setSubscriptionData(subscription ? {
        status: subscription.status,
        endDate: subscription.end_date
      } : null);

      setProfileData(profileData);
      setEditData({
        first_name: profileData.first_name || "",
        last_name: profileData.last_name || "",
        mobile: profileData.mobile || "",
        birth_date: profileData.birth_date || "",
      });

    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  };

  const handleNotificationToggle = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Not Supported",
        description: "Notifications are not supported in this browser",
        variant: "destructive",
      });
      return;
    }

    if (Notification.permission === 'granted') {
      // Can't actually disable notifications, but we can show the status
      toast({
        title: "Notifications Enabled",
        description: "Notifications are currently enabled. You can disable them in your browser settings.",
      });
    } else if (Notification.permission === 'denied') {
      toast({
        title: "Notifications Blocked",
        description: "Notifications are blocked. Please enable them in your browser settings.",
        variant: "destructive",
      });
    } else {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive important updates and reminders",
        });
      } else {
        toast({
          title: "Notifications Disabled",
          description: "You can enable notifications later in your browser settings",
        });
      }
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open subscription management",
        variant: "destructive",
      });
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription');
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Subscription Cancellation Scheduled",
          description: data.message || "Your subscription will be canceled at the end of your current billing period.",
        });
        
        // Refresh subscription limits and profile data
        refetch();
        fetchProfileData();
      } else {
        throw new Error(data?.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel subscription",
        variant: "destructive",
      });
    }
  };

  const getPlanBadgeColor = (planName: string) => {
    switch (planName) {
      case 'Gold Plan':
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black';
      case 'Premium Plan':
        return 'bg-gradient-to-r from-purple-500 to-purple-700 text-white';
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white';
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out",
      });
      
      navigate('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editData.first_name || null,
          last_name: editData.last_name || null,
          mobile: editData.mobile || null,
          birth_date: editData.birth_date || null,
        })
        .eq('id', profileData!.id);

      if (error) throw error;

      // Update local state
      setProfileData(prev => prev ? {
        ...prev,
        first_name: editData.first_name || null,
        last_name: editData.last_name || null,
        mobile: editData.mobile || null,
        birth_date: editData.birth_date || null,
      } : null);
      
      setIsEditing(false);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      first_name: profileData?.first_name || "",
      last_name: profileData?.last_name || "",
      mobile: profileData?.mobile || "",
      birth_date: profileData?.birth_date || "",
    });
    setIsEditing(false);
  };

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, '');
    const limitedPhoneNumber = phoneNumber.substring(0, 10);
    
    if (limitedPhoneNumber.length <= 3) {
      return limitedPhoneNumber;
    } else if (limitedPhoneNumber.length <= 6) {
      return `(${limitedPhoneNumber.slice(0, 3)}) ${limitedPhoneNumber.slice(3)}`;
    } else {
      return `(${limitedPhoneNumber.slice(0, 3)}) ${limitedPhoneNumber.slice(3, 6)}-${limitedPhoneNumber.slice(6)}`;
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setEditData(prev => ({ ...prev, mobile: formatted }));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Profile" showBack={true} />
        <main className="p-4 pb-20">
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Profile" showBack={true} />
        <main className="p-4 pb-20">
          <div className="text-center py-16">
            <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Unable to Load Profile
            </h3>
            <p className="text-muted-foreground mb-6">
              There was an error loading your profile data
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Profile" showBack={true} />
      
      <main className="p-4 pb-20">
        <div className="space-y-6">
          {/* Profile Header */}
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <AvatarUpload
                    currentAvatarUrl={profileData.avatar_url}
                    onAvatarChange={async (url) => {
                      // Update avatar in profiles table
                      const { error } = await supabase
                        .from('profiles')
                        .update({ avatar_url: url })
                        .eq('id', profileData.id);
                      
                      if (!error) {
                        setProfileData(prev => prev ? { ...prev, avatar_url: url } : null);
                        toast({
                          title: "Profile Updated",
                          description: "Your profile photo has been updated",
                        });
                      } else {
                        toast({
                          title: "Error", 
                          description: "Failed to update profile photo",
                          variant: "destructive",
                        });
                      }
                    }}
                    size="lg"
                    showUploadButton={false}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                      input?.click();
                    }}
                    className="text-xs px-2 py-1 h-6 text-muted-foreground"
                  >
                    Upload
                  </Button>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground">
                      {profileData.first_name && profileData.last_name 
                        ? `${profileData.first_name} ${profileData.last_name}`
                        : profileData.first_name || profileData.last_name || "User"}
                    </h2>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditing(true)}
                      className="p-1 h-6 w-6"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
                    <Mail className="w-4 h-4" />
                    {profileData.email}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4 pt-4 border-t border-border">
                <Calendar className="w-4 h-4" />
                <span>Member since {formatDate(profileData.created_at)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Edit Profile Form */}
          {isEditing && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Edit Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="first_name"
                      value={editData.first_name}
                      onChange={(e) => setEditData(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="last_name"
                      value={editData.last_name}
                      onChange={(e) => setEditData(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    value={editData.mobile}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(123) 456-7890"
                    maxLength={14}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date">Birth Date</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={editData.birth_date}
                    onChange={(e) => setEditData(prev => ({ ...prev, birth_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={profileData.email}
                    disabled
                    className="bg-muted text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveProfile} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit} className="flex-1">
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Your Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-gradient-card rounded-lg">
                  <Video className="w-6 h-6 mx-auto text-primary mb-1" />
                  <p className="text-xl font-semibold text-foreground">
                    {profileData.totalVideos}
                  </p>
                  <p className="text-xs text-muted-foreground">Videos</p>
                </div>
                <div className="text-center p-3 bg-gradient-card rounded-lg">
                  <FolderOpen className="w-6 h-6 mx-auto text-primary mb-1" />
                  <p className="text-xl font-semibold text-foreground">
                    {profileData.totalCategories}
                  </p>
                  <p className="text-xs text-muted-foreground">Categories</p>
                </div>
                <div className="text-center p-3 bg-gradient-card rounded-lg">
                  <Camera className="w-6 h-6 mx-auto text-primary mb-1" />
                  <p className="text-xl font-semibold text-foreground">
                    {profileData.totalScreenshots}
                  </p>
                  <p className="text-xs text-muted-foreground">Screenshots</p>
                </div>
              </div>
              
              {/* Subscription Limits Info */}
              {limits && (
                <div className="mt-4 p-4 bg-gradient-card rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">Category Limits - {limits.plan_name}</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Maximum categories allowed:</span>
                      <span className="text-foreground font-medium">
                        {limits.max_categories === -1 ? 'Unlimited' : limits.max_categories}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Categories created:</span>
                      <span className="text-foreground font-medium">{limits.current_categories}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Categories remaining:</span>
                      <span className="text-foreground font-medium">
                        {limits.max_categories === -1 
                          ? 'Unlimited' 
                          : Math.max(0, limits.max_categories - limits.current_categories)
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Promo Code Redemption */}
          <PromoCodeRedemption 
            onSuccess={() => {
              // Refresh subscription limits after successful promo code redemption
              refetch();
              fetchProfileData();
            }} 
          />

          {/* Subscription Management */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Subscription Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscriptionLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              ) : limits ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground">{limits.plan_name}</h3>
                          <Badge className={getPlanBadgeColor(limits.plan_name)}>
                            {limits.plan_name === 'Free Plan' ? 'Free' : limits.plan_name.split(' ')[0]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Your current subscription plan
                        </p>
                      </div>
                    </div>

                    {/* Show cancellation notice if subscription is being canceled */}
                    {subscriptionData?.status === 'canceling' && subscriptionData.endDate && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <div className="text-orange-600">⚠️</div>
                          <div>
                            <p className="text-sm font-medium text-orange-800">
                              Subscription Cancellation Scheduled
                            </p>
                            <p className="text-xs text-orange-600 mt-1">
                              Your subscription will end on {new Date(subscriptionData.endDate).toLocaleDateString()}. 
                              You'll continue to have access to all features until then.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  <div className="space-y-2 p-3 bg-gradient-card rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Categories</span>
                      <span className="text-foreground">
                        {limits.max_categories === -1 ? 'Unlimited' : `${limits.current_categories}/${limits.max_categories}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Videos per Category</span>
                      <span className="text-foreground">
                        {limits.max_videos_per_category === -1 ? 'Unlimited' : `Up to ${limits.max_videos_per_category}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Screenshots</span>
                      <span className="text-foreground">
                        {limits.max_screenshots_per_user === -1 ? 'Unlimited' : `Up to ${limits.max_screenshots_per_user}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Storage Quota</span>
                      <span className="text-foreground">
                        {limits.storage_quota_mb === null 
                          ? 'Unlimited' 
                          : limits.storage_quota_mb >= 1024 
                            ? `${(limits.storage_quota_mb / 1024).toFixed(0)} GB`
                            : `${limits.storage_quota_mb} MB`
                        }
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {limits.plan_name !== 'Gold Plan' && (
                      <Button 
                        onClick={() => navigate('/upgrade')}
                        className="w-full"
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Upgrade Plan
                      </Button>
                    )}
                    

                    {limits.plan_name !== 'Free Plan' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="w-full">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Cancel Subscription
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Your subscription will be canceled at the end of your current billing period. You'll continue 
                              to have access to all premium features until then, and won't be charged for the next cycle.
                              <br /><br />
                              Your data will remain safe and you can reactivate your subscription at any time.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Go back</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Cancel subscription
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">Unable to load subscription details</p>
                  <Button onClick={refetch} variant="outline">
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Account Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Delete Account - Only show for Free Plan users */}
              {limits?.plan_name === 'Free Plan' && (
                <>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <DeleteAccountDialog userEmail={profileData.email} />
                  </div>
                  <Separator />
                </>
              )}
              
              <Button
                variant="outline"
                onClick={() => navigate('/help-feedback')}
                className="w-full"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Help & Feedback
              </Button>
              
              <Button
                variant="destructive"
                onClick={handleSignOut}
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      
      
      <UpgradePromptModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        currentPlan={limits?.plan_name || 'Free Plan'}
        feature="subscription management"
        limitType="categories"
      />
    </div>
  );
};

export default Profile;