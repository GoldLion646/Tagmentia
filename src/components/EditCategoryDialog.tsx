import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Save, X, Palette } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { sanitizeInput, sanitizeInputWithTrim, sanitizeContent } from "@/utils/inputSanitization";

interface Category {
  id: string;
  name: string;
  count: number;
  color: string;
  lastUpdated: string;
  description?: string;
}

interface EditCategoryDialogProps {
  category: Category | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCategory: Category) => void;
}

const colorOptions = [
  { name: "Blue Ocean", value: "blue-ocean", class: "bg-gradient-blue-ocean" },
  { name: "Lime Forest", value: "lime-forest", class: "bg-gradient-lime-forest" },
  { name: "Green Emerald", value: "green-emerald", class: "bg-gradient-green-emerald" },
  { name: "Teal Navy", value: "teal-navy", class: "bg-gradient-teal-navy" },
  { name: "Purple Cosmic", value: "purple-cosmic", class: "bg-gradient-purple-cosmic" },
  { name: "Cyan Azure", value: "cyan-azure", class: "bg-gradient-cyan-azure" },
  { name: "Lime Vibrant", value: "lime-vibrant", class: "bg-gradient-lime-vibrant" },
  { name: "Red Fire", value: "red-fire", class: "bg-gradient-red-fire" },
  { name: "Orange Sunset", value: "orange-sunset", class: "bg-gradient-orange-sunset" },
];

export const EditCategoryDialog = ({ category, isOpen, onClose, onSave }: EditCategoryDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "blue-ocean"
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || "",
        color: category.color
      });
    }
  }, [category]);

  const handleInputChange = (field: string, value: string) => {
    const sanitizedValue = field === 'description' ? sanitizeContent(value) : sanitizeInput(value);
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sanitizeInputWithTrim(formData.name)) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.name.length > 19) {
      toast({
        title: "Error",
        description: "Category name must be less than 20 characters",
        variant: "destructive",
      });
      return;
    }

    if (category) {
      const updatedCategory = {
        ...category,
        name: sanitizeInputWithTrim(formData.name),
        description: formData.description,
        color: formData.color,
        lastUpdated: "Just now"
      };

      onSave(updatedCategory);
      
      toast({
        title: "Success!",
        description: `Category "${formData.name}" has been updated`,
      });
      
      onClose();
    }
  };

  if (!category) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>Edit Category</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="space-y-6 pb-4">
              {/* Category Preview */}
              <Card className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-card">
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center",
                      colorOptions.find(c => c.value === formData.color)?.class || "bg-gradient-blue-ocean"
                    )}>
                      <Palette className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {formData.name || "Category Name"}
                      </h3>
                      <p className="text-sm text-muted-foreground">{category.count} videos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-sm font-medium text-foreground">
                    Category Name *
                  </Label>
                  <Input
                    id="edit-name"
                    placeholder="e.g., AI Tools"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="bg-card border-border focus:ring-primary"
                    maxLength={19}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.name.length}/19 characters (max)
                  </p>
                </div>

                {/* Description Field */}
                <div className="space-y-2">
                  <Label htmlFor="edit-description" className="text-sm font-medium text-foreground">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="edit-description"
                    placeholder="What kind of videos will you save in this category?"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="bg-card border-border focus:ring-primary min-h-[80px] resize-none"
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.description.length}/200 characters
                  </p>
                </div>

                {/* Color Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">
                    Category Color
                  </Label>
                  <div className="grid grid-cols-5 gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => handleInputChange("color", color.value)}
                        className={cn(
                          "relative w-10 h-10 rounded-lg transition-all duration-200",
                          color.class,
                          "hover:scale-105 hover:shadow-card",
                          formData.color === color.value && "ring-2 ring-primary ring-offset-1"
                        )}
                      >
                        {formData.color === color.value && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-primary rounded-full" />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <form onSubmit={handleSubmit} className="flex-shrink-0 px-6 pb-6 pt-4 border-t border-border bg-background">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-border hover:bg-muted"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-primary hover:shadow-elevated transition-all duration-300"
              disabled={!formData.name.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};