import { useState } from "react";
import { Youtube, Music, Instagram, Ghost, ExternalLink, Folder, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface AddVideoFormScreenProps {
  url: string;
  title: string;
  thumbnailUrl?: string;
  platform: "youtube" | "tiktok" | "instagram" | "snapchat" | "loom";
  categories: Category[];
  selectedCategoryId?: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  onCategoryClick: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  error?: string;
  thumbnailError?: boolean;
  onRetryThumbnail?: () => void;
}

const platformIcons = {
  youtube: { Icon: Youtube, color: "text-red-500", bgColor: "bg-red-500/10" },
  tiktok: { Icon: Music, color: "text-foreground", bgColor: "bg-muted" },
  instagram: { Icon: Instagram, color: "text-pink-500", bgColor: "bg-pink-500/10" },
  snapchat: { Icon: Ghost, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
};

export const AddVideoFormScreen2 = ({
  url,
  title,
  thumbnailUrl,
  platform,
  categories,
  selectedCategoryId,
  notes,
  onNotesChange,
  onCategoryClick,
  onSave,
  onCancel,
  isSaving = false,
  error,
  thumbnailError,
  onRetryThumbnail,
}: AddVideoFormScreenProps) => {
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const { Icon, color, bgColor } = platformIcons[platform] || platformIcons.youtube;

  const handleCancel = () => {
    // Call the parent's onCancel handler which will show the exit dialog
    onCancel();
  };

  const getColorClasses = (color?: string) => {
    switch (color) {
      case "blue-ocean": return "bg-gradient-blue-ocean";
      case "lime-forest": return "bg-gradient-lime-forest";
      case "green-emerald": return "bg-gradient-green-emerald";
      case "teal-navy": return "bg-gradient-teal-navy";
      case "purple-cosmic": return "bg-gradient-purple-cosmic";
      case "cyan-azure": return "bg-gradient-cyan-azure";
      case "lime-vibrant": return "bg-gradient-lime-vibrant";
      case "red-fire": return "bg-gradient-red-fire";
      case "orange-sunset": return "bg-gradient-orange-sunset";
      default: return "bg-gradient-blue-ocean";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-20 px-4 pt-6">
        {/* Welcome Section - Dashboard Style */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-semibold text-foreground">Add Video</h2>
            <Button variant="ghost" onClick={handleCancel} disabled={isSaving} className="h-10 px-3">
            Cancel
          </Button>
          </div>
          <p className="text-muted-foreground">
            Add a new video to your collection
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Thumbnail Card - Dashboard Style */}
        <Card className="mb-6 shadow-card hover:shadow-elevated transition-all duration-200">
          <CardContent className="p-0">
          {thumbnailUrl && !thumbnailError ? (
            <div className="aspect-video relative group">
              <img
                src={thumbnailUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ) : (
            <div className="aspect-video bg-muted/60 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className={cn("w-20 h-20 md:w-16 md:h-16 mx-auto rounded-full flex items-center justify-center backdrop-blur-md", bgColor)}>
                  <Icon className={cn("w-10 h-10 md:w-8 md:h-8", color)} />
                </div>
                {thumbnailError && onRetryThumbnail && (
                  <Button variant="outline" size="sm" onClick={onRetryThumbnail}>
                    Retry Thumbnail
                  </Button>
                )}
              </div>
            </div>
          )}
          </CardContent>
        </Card>

        {/* Video Info Card - Dashboard Style */}
        <Card className="mb-6 shadow-card hover:shadow-elevated transition-all duration-200">
          <CardContent className="space-y-4 pt-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Video Title</Label>
            <Input
              id="title"
              value={title}
              readOnly
              className="bg-muted/50 border-border/50"
            />
          </div>

          {/* Platform Tag - Dashboard Style */}
          <div className="flex items-center gap-2">
            <div className={cn("px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium", bgColor, color)}>
              <Icon className={cn("w-3.5 h-3.5", color)} />
              <span className={cn("capitalize", color)}>
                {platform}
              </span>
            </div>
          </div>

          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <div className="relative">
              <Input
                id="url"
                value={url}
                readOnly
                className="bg-muted/50 border-border/50 pr-10"
              />
              <button
                onClick={() => window.open(url, "_blank")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category - Card Format */}
          <div className="space-y-2">
            <Label>Category</Label>
            <button
              onClick={onCategoryClick}
              className="w-full"
            >
              {selectedCategory ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-card hover:shadow-card transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center",
                      getColorClasses(selectedCategory.color)
                    )}>
                      <Play className="w-5 h-5 flex-shrink-0 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">
                        {selectedCategory.name}
                      </h3>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-card hover:shadow-card transition-all duration-200 border-2 border-dashed border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center">
                      <Folder className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-muted-foreground">
                        Please choose the category
                      </h3>
                    </div>
                  </div>
                </div>
              )}
            </button>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add notes or context..."
              className="min-h-[100px] resize-none"
            />
          </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-10 text-sm px-8"
          >
            Cancel
          </Button>
          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AddVideoFormScreen2;
