import * as React from "react"
import { Building2, Landmark, MapPin, Palmtree, WalletCards, type LucideIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { type OrganizationActivity, type OrganizationActivityEntityType } from "../data/activity"

const entityIcons: Record<OrganizationActivityEntityType, LucideIcon> = {
  Department: Building2,
  Location: MapPin,
  "Business Unit": Landmark,
  "Leave Policy": Palmtree,
  "Salary Structure": WalletCards,
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export interface ActivityTimelineProps {
  activities: OrganizationActivity[]
  className?: string
  emptyText?: string
}

export function ActivityTimeline({
  activities,
  className,
  emptyText = "No organization activity yet.",
}: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className={cn("rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground", className)}>
        {emptyText}
      </div>
    )
  }

  return (
    <div className={cn("flow-root", className)}>
      <ol className="-mb-6">
        {activities.map((activity, index) => {
          const Icon = entityIcons[activity.entityType]
          const isLast = index === activities.length - 1

          return (
            <li key={activity.id} className="relative flex gap-4 pb-6">
              {!isLast && <span className="absolute left-5 top-11 h-full w-px bg-border" aria-hidden="true" />}

              <Avatar className="z-10 h-10 w-10 border bg-background">
                {activity.user.avatarUrl && <AvatarImage src={activity.user.avatarUrl} alt={activity.user.name} />}
                <AvatarFallback className="text-xs font-semibold text-primary">
                  {getInitials(activity.user.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 rounded-lg border bg-background p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{activity.action}</p>
                      <Badge variant="outline" className="gap-1.5 font-normal">
                        <Icon className="h-3 w-3" />
                        {activity.entityType}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{activity.entityName}</span>
                      {" by "}
                      {activity.user.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{activity.user.role}</p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">{activity.timestamp}</time>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
