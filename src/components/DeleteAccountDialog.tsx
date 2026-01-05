import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface DeleteAccountDialogProps {
  userEmail: string;
}

export const DeleteAccountDialog = ({ userEmail }: DeleteAccountDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    if (confirmationText !== "DELETE") {
      toast({
        title: "Invalid Confirmation",
        description: "Please type 'DELETE' to confirm account deletion",
        variant: "destructive",
      });
      return;
    }

    // Close confirmation dialog and show progress modal
    setIsOpen(false);
    setShowProgressModal(true);
    setIsDeleting(true);
    setDeletionProgress(0);
    
    try {
      // Step 1: Initialize deletion
      setCurrentStep("Initializing account deletion...");
      setDeletionProgress(10);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Validating account
      setCurrentStep("Validating account permissions...");
      setDeletionProgress(25);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 3: Start deletion process
      setCurrentStep("Deleting videos and categories...");
      setDeletionProgress(40);
      await new Promise(resolve => setTimeout(resolve, 400));

      // Step 4: Call the delete function
      setCurrentStep("Removing account data...");
      setDeletionProgress(60);
      
      const { data, error } = await supabase.functions.invoke('delete-account');
      
      if (error) {
        throw error;
      }

      // Step 5: Processing completion
      setCurrentStep("Finalizing deletion...");
      setDeletionProgress(80);
      await new Promise(resolve => setTimeout(resolve, 300));

      if (data?.success) {
        setCurrentStep("Account successfully deleted!");
        setDeletionProgress(100);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Sign out and redirect to account deleted page
        await supabase.auth.signOut();
        navigate('/account-deleted');
      } else {
        throw new Error(data?.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setShowProgressModal(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeletionProgress(0);
      setCurrentStep("");
      setConfirmationText("");
    }
  };

  return (
    <>
      {/* Confirmation Dialog */}
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button 
            variant="destructive" 
            size="sm"
            className="w-full"
            onClick={() => setIsOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete My Account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg">Delete Account</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  This action cannot be undone
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
              <h4 className="font-medium text-destructive mb-2">Warning: This will permanently delete:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• All your saved videos and categories</li>
                <li>• All your notes and reminders</li>
                <li>• All AI summaries and analysis</li>
                <li>• Your profile and account settings</li>
                <li>• Your subscription history</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation" className="text-sm font-medium">
                Type <span className="font-bold text-destructive">DELETE</span> to confirm:
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Type DELETE here"
                className="font-mono"
              />
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
              <strong>Note:</strong> Account deletion is only available for Free Plan users. 
              If you have an active subscription, please cancel it first before deleting your account.
            </div>
          </div>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => {
              setConfirmationText("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={confirmationText !== "DELETE"}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Progress Modal */}
      <Dialog open={showProgressModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">{/* Progress modal cannot be closed by user */}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              Deleting Account
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {currentStep}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {deletionProgress}%
                </p>
              </div>
              
              <div className="w-full bg-secondary rounded-full h-4">
                <div 
                  className="bg-primary h-4 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${deletionProgress}%` }}
                />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Please wait while we securely delete all your data...
              </p>
              <p className="text-xs text-muted-foreground">
                Do not close this window.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};