import { Link, useLocation } from "react-router-dom";
import { Home, Grid3x3, Search, BookOpen, UserCircle, ChevronLeft, ChevronRight, Bell, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLayoutBreakpoint } from "@/hooks/useLayoutBreakpoint";

export const LeftSidebarNav = () => {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useLayoutBreakpoint();
  
  const navItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard-web", key: "dashboard" },
    { icon: Grid3x3, label: "Categories", path: "/categories-web", key: "categories" },
    { icon: Video, label: "Videos", path: "/videos-web", key: "videos" },
    { icon: Search, label: "Search", path: "/search-web", key: "search" },
    { icon: Bell, label: "Reminders", path: "/reminders-web", key: "reminders" },
    { icon: BookOpen, label: "Notes", path: "/notes-web", key: "notes" },
    { icon: UserCircle, label: "Account", path: "/account-web", key: "account" },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-40 flex flex-col",
        sidebarCollapsed ? "w-[72px]" : "w-[240px]"
      )}
    >
      {/* Header with collapse button */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!sidebarCollapsed && (
          <h2 className="font-semibold text-lg text-foreground">Menu</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="ml-auto"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map(({ icon: Icon, label, path, key }) => (
            <li key={key}>
              <Link
                to={path}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 relative group",
                  isActive(path)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                aria-current={isActive(path) ? "page" : undefined}
              >
                {/* Active indicator bar */}
                {isActive(path) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                )}
                
                <Icon className="w-5 h-5 flex-shrink-0" />
                
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium truncate">{label}</span>
                )}

                {/* Tooltip for collapsed state */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {label}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};
