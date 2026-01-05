import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Bell, BookOpen, ExternalLink, MoreVertical, Trash2, Edit, Calendar, FolderOpen, Share } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { scheduleReminderNotification, cancelReminderNotification } from "@/utils/reminderNotifications";

interface Video {
  id: string | number;
  title: string;
  platform: string;
  thumbnail?: string;
  duration?: string;
  hasReminder: boolean;
  reminderDate?: string | null;
  hasNotes: boolean;
  addedDate: string;
  url?: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  transcript?: string;
  category?: {
    id: string;
    name: string;
    color: string;
  };
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface VideoItemProps {
  video: Video;
  category?: { color: string } | null;
  onVideoUpdated?: () => void;
  inCategoryView?: boolean;
}

export const VideoItem = ({ video, category, onVideoUpdated, inCategoryView = false }: VideoItemProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showEditNote, setShowEditNote] = useState(false);
  const [showEditReminder, setShowEditReminder] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showChangeCategory, setShowChangeCategory] = useState(false);
  const [editedNote, setEditedNote] = useState(video.description || "");
  const [reminderDate, setReminderDate] = useState(video.reminderDate || "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(video.categoryId || "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, color')
          .order('name');

        if (error) {
          console.error('Error fetching categories:', error);
          return;
        }

        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  const formatAddedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatReminderDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "youtube":
        return "bg-red-500";
      case "tiktok":
        return "bg-black";
      case "instagram":
        return "bg-pink-500";
      case "screenshot":
        return "bg-orange-500";
      default:
        return "bg-primary";
    }
  };

  // Helper to get badge classes for reminder and note badges
  const getBadgeClasses = (isActive: boolean) => {
    if (!isActive) return 'bg-gray-100 text-gray-400';
    return 'text-white' ;
  };

  // Extract platform from tags or URL
  const detectPlatformFromVideo = (video: Video): string => {
    // Check if this is a screenshot collection
    if (video.url === 'https://placeholder.com' || video.title?.startsWith('Screenshots -')) {
      return 'screenshot';
    }
    
    // First try to get from tags
    if (video.tags && video.tags.length > 0) {
      const platformTag = video.tags.find(tag => 
        ['youtube', 'tiktok', 'instagram', 'snapchat', 'vimeo', 'twitter'].includes(tag.toLowerCase())
      );
      if (platformTag) return platformTag;
    }
    
    // Fallback to URL detection
    if (video.url) {
      const url = video.url.toLowerCase();
      if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
      if (url.includes('tiktok.com')) return 'tiktok';
      if (url.includes('instagram.com')) return 'instagram';
      if (url.includes('snapchat.com')) return 'snapchat';
      if (url.includes('vimeo.com')) return 'vimeo';
      if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    }
    
    return 'video';
  };

  // Format platform name for display
  const formatPlatformName = (platform: string): string => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return 'YouTube';
      case 'tiktok':
        return 'TikTok';
      case 'instagram':
        return 'Instagram';
      case 'snapchat':
        return 'Snapchat';
      case 'vimeo':
        return 'Vimeo';
      case 'twitter':
        return 'Twitter';
      case 'screenshot':
        return 'Screenshot';
      default:
        return platform.charAt(0).toUpperCase() + platform.slice(1);
    }
  };

  const handleCardClick = () => {
    navigate(`/video/${video.id}`);
  };

  const handlePlayVideo = () => {
    if (video.url) {
      window.open(video.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDeleteVideo = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', String(video.id));

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete video",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Video deleted successfully",
      });

      // Close dialog first, then update
      setShowDeleteDialog(false);
      
      // Small delay to ensure dialog is closed before updating
      setTimeout(() => {
        onVideoUpdated?.();
      }, 100);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete video",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateNote = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('videos')
        .update({ description: editedNote || null })
        .eq('id', String(video.id));

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update note",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Note updated successfully",
      });

      onVideoUpdated?.();
      setShowEditNote(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetReminder = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('videos')
        .update({ reminder_date: reminderDate } as any)
        .eq('id', String(video.id));

      if (error) {
        toast({
          title: "Error",
          description: "Failed to set reminder",
          variant: "destructive",
        });
        return;
      }

      // Schedule local notification for reminder
      if (reminderDate) {
        await scheduleReminderNotification(
          String(video.id),
          video.title,
          reminderDate,
          video.category?.name
        );
      }

      toast({
        title: "Reminder Set",
        description: `Reminder set for ${formatReminderDate(reminderDate)}`,
      });

      onVideoUpdated?.();
      setShowEditReminder(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set reminder",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangeCategory = async () => {
    if (!selectedCategoryId) return;
    
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('videos')
        .update({ category_id: selectedCategoryId === 'none' ? null : selectedCategoryId })
        .eq('id', String(video.id));

      if (error) throw error;

      toast({
        title: "Success",
        description: "Video category has been updated",
      });

      onVideoUpdated?.();
      setShowChangeCategory(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteReminder = async () => {
    setIsUpdating(true);
    try {
      // Cancel scheduled notification first
      await cancelReminderNotification(String(video.id));

      const { error } = await supabase
        .from('videos')
        .update({ reminder_date: null } as any)
        .eq('id', String(video.id));

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete reminder",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Reminder Deleted",
        description: "Reminder has been removed",
      });

      onVideoUpdated?.();
      setShowEditReminder(false);
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to delete reminder",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShareVideo = async () => {
    const shareData = {
      title: video.title,
      text: `Check out this video: ${video.title}`,
      url: video.url || window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard
        const shareText = `${video.title}\n${video.url || window.location.href}`;
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
        description: `${video.title}\n${video.url || window.location.href}`,
      });
    }
  };

  const getCategoryColorClass = (color: string) => {
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

  // Check if this is a screenshot
  const isScreenshot = video.url === 'https://placeholder.com' || video.title?.startsWith('Screenshots -') || detectPlatformFromVideo(video) === 'screenshot';

  return (
    <>
      <Card className="group hover:shadow-card transition-all duration-200 cursor-pointer overflow-hidden" onClick={handleCardClick}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Square Thumbnail with rounded corners */}
            <div className="flex-shrink-0 w-20">
              <div className="relative">
                <AspectRatio ratio={1} className="rounded-2xl overflow-hidden bg-muted">
                   {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // Hide the failed image and show fallback
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                  )}
                  {/* Fallback div for failed image loads */}
                  <div className="w-full h-full flex items-center justify-center bg-slate-800" style={{ display: 'none' }}>
                    <Play className="w-8 h-8 text-white" />
                  </div>
                </AspectRatio>
                {video.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                    {video.duration}
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-200 text-base mb-2 leading-tight">
                    {video.title}
                  </h3>
                  
                   {/* Saved date with reminder/notes icons */}
                   <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                     <span>Saved {formatAddedDate(video.addedDate)}</span>
                     
                     {video.hasReminder && (
                       <span className="text-white p-1.5 rounded-full flex items-center justify-center w-6 h-6" style={{ backgroundColor: '#545DEA' }}>
                         <Bell className="w-3 h-3" />
                       </span>
                     )}
                     
                     {video.hasNotes && (
                       <span className="text-white p-1.5 rounded-full flex items-center justify-center w-6 h-6" style={{ backgroundColor: '#545DEA' }}>
                         <BookOpen className="w-3 h-3" />
                       </span>
                     )}
                   </div>
                   
                   {/* Reminder date display */}
                   {video.hasReminder && video.reminderDate && (
                     <div className="flex items-center gap-2 text-sm text-primary mb-3">
                       <Calendar className="w-4 h-4" />
                       <span className="font-medium">{formatReminderDate(video.reminderDate)}</span>
                     </div>
                   )}
                  
                   {/* Badge layout - conditional based on context */}
                   <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-white text-xs font-medium px-3 py-1.5 rounded-md h-7 flex items-center" style={{ backgroundColor: '#545DEA' }}>
                        {formatPlatformName(detectPlatformFromVideo(video))}
                      </span>
                     
                      {video.category && !inCategoryView && (
                        <span className={`text-white text-xs font-medium px-3 py-1.5 rounded-md h-7 flex items-center ${getCategoryColorClass(video.category.color)}`}>
                          {video.category.name}
                        </span>
                      )}
                     
                     {inCategoryView && video.hasReminder && (
                       <span className="text-white rounded-full flex items-center justify-center w-7 h-7" style={{ backgroundColor: '#545DEA' }}>
                         <Bell className="w-3.5 h-3.5" />
                       </span>
                     )}
                     
                     {inCategoryView && video.hasNotes && (
                       <span className="text-white rounded-full flex items-center justify-center w-7 h-7" style={{ backgroundColor: '#545DEA' }}>
                         <BookOpen className="w-3.5 h-3.5" />
                       </span>
                     )}
                   </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0 h-6 w-6"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePlayVideo(); }}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {isScreenshot ? 'Open Screenshot' : 'Open Video'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleShareVideo(); }}>
                      <Share className="w-4 h-4 mr-2" />
                      {isScreenshot ? 'Share Screenshot' : 'Share Video'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowEditNote(true); }}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Note
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowEditReminder(true); }}>
                      <Calendar className="w-4 h-4 mr-2" />
                      {video.hasReminder ? "Edit Reminder" : "Set Reminder"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowChangeCategory(true); }}>
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Change Category
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isScreenshot ? 'Delete Screenshot' : 'Delete Video'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          
          {/* Remove the bottom badges section since they're now integrated above */}
        </CardContent>
      </Card>

      {/* Edit Note Dialog */}
      <Dialog open={showEditNote} onOpenChange={setShowEditNote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={editedNote}
                onChange={(e) => setEditedNote(e.target.value)}
                placeholder="Add your notes about this video..."
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditNote(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateNote} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Category Dialog */}
      <Dialog open={showChangeCategory} onOpenChange={setShowChangeCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Select Category</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeCategory(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeCategory} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set/Edit Reminder Dialog */}
      <Dialog open={showEditReminder} onOpenChange={setShowEditReminder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {video.hasReminder ? "Edit Reminder" : "Set Reminder"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {video.hasReminder && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Current reminder:</p>
                <p className="font-medium">{formatReminderDate(video.reminderDate || "")}</p>
              </div>
            )}
            <div>
              <Label htmlFor="reminder-date">
                {video.hasReminder ? "New Reminder Date & Time" : "Reminder Date & Time"}
              </Label>
              <Input
                id="reminder-date"
                type="datetime-local"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditReminder(false)}>
              Cancel
            </Button>
            {video.hasReminder && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteReminder} 
                disabled={isUpdating}
              >
                {isUpdating ? "Deleting..." : "Delete Reminder"}
              </Button>
            )}
            <Button 
              onClick={handleSetReminder} 
              disabled={isUpdating || !reminderDate}
            >
              {isUpdating ? "Saving..." : (video.hasReminder ? "Update Reminder" : "Set Reminder")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{video.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteVideo}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isUpdating}
            >
              {isUpdating ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};