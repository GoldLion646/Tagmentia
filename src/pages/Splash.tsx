import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLogoConfiguration } from "@/hooks/useLogoConfiguration";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";

const Splash = () => {
  const navigate = useNavigate();
  const { currentLogoUrl } = useLogoConfiguration();
  const { layoutType } = useDeviceDetection();

  useEffect(() => {
    const run = async () => {
      // Splash delay before navigating
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check session and navigate accordingly
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate("/dashboard");
        } else {
          navigate("/auth/login");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/auth/login");
      }
    };

    run();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="flex items-center justify-center min-h-[80px]">
            {currentLogoUrl && (
              <img 
                src={currentLogoUrl} 
                alt="Logo" 
                className="h-12 sm:h-16 md:h-20 lg:h-24 w-auto max-w-[150px] sm:max-w-[200px] md:max-w-[300px] lg:max-w-[400px] object-contain"
                style={{ display: 'block' }}
              />
            )}
          </div>
        </div>
        
        {/* Loading Animation */}
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    </div>
  );
};

export default Splash;