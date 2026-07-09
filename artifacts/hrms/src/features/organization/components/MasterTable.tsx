import * as React from "react"

interface MasterTableProps {
  children?: React.ReactNode
  emptyState?: React.ReactNode
  footer?: React.ReactNode
}

export function MasterTable({ children, emptyState, footer }: MasterTableProps) {
  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {children ?? emptyState}
      </div>
      {footer && <div className="mt-4">{footer}</div>}
    </>
  )
}
