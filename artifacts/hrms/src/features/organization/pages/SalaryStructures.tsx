import * as React from "react"
import { Banknote, ChevronLeft, ChevronRight, Edit3, Plus, Search, Trash2 } from "lucide-react"
import { useLocation } from "wouter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { SalaryStructureDeleteDialog } from "../salary-structures/components/SalaryStructureDeleteDialog"
import { SalaryStructureDrawer } from "../salary-structures/components/SalaryStructureDrawer"
import { type SalaryStructureFormValues, createEmptySalaryStructureFormValues, getSalaryStructures, type SalaryStructureRecord, updateSalaryStructures, calculateNetSalary } from "../salary-structures/data/salaryStructures"
import { getOrganizationDepartmentOptions } from "../data/organizationData"

export default function SalaryStructures() {
  const [, navigate] = useLocation()
  const [salaryStructures, setSalaryStructures] = React.useState<SalaryStructureRecord[]>(() => getSalaryStructures())
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerMode, setDrawerMode] = React.useState<"create" | "edit">("create")
  const [editingSalaryStructure, setEditingSalaryStructure] = React.useState<SalaryStructureRecord | undefined>()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletingSalaryStructure, setDeletingSalaryStructure] = React.useState<SalaryStructureRecord | undefined>()
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 5

  const filteredSalaryStructures = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return salaryStructures.filter((structure) => {
      const matchesSearch = !query || structure.structureName.toLowerCase().includes(query) || structure.grade.toLowerCase().includes(query)
      const matchesStatus = statusFilter === "all" || structure.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [salaryStructures, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredSalaryStructures.length / pageSize))
  const visibleSalaryStructures = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSalaryStructures.slice(start, start + pageSize)
  }, [filteredSalaryStructures, currentPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter])

  const openCreateDrawer = () => {
    setEditingSalaryStructure(undefined)
    setDrawerMode("create")
    setDrawerOpen(true)
  }

  const openEditDrawer = (salaryStructure: SalaryStructureRecord) => {
    setEditingSalaryStructure(salaryStructure)
    setDrawerMode("edit")
    setDrawerOpen(true)
  }

  const handleSubmit = (values: SalaryStructureFormValues) => {
    if (drawerMode === "create") {
      const newSalaryStructure: SalaryStructureRecord = {
        id: `SAL${Date.now().toString().slice(-3)}`,
        ...values,
      }
      updateSalaryStructures((current) => [newSalaryStructure, ...current])
      setSalaryStructures(getSalaryStructures())
    } else if (editingSalaryStructure) {
      updateSalaryStructures((current) => current.map((item) => (item.id === editingSalaryStructure.id ? { ...item, ...values } : item)))
      setSalaryStructures(getSalaryStructures())
    }
    setDrawerOpen(false)
  }

  const confirmDelete = () => {
    if (!deletingSalaryStructure) return
    updateSalaryStructures((current) => current.filter((item) => item.id !== deletingSalaryStructure.id))
    setSalaryStructures(getSalaryStructures())
    setDeleteOpen(false)
    setDeletingSalaryStructure(undefined)
  }

  return (
    <OrgLayout section="Salary Structures">
      <OrgPageHeader
        icon={Banknote}
        title="Salary Structures"
        description="Build compensation frameworks with earnings, deductions, statutory components, and live net salary calculations."
        action={
          <Button onClick={openCreateDrawer}>
            <Plus className="mr-2 h-4 w-4" />
            Add Structure
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by structure or grade" className="pl-9" />
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
              <TableHead>Structure</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Net Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleSalaryStructures.length > 0 ? (
              visibleSalaryStructures.map((salaryStructure) => {
                const netSalary = calculateNetSalary({
                  structureName: salaryStructure.structureName,
                  grade: salaryStructure.grade,
                  basic: salaryStructure.basic,
                  hra: salaryStructure.hra,
                  specialAllowance: salaryStructure.specialAllowance,
                  bonus: salaryStructure.bonus,
                  pf: salaryStructure.pf,
                  esic: salaryStructure.esic,
                  professionalTax: salaryStructure.professionalTax,
                  tds: salaryStructure.tds,
                  status: salaryStructure.status,
                })
                return (
                  <TableRow key={salaryStructure.id} className="cursor-pointer" onClick={() => navigate(`/organization/salary-structures/${salaryStructure.id}`)}>
                    <TableCell>
                      <div className="font-medium">{salaryStructure.structureName}</div>
                    </TableCell>
                    <TableCell>{salaryStructure.grade}</TableCell>
                    <TableCell>₹{netSalary.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={salaryStructure.status === "Active" ? "default" : "secondary"}>{salaryStructure.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                        <Button variant="outline" size="icon" onClick={() => openEditDrawer(salaryStructure)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => { setDeletingSalaryStructure(salaryStructure); setDeleteOpen(true) }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No salary structures match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {filteredSalaryStructures.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredSalaryStructures.length)} of {filteredSalaryStructures.length} structures
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

      <SalaryStructureDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        initialValues={editingSalaryStructure ? {
          structureName: editingSalaryStructure.structureName,
          grade: editingSalaryStructure.grade,
          basic: editingSalaryStructure.basic,
          hra: editingSalaryStructure.hra,
          specialAllowance: editingSalaryStructure.specialAllowance,
          bonus: editingSalaryStructure.bonus,
          pf: editingSalaryStructure.pf,
          esic: editingSalaryStructure.esic,
          professionalTax: editingSalaryStructure.professionalTax,
          tds: editingSalaryStructure.tds,
          status: editingSalaryStructure.status,
        } : createEmptySalaryStructureFormValues()}
        onSubmit={handleSubmit}
      />

      {deletingSalaryStructure && (
        <SalaryStructureDeleteDialog
          salaryStructure={deletingSalaryStructure}
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open)
            if (!open) setDeletingSalaryStructure(undefined)
          }}
          onConfirm={confirmDelete}
        />
      )}
    </OrgLayout>
  )
}
