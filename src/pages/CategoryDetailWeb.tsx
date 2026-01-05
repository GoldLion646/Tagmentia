import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const CategoryDetailWeb = () => {
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
  const [showAddChoiceDialog, setShowAddChoiceDialog] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('videoLayoutMode') as 'list' | 'grid') || 'grid';
  });

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
    return gradientMap[colorName] || 'bg-gradient-primary';
  };

  const fetchCategoryAndVideos = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
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
          setCategory({
            id: categoryData.id,
            name: categoryData.name,
            color: categoryData.color,
            description: categoryData.description,
            count: 0,
            lastUpdated: categoryData.updated_at
          });
        }
      }

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
            addedDate: video.created_at,
            createdAt: video.created_at,
            url: video.url,
            description: video.description,
            tags: video.tags || []
          };
        });
        setVideos(transformedVideos);
        
        const notesCount = transformedVideos.filter(video => video.hasNotes).length;
        const remindersCount = transformedVideos.filter(video => video.hasReminder).length;
        
        setNotesCount(notesCount);
        setRemindersCount(remindersCount);
        
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
        if (a.hasReminder && !b.hasReminder) return -1;
        if (!a.hasReminder && b.hasReminder) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  const refreshVideos = async () => {
    if (!id) return;
    
    try {
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*, reminder_date')
        .eq('category_id', id)
        .order('created_at', { ascending: false });

      if (videosError) {
        console.error('Error fetching videos:', videosError);
        return;
      }

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
          addedDate: video.created_at,
          createdAt: video.created_at,
          url: video.url,
          description: video.description,
          tags: video.tags || []
        };
      });
      
      setVideos(transformedVideos);
      
      const notesCount = transformedVideos.filter(video => video.hasNotes).length;
      const remindersCount = transformedVideos.filter(video => video.hasReminder).length;
      
      setNotesCount(notesCount);
      setRemindersCount(remindersCount);
      
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

      fetchCategoryAndVideos();
      
      toast({
        title: "Category Updated",
        description: "Your category has been successfully updated.",
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
      const { error: videosError } = await supabase
        .from('videos')
        .delete()
        .eq('category_id', categoryId);

      if (videosError) throw videosError;

      const { error: categoryError } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (categoryError) throw categoryError;

      navigate('/categories-web');
      
      toast({
        title: "Category Deleted",
        description: "Category and all its videos have been removed.",
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
              onClick={() => setShowAddChoiceDialog(true)}
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
      
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Category Info & Stats */}
          <div className="lg:col-span-1 space-y-4">
            {/* Category Info Card */}
            {!loading && category ? (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{categoryName}</span>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryGradientClass(category.color)}`}>
                      <Video className="w-5 h-5 text-white" />
                    </div>
                  </CardTitle>
                  {category.description && (
                    <p className="text-sm text-muted-foreground mt-2">{category.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Last updated: <span className="font-medium text-foreground">{categoryUpdatedAt ? getTimeAgo(categoryUpdatedAt) : 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-card animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-32"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </CardContent>
              </Card>
            )}

            {/* Statistics Cards */}
            {!loading && category ? (
              <div className="space-y-3">
                <Card className="shadow-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getCategoryGradientClass(category.color)}`}>
                        <Video className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Videos</p>
                        <p className="text-2xl font-bold text-foreground">{videos.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getCategoryGradientClass(category.color)}`}>
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-2xl font-bold text-foreground">{notesCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getCategoryGradientClass(category.color)}`}>
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Screenshots</p>
                        <p className="text-2xl font-bold text-foreground">{screenshotsCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getCategoryGradientClass(category.color)}`}>
                        <Bell className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Reminders</p>
                        <p className="text-2xl font-bold text-foreground">{remindersCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="shadow-card animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-12 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Videos */}
          <div className="lg:col-span-2 space-y-4">
            {/* Controls */}
            <Card className="shadow-card">
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-1">
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

                {videos.length > 1 && (
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-52 bg-card border-border">
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                      <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                      <SelectItem value="reminder">Has Reminders</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            {/* Videos List/Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-muted-foreground mt-4">Loading videos...</p>
              </div>
            ) : sortedVideos.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No videos or screenshots in this category yet</h3>
                  <p className="text-muted-foreground mb-6">Start adding videos and screenshots to organize your content</p>
                  <Button onClick={() => setShowAddChoiceDialog(true)} className="bg-gradient-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Add your first item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className={layoutMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
                {sortedVideos.map((video) => (
                  layoutMode === 'grid' ? (
                    <VideoGridItem
                      key={video.id}
                      video={video}
                      onVideoUpdated={refreshVideos}
                      inCategoryView={true}
                    />
                  ) : (
                    <VideoItem
                      key={video.id}
                      video={video}
                      onVideoUpdated={refreshVideos}
                      inCategoryView={true}
                    />
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Dialogs */}
      {category && (
        <>
          <EditCategoryDialog
            isOpen={showEditDialog}
            onClose={() => setShowEditDialog(false)}
            category={category}
            onSave={handleSaveCategory}
          />
          <DeleteCategoryDialog
            isOpen={showDeleteDialog}
            onClose={() => setShowDeleteDialog(false)}
            category={category}
            onDelete={handleDeleteCategory}
          />
        </>
      )}

      {/* Add Choice Dialog */}
      <Dialog open={showAddChoiceDialog} onOpenChange={setShowAddChoiceDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>What would you like to add?</DialogTitle>
            <DialogDescription>
              Choose between adding a video or a screenshot to this category
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button
              onClick={() => {
                setShowAddChoiceDialog(false);
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
                setShowAddChoiceDialog(false);
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
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryDetailWeb;
