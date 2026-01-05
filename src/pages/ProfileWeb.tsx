import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User, Mail, Calendar, Video, FolderOpen, LogOut, Edit, Save, X, Crown, Bell, BellOff, CreditCard, Trash2, MessageCircle, Camera } from "lucide-react";
import { Header } from "@/components/Header";
import { AvatarUpload } from "@/components/AvatarUpload";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";
import { PromoCodeRedemption } from "@/components/PromoCodeRedemption";
import { DeleteAccountDialog } from "@/components/DeleteAccountDialog";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { useTotalStats } from "@/hooks/useTotalStats";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LayoutToggle } from "@/components/LayoutToggle";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";

const ProfileWeb = () => {
  const navigate = useNavigate();
  const { layoutType } = useDeviceDetection();
  const { limits, loading: limitsLoading } = useSubscriptionLimits();
  const { stats, loading: statsLoading } = useTotalStats();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [profileData, setProfileData] = useState({
    id: "",
    email: "",
    firstName: "",
    lastName: "",
    mobile: "",
    birthDate: "",
    joinedDate: "",
    avatarUrl: "",
  });

  const [subscriptionData, setSubscriptionData] = useState<{status?: string, endDate?: string} | null>(null);

  const [editedData, setEditedData] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    birthDate: "",
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (layoutType === 'mobile') {
      navigate('/account', { replace: true });
      return;
    }
    fetchProfile();
    checkNotificationPermission();
  }, [layoutType, navigate]);

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
        return;
      }

      // Get subscription status
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('status, end_date')
        .eq('user_id', user.id)
        .in('status', ['active', 'canceling'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSubscriptionData(subscription ? {
        status: subscription.status,
        endDate: subscription.end_date
      } : null);

      setProfileData({
        id: user.id,
        email: user.email || "",
        firstName: profile?.first_name || "",
        lastName: profile?.last_name || "",
        mobile: profile?.mobile || "",
        birthDate: profile?.birth_date || "",
        joinedDate: new Date(user.created_at).toLocaleDateString(),
        avatarUrl: profile?.avatar_url || "",
      });

      setEditedData({
        firstName: profile?.first_name || "",
        lastName: profile?.last_name || "",
        mobile: profile?.mobile || "",
        birthDate: profile?.birth_date || "",
      });
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editedData.firstName,
          last_name: editedData.lastName,
          mobile: editedData.mobile || null,
          birth_date: editedData.birthDate || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfileData(prev => ({
        ...prev,
        firstName: editedData.firstName,
        lastName: editedData.lastName,
        mobile: editedData.mobile,
        birthDate: editedData.birthDate,
      }));

      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
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
    setEditedData(prev => ({ ...prev, mobile: formatted }));
  };

  const handleCancelEdit = () => {
    setEditedData({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      mobile: profileData.mobile,
      birthDate: profileData.birthDate,
    });
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth/login');
  };

  const handleManageSubscription = async () => {
    if (!limits || limits.plan_name === 'Free Plan') {
      setUpgradeModalOpen(true);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error('Please log in to manage your subscription');
        return;
      }

      const response = await supabase.functions.invoke('customer-portal', {
        body: { email: user.email }
      });

      if (response.error) throw response.error;
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Error accessing customer portal:', error);
      toast.error('Failed to open customer portal');
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription');
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(data.message || "Your subscription will be canceled at the end of your current billing period.");
        
        // Refresh profile data to show updated subscription status
        fetchProfile();
      } else {
        throw new Error(data?.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error(error instanceof Error ? error.message : "Failed to cancel subscription");
    }
  };

  const handleNotificationToggle = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications are not supported in this browser');
      return;
    }

    if (Notification.permission === 'granted') {
      toast.info('Notifications are currently enabled. You can disable them in your browser settings.');
    } else if (Notification.permission === 'denied') {
      toast.error('Notifications are blocked. Please enable them in your browser settings.');
    } else {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        toast.success("You'll now receive important updates and reminders");
      } else {
        toast.info('You can enable notifications later in your browser settings');
      }
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

  if (loading || limitsLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header>
          <LayoutToggle />
        </Header>
        <main className="container mx-auto px-6 py-8 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="shadow-card">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header>
        <LayoutToggle />
      </Header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Account Settings</h1>
            <p className="text-lg text-muted-foreground">
              Manage your profile and preferences
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Profile Information
                </CardTitle>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveProfile} className="bg-gradient-primary">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <AvatarUpload 
                  currentAvatarUrl={profileData.avatarUrl}
                  onAvatarChange={async (url) => {
                    const { error } = await supabase
                      .from('profiles')
                      .update({ avatar_url: url })
                      .eq('id', profileData.id);
                    
                    if (!error) {
                      setProfileData(prev => ({ ...prev, avatarUrl: url }));
                      toast.success('Profile photo updated');
                    } else {
                      toast.error('Failed to update profile photo');
                    }
                  }}
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-foreground">
                    {profileData.firstName} {profileData.lastName}
                  </h3>
                  <p className="text-muted-foreground">{profileData.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                  {isEditing ? (
                    <Input
                      id="firstName"
                      value={editedData.firstName}
                      onChange={(e) => setEditedData({ ...editedData, firstName: e.target.value })}
                      placeholder="Enter first name"
                    />
                  ) : (
                    <p className="text-foreground py-2">{profileData.firstName || "Not set"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                  {isEditing ? (
                    <Input
                      id="lastName"
                      value={editedData.lastName}
                      onChange={(e) => setEditedData({ ...editedData, lastName: e.target.value })}
                      placeholder="Enter last name"
                    />
                  ) : (
                    <p className="text-foreground py-2">{profileData.lastName || "Not set"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  {isEditing ? (
                    <Input
                      id="mobile"
                      type="tel"
                      value={editedData.mobile}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="(123) 456-7890"
                      maxLength={14}
                    />
                  ) : (
                    <p className="text-foreground py-2">{profileData.mobile || "Not set"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate">Birth Date</Label>
                  {isEditing ? (
                    <Input
                      id="birthDate"
                      type="date"
                      value={editedData.birthDate}
                      onChange={(e) => setEditedData({ ...editedData, birthDate: e.target.value })}
                    />
                  ) : (
                    <p className="text-foreground py-2">
                      {profileData.birthDate ? new Date(profileData.birthDate).toLocaleDateString() : "Not set"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <p className="text-muted-foreground py-2">{profileData.email}</p>
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label>Member Since</Label>
                  <p className="text-muted-foreground py-2">{profileData.joinedDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Stats */}
          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-gradient-card rounded-lg">
                    <Video className="w-6 h-6 mx-auto text-primary mb-1" />
                    <p className="text-xl font-semibold text-foreground">{stats.totalVideos}</p>
                    <p className="text-xs text-muted-foreground">Videos</p>
                  </div>

                  <div className="text-center p-3 bg-gradient-card rounded-lg">
                    <FolderOpen className="w-6 h-6 mx-auto text-primary mb-1" />
                    <p className="text-xl font-semibold text-foreground">
                      {stats.totalCategories}
                      {limits && limits.max_categories !== -1 && (
                        <span className="text-sm text-muted-foreground">/{limits.max_categories}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">Categories</p>
                  </div>

                  <div className="text-center p-3 bg-gradient-card rounded-lg">
                    <Camera className="w-6 h-6 mx-auto text-primary mb-1" />
                    <p className="text-xl font-semibold text-foreground">{stats.totalScreenshots}</p>
                    <p className="text-xs text-muted-foreground">Screenshots</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Card */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Crown className="w-5 h-5 text-primary" />
                  Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                  {limits && (
                    <Badge className={getPlanBadgeColor(limits.plan_name)}>
                      {limits.plan_name === 'Free Plan' ? 'Free' : limits.plan_name.split(' ')[0]}
                    </Badge>
                  )}
                </div>
                <p className="text-xl font-semibold text-primary">{limits?.plan_name || 'Free Plan'}</p>

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

                {limits && (
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
                )}

                <div className="space-y-2">
                  {limits?.plan_name !== 'Gold Plan' && (
                    <Button 
                      className="w-full bg-gradient-primary hover:shadow-elevated"
                      onClick={() => setUpgradeModalOpen(true)}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  )}

                  {limits?.plan_name !== 'Free Plan' && (
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

                <PromoCodeRedemption onSuccess={fetchProfile} />
              </CardContent>
            </Card>
          </div>

          {/* Notifications */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Make sure you stay up-to-date with all the important news and reminders
                  </p>
                </div>
                <Button
                  variant={notificationsEnabled ? "default" : "outline"}
                  onClick={handleNotificationToggle}
                  className="shrink-0"
                >
                  {notificationsEnabled ? (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Enabled
                    </>
                  ) : (
                    <>
                      <BellOff className="w-4 h-4 mr-2" />
                      Enable
                    </>
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                You can always turn notifications off later in your browser settings.
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Account Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/help-feedback')}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Help & Feedback
              </Button>

              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>

              {/* Delete Account - Only show for Free Plan users */}
              {limits?.plan_name === 'Free Plan' && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <DeleteAccountDialog userEmail={profileData.email} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <UpgradePromptModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        currentPlan={limits?.plan_name || 'Free Plan'}
        feature="upgrade your plan"
        limitType="plan_upgrade"
      />
    </div>
  );
};

export default ProfileWeb;
