import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeInput, sanitizeInputWithTrim, sanitizeContent, validateTextInput } from "@/utils/inputSanitization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X, Palette } from "lucide-react";
import { Header } from "@/components/Header";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";

const AddCategory = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "blue-ocean"
  });
  const [saving, setSaving] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { limits, canCreateCategory } = useSubscriptionLimits();

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

  const handleInputChange = (field: string, value: string) => {
    const sanitizedValue = field === 'description' ? sanitizeContent(value) : sanitizeInput(value);
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Input validation
    const nameValidation = validateTextInput(formData.name, 1, 19, 'Category name');
    if (!nameValidation.isValid) {
      toast({
        title: "Invalid Input",
        description: nameValidation.message,
        variant: "destructive",
      });
      return;
    }

    const descriptionValidation = validateTextInput(formData.description, 0, 200, 'Description');
    if (!descriptionValidation.isValid) {
      toast({
        title: "Invalid Input",
        description: descriptionValidation.message,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Not signed in",
          description: "Please log in to create categories.",
          variant: "destructive",
        });
        return;
      }

      // Check subscription limits before creating category
      const canCreate = await canCreateCategory();

      if (!canCreate) {
        setShowUpgradeModal(true);
        return;
      }

      const { error } = await supabase.from('categories').insert({
        name: sanitizeInputWithTrim(formData.name),
        description: formData.description || null,
        color: formData.color,
        user_id: user.id,
      });

      if (error) {
        console.error('Insert category error:', error);
        toast({
          title: "Failed to save",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success!",
        description: `Category "${formData.name}" has been created`,
      });

      navigate("/categories");
    } catch (err: any) {
      console.error('Unexpected error saving category:', err);
      toast({
        title: "Unexpected error",
        description: "Could not create category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate("/categories");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Add New Category" showBack={true} />
      
      <main className="container mx-auto p-4 pb-8 max-w-7xl">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Form Fields */}
            <div className="space-y-6">
              {/* Category Details */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Category Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Name Field */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-foreground">
                      Category Name *
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g., AI Tools, Fitness"
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
                    <Label htmlFor="description" className="text-sm font-medium text-foreground">
                      Description (Optional)
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="What kind of videos will you save in this category?"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      className="bg-card border-border focus:ring-primary min-h-[100px] resize-none"
                      maxLength={200}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.description.length}/200 characters
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Color Selection */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Category Color</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => handleInputChange("color", color.value)}
                        className={cn(
                          "relative w-full aspect-square rounded-lg transition-all duration-200 max-w-16",
                          color.class,
                          "hover:scale-105 hover:shadow-card",
                          formData.color === color.value && "ring-2 ring-primary ring-offset-2"
                        )}
                        title={color.name}
                      >
                        {formData.color === color.value && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                              <div className="w-2.5 h-2.5 bg-primary rounded-full" />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 border-border hover:bg-muted"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-primary hover:shadow-elevated transition-all duration-300"
                  disabled={!formData.name.trim() || saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Creating..." : "Create Category"}
                </Button>
              </div>
            </div>

            {/* Right Column - Preview (Sticky) */}
            <div className="lg:sticky lg:top-4 lg:self-start">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-card border border-border">
                    <div className={cn(
                      "w-16 h-16 rounded-lg flex items-center justify-center shrink-0",
                      colorOptions.find(c => c.value === formData.color)?.class || "bg-gradient-blue-ocean"
                    )}>
                      <Palette className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-lg truncate">
                        {formData.name || "Category Name"}
                      </h3>
                      <p className="text-sm text-muted-foreground">0 videos</p>
                      {formData.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {formData.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded-lg">
                    <p className="font-medium">This is how your category will appear in the category list.</p>
                    <p>Choose a color that helps you quickly identify this category.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </main>

      {/* Upgrade Modal */}
      <UpgradePromptModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentPlan={limits?.plan_name || 'Free Plan'}
        feature="Create more categories"
        limitType="categories"
      />
    </div>
  );
};

export default AddCategory;