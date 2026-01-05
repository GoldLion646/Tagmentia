import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { useLogoConfiguration } from "@/hooks/useLogoConfiguration";


interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper = ({ children }: AuthWrapperProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentLogoUrl } = useLogoConfiguration();
  
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminSubdomain = window.location.hostname.startsWith('admin.');
  const publicRoutes = isAdminSubdomain
    ? ['/auth/login', '/auth/forgot-password', '/auth/reset-password', '/account-suspended']
    : ['/', '/home', '/splash', '/auth/login', '/auth/signup', '/auth/verify-email', '/auth/onboarding', '/auth/forgot-password', '/account-suspended'];
  const isPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route));

  const checkUserRole = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin'
      });
      
      if (error) {
        console.error('Error checking user role:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  };

  const updateLastLogin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);
      
      if (error) {
        console.error('Error updating last login:', error);
      }
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  };

  const redirectBasedOnRole = async (user: User, isFromSignIn = false) => {
    try {
      const isAdmin = await checkUserRole(user.id);
      const currentDomain = window.location.hostname;
      const isOnAdminSubdomain = currentDomain.startsWith('admin.');

      // Redirect normal users away from admin subdomain to main app URL
      if (!isAdmin && isOnAdminSubdomain) {
        window.location.href = 'https://tagmentia-app.lovable.app/';
        return;
      }

      // Default in-domain navigation after sign-in
      if (isFromSignIn && isPublicRoute) {
        navigate(isOnAdminSubdomain ? '/' : '/dashboard');
      }
    } catch (error) {
      console.error('Error in role-based redirect:', error);
      if (isFromSignIn && isPublicRoute) {
        navigate(isAdminSubdomain ? '/' : '/dashboard');
      }
    }
  };

  const verifyAccountStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        console.error('Error fetching profile status:', error);
        return;
      }
      if (data?.status === 'frozen') {
        if (!location.pathname.startsWith('/account-suspended')) {
          await supabase.auth.signOut();
          navigate('/account-suspended', { replace: true });
        }
      }
    } catch (e) {
      console.error('verifyAccountStatus error:', e);
    }
};


  useEffect(() => {
    // 1) Listen for auth changes first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (event === 'SIGNED_IN' && nextSession?.user) {
        redirectBasedOnRole(nextSession.user, true);
        setTimeout(() => {
          verifyAccountStatus(nextSession.user!.id);
          updateLastLogin(nextSession.user!.id);
        }, 0);
      }
      if (event === 'SIGNED_OUT' && !isPublicRoute) {
        navigate(isAdminSubdomain ? '/auth/login' : '/splash');
      }
    });

    // 2) Then get existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          if (isPublicRoute) {
            redirectBasedOnRole(session.user, false);
          } else {
            // Check if user is on correct domain for their role
            redirectBasedOnRole(session.user, false);
          }
          verifyAccountStatus(session.user.id);
        } else if (!session?.user && !isPublicRoute) {
          navigate(isAdminSubdomain ? '/auth/login' : '/splash');
        }
      })
      .catch((error) => {
        console.error('Session check error:', error);
        if (!isPublicRoute) navigate(isAdminSubdomain ? '/auth/login' : '/splash');
      })
      .finally(() => setLoading(false));

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname, isPublicRoute]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-center">
          {currentLogoUrl ? (
            <div className="mb-4 flex justify-center">
              <img 
                src={currentLogoUrl} 
                alt="Logo" 
                className="h-20 w-auto max-w-[200px] object-contain"
              />
            </div>
          ) : (
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-elevated">
              <span className="text-3xl font-bold text-primary">T</span>
            </div>
          )}
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
    </>
  );
};