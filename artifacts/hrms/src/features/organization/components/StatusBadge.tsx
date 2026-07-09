import * as React from "react"
import { Badge } from "@/components/ui/badge"

type StatusTone = "success" | "warning" | "destructive" | "secondary" | "outline"

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

  return <Badge variant={variant as React.ComponentProps<typeof Badge>["variant"]} className={className}>{status}</Badge>
}
