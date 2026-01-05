import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLogoConfiguration } from "@/hooks/useLogoConfiguration";

export default function AccountSuspended() {
  const { currentLogoUrl } = useLogoConfiguration();
  useEffect(() => {
    document.title = "Account Suspended";
    const desc = "Your account is suspended. Contact support to restore access.";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', desc);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center">
            {currentLogoUrl ? (
              <img 
                src={`${currentLogoUrl}?t=${Date.now()}`}
                alt="Company Logo" 
                className="h-8 w-auto max-w-[200px] object-contain"
              />
            ) : (
              <div className="h-8 w-32 bg-muted/20 animate-pulse rounded" />
            )}
          </div>
        </div>
      </header>
      <main>
        <section className="container mx-auto px-6 py-16">
          <article className="max-w-xl mx-auto text-center space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Account Suspended</h1>
            <p className="text-muted-foreground">
              This account has been frozen by an administrator. You can no longer access the application.
              If you believe this is a mistake, please contact support.
            </p>
            <div className="flex items-center justify-center gap-3">
              <a href="mailto:support@tagmentia.com" className="underline underline-offset-4">Contact support</a>
              <span className="opacity-40">•</span>
              <Button asChild>
                <a href="/auth/login">Sign in with another account</a>
              </Button>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
