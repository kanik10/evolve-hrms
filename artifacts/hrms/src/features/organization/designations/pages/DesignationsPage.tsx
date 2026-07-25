import * as React from "react"
import { Plus, Briefcase } from "lucide-react"
import { useLocation } from "wouter"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { EmptyState } from "../../components/EmptyState"
import { OrgLayout } from "../../components/OrgLayout"
import { OrgPageHeader } from "../../components/OrgPageHeader"
import { OrgDeleteDialog } from "../../components/OrgDeleteDialog"
import { StandardMasterTable } from "../../components/StandardMasterTable"
import { getDesignationColumns } from "../components/DesignationColumns"
import { DesignationStatCards } from "../components/DesignationStatCards"
import { DesignationFilters } from "../components/DesignationFilters"
import { DesignationDrawer } from "../components/DesignationDrawer"
import { mockDesignations, DEPARTMENT_OPTIONS, GRADE_OPTIONS } from "../data/mock"
import { type Designation, type DesignationFormValues } from "../types"

export default function DesignationsPage() {
  const { toast } = useToast()
  const [, navigate] = useLocation()

  // ── Data ───────────────────────────────────────────────────────────────────
  const [designations, setDesignations] =
    React.useState<Designation[]>(mockDesignations)

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [deptFilter, setDeptFilter] = React.useState("all")

  // ── Drawer ─────────────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerMode, setDrawerMode] = React.useState<"create" | "edit">(
    "create"
  )
  const [editingDesg, setEditingDesg] = React.useState<
    Designation | undefined
  >()

  // ── Delete dialog ──────────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletingDesg, setDeletingDesg] = React.useState<
    Designation | undefined
  >()

  // ── Loading state ────────────────────────────────────────────────────────
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 450)
    return () => window.clearTimeout(timer)
  }, [])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCreate = React.useCallback(() => {
    setEditingDesg(undefined)
    setDrawerMode("create")
    setDrawerOpen(true)
  }, [])

  const handleEdit = React.useCallback((desg: Designation) => {
    setEditingDesg(desg)
    setDrawerMode("edit")
    setDrawerOpen(true)
  }, [])

  const handleDeletePrompt = React.useCallback((desg: Designation) => {
    setDeletingDesg(desg)
    setDeleteOpen(true)
  }, [])

  const handleArchive = React.useCallback((desg: Designation) => {
    setDesignations((prev) =>
      prev.map((d) =>
        d.id === desg.id ? { ...d, status: "Archived" as const } : d
      )
    )
    toast({ title: "Designation archived", description: `"${desg.name}" has been archived.` })
  }, [])

  const handleSave = React.useCallback(
    (values: DesignationFormValues) => {
      const deptName =
        DEPARTMENT_OPTIONS.find((d) => d.id === values.departmentId)?.name ??
        values.departmentId
      const gradeOption = GRADE_OPTIONS.find((g) => g.id === values.gradeId)
      const gradeBand = gradeOption?.band ?? values.gradeId

      if (drawerMode === "create") {
        const newDesg: Designation = {
          id: `des-${Date.now()}`,
          code: values.code,
          name: values.name,
          departmentId: values.departmentId,
          department: deptName,
          gradeId: values.gradeId,
          grade: gradeBand,
          description: values.description ?? "",
          status: values.status,
          employeeCount: 0,
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
        }
        setDesignations((prev) => [newDesg, ...prev])
        toast({ title: "Designation created", description: `"${values.name}" has been added.` })
      } else if (editingDesg) {
        setDesignations((prev) =>
          prev.map((d) =>
            d.id === editingDesg.id
              ? {
                  ...d,
                  code: values.code,
                  name: values.name,
                  departmentId: values.departmentId,
                  department: deptName,
                  gradeId: values.gradeId,
                  grade: gradeBand,
                  description: values.description ?? "",
                  status: values.status,
                  updatedAt: new Date().toISOString().slice(0, 10),
                }
              : d
          )
        )
        toast({ title: "Designation updated", description: `"${values.name}" has been saved.` })
      }
      setDrawerOpen(false)
    },
    [drawerMode, editingDesg]
  )

  const handleConfirmDelete = React.useCallback(
    (action: "delete" | "archive") => {
      if (!deletingDesg) return
      if (action === "delete") {
        setDesignations((prev) => prev.filter((d) => d.id !== deletingDesg.id))
        toast({ title: "Designation deleted", description: `"${deletingDesg.name}" has been permanently removed.` })
      } else {
        setDesignations((prev) =>
          prev.map((d) =>
            d.id === deletingDesg.id ? { ...d, status: "Archived" as const } : d
          )
        )
        toast({ title: "Designation archived", description: `"${deletingDesg.name}" has been archived.` })
      }
      setDeleteOpen(false)
      setDeletingDesg(undefined)
    },
    [deletingDesg]
  )

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filteredData = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return designations.filter((d) => {
      const matchSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.department.toLowerCase().includes(q) ||
        d.grade.toLowerCase().includes(q)
      const matchStatus =
        statusFilter === "all" || d.status === statusFilter
      const matchDept =
        deptFilter === "all" || d.department === deptFilter
      return matchSearch && matchStatus && matchDept
    })
  }, [designations, search, statusFilter, deptFilter])

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = React.useMemo(
    () =>
      getDesignationColumns({
        onEdit: handleEdit,
        onDelete: handleDeletePrompt,
        onArchive: handleArchive,
      }),
    [handleEdit, handleDeletePrompt, handleArchive]
  )

  return (
    <OrgLayout section="Designations">
      <OrgPageHeader
        icon={Briefcase}
        title="Designations"
        description="Manage job titles and position levels across all departments and functions."
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Designation
          </Button>
        }
      />

      <DesignationStatCards designations={designations} />

      <div className="mt-6 space-y-4">
        <DesignationFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          deptFilter={deptFilter}
          onDeptChange={setDeptFilter}
        />

        <StandardMasterTable
          data={filteredData}
          columns={columns}
          entityLabel="designation"
          getRowId={(row) => row.id}
          loading={loading}
          onRowClick={(row) => navigate(`/organization/designations/${row.id}`)}
          emptyState={
            <EmptyState
              icon={Briefcase}
              title="No designations found"
              description="Adjust your filters or create a new designation to get started."
              action={{ label: "Add Designation", onClick: handleCreate, icon: Plus }}
            />
          }
        />
      </div>

      <DesignationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        designation={editingDesg}
        onSubmit={handleSave}
      />

      {deletingDesg && (
        <OrgDeleteDialog
          entityType="Designation"
          entityName={deletingDesg.name}
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open)
            if (!open) setDeletingDesg(undefined)
          }}
          onConfirm={handleConfirmDelete}
          isArchived={deletingDesg.status === "Archived"}
        />
      )}
    </OrgLayout>
  )
}
