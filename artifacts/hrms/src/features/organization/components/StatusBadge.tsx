import * as React from "react"
import { Badge } from "@/components/ui/badge"

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"]
type StatusTone = NonNullable<BadgeVariant>

const toneByStatus: Record<string, StatusTone> = {
  Active: "success",
  Inactive: "secondary",
  Archived: "outline",
  Pending: "warning",
  Draft: "outline",
  "On Leave": "warning",
  Terminated: "destructive",
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = toneByStatus[status] ?? "secondary"

  return <Badge variant={variant} className={className}>{status}</Badge>
}
