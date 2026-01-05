import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X, FileText, Tag as TagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const AddNote = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "",
    tags: [] as string[],
    newTag: ""
  });

  const categories = ["AI Tools", "Fitness Routines", "Cooking Recipes", "Photography Tips", "Music Production"];
  
  const categoryColors: { [key: string]: string } = {
    "AI Tools": "blue-ocean",
    "Fitness Routines": "green-emerald",
    "Cooking Recipes": "lime-forest",
    "Photography Tips": "teal-navy",
    "Music Production": "lime-vibrant",
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    if (typeof value === 'string' && (field === 'content' || field === 'description')) {
      // Use lighter sanitization for content fields to preserve spaces
      const sanitizedValue = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
        .slice(0, 2000); // Limit length
      setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleAddTag = () => {
    if (formData.newTag.trim() && !formData.tags.includes(formData.newTag.trim())) {
      const newTags = [...formData.tags, formData.newTag.trim()];
      setFormData(prev => ({ ...prev, tags: newTags, newTag: "" }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = formData.tags.filter(tag => tag !== tagToRemove);
    setFormData(prev => ({ ...prev, tags: newTags }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only validate that required fields are not empty, don't trim content fields
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Note title is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.content) {
      toast({
        title: "Error",
        description: "Note content is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: "Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    // Here you would typically save to your backend/state management
    toast({
      title: "Success!",
      description: `Note "${formData.title}" has been created`,
    });

    // Navigate back to notes
    navigate("/notes");
  };

  const handleCancel = () => {
    navigate("/notes");
  };

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
      case "lime-vibrant":
        return "bg-gradient-lime-vibrant";
      default:
        return "bg-gradient-blue-ocean";
    }
  };

  const currentCategoryColor = categoryColors[formData.category] || "blue-ocean";

  return (
    <div className="min-h-screen bg-background">
      <Header title="Add New Note" showBack={true} />
      
      <main className="p-4 pb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Note Preview */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-card">
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                  getColorClasses(currentCategoryColor)
                )}>
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground line-clamp-1">
                    {formData.title || "Note Title"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {formData.category || "Select Category"}
                  </p>
                  {formData.content && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {formData.content}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Note Details */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Note Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title Field */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium text-foreground">
                  Note Title *
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Key Insights from Video"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="bg-card border-border focus:ring-primary"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.title.length}/100 characters
                </p>
              </div>

              {/* Category Field */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Category *
                </Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                  <SelectTrigger className="bg-card border-border">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Content Field */}
              <div className="space-y-2">
                <Label htmlFor="content" className="text-sm font-medium text-foreground">
                  Note Content *
                </Label>
                <Textarea
                  id="content"
                  placeholder="Write your note content here..."
                  value={formData.content}
                  onChange={(e) => handleInputChange("content", e.target.value)}
                  className="bg-card border-border focus:ring-primary min-h-[120px] resize-none"
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.content.length}/2000 characters
                </p>
              </div>

              {/* Tags Field */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Tags (Optional)
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag"
                    value={formData.newTag}
                    onChange={(e) => handleInputChange("newTag", e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="bg-card border-border focus:ring-primary"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTag}
                    disabled={!formData.newTag.trim() || formData.tags.includes(formData.newTag.trim())}
                    className="border-border hover:bg-muted"
                  >
                    <TagIcon className="w-4 h-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                        {tag} <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
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
              disabled={!formData.title.trim() || !formData.content || !formData.category}
            >
              <Save className="w-4 h-4 mr-2" />
              Create Note
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AddNote;