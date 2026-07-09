import * as React from "react"
import { Building2, ChevronLeft, ChevronRight, Edit3, Plus, Search, Trash2 } from "lucide-react"
import { useLocation } from "wouter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { BusinessUnitDrawer } from "../business-units/components/BusinessUnitDrawer"
import { BusinessUnitDeleteDialog } from "../business-units/components/BusinessUnitDeleteDialog"
import { type BusinessUnitFormValues, createEmptyBusinessUnitFormValues, getBusinessUnits, updateBusinessUnits, type BusinessUnitRecord } from "../business-units/data/businessUnits"
import { getOrganizationCostCenterOptions, getOrganizationLocationOptions, getOrganizationDepartmentOptions } from "../data/organizationData"

export default function BusinessUnits() {
  const [, navigate] = useLocation()
  const [businessUnits, setBusinessUnits] = React.useState<BusinessUnitRecord[]>(() => getBusinessUnits())
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerMode, setDrawerMode] = React.useState<"create" | "edit">("create")
  const [editingBusinessUnit, setEditingBusinessUnit] = React.useState<BusinessUnitRecord | undefined>()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletingBusinessUnit, setDeletingBusinessUnit] = React.useState<BusinessUnitRecord | undefined>()
  const pageSize = 5

  const filteredBusinessUnits = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return businessUnits.filter((unit) => {
      const matchesSearch =
        !query ||
        unit.name.toLowerCase().includes(query) ||
        unit.code.toLowerCase().includes(query) ||
        unit.head.toLowerCase().includes(query)
      const matchesStatus = statusFilter === "all" || unit.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [businessUnits, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredBusinessUnits.length / pageSize))
  const visibleBusinessUnits = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredBusinessUnits.slice(start, start + pageSize)
  }, [filteredBusinessUnits, currentPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter])

  const openCreateDrawer = () => {
    setEditingBusinessUnit(undefined)
    setDrawerMode("create")
    setDrawerOpen(true)
  }

  const openEditDrawer = (businessUnit: BusinessUnitRecord) => {
    setEditingBusinessUnit(businessUnit)
    setDrawerMode("edit")
    setDrawerOpen(true)
  }

  const handleSubmit = (values: BusinessUnitFormValues) => {
    if (drawerMode === "create") {
      const newBusinessUnit: BusinessUnitRecord = {
        id: `BU${Date.now().toString().slice(-3)}`,
        departments: [],
        locations: [],
        costCenters: [],
        ...values,
      }
      const linkedDepartments = getOrganizationDepartmentOptions().slice(0, 2)
      const linkedLocations = getOrganizationLocationOptions().slice(0, 2)
      const linkedCostCenters = getOrganizationCostCenterOptions().slice(0, 2)
      updateBusinessUnits((current) => [
        { ...newBusinessUnit, departments: linkedDepartments, locations: linkedLocations, costCenters: linkedCostCenters },
        ...current,
      ])
      setBusinessUnits(getBusinessUnits())
    } else if (editingBusinessUnit) {
      updateBusinessUnits((current) => current.map((item) => (item.id === editingBusinessUnit.id ? { ...item, ...values } : item)))
      setBusinessUnits(getBusinessUnits())
    }
    setDrawerOpen(false)
  }

  const confirmDelete = () => {
    if (!deletingBusinessUnit) return
    updateBusinessUnits((current) => current.filter((item) => item.id !== deletingBusinessUnit.id))
    setBusinessUnits(getBusinessUnits())
    setDeleteOpen(false)
    setDeletingBusinessUnit(undefined)
  }

  return (
    <OrgLayout section="Business Units">
      <OrgPageHeader
        icon={Building2}
        title="Business Units"
        description="Manage the business segments that group departments, locations, and cost centers."
        action={
          <Button onClick={openCreateDrawer}>
            <Plus className="mr-2 h-4 w-4" />
            Add Business Unit
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, code, or head" className="pl-9" />
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
              <TableHead>Business Unit</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Head</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleBusinessUnits.length > 0 ? (
              visibleBusinessUnits.map((businessUnit) => (
                <TableRow key={businessUnit.id} className="cursor-pointer" onClick={() => navigate(`/organization/business-units/${businessUnit.id}`)}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{businessUnit.name}</p>
                      <p className="text-sm text-muted-foreground">{businessUnit.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>{businessUnit.code}</TableCell>
                  <TableCell>{businessUnit.head}</TableCell>
                  <TableCell>
                    <Badge variant={businessUnit.status === "Active" ? "default" : "secondary"}>{businessUnit.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                      <Button variant="outline" size="icon" onClick={() => openEditDrawer(businessUnit)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => { setDeletingBusinessUnit(businessUnit); setDeleteOpen(true) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No business units match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {filteredBusinessUnits.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredBusinessUnits.length)} of {filteredBusinessUnits.length} business units
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

      <BusinessUnitDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        initialValues={editingBusinessUnit ? {
          name: editingBusinessUnit.name,
          code: editingBusinessUnit.code,
          head: editingBusinessUnit.head,
          description: editingBusinessUnit.description,
          status: editingBusinessUnit.status,
        } : createEmptyBusinessUnitFormValues()}
        onSubmit={handleSubmit}
      />

      {deletingBusinessUnit && (
        <BusinessUnitDeleteDialog
          businessUnit={deletingBusinessUnit}
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open)
            if (!open) setDeletingBusinessUnit(undefined)
          }}
          onConfirm={confirmDelete}
        />
      )}
    </OrgLayout>
  )
}
