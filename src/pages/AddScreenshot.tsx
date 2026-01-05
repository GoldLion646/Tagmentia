import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeInput, sanitizeContent, validateTextInput } from "@/utils/inputSanitization";
import { DateTimePicker } from "@/components/DateTimePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Save, X, FolderOpen, Plus, Camera, BookOpen, Upload, FileImage, Bell, SquarePen } from "lucide-react";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";
import { QuotaMeter } from "@/components/QuotaMeter";
import { useStorageQuota } from "@/hooks/useStorageQuota";
import { StorageQuotaMeter } from "@/components/StorageQuotaMeter";
import { useDefaultCategory } from "@/hooks/useDefaultCategory";

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const AddScreenshot = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    note: "",
    tags: "",
    categoryId: "",
    videoId: "",
    hasReminder: false,
    reminderDate: "",
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Array<{id: string; name: string; color: string}>>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
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
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaveAttempted, setAutoSaveAttempted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSelectingFiles, setIsSelectingFiles] = useState(false);

  // Fetch categories when component mounts (only if no categoryId from URL)
  useEffect(() => {
    if (!defaultCategoryLoading) {
      if (!categoryId) {
        fetchCategories();
      } else {
        // If we have a categoryId from URL, set it in form data
        setFormData(prev => ({ ...prev, categoryId }));
      }
      fetchScreenshotLimits();
    }
  }, [categoryId, defaultCategoryLoading]);

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

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, color')
        .order('name');
      
      if (error) {
        console.error('Error fetching categories:', error);
        toast({
          title: "Error",
          description: "Failed to load categories",
          variant: "destructive",
        });
        return;
      }
      
      const categoriesData = data || [];
      setCategories(categoriesData);
      
      // Set default category if available and no categoryId from URL
      if (!categoryId && categoriesData.length > 0) {
        let selectedCategoryId = "";
        if (defaultCategoryId && categoriesData.find(c => c.id === defaultCategoryId)) {
          selectedCategoryId = defaultCategoryId;
        } else if (categoriesData.length === 1) {
          selectedCategoryId = categoriesData[0].id;
        } else if (categoriesData.length > 0) {
          selectedCategoryId = categoriesData[0].id;
        }
        if (selectedCategoryId) {
          setFormData(prev => ({ ...prev, categoryId: selectedCategoryId }));
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

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
      setNewCategory({ name: "", description: "", color: "#3B82F6" });
      
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('File select triggered');
    setIsSelectingFiles(true);
    
    const files = e.target.files;
    console.log("files=>", URL.createObjectURL(files[0]));
    if (!files || files.length === 0) {
      console.log('No files selected');
      setIsSelectingFiles(false);
      return;
    }

    console.log(`Files selected: ${files[0]}`);

    // Check limits before allowing file selection
    if (screenshotLimits && !screenshotLimits.can_upload) {
      setShowUpgradeModal(true);
      setIsSelectingFiles(false);
      return;
    }

    const fileArray = Array.from(files);
    
    // Validate file types
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const invalidFiles = fileArray.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid File Type",
        description: "Only PNG, JPEG, JPG, and WebP images are allowed",
        variant: "destructive",
      });
      return;
    }

    // Check if adding these files would exceed the limit
    const currentCount = screenshotLimits?.current_screenshots || 0;
    const maxCount = screenshotLimits?.max_screenshots || 0;
    const newTotal = currentCount + selectedFiles.length + fileArray.length;
    
    if (maxCount !== -1 && newTotal > maxCount) {
      toast({
        title: "Screenshot Limit Reached",
        description: `You can only upload ${maxCount - currentCount - selectedFiles.length} more screenshot(s)`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFiles(prev => [...prev, ...fileArray]);
    
    // Create preview URLs
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls(prev => [...prev, reader.result as string]);
        setIsSelectingFiles(false);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset selecting state after a short delay in case FileReader doesn't fire
    setTimeout(() => {
      setIsSelectingFiles(false);
    }, 1000);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Auto-save when files are selected and category is selected
  // DISABLED: Auto-save is disabled to allow users to select files and manually save
  useEffect(() => {
    const autoSave = async () => {
      // Disable auto-save - users should manually save screenshots
      return;
      
      // Wait for everything to be ready
      if (defaultCategoryLoading || loadingCategories || autoSaving || autoSaveAttempted || saved) return;
      
      // Get the category to use (from formData or default)
      const categoryToUse = formData.categoryId || defaultCategoryId;
      
      // Only auto-save if:
      // 1. We have files selected
      // 2. We have a category selected (either default or auto-selected)
      // 3. Categories are loaded
      // 4. No categoryId from URL (if from URL, user might want to choose)
      if (selectedFiles.length > 0 && categoryToUse && categories.length > 0 && !categoryId) {
        // Verify the category exists in the loaded categories
        const categoryExists = categories.find(c => c.id === categoryToUse);
        if (!categoryExists) {
          // Category doesn't exist, don't auto-save
          setAutoSaveAttempted(true);
          return;
        }

        // Only auto-save if:
        // - Default category is set and matches selected category, OR
        // - Only one category exists (auto-selected)
        const shouldAutoSave = 
          (defaultCategoryId && categoryToUse === defaultCategoryId) ||
          (categories.length === 1 && categoryToUse === categories[0].id);

        if (!shouldAutoSave) {
          // Multiple categories and no default set - show form for user to choose
          setAutoSaveAttempted(true);
          return;
        }

        // Check screenshot limits
        if (screenshotLimits && !screenshotLimits.can_upload) {
          setAutoSaveAttempted(true);
          return;
        }

        setAutoSaving(true);
        setAutoSaveAttempted(true);
        
        try {
          // Verify user is authenticated
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          
          if (authError || !user) {
            setAutoSaving(false);
            return;
          }

          const categoryUuid = categoryToUse;

          // Create a default video for screenshots
          const { data: newVideo, error: videoError } = await supabase
            .from('videos')
            .insert({
              user_id: user.id,
              category_id: categoryUuid,
              title: `Screenshots - ${new Date().toLocaleDateString()}`,
              url: 'https://placeholder.com',
              description: formData.note || 'Screenshot collection',
            })
            .select()
            .single();

          if (videoError || !newVideo) {
            console.error('Error creating video for screenshots:', videoError);
            setAutoSaving(false);
            return;
          }

          // Compress images before uploading
          const { compressImages } = await import('@/utils/imageCompression');
          const compressedFiles = await compressImages(selectedFiles);

          // Upload screenshots using edge function (same as handleSubmit)
          const formDataToSend = new FormData();
          compressedFiles.forEach((file) => {
            formDataToSend.append('files', file);
          });
          formDataToSend.append('videoId', newVideo.id);
          formDataToSend.append('categoryId', categoryUuid);
          if (formData.note) {
            formDataToSend.append('note', formData.note);
          }

          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            setAutoSaving(false);
            return;
          }

          const uploadResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-screenshot`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: formDataToSend,
          });

          if (!uploadResponse.ok) {
            let errorMessage = 'Failed to upload screenshots';
            try {
              const errorData = await uploadResponse.json();
              errorMessage = errorData.error || errorMessage;
            } catch {
              const errorText = await uploadResponse.text();
              console.error('Error uploading screenshots:', errorText);
            }
            toast({
              title: "Error",
              description: errorMessage,
              variant: "destructive",
            });
            setAutoSaving(false);
            return;
          }


          // Success - screenshots saved automatically
          setSaved(true);
          setFormData(prev => ({ ...prev, categoryId: categoryUuid }));
          const savedCategory = categories.find(c => c.id === categoryUuid);
          toast({
            title: "Saved automatically",
            description: `${selectedFiles.length} screenshot(s) saved to ${savedCategory?.name || 'your category'}`,
          });
        } catch (error: any) {
          console.error("Error auto-saving screenshots:", error);
          // On error, allow manual save
          setAutoSaving(false);
        } finally {
          setAutoSaving(false);
        }
      }
    };

    autoSave();
  }, [selectedFiles, formData.categoryId, defaultCategoryId, categories, defaultCategoryLoading, loadingCategories, autoSaving, autoSaveAttempted, saved, categoryId, screenshotLimits, formData.note, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if category is required (when not adding from within a category)
    if (!categoryId && !formData.categoryId) {
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

    setIsSubmitting(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Error",
          description: "You must be logged in to add screenshots",
          variant: "destructive",
        });
        return;
      }

      const categoryUuid = categoryId && isUuid(categoryId) ? categoryId : 
                           (formData.categoryId && isUuid(formData.categoryId) ? formData.categoryId : null);

      if (!categoryUuid) {
        toast({
          title: "Error",
          description: "Invalid category selected",
          variant: "destructive",
        });
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
            url: 'https://placeholder.com', // Placeholder URL for screenshot-only entries
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
          return;
        }
        
        videoId = newVideo.id;
      }

      // Compress images before uploading
      toast({
        title: "Compressing images...",
        description: "This may take a moment",
      });

      const { compressImages } = await import('@/utils/imageCompression');
      const compressedFiles = await compressImages(selectedFiles);

      // Check if any compressed files are still too large (5MB max)
      const maxSize = 5 * 1024 * 1024;
      const oversizedFiles = compressedFiles.filter(file => file.size > maxSize);
      
      if (oversizedFiles.length > 0) {
        toast({
          title: "File Too Large",
          description: `${oversizedFiles.length} file(s) still exceed 5MB after compression. Please use smaller images.`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Upload each screenshot using the edge function
      const formDataToSend = new FormData();
      compressedFiles.forEach((file, index) => {
        formDataToSend.append('files', file);
      });
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
          description: error.message || "Failed to upload screenshots",
          variant: "destructive",
        });
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
        description: `${selectedFiles.length} screenshot(s) uploaded successfully`,
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
    if (categoryId) {
      navigate(`/category/${categoryId}`);
    } else {
      navigate('/videos');
    }
  };

  // Show success state if auto-saved
  if (saved) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Add Screenshots" showBack={true} />
        <div className="container mx-auto px-4 py-8">
          <Card className="shadow-card max-w-md mx-auto">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <Save className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">Saved Successfully!</h2>
              <p className="text-muted-foreground">
                {selectedFiles.length} screenshot(s) have been saved to your default category.
              </p>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => navigate(`/category/${formData.categoryId}`)}
                  className="flex-1"
                >
                  View Category
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSaved(false);
                    setSelectedFiles([]);
                    setPreviewUrls([]);
                    setAutoSaveAttempted(false);
                  }}
                >
                  Add More
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-background"
      onClick={(e) => {
        // Prevent any clicks from bubbling up when selecting files
        if (isSelectingFiles) {
          e.stopPropagation();
        }
      }}
    >
      <Header title="Add Screenshots" showBack={true} />
      
      <main className="container max-w-7xl mx-auto p-4 md:p-6 lg:p-8 pb-8">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(e);
          }} 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Left Column - Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Screenshot Upload */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Upload Screenshots</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="files" className="text-sm font-medium text-foreground">
                    Select Images *
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="files"
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFileSelect}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="bg-card border-border focus:ring-primary"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const fileInput = document.getElementById('files') as HTMLInputElement;
                        if (fileInput) {
                          fileInput.click();
                        }
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Browse
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: PNG, JPEG, JPG, WebP (Max 5MB per file)
                  </p>
                </div>

                {/* File Previews */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Selected Files ({selectedFiles.length})
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {previewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-border"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {selectedFiles[index].name.substring(0, 15)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quota Meter */}
                {screenshotLimits && (
                  <QuotaMeter
                    current={screenshotLimits.current_screenshots + selectedFiles.length}
                    max={screenshotLimits.max_screenshots}
                    isUnlimited={screenshotLimits.max_screenshots === -1}
                  />
                )}
              </CardContent>
            </Card>

            {/* Category Selection (only show if not adding from within a category) */}
            {!categoryId && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FolderOpen className="w-5 h-5 text-primary" />
                    Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-medium text-foreground">
                      Select Category *
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.categoryId}
                        onValueChange={(value) => handleInputChange("categoryId", value)}
                      >
                        <SelectTrigger className="flex-1 bg-card border-border">
                          <SelectValue placeholder={loadingCategories ? "Loading categories..." : "Choose a category"} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: category.color }}
                                />
                                {category.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Dialog open={showCreateCategory} onOpenChange={setShowCreateCategory}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Create New Category</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="new-category-name">Category Name *</Label>
                              <Input
                                id="new-category-name"
                                value={newCategory.name}
                                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Enter category name"
                                maxLength={19}
                              />
                              <p className="text-xs text-muted-foreground">
                                {newCategory.name.length}/19 characters (max)
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="new-category-description">Description</Label>
                              <Textarea
                                id="new-category-description"
                                value={newCategory.description}
                                onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Enter category description (optional)"
                                className="min-h-[80px] resize-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="new-category-color">Color</Label>
                              <div className="grid grid-cols-5 gap-2">
                                {colorOptions.map((color) => (
                                  <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setNewCategory(prev => ({ ...prev, color: color.value }))}
                                    className={cn(
                                      "aspect-square rounded-md transition-all duration-200 relative",
                                      color.class,
                                      newCategory.color === color.value
                                        ? "ring-2 ring-primary ring-offset-2 scale-105"
                                        : "hover:scale-105"
                                    )}
                                    aria-label={color.name}
                                  >
                                    {newCategory.color === color.value && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-4 h-4 rounded-full bg-white/90 flex items-center justify-center">
                                          <svg className="w-3 h-3 text-primary" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M5 13l4 4L19 7"></path>
                                          </svg>
                                        </div>
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setShowCreateCategory(false)}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={createCategory}
                                className="flex-1 bg-gradient-primary"
                              >
                                Create Category
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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

            {/* Notes Section */}
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

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline" 
                onClick={handleCancel}
                className="flex-1 md:flex-none md:min-w-[140px] border-border hover:bg-muted"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || selectedFiles.length === 0}
                className="flex-1 md:flex-none md:min-w-[140px] bg-gradient-primary hover:shadow-elevated transition-all duration-300"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Screenshots
                  </>
                )}
              </Button>
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
                      <p className="font-medium text-foreground">Multiple Uploads</p>
                      <p className="text-muted-foreground text-xs">Select multiple files at once</p>
                    </div>
                  </div>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Selected Files:</span>
                        <span className="font-medium text-foreground">{selectedFiles.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Size:</span>
                        <span className="font-medium text-foreground">
                          {(selectedFiles.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Indicators */}
                {formData.reminderDate && (
                  <div className="pt-4 border-t border-border space-y-2">
                    {formData.reminderDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Bell className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">Reminder Set</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(formData.reminderDate).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </form>
      </main>

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
                handleInputChange("hasReminder", false);
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

      <UpgradePromptModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentPlan={limits?.plan_name || 'Free Plan'}
        feature="more screenshots"
        limitType="plan_upgrade"
      />
    </div>
  );
};

export default AddScreenshot;
