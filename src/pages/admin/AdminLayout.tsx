import { Outlet } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/AdminSidebar"

export function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b bg-white border-slate-200">
            <SidebarTrigger className="ml-2 text-slate-700 hover:text-slate-900" />
          </header>
          <main className="flex-1 bg-slate-50">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}