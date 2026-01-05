import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  count: number;
  color: string;
  lastUpdated: string;
}

interface DeleteCategoryDialogProps {
  category: Category | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (categoryId: string) => void;
}

export const DeleteCategoryDialog = ({ category, isOpen, onClose, onDelete }: DeleteCategoryDialogProps) => {
  const handleDelete = () => {
    if (category) {
      onDelete(category.id);
      
      toast({
        title: "Category Deleted",
        description: `"${category.name}" and all its videos have been removed`,
        variant: "info",
      });
      
      onClose();
    }
  };

  if (!category) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Category</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>"{category.name}"</strong>?
            </p>
            {category.count > 0 && (
              <p className="text-destructive font-medium">
                This will permanently delete {category.count} video{category.count !== 1 ? 's' : ''} in this category.
              </p>
            )}
            <p className="text-muted-foreground">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90"
          >
            Delete Category
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};