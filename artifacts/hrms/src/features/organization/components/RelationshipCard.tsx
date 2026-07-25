import * as React from "react"
import { type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { StatusBadge } from "./StatusBadge"

export interface RelationshipItem {
  id: string
  title: string
  subtitle?: React.ReactNode
  meta?: React.ReactNode
  status?: string
  tags?: string[]
}

interface RelationshipCardProps {
  title: string
  icon: LucideIcon
  items: RelationshipItem[]
  emptyText?: string
  className?: string
}

export function RelationshipCard({
  title,
  icon: Icon,
  items,
  emptyText = "No relationships found.",
  className,
}: RelationshipCardProps) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex min-w-0 items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{title}</span>
          </span>
          <Badge variant="secondary" className="shrink-0 font-normal">
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  {item.subtitle && (
                    <div className="mt-1 text-sm text-muted-foreground">{item.subtitle}</div>
                  )}
                </div>
                {item.status && <StatusBadge status={item.status} className="shrink-0" />}
              </div>
              {item.meta && <div className="mt-2 text-xs text-muted-foreground">{item.meta}</div>}
              {item.tags && item.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            {emptyText}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
