import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLogoConfiguration } from "@/hooks/useLogoConfiguration";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const { currentLogoUrl } = useLogoConfiguration();
  const [searchParams] = useSearchParams();
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  
  const email = searchParams.get('email') || '';

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: verificationCode,
        type: 'signup'
      });

      if (error) {
        toast({
          title: "Verification Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        // Mark profile as confirmed immediately after successful verification
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ email_confirmed: true })
          .eq('id', data.user.id);
        if (profileError) {
          console.error('Failed to update profile confirmation status', profileError);
        }

        toast({
          title: "Email Verified!",
          description: "Your account has been successfully verified.",
        });
        navigate("/auth/onboarding");
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

  const handleResendCode = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        toast({
          title: 'Could not resend code',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Code Sent',
        description: 'A new verification code has been sent to your email.',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'Failed to resend the verification code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 pb-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate("/auth/signup")}
          className="p-2 -ml-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 text-center text-lg font-medium">Verify Your Account</h1>
        <div className="w-9"></div>
      </div>

      <div className="flex-1 px-6 py-8 text-center">
        {/* Logo Section */}
        <div className="flex items-center justify-center mb-8">
          {currentLogoUrl ? (
            <img 
              src={currentLogoUrl}
              alt="Logo" 
              className="h-14 w-auto max-w-[200px]"
            />
          ) : (
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mr-2 border border-border/20">
                <span className="text-lg font-bold text-primary">T</span>
              </div>
              <div className="bg-primary px-3 py-1 rounded-xl">
                <span className="text-lg font-bold text-white">agmentia</span>
              </div>
            </div>
          )}
        </div>

        {/* Email Icon */}
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-primary" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-semibold text-foreground mb-3">
          Check your email!
        </h2>

        {/* Description */}
        <p className="text-muted-foreground mb-2">
          We have sent a 6-digit verification
        </p>
        <p className="text-muted-foreground mb-6">
          code to <span className="text-primary font-medium">{email || 'your email'}</span>.
        </p>
        <p className="text-muted-foreground mb-8">
          Please check your inbox and spam folder.
        </p>

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-left">
              Please enter the code below to continue.
            </p>
            <Input
              placeholder="Enter verification code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              className="bg-muted/50 border-border text-center text-lg tracking-widest"
              maxLength={6}
              inputMode="numeric"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || verificationCode.length !== 6}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-medium"
          >
            {loading ? "Verifying..." : "Verify Code"}
          </Button>
        </form>

        {/* Resend Options */}
        <div className="mt-8 space-y-4">
          <p className="text-sm text-muted-foreground">
            Didn't receive the code or it expired?
          </p>
          
          <Button
            onClick={handleResendCode}
            disabled={resending}
            variant="outline"
            className="w-full py-3 rounded-xl border-border hover:bg-muted/50"
          >
            {resending ? "Sending..." : "Resend Verification Code"}
          </Button>

          <Button
            variant="ghost"
            className="text-primary hover:bg-primary/10"
          >
            <Mail className="w-4 h-4 mr-2" />
            Get help
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;