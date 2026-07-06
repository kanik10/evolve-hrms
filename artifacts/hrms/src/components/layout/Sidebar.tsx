import * as React from "react"
import { Link, useLocation } from "wouter"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Upload, 
  CalendarClock, 
  Palmtree, 
  Banknote, 
  Target, 
  BarChart4, 
  BrainCircuit, 
  FileText, 
  CheckSquare, 
  Settings,
  ChevronDown
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  isActive?: boolean;
  children?: React.ReactNode;
  isExpanded?: boolean;
}

const SidebarItem = ({ icon, label, href, isActive, children, isExpanded = true }: SidebarItemProps) => {
  const [isOpen, setIsOpen] = React.useState(isActive || false)

  if (children) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80"
            )}
          >
            <div className="flex items-center gap-3">
              {icon}
              {isExpanded && <span>{label}</span>}
            </div>
            {isExpanded && (
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            )}
          </button>
        </CollapsibleTrigger>
        {isExpanded && (
          <CollapsibleContent className="space-y-1 px-3 py-1">
            <div className="ml-5 space-y-1 border-l border-sidebar-border pl-2">
              {children}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    )
  }

  return (
    <Link href={href || "#"} className="w-full block">
      <div
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" : "text-sidebar-foreground/80"
        )}
      >
        {icon}
        {isExpanded && <span>{label}</span>}
      </div>
    </Link>
  )
}

const SubItem = ({ label, href, isActive }: { label: string; href: string; isActive?: boolean }) => (
  <Link href={href} className="w-full block">
    <div
      className={cn(
        "block rounded-md px-3 py-1.5 text-sm transition-colors hover:text-sidebar-foreground",
        isActive ? "font-medium text-sidebar-primary" : "text-sidebar-foreground/60"
      )}
    >
      {label}
    </div>
  </Link>
)

export function Sidebar({ isExpanded = true, onNavigate }: { isExpanded?: boolean; onNavigate?: () => void }) {
  const [location] = useLocation()

  return (
    <div className={cn(
      "fixed inset-y-0 left-0 z-20 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out",
      isExpanded ? "w-64" : "w-16"
    )}>
      <div className="flex h-14 items-center justify-center border-b border-sidebar-border px-4">
        {isExpanded ? (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-sidebar-foreground tracking-tight">CoreHR</span>
          </div>
        ) : (
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        <nav className="space-y-1 px-2">
          <SidebarItem 
            icon={<LayoutDashboard className="h-5 w-5" />} 
            label="Dashboard" 
            href="/dashboard"
            isActive={location === "/dashboard"}
            isExpanded={isExpanded}
          />
          
          <SidebarItem 
            icon={<Building2 className="h-5 w-5" />} 
            label="Organization" 
            isActive={location.startsWith("/organization")}
            isExpanded={isExpanded}
          >
            <SubItem label="Company Profile" href="/organization/company" isActive={location === "/organization/company"} />
            <SubItem label="Departments" href="/organization/departments" isActive={location === "/organization/departments"} />
            <SubItem label="Designations" href="/organization/designations" isActive={location === "/organization/designations"} />
            <SubItem label="Locations" href="/organization/locations" isActive={location === "/organization/locations"} />
            <SubItem label="Business Units" href="/organization/business-units" isActive={location === "/organization/business-units"} />
            <SubItem label="Cost Centers" href="/organization/cost-centers" isActive={location === "/organization/cost-centers"} />
            <SubItem label="Grades" href="/organization/grades" isActive={location === "/organization/grades"} />
            <SubItem label="Employment Types" href="/organization/employment-types" isActive={location === "/organization/employment-types"} />
            <SubItem label="Holiday Calendar" href="/organization/holiday-calendar" isActive={location === "/organization/holiday-calendar"} />
            <SubItem label="Shift Management" href="/organization/shifts" isActive={location === "/organization/shifts"} />
            <SubItem label="Leave Policies" href="/organization/leave-policies" isActive={location === "/organization/leave-policies"} />
            <SubItem label="Salary Structures" href="/organization/salary-structures" isActive={location === "/organization/salary-structures"} />
          </SidebarItem>

          <SidebarItem 
            icon={<Users className="h-5 w-5" />} 
            label="Employees" 
            href="/employees"
            isActive={location.startsWith("/employees")}
            isExpanded={isExpanded}
          />

          <SidebarItem 
            icon={<Upload className="h-5 w-5" />} 
            label="Bulk Upload" 
            href="/import"
            isActive={location.startsWith("/import")}
            isExpanded={isExpanded}
          />

          <SidebarItem 
            icon={<CalendarClock className="h-5 w-5" />} 
            label="Attendance" 
            href="/attendance"
            isActive={location.startsWith("/attendance")}
            isExpanded={isExpanded}
          />

          <SidebarItem 
            icon={<Palmtree className="h-5 w-5" />} 
            label="Leave" 
            href="/leave"
            isActive={location.startsWith("/leave")}
            isExpanded={isExpanded}
          />

          <SidebarItem 
            icon={<Banknote className="h-5 w-5" />} 
            label="Payroll" 
            href="/payroll"
            isActive={location.startsWith("/payroll")}
            isExpanded={isExpanded}
          />

          <SidebarItem 
            icon={<Target className="h-5 w-5" />} 
            label="Performance" 
            href="/performance"
            isActive={location.startsWith("/performance")}
            isExpanded={isExpanded}
          />

          <SidebarItem 
            icon={<BarChart4 className="h-5 w-5" />} 
            label="Reports" 
            href="/reports"
            isActive={location.startsWith("/reports")}
            isExpanded={isExpanded}
          />

          <SidebarItem 
            icon={<BrainCircuit className="h-5 w-5" />} 
            label="AI Insights" 
            href="/ai"
            isActive={location.startsWith("/ai")}
            isExpanded={isExpanded}
          />

          <SidebarItem 
            icon={<FileText className="h-5 w-5" />} 
            label="Documents" 
            href="/documents"
            isActive={location.startsWith("/documents")}
            isExpanded={isExpanded}
          />

          <SidebarItem 
            icon={<CheckSquare className="h-5 w-5" />} 
            label="Approvals" 
            href="/approvals"
            isActive={location.startsWith("/approvals")}
            isExpanded={isExpanded}
          />

          <SidebarItem 
            icon={<Settings className="h-5 w-5" />} 
            label="Administration" 
            isActive={location.startsWith("/administration")}
            isExpanded={isExpanded}
          >
            <SubItem label="Users" href="/administration" isActive={location === "/administration"} />
            <SubItem label="Roles" href="/administration/roles" isActive={location === "/administration/roles"} />
            <SubItem label="Settings" href="/administration/settings" isActive={location === "/administration/settings"} />
          </SidebarItem>
        </nav>
      </div>
    </div>
  )
}
