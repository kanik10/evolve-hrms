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
import { Plus, ChevronLeft, ChevronRight, Briefcase } from "lucide-react"
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
import { OrgDeleteDialog } from "../../components/OrgDeleteDialog"
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

  // ── Table ──────────────────────────────────────────────────────────────────
  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, rowSelection, pagination },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const selectedCount = Object.keys(rowSelection).length

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
          onSearchChange={(v) => { setSearch(v); resetPagination() }}
          statusFilter={statusFilter}
          onStatusChange={(v) => { setStatusFilter(v); resetPagination() }}
          deptFilter={deptFilter}
          onDeptChange={(v) => { setDeptFilter(v); resetPagination() }}
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
                <TableRow key={hg.id} className="hover:bg-transparent bg-muted/50">
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
                      if (
                        (e.target as Element).closest(
                          'button, input, a, [role="menuitem"], [role="checkbox"]'
                        )
                      )
                        return
                      navigate(`/organization/designations/${row.original.id}`)
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
                    No designations match your current filters.
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
              : `Showing ${pagination.pageIndex * pagination.pageSize + 1}–${Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  filteredData.length
                )} of ${filteredData.length} designation${filteredData.length !== 1 ? "s" : ""}`}
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
              </Button>
            </div>
          </div>
        </div>
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
