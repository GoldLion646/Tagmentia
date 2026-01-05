import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Clock, Edit, Trash2, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
interface Category {
  id: string | number;
  name: string;
  count: number;
  color: string;
  lastUpdated: string;
}
interface CategoryCardProps {
  category: Category;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
  onCardClick?: (category: Category) => void;
}
export const CategoryCard = ({
  category,
  onEdit,
  onDelete,
  onCardClick
}: CategoryCardProps) => {
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
      // Backwards compatibility
      case "blue-cyan":
        return "bg-gradient-blue-ocean";
      case "pink-purple":
        return "bg-gradient-purple-cosmic";
      case "blue-deep":
        return "bg-gradient-teal-navy";
      case "purple-deep":
        return "bg-gradient-purple-cosmic";
      case "cyan-blue":
        return "bg-gradient-cyan-azure";
      case "red-orange":
        return "bg-gradient-lime-forest";
      case "blue-purple":
        return "bg-gradient-purple-cosmic";
      case "orange-yellow":
        return "bg-gradient-lime-vibrant";
      case "green-mint":
        return "bg-gradient-green-emerald";
      default:
        return "bg-gradient-blue-ocean";
    }
  };
  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(category);
    }
  };
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(category);
    }
  };
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(category);
    }
  };
  // Get primary color for the count text (purple-like color from gradient)
  const getPrimaryColor = (color: string) => {
    // Map category colors to primary purple-like colors
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

  return <Card className="group hover:shadow-elevated transition-all duration-300 transform hover:-translate-y-1 cursor-pointer bg-gradient-card relative" onClick={handleCardClick}>
  <CardContent className="p-4">
    <div className="flex items-start mb-3">
      <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0", getColorClasses(category.color))}>
        <Play className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-2xl font-bold text-primary">{category.count}</p>
        <p className="text-xs text-muted-foreground">{category.count === 1 ? 'item' : 'items'}</p>
      </div>
        
      {(onEdit || onDelete) && <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0" onClick={e => e.stopPropagation()}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onEdit && <DropdownMenuItem onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Category
              </DropdownMenuItem>}
            {onDelete && <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Category
              </DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>}
    </div>
    
    <div>
      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200 mb-1">
        {category.name}
      </h3>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>{category.lastUpdated}</span>
      </div>
    </div>
  </CardContent>
</Card>;
};