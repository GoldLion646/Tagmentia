import { AlertCircle, Youtube, Music, Instagram, Ghost } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnsupportedFormatScreenProps {
  url?: string;
  onClose: () => void;
}

export const UnsupportedFormatScreen = ({ url, onClose }: UnsupportedFormatScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background/95 backdrop-blur-sm p-6" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="max-w-md w-full animate-fade-in">
        <div className="bg-card/80 backdrop-blur-md rounded-2xl shadow-lg p-8 md:p-6 space-y-6 border border-border/60">
          <div className="flex justify-center">
            <div className="w-20 h-20 md:w-16 md:h-16 rounded-full bg-destructive/15 backdrop-blur-sm flex items-center justify-center border border-destructive/20">
              <AlertCircle className="w-10 h-10 md:w-8 md:h-8 text-destructive" />
            </div>
          </div>

          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-2xl font-semibold text-foreground">
              Unsupported Link
            </h2>
            <p className="text-muted-foreground text-base md:text-sm">
              This link can't be added to Tagmentia yet. Supported platforms are YouTube, TikTok, Instagram, and Snapchat.
            </p>
          </div>

          {url && (
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-xs text-muted-foreground break-all">{url}</p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              Currently supported platforms:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Youtube className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-sm font-medium">YouTube</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-black/10 flex items-center justify-center">
                  <Music className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-sm font-medium">TikTok</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                  <Instagram className="w-5 h-5 text-pink-500" />
                </div>
                <span className="text-sm font-medium">Instagram</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Ghost className="w-5 h-5 text-yellow-500" />
                </div>
                <span className="text-sm font-medium">Snapchat</span>
              </div>
            </div>
          </div>

          <Button
            onClick={onClose}
            className="w-full h-14 md:h-12 text-base font-medium"
            size="lg"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
