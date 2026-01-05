import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useStorageQuota } from "@/hooks/useStorageQuota";
import { StorageQuotaMeter } from "@/components/StorageQuotaMeter";

interface ScreenshotUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  categoryId: string;
  remainingQuota: number;
  onUploadComplete: () => void;
}

export const ScreenshotUploadDialog = ({
  open,
  onOpenChange,
  videoId,
  categoryId,
  remainingQuota,
  onUploadComplete,
}: ScreenshotUploadDialogProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [maxUploadMB, setMaxUploadMB] = useState(5);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { quota, loading: quotaLoading, refresh: refreshQuota } = useStorageQuota();

  useEffect(() => {
    // Fetch max upload size from storage policy
    const fetchPolicy = async () => {
      const { data } = await supabase
        .from('storage_policy')
        .select('max_upload_mb')
        .single();
      if (data) {
        setMaxUploadMB(data.max_upload_mb);
      }
    };
    fetchPolicy();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Filter valid files (only check type, not size - compression happens before upload)
    const validFiles = files.filter(file => {
      const isValidType = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
      
      if (!isValidType) {
        toast({
          title: "Unsupported format",
          description: `Only PNG, JPG, JPEG, and WebP are supported.`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });

    // Check quota
    if (selectedFiles.length + validFiles.length > remainingQuota) {
      toast({
        title: "Quota exceeded",
        description: `You can only upload ${remainingQuota} more screenshot(s)`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Compress images before uploading
      toast({
        title: "Compressing images...",
        description: "This may take a moment",
      });

      const { compressImages } = await import('@/utils/imageCompression');
      const compressedFiles = await compressImages(selectedFiles);

      // Check if any compressed files are still too large
      const maxSizeBytes = maxUploadMB * 1024 * 1024;
      const oversizedFiles = compressedFiles.filter(file => file.size > maxSizeBytes);
      
      if (oversizedFiles.length > 0) {
        toast({
          title: "File too large",
          description: `${oversizedFiles.length} file(s) still exceed ${maxUploadMB} MB after compression. Please use smaller images.`,
          variant: "destructive",
        });
        return;
      }

      const formData = new FormData();
      formData.append('videoId', videoId);
      formData.append('categoryId', categoryId);
      compressedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-screenshot`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();

      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${result.uploaded} of ${result.total} screenshot(s)`,
      });

      setSelectedFiles([]);
      refreshQuota();
      onUploadComplete();
      onOpenChange(false);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload screenshots",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Screenshots</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!quotaLoading && quota && (
            <StorageQuotaMeter
              used_mb={quota.used_mb}
              quota_mb={quota.quota_mb}
              percentage={quota.percentage}
              is_unlimited={quota.is_unlimited}
            />
          )}

          {remainingQuota === 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You've reached your screenshot limit. Upgrade your plan to upload more.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                Remaining screenshot slots: <span className="font-semibold">{remainingQuota}</span>
              </div>

              <div
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Click to upload screenshots</p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, or WebP (max {maxUploadMB}MB each)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Images will be automatically optimized and compressed
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    Selected files ({selectedFiles.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                          disabled={uploading}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-center text-muted-foreground">
                    Uploading screenshots...
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
