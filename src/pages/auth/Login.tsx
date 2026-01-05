import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { sanitizeInput, validateEmail, rateLimitCheck } from "@/utils/inputSanitization";
import { securityLogger } from "@/utils/securityLogger";
import { useLogoConfiguration } from "@/hooks/useLogoConfiguration";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import MobileWelcome from "./MobileWelcome";

const Login = () => {
  const navigate = useNavigate();
  const { currentLogoUrl } = useLogoConfiguration();
  const { layoutType } = useDeviceDetection();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState<boolean>(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  
  // Listen for logo configuration updates across tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tagmentia_global_logo_config') {
        // Force re-render by updating a state that's not used elsewhere
        window.location.reload();
      }
    };
    
    const handleLogoUpdate = () => {
      // Force re-render when logo is updated via custom event
      window.location.reload();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('logoConfigUpdated', handleLogoUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('logoConfigUpdated', handleLogoUpdate);
    };
  }, []);

  // Check Google OAuth setting
  useEffect(() => {
    const checkGoogleOAuthSetting = async () => {
      try {
        const { data, error } = await supabase.rpc('get_system_setting_bool', { _key: 'google_oauth_enabled' });
        if (error) {
          console.error('Failed to load Google OAuth setting', error);
        }
        setGoogleOAuthEnabled(data === true);
      } catch (err) {
        console.error('Error checking Google OAuth setting', err);
      }
    };
    checkGoogleOAuthSetting();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Input validation and sanitization
    const email = sanitizeInput(formData.email);
    const password = formData.password;

    if (!validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Rate limiting check
    if (!rateLimitCheck(`login_${email}`, 5, 15 * 60 * 1000)) {
      await securityLogger.logRateLimitExceeded(email, 'login_attempt');
      toast({
        title: "Too Many Attempts",
        description: "Please wait 15 minutes before trying again",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if error is related to email confirmation requirement
        if (error.message?.includes('email') && error.message?.includes('confirm')) {
          toast({
            title: "Email Verification Required",
            description: "Please check your email and click the verification link to complete your account setup.",
            variant: "destructive",
          });
        } else {
          // Log failed authentication attempt
          await securityLogger.logAuthFailure(email, error.message);
          
          toast({
            title: "Login Failed",
            description: "Invalid credentials. Please check your email and password.",
            variant: "destructive",
          });
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // Get user's first name from metadata or fall back to email
        const fullName = data.user.user_metadata?.full_name || 
                        data.user.user_metadata?.name || 
                        data.user.email?.split('@')[0] || 
                        'there';
        
        // Extract first name (everything before the first space)
        const firstName = fullName.split(' ')[0];
        
        toast({
          title: `Welcome back ${firstName} !`,
          description: "You have successfully logged in.",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    try {
      console.log('Attempting Google sign in...');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      
      if (error) {
        console.error('Google sign in error:', error);
        toast({
          title: "Google Sign In Failed",
          description: error.message || "Failed to sign in with Google. Please check if Google OAuth is configured in your Supabase project.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Google sign in catch error:', error);
      toast({
        title: "Error",
        description: "Failed to sign in with Google. Please try again or check your internet connection.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const handleGoToSignUp = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.rpc('get_system_setting_bool', { _key: 'enable_new_user_registration' });
      if (error) {
        console.error('Failed to load registration setting', error);
      }
      if (data === false) {
        toast({
          title: 'Registration Disabled',
          description: 'New user registration is currently disabled by an administrator.',
          variant: 'destructive',
        });
        return;
      }
      navigate('/auth/signup');
    } catch (err) {
      console.error('Error checking registration setting', err);
      toast({
        title: 'Registration Unavailable',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  // Show mobile welcome screen on mobile layout
  if (layoutType === 'mobile' && !showLoginForm) {
    return (
      <MobileWelcome
        onSignUp={() => handleGoToSignUp({ preventDefault: () => {} } as React.MouseEvent)}
        onLogin={() => setShowLoginForm(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="flex items-center justify-center mb-12 min-h-[80px]">
          {currentLogoUrl ? (
            <Link to="/" className="cursor-pointer">
              <img 
                src={currentLogoUrl}
                alt="Logo" 
                className="h-20 w-auto max-w-[300px] hover:opacity-80 transition-opacity"
              />
            </Link>
          ) : (
            <div className="h-20 w-32 bg-muted/20 animate-pulse rounded" />
          )}
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-semibold text-foreground mb-8 text-center">
          Unlock Your Video Insights
        </h1>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">
              Enter your email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="example@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
              required
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-muted-foreground">
              Enter your password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="********"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground pr-10"
                required
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

          {/* Login Button */}
          <Button
            type="submit"
            disabled={loading || !formData.email || !formData.password}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-medium"
          >
            {loading ? "Logging in..." : "Log In"}
          </Button>
        </form>

        {/* Divider */}
        {/* Social Login Buttons */}
        {googleOAuthEnabled && (
          <>
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-border"></div>
              <span className="px-4 text-sm text-muted-foreground">or</span>
              <div className="flex-1 border-t border-border"></div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleGoogleSignIn}
                variant="outline"
                disabled={loading}
                className="w-full py-3 rounded-xl border-border hover:bg-muted/50"
              >
                {loading ? "Connecting..." : "Continue with Google"}
              </Button>
            </div>
          </>
        )}

        {/* Footer Links */}
        <div className="mt-8 text-center space-y-4">
          <div className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button onClick={handleGoToSignUp} className="text-primary font-medium underline underline-offset-2">
              Sign Up
            </button>
          </div>
          <Link to="/auth/forgot-password" className="text-sm text-primary font-medium block">
            Forgot Password?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
