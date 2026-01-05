import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, Plus, MoreVertical, Video, Bell, FileText, SlidersHorizontal, Edit, Trash2, Grid, List, Camera } from "lucide-react";

import { Header } from "@/components/Header";
import { VideoItem } from "@/components/VideoItem";
import { VideoGridItem } from "@/components/VideoGridItem";
import { EditCategoryDialog } from "@/components/EditCategoryDialog";
import { DeleteCategoryDialog } from "@/components/DeleteCategoryDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  color: string;
  description?: string;
  count: number;
  lastUpdated: string;
}

const CategoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categoryName, setCategoryName] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [notesCount, setNotesCount] = useState(0);
  const [remindersCount, setRemindersCount] = useState(0);
  const [screenshotsCount, setScreenshotsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryUpdatedAt, setCategoryUpdatedAt] = useState<string>("");
  const [sortBy, setSortBy] = useState("newest");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('videoLayoutMode') as 'list' | 'grid') || 'list';
  });
  const [showAddChoiceSheet, setShowAddChoiceSheet] = useState(false);

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

  // Map semantic color names to gradient classes
  const getCategoryGradientClass = (colorName: string) => {
    const gradientMap: { [key: string]: string } = {
      'purple-cosmic': 'bg-gradient-purple-cosmic',
      'blue-ocean': 'bg-gradient-blue-ocean',
      'lime-forest': 'bg-gradient-lime-forest',
      'green-emerald': 'bg-gradient-green-emerald',
      'teal-navy': 'bg-gradient-teal-navy',
      'cyan-azure': 'bg-gradient-cyan-azure',
      'lime-vibrant': 'bg-gradient-lime-vibrant',
      'red-fire': 'bg-gradient-red-fire',
      'orange-sunset': 'bg-gradient-orange-sunset',
    };
    return gradientMap[colorName] || 'bg-gradient-primary'; // fallback to primary gradient
  };

  const fetchCategoryAndVideos = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Fetch category details
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('id, name, color, description, updated_at')
        .eq('id', id)
        .maybeSingle();

      if (categoryError) {
        console.error('Error fetching category:', categoryError);
        setCategoryName('Category');
      } else {
        setCategoryName(categoryData?.name || 'Category');
        setCategoryUpdatedAt(categoryData?.updated_at || '');
        if (categoryData) {
          console.log('Category data fetched:', categoryData);
          console.log('Category color:', categoryData.color);
          setCategory({
            id: categoryData.id,
            name: categoryData.name,
            color: categoryData.color,
            description: categoryData.description,
            count: 0, // Will be set after videos are fetched
            lastUpdated: categoryData.updated_at
          });
        }
      }

        // Fetch videos for this category
        const { data: videosData, error: videosError } = await supabase
          .from('videos')
          .select('*, reminder_date')
          .eq('category_id', id)
          .order('created_at', { ascending: false });

      if (videosError) {
        console.error('Error fetching videos:', videosError);
        setVideos([]);
        setNotesCount(0);
        setRemindersCount(0);
        setScreenshotsCount(0);
      } else {
          // Transform the data to match expected format
          const transformedVideos = (videosData || []).map((video: any) => {
            // Detect platform
            let platform = 'Video';
            if (video.url === 'https://placeholder.com' || video.title?.startsWith('Screenshots -')) {
              platform = 'screenshot';
            } else if (video.tags?.[0]) {
              platform = video.tags[0];
            }
            
            return {
              id: video.id,
              title: video.title,
              platform,
              thumbnail: video.thumbnail_url,
              duration: video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : '',
              hasReminder: !!video.reminder_date,
              reminderDate: video.reminder_date || null,
              hasNotes: !!video.description,
              addedDate: video.created_at, // Keep the original date string
              createdAt: video.created_at, // Keep original for sorting
              url: video.url,
              description: video.description,
              tags: video.tags || []
            };
          });
        setVideos(transformedVideos);
        
        // Calculate statistics
        const notesCount = transformedVideos.filter(video => video.hasNotes).length;
        const remindersCount = transformedVideos.filter(video => video.hasReminder).length;
        
        setNotesCount(notesCount);
        setRemindersCount(remindersCount);
        
        // Update category count
        if (categoryData) {
          setCategory({
            id: categoryData.id,
            name: categoryData.name,
            color: categoryData.color,
            description: categoryData.description,
            count: transformedVideos.length,
            lastUpdated: categoryData.updated_at
          });
        }
      }

      // Fetch screenshots count for this category
      const { count: screenshotsCount, error: screenshotsError } = await supabase
        .from('screenshots')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id);

      if (screenshotsError) {
        console.error('Error fetching screenshots count:', screenshotsError);
        setScreenshotsCount(0);
      } else {
        setScreenshotsCount(screenshotsCount || 0);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryAndVideos();
  }, [id]);

  // Sort videos based on selected criteria
  const sortedVideos = [...videos].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "title-asc":
        return a.title.localeCompare(b.title);
      case "title-desc":
        return b.title.localeCompare(a.title);
      case "reminder":
        // Videos with reminders first, then by newest
        if (a.hasReminder && !b.hasReminder) return -1;
        if (!a.hasReminder && b.hasReminder) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  // Make fetchCategoryAndVideos available for updates
  const refreshVideos = async () => {
    if (!id) return;
    
    try {
      // Only fetch videos, don't reload the entire page or set loading state
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*, reminder_date')
        .eq('category_id', id)
        .order('created_at', { ascending: false });

      if (videosError) {
        console.error('Error fetching videos:', videosError);
        return;
      }

      // Transform the data to match expected format
      const transformedVideos = (videosData || []).map((video: any) => {
        // Detect platform
        let platform = 'Video';
        if (video.url === 'https://placeholder.com' || video.title?.startsWith('Screenshots -')) {
          platform = 'screenshot';
        } else if (video.tags?.[0]) {
          platform = video.tags[0];
        }
        
        return {
          id: video.id,
          title: video.title,
          platform,
          thumbnail: video.thumbnail_url,
          duration: video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : '',
          hasReminder: !!video.reminder_date,
          reminderDate: video.reminder_date || null,
          hasNotes: !!video.description,
          addedDate: video.created_at, // Keep the original date string
          createdAt: video.created_at, // Keep original for sorting
          url: video.url,
          description: video.description,
          tags: video.tags || []
        };
      });
      
      setVideos(transformedVideos);
      
      // Calculate statistics
      const notesCount = transformedVideos.filter(video => video.hasNotes).length;
      const remindersCount = transformedVideos.filter(video => video.hasReminder).length;
      
      setNotesCount(notesCount);
      setRemindersCount(remindersCount);
      
      // Update category count without affecting navigation
      if (category) {
        setCategory({
          ...category,
          count: transformedVideos.length
        });
      }
    } catch (error) {
      console.error('Error refreshing videos:', error);
    }
  };

  const handleSaveCategory = async (updatedCategory: Category) => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: updatedCategory.name,
          description: updatedCategory.description,
          color: updatedCategory.color,
        })
        .eq('id', id);

      if (error) throw error;

      // Refresh the category data
      fetchCategoryAndVideos();
      
      toast({
        title: "Category Updated",
        description: "Your category has been successfully updated.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      // First delete all videos in this category
      const { error: videosError } = await supabase
        .from('videos')
        .delete()
        .eq('category_id', categoryId);

      if (videosError) throw videosError;

      // Then delete the category
      const { error: categoryError } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (categoryError) throw categoryError;

      // Navigate back to categories page
      navigate('/categories');
      
      toast({
        title: "Category Deleted",
        description: "Category and all its videos have been removed.",
        variant: "info",
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLayoutChange = (mode: 'list' | 'grid') => {
    setLayoutMode(mode);
    localStorage.setItem('videoLayoutMode', mode);
  };


  return (
    <div className="min-h-screen bg-background">
      <Header title={categoryName} showBack={true}>
        <div className="flex items-center gap-2">
          {!loading && videos.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddChoiceSheet(true)}
              className="text-primary hover:text-primary/90"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add your item
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Category
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Category
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Header>
      
      <main className="pb-20 px-4 pt-6">
        {/* Category Details and Statistics */}
        <div className="space-y-4 mb-6">
          {/* Category Info */}
          {!loading && category ? (
            <div className="bg-card rounded-lg p-6 shadow-card border border-border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{categoryName}</h2>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Last updated</p>
                  <p className="text-sm font-medium text-foreground">
                    {categoryUpdatedAt ? getTimeAgo(categoryUpdatedAt) : 'N/A'}
                  </p>
                </div>
              </div>
              
              {/* Statistics Row */}
              <div className="grid grid-cols-4 gap-3 place-items-center px-2">
                {/* Videos */}
                <div className="flex flex-col items-center text-center">
                  <div 
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 text-white shadow-lg ${getCategoryGradientClass(category.color)}`}
                    style={{ 
                      background: category.color === 'purple-cosmic' 
                        ? 'linear-gradient(135deg, #9F7AEA 0%, #6B46C1 100%)' 
                        : undefined 
                    }}
                  >
                    <Video className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold text-foreground">{videos.filter(v => v.platform !== 'screenshot').length}</span>
                </div>
                
                {/* Notes */}
                <div className="flex flex-col items-center text-center">
                  <div 
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 text-white shadow-lg ${getCategoryGradientClass(category.color)}`}
                    style={{ 
                      background: category.color === 'purple-cosmic' 
                        ? 'linear-gradient(135deg, #9F7AEA 0%, #6B46C1 100%)' 
                        : undefined 
                    }}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold text-foreground">{notesCount}</span>
                </div>
                
                {/* Screenshots */}
                <div className="flex flex-col items-center text-center">
                  <div 
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 text-white shadow-lg ${getCategoryGradientClass(category.color)}`}
                    style={{ 
                      background: category.color === 'purple-cosmic' 
                        ? 'linear-gradient(135deg, #9F7AEA 0%, #6B46C1 100%)' 
                        : undefined 
                    }}
                  >
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold text-foreground">{screenshotsCount}</span>
                </div>
                
                {/* Reminders */}
                <div className="flex flex-col items-center text-center">
                  <div 
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 text-white shadow-lg ${getCategoryGradientClass(category.color)}`}
                    style={{ 
                      background: category.color === 'purple-cosmic' 
                        ? 'linear-gradient(135deg, #9F7AEA 0%, #6B46C1 100%)' 
                        : undefined 
                    }}
                  >
                    <Bell className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold text-foreground">{remindersCount}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-lg p-6 shadow-card border border-border animate-pulse">
              <div className="flex items-center justify-between mb-6">
                <div className="h-6 bg-muted rounded w-24"></div>
                <div className="text-right space-y-1">
                  <div className="h-3 bg-muted rounded w-16"></div>
                  <div className="h-3 bg-muted rounded w-12"></div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-3 place-items-center px-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-muted mb-2"></div>
                    <div className="h-5 bg-muted rounded w-8"></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls Row */}
          <div className="flex justify-between items-center">
            {/* Layout Toggle */}
            <div className="flex items-center gap-2 bg-card rounded-lg p-1 border border-border">
              <Button
                variant={layoutMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleLayoutChange('list')}
                className="h-8 w-8 p-0"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={layoutMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleLayoutChange('grid')}
                className="h-8 w-8 p-0"
              >
                <Grid className="w-4 h-4" />
              </Button>
            </div>

            {/* Sort Controls */}
            {videos.length > 1 && (
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48 bg-card border-border">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                  <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                  <SelectItem value="reminder">Reminders First</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Videos List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-lg p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-16 h-12 bg-muted rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedVideos.length > 0 ? (
          layoutMode === 'list' ? (
            <div className="space-y-4">
              {sortedVideos.map((video) => (
                <VideoItem key={video.id} video={video} category={category} onVideoUpdated={refreshVideos} inCategoryView={true} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedVideos.map((video) => (
                <VideoGridItem key={video.id} video={video} category={category} onVideoUpdated={refreshVideos} inCategoryView={true} />
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-16">
            <Video className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No videos or screenshots in this category yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Start adding videos and screenshots to organize your content
            </p>
            <Button
              onClick={() => setShowAddChoiceSheet(true)}
              className="bg-gradient-primary hover:shadow-elevated transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add your first item
            </Button>
          </div>
        )}
      </main>

      {/* Add Choice Sheet */}
      <Sheet open={showAddChoiceSheet} onOpenChange={setShowAddChoiceSheet}>
        <SheetContent side="bottom" className="max-w-md mx-auto">
          <SheetHeader>
            <SheetTitle>What would you like to add?</SheetTitle>
            <SheetDescription>
              Choose between adding a video or a screenshot to this category
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 py-6">
            <Button
              onClick={() => {
                setShowAddChoiceSheet(false);
                navigate(`/category/${id}/add-video`);
              }}
              className="h-auto py-3 bg-gradient-primary hover:shadow-elevated transition-all duration-300 justify-start px-4"
            >
              <Video className="w-5 h-5 mr-3 flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-sm">Add Video</div>
                <div className="text-xs opacity-90">Add a video URL to this category</div>
              </div>
            </Button>
            <Button
              onClick={() => {
                setShowAddChoiceSheet(false);
                navigate(`/category/${id}/add-screenshot`);
              }}
              className="h-auto py-3 bg-gradient-primary hover:shadow-elevated transition-all duration-300 justify-start px-4"
            >
              <Camera className="w-5 h-5 mr-3 flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-sm">Add Screenshot</div>
                <div className="text-xs opacity-90">Upload screenshot images</div>
              </div>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      

      {/* Edit Category Dialog */}
      <EditCategoryDialog
        category={category}
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSave={handleSaveCategory}
      />

      {/* Delete Category Dialog */}
      <DeleteCategoryDialog
        category={category}
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onDelete={handleDeleteCategory}
      />
    </div>
  );
};

export default CategoryDetail;