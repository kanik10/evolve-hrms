import * as React from "react"
import { BarChart2, ChevronLeft, ChevronRight, Edit3, Plus, Search, Trash2 } from "lucide-react"
import { useLocation } from "wouter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { GradeDrawer } from "../grades/components/GradeDrawer"
import { GradeDeleteDialog } from "../grades/components/GradeDeleteDialog"
import { type GradeFormValues, createEmptyGradeFormValues, getGrades, updateGrades, type GradeRecord } from "../grades/data/grades"

export default function Grades() {
  const [, navigate] = useLocation()
  const [grades, setGrades] = React.useState<GradeRecord[]>(() => getGrades())
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerMode, setDrawerMode] = React.useState<"create" | "edit">("create")
  const [editingGrade, setEditingGrade] = React.useState<GradeRecord | undefined>()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletingGrade, setDeletingGrade] = React.useState<GradeRecord | undefined>()
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 5

  const filteredGrades = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return grades.filter((grade) => {
      const matchesSearch =
        !query ||
        grade.grade.toLowerCase().includes(query) ||
        grade.level.toLowerCase().includes(query) ||
        grade.salaryBand.toLowerCase().includes(query)
      const matchesStatus = statusFilter === "all" || grade.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [grades, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredGrades.length / pageSize))
  const visibleGrades = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredGrades.slice(start, start + pageSize)
  }, [filteredGrades, currentPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter])

  const openCreateDrawer = () => {
    setEditingGrade(undefined)
    setDrawerMode("create")
    setDrawerOpen(true)
  }

  const openEditDrawer = (grade: GradeRecord) => {
    setEditingGrade(grade)
    setDrawerMode("edit")
    setDrawerOpen(true)
  }

  const handleSubmit = (values: GradeFormValues) => {
    if (drawerMode === "create") {
      const newGrade: GradeRecord = {
        id: `G${Date.now().toString().slice(-3)}`,
        ...values,
      }
      updateGrades((current) => [newGrade, ...current])
      setGrades(getGrades())
    } else if (editingGrade) {
      updateGrades((current) => current.map((item) => (item.id === editingGrade.id ? { ...item, ...values } : item)))
      setGrades(getGrades())
    }
    setDrawerOpen(false)
  }

  const confirmDelete = () => {
    if (!deletingGrade) return
    updateGrades((current) => current.filter((item) => item.id !== deletingGrade.id))
    setGrades(getGrades())
    setDeleteOpen(false)
    setDeletingGrade(undefined)
  }

  return (
    <OrgLayout section="Grades">
      <OrgPageHeader
        icon={BarChart2}
        title="Grades"
        description="Create employee grade bands and career levels with salary bands and status tracking."
        action={
          <Button onClick={openCreateDrawer}>
            <Plus className="mr-2 h-4 w-4" />
            Add Grade
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by grade, level, or salary band" className="pl-9" />
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
              <TableHead>Grade</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Salary Band</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleGrades.length > 0 ? (
              visibleGrades.map((grade) => (
                <TableRow key={grade.id} className="cursor-pointer" onClick={() => navigate(`/organization/grades/${grade.id}`)}>
                  <TableCell>
                    <div className="font-medium">{grade.grade}</div>
                  </TableCell>
                  <TableCell>{grade.level}</TableCell>
                  <TableCell className="max-w-[320px] text-sm text-muted-foreground">{grade.description}</TableCell>
                  <TableCell>{grade.salaryBand}</TableCell>
                  <TableCell>
                    <Badge variant={grade.status === "Active" ? "default" : "secondary"}>{grade.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                      <Button variant="outline" size="icon" onClick={() => openEditDrawer(grade)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => { setDeletingGrade(grade); setDeleteOpen(true) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No grades match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {filteredGrades.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredGrades.length)} of {filteredGrades.length} grades
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

      <GradeDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        initialValues={editingGrade ? {
          grade: editingGrade.grade,
          level: editingGrade.level,
          description: editingGrade.description,
          salaryBand: editingGrade.salaryBand,
          status: editingGrade.status,
        } : createEmptyGradeFormValues()}
        onSubmit={handleSubmit}
      />

      {deletingGrade && (
        <GradeDeleteDialog
          grade={deletingGrade}
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open)
            if (!open) setDeletingGrade(undefined)
          }}
          onConfirm={confirmDelete}
        />
      )}
    </OrgLayout>
  )
}
