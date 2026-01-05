import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isSupportedUrl, getUnsupportedPlatformMessage, getPlatform } from "@/utils/urlNormalization";
import { callEdgeFunction } from "@/utils/edgeFunctionCall";
import { ShareProcessingScreen } from "@/components/share/ShareProcessingScreen";
import { UnsupportedFormatScreen } from "@/components/share/UnsupportedFormatScreen";
import AddVideoFormScreen2 from "../components/share/AddVideoFormScreen2";
import { SaveConfirmationScreen } from "@/components/share/SaveConfirmationScreen";
import { Capacitor } from "@capacitor/core";

interface Category {
  id: string;
  name: string;
  color?: string;
}

export default function AddVideoToCategory() {
  const { categoryId: categoryIdParam } = useParams<{ categoryId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [url, setUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [platform, setPlatform] = useState<"youtube" | "tiktok" | "instagram" | "snapchat" | "loom" | null>(null);
  const [categoryId, setCategoryId] = useState(categoryIdParam || "");
  const [category, setCategory] = useState<Category | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState("");
  const [unsupported, setUnsupported] = useState(false);
  const [saved, setSaved] = useState(false);

  /**
   * Check if a string is a valid URL
   */
  const isValidUrl = (string: string): boolean => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  /**
   * Extract URL from clipboard text (handles cases where URL might be in a longer text)
   */
  const extractUrlFromText = (text: string): string | null => {
    if (!text) return null;
    
    // First, try if the entire text is a URL
    if (isValidUrl(text.trim())) {
      return text.trim();
    }
    
    // Try to find URL pattern in the text
    const urlPattern = /(https?:\/\/[^\s]+)/gi;
    const matches = text.match(urlPattern);
    if (matches && matches.length > 0) {
      // Return the first valid URL found
      for (const match of matches) {
        if (isValidUrl(match)) {
          return match;
        }
      }
    }
    
    return null;
  };

  // Helper function to clear URL from state, URL params, and localStorage
  const clearUrl = () => {
    setUrl("");
    // Clear URL from search params
    if (window.history && window.history.replaceState) {
      const params = new URLSearchParams(window.location.search);
      params.delete('url');
      params.delete('text');
      const newUrl = categoryIdParam ? `/category/${categoryIdParam}/add-shared-video` : '/add-shared-video';
      window.history.replaceState({}, '', newUrl);
    }
    // Clear from localStorage if it exists
    try {
      localStorage.removeItem('pendingShare');
    } catch (error) {
      console.error('Error clearing pendingShare from localStorage:', error);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      // Verify categoryId is provided
      if (!categoryIdParam) {
        setProcessing(false);
        setError("Category ID is required.");
        navigate("/dashboard");
        return;
      }

      // Verify user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setProcessing(false);
        setError("Not authenticated. Please log in to save videos.");
        navigate("/auth/login");
        return;
      }

      // Load category details
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("id, name, color")
        .eq("id", categoryIdParam)
        .eq("user_id", user.id)
        .single();

      if (categoryError || !categoryData) {
        setProcessing(false);
        setError("Category not found.");
        navigate("/dashboard");
        return;
      }

      setCategory(categoryData);
      setCategoryId(categoryIdParam);

      // Check for URL in query params first
      let sharedUrl = searchParams.get("url") || searchParams.get("text") || "";

      // If no URL in query params, check localStorage for pending share (Android share intent)
      if (!sharedUrl) {
        try {
          const pendingShare = localStorage.getItem('pendingShare');
          if (pendingShare) {
            sharedUrl = pendingShare;
            // Clear it after reading
            localStorage.removeItem('pendingShare');
            // Update URL in browser if we got it from localStorage
            if (window.history && window.history.replaceState) {
              const params = new URLSearchParams();
              params.set('url', sharedUrl);
              window.history.replaceState({}, '', `/category/${categoryIdParam}/add-video?${params.toString()}`);
            }
          }
        } catch (error) {
          console.error('Error reading pending share from localStorage:', error);
        }
      }

      // If still no URL, check clipboard on native platforms
      if (!sharedUrl && Capacitor.isNativePlatform()) {
        try {
          let clipboardText: string | null = null;

          // Try to use Capacitor Clipboard plugin
          try {
            const { Clipboard } = await import('@capacitor/clipboard');
            const result = await Clipboard.read();
            clipboardText = result.value || null;
          } catch (capacitorError) {
            // Fallback to navigator.clipboard
            if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
              clipboardText = await navigator.clipboard.readText();
            }
          }

          if (clipboardText && clipboardText.trim()) {
            // Try to extract URL from clipboard text
            const extractedUrl = extractUrlFromText(clipboardText);
            if (extractedUrl && isSupportedUrl(extractedUrl)) {
              sharedUrl = extractedUrl;
            }
          }
        } catch (error) {
          console.error('Error reading clipboard:', error);
        }
      }

      const decodedUrl = sharedUrl ? decodeURIComponent(sharedUrl) : "";
      setUrl(decodedUrl);

      // Check if URL is supported
      if (decodedUrl && !isSupportedUrl(decodedUrl)) {
        setUnsupported(true);
        setProcessing(false);
        return;
      }

      // Extract platform and set initial data
      if (decodedUrl) {
        const detectedPlatform = getPlatform(decodedUrl);
        if (detectedPlatform) {
          setPlatform(detectedPlatform as "youtube" | "tiktok" | "instagram" | "snapchat" | "loom");
          setVideoTitle(`${detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1)} Video`);
        }
      }

      setProcessing(false);
    };

    initialize();
  }, [categoryIdParam, searchParams, navigate]);

  // Auto-save video when URL is found and category is ready
  useEffect(() => {
    // Only auto-save if:
    // 1. URL exists
    // 2. Platform is detected
    // 3. Category is loaded
    // 4. Not already processing or saved
    if (
      url &&
      platform &&
      category &&
      !processing &&
      !saved &&
      !loading
    ) {
      // Small delay to ensure everything is initialized
      const timer = setTimeout(() => {
        const autoSaveVideo = async () => {
          setLoading(true);
          setError("");

          try {
            // Verify user is authenticated
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            if (authError || !user) {
              const errorMsg = "Not authenticated. Please log in to save videos.";
              setError(errorMsg);
              toast({
                title: "Authentication Required",
                description: errorMsg,
                variant: "destructive",
              });
              navigate("/auth/login");
              setLoading(false);
              return;
            }

            // Call edge function to save
            const { data, error: saveError } = await callEdgeFunction(
              "save-shared-link",
              { 
                url, 
                categoryId: categoryId, 
                note: notes || undefined 
              }
            );

            // Handle errors from edge function
            if (saveError) {
              // Clear URL after save attempt (success or failure)
              if (url) {
                clearUrl();
              }
              
              if (saveError === "UNSUPPORTED_PLATFORM") {
                toast({
                  title: "Unsupported Link",
                  description: "This link can't be added to Tagmentia yet. Supported platforms are YouTube, TikTok, Instagram, Snapchat, and Loom.",
                  variant: "destructive",
                });
                setLoading(false);
                return;
              } else if (saveError === "UPGRADE_REQUIRED") {
                navigate("/upgrade");
                setLoading(false);
                return;
              } else if (saveError === "DUPLICATE_VIDEO") {
                toast({
                  title: "Already Saved",
                  description: "This video is already in your collection.",
                });
                setLoading(false);
                return;
              } else {
                setError(saveError);
                toast({
                  title: "Couldn't Save Item",
                  description: saveError,
                  variant: "destructive",
                });
                setLoading(false);
                return;
              }
            }

            // Success - video saved
            if (data) {
              // Clear URL after successful save
              if (url) {
                clearUrl();
              }
              
              toast({
                title: "Video Saved!",
                description: `Video has been added to ${category?.name || 'your category'}`,
              });
              // Navigate to category detail page
              navigate(`/category/${categoryId}`, { replace: true });
            } else {
              throw new Error("No data returned from server");
            }
          } catch (error: any) {
            console.error("Error auto-saving video:", error);
            // Clear URL after save attempt (success or failure)
            if (url) {
              clearUrl();
            }
            
            const errorMessage = error?.message || 
                                "Something went wrong while saving your video. Please try again.";
            setError(errorMessage);
            toast({
              title: "Couldn't Save Item",
              description: errorMessage,
              variant: "destructive",
            });
            setLoading(false);
          }
        };

        autoSaveVideo();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [url, platform, category, processing, saved, loading, categoryId, notes, toast, navigate]);

  // Handle back button press
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
        // If video is saved, navigate to category
        if (saved) {
          navigate(`/category/${categoryId}`, { replace: true });
        } else {
          // Navigate to Dashboard
          navigate('/dashboard');
        }
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
  }, [saved, navigate, categoryId]);

  const handleSave = async () => {
    if (!url || !categoryId) return;

    setLoading(true);
    setError("");

    try {
      // Verify user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        const errorMsg = "Not authenticated. Please log in to save videos.";
        setError(errorMsg);
        toast({
          title: "Authentication Required",
          description: errorMsg,
          variant: "destructive",
        });
        navigate("/auth/login");
        setLoading(false);
        return;
      }

      // Call edge function using utility function with proper error handling
      const { data, error: saveError } = await callEdgeFunction(
        "save-shared-link",
        { 
          url, 
          categoryId, 
          note: notes || undefined 
        }
      );

      // Handle errors from edge function
      if (saveError) {
        // Clear URL after save attempt (success or failure)
        if (url) {
          clearUrl();
        }
        
        // Handle specific error types
        if (saveError === "UNSUPPORTED_PLATFORM") {
          toast({
            title: "Unsupported Link",
            description: "This link can't be added to Tagmentia yet. Supported platforms are YouTube, TikTok, Instagram, Snapchat, and Loom.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        } else if (saveError === "UPGRADE_REQUIRED") {
          navigate("/upgrade");
          setLoading(false);
          return;
        } else if (saveError === "DUPLICATE_VIDEO") {
          toast({
            title: "Already Saved",
            description: "This video is already in your collection.",
          });
          setLoading(false);
          return;
        } else if (saveError.includes("session") || saveError.includes("expired") || saveError.includes("Unauthorized")) {
          // Session expired - redirect to login
          setError(saveError);
          toast({
            title: "Session Expired",
            description: saveError,
            variant: "destructive",
          });
          navigate("/auth/login");
          setLoading(false);
          return;
        } else {
          // Generic error
          setError(saveError);
          toast({
            title: "Couldn't Save Item",
            description: saveError,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Success - video saved
      if (data) {
        // Clear URL after successful save
        if (url) {
          clearUrl();
        }
        
        toast({
          title: "Video Saved!",
          description: `Video has been added to ${category?.name || 'your category'}`,
        });
        // Navigate to category detail page
        navigate(`/category/${categoryId}`, { replace: true });
      } else {
        throw new Error("No data returned from server");
      }
    } catch (error: any) {
      console.error("Error saving video:", error);
      
      // Clear URL after save attempt (success or failure)
      if (url) {
        clearUrl();
      }
      
      const errorMessage = error?.message || 
                          "Something went wrong while saving your video. Please try again.";
      
      setError(errorMessage);
      toast({
        title: "Couldn't Save Item",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewItem = () => {
    navigate(`/category/${categoryId}`);
  };

  const handleAddAnother = () => {
    setSaved(false);
    setUrl("");
    setVideoTitle("");
    setThumbnailUrl("");
    setPlatform(null);
    setNotes("");
    setError("");
  };

  const handleCancel2 = () => {
    // Clear URL from state immediately
    setUrl("");
    console.log("click the cancel button & backpress()");
    
    // Clear URL from search params
    if (window.history && window.history.replaceState) {
      const params = new URLSearchParams(window.location.search);
      params.delete('url');
      params.delete('text');
      const newUrl = categoryIdParam ? `/category/${categoryIdParam}/add-shared-video` : '/add-shared-video';
      window.history.replaceState({}, '', newUrl);
    }
    
    // Clear from localStorage if it exists
    try {
      localStorage.removeItem('pendingShare');
    } catch (error) {
      console.error('Error clearing pendingShare from localStorage:', error);
    }
    
    // Navigate to Dashboard
    navigate('/dashboard', { replace: true });
  };

  // Processing screen
  if (processing) {
    return <ShareProcessingScreen />;
  }

  // Unsupported platform screen
  if (unsupported) {
    return (
      <UnsupportedFormatScreen
        url={url}
        onClose={() => navigate(`/category/${categoryId}`)}
      />
    );
  }

  // Success screen - this should not show since we navigate immediately after save
  if (saved) {
    return (
      <SaveConfirmationScreen
        categoryName={category?.name || "Unknown"}
        onViewItem={handleViewItem}
        onAddAnother={handleAddAnother}
        autoCloseDelay={2000}
      />
    );
  }

  // Main form screen - show form even if no URL yet (user can paste URL)
  if (!category) {
    return <ShareProcessingScreen />;
  }

  // Create a categories array with just the selected category (for form compatibility)
  const categories = [category];

  return (
    <>
      <AddVideoFormScreen2
        url={url}
        title={videoTitle}
        thumbnailUrl={thumbnailUrl}
        platform={platform}
        categories={categories}
        selectedCategoryId={categoryId}
        notes={notes}
        onNotesChange={setNotes}
        onCategoryClick={() => {}} // Disabled - category is fixed
        onSave={handleSave}
        onCancel={handleCancel2}
        isSaving={loading}
        error={error}
      />
    </>
  );
}

