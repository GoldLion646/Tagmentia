import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, BookOpen, Monitor, Music, Dumbbell, Edit, Trash2, List, Search, SlidersHorizontal, Grid3X3 } from "lucide-react";
import { Capacitor } from "@capacitor/core";

import { Header } from "@/components/Header";
import { EditCategoryDialog } from "@/components/EditCategoryDialog";
import { DeleteCategoryDialog } from "@/components/DeleteCategoryDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { isSupportedUrl, getPlatform } from "@/utils/urlNormalization";
import { callEdgeFunction } from "@/utils/edgeFunctionCall";

interface Category {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  count: number;
  updatedAt: string;
  lastUpdated: string;
  recentActivity?: string;
}

const CategoriesGrid = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");

  // Icon mapping for different category types
  const getCategoryIcon = (categoryName: string, description?: string) => {
    const name = categoryName.toLowerCase();
    const desc = description?.toLowerCase() || '';
    
    if (name.includes('education') || desc.includes('learning') || desc.includes('tutorial')) {
      return BookOpen;
    }
    if (name.includes('technology') || desc.includes('tech') || desc.includes('gadget')) {
      return Monitor;
    }
    if (name.includes('entertainment') || desc.includes('music') || desc.includes('movie')) {
      return Music;
    }
    if (name.includes('lifestyle') || desc.includes('health') || desc.includes('fitness')) {
      return Dumbbell;
    }
    return BookOpen; // Default icon
  };

  // Map semantic color names to gradients
  const getGradientStyle = (colorName: string) => {
    const gradientMap: { [key: string]: string } = {
      'purple-cosmic': 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
      'blue-ocean': 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      'lime-forest': 'linear-gradient(135deg, #84CC16 0%, #16A34A 100%)',
      'green-emerald': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      'teal-navy': 'linear-gradient(135deg, #14B8A6 0%, #0F766E 100%)',
      'cyan-azure': 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
      'lime-vibrant': 'linear-gradient(135deg, #A3E635 0%, #65A30D 100%)',
      'red-fire': 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      'orange-sunset': 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    };
    return gradientMap[colorName] || 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)';
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const getRecentActivity = async (categoryId: string) => {
    const { data } = await supabase
      .from('videos')
      .select('title, created_at')
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      return `Recent: ${data[0].title}`;
    }
    return 'No recent activity';
  };

  useEffect(() => {
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

        // Get video counts and recent activity for each category
        const categoriesWithData = await Promise.all(
          (data || []).map(async (category) => {
            const { count } = await supabase
              .from('videos')
              .select('*', { count: 'exact', head: true })
              .eq('category_id', category.id);
            
            const recentActivity = await getRecentActivity(category.id);
            
            return {
              ...category,
              videoCount: count || 0,
              recentActivity
            };
          })
        );

        const mapped = categoriesWithData.map((row: any) => ({
          id: row.id as string,
          name: row.name as string,
          color: (row.color as string) || 'blue-ocean',
          description: (row.description as string) || null,
          count: row.videoCount,
          updatedAt: row.updated_at as string,
          lastUpdated: getTimeAgo(row.updated_at as string),
          recentActivity: row.recentActivity,
        }));

        setCategories(mapped);
      } catch (error) {
        console.error('Error in fetchCategories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

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
  const handleCategoryClick = async (category: Category) => {
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

  const handleEdit = (e: React.MouseEvent, category: Category) => {
    e.stopPropagation();
    setEditingCategory(category);
  };

  const handleDelete = (e: React.MouseEvent, category: Category) => {
    e.stopPropagation();
    setDeletingCategory(category);
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

      const categoriesWithData = await Promise.all(
        (data || []).map(async (category) => {
          const { count } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id);
          
          const recentActivity = await getRecentActivity(category.id);
          
          return {
            ...category,
            videoCount: count || 0,
            recentActivity
          };
        })
      );

      const mapped = categoriesWithData.map((row: any) => ({
        id: row.id as string,
        name: row.name as string,
        color: (row.color as string) || 'blue-ocean',
        description: (row.description as string) || null,
        count: row.videoCount,
        updatedAt: row.updated_at as string,
        lastUpdated: getTimeAgo(row.updated_at as string),
        recentActivity: row.recentActivity,
      }));

      setCategories(mapped);
    } catch (error) {
      console.error('Error in fetchCategories:', error);
    } finally {
      setLoading(false);
    }
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
    toast({
      title: "Category Updated",
      description: "Your category has been successfully updated.",
    });
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
    toast({
      title: "Category Deleted",
      description: "Category and all its videos have been removed.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="My Categories" showBack={false}>
        <Button
          onClick={() => navigate('/categories/add')}
          className="bg-gradient-primary hover:shadow-elevated transition-all duration-300"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
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
              onClick={() => navigate("/categories")}
              className="bg-card border-border hover:bg-muted flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Basic View</span>
            </Button>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 bg-card border-border">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="count">Video Count</SelectItem>
                <SelectItem value="recent">Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Categories Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-xl p-6 shadow-card animate-pulse h-48">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 bg-muted rounded-lg"></div>
                  <div className="w-6 h-6 bg-muted rounded"></div>
                </div>
                <div className="space-y-3">
                  <div className="w-3/4 h-5 bg-muted rounded"></div>
                  <div className="w-1/2 h-3 bg-muted rounded"></div>
                  <div className="w-16 h-4 bg-muted rounded"></div>
                  <div className="w-full h-3 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedCategories.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {sortedCategories.map((category) => {
              const IconComponent = getCategoryIcon(category.name, category.description || '');
              return (
                <div
                  key={category.id}
                  className="relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
                  onClick={() => handleCategoryClick(category)}
                >
                  {/* Gradient Top Section */}
                  <div 
                    className="relative p-4 pb-6 bg-gradient-primary"
                    style={{
                      borderRadius: '16px 16px 0 0'
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center backdrop-blur-sm">
                        <IconComponent className="w-4 h-4 text-white" />
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-white hover:bg-white/20 h-8 w-8 rounded-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={(e) => handleEdit(e, category)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Category
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => handleDelete(e, category)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Category
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Category Title and Description */}
                    <div>
                      <h3 className="text-white font-bold text-lg mb-1 line-clamp-1">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="text-white/80 text-xs line-clamp-1">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* White Bottom Section */}
                  <div className="bg-white p-4 pt-3">
                    {/* Video Count */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 flex items-center justify-center">
                        <div className="w-0 h-0 border-l-[5px] border-l-gray-700 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent"></div>
                      </div>
                      <span className="text-gray-900 font-semibold text-sm">
                        {category.count} videos
                      </span>
                    </div>
                    
                    {/* Recent Activity */}
                    <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed">
                      {category.recentActivity}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
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
                <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  You have no categories yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Add your first category to start organizing your videos
                </p>
                <Button
                  onClick={() => navigate('/categories/add')}
                  className="bg-gradient-primary hover:shadow-elevated transition-all duration-300"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Category
                </Button>
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

export default CategoriesGrid;