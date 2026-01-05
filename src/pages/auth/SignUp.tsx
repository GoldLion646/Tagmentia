import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PhoneInput } from "@/components/PhoneInput";
import { CountrySelect } from "@/components/CountrySelect";
import { sanitizeInput, validateEmail, validatePassword, validateTextInput, rateLimitCheck } from "@/utils/inputSanitization";
import { securityLogger } from "@/utils/securityLogger";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { useLogoConfiguration } from "@/hooks/useLogoConfiguration";

const SignUp = () => {
  const navigate = useNavigate();
  const { currentLogoUrl } = useLogoConfiguration();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birthDate: {
      day: "",
      month: "",
      year: ""
    },
    country: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [registrationBlocked, setRegistrationBlocked] = useState<boolean>(false);
  const [settingsChecked, setSettingsChecked] = useState<boolean>(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState<boolean>(false);

  useEffect(() => {
    const checkRegistrationSetting = async () => {
      try {
        const { data: registrationData, error: registrationError } = await supabase.rpc('get_system_setting_bool', { _key: 'enable_new_user_registration' });
        if (registrationError) {
          console.error('Failed to load registration setting', registrationError);
        }
        // When toggle is OFF, users should NOT be able to register
        setRegistrationBlocked(registrationData === false);

        const { data: googleData, error: googleError } = await supabase.rpc('get_system_setting_bool', { _key: 'google_oauth_enabled' });
        if (googleError) {
          console.error('Failed to load Google OAuth setting', googleError);
        }
        setGoogleOAuthEnabled(googleData === true);
      } catch (err) {
        console.error('Error checking settings', err);
      } finally {
        setSettingsChecked(true);
      }
    };
    checkRegistrationSetting();
  }, []);

  const getDaysInMonth = (month: string, year: string) => {
    if (!month || !year) return 31; // Default to 31 if month/year not selected
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    return new Date(yearNum, monthNum, 0).getDate();
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => {
        const newData = {
          ...prev,
          [parent]: {
            ...prev[parent as keyof typeof prev] as any,
            [child]: value
          }
        };
        
        // If month or year changed, validate day
        if (parent === 'birthDate' && (child === 'month' || child === 'year')) {
          const birthDate = newData.birthDate as any;
          const maxDays = getDaysInMonth(birthDate.month, birthDate.year);
          if (parseInt(birthDate.day) > maxDays) {
            birthDate.day = maxDays.toString().padStart(2, '0');
          }
        }
        
        return newData;
      });
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handlePhoneChange = (value: string | undefined) => {
    setFormData(prev => ({ ...prev, mobile: value || "" }));
  };

  const isValidPhoneNumber = (phone: string) => {
    // Basic validation - check if phone number exists and has reasonable length
    return phone && phone.length >= 10;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (registrationBlocked) {
      toast({
        title: "Registration Disabled",
        description: "New user registration is currently disabled by an administrator.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Input sanitization
    const firstName = sanitizeInput(formData.firstName);
    const lastName = sanitizeInput(formData.lastName);
    const email = sanitizeInput(formData.email);
    const country = sanitizeInput(formData.country);
    const mobile = sanitizeInput(formData.mobile);

    // CLIENT-SIDE VALIDATIONS FIRST (before rate limiting)
    // These should not trigger rate limiting as they're input validation errors
    
    const firstNameValidation = validateTextInput(firstName, 1, 50, 'First name');
    if (!firstNameValidation.isValid) {
      toast({
        title: "Invalid Input",
        description: firstNameValidation.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const lastNameValidation = validateTextInput(lastName, 1, 50, 'Last name');
    if (!lastNameValidation.isValid) {
      toast({
        title: "Invalid Input",
        description: lastNameValidation.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!formData.country.trim()) {
      toast({
        title: "Missing Information",
        description: "Country is required.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!formData.mobile.trim() || !isValidPhoneNumber(formData.mobile)) {
      toast({
        title: "Invalid Mobile Number",
        description: "Please enter a valid mobile number.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!formData.birthDate.day || !formData.birthDate.month || !formData.birthDate.year) {
      toast({
        title: "Missing Information",
        description: "Complete birthdate is required.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      toast({
        title: "Weak Password",
        description: passwordValidation.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // RATE LIMITING CHECK - Only after all client-side validations pass
    // This prevents users from being blocked for simple input errors
    if (!rateLimitCheck(`signup_${email}`, 3, 60 * 60 * 1000)) {
      await securityLogger.logRateLimitExceeded(email, 'signup_attempt');
      toast({
        title: "Too Many Attempts",
        description: "Please wait an hour before trying again",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/onboarding`,
          data: {
            first_name: firstName,
            last_name: lastName,
            country,
            mobile,
            birth_date: `${formData.birthDate.year}-${formData.birthDate.month.padStart(2, '0')}-${formData.birthDate.day.padStart(2, '0')}`,
            avatar_url: avatarUrl
          }
        }
      });

      if (error) {
        console.log('Sign up error:', error); // Debug log
        console.log('Error code:', error.code); // Debug log 
        console.log('Error message:', error.message); // Debug log
        console.log('Error status:', error.status); // Debug log
        
        // Log the attempt for security monitoring
        await securityLogger.logAuthFailure(email, 'signup_attempt_failed');
        
        toast({
          title: "Sign Up Failed",
          description: error.message || "An error occurred during sign up. Please try again.",
          variant: "destructive",
        });
        
        setLoading(false);
        return;
      }

      if (data.user) {
        console.log('User identities:', data.user.identities); // Debug log
        
        // Check if user was actually created by looking at identities array
        // Empty identities array means the email already exists
        if (data.user.identities && data.user.identities.length > 0) {
          // New user was created successfully
          toast({
            title: "Account Created!",
            description: "Please check your email to verify your account.",
          });
          navigate(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
        } else {
          // Email already exists - identities array is empty
          toast({
            title: "Account Already Exists",
            description: "An account with this email already exists. Please log in with your existing credentials or use 'Forgot Password' if you need to reset your password. Redirecting to login page...",
            variant: "destructive",
          });
          // Redirect to login page after a short delay
          setTimeout(() => {
            navigate("/auth/login");
          }, 2000);
        }
      } else {
        // No user returned, something went wrong
        toast({
          title: "Sign Up Failed",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
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

  const handleGoogleSignUp = async () => {
    if (registrationBlocked) {
      toast({
        title: "Registration Disabled",
        description: "New user registration is currently disabled by an administrator.",
        variant: "destructive",
      });
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      
      if (error) {
        toast({
          title: "Google Sign Up Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign up with Google. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/auth/login")}
            className="p-2 -ml-2"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="flex-1 text-center text-lg font-medium">Create Account</h1>
          <div className="w-9"></div> {/* Spacer for centering */}
        </div>

        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-2">
          {/* Logo Section */}
          <div className="flex items-center justify-center mb-8">
            {currentLogoUrl ? (
              <Link to="/" className="cursor-pointer">
                <img 
                  src={currentLogoUrl}
                  alt="Logo" 
                  className="h-16 w-auto max-w-[250px] hover:opacity-80 transition-opacity"
                />
              </Link>
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

          {/* Heading */}
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Create Account</h2>

        {registrationBlocked && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Registration Disabled</AlertTitle>
            <AlertDescription>
              New user registration is currently disabled by an administrator. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {/* Avatar Upload */}
        <div className="flex justify-center mb-6">
          <AvatarUpload
            currentAvatarUrl={avatarUrl}
            onAvatarChange={setAvatarUrl}
            size="lg"
            showUploadButton={true}
          />
        </div>

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Fields - Two Column on Web */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm text-foreground font-medium">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                className="bg-muted/50 border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm text-foreground font-medium">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                className="bg-muted/50 border-border"
                required
              />
            </div>
          </div>

          {/* Birthdate */}
          <div className="space-y-2">
            <Label className="text-sm text-foreground font-medium">Birthdate <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-3 gap-3">
              <Select onValueChange={(value) => handleInputChange("birthDate.day", value)} value={formData.birthDate.day}>
                <SelectTrigger className="bg-muted/50 border-border">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {Array.from({ length: getDaysInMonth(formData.birthDate.month, formData.birthDate.year) }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString().padStart(2, '0')}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select onValueChange={(value) => handleInputChange("birthDate.month", value)} value={formData.birthDate.month}>
                <SelectTrigger className="bg-muted/50 border-border">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="01">January</SelectItem>
                  <SelectItem value="02">February</SelectItem>
                  <SelectItem value="03">March</SelectItem>
                  <SelectItem value="04">April</SelectItem>
                  <SelectItem value="05">May</SelectItem>
                  <SelectItem value="06">June</SelectItem>
                  <SelectItem value="07">July</SelectItem>
                  <SelectItem value="08">August</SelectItem>
                  <SelectItem value="09">September</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">December</SelectItem>
                </SelectContent>
              </Select>
              
              <Select onValueChange={(value) => handleInputChange("birthDate.year", value)} value={formData.birthDate.year}>
                <SelectTrigger className="bg-muted/50 border-border">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Country & Mobile - Two Column on Web */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm text-foreground font-medium">
                Country <span className="text-destructive">*</span>
              </Label>
              <CountrySelect
                value={formData.country}
                onValueChange={(value) => handleInputChange("country", value)}
                placeholder="Select your country"
                className="bg-muted/50 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile" className="text-sm text-foreground font-medium">
                Mobile Number <span className="text-destructive">*</span>
              </Label>
              <PhoneInput
                value={formData.mobile}
                onChange={handlePhoneChange}
                placeholder="Enter your phone number"
                className="bg-muted/50 border-border"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-foreground font-medium">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="bg-muted/50 border-border"
              required
            />
          </div>

          {/* Password Fields */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-foreground font-medium">
              Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="bg-muted/50 border-border pr-10"
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
            {/* Password Requirements */}
            {formData.password && (
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded-md">
                <p className="font-medium text-foreground">Password must include:</p>
                <ul className="space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• At least one uppercase letter (A-Z)</li>
                  <li>• At least one lowercase letter (a-z)</li>
                  <li>• At least one number (0-9)</li>
                  <li>• At least one special character (!@#$%^&*)</li>
                </ul>
              </div>
            )}
          </div>

           <div className="space-y-2">
             <div className="relative">
               <Input
                 type={showConfirmPassword ? "text" : "password"}
                 placeholder="Confirm password"
                 value={formData.confirmPassword}
                 onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                 className="bg-muted/50 border-border pr-10"
                 required
               />
               <button
                 type="button"
                 onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
               >
                 {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
               </button>
             </div>
             {/* Password Strength Indicator */}
             <PasswordStrengthIndicator 
               password={formData.password} 
               className="mt-3"
             />
           </div>

          {/* Create Account Button */}
          <Button
            type="submit"
            disabled={loading || registrationBlocked}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-medium mt-6"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-border"></div>
          <span className="px-4 text-sm text-muted-foreground">or</span>
          <div className="flex-1 border-t border-border"></div>
        </div>

        {/* Social Sign Up Buttons */}
        {googleOAuthEnabled && (
          <div className="space-y-3 mb-6">
            <Button
              onClick={handleGoogleSignUp}
              variant="outline"
              disabled={registrationBlocked}
              className="w-full py-3 rounded-xl border-border hover:bg-muted/50"
            >
              <span className="mr-2">G</span> Sign up with Google
            </Button>
          </div>
        )}

          {/* Footer Links */}
          <div className="text-center space-y-3 pb-8">
            <div className="text-sm text-primary">
              <Link to="/auth/login">Already have an account? Log in</Link>
            </div>
            <div className="text-sm text-primary">
              <Link to="/auth/forgot-password">Forgot password?</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;