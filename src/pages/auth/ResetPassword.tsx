import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLogoConfiguration } from "@/hooks/useLogoConfiguration";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentLogoUrl } = useLogoConfiguration();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Check if we have the necessary parameters from the email link
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (accessToken && refreshToken) {
      setIsValid(true);
      // Set the session with the tokens from the URL
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
    } else {
      // Check if user is already authenticated (from email link redirect)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsValid(true);
        } else {
          toast({
            title: "Invalid Reset Link",
            description: "This password reset link is invalid or has expired.",
            variant: "destructive",
          });
          navigate("/auth/forgot-password");
        }
      });
    }
  }, [searchParams, navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validatePasswords = () => {
    if (formData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswords()) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (error) {
        console.error('Password update error:', error);
        toast({
          title: "Password Reset Failed",
          description: error.message || "Failed to update password. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      });

      // Navigate to dashboard after successful password reset
      navigate("/dashboard");
      
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

  if (!isValid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Verifying Reset Link...
          </h2>
          <p className="text-muted-foreground">
            Please wait while we verify your password reset link.
          </p>
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
              className="h-16 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`flex items-center ${currentLogoUrl ? 'hidden' : ''}`}>
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mr-3 border border-border/20">
              <span className="text-xl font-bold text-primary">T</span>
            </div>
            <div className="bg-primary px-4 py-2 rounded-xl">
              <span className="text-xl font-bold text-white">agmentia</span>
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Create New Password
          </h1>
          <p className="text-muted-foreground">
            Please enter your new password below.
          </p>
        </div>

        {/* Reset Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-muted-foreground">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground pr-10"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm text-muted-foreground">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground pr-10"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">Password Requirements:</p>
            <div className="flex items-center gap-2">
              <CheckCircle className={`w-4 h-4 ${formData.password.length >= 6 ? 'text-green-500' : 'text-gray-400'}`} />
              <span>At least 6 characters</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className={`w-4 h-4 ${formData.password === formData.confirmPassword && formData.confirmPassword ? 'text-green-500' : 'text-gray-400'}`} />
              <span>Passwords match</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !formData.password || !formData.confirmPassword}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-medium"
          >
            {loading ? "Updating Password..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;