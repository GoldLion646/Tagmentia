import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search as SearchIcon, 
  Video,
  Filter,
  SortAsc,
  Loader2,
  Plus
} from "lucide-react";
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

const Videos = () => {
  const { layoutType } = useDeviceDetection();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    if (layoutType === 'web') {
      navigate('/videos-web', { replace: true });
      return;
    }
    fetchVideos();
    fetchCategories();
  }, [layoutType, navigate]);

  useEffect(() => {
    filterAndSortVideos();
  }, [videos, searchQuery, sortBy]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching videos:', error);
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

  const filterAndSortVideos = () => {
    let filtered = [...videos];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(query) ||
        video.description?.toLowerCase().includes(query) ||
        video.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort videos
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "title":
          return a.title.localeCompare(b.title);
        case "duration":
          return (b.duration || 0) - (a.duration || 0);
        case "category":
          const categoryA = categories.find(c => c.id === a.category_id)?.name || '';
          const categoryB = categories.find(c => c.id === b.category_id)?.name || '';
          return categoryA.localeCompare(categoryB);
        case "platform":
          const platformA = getPlatformFromVideo(a);
          const platformB = getPlatformFromVideo(b);
          return platformA.localeCompare(platformB);
        default:
          return 0;
      }
    });

    setFilteredVideos(filtered);
  };

  const getPlatformFromVideo = (video: Video): string => {
    // Check if this is a screenshot collection
    if (video.url === 'https://placeholder.com' || video.title?.startsWith('Screenshots -')) {
      return 'screenshot';
    }
    
    // Extract platform from tags or detect from URL
    let platform = 'video'; // default
    if (video.tags && video.tags.length > 0) {
      const platformTag = video.tags.find(tag => 
        ['youtube', 'tiktok', 'instagram', 'vimeo', 'twitter'].includes(tag.toLowerCase())
      );
      if (platformTag) platform = platformTag;
    }
    
    // Fallback to URL detection if no platform tag found
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
    <div className="min-h-screen bg-background">
      <Header title="All Videos" showBack={true} />
      
      <main className="pb-20 px-4 pt-6">
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          {/* Search Input */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-card border-border focus:ring-primary"
            />
          </div>

          {/* Sort Options */}
          <div className="flex gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 bg-card border-border">
                <SortAsc className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="platform">Platform</SelectItem>
                <SelectItem value="duration">Longest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center gap-2 mb-4">
          <Video className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {searchQuery.trim() 
              ? `Search Results (${filteredVideos.length})` 
              : `All Videos (${filteredVideos.length})`
            }
          </h2>
        </div>

        {/* Videos List */}
        {loading ? (
          <div className="space-y-4">
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
          <div className="space-y-4">
            {filteredVideos.map((video) => (
              <VideoItem 
                key={video.id} 
                video={transformVideoForVideoItem(video)} 
                onVideoUpdated={fetchVideos}
              />
            ))}
          </div>
        ) : searchQuery.trim() ? (
          <div className="text-center py-16">
            <SearchIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No videos found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms
            </p>
          </div>
        ) : (
          <div className="text-center py-16">
            <Video className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No videos yet
            </h3>
            <p className="text-muted-foreground">
              Start by adding your first video to a category
            </p>
          </div>
        )}
      </main>

      
    </div>
  );
};

export default Videos;