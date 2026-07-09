import * as React from "react"
import { ChevronLeft, ChevronRight, Edit3, Plus, Search, Trash2, UserCheck } from "lucide-react"
import { useLocation } from "wouter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { EmploymentTypeDrawer } from "../employment-types/components/EmploymentTypeDrawer"
import { EmploymentTypeDeleteDialog } from "../employment-types/components/EmploymentTypeDeleteDialog"
import { type EmploymentTypeFormValues, createEmptyEmploymentTypeFormValues, getEmploymentTypes, updateEmploymentTypes, type EmploymentTypeRecord } from "../employment-types/data/employmentTypes"

export default function EmploymentTypes() {
  const [, navigate] = useLocation()
  const [employmentTypes, setEmploymentTypes] = React.useState<EmploymentTypeRecord[]>(() => getEmploymentTypes())
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerMode, setDrawerMode] = React.useState<"create" | "edit">("create")
  const [editingEmploymentType, setEditingEmploymentType] = React.useState<EmploymentTypeRecord | undefined>()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletingEmploymentType, setDeletingEmploymentType] = React.useState<EmploymentTypeRecord | undefined>()
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 5

  const filteredEmploymentTypes = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return employmentTypes.filter((item) => {
      const matchesSearch =
        !query ||
        item.typeName.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.noticePeriod.toLowerCase().includes(query)
      const matchesStatus = statusFilter === "all" || item.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [employmentTypes, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredEmploymentTypes.length / pageSize))
  const visibleEmploymentTypes = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredEmploymentTypes.slice(start, start + pageSize)
  }, [filteredEmploymentTypes, currentPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter])

  const openCreateDrawer = () => {
    setEditingEmploymentType(undefined)
    setDrawerMode("create")
    setDrawerOpen(true)
  }

  const openEditDrawer = (employmentType: EmploymentTypeRecord) => {
    setEditingEmploymentType(employmentType)
    setDrawerMode("edit")
    setDrawerOpen(true)
  }

  const handleSubmit = (values: EmploymentTypeFormValues) => {
    if (drawerMode === "create") {
      const newEmploymentType: EmploymentTypeRecord = {
        id: `ET${Date.now().toString().slice(-3)}`,
        ...values,
      }
      updateEmploymentTypes((current) => [newEmploymentType, ...current])
      setEmploymentTypes(getEmploymentTypes())
    } else if (editingEmploymentType) {
      updateEmploymentTypes((current) => current.map((item) => (item.id === editingEmploymentType.id ? { ...item, ...values } : item)))
      setEmploymentTypes(getEmploymentTypes())
    }
    setDrawerOpen(false)
  }

  const confirmDelete = () => {
    if (!deletingEmploymentType) return
    updateEmploymentTypes((current) => current.filter((item) => item.id !== deletingEmploymentType.id))
    setEmploymentTypes(getEmploymentTypes())
    setDeleteOpen(false)
    setDeletingEmploymentType(undefined)
  }

  return (
    <OrgLayout section="Employment Types">
      <OrgPageHeader
        icon={UserCheck}
        title="Employment Types"
        description="Define workforce classifications with benefits rules, notice periods, and status tracking."
        action={
          <Button onClick={openCreateDrawer}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employment Type
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, description, or notice period" className="pl-9" />
        </label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Benefits Eligible</TableHead>
              <TableHead>Notice Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleEmploymentTypes.length > 0 ? (
              visibleEmploymentTypes.map((employmentType) => (
                <TableRow key={employmentType.id} className="cursor-pointer" onClick={() => navigate(`/organization/employment-types/${employmentType.id}`)}>
                  <TableCell>
                    <div className="font-medium">{employmentType.typeName}</div>
                  </TableCell>
                  <TableCell className="max-w-[320px] text-sm text-muted-foreground">{employmentType.description}</TableCell>
                  <TableCell>{employmentType.benefitsEligible ? "Yes" : "No"}</TableCell>
                  <TableCell>{employmentType.noticePeriod}</TableCell>
                  <TableCell>
                    <Badge variant={employmentType.status === "Active" ? "default" : "secondary"}>{employmentType.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                      <Button variant="outline" size="icon" onClick={() => openEditDrawer(employmentType)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => { setDeletingEmploymentType(employmentType); setDeleteOpen(true) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No employment types match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {filteredEmploymentTypes.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredEmploymentTypes.length)} of {filteredEmploymentTypes.length} employment types
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{currentPage} / {totalPages}</span>
          <Button variant="outline" size="icon" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <EmploymentTypeDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        initialValues={editingEmploymentType ? {
          typeName: editingEmploymentType.typeName,
          description: editingEmploymentType.description,
          benefitsEligible: editingEmploymentType.benefitsEligible,
          noticePeriod: editingEmploymentType.noticePeriod,
          status: editingEmploymentType.status,
        } : createEmptyEmploymentTypeFormValues()}
        onSubmit={handleSubmit}
      />

      {deletingEmploymentType && (
        <EmploymentTypeDeleteDialog
          employmentType={deletingEmploymentType}
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open)
            if (!open) setDeletingEmploymentType(undefined)
          }}
          onConfirm={confirmDelete}
        />
      )}
    </OrgLayout>
  )
}
