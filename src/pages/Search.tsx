import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search as SearchIcon, 
  X, 
  Filter, 
  Play, 
  FolderOpen, 
  BookOpen, 
  Clock, 
  Sparkles,
  TrendingUp
} from "lucide-react";
import { Header } from "@/components/Header";
import { VideoItem } from "@/components/VideoItem";
import { CategoryCard } from "@/components/CategoryCard";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Video {
  id: string;
  title: string;
  platform: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  reminder_date: string | null;
  created_at: string;
  category_id: string;
  categories?: {
    id: string;
    name: string;
    color: string | null;
  };
}

interface Category {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
  videoCount?: number;
}

interface Note {
  id: string;
  note: string;
  created_at: string;
  video_id: string;
  video_title: string;
}

const Search = () => {
  const { layoutType } = useDeviceDetection();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [isSearching, setIsSearching] = useState(false);
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (layoutType === 'web') {
      window.location.href = '/search-web';
    }
  }, [layoutType]);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Fetch videos with categories
      const { data: videosData } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          platform,
          thumbnail_url,
          duration,
          reminder_date,
          created_at,
          category_id,
          categories (
            id,
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch categories with video counts
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, color, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Get video counts for each category
      if (categoriesData) {
        const categoriesWithCounts = await Promise.all(
          categoriesData.map(async (cat) => {
            const { count } = await supabase
              .from('videos')
              .select('*', { count: 'exact', head: true })
              .eq('category_id', cat.id);
            return { ...cat, videoCount: count || 0 };
          })
        );
        setCategories(categoriesWithCounts);
      }

      // Fetch notes (notes are stored in videos.description field)
      const { data: videosWithNotes } = await supabase
        .from('videos')
        .select('id, title, description, created_at')
        .eq('user_id', user.id)
        .not('description', 'is', null)
        .neq('description', '')
        .order('created_at', { ascending: false });

      const notesData = (videosWithNotes || []).map(v => ({
        id: v.id,
        note: v.description || '',
        created_at: v.created_at,
        video_id: v.id,
        video_title: v.title
      }));

      setVideos(videosData || []);
      setNotes(notesData);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const recentSearches = [
    "AI tools",
    "tutorials", 
    "cooking recipes",
    "productivity"
  ];

  const trendingSearches = [
    "chatgpt",
    "workout",
    "productivity",
    "design trends"
  ];

  const platforms = ["All", "YouTube", "TikTok", "Instagram", "Twitter", "Vimeo"];

  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  // Filter data based on search query
  const query = searchQuery.toLowerCase().trim();
  
  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(query) ||
      video.platform?.toLowerCase().includes(query) ||
      video.categories?.name.toLowerCase().includes(query);
    const matchesPlatform = selectedPlatform === 'all' || 
      video.platform?.toLowerCase() === selectedPlatform.toLowerCase();
    return matchesSearch && matchesPlatform;
  });

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(query)
  );

  const filteredNotes = notes.filter(note =>
    note.note.toLowerCase().includes(query) ||
    note.video_title.toLowerCase().includes(query)
  );

  // Sort results
  const sortVideos = (vids: Video[]) => {
    switch (sortBy) {
      case 'date':
        return [...vids].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'name':
        return [...vids].sort((a, b) => a.title.localeCompare(b.title));
      default:
        return vids;
    }
  };

  const sortCategories = (cats: Category[]) => {
    switch (sortBy) {
      case 'date':
        return [...cats].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'name':
        return [...cats].sort((a, b) => a.name.localeCompare(b.name));
      default:
        return cats;
    }
  };

  const sortedVideos = sortVideos(filteredVideos);
  const sortedCategories = sortCategories(filteredCategories);

  const getResultsCount = () => {
    if (!searchQuery.trim()) return 0;
    switch (activeTab) {
      case "videos": return sortedVideos.length;
      case "categories": return sortedCategories.length;
      case "notes": return filteredNotes.length;
      default: return sortedVideos.length + sortedCategories.length + filteredNotes.length;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasResults = getResultsCount() > 0;

  // Transform video for VideoItem component
  const transformVideo = (video: Video) => ({
    id: video.id,
    title: video.title,
    platform: video.platform || 'Unknown',
    thumbnail: video.thumbnail_url || 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400&h=300&fit=crop',
    duration: formatDuration(video.duration),
    hasReminder: !!video.reminder_date,
    hasNotes: false,
    addedDate: formatDate(video.created_at),
    category: video.categories ? {
      id: video.categories.id,
      name: video.categories.name,
      color: video.categories.color || '#3B82F6'
    } : undefined
  });

  // Transform category for CategoryCard component
  const transformCategory = (cat: Category) => ({
    id: cat.id,
    name: cat.name,
    count: cat.videoCount || 0,
    color: cat.color || '#3B82F6',
    lastUpdated: formatDate(cat.created_at)
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Search" showBack={false} />
        <main className="pb-20 px-4 pt-6">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Search" showBack={false} />
      
      <main className="pb-20 px-4 pt-6">
        {/* Search Input */}
        <div className="relative mb-6">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Search videos, categories, and notes..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-12 pr-12 h-12 bg-card border-border focus:ring-primary text-base"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Filters */}
        {hasSearchQuery && (
          <div className="flex gap-3 mb-6 overflow-x-auto">
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-32 bg-card border-border">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((platform) => (
                  <SelectItem key={platform.toLowerCase()} value={platform.toLowerCase()}>
                    {platform}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="date">Date Added</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Search Results */}
        {hasSearchQuery ? (
          <>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {isSearching ? "Searching..." : `${getResultsCount()} results for "${searchQuery}"`}
              </p>
            </div>

            {hasResults ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="videos">Videos</TabsTrigger>
                  <TabsTrigger value="categories">Categories</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-6">
                  {/* Categories Results */}
                  {sortedCategories.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        Categories ({sortedCategories.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {sortedCategories.map((category) => (
                          <Link key={category.id} to={`/category/${category.id}`}>
                            <CategoryCard category={transformCategory(category)} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos Results */}
                  {sortedVideos.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Videos ({sortedVideos.length})
                      </h3>
                      <div className="space-y-4 mb-6">
                        {sortedVideos.map((video) => (
                          <VideoItem key={video.id} video={transformVideo(video)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes Results */}
                  {filteredNotes.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Notes ({filteredNotes.length})
                      </h3>
                      <div className="space-y-3">
                        {filteredNotes.map((note) => (
                          <Link key={note.id} to={`/video/${note.video_id}`}>
                            <Card className="shadow-card hover:shadow-elevated transition-all duration-200 cursor-pointer">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground line-clamp-2 mb-2">
                                      {note.note}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Badge variant="outline" className="text-xs">
                                        {note.video_title}
                                      </Badge>
                                      <span>•</span>
                                      <span>{formatDate(note.created_at)}</span>
                                    </div>
                                  </div>
                                  <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="videos">
                  <div className="space-y-4">
                    {sortedVideos.map((video) => (
                      <VideoItem key={video.id} video={transformVideo(video)} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="categories">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sortedCategories.map((category) => (
                      <Link key={category.id} to={`/category/${category.id}`}>
                        <CategoryCard category={transformCategory(category)} />
                      </Link>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="notes">
                  <div className="space-y-3">
                    {filteredNotes.map((note) => (
                      <Link key={note.id} to={`/video/${note.video_id}`}>
                        <Card className="shadow-card hover:shadow-elevated transition-all duration-200 cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground line-clamp-2 mb-2">
                                  {note.note}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">
                                    {note.video_title}
                                  </Badge>
                                  <span>•</span>
                                  <span>{formatDate(note.created_at)}</span>
                                </div>
                              </div>
                              <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              /* No Results */
              <div className="text-center py-16">
                <SearchIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No results found
                </h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search terms or filters
                </p>
                <Button
                  variant="outline"
                  onClick={clearSearch}
                  className="border-border hover:bg-muted"
                >
                  Clear Search
                </Button>
              </div>
            )}
          </>
        ) : (
          /* Search Suggestions */
          <div className="space-y-6">
            {/* Recent Searches */}
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch(search)}
                    className="border-border hover:bg-muted"
                  >
                    {search}
                  </Button>
                ))}
              </div>
            </div>

            {/* Trending Searches */}
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Trending
              </h3>
              <div className="flex flex-wrap gap-2">
                {trendingSearches.map((search, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch(search)}
                    className="border-border hover:bg-muted"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {search}
                  </Button>
                ))}
              </div>
            </div>

            {/* Search Tips */}
            <Card className="shadow-card">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-3">Search Tips</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Search by video title, category name, or note content</li>
                  <li>• Use filters to narrow down results by platform or date</li>
                  <li>• Try searching for specific topics or keywords</li>
                  <li>• Use quotes for exact phrase matching</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Search;
