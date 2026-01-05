import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileWelcome from "./MobileWelcome";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const MobileWelcomePage = () => {
  const navigate = useNavigate();

  // Check if user is already logged in and redirect to dashboard
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Session check error:", error);
      }
    };
    checkSession();
  }, [navigate]);

  const handleSignUp = async () => {
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

  const handleLogin = () => {
    navigate('/auth/login');
  };

  return <MobileWelcome onSignUp={handleSignUp} onLogin={handleLogin} />;
};

export default MobileWelcomePage;

