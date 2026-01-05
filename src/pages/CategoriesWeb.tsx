import { useState, useEffect } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, SlidersHorizontal, FolderOpen } from "lucide-react";
import { Header } from "@/components/Header";
import { CategoryCard } from "@/components/CategoryCard";
import { EditCategoryDialog } from "@/components/EditCategoryDialog";
import { DeleteCategoryDialog } from "@/components/DeleteCategoryDialog";
import { LayoutToggle } from "@/components/LayoutToggle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";

interface Category {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  count: number;
  updatedAt: string;
  lastUpdated: string;
}

const CategoriesWeb = () => {
  const navigate = useNavigate();
  const { layoutType } = useDeviceDetection();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
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
    return date.toLocaleDateString();
  };

  useEffect(() => {
    if (layoutType === 'mobile') {
      navigate('/categories', { replace: true });
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

  const handleCategoryClick = (category: any) => {
    navigate(`/category-web/${category.id}`);
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
        <LayoutToggle />
        <Link to="/categories/add">
          <Button className="bg-gradient-primary hover:shadow-elevated transition-all duration-300">
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </Link>
      </Header>
      
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Search and Filter */}
        <div className="flex gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border focus:ring-primary"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 bg-card border-border">
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

        {/* Categories Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-card rounded-lg p-6 shadow-card animate-pulse">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

export default CategoriesWeb;
