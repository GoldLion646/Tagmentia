import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search as SearchIcon, Bell } from "lucide-react";
import { Header } from "@/components/Header";
import { VideoItem } from "@/components/VideoItem";
import { supabase } from "@/integrations/supabase/client";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";

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

interface Category {
  id: string;
  name: string;
  color: string;
}

const Reminders = () => {
  const navigate = useNavigate();
  const { layoutType } = useDeviceDetection();
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (layoutType === 'web') {
      navigate('/reminders-web', { replace: true });
      return;
    }
    fetchReminders();
    fetchCategories();
  }, [layoutType, navigate]);

  useEffect(() => {
    filterVideos();
  }, [videos, searchQuery]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .not('reminder_date', 'is', null)
        .order('reminder_date', { ascending: true });

      if (error) {
        console.error('Error fetching reminders:', error);
        return;
      }

      setVideos(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

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
      console.error('Unexpected error:', error);
    }
  };

  const filterVideos = () => {
    let filtered = [...videos];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(query) ||
        video.description?.toLowerCase().includes(query) ||
        video.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredVideos(filtered);
  };

  const getPlatformFromVideo = (video: Video): string => {
    if (video.url === 'https://placeholder.com' || video.title?.startsWith('Screenshots -')) {
      return 'screenshot';
    }
    
    let platform = 'video';
    if (video.tags && video.tags.length > 0) {
      const platformTag = video.tags.find(tag => 
        ['youtube', 'tiktok', 'instagram', 'vimeo', 'twitter'].includes(tag.toLowerCase())
      );
      if (platformTag) platform = platformTag;
    }
    
    if (platform === 'video' && video.url) {
      const url = video.url.toLowerCase();
      if (url.includes('youtube.com') || url.includes('youtu.be')) platform = 'youtube';
      else if (url.includes('tiktok.com')) platform = 'tiktok';
      else if (url.includes('instagram.com')) platform = 'instagram';
      else if (url.includes('vimeo.com')) platform = 'vimeo';
      else if (url.includes('twitter.com') || url.includes('x.com')) platform = 'twitter';
    }
    
    return platform;
  };

  const transformVideoForVideoItem = (video: Video) => {
    const platform = getPlatformFromVideo(video);
    const category = categories.find(c => c.id === video.category_id);
    
    return {
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
      categoryId: video.category_id || undefined,
      category: category ? { 
        id: category.id, 
        name: category.name, 
        color: category.color 
      } : undefined
    };
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Reminders" showBack={true} />
      
      <main className="px-4 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search reminders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-card border-border focus:ring-primary"
            />
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {searchQuery.trim() 
              ? `Results (${filteredVideos.length})` 
              : `All Reminders (${filteredVideos.length})`
            }
          </h2>
        </div>

        {/* Videos List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-20 h-16 bg-muted rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredVideos.length > 0 ? (
          <div className="space-y-3">
            {filteredVideos.map((video) => (
              <VideoItem 
                key={video.id} 
                video={transformVideoForVideoItem(video)} 
                onVideoUpdated={fetchReminders}
              />
            ))}
          </div>
        ) : searchQuery.trim() ? (
          <div className="text-center py-16">
            <SearchIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No reminders found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms
            </p>
          </div>
        ) : (
          <div className="text-center py-16">
            <Bell className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No reminders yet
            </h3>
            <p className="text-muted-foreground">
              Set reminders on your videos to see them here
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Reminders;
