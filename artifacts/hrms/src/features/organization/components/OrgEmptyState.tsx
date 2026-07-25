import * as React from "react"
import { type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface OrgEmptyStateAction {
  label: string
  icon?: LucideIcon
  onClick?: () => void
}

interface OrgEmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: OrgEmptyStateAction
  hint?: string
}

export function OrgEmptyState({
  icon: Icon,
  title,
  description,
  action,
  hint,
}: OrgEmptyStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-12 text-center" role="status" aria-live="polite">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-5 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm leading-relaxed">
        {description}
      </p>
      {action && (
        <Button className="mt-6" onClick={action.onClick}>
          {action.icon && <action.icon className="mr-2 h-4 w-4" />}
          {action.label}
        </Button>
      )}
      {hint && (
        <p className="mt-4 text-xs text-muted-foreground/60 max-w-xs">{hint}</p>
      )}
    </div>
  )
}
