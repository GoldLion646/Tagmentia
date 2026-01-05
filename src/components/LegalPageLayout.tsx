import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Scale, Shield, MessageSquare, Trash2 } from "lucide-react";

interface LegalPageLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
}

export const LegalPageLayout = ({ children, title, description }: LegalPageLayoutProps) => {
  const location = useLocation();
  const currentYear = new Date().getFullYear();

  const navLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/privacy-policy", label: "Privacy", icon: Shield },
    { to: "/terms", label: "Terms", icon: Scale },
    { to: "/support", label: "Support", icon: MessageSquare },
    { to: "/account-deletion", label: "Delete Account", icon: Trash2 },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* SEO Meta Tags */}
      <title>{title} | Tagmentia</title>
      <meta name="description" content={description} />
      
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl" style={{ color: "#545DEA" }}>
            <span>Tagmentia</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                  isActive(to) ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-2">
            {navLinks.map(({ to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`p-2 rounded-md transition-colors ${
                  isActive(to) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary"
                }`}
                aria-label={to}
              >
                <Icon className="h-5 w-5" />
              </Link>
            ))}
          </div>
        </nav>
      </header>

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <span className="text-foreground">{title}</span>
        </nav>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/30 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              © {currentYear} Disinnova Ltd. All rights reserved.
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <Link to="/support" className="text-muted-foreground hover:text-primary transition-colors">
                Contact Support
              </Link>
              <Link to="/account-deletion" className="text-muted-foreground hover:text-primary transition-colors">
                Account Deletion
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
