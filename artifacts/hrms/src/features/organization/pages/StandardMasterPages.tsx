import * as React from "react"
import { type LucideIcon, Banknote, Building2, CalendarDays, Clock3, DollarSign, Edit3, MapPin, Palmtree, Plus, Trash2, UserCheck, BarChart2 } from "lucide-react"
import { useLocation } from "wouter"
import { type ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { EmptyState, Filters, OrgDeleteDialog, OrgLayout, OrgPageHeader, StandardMasterTable, StatusBadge } from "../index"
import { BusinessUnitDrawer } from "../business-units/components/BusinessUnitDrawer"
import { type BusinessUnitFormValues, createEmptyBusinessUnitFormValues, getBusinessUnits, updateBusinessUnits, type BusinessUnitRecord } from "../business-units/data/businessUnits"
import { LocationDrawer } from "../locations/components/LocationDrawer"
import { type LocationFormValues, createEmptyLocationFormValues, getLocations, updateLocations, type LocationRecord, businessUnits as locationBusinessUnits } from "../locations/data/locations"
import { CostCenterDrawer } from "../cost-centers/components/CostCenterDrawer"
import { type CostCenterFormValues, createEmptyCostCenterFormValues, costCenterDepartments, getCostCenters, updateCostCenters, type CostCenterRecord } from "../cost-centers/data/costCenters"
import { GradeDrawer } from "../grades/components/GradeDrawer"
import { type GradeFormValues, createEmptyGradeFormValues, getGrades, updateGrades, type GradeRecord } from "../grades/data/grades"
import { EmploymentTypeDrawer } from "../employment-types/components/EmploymentTypeDrawer"
import { type EmploymentTypeFormValues, createEmptyEmploymentTypeFormValues, getEmploymentTypes, updateEmploymentTypes, type EmploymentTypeRecord } from "../employment-types/data/employmentTypes"
import { ShiftDrawer } from "../shifts/components/ShiftDrawer"
import { type ShiftFormValues, createEmptyShiftFormValues, getShifts, updateShifts, type ShiftRecord } from "../shifts/data/shifts"
import { LeavePolicyDrawer } from "../leave-policies/components/LeavePolicyDrawer"
import { type LeavePolicyFormValues, createEmptyLeavePolicyFormValues, getLeavePolicies, updateLeavePolicies, type LeavePolicyRecord } from "../leave-policies/data/leavePolicies"
import { SalaryStructureDrawer } from "../salary-structures/components/SalaryStructureDrawer"
import { calculateNetSalary, type SalaryStructureFormValues, createEmptySalaryStructureFormValues, getSalaryStructures, updateSalaryStructures, type SalaryStructureRecord } from "../salary-structures/data/salaryStructures"
import { HolidayDrawer } from "../holiday-calendar/components/HolidayDrawer"
import { type HolidayFormValues, createEmptyHolidayFormValues, getHolidays, holidayLocations, holidayTypes, updateHolidays, type HolidayRecord } from "../holiday-calendar/data/holidays"
import { getOrganizationCostCenterOptions, getOrganizationDepartmentOptions, getOrganizationLocationOptions } from "../data/organizationData"

type StatusRecord = { id: string; status: string }
type DrawerMode = "create" | "edit"

function StatusFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        <SelectItem value="Active">Active</SelectItem>
        <SelectItem value="Inactive">Inactive</SelectItem>
        <SelectItem value="Archived">Archived</SelectItem>
      </SelectContent>
    </Select>
  )
}

