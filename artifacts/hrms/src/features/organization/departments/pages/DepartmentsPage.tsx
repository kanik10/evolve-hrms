import * as React from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type PaginationState,
  type RowSelectionState,
} from "@tanstack/react-table"
import { Plus, ChevronLeft, ChevronRight, Users } from "lucide-react"
import { useLocation } from "wouter"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { OrgLayout } from "../../components/OrgLayout"
import { OrgPageHeader } from "../../components/OrgPageHeader"
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

  // ── Table state ────────────────────────────────────────────────────────────
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // ── Handlers ───────────────────────────────────────────────────────────────
  const resetPagination = () =>
    setPagination((p) => ({ ...p, pageIndex: 0 }))

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
          onSearchChange={(v) => {
            setSearch(v)
            resetPagination()
          }}
          statusFilter={statusFilter}
          onStatusChange={(v) => {
            setStatusFilter(v)
            resetPagination()
          }}
          buFilter={buFilter}
          onBUChange={(v) => {
            setBuFilter(v)
            resetPagination()
          }}
        />

        {selectedCount > 0 && (
          <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2 text-sm">
            <span className="font-medium">
              {selectedCount} row{selectedCount > 1 ? "s" : ""} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-muted-foreground hover:text-foreground"
              onClick={() => setRowSelection({})}
            >
              Clear selection
            </Button>
          </div>
        )}

        <div className="overflow-hidden rounded-md border bg-card">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow
                  key={hg.id}
                  className="hover:bg-transparent bg-muted/50"
                >
                  {hg.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{
                        width:
                          header.column.getSize() !== 150
                            ? header.column.getSize()
                            : undefined,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as Element).closest('button, input, a, [role="menuitem"], [role="checkbox"]')) return
                      navigate(`/organization/departments/${row.original.id}`)
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-14 text-center text-sm text-muted-foreground"
                  >
                    No departments match your current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-1">
          <p className="text-sm text-muted-foreground">
            {filteredData.length === 0
              ? "No results"
              : `Showing ${
                  pagination.pageIndex * pagination.pageSize + 1
                }–${Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  filteredData.length
                )} of ${filteredData.length} department${
                  filteredData.length !== 1 ? "s" : ""
                }`}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="hidden sm:inline">Rows per page</span>
              <Select
                value={String(pagination.pageSize)}
                onValueChange={(v) => {
                  table.setPageSize(Number(v))
                  resetPagination()
                }}
              >
                <SelectTrigger className="h-8 w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              <span className="min-w-[60px] text-center text-sm tabular-nums">
                {pagination.pageIndex + 1} /{" "}
                {Math.max(table.getPageCount(), 1)}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
              </Button>
            </div>
          </div>
        </div>
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
