import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { useLogoConfiguration } from "@/hooks/useLogoConfiguration";

const NotFound = () => {
  const { currentLogoUrl } = useLogoConfiguration();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        {/* Logo Section */}
        <div className="mb-6 min-h-[80px] flex items-center justify-center">
          {currentLogoUrl ? (
            <img 
              src={currentLogoUrl}
              alt="Logo" 
              className="h-20 w-auto max-w-[400px] mb-4"
            />
          ) : (
            <div className="h-20 w-32 bg-muted/20 animate-pulse rounded" />
          )}
        </div>
        
        <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Oops! Page not found
        </p>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button className="bg-gradient-primary hover:shadow-elevated transition-all duration-300">
            <Home className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
