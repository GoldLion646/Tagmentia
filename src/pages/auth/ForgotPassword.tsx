import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLogoConfiguration } from "@/hooks/useLogoConfiguration";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { currentLogoUrl } = useLogoConfiguration();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to send reset email. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setEmailSent(true);
      toast({
        title: "Reset Email Sent",
        description: "Please check your email for password reset instructions.",
      });
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 px-6 py-8">
          {/* Header */}
          <div className="flex items-center mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/auth/login")}
              className="mr-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold text-foreground">Password Reset</h1>
          </div>

          {/* Success Message */}
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <Mail className="w-10 h-10 text-green-600" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">
                Check Your Email
              </h2>
              <p className="text-muted-foreground">
                We've sent password reset instructions to:
              </p>
              <p className="font-medium text-foreground">{email}</p>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Click the link in the email to reset your password. The link will expire in 24 hours.
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={() => setEmailSent(false)}
                  variant="outline"
                  className="w-full"
                >
                  Try Different Email
                </Button>
                
                <Link to="/auth/login">
                  <Button variant="ghost" className="w-full">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 px-6 py-8">
        {/* Logo Section */}
        <div className="flex items-center justify-center mb-8">
          {currentLogoUrl ? (
            <img 
              src={currentLogoUrl}
              alt="Logo" 
              className="h-16 w-auto max-w-[250px]"
            />
          ) : (
            <div className="flex items-center">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mr-3 border border-border/20">
                <span className="text-xl font-bold text-primary">T</span>
              </div>
              <div className="bg-primary px-4 py-2 rounded-xl">
                <span className="text-xl font-bold text-white">agmentia</span>
              </div>
            </div>
          )}
        </div>

        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/auth/login")}
            className="mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Reset Password</h1>
        </div>

        {/* Description */}
        <div className="mb-8">
          <p className="text-muted-foreground">
            Enter your email address and we'll send you instructions to reset your password.
          </p>
        </div>

        {/* Reset Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
              required
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-medium"
          >
            {loading ? "Sending..." : "Send Reset Instructions"}
          </Button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <Link to="/auth/login" className="text-sm text-primary font-medium">
            Remember your password? Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;