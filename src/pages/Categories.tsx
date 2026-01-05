import { useState, useEffect } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, SlidersHorizontal, FolderOpen, Grid3X3, List, LayoutGrid, Play, Clock } from "lucide-react";
import { Capacitor } from "@capacitor/core";

import { Header } from "@/components/Header";
import { CategoryCard } from "@/components/CategoryCard";
import { EditCategoryDialog } from "@/components/EditCategoryDialog";
import { DeleteCategoryDialog } from "@/components/DeleteCategoryDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { isSupportedUrl, getPlatform } from "@/utils/urlNormalization";
import { callEdgeFunction } from "@/utils/edgeFunctionCall";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  count: number;
  updatedAt: string;
  lastUpdated: string;
}

const Categories = () => {
  const { layoutType } = useDeviceDetection();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    // Format as MM/DD/YYYY to match the image
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  useEffect(() => {
    if (layoutType === 'web') {
      navigate('/categories-web', { replace: true });
      return;
    }

    const fetchCategories = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('categories')
          .select(`
            id,
            name,
            color,
            description,
            updated_at
          `)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Error fetching categories:', error);
          return;
        }

        // Get video counts for each category
        const categoriesWithCounts = await Promise.all(
          (data || []).map(async (category) => {
            const { count } = await supabase
              .from('videos')
              .select('*', { count: 'exact', head: true })
              .eq('category_id', category.id);
            
            return {
              ...category,
              videoCount: count || 0
            };
          })
        );

        const mapped = categoriesWithCounts.map((row: any) => ({
          id: row.id as string,
          name: row.name as string,
          color: (row.color as string) || 'blue-ocean',
          description: (row.description as string) || null,
          count: row.videoCount,
          updatedAt: row.updated_at as string,
          lastUpdated: getTimeAgo(row.updated_at as string),
        }));

        setCategories(mapped);
      } catch (error) {
        console.error('Error in fetchCategories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [layoutType, navigate]);

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "count":
        return b.count - a.count;
      case "recent":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      default:
        return 0;
    }
  });


  /**
   * Check if a string is a valid URL
   */
  const isValidUrl = (string: string): boolean => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  /**
   * Extract URL from clipboard text (handles cases where URL might be in a longer text)
   */
  const extractUrlFromText = (text: string): string | null => {
    if (!text) return null;
    
    // First, try if the entire text is a URL
    if (isValidUrl(text.trim())) {
      return text.trim();
    }
    
    // Try to find URL pattern in the text
    const urlPattern = /(https?:\/\/[^\s]+)/gi;
    const matches = text.match(urlPattern);
    if (matches && matches.length > 0) {
      // Return the first valid URL found
      for (const match of matches) {
        if (isValidUrl(match)) {
          return match;
        }
      }
    }
    
    return null;
  };

  /**
   * Clear clipboard content
   */
  const clearClipboard = async () => {
    try {
      // Try Capacitor Clipboard plugin first
      try {
        const { Clipboard } = await import('@capacitor/clipboard');
        await Clipboard.write({ string: '' });
        console.log('✅ Clipboard cleared via Capacitor plugin');
      } catch (capacitorError) {
        // Fallback to navigator.clipboard
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText('');
          console.log('✅ Clipboard cleared via navigator API');
        }
      }
    } catch (error) {
      console.error('⚠️ Failed to clear clipboard:', error);
      // Don't show error to user - clearing clipboard is not critical
    }
  };

  /**
   * Handle category click - check for pending share and auto-save
   */
  const handleCategoryClick = async (category: any) => {
    const categoryId = category.id;
    
    // Check for pending share first (from Android/iOS share intent)
    // Read directly from localStorage without clearing it (we'll clear after successful save)
    let pendingShare: string | null = null;
    try {
      pendingShare = localStorage.getItem('pendingShare');
      console.log('📤 Pending share found:', pendingShare ? `Yes (${pendingShare.substring(0, 50)}...)` : 'No');
    } catch (error) {
      console.error('Error reading pending share:', error);
    }
    
    // Only check clipboard on native platforms (iOS/Android)
    if (Capacitor.isNativePlatform()) {
      try {
        let clipboardText: string | null = null;
    
        // Try to use Capacitor Clipboard plugin (works better on native platforms)
        try {
          const { Clipboard } = await import('@capacitor/clipboard');
          const result = await Clipboard.read();
          clipboardText = result.value || null;
          console.log('📋 Clipboard read via Capacitor plugin:', clipboardText ? `Yes (length: ${clipboardText.length})` : 'Empty');
        } catch (capacitorError) {
          // Fallback to navigator.clipboard if Capacitor plugin fails
          console.log('⚠️ Capacitor Clipboard plugin failed, trying navigator.clipboard...');
          if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
            clipboardText = await navigator.clipboard.readText();
            console.log('📋 Clipboard read via navigator API:', clipboardText ? `Yes (length: ${clipboardText.length})` : 'Empty');
          }
        }

        // Use pending share if available, otherwise use clipboard text
        const textToProcess = pendingShare || (clipboardText && clipboardText.trim() ? clipboardText : null);
        
        if (textToProcess) {
          // Try to extract URL from text (pending share or clipboard)
          const url = extractUrlFromText(textToProcess);
      
          console.log('🔗 Extracted URL:', url);
          
          if (url && isSupportedUrl(url)) {
            // URL found and is supported - auto-save the video
            console.log('✅ Supported URL found, auto-saving video...');
            
            try {
              // Get current session for authentication
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token) {
                toast({
                  title: "Authentication Required",
                  description: "Please log in to save videos.",
                  variant: "destructive",
                });
                navigate(`/category/${categoryId}`);
                return;
              }

              // Detect platform
              const platform = getPlatform(url);
              const sharedPlatforms = ['youtube', 'instagram', 'tiktok', 'snapchat', 'loom'];
              const isSharedPlatform = platform && sharedPlatforms.includes(platform);

              if (isSharedPlatform) {
                // Use edge function for supported platforms
                const { data: edgeData, error: edgeError } = await callEdgeFunction(
                  'save-shared-link',
                  {
                    url: url,
                    categoryId: categoryId,
                  }
                );

                // Clear clipboard regardless of success or failure
                await clearClipboard();

                if (edgeError) {
                  console.error('❌ Auto-save error:', edgeError);
                  
                  // Handle specific error types
                  if (edgeError === "UNSUPPORTED_PLATFORM") {
                    toast({
                      title: "Unsupported Link",
                      description: "This link can't be added to Tagmentia yet.",
                      variant: "destructive",
                    });
                  } else if (edgeError === "DUPLICATE_VIDEO") {
                    toast({
                      title: "Already Saved",
                      description: "This video is already in your collection.",
                    });
                  } else if (edgeError === "UPGRADE_REQUIRED") {
                    toast({
                      title: "Upgrade Required",
                      description: "You've reached your plan limit.",
                      variant: "destructive",
                    });
                  } else {
                    toast({
                      title: "Error",
                      description: "Failed to save video. Please try again.",
                      variant: "destructive",
                    });
                  }
                  
                  // Navigate to category detail even on error
                  navigate(`/category/${categoryId}`);
                  return;
                }

                // Success - show toast and navigate to category
                console.log('✅ Video auto-saved successfully:', edgeData);
                
                // Clear pending share after successful save
                if (pendingShare) {
                  try {
                    localStorage.removeItem('pendingShare');
                    console.log('🧹 Cleared pending share after successful save');
                  } catch (error) {
                    console.error('Error clearing pending share:', error);
                  }
                }
                
                toast({
                  title: "Video Saved!",
                  description: "Video has been added to your category.",
                });
                navigate(`/category/${categoryId}`);
                return;
              } else {
                // Not a shared platform - navigate to add video page for manual entry
                console.log('ℹ️ Not a shared platform, navigating to add video page');
                navigate(`/category/${categoryId}/add-video?url=${encodeURIComponent(url)}`);
                return;
              }
            } catch (saveError) {
              console.error('❌ Auto-save failed:', saveError);
              // Clear clipboard even on exception
              await clearClipboard();
              toast({
                title: "Error",
                description: "Failed to save video. Please try again.",
                variant: "destructive",
              });
              navigate(`/category/${categoryId}`);
              return;
            }
          } else if (url) {
            // URL found but not supported - clear clipboard and show message
            console.log('⚠️ URL found but not supported');
            await clearClipboard(); // Clear clipboard even for unsupported URLs
            toast({
              title: "Unsupported URL",
              description: "The link is not supported by Tagmentia.",
              variant: "destructive",
            });
          } else {
            console.log('ℹ️ No URL found in clipboard text');
          }
        } else {
          console.log('ℹ️ Clipboard is empty or contains only whitespace');
        }
      } catch (error) {
        // Clipboard access failed, no permission, or empty clipboard
        console.error('❌ Clipboard access error:', error);
        // Silently continue - don't show error to user, just navigate to category
      }
    }
    
    // No URL found or not on native platform - navigate to category detail page
    navigate(`/category/${categoryId}`);
  };

  const refetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select(`
          id,
          name,
          color,
          description,
          updated_at
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }

      // Get video counts for each category
      const categoriesWithCounts = await Promise.all(
        (data || []).map(async (category) => {
          const { count } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id);
          
          return {
            ...category,
            videoCount: count || 0
          };
        })
      );

      const mapped = categoriesWithCounts.map((row: any) => ({
        id: row.id as string,
        name: row.name as string,
        color: (row.color as string) || 'blue-ocean',
        description: (row.description as string) || null,
        count: row.videoCount,
        updatedAt: row.updated_at as string,
        lastUpdated: getTimeAgo(row.updated_at as string),
      }));

      setCategories(mapped);
    } catch (error) {
      console.error('Error in fetchCategories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
  };

  const handleDelete = (category: Category) => {
    setDeletingCategory(category);
  };

  const handleSaveCategory = async (updatedCategory: any) => {
    const { error } = await supabase
      .from('categories')
      .update({
        name: updatedCategory.name,
        description: updatedCategory.description,
        color: updatedCategory.color,
      })
      .eq('id', updatedCategory.id);

    if (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      });
      return;
    }

    await refetchCategories();
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    // First delete all videos in this category
    const { error: videosError } = await supabase
      .from('videos')
      .delete()
      .eq('category_id', categoryId);

    if (videosError) {
      console.error('Error deleting videos:', videosError);
      toast({
        title: "Error",
        description: "Failed to delete category videos. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Then delete the category
    const { error: categoryError } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (categoryError) {
      console.error('Error deleting category:', categoryError);
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      });
      return;
    }

    await refetchCategories();
    setDeletingCategory(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="My Categories" showBack={false}>
        <Link to="/categories/add">
          <Button className="bg-gradient-primary hover:shadow-elevated transition-all duration-300">
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </Link>
      </Header>
      
      <main className="pb-20 px-4 pt-6">
        {/* Search and Filter */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (viewMode === "grid") {
                  setViewMode("list");
                } else {
                  // From list view, navigate to categories-grid page
                  navigate("/categories-grid");
                }
              }}
              className="bg-card border-border hover:bg-muted flex items-center gap-2"
            >
              {viewMode === "grid" ? (
                <>
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Basic View</span>
                </>
              ) : (
                <>
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">Card Grid</span>
                </>
              )}
            </Button>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 bg-card border-border">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="count">Item Count</SelectItem>
                <SelectItem value="recent">Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Categories Display */}
        {loading ? (
          <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-lg p-4 shadow-card animate-pulse">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-muted rounded-lg"></div>
                  <div className="text-right">
                    <div className="w-8 h-6 bg-muted rounded mb-1"></div>
                    <div className="w-12 h-3 bg-muted rounded"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="w-3/4 h-4 bg-muted rounded"></div>
                  <div className="w-1/2 h-3 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedCategories.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-3">
              {sortedCategories.map((category) => (
                <CategoryCard 
                  key={category.id} 
                  category={category}
                  onCardClick={handleCategoryClick}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedCategories.map((category) => {
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

                const getPrimaryColor = (color: string) => {
                  const colorMap: Record<string, string> = {
                    "purple-cosmic": "text-purple-600",
                    "blue-ocean": "text-blue-600",
                    "cyan-azure": "text-cyan-600",
                    "teal-navy": "text-teal-600",
                    "green-emerald": "text-green-600",
                    "lime-forest": "text-lime-600",
                    "lime-vibrant": "text-lime-600",
                    "red-fire": "text-red-600",
                    "orange-sunset": "text-orange-600",
                  };
                  return colorMap[color] || "text-purple-600";
                };

                return (
                  <div 
                    key={category.id}
                    className="bg-white rounded-xl p-4 shadow-sm hover:shadow-elevated transition-all duration-300 cursor-pointer group"
                    onClick={() => handleCategoryClick(category)}
                  >
                    {/* Top section with icon and count */}
                    <div className="flex items-start justify-between mb-3">
                      {/* Top-left: Square icon with rounded corners */}
                      <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0", getColorClasses(category.color))}>
                        <Play className="w-6 h-6 text-white" />
                      </div>
                      
                      {/* Top-right: Count display */}
                      <div className="text-right">
                        <p className={cn("text-2xl font-bold leading-tight", getPrimaryColor(category.color))}>
                          {category.count}
                        </p>
                      </div>
                    </div>
                    
                    {/* Main title */}
                    <h3 className="text-base text-foreground">
                      {category.name}
                    </h3>
                    
                    {/* Date/Time indicator */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{category.lastUpdated}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="text-center py-16">
            {searchQuery ? (
              <>
                <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No categories found
                </h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search terms
                </p>
              </>
            ) : (
              <>
                <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  You have no categories yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Add your first category to start organizing your videos
                </p>
                <Link to="/categories/add">
                  <Button className="bg-gradient-primary hover:shadow-elevated transition-all duration-300">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Category
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </main>

      
      
      {/* Edit Category Dialog */}
      <EditCategoryDialog
        category={editingCategory}
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        onSave={handleSaveCategory}
      />

      {/* Delete Category Dialog */}
      <DeleteCategoryDialog
        category={deletingCategory}
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onDelete={handleDeleteCategory}
      />
    </div>
  );
};

export default Categories;