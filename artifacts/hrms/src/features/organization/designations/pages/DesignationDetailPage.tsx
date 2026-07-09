import * as React from "react"
import { useParams, useLocation, Link } from "wouter"
import {
  ArrowLeft,
  Pencil,
  Archive,
  Briefcase,
  Users,
  Building2,
  BarChart2,
  CalendarDays,
  RefreshCcw,
  UserCircle,
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
import { mockEmployees } from "@/data/mockData"
import { AppLayout } from "@/components/layout/AppLayout"
import { mockDesignations, GRADE_OPTIONS, DEPARTMENT_OPTIONS } from "../data/mock"
import { DesignationDrawer } from "../components/DesignationDrawer"
import { OrgDeleteDialog } from "../../components/OrgDeleteDialog"
import { type Designation, type DesignationFormValues } from "../types"

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

function buildHistory(desg: Designation): HistoryEntry[] {
  return [
    { id: "h5", field: "Profile Updated",    from: "Previous version", to: "Current version",    by: "HR Manager",   at: desg.updatedAt },
    { id: "h4", field: "Status",             from: "Draft",            to: desg.status,           by: "HR Director",  at: desg.createdAt },
    { id: "h3", field: "Grade",              from: "—",                to: `${desg.gradeId} – ${desg.grade}`, by: "HR Admin",     at: desg.createdAt },
    { id: "h2", field: "Department",         from: "—",                to: desg.department,       by: "System Admin", at: desg.createdAt },
    { id: "h1", field: "Designation Created", from: "—",               to: desg.name,             by: "System",       at: desg.createdAt },
  ]
}

function buildActivity(desg: Designation): ActivityEntry[] {
  return [
    { id: "a5", desc: "Designation profile last updated",              detail: "Fields modified: Description, Grade", user: "HR Manager",   at: desg.updatedAt },
    { id: "a4", desc: `Linked to ${desg.department} department`,       detail: "Department assignment completed",     user: "HR Admin",     at: desg.createdAt },
    { id: "a3", desc: `Grade set to ${desg.gradeId} – ${desg.grade}`, detail: `Salary band: ${GRADE_OPTIONS.find(g => g.id === desg.gradeId)?.salaryRange ?? "—"}`, user: "HR Admin", at: desg.createdAt },
    { id: "a2", desc: `Designation code assigned: ${desg.code}`,       detail: "Unique identifier created",          user: "System",       at: desg.createdAt },
    { id: "a1", desc: `${desg.name} designation created`,               detail: "Role added to the designation library", user: "System",    at: desg.createdAt },
  ]
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
      <CardContent className="pb-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold leading-tight tabular-nums truncate">
              {value}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconBg)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InfoItem({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1 text-sm", mono && "font-mono")}>{value ?? "—"}</dd>
    </div>
  )
}

function EmptyTabState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
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

// ── Tabs ──────────────────────────────────────────────────────────────────────

function OverviewTab({ desg }: { desg: Designation }) {
  const gradeOption = GRADE_OPTIONS.find((g) => g.id === desg.gradeId)
  const deptOption = DEPARTMENT_OPTIONS.find((d) => d.id === desg.departmentId)

  const statusBadge =
    desg.status === "Active" ? (
      <Badge variant="success">Active</Badge>
    ) : desg.status === "Inactive" ? (
      <Badge variant="secondary">Inactive</Badge>
    ) : (
      <Badge variant="outline" className="text-muted-foreground">Archived</Badge>
    )

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="shadow-sm lg:col-span-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Designation Information</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <dl className="grid gap-5 sm:grid-cols-2">
            <InfoItem label="Designation Name" value={desg.name} />
            <InfoItem label="Code" value={desg.code} mono />
            <InfoItem label="Department" value={
              <Link href={`/organization/departments/${desg.departmentId}`} className="text-primary hover:underline underline-offset-4">
                {desg.department}
              </Link>
            } />
            <InfoItem
              label="Grade"
              value={
                <span className="flex items-center gap-1.5">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {desg.gradeId}
                  </span>
                  {desg.grade}
                </span>
              }
            />
            <InfoItem label="Headcount" value={`${desg.employeeCount.toLocaleString()} employees`} />
            <InfoItem label="Status" value={statusBadge} />
            <InfoItem
              label="Created Date"
              value={
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  {desg.createdAt}
                </span>
              }
            />
            <InfoItem
              label="Last Updated"
              value={
                <span className="flex items-center gap-1.5">
                  <RefreshCcw className="h-3.5 w-3.5 text-muted-foreground" />
                  {desg.updatedAt}
                </span>
              }
            />
            <div className="sm:col-span-2">
              <InfoItem
                label="Description"
                value={
                  desg.description || (
                    <span className="italic text-muted-foreground">No description provided</span>
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
            <CardTitle className="text-base">Grade Details</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-5">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Grade Code</p>
                <p className="mt-1 font-mono text-lg font-bold">{desg.gradeId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Band Name</p>
                <p className="mt-1 text-sm font-medium">{desg.grade}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Salary Range</p>
                <p className="mt-1 text-sm font-medium text-emerald-600">
                  {gradeOption?.salaryRange ?? "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Department</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{desg.department}</p>
                <p className="text-xs text-muted-foreground">{desg.departmentId}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EmployeesTab({ desgName }: { desgName: string }) {
  const employees = mockEmployees.filter((e) => e.designation === desgName)

  if (employees.length === 0) {
    return (
      <EmptyTabState
        icon={UserCircle}
        title="No employees with this designation"
        description="Employees assigned this designation will appear here."
      />
    )
  }

  return (
    <Card className="overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Employee</TableHead>
            <TableHead>Department</TableHead>
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
                      {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium leading-none">{emp.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{emp.id}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{emp.department}</TableCell>
              <TableCell>
                <Badge variant={emp.status === "Active" ? "success" : emp.status === "On Leave" ? "secondary" : "outline"}>
                  {emp.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{emp.joiningDate}</TableCell>
              <TableCell className="text-right font-mono text-sm">{emp.salary}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function HistoryTab({ desg }: { desg: Designation }) {
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
          {buildHistory(desg).map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="text-sm font-medium">{entry.field}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{entry.from}</TableCell>
              <TableCell className="text-sm">{entry.to}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{entry.by}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{entry.at}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function ActivityTab({ desg }: { desg: Designation }) {
  const activities = buildActivity(desg)
  return (
    <Card className="shadow-sm">
      <CardContent className="py-6">
        {activities.map((entry, i) => (
          <div key={entry.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-background",
                i === 0 ? "bg-primary/10" : "bg-muted"
              )}>
                <div className={cn("h-2.5 w-2.5 rounded-full", i === 0 ? "bg-primary" : "bg-muted-foreground/50")} />
              </div>
              {i < activities.length - 1 && (
                <div className="mt-1 min-h-[32px] w-px flex-1 bg-border" />
              )}
            </div>
            <div className={cn("min-w-0 pb-6", i === activities.length - 1 && "pb-0")}>
              <p className="text-sm font-medium leading-snug text-foreground">{entry.desc}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{entry.detail}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/70">{entry.user}</span>
                {" · "}
                {entry.at}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DesignationDetailPage() {
  const params = useParams() as { id?: string }
  const [, navigate] = useLocation()
  const { toast } = useToast()

  const [designation, setDesignation] = React.useState<Designation | undefined>(
    () => mockDesignations.find((d) => d.id === params.id)
  )
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const designationEmployees = React.useMemo(
    () => mockEmployees.filter((e) => e.designation === designation?.name),
    [designation?.name]
  )

  if (!designation) {
    return (
      <AppLayout>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Briefcase className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Designation not found</h2>
          <p className="text-sm text-muted-foreground">
            This designation does not exist or has been removed.
          </p>
          <Button variant="outline" onClick={() => navigate("/organization/designations")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Designations
          </Button>
        </div>
      </AppLayout>
    )
  }

  function handleEdit(values: DesignationFormValues) {
    const deptName = DEPARTMENT_OPTIONS.find((d) => d.id === values.departmentId)?.name ?? values.departmentId
    const gradeOption = GRADE_OPTIONS.find((g) => g.id === values.gradeId)
    setDesignation((prev) =>
      prev
        ? {
            ...prev,
            ...values,
            department: deptName,
            grade: gradeOption?.band ?? values.gradeId,
            updatedAt: new Date().toISOString().slice(0, 10),
          }
        : prev
    )
    setEditOpen(false)
    toast({ title: "Designation updated", description: "Changes have been saved." })
  }

  function handleDeleteAction(action: "delete" | "archive") {
    if (action === "archive") {
      setDesignation((prev) => prev ? { ...prev, status: "Archived" } : prev)
      toast({ title: "Designation archived" })
    } else {
      navigate("/organization/designations")
    }
    setDeleteOpen(false)
  }

  const statusBadge =
    designation.status === "Active" ? (
      <Badge variant="success">Active</Badge>
    ) : designation.status === "Inactive" ? (
      <Badge variant="secondary">Inactive</Badge>
    ) : (
      <Badge variant="outline" className="text-muted-foreground">Archived</Badge>
    )

  const gradeOption = GRADE_OPTIONS.find((g) => g.id === designation.gradeId)

  const breadcrumb = (
    <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link href="/organization/company" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        Organization
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      <Link href="/organization/designations" className="text-muted-foreground hover:text-foreground transition-colors">
        Designations
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      <span className="max-w-[180px] truncate font-medium text-foreground">
        {designation.name}
      </span>
    </nav>
  )

  return (
    <AppLayout breadcrumb={breadcrumb}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-card text-primary shadow-sm">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {designation.name}
                </h1>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  {designation.code}
                </span>
                {statusBadge}
              </div>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                {designation.description || "No description provided."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/organization/designations")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {designation.status !== "Archived" && (
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
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

      {/* Stat Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          iconBg="bg-blue-50 dark:bg-blue-950/30"
          iconColor="text-blue-600 dark:text-blue-400"
          value={designation.employeeCount.toLocaleString()}
          label="Headcount"
          sub="Employees with this designation"
        />
        <StatCard
          icon={BarChart2}
          iconBg="bg-purple-50 dark:bg-purple-950/30"
          iconColor="text-purple-600 dark:text-purple-400"
          value={designation.gradeId}
          label="Grade Band"
          sub={gradeOption?.band ?? "—"}
        />
        <StatCard
          icon={Building2}
          iconBg="bg-amber-50 dark:bg-amber-950/30"
          iconColor="text-amber-600 dark:text-amber-400"
          value={designation.department}
          label="Department"
          sub="Primary department"
        />
        <StatCard
          icon={Briefcase}
          iconBg="bg-emerald-50 dark:bg-emerald-950/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
          value={gradeOption?.salaryRange ?? "—"}
          label="Salary Range"
          sub="Based on grade band"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
          {[
            { value: "overview",    label: "Overview" },
            { value: "employees",   label: `Employees (${designationEmployees.length})` },
            { value: "history",     label: "History" },
            { value: "activity",    label: "Activity" },
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
          <OverviewTab desg={designation} />
        </TabsContent>

        <TabsContent value="employees" className="mt-6">
          <EmployeesTab desgName={designation.name} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryTab desg={designation} />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ActivityTab desg={designation} />
        </TabsContent>
      </Tabs>

      <DesignationDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        designation={designation}
        onSubmit={handleEdit}
      />

      <OrgDeleteDialog
        entityType="Designation"
        entityName={designation.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteAction}
        isArchived={designation.status === "Archived"}
      />
    </AppLayout>
  )
}
