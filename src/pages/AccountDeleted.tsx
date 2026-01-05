import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const AccountDeleted = () => {
  const navigate = useNavigate();

  const handleDone = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleDone}
          className="p-2"
        >
          <X className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-medium text-muted-foreground">Account removed</h1>
        <div className="w-9"></div> {/* Spacer for centering */}
      </div>

      {/* Main content */}
      <div className="flex-1 px-6 py-8 flex flex-col">
        <div className="flex-1 space-y-6">
          <h2 className="text-3xl font-bold text-foreground">
            Thank you for using our app!
          </h2>
          
          <div className="space-y-4 text-muted-foreground">
            <p>
              We're sorry to see you go, but we respect your decision to delete your account. 
              Your account deletion request has been successfully processed, and your account is 
              now permanently deactivated.
            </p>
            
            <p>
              If you ever decide to return, we'll be here with new updates and features to make 
              your experience even better.
            </p>
          </div>
        </div>

        {/* Done button */}
        <div className="pt-8">
          <Button 
            onClick={handleDone}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-4 text-lg font-medium"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};