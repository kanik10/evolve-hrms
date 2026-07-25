import * as React from "react"
import { useParams, useLocation, Link } from "wouter"
import {
  ArrowLeft,
  Pencil,
  Archive,
  Users,
  Banknote,
  Building,
  DollarSign,
  MapPin,
  CalendarDays,
  RefreshCcw,
  UserCircle,
  Building2,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { mockEmployees, mockLocations } from "@/data/mockData"
import { AppLayout } from "@/components/layout/AppLayout"
import { mockDepartments, DEPARTMENT_HEADS } from "../data/mock"
import { DepartmentDrawer } from "../components/DepartmentDrawer"
import { DepartmentDeleteDialog } from "../components/DepartmentDeleteDialog"
import { type Department, type DepartmentFormValues } from "../types"

// ── Internal types ────────────────────────────────────────────────────────────

type HistoryEntry = {
  id: string
  field: string
  from: string
  to: string
  by: string
  at: string
}

type ActivityEntry = {
  id: string
  desc: string
  detail: string
  user: string
  at: string
}

// ── Data generators ───────────────────────────────────────────────────────────

function buildHistory(dept: Department): HistoryEntry[] {
  return [
    {
      id: "h5",
      field: "Profile Updated",
      from: "Previous version",
      to: "Current version",
      by: "HR Manager",
      at: dept.updatedAt,
    },
    {
      id: "h4",
      field: "Status",
      from: "Draft",
      to: dept.status,
      by: "HR Director",
      at: dept.createdAt,
    },
    {
      id: "h3",
      field: "Cost Center",
      from: "—",
      to: dept.costCenter,
      by: "Finance Team",
      at: dept.createdAt,
    },
    {
      id: "h2",
      field: "Business Unit",
      from: "—",
      to: dept.businessUnit,
      by: "System Admin",
      at: dept.createdAt,
    },
    {
      id: "h1",
      field: "Department Created",
      from: "—",
      to: dept.name,
      by: "System",
      at: dept.createdAt,
    },
  ]
}

function buildActivity(dept: Department): ActivityEntry[] {
  return [
    {
      id: "a5",
      desc: "Department profile last updated",
      detail: "Fields modified: Description, Department Head",
      user: "HR Manager",
      at: dept.updatedAt,
    },
    {
      id: "a4",
      desc: `Linked to ${dept.costCenter} cost center`,
      detail: "Cost center mapping configured for expense tracking",
      user: "Finance Team",
      at: dept.createdAt,
    },
    {
      id: "a3",
      desc: `Mapped to ${dept.businessUnit}`,
      detail: "Business unit assignment completed",
      user: "Admin",
      at: dept.createdAt,
    },
    {
      id: "a2",
      desc: `${dept.head} assigned as Department Head`,
      detail: `Employee ID: ${dept.headId}`,
      user: "HR Admin",
      at: dept.createdAt,
    },
    {
      id: "a1",
      desc: `${dept.name} department created`,
      detail: `Department code assigned: ${dept.code}`,
      user: "System",
      at: dept.createdAt,
    },
  ]
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  sub,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  value: React.ReactNode
  label: string
  sub: string
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold leading-tight tabular-nums truncate">
              {value}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              iconBg
            )}
          >
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InfoItem({
  label,
  value,
  mono = false,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("mt-1 text-sm", mono && "font-mono")}>{value ?? "—"}</dd>
    </div>
  )
}

function EmptyTabState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────

