import * as React from "react"
import { Bell, Search, Menu } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function TopNavbar({ 
  onMenuClick, 
  title 
}: { 
  onMenuClick: () => void,
  title?: React.ReactNode 
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
        <Menu className="h-5 w-5" />
      </Button>
      
      <div className="flex-1 flex items-center gap-4">
        {title && <div className="hidden md:block">{title}</div>}
      </div>

      <div className="flex flex-1 items-center justify-end space-x-4">
        <div className="w-full max-w-sm relative hidden sm:block">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search employees, departments, policies..."
            className="w-full bg-muted/50 pl-9 border-none focus-visible:ring-1"
          />
        </div>
        
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>
        
        <Avatar className="h-8 w-8 cursor-pointer border border-border">
          <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="@admin" />
          <AvatarFallback>AD</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
