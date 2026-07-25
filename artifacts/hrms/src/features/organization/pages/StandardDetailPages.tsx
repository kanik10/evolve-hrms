import * as React from "react"
import { useLocation, useParams } from "wouter"
import {
  ArrowLeft,
  Banknote,
  BarChart2,
  Briefcase,
  Building2,
  CalendarDays,
  Clock3,
  DollarSign,
  FileText,
  History,
  Link2,
  MapPin,
  Palmtree,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppLayout } from "@/components/layout/AppLayout"
import { RelationshipCard, type RelationshipItem } from "../components/RelationshipCard"
import { StatusBadge } from "../components/StatusBadge"
import {
  organizationBusinessUnits,
  organizationCostCenters,
  organizationDepartments,
  organizationEmployees,
  organizationGrades,
  organizationSalaryStructures,
} from "../data/organizationData"
import { mockDesignations } from "../designations/data/mock"
import { getBusinessUnits } from "../business-units/data/businessUnits"
import { getLocations } from "../locations/data/locations"
import { getCostCenters } from "../cost-centers/data/costCenters"
import { getGrades } from "../grades/data/grades"
import { getEmploymentTypes } from "../employment-types/data/employmentTypes"
import { getLeavePolicies } from "../leave-policies/data/leavePolicies"
import { getSalaryStructures, calculateNetSalary } from "../salary-structures/data/salaryStructures"
import { getHolidays } from "../holiday-calendar/data/holidays"
import { getShifts } from "../shifts/data/shifts"

type Field = { label: string; value: React.ReactNode }
type ActivityEntry = { title: string; detail: string; at: string; by: string }
type HistoryEntry = { field: string; from: string; to: string; at: string; by: string }

interface DetailModel {
  title: string
  subtitle?: string
  status?: string
  icon: LucideIcon
  backPath: string
  backLabel: string
  overviewTitle: string
  general: Field[]
  statistics: Field[]
  relationships: Field[]
  metadata: Field[]
  related: Array<{ title: string; icon: LucideIcon; items: RelationshipItem[] }>
  activity: ActivityEntry[]
  history: HistoryEntry[]
}

