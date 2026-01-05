import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield } from "lucide-react";

export function ClearRateLimitsDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleClearRateLimits = async () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('clear-rate-limits', {
        body: { identifier: email.trim().toLowerCase() },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || `Rate limits cleared for ${email}`,
      });

      setEmail("");
      setOpen(false);
    } catch (error: any) {
      console.error("Error clearing rate limits:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to clear rate limits",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Shield className="mr-2 h-4 w-4" />
          Clear Rate Limits
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear Rate Limits</DialogTitle>
          <DialogDescription>
            Enter the email address to clear signup rate limit restrictions.
            This will allow the user to attempt signup again immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  handleClearRateLimits();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleClearRateLimits} disabled={isLoading}>
            {isLoading ? "Clearing..." : "Clear Rate Limits"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}