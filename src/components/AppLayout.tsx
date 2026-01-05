import { ReactNode } from "react";
import { useLayoutBreakpoint } from "@/hooks/useLayoutBreakpoint";
import { Navigation } from "@/components/Navigation";
import { LeftSidebarNav } from "@/components/LeftSidebarNav";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { isMobile, sidebarCollapsed } = useLayoutBreakpoint();

  return (
    <div className="app-shell min-h-screen">
      {/* Desktop Sidebar */}
      {!isMobile && <LeftSidebarNav />}

      {/* Main Content */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          "pb-safe", // Only bottom safe area padding for navigation bar
          !isMobile && (sidebarCollapsed ? "ml-[72px]" : "ml-[240px]"),
          isMobile && "pb-20" // Bottom padding for mobile nav (in addition to safe area)
        )}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && <Navigation />}
    </div>
  );
};
