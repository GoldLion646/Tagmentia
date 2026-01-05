import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Plus } from "lucide-react";
import { ScreenshotGrid } from "@/components/ScreenshotGrid";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { LayoutToggle } from "@/components/LayoutToggle";

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

const ScreenshotsWeb = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { layoutType } = useDeviceDetection();
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (layoutType === 'mobile') {
      navigate('/screenshots', { replace: true });
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
    <div className="min-h-screen bg-background">
      <Header title="All Screenshots" showBack={true}>
        <LayoutToggle />
      </Header>
      
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Camera className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">All Screenshots</h1>
              <p className="text-muted-foreground">
                {loading ? 'Loading...' : `${screenshots.length} screenshot${screenshots.length !== 1 ? 's' : ''} in total`}
              </p>
            </div>
          </div>
          <Button 
            size="lg" 
            className="bg-gradient-primary hover:shadow-elevated"
            onClick={() => navigate('/add-screenshot')}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Screenshot
          </Button>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Your Screenshots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScreenshotGrid
              screenshots={screenshots}
              onDelete={handleDelete}
              onUpdateNote={handleUpdateNote}
              isLoading={loading}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ScreenshotsWeb;
