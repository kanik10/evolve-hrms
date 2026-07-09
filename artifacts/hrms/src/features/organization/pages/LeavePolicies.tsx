import * as React from "react"
import { ChevronLeft, ChevronRight, Edit3, Palmtree, Plus, Search, Trash2 } from "lucide-react"
import { useLocation } from "wouter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { LeavePolicyDeleteDialog } from "../leave-policies/components/LeavePolicyDeleteDialog"
import { LeavePolicyDrawer } from "../leave-policies/components/LeavePolicyDrawer"
import { type LeavePolicyFormValues, createEmptyLeavePolicyFormValues, getLeavePolicies, type LeavePolicyRecord, updateLeavePolicies } from "../leave-policies/data/leavePolicies"
import { getOrganizationDepartmentOptions } from "../data/organizationData"

export default function LeavePolicies() {
  const [, navigate] = useLocation()
  const [leavePolicies, setLeavePolicies] = React.useState<LeavePolicyRecord[]>(() => getLeavePolicies())
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerMode, setDrawerMode] = React.useState<"create" | "edit">("create")
  const [editingLeavePolicy, setEditingLeavePolicy] = React.useState<LeavePolicyRecord | undefined>()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletingLeavePolicy, setDeletingLeavePolicy] = React.useState<LeavePolicyRecord | undefined>()
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 5

  const filteredLeavePolicies = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return leavePolicies.filter((policy) => {
      const matchesSearch =
        !query ||
        policy.policyName.toLowerCase().includes(query) ||
        policy.eligibility.toLowerCase().includes(query)
      const matchesStatus = statusFilter === "all" || policy.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [leavePolicies, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredLeavePolicies.length / pageSize))
  const visibleLeavePolicies = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLeavePolicies.slice(start, start + pageSize)
  }, [filteredLeavePolicies, currentPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter])

  const openCreateDrawer = () => {
    setEditingLeavePolicy(undefined)
    setDrawerMode("create")
    setDrawerOpen(true)
  }

  const openEditDrawer = (leavePolicy: LeavePolicyRecord) => {
    setEditingLeavePolicy(leavePolicy)
    setDrawerMode("edit")
    setDrawerOpen(true)
  }

  const handleSubmit = (values: LeavePolicyFormValues) => {
    if (drawerMode === "create") {
      const newLeavePolicy: LeavePolicyRecord = {
        id: `LP${Date.now().toString().slice(-3)}`,
        ...values,
      }
      updateLeavePolicies((current) => [newLeavePolicy, ...current])
      setLeavePolicies(getLeavePolicies())
    } else if (editingLeavePolicy) {
      updateLeavePolicies((current) => current.map((item) => (item.id === editingLeavePolicy.id ? { ...item, ...values } : item)))
      setLeavePolicies(getLeavePolicies())
    }
    setDrawerOpen(false)
  }

  const confirmDelete = () => {
    if (!deletingLeavePolicy) return
    updateLeavePolicies((current) => current.filter((item) => item.id !== deletingLeavePolicy.id))
    setLeavePolicies(getLeavePolicies())
    setDeleteOpen(false)
    setDeletingLeavePolicy(undefined)
  }

  return (
    <OrgLayout section="Leave Policies">
      <OrgPageHeader
        icon={Palmtree}
        title="Leave Policies"
        description="Define leave entitlements, carry-forward rules, encashment options, and eligibility criteria."
        action={
          <Button onClick={openCreateDrawer}>
            <Plus className="mr-2 h-4 w-4" />
            Add Leave Policy
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by policy name or eligibility" className="pl-9" />
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
              <TableHead>Policy Name</TableHead>
              <TableHead>Annual</TableHead>
              <TableHead>Casual</TableHead>
              <TableHead>Sick</TableHead>
              <TableHead>Eligibility</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleLeavePolicies.length > 0 ? (
              visibleLeavePolicies.map((leavePolicy) => (
                <TableRow key={leavePolicy.id} className="cursor-pointer" onClick={() => navigate(`/organization/leave-policies/${leavePolicy.id}`)}>
                  <TableCell>
                    <div className="font-medium">{leavePolicy.policyName}</div>
                  </TableCell>
                  <TableCell>{leavePolicy.annualLeave} days</TableCell>
                  <TableCell>{leavePolicy.casualLeave} days</TableCell>
                  <TableCell>{leavePolicy.sickLeave} days</TableCell>
                  <TableCell className="max-w-[220px] text-sm text-muted-foreground">{leavePolicy.eligibility}</TableCell>
                  <TableCell>
                    <Badge variant={leavePolicy.status === "Active" ? "default" : "secondary"}>{leavePolicy.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                      <Button variant="outline" size="icon" onClick={() => openEditDrawer(leavePolicy)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => { setDeletingLeavePolicy(leavePolicy); setDeleteOpen(true) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No leave policies match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {filteredLeavePolicies.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredLeavePolicies.length)} of {filteredLeavePolicies.length} policies
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

      <LeavePolicyDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        initialValues={editingLeavePolicy ? {
          policyName: editingLeavePolicy.policyName,
          annualLeave: editingLeavePolicy.annualLeave,
          casualLeave: editingLeavePolicy.casualLeave,
          sickLeave: editingLeavePolicy.sickLeave,
          carryForward: editingLeavePolicy.carryForward,
          negativeBalance: editingLeavePolicy.negativeBalance,
          encashment: editingLeavePolicy.encashment,
          eligibility: editingLeavePolicy.eligibility,
          status: editingLeavePolicy.status,
        } : createEmptyLeavePolicyFormValues()}
        onSubmit={handleSubmit}
      />

      {deletingLeavePolicy && (
        <LeavePolicyDeleteDialog
          leavePolicy={deletingLeavePolicy}
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open)
            if (!open) setDeletingLeavePolicy(undefined)
          }}
          onConfirm={confirmDelete}
        />
      )}
    </OrgLayout>
  )
}
