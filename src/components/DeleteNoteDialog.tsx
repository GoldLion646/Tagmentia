import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Note } from "@/hooks/useNotes";

interface DeleteNoteDialogProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (noteId: string) => void;
}

export const DeleteNoteDialog = ({ note, isOpen, onClose, onDelete }: DeleteNoteDialogProps) => {
  const handleConfirmDelete = () => {
    if (note) {
      onDelete(note.id);
      
      toast({
        title: "Note deleted",
        description: `"${note.title}" has been permanently deleted`,
      });
      
      onClose();
    }
  };

  if (!note) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Delete Note
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">
                  Are you sure you want to delete this note?
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  This action cannot be undone. The note "{note.title}" will be permanently deleted.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-card p-3 rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-blue-ocean rounded flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h4 className="font-medium text-foreground line-clamp-1">{note.title}</h4>
                <p className="text-sm text-muted-foreground">{note.category}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {note.content}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-border hover:bg-muted"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmDelete}
            className="flex-1"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Note
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};