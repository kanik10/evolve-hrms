import * as React from "react"
import { Sidebar } from "./Sidebar"
import { TopNavbar } from "./TopNavbar"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent } from "@/components/ui/sheet"

export function AppLayout({ children, breadcrumb }: { children: React.ReactNode, breadcrumb?: React.ReactNode }) {
  const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(true)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar isExpanded={isSidebarExpanded} />
      </div>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 border-sidebar-border bg-sidebar">
          <Sidebar isExpanded={true} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
        isSidebarExpanded ? "lg:pl-64" : "lg:pl-16"
      )}>
        <TopNavbar 
          onMenuClick={() => {
            // toggle desktop; open mobile drawer on small screens
            if (window.innerWidth >= 1024) {
              setIsSidebarExpanded(!isSidebarExpanded)
            } else {
              setMobileOpen(true)
            }
          }} 
          title={breadcrumb}
        />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
