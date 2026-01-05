import { ScreenshotCard } from "./ScreenshotCard";
import { Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useState } from "react";

interface Screenshot {
  id: string;
  thumb_320_url: string;
  image_1600_url: string;
  original_url: string;
  format: string;
  size_bytes: number;
  note: string | null;
  created_at: string;
}

interface ScreenshotGridProps {
  screenshots: Screenshot[];
  onDelete: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  isLoading?: boolean;
}

export const ScreenshotGrid = ({ 
  screenshots, 
  onDelete, 
  onUpdateNote,
  isLoading 
}: ScreenshotGridProps) => {
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-video bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (screenshots.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <Camera className="w-16 h-16 mx-auto text-muted-foreground/50" />
        <div>
          <h3 className="text-lg font-semibold mb-1">No screenshots yet</h3>
          <p className="text-sm text-muted-foreground">
            Add your first visual note by uploading a screenshot
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {screenshots.map((screenshot) => (
          <ScreenshotCard
            key={screenshot.id}
            screenshot={screenshot}
            onDelete={onDelete}
            onUpdateNote={onUpdateNote}
            onView={setViewingImage}
          />
        ))}
      </div>

      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="max-w-4xl">
          {viewingImage && (
            <img
              src={viewingImage}
              alt="Screenshot full view"
              className="w-full h-auto"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
