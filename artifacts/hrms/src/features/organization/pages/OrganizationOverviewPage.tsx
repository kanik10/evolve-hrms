import * as React from "react"
import { useLocation } from "wouter"
import {
  BarChart3,
  Building2,
  Landmark,
  MapPin,
  Plus,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { ChartCard } from "@/components/ChartCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ActivityTimeline,
  OrganizationMetricsGrid,
  OrgLayout,
  OrgPageHeader,
} from "../index"
import {
  chartDataDepartment,
  organizationEmployees,
  organizationLocations,
} from "../data/organizationData"
import { mockOrganizationActivities } from "../data/activity"
import { getHolidays } from "../holiday-calendar/data/holidays"

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

const employeesByLocation = organizationLocations.map((location) => ({
  name: location.name,
  value: organizationEmployees.filter((employee) => employee.location === location.name).length,
}))

function formatHolidayDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

function getDaysUntil(date: string) {
  const today = new Date()
  const holidayDate = new Date(date)
  today.setHours(0, 0, 0, 0)
  holidayDate.setHours(0, 0, 0, 0)

  const difference = Math.ceil((holidayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (difference === 0) return "Today"
  if (difference === 1) return "Tomorrow"
  if (difference > 1) return `in ${difference} days`
  return `${Math.abs(difference)} days ago`
}

export default function OrganizationOverviewPage() {
  const [, navigate] = useLocation()
  const holidays = React.useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const sortedHolidays = [...getHolidays()]
      .sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime())
    const futureHolidays = sortedHolidays
      .filter((holiday) => new Date(holiday.date).getTime() >= today.getTime())

    return futureHolidays.length > 0 ? futureHolidays.slice(0, 4) : sortedHolidays.slice(0, 4)
  }, [])

  return (
    <OrgLayout section="Overview">
      <OrgPageHeader
        icon={Building2}
        title="Organization Overview"
        description="A consolidated view of departments, locations, business units, policies, and structural activity."
      />

      <OrganizationMetricsGrid className="mb-8" />

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard title="Employees by Department" description="Headcount across core departments" className="xl:col-span-2">
          <div className="mt-4 h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataDepartment}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Department Distribution" description="Share of employees by department">
          <div className="mt-4 h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartDataDepartment} cx="50%" cy="50%" innerRadius={62} outerRadius={104} paddingAngle={2} dataKey="value">
                  {chartDataDepartment.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Employees by Location" description="Mapped to configured office locations" className="xl:col-span-3">
          <div className="mt-4 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employeesByLocation} layout="vertical" margin={{ left: 36 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={150} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard title="Recent Organization Activity" className="xl:col-span-2">
          <ActivityTimeline activities={mockOrganizationActivities} />
        </ChartCard>

        <div className="space-y-6">
          <ChartCard title="Upcoming Holidays">
            <div className="mt-2 space-y-4">
              {holidays.map((holiday) => (
                <div key={holiday.id} className="flex items-start justify-between gap-4 border-l-2 border-primary pl-3">
                  <div>
                    <p className="text-sm font-medium">{holiday.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatHolidayDate(holiday.date)} - {holiday.location}
                    </p>
                  </div>
                  <Badge variant={holiday.optional ? "secondary" : "outline"} className="shrink-0 text-[10px]">
                    {getDaysUntil(holiday.date)}
                  </Badge>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Quick Actions">
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto flex-col gap-2 border-dashed py-4" onClick={() => navigate("/organization/departments")}>
                <Plus className="h-5 w-5 text-primary" />
                <span className="text-xs">Add Department</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 border-dashed py-4" onClick={() => navigate("/organization/business-units")}>
                <Landmark className="h-5 w-5 text-primary" />
                <span className="text-xs">Add Business Unit</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 border-dashed py-4" onClick={() => navigate("/organization/locations")}>
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-xs">Add Location</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 border-dashed py-4" onClick={() => navigate("/organization/designations")}>
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="text-xs">Add Designation</span>
              </Button>
            </div>
          </ChartCard>
        </div>
      </div>
    </OrgLayout>
  )
}
