import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeInput, sanitizeContent, sanitizeUrl, validateTextInput } from "@/utils/inputSanitization";
import { DateTimePicker } from "@/components/DateTimePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Save, X, Link2, Play, BookOpen, Bell, Calendar as CalendarIcon, Clock, FolderOpen, Plus, SquarePen } from "lucide-react";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";
import { callEdgeFunction } from "@/utils/edgeFunctionCall";

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const extractThumbnail = (url: string, platform: string): string | null => {
  try {
    if (platform.toLowerCase() === 'youtube') {
      // Extract YouTube video ID from various URL formats
      const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = url.match(youtubeRegex);
      if (match && match[1]) {
        return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
      }
    } else if (platform.toLowerCase() === 'instagram') {
      // For Instagram, use a fallback placeholder - the real thumbnail will be fetched server-side
      return '/placeholder.svg'; // Fallback for Instagram
    } else if (platform.toLowerCase() === 'tiktok') {
      // For TikTok, try to extract from URL patterns or use fallback
      // TikTok URLs often have predictable patterns we can try
      const tiktokMatch = url.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/);
      if (tiktokMatch) {
        // This is a fallback - the real thumbnail should come from server-side metadata
        return `https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/oEgS_${tiktokMatch[1]}_1.jpg`;
      }
      return '/placeholder.svg'; // Final fallback for TikTok
    }
    return null;
  } catch (error) {
    console.error('Error extracting thumbnail:', error);
    return null;
  }
};

const extractVideoTitle = async (url: string, platform: string): Promise<string | null> => {
  try {
    if (platform.toLowerCase() === 'youtube') {
      // Extract YouTube video ID
      const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = url.match(youtubeRegex);
      if (match && match[1]) {
        const videoId = match[1];
        // Use YouTube oEmbed API to get video title
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        
        try {
          const response = await fetch(oembedUrl);
          if (response.ok) {
            const data = await response.json();
            return data.title || null;
          }
        } catch (error) {
          console.error('Error fetching video title:', error);
        }
      }
    } else if (platform.toLowerCase() === 'instagram') {
      // For Instagram reels, try to use Instagram's oEmbed API
      try {
        const oembedUrl = `https://www.instagram.com/oembed/?url=${encodeURIComponent(url)}`;
        const response = await fetch(oembedUrl);
        if (response.ok) {
          const data = await response.json();
          return data.title || data.author_name || null;
        }
      } catch (error) {
        console.error('Error fetching Instagram reel title:', error);
      }
    }
    return null;
  } catch (error) {
    console.error('Error extracting video title:', error);
    return null;
  }
};

const fetchMetadata = async (url: string): Promise<{ title?: string; thumbnail_url?: string; tags?: string[] } | null> => {
  try {
    console.log('🚀 Invoking fetch-metadata function with URL:', url);
    const { data, error } = await supabase.functions.invoke('fetch-metadata', { body: { url } });
    if (error) {
      console.error('❌ Edge function error:', error);
      return null;
    }
    console.log('✅ Edge function response:', data);
    return data as any;
  } catch (err) {
    console.error('💥 Failed to fetch metadata:', err);
    return null;
  }
};

