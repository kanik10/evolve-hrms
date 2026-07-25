import * as React from "react"
import { Plus, Users } from "lucide-react"
import { useLocation } from "wouter"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { EmptyState } from "../../components/EmptyState"
import { OrgLayout } from "../../components/OrgLayout"
import { OrgPageHeader } from "../../components/OrgPageHeader"
import { StandardMasterTable } from "../../components/StandardMasterTable"
import { getDepartmentColumns } from "../components/DepartmentColumns"
import { DepartmentStatCards } from "../components/DepartmentStatCards"
import { DepartmentFilters } from "../components/DepartmentFilters"
import { DepartmentDrawer } from "../components/DepartmentDrawer"
import { DepartmentDeleteDialog } from "../components/DepartmentDeleteDialog"
import { mockDepartments, DEPARTMENT_HEADS } from "../data/mock"
import { type Department, type DepartmentFormValues } from "../types"

export default function DepartmentsPage() {
  const { toast } = useToast()
  const [, navigate] = useLocation()

  // ── Data state ─────────────────────────────────────────────────────────────
  const [departments, setDepartments] =
    React.useState<Department[]>(mockDepartments)

  // ── Filter state ───────────────────────────────────────────────────────────
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [buFilter, setBuFilter] = React.useState("all")

  // ── Drawer state ───────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerMode, setDrawerMode] = React.useState<"create" | "edit">(
    "create"
  )
  const [editingDept, setEditingDept] = React.useState<
    Department | undefined
  >()

  // ── Delete dialog state ────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletingDept, setDeletingDept] = React.useState<
    Department | undefined
  >()

  // ── Loading state ────────────────────────────────────────────────────────
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 450)
    return () => window.clearTimeout(timer)
  }, [])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCreate = React.useCallback(() => {
    setEditingDept(undefined)
    setDrawerMode("create")
    setDrawerOpen(true)
  }, [])

  const handleEdit = React.useCallback((dept: Department) => {
    setEditingDept(dept)
    setDrawerMode("edit")
    setDrawerOpen(true)
  }, [])

  const handleDeletePrompt = React.useCallback((dept: Department) => {
    setDeletingDept(dept)
    setDeleteOpen(true)
  }, [])

  const handleArchive = React.useCallback((dept: Department) => {
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === dept.id ? { ...d, status: "Archived" as const } : d
      )
    )
    toast({
      title: "Department archived",
      description: `"${dept.name}" has been archived.`,
    })
  }, [])

  const handleSave = React.useCallback(
    (values: DepartmentFormValues) => {
      const headName =
        DEPARTMENT_HEADS.find((h) => h.id === values.headId)?.name ??
        values.headId

      if (drawerMode === "create") {
        const newDept: Department = {
          id: `dept-${Date.now()}`,
          code: values.code,
          name: values.name,
          headId: values.headId,
          head: headName,
          businessUnit: values.businessUnit,
          costCenter: values.costCenter,
          location: values.location,
          description: values.description ?? "",
          status: values.status,
          employeeCount: 0,
          budget: "₹0",
          locations: [],
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
        }
        setDepartments((prev) => [newDept, ...prev])
        toast({
          title: "Department created",
          description: `"${values.name}" has been added.`,
        })
      } else if (editingDept) {
        setDepartments((prev) =>
          prev.map((d) =>
            d.id === editingDept.id
              ? {
                  ...d,
                  code: values.code,
                  name: values.name,
                  headId: values.headId,
                  head: headName,
                  businessUnit: values.businessUnit,
                  costCenter: values.costCenter,
                  location: values.location,
                  description: values.description ?? "",
                  status: values.status,
                  updatedAt: new Date().toISOString().slice(0, 10),
                }
              : d
          )
        )
        toast({
          title: "Department updated",
          description: `"${values.name}" has been saved.`,
        })
      }
      setDrawerOpen(false)
    },
    [drawerMode, editingDept]
  )

  const handleConfirmDelete = React.useCallback(
    (action: "delete" | "archive") => {
      if (!deletingDept) return
      if (action === "delete") {
        setDepartments((prev) => prev.filter((d) => d.id !== deletingDept.id))
        toast({
          title: "Department deleted",
          description: `"${deletingDept.name}" has been permanently removed.`,
        })
      } else {
        setDepartments((prev) =>
          prev.map((d) =>
            d.id === deletingDept.id
              ? { ...d, status: "Archived" as const }
              : d
          )
        )
        toast({
          title: "Department archived",
          description: `"${deletingDept.name}" has been archived.`,
        })
      }
      setDeleteOpen(false)
      setDeletingDept(undefined)
    },
    [deletingDept]
  )

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filteredData = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return departments.filter((d) => {
      const matchSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.head.toLowerCase().includes(q) ||
        d.businessUnit.toLowerCase().includes(q)
      const matchStatus =
        statusFilter === "all" || d.status === statusFilter
      const matchBU = buFilter === "all" || d.businessUnit === buFilter
      return matchSearch && matchStatus && matchBU
    })
  }, [departments, search, statusFilter, buFilter])

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = React.useMemo(
    () =>
      getDepartmentColumns({
        onEdit: handleEdit,
        onDelete: handleDeletePrompt,
        onArchive: handleArchive,
      }),
    [handleEdit, handleDeletePrompt, handleArchive]
  )

  return (
    <OrgLayout section="Departments">
      <OrgPageHeader
        icon={Users}
        title="Departments"
        description="Manage organizational departments, assign department heads, and track headcount."
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        }
      />

      <DepartmentStatCards departments={departments} />

      <div className="mt-6 space-y-4">
        <DepartmentFilters
          search={search}
          onSearchChange={(v) => setSearch(v)}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          buFilter={buFilter}
          onBUChange={setBuFilter}
        />

        <StandardMasterTable
          data={filteredData}
          columns={columns}
          entityLabel="department"
          getRowId={(row) => row.id}
          loading={loading}
          onRowClick={(row) => navigate(`/organization/departments/${row.id}`)}
          emptyState={
            <EmptyState
              icon={Users}
              title="No departments found"
              description="Adjust your filters or create a new department to get started."
              action={{ label: "Add Department", onClick: handleCreate, icon: Plus }}
            />
          }
        />
      </div>

      <DepartmentDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        department={editingDept}
        onSubmit={handleSave}
      />

      {deletingDept && (
        <DepartmentDeleteDialog
          department={deletingDept}
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open)
            if (!open) setDeletingDept(undefined)
          }}
          onConfirm={handleConfirmDelete}
        />
      )}
    </OrgLayout>
  )
}
