import * as React from "react"
import { Briefcase, Users, Building2, BarChart2 } from "lucide-react"
import { type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { type Designation } from "../types"

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
      <CardContent className="pb-5 pt-5">
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
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>
          </div>
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              accent
                ? "bg-emerald-50 text-emerald-600"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DesignationStatCards({
  designations,
}: {
  designations: Designation[]
}) {
  const total = designations.length
  const active = designations.filter((d) => d.status === "Active").length
  const deptsCovered = new Set(
    designations.filter((d) => d.status === "Active").map((d) => d.department)
  ).size
  const gradesCovered = new Set(
    designations.filter((d) => d.status === "Active").map((d) => d.gradeId)
  ).size

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Designations"
        value={total}
        sub="registered in system"
        icon={Briefcase}
      />
      <StatCard
        label="Active"
        value={active}
        sub={`${total > 0 ? Math.round((active / total) * 100) : 0}% of total`}
        icon={Users}
        accent
      />
      <StatCard
        label="Departments Covered"
        value={deptsCovered}
        sub="across active designations"
        icon={Building2}
      />
      <StatCard
        label="Grade Bands Used"
        value={gradesCovered}
        sub="distinct grade levels"
        icon={BarChart2}
      />
    </div>
  )
}
