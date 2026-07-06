import * as React from "react"
import { Button } from "@/components/ui/button"

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action 
}: { 
  icon: React.ReactNode, 
  title: string, 
  description: string, 
  action?: React.ReactNode 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed bg-card/30">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm mb-6">{description}</p>
      {action}
    </div>
  )
}
