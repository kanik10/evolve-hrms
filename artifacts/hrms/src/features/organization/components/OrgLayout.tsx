import * as React from "react"
import { Link } from "wouter"
import { Building2, ChevronRight } from "lucide-react"
import { AppLayout } from "@/components/layout/AppLayout"

interface OrgLayoutProps {
  section: string
  children: React.ReactNode
}

function OrgBreadcrumb({ section }: { section: string }) {
  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link
        href="/organization/company"
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        <span>Organization</span>
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      <span className="font-medium text-foreground">{section}</span>
    </nav>
  )
}

export function OrgLayout({ section, children }: OrgLayoutProps) {
  return (
    <AppLayout breadcrumb={<OrgBreadcrumb section={section} />}>
      {children}
    </AppLayout>
  )
}
