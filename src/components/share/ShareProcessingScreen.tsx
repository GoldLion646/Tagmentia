import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface ShareProcessingScreenProps {
  onTimeout?: () => void;
}

export const ShareProcessingScreen = ({ onTimeout }: ShareProcessingScreenProps) => {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFallback(true);
      onTimeout?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onTimeout]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background/95 backdrop-blur-sm p-6" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="text-center space-y-6 animate-fade-in">
        <div className="flex justify-center mb-8 relative">
          {/* Pulsing glow background - enhanced size for Android/OnePlus */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 md:w-24 md:h-24 rounded-full bg-primary/25 animate-pulse-glow" />
          </div>
          
          {/* Loader with icon - enhanced size for better visibility */}
          <div className="relative w-24 h-24 md:w-20 md:h-20 rounded-2xl bg-transparent backdrop-blur-md flex items-center justify-center border border-transparent">
            <Loader2 className="w-12 h-12 md:w-10 md:h-10 text-primary animate-spin" />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl md:text-2xl font-semibold text-foreground">
            Processing your link...
          </h2>
          <p className="text-muted-foreground text-base md:text-sm">
            Hang tight, we're fetching the details.
          </p>
        </div>

        {showFallback && (
          <p className="text-sm text-muted-foreground animate-fade-in">
            This is taking longer than usual... still processing.
          </p>
        )}
      </div>
    </div>
  );
};
