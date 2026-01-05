import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLogoConfiguration } from "@/hooks/useLogoConfiguration";
import { Video, FolderOpen, Bell, Sparkles, FileText, Image } from "lucide-react";

interface MobileWelcomeProps {
  onSignUp: () => void;
  onLogin: () => void;
}

const MobileWelcome = ({ onSignUp, onLogin }: MobileWelcomeProps) => {
  const { currentLogoUrl } = useLogoConfiguration();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Section with Logo and Tagline */}
      <div className="flex flex-col items-center pt-12 pb-6">
        {/* Logo */}
        <a 
          href="https://www.tagmentia.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="mb-6 min-h-[60px] flex items-center justify-center"
        >
          {currentLogoUrl ? (
            <img 
              src={currentLogoUrl}
              alt="Tagmentia Logo" 
              className="h-16 w-auto max-w-[200px]"
            />
          ) : (
            <div className="h-16 w-32 bg-muted/20 animate-pulse rounded" />
          )}
        </a>
        
        {/* Tagline */}
        <h1 className="text-2xl font-semibold text-foreground text-center">
          Save, Organize, Discover
        </h1>
      </div>

      {/* Middle Section - Illustration Area */}
      <div className="flex-1 flex items-center justify-center px-8 py-6 overflow-hidden">
        <div className="relative w-full max-w-sm h-80">
          {/* Decorative floating cards/icons */}
          
          {/* Main document card - center */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-40 bg-card border border-border rounded-xl shadow-lg flex flex-col items-center justify-center p-4 z-10">
            <Video className="w-10 h-10 text-primary mb-3" />
            <div className="space-y-1.5 w-full">
              <div className="h-1.5 bg-muted rounded-full w-full" />
              <div className="h-1.5 bg-muted rounded-full w-3/4" />
              <div className="h-1.5 bg-muted rounded-full w-5/6" />
            </div>
          </div>

          {/* Folder card - top left */}
          <div className="absolute top-4 left-2 w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center shadow-md transform -rotate-12">
            <FolderOpen className="w-8 h-8 text-primary" />
          </div>

          {/* Bell/reminder card - top right */}
          <div className="absolute top-8 right-4 w-12 h-12 bg-secondary rounded-full flex items-center justify-center shadow-md">
            <Bell className="w-6 h-6 text-secondary-foreground" />
          </div>

          {/* AI sparkles - middle left */}
          <div className="absolute top-1/3 left-0 w-14 h-14 bg-accent/20 rounded-xl flex items-center justify-center shadow-sm transform rotate-6">
            <Sparkles className="w-7 h-7 text-accent-foreground" />
          </div>

          {/* Notes card - middle right */}
          <div className="absolute top-1/3 right-0 w-16 h-20 bg-card border border-border rounded-lg shadow-md flex flex-col items-center justify-center p-2 transform rotate-6">
            <FileText className="w-6 h-6 text-muted-foreground mb-1" />
            <div className="space-y-1 w-full">
              <div className="h-1 bg-muted rounded-full w-full" />
              <div className="h-1 bg-muted rounded-full w-2/3" />
            </div>
          </div>

          {/* Screenshot card - bottom left */}
          <div className="absolute bottom-8 left-4 w-20 h-16 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-center shadow-sm transform -rotate-6">
            <Image className="w-8 h-8 text-primary/60" />
          </div>

          {/* Category pill - bottom right */}
          <div className="absolute bottom-12 right-2 px-4 py-2 bg-primary rounded-full shadow-md">
            <span className="text-xs font-medium text-primary-foreground">Categories</span>
          </div>

          {/* Decorative dots */}
          <div className="absolute bottom-4 left-1/4 w-3 h-3 bg-primary/40 rounded-full" />
          <div className="absolute top-16 left-1/3 w-2 h-2 bg-muted-foreground/30 rounded-full" />
          <div className="absolute bottom-20 right-1/4 w-2.5 h-2.5 bg-accent/50 rounded-full" />
        </div>
      </div>

      {/* Bottom Section - CTA Buttons */}
      <div className="px-6 pb-8 pt-4 space-y-3">
        <Button
          onClick={onSignUp}
          className="w-full py-6 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Sign up
        </Button>
        
        <Button
          onClick={onLogin}
          variant="outline"
          className="w-full py-6 text-base font-semibold rounded-xl border-border hover:bg-muted/50"
        >
          Log in
        </Button>
      </div>
    </div>
  );
};

export default MobileWelcome;