const AddVideo = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    platform: "",
    notes: "",
    tags: "",
    hasReminder: false,
    reminderDate: "",
    categoryId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTitle, setIsLoadingTitle] = useState(false);
  const [extractedThumbnail, setExtractedThumbnail] = useState<string | null>(null);
  const [metadataTags, setMetadataTags] = useState<string[]>([]);
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
  const { limits, canAddVideoToCategory, isGoldPlan } = useSubscriptionLimits();

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

  const platforms = [
    { value: "youtube", label: "YouTube", color: "bg-red-500" },
    { value: "tiktok", label: "TikTok", color: "bg-black" },
    { value: "instagram", label: "Instagram", color: "bg-pink-500" },
    { value: "snapchat", label: "Snapchat", color: "bg-yellow-400" },
    { value: "loom", label: "Loom", color: "bg-purple-500" },
    { value: "twitter", label: "Twitter", color: "bg-blue-400" },
    { value: "vimeo", label: "Vimeo", color: "bg-blue-600" },
    { value: "other", label: "Other", color: "bg-gray-500" },
  ];

  // Fetch categories when component mounts (only if no categoryId from URL)
  useEffect(() => {
    if (!categoryId) {
      fetchCategories();
    } else {
      // If we have a categoryId from URL, set it in form data
      setFormData(prev => ({ ...prev, categoryId }));
    }
  }, [categoryId]);

  // Redirect to category creation if no categories exist
  useEffect(() => {
    if (!categoryId && !loadingCategories && categories.length === 0) {
      toast({
        title: "Create a Category First",
        description: "You need to create at least one category before adding videos",
      });
      navigate('/categories/add', { replace: true });
    }
  }, [categories, loadingCategories, categoryId, navigate, toast]);

  // Handle URL from query parameters (e.g., from clipboard)
  useEffect(() => {
    const urlFromQuery = searchParams.get('url');
    if (urlFromQuery) {
      const decodedUrl = decodeURIComponent(urlFromQuery);
      setFormData(prev => ({ ...prev, url: decodedUrl }));
      
      // Try to detect platform from URL
      const urlLower = decodedUrl.toLowerCase();
      if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
        setFormData(prev => ({ ...prev, platform: 'youtube' }));
      } else if (urlLower.includes('tiktok.com')) {
        setFormData(prev => ({ ...prev, platform: 'tiktok' }));
      } else if (urlLower.includes('instagram.com')) {
        setFormData(prev => ({ ...prev, platform: 'instagram' }));
      } else if (urlLower.includes('snapchat.com')) {
        setFormData(prev => ({ ...prev, platform: 'snapchat' }));
      } else if (urlLower.includes('loom.com')) {
        setFormData(prev => ({ ...prev, platform: 'loom' }));
      }
    }
  }, [searchParams]);

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
      
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
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
      // Use lighter sanitization for content fields, regular sanitization for others
      let sanitizedValue: string;
      if (field === 'url') {
        sanitizedValue = sanitizeUrl(value);
      } else if (field === 'description' || field === 'content' || field === 'notes') {
        sanitizedValue = sanitizeContent(value);
      } else {
        sanitizedValue = sanitizeInput(value);
      }
      setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleUrlChange = async (url: string) => {
    setFormData(prev => ({ ...prev, url }));
    setExtractedThumbnail(null);
    setMetadataTags([]);
    
    // Auto-detect platform and extract title if URL is provided
    if (url.trim()) {
      const detectedPlatform = detectPlatform(url);
      if (detectedPlatform) {
        setFormData(prev => ({ ...prev, platform: detectedPlatform }));
        
        setIsLoadingTitle(true);
        try {
          let extractedTitle = null;
          let thumbnailFromMetadata: string | null = null;
          
          // First try platform-specific oEmbed for faster response (YouTube only)
          if (detectedPlatform === 'youtube' && !formData.title.trim()) {
            extractedTitle = await extractVideoTitle(url, detectedPlatform);
            if (extractedTitle) {
              setFormData(prev => ({ ...prev, title: extractedTitle }));
            }
          }
          
          // Always fetch metadata for Instagram, TikTok, and Snapchat to get thumbnails
          // For YouTube, only fetch if we need the title
          const shouldFetchMetadata = 
            detectedPlatform === 'instagram' || 
            detectedPlatform === 'tiktok' || 
            detectedPlatform === 'snapchat' ||
            !formData.title.trim();
          
          if (shouldFetchMetadata) {
            console.log('🔍 Fetching metadata for:', detectedPlatform, url);
            const meta = await fetchMetadata(url);
            console.log('📋 Metadata response:', meta);
            
            // Use metadata title if we don't have one yet
            if (meta?.title && !extractedTitle && !formData.title.trim()) {
              setFormData(prev => ({ ...prev, title: meta.title as string }));
            }
            
            // Store thumbnail from metadata (don't set state yet)
            if (meta?.thumbnail_url) {
              console.log('🖼️ Got thumbnail from metadata:', meta.thumbnail_url);
              thumbnailFromMetadata = meta.thumbnail_url as string;
            }
            
            if (Array.isArray((meta as any)?.tags) && (meta as any)?.tags.length > 0) {
              const normalized = Array.from(new Set(((meta as any).tags as string[]).map((t) => t.toLowerCase())));
              setMetadataTags(normalized);
              if (!formData.tags.trim()) {
                setFormData(prev => ({ ...prev, tags: normalized.join(', ') }));
              }
            }
          }
          
          // Set thumbnail: prioritize metadata, fallback to extraction
          const finalThumbnail = thumbnailFromMetadata || extractThumbnail(url, detectedPlatform);
          if (finalThumbnail) {
            console.log('✅ Setting final thumbnail:', finalThumbnail);
            setExtractedThumbnail(finalThumbnail);
          }
          
        } catch (error) {
          console.error('Error extracting title or metadata:', error);
        } finally {
          setIsLoadingTitle(false);
        }
      }
    }
  };

  const detectPlatform = (url: string): string => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      return 'youtube';
    } else if (lowerUrl.includes('tiktok.com')) {
      return 'tiktok';
    } else if (lowerUrl.includes('instagram.com/reel') || lowerUrl.includes('instagram.com/p/')) {
      return 'instagram';
    } else if (lowerUrl.includes('instagram.com')) {
      return 'instagram';
    } else if (lowerUrl.includes('snapchat.com')) {
      return 'snapchat';
    } else if (lowerUrl.includes('loom.com')) {
      return 'loom';
    } else if (lowerUrl.includes('vimeo.com')) {
      return 'vimeo';
    } else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
      return 'twitter';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Input validation
    const urlValidation = validateTextInput(formData.url, 1, 2000, 'Video URL');
    if (!urlValidation.isValid) {
      toast({
        title: "Invalid Input",
        description: urlValidation.message,
        variant: "destructive",
      });
      return;
    }

    const titleValidation = validateTextInput(formData.title, 0, 200, 'Video title');
    if (!titleValidation.isValid) {
      toast({
        title: "Invalid Input",
        description: titleValidation.message,
        variant: "destructive",
      });
      return;
    }

    // Reminder validation is optional - if user selects a date, it will be saved

    // Check if category is required (when not adding from within a category)
    if (!categoryId && !formData.categoryId) {
      toast({
        title: "Error",
        description: "Please select a category for this video",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Error",
          description: "You must be logged in to add videos",
          variant: "destructive",
        });
        return;
      }

      // Check subscription limits for video count per category
      const categoryUuid = categoryId && isUuid(categoryId) ? categoryId : 
                           (formData.categoryId && isUuid(formData.categoryId) ? formData.categoryId : null);

      if (categoryUuid) {
        const canAdd = await canAddVideoToCategory(categoryUuid);
        if (!canAdd) {
          setShowUpgradeModal(true);
          return;
        }
      }

      // Prepare video data
      const normalizedUrl = formData.url.trim().startsWith('http')
        ? formData.url.trim()
        : `https://${formData.url.trim()}`;
      const thumbnailUrl = extractedThumbnail || extractThumbnail(normalizedUrl, formData.platform);
      
      console.log('💾 Saving video with thumbnail URL:', thumbnailUrl);
      console.log('💾 Extracted thumbnail state:', extractedThumbnail);

      // Prepare tags array from the tags input, detected hashtags, and platform
      const extractHashtags = (text: string) => {
        if (!text) return [] as string[];
        const matches = text.match(/#(\w+)/g) || [];
        return matches.map((h) => h.slice(1)); // remove leading '#'
      };

      const userTags = formData.tags
        ? formData.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : [];
      const noteHashtags = extractHashtags(formData.notes);
      const titleHashtags = extractHashtags(formData.title);
      const platformTag = formData.platform ? [formData.platform] : [];

      // Lowercase + dedupe
      const allTags = Array.from(
        new Set([
          ...userTags,
          ...noteHashtags,
          ...titleHashtags,
          ...metadataTags,
          ...platformTag,
        ].map((t) => t.toLowerCase()))
      );

      // Check if this is a supported shared platform URL
      const sharedPlatforms = ['youtube', 'instagram', 'tiktok', 'snapchat', 'loom'];
      const isSharedPlatform = sharedPlatforms.includes(formData.platform.toLowerCase());

      if (isSharedPlatform) {
        // Use edge function for shared platforms to get proper metadata
        console.log('📤 Using save-shared-link edge function for', formData.platform);
        
        // Get current session and JWT token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          toast({
            title: "Authentication Required",
            description: "Please log in to add videos.",
            variant: "destructive",
          });
          return;
        }
        
        console.log('🔐 Calling edge function with explicit auth token');
        
        // Use utility function for consistent error handling
        const { data: edgeData, error: edgeError } = await callEdgeFunction(
          'save-shared-link',
          {
            url: normalizedUrl,
            categoryId: categoryUuid,
            note: formData.notes || undefined,
            title: formData.title || undefined,
            reminderAt: formData.reminderDate ? formData.reminderDate : undefined
          }
        );

        if (edgeError) {
          console.error('Edge function error:', edgeError);
          
          // Handle specific error types
          if (edgeError === "UNSUPPORTED_PLATFORM") {
            toast({
              title: "Unsupported Link",
              description: "This link can't be added to Tagmentia yet. Supported platforms are YouTube, TikTok, Instagram, Snapchat, and Loom.",
              variant: "destructive",
            });
          } else if (edgeError === "UPGRADE_REQUIRED") {
            navigate("/upgrade");
          } else if (edgeError === "DUPLICATE_VIDEO") {
            toast({
              title: "Already Saved",
              description: "This video is already in your collection.",
            });
          } else if (edgeError.includes("session") || edgeError.includes("expired") || edgeError.includes("Unauthorized")) {
            toast({
              title: "Session Expired",
              description: edgeError,
              variant: "destructive",
            });
            navigate("/auth/login");
          } else {
            toast({
              title: "Error",
              description: edgeError,
              variant: "destructive",
            });
          }
          return;
        }

        console.log('✅ Video saved via edge function:', edgeData);
      } else {
        // Use direct insert for other platforms
        const videoData = {
          title: formData.title || `Video from ${formData.platform}`,
          description: formData.notes || null,
          url: normalizedUrl,
          thumbnail_url: thumbnailUrl,
          platform: formData.platform,
          user_id: user.id,
          category_id: categoryUuid,
          tags: allTags.length > 0 ? allTags : null,
          reminder_date: formData.reminderDate ? formData.reminderDate : null,
        } as any;

        // Insert the video into the database
        const { error: insertError } = await supabase
          .from('videos')
          .insert([videoData]);

        if (insertError) {
          console.error('Database error:', insertError);
          toast({
            title: "Error",
            description: "Failed to . Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      // Success - show toast and navigate
      toast({
        title: "Success!",
        description: "Video has been added to your category",
      });

      // Navigate back to category detail page
      if (categoryId) {
        navigate(`/category/${categoryId}`, { replace: true });
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

  const selectedPlatform = platforms.find(p => p.value === formData.platform);

  return (
    <div className="min-h-screen bg-background">
      <Header title="Add New Video" showBack={true} />
      
      <main className="container max-w-7xl mx-auto p-4 md:p-6 lg:p-8 pb-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Details */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Video Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* URL Field */}
                <div className="space-y-2">
                  <Label htmlFor="url" className="text-sm font-medium text-foreground">
                    Video URL *
                  </Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="bg-card border-border focus:ring-primary"
                  />
                </div>

                {/* Title and Platform in a grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title Field */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium text-foreground">
                      Video Title
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      placeholder="Auto-detected from URL"
                      className="bg-card border-border focus:ring-primary"
                      disabled={isLoadingTitle}
                    />
                    {isLoadingTitle && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Extracting title...
                      </p>
                    )}
                  </div>

                  {/* Platform Detection - Auto-detected */}
                  {formData.platform && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Platform
                      </Label>
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg h-10">
                        <div className={cn("w-3 h-3 rounded", selectedPlatform?.color)} />
                        <span className="text-sm font-medium">{selectedPlatform?.label}</span>
                      </div>
                    </div>
                  )}
                </div>
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
                      Video Tags
                    </Label>
                    <Input
                      id="tags"
                      placeholder="tutorial, javascript, coding"
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
                  <Label htmlFor="notes" className="text-sm font-medium text-foreground">
                    Add your notes about this video
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="What did you learn? Key takeaways? Timestamps?"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    className="bg-card border-border focus:ring-primary min-h-[120px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.notes.length}/500 characters
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons - Full Width on Mobile, Inline on Desktop */}
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
                disabled={isSubmitting}
                className="flex-1 md:flex-none md:min-w-[140px] bg-gradient-primary hover:shadow-elevated transition-all duration-300"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Column - Preview & Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Video Preview Card */}
            <Card className="shadow-card sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Play className="w-5 h-5 text-primary" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Thumbnail Preview */}
                <div className="aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {extractedThumbnail ? (
                    <img 
                      src={extractedThumbnail} 
                      alt="Video thumbnail" 
                      className="w-full h-full object-cover"
                    />
                  ) : formData.url ? (
                    <Play className="w-12 h-12 text-muted-foreground" />
                  ) : (
                    <Link2 className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>

                {/* Video Info */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-foreground line-clamp-2">
                      {formData.title || "Video Title"}
                    </h3>
                    {selectedPlatform && (
                      <span className={cn(
                        "inline-block text-xs px-2 py-1 rounded text-white mt-2",
                        selectedPlatform.color
                      )}>
                        {selectedPlatform.label}
                      </span>
                    )}
                  </div>

                  {/* Status Indicators */}
                  <div className="space-y-2">
                    {formData.reminderDate && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Bell className="w-4 h-4 text-red-500" />
                        <span className="text-xs">
                          {new Date(formData.reminderDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {formData.notes && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="w-4 h-4 text-green-600" />
                        <span className="text-xs">Notes added</span>
                      </div>
                    )}
                    {formData.tags && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="text-xs">
                          {formData.tags.split(',').filter(t => t.trim()).length} tags
                        </span>
                      </div>
                    )}
                  </div>
                </div>
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

      {/* Upgrade Modal */}
      <UpgradePromptModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentPlan={limits?.plan_name || 'Free Plan'}
        feature="Add more videos to category"
        limitType="videos"
      />
    </div>
  );
};

export default AddVideo;