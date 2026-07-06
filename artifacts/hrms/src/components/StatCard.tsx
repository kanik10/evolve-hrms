import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function StatCard({ 
  title, 
  value, 
  icon, 
  trend 
}: { 
  title: string, 
  value: string | number, 
  icon: React.ReactNode, 
  trend?: { value: string, positive?: boolean } 
}) {
  return (
    <Card className="hover:border-primary/30 transition-colors shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <h2 className="text-3xl font-bold text-foreground">{value}</h2>
          {trend && (
            <span className={cn(
              "text-xs font-medium",
              trend.positive ? "text-emerald-500" : "text-destructive"
            )}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
