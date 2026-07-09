import * as React from "react"
import { type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface OrgPageHeaderProps {
  icon: LucideIcon
  title: string
  description: string
  badge?: string
  action?: React.ReactNode
}

export function OrgPageHeader({
  icon: Icon,
  title,
  description,
  badge,
  action,
}: OrgPageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-card text-primary shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {badge && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              {description}
            </p>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <Separator className="mt-6" />
    </div>
  )
}
