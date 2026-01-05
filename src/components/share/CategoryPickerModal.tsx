import { useState } from "react";
import { Check, Plus, Folder } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface CategoryPickerModalProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategoryId?: string;
  onSelectCategory: (categoryId: string) => void;
  onCreateNew?: () => void;
}

export const CategoryPickerModal = ({
  open,
  onClose,
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCreateNew,
}: CategoryPickerModalProps) => {
  const handleSelect = (categoryId: string) => {
    onSelectCategory(categoryId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Category</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid grid-cols-3 gap-3">
            {categories.map((category) => {
              const isSelected = category.id === selectedCategoryId;
              return (
                <button
                  key={category.id}
                  onClick={() => handleSelect(category.id)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all hover:bg-accent/50 min-h-[100px]",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border/50 bg-card"
                  )}
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: category.color
                        ? `${category.color}20`
                        : "hsl(var(--muted))",
                    }}
                  >
                    <Folder
                      className="w-6 h-6"
                      style={{
                        color: category.color || "hsl(var(--muted-foreground))",
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground text-center line-clamp-2">
                    {category.name}
                  </span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary absolute top-2 right-2" />
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {onCreateNew && (
          <Button
            onClick={() => {
              onCreateNew();
              onClose();
            }}
            variant="outline"
            className="w-full h-12 mt-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Category
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};
