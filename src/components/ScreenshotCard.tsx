import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Download, 
  Trash2, 
  Eye, 
  FileText, 
  Check, 
  X 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface ScreenshotCardProps {
  screenshot: Screenshot;
  onDelete: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  onView: (url: string) => void;
}

export const ScreenshotCard = ({ 
  screenshot, 
  onDelete, 
  onUpdateNote,
  onView 
}: ScreenshotCardProps) => {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(screenshot.note || "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleSaveNote = () => {
    onUpdateNote(screenshot.id, noteValue);
    setIsEditingNote(false);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(screenshot.original_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screenshot-${screenshot.id}.${screenshot.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      <Card className="group overflow-hidden hover:shadow-card transition-all">
        <div className="relative aspect-video bg-muted">
          {!imageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-muted" />
          )}
          <img
            src={screenshot.thumb_320_url || screenshot.original_url}
            alt="Screenshot"
            className={`w-full h-full object-cover transition-opacity ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              // Fallback to original if thumbnail fails
              if (e.currentTarget.src !== screenshot.original_url) {
                e.currentTarget.src = screenshot.original_url;
              }
            }}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onView(screenshot.image_1600_url || screenshot.original_url)}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatFileSize(screenshot.size_bytes)}</span>
            <span>{formatDistanceToNow(new Date(screenshot.created_at), { addSuffix: true })}</span>
          </div>
          
          {isEditingNote ? (
            <div className="flex gap-2">
              <Input
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                placeholder="Add a note..."
                className="text-sm"
              />
              <Button size="sm" onClick={handleSaveNote}>
                <Check className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setNoteValue(screenshot.note || "");
                  setIsEditingNote(false);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm"
              onClick={() => setIsEditingNote(true)}
            >
              <FileText className="w-4 h-4 mr-2" />
              {screenshot.note || "Add note..."}
            </Button>
          )}
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Screenshot?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The screenshot will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(screenshot.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
