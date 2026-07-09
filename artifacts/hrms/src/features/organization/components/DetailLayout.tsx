import * as React from "react"
import { type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface DetailLayoutProps {
  title: string
  subtitle?: string
  icon: LucideIcon
  status?: string
  backLabel: string
  onBack: () => void
  onEdit?: () => void
  children: React.ReactNode
  aside?: React.ReactNode
}

export function DetailLayout({ title, subtitle, icon: Icon, status, backLabel, onBack, onEdit, children, aside }: DetailLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" className="h-8 px-0" onClick={onBack}>
            <span className="mr-2">←</span>
            {backLabel}
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">{title}</h1>
                {status && <Badge variant={status === "Active" ? "default" : "secondary"}>{status}</Badge>}
              </div>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
        </div>
        {onEdit && (
          <Button onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div>{children}</div>
        {aside && <div>{aside}</div>}
      </div>
    </div>
  )
}
