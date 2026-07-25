import * as React from "react"
import { Building2, CalendarDays, MapPin, Network, Palmtree, Users } from "lucide-react"

import { StatCard } from "@/components/StatCard"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  organizationBusinessUnits,
  organizationDepartments,
  organizationEmployees,
  organizationLeavePolicies,
  organizationLocations,
  type OrganizationBusinessUnit,
  type OrganizationDepartment,
  type OrganizationEmployee,
  type OrganizationLeavePolicy,
  type OrganizationLocation,
} from "../data/organizationData"
import { getHolidays, type HolidayRecord } from "../holiday-calendar/data/holidays"

export interface OrganizationMetricsData {
  employees: OrganizationEmployee[]
  departments: OrganizationDepartment[]
  businessUnits: OrganizationBusinessUnit[]
  locations: OrganizationLocation[]
  holidays: HolidayRecord[]
  leavePolicies: OrganizationLeavePolicy[]
}

export interface DistributionMetricItem {
  name: string
  value: number
}

export interface OrganizationMetricsSummary {
  employeeCount: number
  departmentCount: number
  averageEmployeesPerDepartment: number
  businessUnitDistribution: DistributionMetricItem[]
  locationDistribution: DistributionMetricItem[]
  holidayCount: number
  leavePolicyCount: number
}

export const defaultOrganizationMetricsData: OrganizationMetricsData = {
  employees: organizationEmployees,
  departments: organizationDepartments,
  businessUnits: organizationBusinessUnits,
  locations: organizationLocations,
  holidays: getHolidays(),
  leavePolicies: organizationLeavePolicies,
}

export function getDefaultOrganizationMetricsData(): OrganizationMetricsData {
  return {
    ...defaultOrganizationMetricsData,
    holidays: getHolidays(),
  }
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10
}

function countEmployeesForBusinessUnit(
  businessUnit: OrganizationBusinessUnit,
  departments: OrganizationDepartment[]
) {
  return departments
    .filter((department) => department.businessUnit === businessUnit.name)
    .reduce((total, department) => total + department.employeeCount, 0)
}

export function getOrganizationMetricsSummary(
  data: OrganizationMetricsData = getDefaultOrganizationMetricsData()
): OrganizationMetricsSummary {
  const employeeCount = data.departments.reduce((total, department) => total + department.employeeCount, 0)
  const departmentCount = data.departments.length

  return {
    employeeCount,
    departmentCount,
    averageEmployeesPerDepartment: departmentCount === 0 ? 0 : roundToOneDecimal(employeeCount / departmentCount),
    businessUnitDistribution: data.businessUnits.map((businessUnit) => ({
      name: businessUnit.name,
      value: countEmployeesForBusinessUnit(businessUnit, data.departments),
    })),
    locationDistribution: data.locations.map((location) => ({
      name: location.name,
      value: data.employees.filter((employee) => employee.location === location.name).length,
    })),
    holidayCount: data.holidays.length,
    leavePolicyCount: data.leavePolicies.length,
  }
}

interface MetricProps {
  summary?: OrganizationMetricsSummary
}

function getSummary(summary?: OrganizationMetricsSummary) {
  return summary ?? getOrganizationMetricsSummary()
}

export function EmployeeCountMetric({ summary }: MetricProps) {
  return <StatCard title="Employee Count" value={getSummary(summary).employeeCount} icon={<Users className="h-5 w-5" />} />
}

export function DepartmentCountMetric({ summary }: MetricProps) {
  return <StatCard title="Department Count" value={getSummary(summary).departmentCount} icon={<Network className="h-5 w-5" />} />
}

export function AverageEmployeesPerDepartmentMetric({ summary }: MetricProps) {
  return (
    <StatCard
      title="Avg Employees / Dept"
      value={getSummary(summary).averageEmployeesPerDepartment}
      icon={<Building2 className="h-5 w-5" />}
    />
  )
}

export function HolidayCountMetric({ summary }: MetricProps) {
  return <StatCard title="Holiday Count" value={getSummary(summary).holidayCount} icon={<CalendarDays className="h-5 w-5" />} />
}

export function LeavePolicyCountMetric({ summary }: MetricProps) {
  return <StatCard title="Leave Policy Count" value={getSummary(summary).leavePolicyCount} icon={<Palmtree className="h-5 w-5" />} />
}

interface DistributionMetricProps {
  title: string
  value: number
  items: DistributionMetricItem[]
  icon: React.ReactNode
  className?: string
}

function DistributionMetricCard({ title, value, items, icon, className }: DistributionMetricProps) {
  const sortedItems = [...items].sort((first, second) => second.value - first.value)
  const maxValue = Math.max(...sortedItems.map((item) => item.value), 1)

  return (
    <Card className={cn("shadow-sm transition-colors hover:border-primary/30", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-3 pb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
        </div>

        <h2 className="text-3xl font-bold text-foreground">{value}</h2>

        <div className="mt-4 space-y-3">
          {sortedItems.slice(0, 4).map((item) => (
            <div key={item.name}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-muted-foreground">{item.name}</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(6, (item.value / maxValue) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function BusinessUnitDistributionMetric({ summary }: MetricProps) {
  const metrics = getSummary(summary)

  return (
    <DistributionMetricCard
      title="Business Unit Distribution"
      value={metrics.businessUnitDistribution.length}
      items={metrics.businessUnitDistribution}
      icon={<Building2 className="h-5 w-5" />}
    />
  )
}

export function LocationDistributionMetric({ summary }: MetricProps) {
  const metrics = getSummary(summary)

  return (
    <DistributionMetricCard
      title="Location Distribution"
      value={metrics.locationDistribution.length}
      items={metrics.locationDistribution}
      icon={<MapPin className="h-5 w-5" />}
    />
  )
}

export interface OrganizationMetricsGridProps {
  data?: OrganizationMetricsData
  className?: string
}

export function OrganizationMetricsGrid({ data, className }: OrganizationMetricsGridProps) {
  const summary = React.useMemo(() => getOrganizationMetricsSummary(data), [data])

  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}>
      <EmployeeCountMetric summary={summary} />
      <DepartmentCountMetric summary={summary} />
      <AverageEmployeesPerDepartmentMetric summary={summary} />
      <HolidayCountMetric summary={summary} />
      <LeavePolicyCountMetric summary={summary} />
      <BusinessUnitDistributionMetric summary={summary} />
      <LocationDistributionMetric summary={summary} />
    </div>
  )
}
