import { Link, useLocation } from "react-router-dom";
import { Home, Grid3x3, Search, Bell, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationProps {
  activeTab?: string;
}

export const Navigation = ({ activeTab }: NavigationProps) => {
  const location = useLocation();
  
  const navItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard", key: "dashboard" },
    { icon: Grid3x3, label: "Categories", path: "/categories", key: "categories" },
    { icon: Search, label: "Search", path: "/search", key: "search" },
    { icon: Bell, label: "Reminders", path: "/reminders", key: "reminders" },
    { icon: UserCircle, label: "Account", path: "/account", key: "account" },
  ];

  const isActive = (path: string, key: string) => {
    if (activeTab) {
      return activeTab === key;
    }
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-sm border-t border-border pb-safe">
      <div className="flex items-center justify-around py-2 px-4">
        {navItems.map(({ icon: Icon, label, path, key }) => (
          <Link
            key={key}
            to={path}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-all duration-200 min-w-0",
              isActive(path, key)
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-medium truncate">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};