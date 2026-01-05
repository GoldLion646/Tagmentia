import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: string;
}

export const WaitlistDialog = ({ open, onOpenChange, plan }: WaitlistDialogProps) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('waitlist', {
        body: { email, plan }
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: data.message || "You've been added to the waitlist. We'll notify you when Gold launches!",
      });

      setEmail("");
      onOpenChange(false);
    } catch (error) {
      console.error('Waitlist error:', error);
      toast({
        title: "Error",
        description: "Failed to join waitlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join the Gold Waitlist</DialogTitle>
          <DialogDescription>
            Be the first to know when AI-powered features launch. We'll send you an email when Gold becomes available.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            required
            aria-label="Email address"
          />
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Joining..." : "Notify Me"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
