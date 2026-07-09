import * as React from "react"
import { Building2, Users, Archive, TrendingUp } from "lucide-react"
import { type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { type Department } from "../types"

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = false,
}: {
  label: string
  value: string | number
  sub: string
  icon: LucideIcon
  accent?: boolean
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p
              className={`mt-1.5 text-2xl font-bold tabular-nums ${
                accent ? "text-emerald-600" : "text-foreground"
              }`}
            >
              {value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground truncate">{sub}</p>
          </div>
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              accent ? "bg-emerald-50 text-emerald-600" : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DepartmentStatCards({
  departments,
}: {
  departments: Department[]
}) {
  const total = departments.length
  const active = departments.filter((d) => d.status === "Active").length
  const headcount = departments
    .filter((d) => d.status === "Active")
    .reduce((sum, d) => sum + d.employeeCount, 0)
  const inactive = departments.filter((d) => d.status !== "Active").length

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Departments"
        value={total}
        sub="registered in system"
        icon={Building2}
      />
      <StatCard
        label="Active"
        value={active}
        sub={`${total > 0 ? Math.round((active / total) * 100) : 0}% of total`}
        icon={Users}
        accent
      />
      <StatCard
        label="Total Headcount"
        value={headcount.toLocaleString()}
        sub="across active departments"
        icon={TrendingUp}
      />
      <StatCard
        label="Inactive / Archived"
        value={inactive}
        sub="need attention"
        icon={Archive}
      />
    </div>
  )
}
