import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeInput, sanitizeContent, validateTextInput } from "@/utils/inputSanitization";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Save, X, FolderOpen, Plus, Camera, BookOpen, Upload, FileImage, Bell, SquarePen } from "lucide-react";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";
import { useStorageQuota } from "@/hooks/useStorageQuota";
import { StorageQuotaMeter } from "@/components/StorageQuotaMeter";
import { useDefaultCategory } from "@/hooks/useDefaultCategory";
import { compressImages } from "@/utils/imageCompression";
import { CategoryPickerModal } from "@/components/share/CategoryPickerModal";
import { DateTimePicker } from "@/components/DateTimePicker";


const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const AddSharedScreen = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    url: "",
    note: "",
    tags: "",
    categoryId: "",
    videoId: "",
    hasReminder: false,
    reminderDate: "",
  });
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const isColdStart = useRef(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    color: "blue-ocean"
  });
  const [screenshotLimits, setScreenshotLimits] = useState<{
    max_screenshots: number;
    current_screenshots: number;
    can_upload: boolean;
  } | null>(null);
  const { limits } = useSubscriptionLimits();
  const { quota, loading: quotaLoading } = useStorageQuota();

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

  const { defaultCategoryId, loading: defaultCategoryLoading } = useDefaultCategory();

  /**
   * Convert data URL to File object
   */
  const dataUrlToFile = (dataUrl: string, fileName: string = 'screenshot.png'): File | null => {
    try {
      const arr = dataUrl.split(",");
      const mimeMatch = arr[0].match(/:(.*?);/);
      let mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

      // Normalize MIME type to match edge function requirements
      if (mimeType === 'image/jpg') {
        mimeType = 'image/jpeg';
      }
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) {
        mimeType = 'image/png'; // Default to PNG if invalid
      }

      // Update filename extension based on MIME type
      const extension = mimeType === 'image/jpeg' ? 'jpg' :
        mimeType === 'image/webp' ? 'webp' : 'png';
      const finalFileName = fileName.includes('.') ?
        fileName.substring(0, fileName.lastIndexOf('.')) + '.' + extension :
        fileName.replace(/\.(png|jpg|jpeg|webp)$/i, '') + '.' + extension;

      const base64Data = arr[1];

      // Decode URL-encoded characters if present
      let decodedBase64 = base64Data;
      try {
        if (base64Data.includes('%')) {
          decodedBase64 = decodeURIComponent(base64Data);
        }
      } catch (e) {
        // If decode fails, try manual replacement
        decodedBase64 = base64Data
          .replace(/%2B/g, '+')
          .replace(/%2F/g, '/')
          .replace(/%3D/g, '=');
      }

      // Clean whitespace
      decodedBase64 = decodedBase64.replace(/\s/g, '');

      // Handle URL-safe base64
      decodedBase64 = decodedBase64.replace(/-/g, '+').replace(/_/g, '/');

      // Add padding if needed
      const paddingNeeded = (4 - (decodedBase64.length % 4)) % 4;
      decodedBase64 = decodedBase64 + '='.repeat(paddingNeeded);

      // Decode base64 to binary
      const binaryString = atob(decodedBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return new File([bytes], fileName, { type: mimeType });
    } catch (error) {
      console.error('Error converting data URL to File:', error);
      return null;
    }
  };

  /**
   * Preview image function - loads and displays image from URL or data URL
   * On mobile, prefers using file path from localStorage over base64 conversion
   */
  const previewImage = async (imageUrl: string) => {
    if (!imageUrl || !imageUrl.trim()) {
      setThumbnailUrl("");
      return;
    }

    const url = imageUrl.trim();

    // Handle data URLs (data:image/...)
    if (url.startsWith('data:image')) {
      try {
        // Set thumbnail URL immediately for faster display
        setThumbnailUrl(url);
        // Convert to File for upload
        const file = dataUrlToFile(url);
        if (file) {
          setImageFile(file);
        }
        // Verify the image loads correctly (but don't block on it)
        const img = new Image();
        img.onload = () => {
          // Image is valid, thumbnail already set
        };
        img.onerror = () => {
          console.error('Error loading data URL preview');
          // Don't clear thumbnailUrl - it might still display correctly
        };
        img.src = url;
      } catch (error) {
        console.error('Error processing data URL:', error);
        setThumbnailUrl("");
      }
      return;
    }

    // Handle HTTP/HTTPS URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      setIsFetchingMetadata(true);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setThumbnailUrl(url);
        setIsFetchingMetadata(false);
        // Try to convert to File for upload
        try {
          fetch(url)
            .then(res => res.blob())
            .then(blob => {
              const file = new File([blob], 'screenshot.png', { type: blob.type });
              setImageFile(file);
            })
            .catch(err => console.error('Error fetching image:', err));
        } catch (error) {
          console.error('Error converting URL to File:', error);
        }
      };
      img.onerror = () => {
        console.error('Error loading URL preview');
        setThumbnailUrl("");
        setIsFetchingMetadata(false);
      };
      img.src = url;
      return;
    }

    // Handle content:// URIs (Android) - use base64 data efficiently
    if (url.startsWith('content://') || Capacitor.isNativePlatform()) {
      try {
        const fileName = localStorage.getItem('sharedImageFileName') || 'screenshot.png';
        const mimeType = localStorage.getItem('sharedImageMimeType') || 'image/png';
        const base64Data = localStorage.getItem('sharedImageBase64');

        if (base64Data) {
          let dataUrl = base64Data;
          // If it's not already a data URL, reconstruct it
          if (!dataUrl.startsWith('data:image')) {
            dataUrl = `data:${mimeType};base64,${base64Data}`;
          }
          
          // Set thumbnail URL immediately for preview
          setThumbnailUrl(dataUrl);
          
          // Convert base64 to File more efficiently using Blob
          try {
            // Extract base64 string (remove data URL prefix if present)
            const base64String = dataUrl.includes(',') 
              ? dataUrl.split(',')[1] 
              : base64Data;
            
            // Safety check: prevent processing extremely large images (>50MB base64)
            const maxBase64Length = 50 * 1024 * 1024; // 50MB in base64
            if (base64String.length > maxBase64Length) {
              throw new Error('Image too large. Please share a smaller image.');
            }
            
            // Decode base64 to binary more efficiently
            const binaryString = atob(base64String);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Create Blob and then File (more memory efficient)
            const blob = new Blob([bytes], { type: mimeType });
            const file = new File([blob], fileName, { type: mimeType });
            
            setImageFile(file);
            console.log('Successfully converted base64 to File:', fileName, 'Size:', file.size, 'bytes');
          } catch (conversionError) {
            console.error('Error converting base64 to File:', conversionError);
            const errorMessage = conversionError instanceof Error 
              ? conversionError.message 
              : 'Could not process shared image. Please try sharing again.';
            
            // Fallback to dataUrlToFile method (only if not a size error)
            if (!errorMessage.includes('too large')) {
              try {
                const file = dataUrlToFile(dataUrl, fileName);
                if (file) {
                  setImageFile(file);
                  console.log('Fallback conversion successful');
                } else {
                  throw new Error('Fallback conversion failed');
                }
              } catch (fallbackError) {
                console.error('Fallback conversion also failed:', fallbackError);
                toast({
                  title: "Error",
                  description: errorMessage,
                  variant: "destructive",
                });
              }
            } else {
              toast({
                title: "Image Too Large",
                description: errorMessage,
                variant: "destructive",
              });
            }
          }
        } else {
          console.warn('No base64 data found for content:// URI');
          setThumbnailUrl("");
        }
      } catch (error) {
        console.error('Error handling content:// URI:', error);
        setThumbnailUrl("");
        toast({
          title: "Error",
          description: "Failed to load shared image. Please try sharing again.",
          variant: "destructive",
        });
      }
      return;
    }
    
    // If no match, try to load from base64 directly as fallback
    try {
      const base64Data = localStorage.getItem('sharedImageBase64');
      const mimeType = localStorage.getItem('sharedImageMimeType') || 'image/png';
      
      if (base64Data) {
        let dataUrl = base64Data;
        if (!dataUrl.startsWith('data:image')) {
          dataUrl = `data:${mimeType};base64,${base64Data}`;
        }
        setThumbnailUrl(dataUrl);
        const file = dataUrlToFile(dataUrl, 'screenshot.png');
        if (file) {
          setImageFile(file);
        }
      }
    } catch (error) {
      console.error('Error loading image from base64 fallback:', error);
    }
  };

  // Initialize URL from query params or localStorage
  useEffect(() => {
    // Check if this is a cold start (app just launched from share intent)
    // Cold start: has pending share data and no referrer or minimal history
    const hasPendingShare = !!localStorage.getItem('pendingShare') || !!localStorage.getItem('sharedImageBase64');
    const noReferrer = !document.referrer || document.referrer === '';
    isColdStart.current = hasPendingShare && (noReferrer || window.history.length <= 2);

    // Get shared URL - check query params first, then localStorage (for Android share intents)
    let sharedUrl = searchParams.get("url") || searchParams.get("text") || "";

    // If no URL in query params, check localStorage for pending share (Android share intent)
    if (!sharedUrl) {
      try {
        const pendingShare = localStorage.getItem('pendingShare');
        if (pendingShare) {
          // Check if it's an image share marker (not the full data URL)
          if (pendingShare === 'IMAGE_SHARED') {
            // Image share marker - check for base64 data directly
            const base64Data = localStorage.getItem('sharedImageBase64');
            const mimeType = localStorage.getItem('sharedImageMimeType') || 'image/png';
            
            if (base64Data) {
              // If it's already a data URL, use it directly
              if (base64Data.startsWith('data:image')) {
                sharedUrl = base64Data;
              } else {
                // Reconstruct data URL from base64
                sharedUrl = `data:${mimeType};base64,${base64Data}`;
              }
            }
          } else {
            // Regular URL share
            sharedUrl = pendingShare;
          }
          // Don't clear it yet - will be cleared on cancel/back
        }
      } catch (error) {
        console.error('Error reading pending share from localStorage:', error);
      }
    }

    // If still no URL, check for base64 image data directly (for Android share intents)
    if (!sharedUrl) {
      try {
        const base64Data = localStorage.getItem('sharedImageBase64');
        const mimeType = localStorage.getItem('sharedImageMimeType') || 'image/png';
        
        if (base64Data) {
          // If it's already a data URL, use it directly
          if (base64Data.startsWith('data:image')) {
            sharedUrl = base64Data;
          } else {
            // Reconstruct data URL from base64
            sharedUrl = `data:${mimeType};base64,${base64Data}`;
          }
        }
      } catch (error) {
        console.error('Error reading shared image base64 from localStorage:', error);
      }
    }

    const decodedUrl = sharedUrl ? decodeURIComponent(sharedUrl) : "";
    
    // Set URL in form data if available
    if (decodedUrl) {
      setFormData(prev => ({ ...prev, url: decodedUrl }));
      // Preview the image
      previewImage(decodedUrl);
    } else {
      // Even if no URL, try to load from base64 directly
      try {
        const base64Data = localStorage.getItem('sharedImageBase64');
        const mimeType = localStorage.getItem('sharedImageMimeType') || 'image/png';
        
        if (base64Data) {
          let dataUrl = base64Data;
          if (!dataUrl.startsWith('data:image')) {
            dataUrl = `data:${mimeType};base64,${base64Data}`;
          }
          previewImage(dataUrl);
        }
      } catch (error) {
        console.error('Error loading image from base64:', error);
      }
    }

    // Set categoryId if provided in URL params, route params, or use default
    const categoryIdFromUrl = searchParams.get("categoryId");
    if (categoryIdFromUrl) {
      setFormData(prev => ({ ...prev, categoryId: categoryIdFromUrl }));
    } else if (categoryId) {
      setFormData(prev => ({ ...prev, categoryId }));
    } else if (defaultCategoryId && !defaultCategoryLoading) {
      // Use default category if available and no other category is set
      setFormData(prev => ({ ...prev, categoryId: defaultCategoryId }));
    }
  }, [searchParams, categoryId, defaultCategoryId, defaultCategoryLoading]);

  // Fetch categories when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, color')
          .order('name');

        if (error) {
          console.error('Error fetching categories:', error);
          return;
        }

        const categoriesData = data || [];
        setCategories(categoriesData);

        // Don't auto-select category - user must manually select
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    if (!defaultCategoryLoading) {
      fetchCategories();
    }
  }, [categoryId, defaultCategoryId, defaultCategoryLoading]);

  // Fetch screenshot limits
  useEffect(() => {
    const fetchScreenshotLimits = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase.rpc('get_user_screenshot_limits', {
          user_uuid: user.id
        });

        if (error) {
          console.error('Error fetching screenshot limits:', error);
          return;
        }

        if (data && data.length > 0) {
          setScreenshotLimits(data[0]);
        }
      } catch (error) {
        console.error('Error fetching screenshot limits:', error);
      }
    };

    fetchScreenshotLimits();
  }, []);

  // Redirect to category creation if no categories exist
  useEffect(() => {
    if (!categoryId && !loadingCategories && categories.length === 0) {
      toast({
        title: "Create a Category First",
        description: "You need to create at least one category before adding screenshots",
      });
      navigate('/categories/add', { replace: true });
    }
  }, [categories, loadingCategories, categoryId, navigate, toast]);


  // Handle back button press - show exit dialog
  useEffect(() => {
    // Only handle on native platforms (Android/iOS)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let cleanup: (() => void) | null = null;

    // Dynamically import Capacitor App plugin only on native platforms
    import('@capacitor/app').then(async ({ App }) => {
      // Listen for back button press
      const listener = await App.addListener('backButton', () => {
        // If warm start (app already running), delete URL first
        if (!isColdStart.current) {
          // Clear all shared screenshot data from localStorage
          try {
            localStorage.removeItem('pendingShare');
            localStorage.removeItem('sharedImageBase64');
            localStorage.removeItem('sharedImageFilePath');
            localStorage.removeItem('sharedImageFileName');
            localStorage.removeItem('sharedImageFileSize');
            localStorage.removeItem('sharedImageMimeType');
          } catch (error) {
            console.error('Error clearing localStorage:', error);
          }

          // Clear form data URL
          setFormData(prev => ({ ...prev, url: "" }));
          setThumbnailUrl("");
          setImageFile(null);
        }

        // Show exit confirmation dialog
        setShowExitDialog(true);
      });

      cleanup = () => {
        listener.remove();
      };
    }).catch((error) => {
      console.warn('Capacitor App plugin not available:', error);
    });

    return () => {
      // Cleanup listener on unmount
      cleanup?.();
    };
  }, []);

  const createCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    if (newCategory.name.trim().length > 19) {
      toast({
        title: "Error",
        description: "Category name must be less than 20 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create categories",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: newCategory.name.trim(),
          description: newCategory.description || null,
          color: newCategory.color,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating category:', error);
        toast({
          title: "Error",
          description: "Failed to create category",
          variant: "destructive",
        });
        return;
      }

      // Add to categories list and select it
      setCategories(prev => [...prev, data]);
      setFormData(prev => ({ ...prev, categoryId: data.id }));
      setShowCreateCategory(false);
      setNewCategory({ name: "", description: "", color: "blue-ocean" });

      toast({
        title: "Success",
        description: "Category created successfully",
      });
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    if (typeof value === 'string') {
      let sanitizedValue: string;
      if (field === 'note') {
        sanitizedValue = sanitizeContent(value);
      } else {
        sanitizedValue = sanitizeInput(value);
      }
      setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Determine which category to use (priority: URL param > formData > default)
    const categoryToUse = categoryId || formData.categoryId || defaultCategoryId;
    
    // Check if category is required
    if (!categoryToUse) {
      toast({
        title: "Error",
        description: "Please select a category for these screenshots",
        variant: "destructive",
      });
      return;
    }

    // Validate note if provided
    if (formData.note) {
      const noteValidation = validateTextInput(formData.note, 0, 500, 'Note');
      if (!noteValidation.isValid) {
        toast({
          title: "Invalid Input",
          description: noteValidation.message,
          variant: "destructive",
        });
        return;
      }
    }

    // Reminder validation is optional - if user selects a date, it will be saved

    // Check if we have an image file
    if (!imageFile && !formData.url.trim()) {
      toast({
        title: "Error",
        description: "Please provide an image to upload",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        toast({
          title: "Error",
          description: "You must be logged in to add screenshots",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Use the category we determined earlier
      const categoryUuid = categoryToUse && isUuid(categoryToUse) ? categoryToUse : null;

      if (!categoryUuid) {
        toast({
          title: "Error",
          description: "Invalid category selected",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Get or create a video for these screenshots
      let videoId = formData.videoId;

      if (!videoId || !isUuid(videoId)) {
        // Create a default video for screenshots without a specific video
        const { data: newVideo, error: videoError } = await supabase
          .from('videos')
          .insert({
            user_id: user.id,
            category_id: categoryUuid,
            title: `Screenshots - ${new Date().toLocaleDateString()}`,
            url: 'https://placeholder.com',
            description: formData.note || 'Screenshot collection',
            tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
            reminder_date: formData.reminderDate ? formData.reminderDate : null,
          })
          .select()
          .single();

        if (videoError || !newVideo) {
          console.error('Error creating video:', videoError);
          toast({
            title: "Error",
            description: "Failed to create video container for screenshots",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        videoId = newVideo.id;
      }

      // Ensure we have a file to upload
      let fileToUpload = imageFile;
      if (!fileToUpload && formData.url.trim().startsWith('data:image')) {
        fileToUpload = dataUrlToFile(formData.url.trim());
      }

      if (!fileToUpload) {
        toast({
          title: "Error",
          description: "Could not process image file for upload",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Compress image before uploading
      toast({
        title: "Compressing image...",
        description: "This may take a moment",
      });


      const compressedFiles = await compressImages([fileToUpload]);


      // Check if compressed file is still too large (5MB max)
      const maxSize = 5 * 1024 * 1024;
      const oversizedFiles = compressedFiles.filter(file => file.size > maxSize);

      if (oversizedFiles.length > 0) {
        toast({
          title: "File Too Large",
          description: "Image still exceeds 5MB after compression. Please use a smaller image.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      console.log("compressedFiles=>" + compressedFiles[0].name);
      // Upload screenshot using the edge function
      const formDataToSend = new FormData();
      formDataToSend.append('files', compressedFiles[0]);

      formDataToSend.append('categoryId', categoryUuid);
      formDataToSend.append('videoId', videoId);
      if (formData.note) {
        formDataToSend.append('note', formData.note);
      }

      const { data, error } = await supabase.functions.invoke('upload-screenshot', {
        body: formDataToSend,
      });

      if (error) {
        console.error('Upload error:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to upload screenshot",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Update video thumbnail with first screenshot
      if (data?.screenshots && data.screenshots.length > 0) {
        const firstScreenshot = data.screenshots[0];
        await supabase
          .from('videos')
          .update({
            thumbnail_url: firstScreenshot.thumb_320_url || firstScreenshot.original_url
          })
          .eq('id', videoId);
      }

      // Success - show toast and navigate
      toast({
        title: "Success!",
        description: `Screenshot uploaded successfully`,
      });

      // Navigate back to category or videos page
      if (categoryId) {
        navigate(`/category/${categoryId}`, { replace: true });
      } else if (categoryUuid) {
        navigate(`/category/${categoryUuid}`, { replace: true });
      } else {
        navigate('/videos', { replace: true });
      }

    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // If warm start (app already running), delete URL first
    if (!isColdStart.current) {
      // Clear all shared screenshot data from localStorage
      try {
        localStorage.removeItem('pendingShare');
        localStorage.removeItem('sharedImageBase64');
        localStorage.removeItem('sharedImageFilePath');
        localStorage.removeItem('sharedImageFileName');
        localStorage.removeItem('sharedImageFileSize');
        localStorage.removeItem('sharedImageMimeType');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }

      // Clear form data URL
      setFormData(prev => ({ ...prev, url: "" }));
      setThumbnailUrl("");
      setImageFile(null);
    }

    // Show exit confirmation dialog
    setShowExitDialog(true);
  };

  const handleExitApp = async () => {
    // Clear all shared screenshot data from localStorage
    try {
      localStorage.removeItem('pendingShare');
      localStorage.removeItem('sharedImageBase64');
      localStorage.removeItem('sharedImageFilePath');
      localStorage.removeItem('sharedImageFileName');
      localStorage.removeItem('sharedImageFileSize');
      localStorage.removeItem('sharedImageMimeType');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }

    // Clear form data URL
    setFormData(prev => ({ ...prev, url: "" }));
    setThumbnailUrl("");
    setImageFile(null);

    // If cold start, close the app
    if (isColdStart.current) {
      if (Capacitor.isNativePlatform()) {
        try {
          const { App } = await import('@capacitor/app');
          App.exitApp();
        } catch (error) {
          console.error('Error exiting app:', error);
        }
      }
    } else {
      // If warm start, navigate away (kill the page)
      if (categoryId) {
        navigate(`/category/${categoryId}`, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }

    setShowExitDialog(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Add Screenshots" showBack={true} />

      <main className="container max-w-7xl mx-auto p-4 md:p-6 lg:p-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preview Image */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Preview Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {thumbnailUrl ? (
                  <div className="space-y-2">
                    <div className="relative w-full rounded-lg overflow-hidden border border-border bg-muted">
                      <img
                        src={imageFile ? URL.createObjectURL(imageFile) : thumbnailUrl}
                        alt="Preview"
                        className="w-full h-auto max-h-[400px] object-contain"
                        onError={() => {
                          console.error('Error loading preview image');
                          setThumbnailUrl("");
                        }}
                      />
                    </div>
                    {isFetchingMetadata && (
                      <p className="text-xs text-muted-foreground text-center">
                        Loading preview...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-border rounded-lg bg-muted/50">
                    <FileImage className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground text-center">
                      No preview available
                    </p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      Image will appear here when shared
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FolderOpen className="w-5 h-5 text-primary" />
                    Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Select Category *
                    </Label>
                    <button
                      onClick={() => setShowCategoryPicker(true)}
                      className="w-full"
                    >
                      {formData.categoryId ? (
                        (() => {
                          const selectedCategory = categories.find((c) => c.id === formData.categoryId);
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
                            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-card hover:shadow-card transition-all duration-200">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center",
                                  getColorClasses(selectedCategory?.color)
                                )}>
                                  <FolderOpen className="w-5 h-5 flex-shrink-0 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-foreground truncate">
                                    {selectedCategory?.name || "Unknown"}
                                  </h3>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-card hover:shadow-card transition-all duration-200 border-2 border-dashed border-border/50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center">
                              <FolderOpen className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-muted-foreground">
                                {loadingCategories ? "Loading categories..." : "Please choose the category"}
                              </h3>
                            </div>
                          </div>
                        </div>
                      )}
                    </button>
                  </div>
                </CardContent>
              </Card>

            {/* Tags and Reminder in a grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tags Section */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="tags" className="text-sm font-medium text-foreground">
                      Screenshot Tags
                    </Label>
                    <Input
                      id="tags"
                      placeholder="tutorial, design, mockup"
                      value={formData.tags}
                      onChange={(e) => handleInputChange("tags", e.target.value)}
                      className="bg-card border-border focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate with commas
                    </p>
                    {formData.tags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {formData.tags.split(',').map((tag, index) => (
                          tag.trim() && (
                            <span
                              key={index}
                              className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20"
                            >
                              {tag.trim()}
                            </span>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Reminder Section */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bell className="w-5 h-5 text-primary" />
                    Reminder
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reminder-date" className="text-sm font-medium text-foreground">
                      Date & Time
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="reminder-date"
                        type="text"
                        readOnly
                        value={formData.reminderDate 
                          ? new Date(formData.reminderDate).toLocaleString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : "Select date and time"}
                        onClick={() => setShowDateTimePicker(true)}
                        className="flex-1 bg-card border-border cursor-pointer"
                        placeholder="Select date and time"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowDateTimePicker(true)}
                        className="shrink-0 border-border hover:bg-muted"
                      >
                        <SquarePen className="h-4 w-4 text-foreground" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notes Section - Full Width */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="note" className="text-sm font-medium text-foreground">
                    Add notes about these screenshots
                  </Label>
                  <Textarea
                    id="note"
                    placeholder="Context, usage, design decisions, etc."
                    value={formData.note}
                    onChange={(e) => handleInputChange("note", e.target.value)}
                    className="bg-card border-border focus:ring-primary min-h-[120px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.note.length}/500 characters
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="md:min-w-[140px] border-border hover:bg-muted"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e)}
                  disabled={isSubmitting || !imageFile || !formData.categoryId}
                  className="md:min-w-[140px] bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Screenshot
                </Button>
              </div>
              {isSubmitting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span>Uploading screenshot...</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Info & Preview */}
          <div className="lg:col-span-1 space-y-6">
            {/* Info Card */}
            <Card className="shadow-card sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Camera className="w-5 h-5 text-primary" />
                  Upload Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <FileImage className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Supported Formats</p>
                      <p className="text-muted-foreground text-xs">PNG, JPEG, JPG, WebP</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Upload className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">File Size</p>
                      <p className="text-muted-foreground text-xs">Maximum 5MB per file</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Camera className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Shared Screenshots</p>
                      <p className="text-muted-foreground text-xs">From Android share intents</p>
                    </div>
                  </div>
                </div>

                {/* Storage Quota Meter */}
                {quota && (
                  <div className="pt-4 border-t border-border">
                    <StorageQuotaMeter
                      used_mb={quota.used_mb}
                      quota_mb={quota.quota_mb}
                      percentage={quota.percentage}
                      is_unlimited={quota.is_unlimited}
                    />
                  </div>
                )}

                {/* Status Indicators */}
                {formData.reminderDate && (
                  <div className="pt-4 border-t border-border space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Bell className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">Reminder Set</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(formData.reminderDate).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <UpgradePromptModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature="screenshots"
        currentPlan={limits?.plan_name || 'Free Plan'}
        limitType="plan_upgrade"
      />

      <CategoryPickerModal
        open={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        categories={categories}
        selectedCategoryId={formData.categoryId}
        onSelectCategory={(categoryId) => {
          handleInputChange("categoryId", categoryId);
          setShowCategoryPicker(false);
        }}
        onCreateNew={() => navigate("/categories/add")}
      />

      {/* DateTime Picker Dialog */}
      <Dialog open={showDateTimePicker} onOpenChange={setShowDateTimePicker}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>Set Date and Time</DialogTitle>
          </DialogHeader>
          <DateTimePicker
            value={formData.reminderDate || new Date().toISOString().slice(0, 16)}
            onChange={(value) => {
              handleInputChange("reminderDate", value);
              // Automatically set hasReminder to true when a date is selected
              if (value) {
                handleInputChange("hasReminder", true);
              }
            }}
            min={new Date().toISOString().slice(0, 16)}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                handleInputChange("reminderDate", "");
                setShowDateTimePicker(false);
              }}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDateTimePicker(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => setShowDateTimePicker(false)}
            >
              Set
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close</AlertDialogTitle>
            <AlertDialogDescription>
              {isColdStart.current 
                ? "Are you sure you want to close the app?"
                : "Are you sure you want to close without saving?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitDialog(false)}>
              No
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExitApp}
              className="bg-destructive hover:bg-destructive/90"
            >
              Yes, {isColdStart.current ? "Close App" : "Close"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AddSharedScreen;