function ActionButtons<TRecord>({
  record,
  onEdit,
  onDelete,
}: {
  record: TRecord
  onEdit: (record: TRecord) => void
  onDelete: (record: TRecord) => void
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="icon" onClick={() => onEdit(record)}>
        <Edit3 className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={() => onDelete(record)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function StandardStatusMaster<TRecord extends StatusRecord, TFormValues>({
  section,
  title,
  description,
  icon,
  addLabel,
  entityLabel,
  getRecords,
  updateRecords,
  createEmptyValues,
  toInitialValues,
  createRecord,
  searchRecord,
  filterRecord,
  detailPath,
  columns,
  renderDrawer,
  extraFilters,
}: {
  section: string
  title: string
  description: string
  icon: LucideIcon
  addLabel: string
  entityLabel: string
  getRecords: () => TRecord[]
  updateRecords: (next: TRecord[] | ((current: TRecord[]) => TRecord[])) => TRecord[]
  createEmptyValues: () => TFormValues
  toInitialValues: (record: TRecord) => TFormValues
  createRecord: (values: TFormValues) => TRecord
  searchRecord: (record: TRecord, query: string) => boolean
  filterRecord?: (record: TRecord) => boolean
  detailPath: (record: TRecord) => string
  columns: (handlers: { onEdit: (record: TRecord) => void; onDelete: (record: TRecord) => void }) => ColumnDef<TRecord>[]
  renderDrawer: (props: { open: boolean; onOpenChange: (open: boolean) => void; mode: DrawerMode; initialValues: TFormValues; onSubmit: (values: TFormValues) => void }) => React.ReactNode
  extraFilters?: React.ReactNode
}) {
  const { toast } = useToast()
  const [, navigate] = useLocation()
  const [records, setRecords] = React.useState<TRecord[]>(() => getRecords())
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerMode, setDrawerMode] = React.useState<DrawerMode>("create")
  const [editingRecord, setEditingRecord] = React.useState<TRecord | undefined>()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletingRecord, setDeletingRecord] = React.useState<TRecord | undefined>()
  const [loading] = React.useState(false)

  const filteredRecords = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return records.filter((record) => {
      const matchesSearch = !query || searchRecord(record, query)
      const matchesStatus = statusFilter === "all" || record.status === statusFilter
      const matchesExtraFilters = filterRecord ? filterRecord(record) : true
      return matchesSearch && matchesStatus && matchesExtraFilters
    })
  }, [filterRecord, records, search, searchRecord, statusFilter])

  const handleCreate = () => {
    setEditingRecord(undefined)
    setDrawerMode("create")
    setDrawerOpen(true)
  }

  const handleEdit = (record: TRecord) => {
    setEditingRecord(record)
    setDrawerMode("edit")
    setDrawerOpen(true)
  }

  const handleSubmit = (values: TFormValues) => {
    if (drawerMode === "create") {
      const nextRecord = createRecord(values)
      updateRecords((current) => [nextRecord, ...current])
      toast({ title: `${title.slice(0, -1)} created`, description: `"${entityLabel}" record has been added.` })
    } else if (editingRecord) {
      updateRecords((current) => current.map((item) => (item.id === editingRecord.id ? { ...item, ...values } as TRecord : item)))
      toast({ title: `${title.slice(0, -1)} updated`, description: `"${entityLabel}" record has been saved.` })
    }
    setRecords(getRecords())
    setDrawerOpen(false)
  }

  const handleConfirmDelete = (action: "delete" | "archive") => {
    if (!deletingRecord) return
    if (action === "delete") {
      updateRecords((current) => current.filter((item) => item.id !== deletingRecord.id))
      toast({ title: `${title.slice(0, -1)} deleted`, description: "The record has been permanently removed." })
    } else {
      updateRecords((current) => current.map((item) => (item.id === deletingRecord.id ? { ...item, status: "Inactive" } as TRecord : item)))
      toast({ title: `${title.slice(0, -1)} archived`, description: "The record has been archived." })
    }
    setRecords(getRecords())
    setDeleteOpen(false)
    setDeletingRecord(undefined)
  }

  const tableColumns = React.useMemo(
    () => columns({ onEdit: handleEdit, onDelete: (record) => { setDeletingRecord(record); setDeleteOpen(true) } }),
    [columns]
  )

  return (
    <OrgLayout section={section}>
      <OrgPageHeader
        icon={icon}
        title={title}
        description={description}
        action={<Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" />{addLabel}</Button>}
      />

      <Filters search={search} onSearchChange={setSearch} onClear={() => setSearch("")}>
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        {extraFilters}
      </Filters>

      <StandardMasterTable
        data={filteredRecords}
        columns={tableColumns}
        entityLabel={entityLabel}
        getRowId={(row) => row.id}
        loading={loading}
        onRowClick={(row) => navigate(detailPath(row))}
        emptyState={<EmptyState icon={icon} title={`No ${title.toLowerCase()} found`} description="Try adjusting search or filters, or create a new record." action={{ label: addLabel, onClick: handleCreate, icon: Plus }} />}
      />

      {renderDrawer({
        open: drawerOpen,
        onOpenChange: setDrawerOpen,
        mode: drawerMode,
        initialValues: editingRecord ? toInitialValues(editingRecord) : createEmptyValues(),
        onSubmit: handleSubmit,
      })}

      {deletingRecord && (
        <OrgDeleteDialog
          entityType={entityLabel}
          entityName={deletingRecord.id}
          open={deleteOpen}
          onOpenChange={(open) => { setDeleteOpen(open); if (!open) setDeletingRecord(undefined) }}
          onConfirm={handleConfirmDelete}
          isArchived={deletingRecord.status === "Inactive" || deletingRecord.status === "Archived"}
        />
      )}
    </OrgLayout>
  )
}

