import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onAvatarChange: (avatarUrl: string | null) => void;
  size?: "sm" | "md" | "lg";
  showUploadButton?: boolean;
  disabled?: boolean;
}

export const AvatarUpload = ({ 
  currentAvatarUrl, 
  onAvatarChange, 
  size = "md", 
  showUploadButton = true,
  disabled = false 
}: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-16 w-16", 
    lg: "h-24 w-24"
  };

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true);

      // Validate file type
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        toast({
          title: "Unsupported format",
          description: "Only PNG, JPG, and WebP are supported.",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      // Compress image
      toast({
        title: "Compressing image...",
        description: "This may take a moment",
      });

      const { compressImage } = await import('@/utils/imageCompression');
      const compressedFile = await compressImage(file, 1920, 1920, 50);

      // Check if compressed file is still too large (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (compressedFile.size > maxSize) {
        toast({
          title: "File too large",
          description: "Image still exceeds 5MB after compression. Please use a smaller image.",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Since compression always converts to JPEG, use .jpg extension
      const fileName = `${user.id}/avatar.jpg`;

      // Delete existing avatar if any (always try avatar.jpg)
      const oldFileName = `${user.id}/avatar.jpg`;
      await supabase.storage
        .from('avatars')
        .remove([oldFileName]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL with cache busting
      const timestamp = Date.now();
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = `${data.publicUrl}?t=${timestamp}`;
      setPreviewUrl(avatarUrl);
      onAvatarChange(avatarUrl);

      // Update user metadata
      await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl }
      });

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully",
      });

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload file
      uploadAvatar(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAvatar = async () => {
    try {
      setUploading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Always try to remove avatar.jpg since that's what we upload
      const fileName = `${user.id}/avatar.jpg`;
      await supabase.storage
        .from('avatars')
        .remove([fileName]);

      // Update user metadata
      await supabase.auth.updateUser({
        data: { avatar_url: null }
      });

      setPreviewUrl(null);
      onAvatarChange(null);
      
      toast({
        title: "Avatar removed",
        description: "Your profile picture has been removed",
      });

    } catch (error: any) {
      console.error('Error removing avatar:', error);
      toast({
        title: "Remove failed",
        description: error.message || "Failed to remove avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar className={`${sizeClasses[size]} bg-gradient-primary`}>
          <AvatarImage src={previewUrl || undefined} alt="Avatar" />
          <AvatarFallback className="text-white text-lg font-semibold">
            <Camera className="w-6 h-6" />
          </AvatarFallback>
        </Avatar>
        
        {previewUrl && !disabled && (
          <Button
            size="sm"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            onClick={handleRemoveAvatar}
            disabled={uploading}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {showUploadButton && !disabled && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleButtonClick}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-1" />
            {uploading ? "Uploading..." : previewUrl ? "Change" : "Upload"}
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
};