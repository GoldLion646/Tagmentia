import { ImageOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ThumbnailErrorScreenProps {
  onRetry: () => void;
  onContinue: () => void;
  isRetrying?: boolean;
}

export const ThumbnailErrorScreen = ({
  onRetry,
  onContinue,
  isRetrying = false,
}: ThumbnailErrorScreenProps) => {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-6 animate-fade-in">
      <div className="aspect-video bg-muted/50 rounded-xl flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <ImageOff className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">
            Thumbnail Unavailable
          </p>
          <p className="text-xs text-muted-foreground">
            We couldn't fetch the thumbnail for this link. You can retry or continue without it.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onRetry}
          variant="outline"
          className="flex-1 h-11"
          disabled={isRetrying}
        >
          {isRetrying ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </>
          )}
        </Button>
        <Button onClick={onContinue} className="flex-1 h-11">
          Continue Anyway
        </Button>
      </div>
    </div>
  );
};
