import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface RequireAdminProps {
  children: React.ReactNode;
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    // Listen to auth changes (sync only state updates here)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
      if (session?.user) {
        // Defer Supabase calls to avoid deadlocks
        setTimeout(() => {
          checkIsAdmin(session.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    // Fetch initial session then role
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      setIsAuthed(!!session);
      if (session?.user) {
        checkIsAdmin(session.user.id);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkIsAdmin = async (userId: string) => {
    try {
      // Prefer RPC to leverage SECURITY DEFINER
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (error) throw error;
      setIsAdmin(!!data);
    } catch (_e) {
      // Fallback to checking user_roles directly
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .limit(1);
      setIsAdmin(!!(roles && roles.length > 0));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 animate-spin rounded-full border border-primary/30 border-t-primary" />
          <span className="text-sm opacity-80">Checking admin access…</span>
        </div>
      </div>
    );
  }

  // Not authenticated: send to admin login on this subdomain
  if (!isAuthed) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  // Authenticated but not admin: show 403 to avoid confusing loop to login
  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Access denied</h1>
          <p className="text-sm text-muted-foreground">
            You are signed in but do not have permission to view the admin panel.
          </p>
          <div className="text-sm">
            <a className="underline underline-offset-4" href="https://tagmentia.com/">
              Go to main site
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
