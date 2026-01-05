import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Play, MoreVertical, ExternalLink, Share, Edit, Calendar, FolderOpen, Trash2, Bell, BookOpen } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
}

interface DashboardVideoItemProps {
  video: Video;
  onVideoUpdated?: () => void;
}

export const DashboardVideoItem = ({ video, onVideoUpdated }: DashboardVideoItemProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);

  const formatAddedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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

      onVideoUpdated?.();
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

  // Check if this is a screenshot
  const isScreenshot = video.url === 'https://placeholder.com' || video.title?.startsWith('Screenshots -') || video.platform.toLowerCase() === 'screenshot';

  return (
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
                
                {/* Saved date */}
                <div className="text-xs text-gray-500 mb-3">
                  Saved {formatAddedDate(video.addedDate)}
                </div>
                
                {/* All badges grouped together */}
                <div className="flex items-center gap-2">
                  {/* Platform badge */}
                   <div className="text-white text-xs font-medium px-3 py-1.5 rounded-md h-8 flex items-center justify-center min-w-[90px]" style={{ backgroundColor: '#545DEA' }}>
                      {formatPlatformName(video.platform)}
                    </div>
                   
                    {/* Reminder badge - always show, colored when active */}
                    <div className={`flex items-center justify-center rounded-full w-8 h-8 ${
                      video.hasReminder 
                        ? 'text-white' 
                        : 'bg-gray-100 text-gray-400'
                    }`}
                         style={video.hasReminder ? { backgroundColor: '#545DEA' } : {}}>
                      <Bell className="w-4 h-4" />
                    </div>
                    
                    {/* Note badge - always show, colored when active */}
                    <div className={`flex items-center justify-center rounded-full w-8 h-8 ${
                      video.hasNotes 
                        ? 'text-white' 
                        : 'bg-gray-100 text-gray-400'
                    }`}
                         style={video.hasNotes ? { backgroundColor: '#545DEA' } : {}}>
                      <BookOpen className="w-4 h-4" />
                    </div>
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
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); handleDeleteVideo(); }}
                    className="text-destructive focus:text-destructive"
                    disabled={isUpdating}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isUpdating ? "Deleting..." : (isScreenshot ? 'Delete Screenshot' : 'Delete Video')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};