import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isSupportedUrl, getUnsupportedPlatformMessage, getPlatform } from "@/utils/urlNormalization";
import { callEdgeFunction } from "@/utils/edgeFunctionCall";
import { ShareProcessingScreen } from "@/components/share/ShareProcessingScreen";
import { UnsupportedFormatScreen } from "@/components/share/UnsupportedFormatScreen";
import { AddVideoFormScreen } from "@/components/share/AddVideoFormScreen";
import { CategoryPickerModal } from "@/components/share/CategoryPickerModal";
import { SaveConfirmationScreen } from "@/components/share/SaveConfirmationScreen";
import { useDefaultCategory } from "@/hooks/useDefaultCategory";
import { Capacitor } from "@capacitor/core";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, BookOpen, SquarePen } from "lucide-react";
import { DateTimePicker } from "@/components/DateTimePicker";

interface Category {
  id: string;
  name: string;
  color?: string;
}

export default function AddSharedVideo() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { defaultCategoryId, loading: defaultCategoryLoading } = useDefaultCategory();

  // No longer blocking page based on session flag - removed

  const [url, setUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [platform, setPlatform] = useState<"youtube" | "tiktok" | "instagram" | "snapchat" | "loom" | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState("");
  const [unsupported, setUnsupported] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);

  // Helper function to clear URL from state, URL params, and localStorage
  const clearUrl = () => {
    setUrl("");
    // Clear URL from search params
    if (window.history && window.history.replaceState) {
      const params = new URLSearchParams(window.location.search);
      params.delete('url');
      params.delete('text');
      const categoryIdFromUrl = params.get("categoryId");
      if (categoryIdFromUrl) {
        // Keep categoryId if it exists
        const newParams = new URLSearchParams();
        newParams.set('categoryId', categoryIdFromUrl);
        window.history.replaceState({}, '', `/add?${newParams.toString()}`);
      } else {
        // No categoryId, just go to /add
        window.history.replaceState({}, '', '/add');
      }
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
      // Get shared URL - check query params first, then localStorage (for Android share intents)
      let sharedUrl = searchParams.get("url") || searchParams.get("text") || "";
      

      console.log("sharedUrl=>",sharedUrl);
      // Get categoryId from URL params (if coming from Dashboard)
      const categoryIdFromUrl = searchParams.get("categoryId");
      
      // If no URL in query params, check localStorage for pending share (Android share intent)
      if (!sharedUrl) {
        try {
          const pendingShare = localStorage.getItem('pendingShare');
          if (pendingShare) {
            // Check if it's "IMAGE_SHARED" marker - redirect immediately without processing
            if (pendingShare.trim() === 'IMAGE_SHARED') {
              localStorage.removeItem('pendingShare');
              navigate('/add-shared-screen', { replace: true });
              return;
            }
            sharedUrl = pendingShare;
            // Clear it after reading
            localStorage.removeItem('pendingShare');
            // Update URL in browser if we got it from localStorage
            if (window.history && window.history.replaceState) {
              const params = new URLSearchParams();
              params.set('url', sharedUrl);
              if (categoryIdFromUrl) {
                params.set('categoryId', categoryIdFromUrl);
              }
              window.history.replaceState({}, '', `/add?${params.toString()}`);
            }
          }
        } catch (error) {
          console.error('Error reading pending share from localStorage:', error);
        }
      }
      
      const decodedUrl = sharedUrl ? decodeURIComponent(sharedUrl) : "";
      
      // If URL is "IMAGE_SHARED" or starts with "data:image", redirect to AddSharedScreen page
      if (decodedUrl && (decodedUrl === 'IMAGE_SHARED' || decodedUrl.startsWith('data:image'))) {
        const params = new URLSearchParams();
        params.set('url', decodedUrl);
        if (categoryIdFromUrl) {
          params.set('categoryId', categoryIdFromUrl);
        }
        navigate(`/add-shared-screen?${params.toString()}`, { replace: true });
        return;
      }

      setUrl(decodedUrl);

      // Check if URL is supported
      if (decodedUrl && !isSupportedUrl(decodedUrl)) {
        setUnsupported(true);
        setProcessing(false);
        return;
      }

      // Verify user is authenticated before loading categories
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setProcessing(false);
        setError("Not authenticated. Please log in to save videos.");
        navigate("/auth/login");
        return;
      }

      // Load categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, color")
        .eq("user_id", user.id)
        .order("name");

      if (categoriesData) {
        setCategories(categoriesData);
        
        // Set categoryId if provided in URL params, otherwise don't auto-select
        if (categoryIdFromUrl && categoriesData.find(c => c.id === categoryIdFromUrl)) {
          setCategoryId(categoryIdFromUrl);
        } else {
          setCategoryId("");
        }
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

    if (!defaultCategoryLoading) {
      initialize();
    }
  }, [searchParams, navigate, defaultCategoryId, defaultCategoryLoading]);




  // Handle back button press - navigate to dashboard after save
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
  }, [navigate, location.pathname]);

  const handleExitApp = async () => {
    try {
      const { App } = await import('@capacitor/app');
      App.exitApp();
    } catch (error) {
      console.error('Error exiting app:', error);
    }
  };

  const handleCategorySelect = (selectedCategoryId: string) => {
    // Set the category
    setCategoryId(selectedCategoryId);
    setShowCategoryPicker(false);
    // No auto-save - user must click "Save Video" button to save
  };


  const handleSave = async () => {
    if (!categoryId) {
      toast({
        title: "Category Required",
        description: "Please select a category before saving.",
        variant: "destructive",
      });
      return;
    }

    if (!url || !platform) {
      toast({
        title: "Video Required",
        description: "Please provide a valid video URL.",
        variant: "destructive",
      });
      return;
    }

    // Reminder validation is optional - if user selects a date, it will be saved

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
          note: notes || undefined,
          tags: tags || undefined,
          reminderAt: reminderDate ? reminderDate : undefined
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
        
        const category = categories.find((c) => c.id === categoryId);
        toast({
          title: "Video Saved!",
          description: `Video has been added to ${category?.name || 'your category'}`,
        });
        // Navigate to dashboard
        navigate('/dashboard', { replace: true });
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
    const category = categories.find((c) => c.id === categoryId);
    if (category) {
      navigate(`/category/${categoryId}`);
    }
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

  // No longer blocking page - removed session flag check

  // Processing screen
  if (processing) {
    return <ShareProcessingScreen />;
  }

  // Unsupported platform screen
  if (unsupported) {
    return (
      <UnsupportedFormatScreen
        url={url}
        onClose={() => navigate(-1)}
      />
    );
  }


  // Main form screen
  if (!platform || categories.length === 0) {
    return <ShareProcessingScreen />;
  }

  return (
    <>
      <AddVideoFormScreen
        url={url}
        title={videoTitle}
        thumbnailUrl={thumbnailUrl}
        platform={platform}
        categories={categories}
        selectedCategoryId={categoryId}
        notes={notes}
        onNotesChange={setNotes}
        tags={tags}
        onTagsChange={setTags}
        reminderDate={reminderDate}
        onReminderDateChange={setReminderDate}
        onShowDateTimePicker={() => setShowDateTimePicker(true)}
        onCategoryClick={() => setShowCategoryPicker(true)}
        onSave={handleSave}
        onCancel={() => setShowExitDialog(true)}
        isSaving={loading}
        error={error}
      />

      <CategoryPickerModal
        open={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        categories={categories}
        selectedCategoryId={categoryId}
        onSelectCategory={handleCategorySelect}
        onCreateNew={() => navigate("/add-category")}
      />

      {/* DateTime Picker Dialog */}
      <Dialog open={showDateTimePicker} onOpenChange={setShowDateTimePicker}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>Set Date and Time</DialogTitle>
          </DialogHeader>
          <DateTimePicker
            value={reminderDate || new Date().toISOString().slice(0, 16)}
            onChange={(value) => {
              setReminderDate(value);
            }}
            min={new Date().toISOString().slice(0, 16)}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setReminderDate("");
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
              onClick={() => {
                // The DateTimePicker onChange is called automatically when values change
                // Just close the dialog
                setShowDateTimePicker(false);
              }}
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
            <AlertDialogTitle>Close Edit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close without saving?
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
              Yes, Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
