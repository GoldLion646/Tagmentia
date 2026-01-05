import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Play, 
  Bell, 
  BookOpen, 
  ExternalLink, 
  Calendar,
  Clock,
  FolderOpen,
  Tag,
  Loader2,
  Edit,
  Trash2,
  Share,
  ArrowLeft,
  Brain
} from "lucide-react";
import { Header } from "@/components/Header";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";
import { scheduleReminderNotification, cancelReminderNotification } from "@/utils/reminderNotifications";
import { DateTimePicker } from "@/components/DateTimePicker";



interface Video {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnail_url?: string;
  duration?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  reminder_date?: string;
  category_id?: string;
}

interface Screenshot {
  id: string;
  original_url: string;
  image_1600_url?: string;
  thumb_320_url?: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

const VideoDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { limits, isGoldPlan } = useSubscriptionLimits();
  const [video, setVideo] = useState<Video | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [screenshot, setScreenshot] = useState<Screenshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditNote, setShowEditNote] = useState(false);
  const [showEditReminder, setShowEditReminder] = useState(false);
  const [showDeleteReminder, setShowDeleteReminder] = useState(false);
  const [showDeleteVideo, setShowDeleteVideo] = useState(false);
  const [showEditTitle, setShowEditTitle] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [titleContent, setTitleContent] = useState("")

  useEffect(() => {
    if (id) {
      fetchVideoDetails();
    }
  }, [id]);


  const fetchVideoDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch video details including transcript
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single();

      console.log('Video data fetched:', videoData);
      console.log('User plan info:', { limits, isGoldPlan });
      console.log('Video transcript available:', !!videoData?.transcript, 'Length:', videoData?.transcript?.length);

      if (videoError) {
        console.error('Error fetching video:', videoError);
        setError('Video not found');
        return;
      }

      setVideo(videoData);

      // Check if this is a screenshot and fetch screenshot data
      const isScreenshotItem = videoData.url?.includes('placeholder.com');
      if (isScreenshotItem) {
        const { data: screenshotData, error: screenshotError } = await supabase
          .from('screenshots')
          .select('id, original_url, image_1600_url, thumb_320_url')
          .eq('video_id', videoData.id)
          .single();

        if (!screenshotError && screenshotData) {
          setScreenshot(screenshotData);
        }
      }

      // Fetch category if video has one
      if (videoData.category_id) {
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('*')
          .eq('id', videoData.category_id)
          .single();

        if (!categoryError) {
          setCategory(categoryData);
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setError('Failed to load video details');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatReminderDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    // Format date and time in 24-hour format
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    // Format time in 24-hour format (HH:mm)
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    return `${dateStr} at ${timeStr}`;
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
      default:
        return "bg-gradient-blue-ocean";
    }
  };

  const isYouTubeVideo = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const handleWatchVideo = () => {
    // If it's a screenshot, open the screenshot image instead of the placeholder URL
    if (isScreenshot && screenshot) {
      const imageUrl = screenshot.image_1600_url || screenshot.original_url;
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
    } else if (video?.url) {
      window.open(video.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleEditNote = () => {
    setNoteContent(video?.description || "");
    setShowEditNote(true);
  };

  const handleEditTitle = () => {
    setTitleContent(video?.title || "");
    setShowEditTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!video || !titleContent.trim()) return;

    try {
      const { error } = await supabase
        .from('videos')
        .update({ 
          title: titleContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', video.id);

      if (error) {
        console.error('Error updating title:', error);
        toast({
          title: "Error",
          description: "Failed to update title. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setVideo({ ...video, title: titleContent.trim() });
      setShowEditTitle(false);
      
      toast({
        title: "Success",
        description: "Title updated successfully.",
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleSaveNote = async () => {
    if (!video) return;

    try {
      const { error } = await supabase
        .from('videos')
        .update({ 
          description: noteContent || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', video.id);

      if (error) {
        console.error('Error updating note:', error);
        toast({
          title: "Error",
          description: "Failed to update note. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setVideo({ ...video, description: noteContent || undefined });
      setShowEditNote(false);
      
      toast({
        title: "Success",
        description: "Note updated successfully.",
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleEditReminder = () => {
    if (video?.reminder_date) {
      // Format the date for the datetime-local input
      // datetime-local expects local time, not UTC
      const date = new Date(video.reminder_date);
      // Get local time components
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
      setReminderDate(formattedDate);
    } else {
      // Default to tomorrow at current time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      const hours = String(tomorrow.getHours()).padStart(2, '0');
      const minutes = String(tomorrow.getMinutes()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
      setReminderDate(formattedDate);
    }
    setShowEditReminder(true);
  };

  const handleSaveReminder = async () => {
    if (!video || !reminderDate) return;

    try {
      // datetime-local input provides local time string (YYYY-MM-DDTHH:mm)
      // new Date() interprets it as local time, toISOString() converts to UTC
      const reminderDateTime = new Date(reminderDate).toISOString();
      
      const { error } = await supabase
        .from('videos')
        .update({ 
          reminder_date: reminderDateTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', video.id);

      if (error) {
        console.error('Error updating reminder:', error);
        toast({
          title: "Error",
          description: "Failed to update reminder. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Schedule local notification for reminder
      await scheduleReminderNotification(
        video.id,
        video.title,
        reminderDateTime,
        category?.name
      );

      setVideo({ ...video, reminder_date: reminderDateTime });
      setShowEditReminder(false);
      
      toast({
        title: "Success",
        description: "Reminder updated successfully.",
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReminder = async () => {
    if (!video) return;

    try {
      // Cancel scheduled notification first
      await cancelReminderNotification(video.id);

      const { error } = await supabase
        .from('videos')
        .update({ 
          reminder_date: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', video.id);

      if (error) {
        console.error('Error deleting reminder:', error);
        toast({
          title: "Error",
          description: "Failed to delete reminder. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setVideo({ ...video, reminder_date: undefined });
      setShowDeleteReminder(false);
      
      toast({
        title: "Success",
        description: "Reminder deleted successfully.",
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleShareVideo = async () => {
    if (!video) return;

    const shareUrl = video.url;

    const shareData = {
      title: video.title,
      text: `Check out this video: ${video.title}`,
      url: shareUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard
        const shareText = `${video.title}\n${shareUrl}`;
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to clipboard",
          description: "Video link has been copied to your clipboard",
        });
      }
    } catch (error) {
      // Fallback if clipboard API fails
      toast({
        title: "Share",
        description: `${video.title}\n${shareUrl}`,
      });
    }
  };

  const handleDeleteVideo = async () => {
    if (!video) return;

    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', video.id);

      if (error) {
        console.error('Error deleting video:', error);
        toast({
          title: "Error",
          description: "Failed to delete video. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Video deleted successfully.",
      });

      // Navigate back intelligently
      if (video?.category_id) {
        navigate(`/category/${video.category_id}`, { replace: true });
      } else {
        navigate('/videos', { replace: true });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const isScreenshot = video?.url?.includes('placeholder.com') || false;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title={isScreenshot ? "Screenshot details" : "Video Details"} showBack={true} />
        <main className="px-4 pt-6">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-background">
        <Header title={isScreenshot ? "Screenshot details" : "Video Details"} showBack={true} />
        <main className="px-4 pt-6">
          <div className="text-center py-20">
            <Play className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {error || 'Video not found'}
            </h2>
            <p className="text-muted-foreground mb-4">
              The video you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate(-1)} variant="outline">
              Go Back
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title={isScreenshot ? "Screenshot details" : "Video Details"} showBack={true} />
      
      <main className="px-4 pt-6 pb-8">
        {/* Video Thumbnail and Basic Info */}
        <Card className="mb-6 shadow-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-3">
              {/* Thumbnail */}
              <div className="md:col-span-1">
                <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Play className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </AspectRatio>
              </div>

              {/* Video Info */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-foreground flex-1">
                      {video.title}
                    </h1>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEditTitle}
                      className="hover:bg-muted flex-shrink-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Video Metadata */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(video.duration)}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Added {formatDate(video.created_at)}</span>
                    </div>

                    {video.tags && video.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        <span className="capitalize">{video.tags[0]}</span>
                      </div>
                    )}
                  </div>

                  {/* Video URL - Only show for actual videos, not screenshots */}
                  {!isScreenshot && (
                    <div className="flex items-start gap-2 mt-3 p-3 bg-muted rounded-lg">
                      <ExternalLink className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground mb-1">Video URL</div>
                        <div className="text-sm text-muted-foreground break-all">
                          <a 
                            href={video.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors underline"
                          >
                            {video.url}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category */}
                  {category && (
                    <div className="flex items-center gap-2 mt-3">
                      <FolderOpen className="w-4 h-4 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          getColorClasses(category.color)
                        )} />
                        <span className="text-sm text-foreground font-medium">
                          {category.name}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={handleWatchVideo}
                  size="lg"
                  className="w-full h-14 px-8 bg-gradient-primary hover:shadow-elevated transition-all duration-300 font-semibold text-base"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  {isScreenshot ? "Open Screenshot" : "Watch Video"}
                </Button>
                  <Button 
                    variant="outline"
                    size="lg"
                    onClick={handleShareVideo}
                    className="w-full h-14 px-8 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 font-medium text-base"
                  >
                    <Share className="w-5 h-5 mr-2" />
                    Share
                  </Button>
                  <Button 
                    variant="destructive"
                    size="lg"
                    onClick={() => setShowDeleteVideo(true)}
                    className="w-full h-14 px-8 hover:bg-destructive/90 font-medium text-base"
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes and Reminder Section - 2 Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Notes Section */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Notes
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditNote}
                  className="hover:bg-muted"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {video.description ? (
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {video.description}
                </p>
              ) : (
                <p className="text-muted-foreground italic">
                  No notes added yet. Click the edit button to add notes.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Reminder Section */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-500" />
                  Reminder
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditReminder}
                    className="hover:bg-muted"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  {video.reminder_date && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteReminder(true)}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {video.reminder_date ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <div className="flex items-center justify-center w-10 h-10 bg-orange-500/20 rounded-full">
                    <Bell className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Reminder set for this video
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatReminderDate(video.reminder_date)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  No reminder set. Click the edit button to add a reminder.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Tags */}
        {video.tags && video.tags.length > 1 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tag className="w-5 h-5 text-primary" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {video.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="capitalize">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Title Dialog */}
        <Dialog open={showEditTitle} onOpenChange={setShowEditTitle}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Video Title</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Video Title</Label>
                <Input
                  id="title"
                  value={titleContent}
                  onChange={(e) => setTitleContent(e.target.value)}
                  placeholder="Enter video title..."
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditTitle(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTitle} disabled={!titleContent.trim()}>
                Save Title
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Note Dialog */}
        <Dialog open={showEditNote} onOpenChange={setShowEditNote}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="note">Note Content</Label>
                <Textarea
                  id="note"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Add your notes about this video..."
                  className="mt-2 min-h-[120px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditNote(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveNote}>
                Save Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Reminder Dialog */}
        <Dialog open={showEditReminder} onOpenChange={setShowEditReminder}>
          <DialogContent className="sm:max-w-md bg-background">
            <DialogHeader>
              <DialogTitle>
                {video?.reminder_date ? 'Edit Reminder' : 'Add Reminder'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Reminder Date & Time</Label>
                <div className="mt-2">
                  <DateTimePicker
                  value={reminderDate}
                    onChange={setReminderDate}
                    min={new Date().toISOString().slice(0, 16)}
                />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditReminder(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveReminder} className="bg-foreground text-background hover:bg-foreground/90">
                {video?.reminder_date ? 'Update Reminder' : 'Add Reminder'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Reminder Dialog */}
        <AlertDialog open={showDeleteReminder} onOpenChange={setShowDeleteReminder}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Reminder</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this reminder? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteReminder}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Reminder
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


        {/* Delete Video Dialog */}
        <AlertDialog open={showDeleteVideo} onOpenChange={setShowDeleteVideo}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Video</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete this video? This action cannot be undone and will remove all associated notes and reminders.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteVideo}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Video
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>

      {/* Upgrade Modal */}
      <UpgradePromptModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentPlan={limits?.plan_name || 'Free Plan'}
        feature="Premium Features"
        limitType="plan_upgrade"
      />
    </div>
  );
};

export default VideoDetail;