function FieldGrid({ fields }: { fields: Field[] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</dt>
          <dd className="mt-1 text-sm">{field.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function makeActivity(name: string, type: string): ActivityEntry[] {
  return [
    { title: `${type} viewed`, detail: `${name} detail profile was opened for review.`, at: "Today", by: "HR Admin" },
    { title: `${type} relationships refreshed`, detail: "Related mock records were recalculated from organization data.", at: "Yesterday", by: "System" },
    { title: `${type} profile maintained`, detail: "Frontend-only master data record is available in the Organization module.", at: "15 Jul 2026", by: "System" },
  ]
}

function makeHistory(name: string, status?: string): HistoryEntry[] {
  return [
    { field: "Record", from: "New", to: name, at: "Created", by: "System" },
    { field: "Status", from: "Draft", to: status ?? "Active", at: "Latest", by: "HR Admin" },
    { field: "Relationships", from: "Unmapped", to: "Mapped from mock data", at: "Latest", by: "System" },
  ]
}

function StandardDetailPage({ buildModel }: { buildModel: (id: string) => DetailModel | undefined }) {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const model = buildModel(params.id)

  if (!model) {
    return (
      <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Organization detail</div>}>
        <div className="rounded-xl border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">Record not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">The requested organization record could not be found.</p>
          <Button className="mt-6" onClick={() => navigate("/organization")}>Back to organization</Button>
        </div>
      </AppLayout>
    )
  }

  const Icon = model.icon

  return (
    <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Organization details</div>}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" className="h-8 px-0" onClick={() => navigate(model.backPath)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {model.backLabel}
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold">{model.title}</h1>
                  {model.status && <StatusBadge status={model.status} />}
                </div>
                {model.subtitle && <p className="text-sm text-muted-foreground">{model.subtitle}</p>}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
            {[
              ["overview", "Overview"],
              ["related", "Related Records"],
              ["activity", "Activity"],
              ["history", "History"],
            ].map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <DetailCard title="General Information"><FieldGrid fields={model.general} /></DetailCard>
              <DetailCard title="Statistics"><FieldGrid fields={model.statistics} /></DetailCard>
              <DetailCard title="Relationships"><FieldGrid fields={model.relationships} /></DetailCard>
              <DetailCard title="Metadata"><FieldGrid fields={model.metadata} /></DetailCard>
            </div>
          </TabsContent>

          <TabsContent value="related" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {model.related.map((card) => <RelationshipCard key={card.title} {...card} />)}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardContent className="py-6">
                <div className="space-y-5">
                  {model.activity.map((item) => (
                    <div key={`${item.title}-${item.at}`} className="flex gap-3">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Link2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.by} - {item.at}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {model.history.map((item) => (
                    <div key={`${item.field}-${item.at}`} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_1fr_1fr_0.8fr]">
                      <span className="font-medium">{item.field}</span>
                      <span className="text-muted-foreground">From: {item.from}</span>
                      <span>To: {item.to}</span>
                      <span className="text-muted-foreground">{item.by} - {item.at}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}

function employeeItems(employees = organizationEmployees): RelationshipItem[] {
  return employees.map((employee) => ({
    id: employee.id,
    title: employee.name,
    subtitle: employee.designation,
    meta: employee.department,
    status: employee.status,
    tags: employee.location ? [employee.location] : undefined,
  }))
}

export function BusinessUnitDetailPage() {
  return <StandardDetailPage buildModel={(id) => {
    const unit = getBusinessUnits().find((item) => item.id === id)
    if (!unit) return undefined
    const departments = organizationDepartments.filter((department) => department.businessUnit === unit.name)
    const locations = getLocations().filter((location) => location.businessUnit === unit.name)
    const costCenters = getCostCenters().filter((center) => center.businessUnit === unit.name)
    return {
      title: unit.name,
      subtitle: `${unit.code} - Head: ${unit.head}`,
      status: unit.status,
      icon: Building2,
      backPath: "/organization/business-units",
      backLabel: "Back to business units",
      overviewTitle: "Business unit overview",
      general: [{ label: "Name", value: unit.name }, { label: "Code", value: unit.code }, { label: "Head", value: unit.head }, { label: "Description", value: unit.description }],
      statistics: [{ label: "Departments", value: departments.length }, { label: "Locations", value: locations.length }, { label: "Cost Centers", value: costCenters.length }, { label: "Status", value: unit.status }],
      relationships: [{ label: "Departments", value: departments.map((item) => item.name).join(", ") || "None" }, { label: "Locations", value: locations.map((item) => item.name).join(", ") || "None" }, { label: "Cost Centers", value: costCenters.map((item) => item.name).join(", ") || "None" }],
      metadata: [{ label: "Record ID", value: unit.id }, { label: "Source", value: "Mock organization data" }],
      related: [
        { title: "Departments", icon: Briefcase, items: departments.map((item) => ({ id: item.id, title: item.name, subtitle: `Head: ${item.head}`, meta: `${item.employeeCount} employees`, status: item.status })) },
        { title: "Locations", icon: MapPin, items: locations.map((item) => ({ id: item.id, title: item.name, subtitle: item.city, meta: item.workingHours, status: item.status })) },
        { title: "Cost Centers", icon: DollarSign, items: costCenters.map((item) => ({ id: item.id, title: item.name, subtitle: item.code, meta: item.budget, status: item.status })) },
      ],
      activity: makeActivity(unit.name, "Business unit"),
      history: makeHistory(unit.name, unit.status),
    }
  }} />
}

export function LocationDetailPage() {
  return <StandardDetailPage buildModel={(id) => {
    const location = getLocations().find((item) => item.id === id)
    if (!location) return undefined
    const departments = organizationDepartments.filter((department) => department.locations.includes(location.name))
    const employees = organizationEmployees.filter((employee) => employee.location === location.name)
    const units = organizationBusinessUnits.filter((unit) => unit.locations.includes(location.name))
    return {
      title: location.name,
      subtitle: `${location.code} - ${location.city}, ${location.country}`,
      status: location.status,
      icon: MapPin,
      backPath: "/organization/locations",
      backLabel: "Back to locations",
      overviewTitle: "Location overview",
      general: [{ label: "Address", value: location.address }, { label: "City", value: location.city }, { label: "State", value: location.state }, { label: "Country", value: location.country }],
      statistics: [{ label: "Departments", value: departments.length }, { label: "Employees", value: employees.length }, { label: "Business Units", value: units.length }, { label: "Status", value: location.status }],
      relationships: [{ label: "Business Unit", value: location.businessUnit }, { label: "Departments", value: departments.map((item) => item.name).join(", ") || "None" }],
      metadata: [{ label: "Record ID", value: location.id }, { label: "Timezone", value: location.timezone }, { label: "Working Hours", value: location.workingHours }],
      related: [
        { title: "Departments", icon: Briefcase, items: departments.map((item) => ({ id: item.id, title: item.name, subtitle: `Head: ${item.head}`, meta: `${item.employeeCount} employees`, status: item.status })) },
        { title: "Employees", icon: Users, items: employeeItems(employees) },
        { title: "Business Units", icon: Building2, items: units.map((item) => ({ id: item.id, title: item.name, subtitle: `Head: ${item.head}`, meta: `${item.departments.length} departments`, status: item.status })) },
      ],
      activity: makeActivity(location.name, "Location"),
      history: makeHistory(location.name, location.status),
    }
  }} />
}

export function CostCenterDetailPage() {
  return <StandardDetailPage buildModel={(id) => {
    const center = getCostCenters().find((item) => item.id === id)
    if (!center) return undefined
    const departments = organizationDepartments.filter((department) => department.costCenter === center.name)
    const units = organizationBusinessUnits.filter((unit) => unit.costCenters.includes(center.name))
    return {
      title: center.name,
      subtitle: `${center.code} - ${center.businessUnit}`,
      status: center.status,
      icon: DollarSign,
      backPath: "/organization/cost-centers",
      backLabel: "Back to cost centers",
      overviewTitle: "Cost center overview",
      general: [{ label: "Name", value: center.name }, { label: "Code", value: center.code }, { label: "Department", value: center.department }, { label: "Business Unit", value: center.businessUnit }],
      statistics: [{ label: "Budget", value: center.budget }, { label: "Departments", value: departments.length }, { label: "Business Units", value: units.length }, { label: "Status", value: center.status }],
      relationships: [{ label: "Departments", value: departments.map((item) => item.name).join(", ") || center.department }, { label: "Business Unit", value: center.businessUnit }],
      metadata: [{ label: "Record ID", value: center.id }, { label: "Source", value: "Mock cost center data" }],
      related: [
        { title: "Departments", icon: Briefcase, items: departments.map((item) => ({ id: item.id, title: item.name, subtitle: `Head: ${item.head}`, meta: `${item.employeeCount} employees`, status: item.status })) },
        { title: "Business Unit", icon: Building2, items: units.map((item) => ({ id: item.id, title: item.name, subtitle: `Head: ${item.head}`, meta: `${item.locations.length} locations`, status: item.status })) },
      ],
      activity: makeActivity(center.name, "Cost center"),
      history: makeHistory(center.name, center.status),
    }
  }} />
}

export function GradeDetailPage() {
  return <StandardDetailPage buildModel={(id) => {
    const grade = getGrades().find((item) => item.id === id)
    if (!grade) return undefined
    const designations = mockDesignations.filter((item) => item.gradeId === grade.id)
    const salaryStructures = organizationSalaryStructures.filter((item) => item.grade === grade.level || item.grade === grade.grade)
    return {
      title: grade.grade,
      subtitle: `Level: ${grade.level}`,
      status: grade.status,
      icon: BarChart2,
      backPath: "/organization/grades",
      backLabel: "Back to grades",
      overviewTitle: "Grade overview",
      general: [{ label: "Grade", value: grade.grade }, { label: "Level", value: grade.level }, { label: "Description", value: grade.description }, { label: "Salary Band", value: grade.salaryBand }],
      statistics: [{ label: "Designations", value: designations.length }, { label: "Salary Structures", value: salaryStructures.length }, { label: "Status", value: grade.status }],
      relationships: [{ label: "Designations", value: designations.map((item) => item.name).join(", ") || "None" }],
      metadata: [{ label: "Record ID", value: grade.id }, { label: "Source", value: "Mock grade data" }],
      related: [
        { title: "Designations", icon: Briefcase, items: designations.map((item) => ({ id: item.id, title: item.name, subtitle: item.department, meta: `${item.employeeCount} employees`, status: item.status })) },
        { title: "Salary Structures", icon: Banknote, items: salaryStructures.map((item) => ({ id: item.id, title: item.structureName, subtitle: item.grade, status: item.status })) },
      ],
      activity: makeActivity(grade.grade, "Grade"),
      history: makeHistory(grade.grade, grade.status),
    }
  }} />
}

export function EmploymentTypeDetailPage() {
  return <StandardDetailPage buildModel={(id) => {
    const type = getEmploymentTypes().find((item) => item.id === id)
    if (!type) return undefined
    return {
      title: type.typeName,
      subtitle: `Notice period: ${type.noticePeriod}`,
      status: type.status,
      icon: UserCheck,
      backPath: "/organization/employment-types",
      backLabel: "Back to employment types",
      overviewTitle: "Employment type overview",
      general: [{ label: "Type Name", value: type.typeName }, { label: "Description", value: type.description }, { label: "Benefits Eligible", value: type.benefitsEligible ? "Yes" : "No" }, { label: "Notice Period", value: type.noticePeriod }],
      statistics: [{ label: "Benefits Eligible", value: type.benefitsEligible ? "Yes" : "No" }, { label: "Status", value: type.status }],
      relationships: [{ label: "Assigned Employees", value: "No employment type assignment field in mock data" }],
      metadata: [{ label: "Record ID", value: type.id }, { label: "Source", value: "Mock employment type data" }],
      related: [{ title: "Assigned Employees", icon: Users, items: [] }],
      activity: makeActivity(type.typeName, "Employment type"),
      history: makeHistory(type.typeName, type.status),
    }
  }} />
}

export function LeavePolicyDetailPage() {
  return <StandardDetailPage buildModel={(id) => {
    const policy = getLeavePolicies().find((item) => item.id === id)
    if (!policy) return undefined
    const employees = organizationEmployees.filter((employee) => employee.leavePolicyId === policy.id)
    return {
      title: policy.policyName,
      subtitle: `Eligibility: ${policy.eligibility}`,
      status: policy.status,
      icon: Palmtree,
      backPath: "/organization/leave-policies",
      backLabel: "Back to leave policies",
      overviewTitle: "Leave policy overview",
      general: [{ label: "Annual Leave", value: `${policy.annualLeave} days` }, { label: "Casual Leave", value: `${policy.casualLeave} days` }, { label: "Sick Leave", value: `${policy.sickLeave} days` }, { label: "Eligibility", value: policy.eligibility }],
      statistics: [{ label: "Assigned Employees", value: employees.length }, { label: "Carry Forward", value: policy.carryForward }, { label: "Encashment", value: policy.encashment }, { label: "Status", value: policy.status }],
      relationships: [{ label: "Employees", value: employees.map((item) => item.name).join(", ") || "None" }, { label: "Departments", value: policy.applicableDepartmentNames?.join(", ") ?? "Not specified" }],
      metadata: [{ label: "Record ID", value: policy.id }, { label: "Negative Balance", value: policy.negativeBalance }],
      related: [{ title: "Assigned Employees", icon: Users, items: employeeItems(employees) }],
      activity: makeActivity(policy.policyName, "Leave policy"),
      history: makeHistory(policy.policyName, policy.status),
    }
  }} />
}

export function SalaryStructureDetailPage() {
  return <StandardDetailPage buildModel={(id) => {
    const structure = getSalaryStructures().find((item) => item.id === id)
    if (!structure) return undefined
    const employees = organizationEmployees.filter((employee) => employee.salaryStructureId === structure.id)
    const grades = organizationGrades.filter((grade) => grade.name === structure.grade)
    return {
      title: structure.structureName,
      subtitle: `Grade: ${structure.grade}`,
      status: structure.status,
      icon: Banknote,
      backPath: "/organization/salary-structures",
      backLabel: "Back to salary structures",
      overviewTitle: "Salary structure overview",
      general: [{ label: "Structure", value: structure.structureName }, { label: "Grade", value: structure.grade }, { label: "Basic", value: structure.basic }, { label: "HRA", value: structure.hra }],
      statistics: [{ label: "Net Salary", value: `Rs ${calculateNetSalary(structure).toLocaleString()}` }, { label: "Assigned Employees", value: employees.length }, { label: "Grades", value: grades.length }, { label: "Status", value: structure.status }],
      relationships: [{ label: "Employees", value: employees.map((item) => item.name).join(", ") || "None" }, { label: "Departments", value: structure.applicableDepartmentNames?.join(", ") ?? "Not specified" }],
      metadata: [{ label: "Record ID", value: structure.id }, { label: "PF", value: structure.pf }, { label: "TDS", value: structure.tds }],
      related: [
        { title: "Grades", icon: BarChart2, items: grades.map((item) => ({ id: item.id, title: item.name, subtitle: item.level, meta: item.salaryRange, status: item.status })) },
        { title: "Assigned Employees", icon: Users, items: employeeItems(employees) },
      ],
      activity: makeActivity(structure.structureName, "Salary structure"),
      history: makeHistory(structure.structureName, structure.status),
    }
  }} />
}

export function HolidayDetailPage() {
  return <StandardDetailPage buildModel={(id) => {
    const holiday = getHolidays().find((item) => item.id === id)
    if (!holiday) return undefined
    const location = getLocations().find((item) => item.name === holiday.location)
    const departments = location ? organizationDepartments.filter((department) => department.locations.includes(location.name)) : []
    return {
      title: holiday.name,
      subtitle: `${holiday.location} - ${holiday.holidayType}`,
      status: "Active",
      icon: CalendarDays,
      backPath: "/organization/holiday-calendar",
      backLabel: "Back to holiday calendar",
      overviewTitle: "Holiday overview",
      general: [{ label: "Name", value: holiday.name }, { label: "Date", value: new Date(holiday.date).toLocaleDateString() }, { label: "Location", value: holiday.location }, { label: "Type", value: holiday.holidayType }],
      statistics: [{ label: "Mandatory", value: holiday.mandatory ? "Yes" : "No" }, { label: "Optional", value: holiday.optional ? "Yes" : "No" }, { label: "Recurring", value: holiday.recurring ? "Yes" : "No" }, { label: "Departments at Location", value: departments.length }],
      relationships: [{ label: "Location", value: holiday.location }, { label: "Departments", value: departments.map((item) => item.name).join(", ") || "None" }],
      metadata: [{ label: "Record ID", value: holiday.id }, { label: "Source", value: "Mock holiday data" }],
      related: [{ title: "Departments at Holiday Location", icon: Briefcase, items: departments.map((item) => ({ id: item.id, title: item.name, subtitle: `Head: ${item.head}`, meta: `${item.employeeCount} employees`, status: item.status })) }],
      activity: makeActivity(holiday.name, "Holiday"),
      history: makeHistory(holiday.name, "Active"),
    }
  }} />
}

export function ShiftDetailPage() {
  return <StandardDetailPage buildModel={(id) => {
    const shift = getShifts().find((item) => item.id === id)
    if (!shift) return undefined
    return {
      title: shift.shiftName,
      subtitle: `${shift.startTime} - ${shift.endTime}`,
      status: shift.status,
      icon: Clock3,
      backPath: "/organization/shifts",
      backLabel: "Back to shifts",
      overviewTitle: "Shift overview",
      general: [{ label: "Shift Name", value: shift.shiftName }, { label: "Start Time", value: shift.startTime }, { label: "End Time", value: shift.endTime }, { label: "Weekly Off", value: shift.weeklyOff }],
      statistics: [{ label: "Grace Time", value: `${shift.graceTime} mins` }, { label: "Break Duration", value: `${shift.breakDuration} mins` }, { label: "Status", value: shift.status }],
      relationships: [{ label: "Assigned Employees", value: "No shift assignment field in mock data" }],
      metadata: [{ label: "Record ID", value: shift.id }, { label: "Source", value: "Mock shift data" }],
      related: [{ title: "Assigned Employees", icon: Users, items: [] }],
      activity: makeActivity(shift.shiftName, "Shift"),
      history: makeHistory(shift.shiftName, shift.status),
    }
  }} />
}

export function DesignationDetailPage() {
  return <StandardDetailPage buildModel={(id) => {
    const designation = mockDesignations.find((item) => item.id === id)
    if (!designation) return undefined
    const employees = organizationEmployees.filter((employee) => employee.designation === designation.name)
    const department = organizationDepartments.find((item) => item.id === designation.departmentId || item.name === designation.department)
    const grade = getGrades().find((item) => item.id === designation.gradeId)
    return {
      title: designation.name,
      subtitle: `${designation.code} - ${designation.department}`,
      status: designation.status,
      icon: Briefcase,
      backPath: "/organization/designations",
      backLabel: "Back to designations",
      overviewTitle: "Designation overview",
      general: [{ label: "Name", value: designation.name }, { label: "Code", value: designation.code }, { label: "Department", value: designation.department }, { label: "Grade", value: designation.grade }],
      statistics: [{ label: "Employees", value: employees.length || designation.employeeCount }, { label: "Status", value: designation.status }],
      relationships: [{ label: "Department", value: designation.department }, { label: "Grade", value: designation.grade }, { label: "Employees", value: employees.map((item) => item.name).join(", ") || "None" }],
      metadata: [{ label: "Record ID", value: designation.id }, { label: "Created", value: designation.createdAt }, { label: "Updated", value: designation.updatedAt }],
      related: [
        { title: "Department", icon: Building2, items: department ? [{ id: department.id, title: department.name, subtitle: `Head: ${department.head}`, meta: `${department.employeeCount} employees`, status: department.status }] : [] },
        { title: "Grade", icon: BarChart2, items: grade ? [{ id: grade.id, title: grade.grade, subtitle: grade.level, meta: grade.salaryBand, status: grade.status }] : [] },
        { title: "Employees", icon: Users, items: employeeItems(employees) },
      ],
      activity: makeActivity(designation.name, "Designation"),
      history: makeHistory(designation.name, designation.status),
    }
  }} />
}
