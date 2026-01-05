import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Settings, LogOut, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLogoConfiguration } from "@/hooks/useLogoConfiguration";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  children?: React.ReactNode;
}

export const Header = ({ title, showBack = false, children }: HeaderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentLogoUrl } = useLogoConfiguration();
  
  console.log('🔍 Header: Rendering with currentLogoUrl:', currentLogoUrl);
  console.log('🔍 Header: currentLogoUrl type:', typeof currentLogoUrl);
  console.log('🔍 Header: currentLogoUrl truthy?', !!currentLogoUrl);
  
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const checkIsAdmin = async (userId: string) => {
      try {
        // First try using the has_role function
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: userId,
          _role: 'admin'
        });
        
        if (!error && typeof data === 'boolean') {
          setIsAdmin(data);
          return;
        }
        
        // Fallback to direct query
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .single();
        
        setIsAdmin(!!roles);
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      }
    };

    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserAvatar(user.user_metadata?.avatar_url || null);
        setUserName(user.user_metadata?.first_name || user.email?.split('@')[0] || 'User');
        await checkIsAdmin(user.id);
      }
    };

    fetchUserData();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUserAvatar(session.user.user_metadata?.avatar_url || null);
        setUserName(session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || 'User');
        setTimeout(() => {
          checkIsAdmin(session.user.id);
        }, 0);
      } else {
        setUserAvatar(null);
        setUserName("");
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out",
      });
      
      navigate('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const handleProfileClick = () => {
    navigate('/account');
  };

  const handleAdminDashboardClick = () => {
    navigate('/admin');
  };

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-sm border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {showBack ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Back button clicked'); // Debug log
                
                // Check if there's history to go back to
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  // Fallback to dashboard if no history
                  navigate('/dashboard');
                }
              }}
              className="hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : null}
          
          {title ? (
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          ) : (
            <Link to="/" className="flex items-center justify-center min-h-[64px]">
              {currentLogoUrl ? (
                <img 
                  src={currentLogoUrl}
                  alt="Logo" 
                  className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto max-w-[200px] sm:max-w-[250px] md:max-w-[300px] lg:max-w-[350px]"
                  onLoad={() => console.log('✅ Header: Logo loaded successfully')}
                  onError={() => console.log('❌ Header: Logo failed to load:', currentLogoUrl)}
                />
              ) : (
                <div className="h-16 sm:h-20 md:h-24 lg:h-28 w-32 bg-muted/20 animate-pulse rounded" />
              )}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {children}
          
          {!showBack && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative group hover:bg-transparent hover:scale-105 transition-all duration-300 p-2"
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10 bg-gradient-primary border-2 border-primary/20 shadow-lg ring-2 ring-primary/10 group-hover:ring-4 group-hover:ring-primary/20 transition-all duration-300">
                      <AvatarImage src={userAvatar || undefined} alt="User avatar" />
                      <AvatarFallback className="text-white text-base font-bold bg-gradient-primary">
                        {userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleProfileClick}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={handleAdminDashboardClick}>
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};