export function BusinessUnits() {
  return (
    <StandardStatusMaster<BusinessUnitRecord, BusinessUnitFormValues>
      section="Business Units"
      title="Business Units"
      description="Manage the business segments that group departments, locations, and cost centers."
      icon={Building2}
      addLabel="Add Business Unit"
      entityLabel="business unit"
      getRecords={getBusinessUnits}
      updateRecords={updateBusinessUnits}
      createEmptyValues={createEmptyBusinessUnitFormValues}
      toInitialValues={(record) => ({ name: record.name, code: record.code, head: record.head, description: record.description, status: record.status })}
      createRecord={(values) => ({ id: `BU${Date.now().toString().slice(-3)}`, departments: getOrganizationDepartmentOptions().slice(0, 2), locations: getOrganizationLocationOptions().slice(0, 2), costCenters: getOrganizationCostCenterOptions().slice(0, 2), ...values })}
      searchRecord={(record, query) => [record.name, record.code, record.head, record.description].some((value) => value.toLowerCase().includes(query))}
      detailPath={(record) => `/organization/business-units/${record.id}`}
      columns={({ onEdit, onDelete }) => [
        { accessorKey: "name", header: "Business Unit", cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="text-sm text-muted-foreground">{row.original.description}</p></div> },
        { accessorKey: "code", header: "Code" },
        { accessorKey: "head", header: "Head" },
        { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
        { id: "actions", header: "", enableSorting: false, cell: ({ row }) => <ActionButtons record={row.original} onEdit={onEdit} onDelete={onDelete} /> },
      ]}
      renderDrawer={(props) => <BusinessUnitDrawer {...props} />}
    />
  )
}

export function Locations() {
  const [buFilter, setBuFilter] = React.useState("all")
  return (
    <StandardStatusMaster<LocationRecord, LocationFormValues>
      section="Locations"
      title="Locations"
      description="Manage office locations, branches, and regional operations with search, filters, and detail views."
      icon={MapPin}
      addLabel="Add Location"
      entityLabel="location"
      getRecords={getLocations}
      updateRecords={updateLocations}
      createEmptyValues={createEmptyLocationFormValues}
      toInitialValues={(record) => ({ name: record.name, code: record.code, address: record.address, city: record.city, state: record.state, country: record.country, timezone: record.timezone, workingHours: record.workingHours, businessUnit: record.businessUnit, status: record.status })}
      createRecord={(values) => ({ id: `L${Date.now().toString().slice(-3)}`, ...values })}
      searchRecord={(record, query) => [record.name, record.code, record.city, record.businessUnit, record.address].some((value) => value.toLowerCase().includes(query))}
      filterRecord={(record) => buFilter === "all" || record.businessUnit === buFilter}
      detailPath={(record) => `/organization/locations/${record.id}`}
      extraFilters={<Select value={buFilter} onValueChange={setBuFilter}><SelectTrigger className="w-[210px]"><SelectValue placeholder="Business unit" /></SelectTrigger><SelectContent><SelectItem value="all">All business units</SelectItem>{locationBusinessUnits.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent></Select>}
      columns={({ onEdit, onDelete }) => [
        { accessorKey: "name", header: "Location", cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="text-sm text-muted-foreground">{row.original.address}</p></div> },
        { accessorKey: "code", header: "Code" },
        { accessorKey: "city", header: "City" },
        { accessorKey: "businessUnit", header: "Business Unit" },
        { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
        { id: "actions", header: "", enableSorting: false, cell: ({ row }) => <ActionButtons record={row.original} onEdit={onEdit} onDelete={onDelete} /> },
      ]}
      renderDrawer={(props) => <LocationDrawer {...props} />}
    />
  )
}

export function CostCenters() {
  const [departmentFilter, setDepartmentFilter] = React.useState("all")
  return (
    <StandardStatusMaster<CostCenterRecord, CostCenterFormValues>
      section="Cost Centers"
      title="Cost Centers"
      description="Track departmental spending with mock cost centers, budget placeholders, and ownership details."
      icon={DollarSign}
      addLabel="Add Cost Center"
      entityLabel="cost center"
      getRecords={getCostCenters}
      updateRecords={updateCostCenters}
      createEmptyValues={createEmptyCostCenterFormValues}
      toInitialValues={(record) => ({ name: record.name, code: record.code, department: record.department, businessUnit: record.businessUnit, status: record.status, budget: record.budget })}
      createRecord={(values) => ({ id: `CC${Date.now().toString().slice(-3)}`, ...values })}
      searchRecord={(record, query) => [record.name, record.code, record.department, record.businessUnit, record.budget].some((value) => value.toLowerCase().includes(query))}
      filterRecord={(record) => departmentFilter === "all" || record.department === departmentFilter}
      detailPath={(record) => `/organization/cost-centers/${record.id}`}
      extraFilters={<Select value={departmentFilter} onValueChange={setDepartmentFilter}><SelectTrigger className="w-[210px]"><SelectValue placeholder="Department" /></SelectTrigger><SelectContent><SelectItem value="all">All departments</SelectItem>{costCenterDepartments.map((department) => <SelectItem key={department} value={department}>{department}</SelectItem>)}</SelectContent></Select>}
      columns={({ onEdit, onDelete }) => [
        { accessorKey: "name", header: "Cost Center", cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="text-sm text-muted-foreground">Budget: {row.original.budget}</p></div> },
        { accessorKey: "code", header: "Code" },
        { accessorKey: "department", header: "Department" },
        { accessorKey: "businessUnit", header: "Business Unit" },
        { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
        { id: "actions", header: "", enableSorting: false, cell: ({ row }) => <ActionButtons record={row.original} onEdit={onEdit} onDelete={onDelete} /> },
      ]}
      renderDrawer={(props) => <CostCenterDrawer {...props} />}
    />
  )
}

export function Grades() {
  return (
    <StandardStatusMaster<GradeRecord, GradeFormValues>
      section="Grades"
      title="Grades"
      description="Create employee grade bands and career levels with salary bands and status tracking."
      icon={BarChart2}
      addLabel="Add Grade"
      entityLabel="grade"
      getRecords={getGrades}
      updateRecords={updateGrades}
      createEmptyValues={createEmptyGradeFormValues}
      toInitialValues={(record) => ({ grade: record.grade, level: record.level, description: record.description, salaryBand: record.salaryBand, status: record.status })}
      createRecord={(values) => ({ id: `G${Date.now().toString().slice(-3)}`, ...values })}
      searchRecord={(record, query) => [record.grade, record.level, record.description, record.salaryBand].some((value) => value.toLowerCase().includes(query))}
      detailPath={(record) => `/organization/grades/${record.id}`}
      columns={({ onEdit, onDelete }) => [
        { accessorKey: "grade", header: "Grade", cell: ({ row }) => <span className="font-medium">{row.original.grade}</span> },
        { accessorKey: "level", header: "Level" },
        { accessorKey: "description", header: "Description", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.description}</span> },
        { accessorKey: "salaryBand", header: "Salary Band" },
        { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
        { id: "actions", header: "", enableSorting: false, cell: ({ row }) => <ActionButtons record={row.original} onEdit={onEdit} onDelete={onDelete} /> },
      ]}
      renderDrawer={(props) => <GradeDrawer {...props} />}
    />
  )
}

export function EmploymentTypes() {
  return (
    <StandardStatusMaster<EmploymentTypeRecord, EmploymentTypeFormValues>
      section="Employment Types"
      title="Employment Types"
      description="Define workforce classifications with benefits rules, notice periods, and status tracking."
      icon={UserCheck}
      addLabel="Add Employment Type"
      entityLabel="employment type"
      getRecords={getEmploymentTypes}
      updateRecords={updateEmploymentTypes}
      createEmptyValues={createEmptyEmploymentTypeFormValues}
      toInitialValues={(record) => ({ typeName: record.typeName, description: record.description, benefitsEligible: record.benefitsEligible, noticePeriod: record.noticePeriod, status: record.status })}
      createRecord={(values) => ({ id: `ET${Date.now().toString().slice(-3)}`, ...values })}
      searchRecord={(record, query) => [record.typeName, record.description, record.noticePeriod].some((value) => value.toLowerCase().includes(query))}
      detailPath={(record) => `/organization/employment-types/${record.id}`}
      columns={({ onEdit, onDelete }) => [
        { accessorKey: "typeName", header: "Type Name", cell: ({ row }) => <span className="font-medium">{row.original.typeName}</span> },
        { accessorKey: "description", header: "Description", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.description}</span> },
        { accessorKey: "benefitsEligible", header: "Benefits Eligible", cell: ({ row }) => row.original.benefitsEligible ? "Yes" : "No" },
        { accessorKey: "noticePeriod", header: "Notice Period" },
        { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
        { id: "actions", header: "", enableSorting: false, cell: ({ row }) => <ActionButtons record={row.original} onEdit={onEdit} onDelete={onDelete} /> },
      ]}
      renderDrawer={(props) => <EmploymentTypeDrawer {...props} />}
    />
  )
}

export function ShiftManagement() {
  return (
    <StandardStatusMaster<ShiftRecord, ShiftFormValues>
      section="Shift Management"
      title="Shift Management"
      description="Configure shift definitions with timing rules, grace periods, breaks, and weekly off patterns."
      icon={Clock3}
      addLabel="Add Shift"
      entityLabel="shift"
      getRecords={getShifts}
      updateRecords={updateShifts}
      createEmptyValues={createEmptyShiftFormValues}
      toInitialValues={(record) => ({ shiftName: record.shiftName, startTime: record.startTime, endTime: record.endTime, graceTime: record.graceTime, breakDuration: record.breakDuration, weeklyOff: record.weeklyOff, status: record.status })}
      createRecord={(values) => ({ id: `SFT${Date.now().toString().slice(-3)}`, ...values })}
      searchRecord={(record, query) => [record.shiftName, record.startTime, record.endTime, record.weeklyOff].some((value) => value.toLowerCase().includes(query))}
      detailPath={(record) => `/organization/shifts/${record.id}`}
      columns={({ onEdit, onDelete }) => [
        { accessorKey: "shiftName", header: "Shift Name", cell: ({ row }) => <span className="font-medium">{row.original.shiftName}</span> },
        { id: "timing", header: "Timing", accessorFn: (row) => `${row.startTime} - ${row.endTime}` },
        { accessorKey: "graceTime", header: "Grace Time", cell: ({ row }) => `${row.original.graceTime} mins` },
        { accessorKey: "breakDuration", header: "Break Duration", cell: ({ row }) => `${row.original.breakDuration} mins` },
        { accessorKey: "weeklyOff", header: "Weekly Off" },
        { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
        { id: "actions", header: "", enableSorting: false, cell: ({ row }) => <ActionButtons record={row.original} onEdit={onEdit} onDelete={onDelete} /> },
      ]}
      renderDrawer={(props) => <ShiftDrawer {...props} />}
    />
  )
}

export function LeavePolicies() {
  return (
    <StandardStatusMaster<LeavePolicyRecord, LeavePolicyFormValues>
      section="Leave Policies"
      title="Leave Policies"
      description="Define leave entitlements, carry-forward rules, encashment options, and eligibility criteria."
      icon={Palmtree}
      addLabel="Add Leave Policy"
      entityLabel="leave policy"
      getRecords={getLeavePolicies}
      updateRecords={updateLeavePolicies}
      createEmptyValues={createEmptyLeavePolicyFormValues}
      toInitialValues={(record) => ({ policyName: record.policyName, annualLeave: record.annualLeave, casualLeave: record.casualLeave, sickLeave: record.sickLeave, carryForward: record.carryForward, negativeBalance: record.negativeBalance, encashment: record.encashment, eligibility: record.eligibility, status: record.status })}
      createRecord={(values) => ({ id: `LP${Date.now().toString().slice(-3)}`, ...values })}
      searchRecord={(record, query) => [record.policyName, record.eligibility].some((value) => value.toLowerCase().includes(query))}
      detailPath={(record) => `/organization/leave-policies/${record.id}`}
      columns={({ onEdit, onDelete }) => [
        { accessorKey: "policyName", header: "Policy Name", cell: ({ row }) => <span className="font-medium">{row.original.policyName}</span> },
        { accessorKey: "annualLeave", header: "Annual", cell: ({ row }) => `${row.original.annualLeave} days` },
        { accessorKey: "casualLeave", header: "Casual", cell: ({ row }) => `${row.original.casualLeave} days` },
        { accessorKey: "sickLeave", header: "Sick", cell: ({ row }) => `${row.original.sickLeave} days` },
        { accessorKey: "eligibility", header: "Eligibility", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.eligibility}</span> },
        { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
        { id: "actions", header: "", enableSorting: false, cell: ({ row }) => <ActionButtons record={row.original} onEdit={onEdit} onDelete={onDelete} /> },
      ]}
      renderDrawer={(props) => <LeavePolicyDrawer {...props} />}
    />
  )
}

export function SalaryStructures() {
  return (
    <StandardStatusMaster<SalaryStructureRecord, SalaryStructureFormValues>
      section="Salary Structures"
      title="Salary Structures"
      description="Build compensation frameworks with earnings, deductions, statutory components, and live net salary calculations."
      icon={Banknote}
      addLabel="Add Structure"
      entityLabel="salary structure"
      getRecords={getSalaryStructures}
      updateRecords={updateSalaryStructures}
      createEmptyValues={createEmptySalaryStructureFormValues}
      toInitialValues={(record) => ({ structureName: record.structureName, grade: record.grade, basic: record.basic, hra: record.hra, specialAllowance: record.specialAllowance, bonus: record.bonus, pf: record.pf, esic: record.esic, professionalTax: record.professionalTax, tds: record.tds, status: record.status })}
      createRecord={(values) => ({ id: `SAL${Date.now().toString().slice(-3)}`, ...values })}
      searchRecord={(record, query) => [record.structureName, record.grade].some((value) => value.toLowerCase().includes(query))}
      detailPath={(record) => `/organization/salary-structures/${record.id}`}
      columns={({ onEdit, onDelete }) => [
        { accessorKey: "structureName", header: "Structure", cell: ({ row }) => <span className="font-medium">{row.original.structureName}</span> },
        { accessorKey: "grade", header: "Grade" },
        { id: "netSalary", header: "Net Salary", accessorFn: (row) => calculateNetSalary(row), cell: ({ row }) => `Rs ${calculateNetSalary(row.original).toLocaleString()}` },
        { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
        { id: "actions", header: "", enableSorting: false, cell: ({ row }) => <ActionButtons record={row.original} onEdit={onEdit} onDelete={onDelete} /> },
      ]}
      renderDrawer={(props) => <SalaryStructureDrawer {...props} />}
    />
  )
}

type HolidayMasterRecord = HolidayRecord & { status: "Active" | "Inactive" }

export function HolidayCalendar() {
  const { toast } = useToast()
  const [, navigate] = useLocation()
  const [holidays, setHolidays] = React.useState<HolidayMasterRecord[]>(() => getHolidays().map((holiday) => ({ ...holiday, status: "Active" })))
  const [search, setSearch] = React.useState("")
  const [locationFilter, setLocationFilter] = React.useState("all")
  const [typeFilter, setTypeFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerMode, setDrawerMode] = React.useState<DrawerMode>("create")
  const [editingHoliday, setEditingHoliday] = React.useState<HolidayMasterRecord | undefined>()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletingHoliday, setDeletingHoliday] = React.useState<HolidayMasterRecord | undefined>()
  const [loading] = React.useState(false)

  const persistHolidays = (next: HolidayMasterRecord[]) => {
    setHolidays(next)
    updateHolidays(next.map(({ status, ...holiday }) => holiday))
  }

  const filteredHolidays = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return holidays.filter((holiday) => {
      const matchesSearch =
        !query ||
        holiday.name.toLowerCase().includes(query) ||
        holiday.location.toLowerCase().includes(query) ||
        holiday.holidayType.toLowerCase().includes(query)
      const matchesLocation = locationFilter === "all" || holiday.location === locationFilter
      const matchesType = typeFilter === "all" || holiday.holidayType === typeFilter
      const matchesStatus = statusFilter === "all" || holiday.status === statusFilter
      return matchesSearch && matchesLocation && matchesType && matchesStatus
    })
  }, [holidays, locationFilter, search, statusFilter, typeFilter])

  const openCreateDrawer = () => {
    setEditingHoliday(undefined)
    setDrawerMode("create")
    setDrawerOpen(true)
  }

  const openEditDrawer = (holiday: HolidayMasterRecord) => {
    setEditingHoliday(holiday)
    setDrawerMode("edit")
    setDrawerOpen(true)
  }

  const handleSubmit = (values: HolidayFormValues) => {
    if (drawerMode === "create") {
      persistHolidays([{ id: `HL${Date.now().toString().slice(-3)}`, status: "Active", ...values }, ...holidays])
      toast({ title: "Holiday created", description: `"${values.name}" has been added.` })
    } else if (editingHoliday) {
      persistHolidays(holidays.map((holiday) => (holiday.id === editingHoliday.id ? { ...holiday, ...values } : holiday)))
      toast({ title: "Holiday updated", description: `"${values.name}" has been saved.` })
    }
    setDrawerOpen(false)
  }

  const handleConfirmDelete = (action: "delete" | "archive") => {
    if (!deletingHoliday) return
    if (action === "delete") {
      persistHolidays(holidays.filter((holiday) => holiday.id !== deletingHoliday.id))
      toast({ title: "Holiday deleted", description: `"${deletingHoliday.name}" has been permanently removed.` })
    } else {
      persistHolidays(holidays.map((holiday) => (holiday.id === deletingHoliday.id ? { ...holiday, status: "Inactive" } : holiday)))
      toast({ title: "Holiday archived", description: `"${deletingHoliday.name}" has been archived.` })
    }
    setDeleteOpen(false)
    setDeletingHoliday(undefined)
  }

  const columns = React.useMemo<ColumnDef<HolidayMasterRecord>[]>(
    () => [
      { accessorKey: "name", header: "Holiday Name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      { accessorKey: "date", header: "Date", cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
      { accessorKey: "location", header: "Location" },
      { accessorKey: "holidayType", header: "Type" },
      {
        id: "flags",
        header: "Flags",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1.5">
            {row.original.mandatory ? <span className="rounded-md border px-2 py-0.5 text-xs">Mandatory</span> : null}
            {row.original.optional ? <span className="rounded-md border px-2 py-0.5 text-xs">Optional</span> : null}
            {row.original.recurring ? <span className="rounded-md border px-2 py-0.5 text-xs">Recurring</span> : null}
          </div>
        ),
      },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { id: "actions", header: "", enableSorting: false, cell: ({ row }) => <ActionButtons record={row.original} onEdit={openEditDrawer} onDelete={(record) => { setDeletingHoliday(record); setDeleteOpen(true) }} /> },
    ],
    []
  )

  return (
    <OrgLayout section="Holiday Calendar">
      <OrgPageHeader
        icon={CalendarDays}
        title="Holiday Calendar"
        description="Manage national, regional, and company holidays by location and type."
        action={<Button onClick={openCreateDrawer}><Plus className="mr-2 h-4 w-4" />Add Holiday</Button>}
      />

      <Filters search={search} onSearchChange={setSearch} onClear={() => setSearch("")} placeholder="Search holidays">
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[210px]"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {holidayLocations.map((location) => <SelectItem key={location} value={location}>{location}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {holidayTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
          </SelectContent>
        </Select>
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </Filters>

      <StandardMasterTable
        data={filteredHolidays}
        columns={columns}
        entityLabel="holiday"
        getRowId={(row) => row.id}
        loading={loading}
        onRowClick={(row) => navigate(`/organization/holiday-calendar/${row.id}`)}
        emptyState={<EmptyState icon={CalendarDays} title="No holidays found" description="Try adjusting search or filters, or add a new holiday." action={{ label: "Add Holiday", onClick: openCreateDrawer, icon: Plus }} />}
      />

      <HolidayDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        initialValues={editingHoliday ? {
          name: editingHoliday.name,
          date: editingHoliday.date,
          location: editingHoliday.location,
          holidayType: editingHoliday.holidayType,
          mandatory: editingHoliday.mandatory,
          optional: editingHoliday.optional,
          recurring: editingHoliday.recurring,
        } : createEmptyHolidayFormValues()}
        onSubmit={handleSubmit}
      />

      {deletingHoliday && (
        <OrgDeleteDialog
          entityType="Holiday"
          entityName={deletingHoliday.name}
          open={deleteOpen}
          onOpenChange={(open) => { setDeleteOpen(open); if (!open) setDeletingHoliday(undefined) }}
          onConfirm={handleConfirmDelete}
          isArchived={deletingHoliday.status === "Inactive"}
        />
      )}
    </OrgLayout>
  )
}
