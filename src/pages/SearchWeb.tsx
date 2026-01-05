import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { LayoutToggle } from "@/components/LayoutToggle";
import { cn } from "@/lib/utils";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";

const SearchWeb = () => {
  const { layoutType } = useDeviceDetection();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (layoutType === 'mobile') {
      window.location.href = '/search';
    }
  }, [layoutType]);

  // Mock data - replace with actual search results
  const recentSearches = [
    "AI tools",
    "fitness routines", 
    "cooking recipes",
    "javascript tutorial"
  ];

  const trendingSearches = [
    "chatgpt",
    "workout",
    "productivity",
    "design trends"
  ];

  const searchResults = {
    videos: [
      {
        id: 1,
        title: "Complete Guide to ChatGPT for Beginners",
        platform: "YouTube",
        thumbnail: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop",
        duration: "15:42",
        hasReminder: true,
        hasNotes: false,
        addedDate: "2 days ago",
        category: { id: "1", name: "AI Tools", color: "#3B82F6" }
      },
      {
        id: 2,
        title: "AI Tools That Will Change Your Life",
        platform: "TikTok",
        thumbnail: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=300&fit=crop",
        duration: "0:45",
        hasReminder: false,
        hasNotes: true,
        addedDate: "3 days ago",
        category: { id: "1", name: "AI Tools", color: "#3B82F6" }
      }
    ],
    categories: [
      { id: 1, name: "AI Tools", count: 12, color: "blue", lastUpdated: "2 days ago" },
      { id: 2, name: "Fitness Routines", count: 8, color: "green", lastUpdated: "1 day ago" }
    ],
    notes: [
      {
        id: 1,
        title: "ChatGPT Best Practices",
        content: "Key points about using ChatGPT effectively for content creation...",
        videoTitle: "Complete Guide to ChatGPT",
        createdDate: "2 days ago"
      }
    ]
  };

  const platforms = ["All", "YouTube", "TikTok", "Instagram", "Twitter", "Vimeo"];

  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      const timer = setTimeout(() => setIsSearching(false), 500);
      return () => clearTimeout(timer);
    } else {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const clearSearch = () => {
    setSearchQuery("");
  };

  const hasResults = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header>
        <LayoutToggle />
      </Header>

      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Search</h1>
          <p className="text-lg text-muted-foreground">
            Find videos, categories, and notes
          </p>
        </div>

        {/* Search Bar */}
        <Card className="mb-6 shadow-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative md:col-span-2">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search across videos, categories, and notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-12 text-base"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Most Relevant</SelectItem>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="title">Title (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Search Results or Suggestions */}
        {hasResults ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="all">All Results</TabsTrigger>
              <TabsTrigger value="videos">
                Videos ({searchResults.videos.length})
              </TabsTrigger>
              <TabsTrigger value="categories">
                Categories ({searchResults.categories.length})
              </TabsTrigger>
              <TabsTrigger value="notes">
                Notes ({searchResults.notes.length})
              </TabsTrigger>
            </TabsList>

            {/* All Results Tab */}
            <TabsContent value="all" className="space-y-8">
              {/* Videos Section */}
              <div>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Play className="w-6 h-6 text-primary" />
                  Videos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.videos.map((video) => (
                    <VideoItem key={video.id} video={video} />
                  ))}
                </div>
              </div>

              {/* Categories Section */}
              <div>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <FolderOpen className="w-6 h-6 text-primary" />
                  Categories
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {searchResults.categories.map((category) => (
                    <CategoryCard key={category.id} category={category} />
                  ))}
                </div>
              </div>

              {/* Notes Section */}
              <div>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-primary" />
                  Notes
                </h2>
                <div className="space-y-3">
                  {searchResults.notes.map((note) => (
                    <Card key={note.id} className="shadow-card hover:shadow-elevated transition-all cursor-pointer">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground mb-2">{note.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{note.content}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>From: {note.videoTitle}</span>
                          <span>{note.createdDate}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Videos Only Tab */}
            <TabsContent value="videos">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.videos.map((video) => (
                  <VideoItem key={video.id} video={video} />
                ))}
              </div>
            </TabsContent>

            {/* Categories Only Tab */}
            <TabsContent value="categories">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {searchResults.categories.map((category) => (
                  <CategoryCard key={category.id} category={category} />
                ))}
              </div>
            </TabsContent>

            {/* Notes Only Tab */}
            <TabsContent value="notes">
              <div className="space-y-3">
                {searchResults.notes.map((note) => (
                  <Card key={note.id} className="shadow-card hover:shadow-elevated transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground mb-2">{note.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{note.content}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>From: {note.videoTitle}</span>
                        <span>{note.createdDate}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-8">
            {/* Recent Searches */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Recent Searches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-muted transition-colors py-2 px-3"
                      onClick={() => setSearchQuery(search)}
                    >
                      {search}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Trending Searches */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Trending Searches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.map((search, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-muted transition-colors py-2 px-3"
                      onClick={() => setSearchQuery(search)}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      {search}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchWeb;