function OverviewTab({ dept }: { dept: Department }) {
  const statusBadge =
    dept.status === "Active" ? (
      <Badge variant="success">Active</Badge>
    ) : dept.status === "Inactive" ? (
      <Badge variant="secondary">Inactive</Badge>
    ) : (
      <Badge variant="outline" className="text-muted-foreground">
        Archived
      </Badge>
    )

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="shadow-sm lg:col-span-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Department Information</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <dl className="grid gap-5 sm:grid-cols-2">
            <InfoItem label="Department Name" value={dept.name} />
            <InfoItem label="Department Code" value={dept.code} mono />
            <InfoItem label="Department Head" value={dept.head} />
            <InfoItem label="Employee Count" value={`${dept.employeeCount.toLocaleString()} employees`} />
            <InfoItem label="Business Unit" value={dept.businessUnit} />
            <InfoItem label="Cost Center" value={dept.costCenter} />
            <InfoItem label="Status" value={statusBadge} />
            <InfoItem
              label="Assigned Locations"
              value={
                dept.locations.length > 0 ? (
                  <span className="flex flex-wrap gap-1 mt-0.5">
                    {dept.locations.map((loc) => (
                      <Badge key={loc} variant="outline" className="text-xs font-normal">
                        {loc}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  <span className="text-muted-foreground italic">None</span>
                )
              }
            />
            <InfoItem
              label="Created Date"
              value={
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  {dept.createdAt}
                </span>
              }
            />
            <InfoItem
              label="Last Updated"
              value={
                <span className="flex items-center gap-1.5">
                  <RefreshCcw className="h-3.5 w-3.5 text-muted-foreground" />
                  {dept.updatedAt}
                </span>
              }
            />
            <div className="sm:col-span-2">
              <InfoItem
                label="Description"
                value={
                  dept.description || (
                    <span className="italic text-muted-foreground">
                      No description provided
                    </span>
                  )
                }
              />
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Department Head</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border">
                <AvatarFallback className="text-sm font-semibold">
                  {dept.head
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{dept.head}</p>
                <p className="text-xs text-muted-foreground">{dept.headId}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Annual Budget</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{dept.budget}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Current fiscal year allocation
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Tab: Employees ────────────────────────────────────────────────────────────

function EmployeesTab({ deptName }: { deptName: string }) {
  const employees = mockEmployees.filter((e) => e.department === deptName)

  if (employees.length === 0) {
    return (
      <EmptyTabState
        icon={UserCircle}
        title="No employees assigned"
        description="Employees assigned to this department will appear here."
      />
    )
  }

  return (
    <Card className="overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Employee</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joining Date</TableHead>
            <TableHead className="text-right">CTC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((emp) => (
            <TableRow key={emp.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="text-xs font-semibold">
                      {emp.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium leading-none">
                      {emp.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {emp.id}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm">{emp.designation}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    emp.status === "Active"
                      ? "success"
                      : emp.status === "On Leave"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {emp.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {emp.joiningDate}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {emp.salary}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

// ── Tab: Locations ────────────────────────────────────────────────────────────

function LocationsTab({ locationNames }: { locationNames: string[] }) {
  const locations = mockLocations.filter((loc) =>
    locationNames.includes(loc.name)
  )

  if (locations.length === 0) {
    return (
      <EmptyTabState
        icon={MapPin}
        title="No locations assigned"
        description="Office locations assigned to this department will appear here."
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {locations.map((loc) => (
        <Card key={loc.id} className="shadow-sm">
          <CardContent className="pt-5 pb-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-xs">
                {loc.code}
              </Badge>
              <Badge
                variant={loc.status === "Active" ? "success" : "secondary"}
                className="text-xs"
              >
                {loc.status}
              </Badge>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{loc.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {loc.address}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Tab: History ──────────────────────────────────────────────────────────────

function HistoryTab({ dept }: { dept: Department }) {
  const history = buildHistory(dept)

  return (
    <Card className="overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Field</TableHead>
            <TableHead>Previous Value</TableHead>
            <TableHead>New Value</TableHead>
            <TableHead>Changed By</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="text-sm font-medium">
                {entry.field}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {entry.from}
              </TableCell>
              <TableCell className="text-sm">{entry.to}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {entry.by}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {entry.at}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

// ── Tab: Activity ─────────────────────────────────────────────────────────────

function ActivityTab({ dept }: { dept: Department }) {
  const activities = buildActivity(dept)

  return (
    <Card className="shadow-sm">
      <CardContent className="py-6">
        <div>
          {activities.map((entry, i) => (
            <div key={entry.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-background",
                    i === 0
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      i === 0 ? "bg-primary" : "bg-muted-foreground/50"
                    )}
                  />
                </div>
                {i < activities.length - 1 && (
                  <div className="mt-1 min-h-[32px] w-px flex-1 bg-border" />
                )}
              </div>
              <div className={cn("pb-6 min-w-0", i === activities.length - 1 && "pb-0")}>
                <p className="text-sm font-medium text-foreground leading-snug">
                  {entry.desc}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {entry.detail}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/70">
                    {entry.user}
                  </span>
                  {" · "}
                  {entry.at}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DepartmentDetailPage() {
  const params = useParams() as { id?: string }
  const [, navigate] = useLocation()
  const { toast } = useToast()

  const [department, setDepartment] = React.useState<Department | undefined>(
    () => mockDepartments.find((d) => d.id === params.id)
  )
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const deptEmployees = React.useMemo(
    () => mockEmployees.filter((e) => e.department === department?.name),
    [department?.name]
  )
  const deptLocations = React.useMemo(
    () => mockLocations.filter((l) => department?.locations.includes(l.name)),
    [department?.locations]
  )

  if (!department) {
    return (
      <AppLayout>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Department not found</h2>
          <p className="text-sm text-muted-foreground">
            This department does not exist or has been removed.
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/organization/departments")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Departments
          </Button>
        </div>
      </AppLayout>
    )
  }

  function handleEdit(values: DepartmentFormValues) {
    const headName =
      DEPARTMENT_HEADS.find((h) => h.id === values.headId)?.name ??
      values.headId
    setDepartment((prev) =>
      prev
        ? {
            ...prev,
            ...values,
            head: headName,
            updatedAt: new Date().toISOString().slice(0, 10),
          }
        : prev
    )
    setEditOpen(false)
    toast({ title: "Department updated", description: "Changes have been saved." })
  }

  function handleDeleteAction(action: "delete" | "archive") {
    if (action === "archive") {
      setDepartment((prev) =>
        prev ? { ...prev, status: "Archived" } : prev
      )
      toast({ title: "Department archived" })
    } else {
      navigate("/organization/departments")
    }
    setDeleteOpen(false)
  }

  const statusBadge =
    department.status === "Active" ? (
      <Badge variant="success">Active</Badge>
    ) : department.status === "Inactive" ? (
      <Badge variant="secondary">Inactive</Badge>
    ) : (
      <Badge variant="outline" className="text-muted-foreground">
        Archived
      </Badge>
    )

  const breadcrumb = (
    <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link
        href="/organization/company"
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        <span>Organization</span>
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      <Link
        href="/organization/departments"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        Departments
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      <span className="max-w-[180px] truncate font-medium text-foreground">
        {department.name}
      </span>
    </nav>
  )

  return (
    <AppLayout breadcrumb={breadcrumb}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-card text-primary shadow-sm">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {department.name}
                </h1>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  {department.code}
                </span>
                {statusBadge}
              </div>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                {department.description || "No description provided."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/organization/departments")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {department.status !== "Archived" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            )}
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
        <Separator className="mt-6" />
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          iconBg="bg-blue-50 dark:bg-blue-950/30"
          iconColor="text-blue-600 dark:text-blue-400"
          value={department.employeeCount.toLocaleString()}
          label="Headcount"
          sub="Active employees"
        />
        <StatCard
          icon={Banknote}
          iconBg="bg-emerald-50 dark:bg-emerald-950/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
          value={department.budget}
          label="Annual Budget"
          sub="Current fiscal year"
        />
        <StatCard
          icon={Building}
          iconBg="bg-purple-50 dark:bg-purple-950/30"
          iconColor="text-purple-600 dark:text-purple-400"
          value={department.businessUnit}
          label="Business Unit"
          sub="Parent unit"
        />
        <StatCard
          icon={DollarSign}
          iconBg="bg-amber-50 dark:bg-amber-950/30"
          iconColor="text-amber-600 dark:text-amber-400"
          value={department.costCenter}
          label="Cost Center"
          sub="Financial tracking unit"
        />
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview">
        <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
          {[
            { value: "overview",   label: "Overview" },
            { value: "employees",  label: `Employees (${deptEmployees.length})` },
            { value: "locations",  label: `Locations (${deptLocations.length})` },
            { value: "history",    label: "History" },
            { value: "activity",   label: "Activity" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab dept={department} />
        </TabsContent>

        <TabsContent value="employees" className="mt-6">
          <EmployeesTab deptName={department.name} />
        </TabsContent>

        <TabsContent value="locations" className="mt-6">
          <LocationsTab locationNames={department.locations} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryTab dept={department} />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ActivityTab dept={department} />
        </TabsContent>
      </Tabs>

      <DepartmentDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        department={department}
        onSubmit={handleEdit}
      />

      <DepartmentDeleteDialog
        department={department}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteAction}
      />
    </AppLayout>
  )
}
