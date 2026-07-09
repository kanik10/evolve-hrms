import * as React from "react"
import { ChevronLeft, ChevronRight, DollarSign, Edit3, Plus, Search, Trash2 } from "lucide-react"
import { useLocation } from "wouter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { CostCenterDrawer } from "../cost-centers/components/CostCenterDrawer"
import { CostCenterDeleteDialog } from "../cost-centers/components/CostCenterDeleteDialog"
import { type CostCenterFormValues, createEmptyCostCenterFormValues, getCostCenters, updateCostCenters, type CostCenterRecord } from "../cost-centers/data/costCenters"

export default function CostCenters() {
  const [, navigate] = useLocation()
  const [costCenters, setCostCenters] = React.useState<CostCenterRecord[]>(() => getCostCenters())
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [departmentFilter, setDepartmentFilter] = React.useState("all")
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerMode, setDrawerMode] = React.useState<"create" | "edit">("create")
  const [editingCostCenter, setEditingCostCenter] = React.useState<CostCenterRecord | undefined>()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletingCostCenter, setDeletingCostCenter] = React.useState<CostCenterRecord | undefined>()
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 5

  const filteredCostCenters = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return costCenters.filter((costCenter) => {
      const matchesSearch =
        !query ||
        costCenter.name.toLowerCase().includes(query) ||
        costCenter.code.toLowerCase().includes(query) ||
        costCenter.department.toLowerCase().includes(query) ||
        costCenter.businessUnit.toLowerCase().includes(query)
      const matchesStatus = statusFilter === "all" || costCenter.status === statusFilter
      const matchesDepartment = departmentFilter === "all" || costCenter.department === departmentFilter
      return matchesSearch && matchesStatus && matchesDepartment
    })
  }, [costCenters, search, statusFilter, departmentFilter])

  const totalPages = Math.max(1, Math.ceil(filteredCostCenters.length / pageSize))
  const visibleCostCenters = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCostCenters.slice(start, start + pageSize)
  }, [filteredCostCenters, currentPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, departmentFilter])

  const openCreateDrawer = () => {
    setEditingCostCenter(undefined)
    setDrawerMode("create")
    setDrawerOpen(true)
  }

  const openEditDrawer = (costCenter: CostCenterRecord) => {
    setEditingCostCenter(costCenter)
    setDrawerMode("edit")
    setDrawerOpen(true)
  }

  const handleSubmit = (values: CostCenterFormValues) => {
    if (drawerMode === "create") {
      const newCostCenter: CostCenterRecord = {
        id: `CC${Date.now().toString().slice(-3)}`,
        ...values,
      }
      updateCostCenters((current) => [newCostCenter, ...current])
      setCostCenters(getCostCenters())
    } else if (editingCostCenter) {
      updateCostCenters((current) => current.map((item) => (item.id === editingCostCenter.id ? { ...item, ...values } : item)))
      setCostCenters(getCostCenters())
    }
    setDrawerOpen(false)
  }

  const confirmDelete = () => {
    if (!deletingCostCenter) return
    updateCostCenters((current) => current.filter((item) => item.id !== deletingCostCenter.id))
    setCostCenters(getCostCenters())
    setDeleteOpen(false)
    setDeletingCostCenter(undefined)
  }

  return (
    <OrgLayout section="Cost Centers">
      <OrgPageHeader
        icon={DollarSign}
        title="Cost Centers"
        description="Track departmental spending with mock cost centers, budget placeholders, and ownership details."
        action={
          <Button onClick={openCreateDrawer}>
            <Plus className="mr-2 h-4 w-4" />
            Add Cost Center
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, code, department, or BU" className="pl-9" />
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
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            <SelectItem value="Engineering">Engineering</SelectItem>
            <SelectItem value="Sales">Sales</SelectItem>
            <SelectItem value="Operations">Operations</SelectItem>
            <SelectItem value="Finance">Finance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cost Center</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Business Unit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleCostCenters.length > 0 ? (
              visibleCostCenters.map((costCenter) => (
                <TableRow key={costCenter.id} className="cursor-pointer" onClick={() => navigate(`/organization/cost-centers/${costCenter.id}`)}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{costCenter.name}</p>
                      <p className="text-sm text-muted-foreground">Budget: {costCenter.budget}</p>
                    </div>
                  </TableCell>
                  <TableCell>{costCenter.code}</TableCell>
                  <TableCell>{costCenter.department}</TableCell>
                  <TableCell>{costCenter.businessUnit}</TableCell>
                  <TableCell>
                    <Badge variant={costCenter.status === "Active" ? "default" : "secondary"}>{costCenter.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                      <Button variant="outline" size="icon" onClick={() => openEditDrawer(costCenter)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => { setDeletingCostCenter(costCenter); setDeleteOpen(true) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No cost centers match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {filteredCostCenters.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredCostCenters.length)} of {filteredCostCenters.length} cost centers
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

      <CostCenterDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        initialValues={editingCostCenter ? {
          name: editingCostCenter.name,
          code: editingCostCenter.code,
          department: editingCostCenter.department,
          businessUnit: editingCostCenter.businessUnit,
          status: editingCostCenter.status,
          budget: editingCostCenter.budget,
        } : createEmptyCostCenterFormValues()}
        onSubmit={handleSubmit}
      />

      {deletingCostCenter && (
        <CostCenterDeleteDialog
          costCenter={deletingCostCenter}
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open)
            if (!open) setDeletingCostCenter(undefined)
          }}
          onConfirm={confirmDelete}
        />
      )}
    </OrgLayout>
  )
}
