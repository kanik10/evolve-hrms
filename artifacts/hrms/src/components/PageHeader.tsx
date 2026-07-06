import * as React from "react"

export function PageHeader({ 
  title, 
  description, 
  action 
}: { 
  title: string, 
  description?: string, 
  action?: React.ReactNode 
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action && (
        <div className="mt-4 sm:mt-0 flex gap-2">
          {action}
        </div>
      )}
    </div>
  )
}
