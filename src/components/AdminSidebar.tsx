import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Settings, 
  FileText,
  Search,
  Megaphone,
  Key,
  LogOut,
  Home,
  ListChecks
} from "lucide-react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { useState } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "@/hooks/use-toast"
import { useLogoConfiguration } from "@/hooks/useLogoConfiguration"

const items = [
  { title: "Dashboard Home", url: "/admin", icon: LayoutDashboard },
  { title: "User Management", url: "/admin/users", icon: Users },
  { title: "Waitlist", url: "/admin/waitlist", icon: ListChecks },
  { title: "Broadcasting", url: "/admin/messaging", icon: Megaphone },
  { title: "Billing", url: "/admin/billing", icon: CreditCard },
  { title: "Subscription Management", url: "/admin/subscriptions", icon: FileText },
  { title: "Configuration", url: "/admin/configuration", icon: Key },
  { title: "System & Settings", url: "/admin/settings", icon: Settings },
]

export function AdminSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname
  const isCollapsed = state === "collapsed"
  const [searchQuery, setSearchQuery] = useState("")
  const { currentLogoUrl } = useLogoConfiguration()
  
  console.log('🔍 AdminSidebar: Rendering with currentLogoUrl:', currentLogoUrl);
  console.log('🔍 AdminSidebar: currentLogoUrl type:', typeof currentLogoUrl);
  console.log('🔍 AdminSidebar: currentLogoUrl truthy?', !!currentLogoUrl);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    
    if (query.trim()) {
      // Navigate to user management with search query
      navigate(`/admin/users?search=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        toast({
          title: "Error",
          description: "Failed to sign out. Please try again.",
          variant: "destructive",
        })
      } else {
        navigate("/auth/login")
      }
    } catch (err) {
      toast({
        title: "Error", 
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  const isActive = (path: string) => {
    if (path === "/admin") {
      return currentPath === "/admin"
    }
    return currentPath.startsWith(path)
  }
  
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted/50"

  return (
    <Sidebar
      collapsible="icon"
      className="bg-slate-900 border-slate-800"
    >
      <SidebarContent className="bg-slate-900">
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-center min-h-[64px]">
            {currentLogoUrl ? (
              <img 
                src={currentLogoUrl} 
                alt="Logo" 
                className={isCollapsed ? "h-12 w-auto" : "h-16 w-auto max-w-[240px]"}
                onLoad={() => console.log('✅ AdminSidebar: Logo loaded successfully')}
                onError={(e) => {
                  console.log('❌ AdminSidebar: Logo failed to load:', currentLogoUrl);
                  console.log('❌ AdminSidebar: Error:', e);
                }}
              />
            ) : (
              <div className={isCollapsed ? "h-12 w-12 bg-slate-700/50 animate-pulse rounded" : "h-16 w-32 bg-slate-700/50 animate-pulse rounded"} />
            )}
          </div>
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search users, subscriptions..." 
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 uppercase text-xs font-semibold tracking-wider px-4">
            Admin Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title} className="px-2">
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/admin"}
                      className={({ isActive }) => 
                        isActive 
                          ? "bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors" 
                          : "text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      }
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom Navigation */}
        <div className="mt-auto p-2 space-y-1">
          {/* User Dashboard Button */}
          <SidebarMenuButton 
            onClick={() => navigate("/dashboard-web")}
            className="w-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Home className="mr-2 h-4 w-4" />
            {!isCollapsed && <span>User Dashboard</span>}
          </SidebarMenuButton>
          
          {/* Logout Button */}
          <SidebarMenuButton 
            onClick={handleLogout}
            className="w-full text-slate-300 hover:text-white hover:bg-red-600/20 transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {!isCollapsed && <span>Logout</span>}
          </SidebarMenuButton>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}