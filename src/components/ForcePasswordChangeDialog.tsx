import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { validatePassword } from "@/utils/inputSanitization";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck } from "lucide-react";

interface ForcePasswordChangeDialogProps {
  open: boolean;
  onComplete: () => void;
}

export const ForcePasswordChangeDialog = ({ open, onComplete }: ForcePasswordChangeDialogProps) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setPassword("");
      setConfirm("");
      setLoading(false);
    }
  }, [open]);

  const validation = useMemo(() => validatePassword(password), [password]);
  const passwordsMatch = confirm.length > 0 && password === confirm;

  const handleUpdate = async () => {
    if (!validation.isValid) {
      toast({ title: "Password not compliant", description: validation.message, variant: "destructive" });
      return;
    }
    if (!passwordsMatch) {
      toast({ title: "Passwords don't match", description: "Make sure both passwords are identical.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        let message = error.message || "Failed to update password";
        // Friendly messages for leaked-password protection or policy errors
        if (/leaked|pwned|compromised/i.test(message)) {
          message = "This password appears in known data breaches. Please choose a different one.";
        } else if (/password/i.test(message) && /strength|complex|policy/i.test(message)) {
          message = "Password does not meet policy. Please follow the listed requirements.";
        }
        toast({ title: "Couldn't update password", description: message, variant: "destructive" });
        return;
      }

      toast({ title: "Password updated", description: "Your password now complies with the security policy." });
      onComplete();
    } catch (e: any) {
      toast({ title: "Unexpected error", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* Prevent closing */ }}>
      <DialogContent className="max-w-md" aria-describedby="password-policy-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Action required: Update your password
          </DialogTitle>
          <DialogDescription id="password-policy-desc">
            To keep your account secure, please set a password that meets ALL the following rules:
            - Minimum length 8 characters
            - At least one uppercase and one lowercase letter
            - At least one number
            - At least one symbol
            - Must not be found in known leaked-password databases
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <PasswordStrengthIndicator password={password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {confirm.length > 0 && (
              <p className={`text-xs ${passwordsMatch ? 'text-green-600' : 'text-destructive'}`}>
                {passwordsMatch ? 'Passwords match' : "Passwords don't match"}
              </p>
            )}
          </div>

          <Button className="w-full" onClick={handleUpdate} disabled={loading || !validation.isValid || !passwordsMatch}>
            {loading ? 'Updating…' : 'Update password'}
          </Button>

          <p className="text-xs text-muted-foreground">
            Note: Leaked password protection is enabled. If your password appears in known breaches, it will be rejected.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
