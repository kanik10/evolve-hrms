import * as React from "react"
import { ChevronLeft, ChevronRight, Clock3, Edit3, Plus, Search, Trash2 } from "lucide-react"
import { useLocation } from "wouter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { ShiftDeleteDialog } from "../shifts/components/ShiftDeleteDialog"
import { ShiftDrawer } from "../shifts/components/ShiftDrawer"
import { type ShiftFormValues, createEmptyShiftFormValues, getShifts, type ShiftRecord, updateShifts } from "../shifts/data/shifts"

export default function ShiftManagement() {
  const [, navigate] = useLocation()
  const [shifts, setShifts] = React.useState<ShiftRecord[]>(() => getShifts())
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerMode, setDrawerMode] = React.useState<"create" | "edit">("create")
  const [editingShift, setEditingShift] = React.useState<ShiftRecord | undefined>()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletingShift, setDeletingShift] = React.useState<ShiftRecord | undefined>()
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 5

  const filteredShifts = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return shifts.filter((shift) => {
      const matchesSearch =
        !query ||
        shift.shiftName.toLowerCase().includes(query) ||
        shift.weeklyOff.toLowerCase().includes(query) ||
        shift.startTime.toLowerCase().includes(query) ||
        shift.endTime.toLowerCase().includes(query)
      const matchesStatus = statusFilter === "all" || shift.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [shifts, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / pageSize))
  const visibleShifts = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredShifts.slice(start, start + pageSize)
  }, [filteredShifts, currentPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter])

  const openCreateDrawer = () => {
    setEditingShift(undefined)
    setDrawerMode("create")
    setDrawerOpen(true)
  }

  const openEditDrawer = (shift: ShiftRecord) => {
    setEditingShift(shift)
    setDrawerMode("edit")
    setDrawerOpen(true)
  }

  const handleSubmit = (values: ShiftFormValues) => {
    if (drawerMode === "create") {
      const newShift: ShiftRecord = {
        id: `SFT${Date.now().toString().slice(-3)}`,
        ...values,
      }
      updateShifts((current) => [newShift, ...current])
      setShifts(getShifts())
    } else if (editingShift) {
      updateShifts((current) => current.map((item) => (item.id === editingShift.id ? { ...item, ...values } : item)))
      setShifts(getShifts())
    }
    setDrawerOpen(false)
  }

  const confirmDelete = () => {
    if (!deletingShift) return
    updateShifts((current) => current.filter((item) => item.id !== deletingShift.id))
    setShifts(getShifts())
    setDeleteOpen(false)
    setDeletingShift(undefined)
  }

  return (
    <OrgLayout section="Shift Management">
      <OrgPageHeader
        icon={Clock3}
        title="Shift Management"
        description="Configure shift definitions with timing rules, grace periods, breaks, and weekly off patterns."
        action={
          <Button onClick={openCreateDrawer}>
            <Plus className="mr-2 h-4 w-4" />
            Add Shift
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by shift name or weekly off" className="pl-9" />
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
              <TableHead>Shift Name</TableHead>
              <TableHead>Timing</TableHead>
              <TableHead>Grace Time</TableHead>
              <TableHead>Break Duration</TableHead>
              <TableHead>Weekly Off</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleShifts.length > 0 ? (
              visibleShifts.map((shift) => (
                <TableRow key={shift.id} className="cursor-pointer" onClick={() => navigate(`/organization/shifts/${shift.id}`)}>
                  <TableCell>
                    <div className="font-medium">{shift.shiftName}</div>
                  </TableCell>
                  <TableCell>{shift.startTime} – {shift.endTime}</TableCell>
                  <TableCell>{shift.graceTime} mins</TableCell>
                  <TableCell>{shift.breakDuration} mins</TableCell>
                  <TableCell>{shift.weeklyOff}</TableCell>
                  <TableCell>
                    <Badge variant={shift.status === "Active" ? "default" : "secondary"}>{shift.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                      <Button variant="outline" size="icon" onClick={() => openEditDrawer(shift)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => { setDeletingShift(shift); setDeleteOpen(true) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No shifts match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {filteredShifts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredShifts.length)} of {filteredShifts.length} shifts
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

      <ShiftDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        initialValues={editingShift ? {
          shiftName: editingShift.shiftName,
          startTime: editingShift.startTime,
          endTime: editingShift.endTime,
          graceTime: editingShift.graceTime,
          breakDuration: editingShift.breakDuration,
          weeklyOff: editingShift.weeklyOff,
          status: editingShift.status,
        } : createEmptyShiftFormValues()}
        onSubmit={handleSubmit}
      />

      {deletingShift && (
        <ShiftDeleteDialog
          shift={deletingShift}
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open)
            if (!open) setDeletingShift(undefined)
          }}
          onConfirm={confirmDelete}
        />
      )}
    </OrgLayout>
  )
}
