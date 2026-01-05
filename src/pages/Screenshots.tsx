import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Plus } from "lucide-react";
import { ScreenshotGrid } from "@/components/ScreenshotGrid";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";

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

const Screenshots = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { layoutType } = useDeviceDetection();
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (layoutType === 'web') {
      navigate('/screenshots-web', { replace: true });
    }
  }, [layoutType, navigate]);

  const fetchScreenshots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('screenshots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScreenshots(data || []);
    } catch (error: any) {
      console.error('Error fetching screenshots:', error);
      toast({
        title: "Error",
        description: "Failed to load screenshots",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenshots();
  }, []);

  const handleDelete = async (screenshotId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `https://vgsavnlyathtlvrevtjb.supabase.co/functions/v1/delete-screenshot`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ screenshotId }),
        }
      );

      if (!response.ok) throw new Error('Failed to delete screenshot');

      toast({
        title: "Success",
        description: "Screenshot deleted successfully",
      });

      await fetchScreenshots();
    } catch (error: any) {
      console.error('Error deleting screenshot:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete screenshot",
        variant: "destructive"
      });
    }
  };

  const handleUpdateNote = async (screenshotId: string, note: string) => {
    try {
      const { error } = await supabase
        .from('screenshots')
        .update({ note })
        .eq('id', screenshotId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note updated successfully",
      });

      await fetchScreenshots();
    } catch (error: any) {
      console.error('Error updating note:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update note",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="All Screenshots" showBack={true} />
      
      <main className="px-4 py-6">
        <Card className="shadow-card mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  {loading ? '...' : `${screenshots.length} Screenshot${screenshots.length !== 1 ? 's' : ''}`}
                </h2>
              </div>
            </div>
            
            <ScreenshotGrid
              screenshots={screenshots}
              onDelete={handleDelete}
              onUpdateNote={handleUpdateNote}
              isLoading={loading}
            />
          </CardContent>
        </Card>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-4 z-50">
        <Button
          size="lg"
          onClick={() => navigate('/add-screenshot')}
          className="h-14 w-14 rounded-full bg-gradient-primary hover:shadow-fab transition-all duration-300 transform hover:scale-105"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};

export default Screenshots;
