import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface SaveConfirmationScreenProps {
  categoryName: string;
  onViewItem: () => void;
  onAddAnother: () => void;
  autoCloseDelay?: number;
}

export const SaveConfirmationScreen = ({
  categoryName,
  onViewItem,
  onAddAnother,
  autoCloseDelay,
}: SaveConfirmationScreenProps) => {
  useEffect(() => {
    if (autoCloseDelay) {
      const timer = setTimeout(() => {
        onViewItem();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoCloseDelay, onViewItem]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background/95 backdrop-blur-sm p-6" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="max-w-md w-full animate-fade-in">
        <div className="bg-card/80 backdrop-blur-md rounded-2xl shadow-lg p-8 md:p-6 space-y-8 border border-border/60">
          <div className="flex flex-col items-center space-y-4">
            {/* Animated checkmark - enhanced size */}
            <div className="relative w-28 h-28 md:w-24 md:h-24">
              <svg
                className="w-24 h-24"
                viewBox="0 0 52 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="26"
                  cy="26"
                  r="25"
                  stroke="hsl(142, 76%, 36%)"
                  strokeWidth="2"
                  fill="hsl(142, 76%, 96%)"
                  className="animate-draw-circle"
                  style={{ strokeDasharray: '0 157' }}
                />
                <path
                  d="M14 27L22 35L38 17"
                  stroke="hsl(142, 76%, 36%)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-draw-check"
                  style={{ strokeDasharray: '0 50' }}
                />
              </svg>
            </div>

            <div className="text-center space-y-3">
              <h2 className="text-3xl md:text-2xl font-semibold text-foreground">
                Saved!
              </h2>
              <p className="text-muted-foreground text-base md:text-sm">
                Your video has been added to your collection.
              </p>
            </div>

            <div className="bg-primary/10 rounded-xl px-6 py-3 border border-primary/20">
              <p className="text-sm text-primary font-medium">
                Category: {categoryName}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={onViewItem}
              className="w-full h-14 md:h-12 text-base font-medium"
              size="lg"
            >
              View Item
            </Button>
            <Button
              onClick={onAddAnother}
              variant="outline"
              className="w-full h-14 md:h-12 text-base font-medium"
              size="lg"
            >
              Add Another
            </Button>
          </div>

          {autoCloseDelay && (
            <p className="text-xs text-center text-muted-foreground">
              Redirecting automatically in {autoCloseDelay / 1000} seconds...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
