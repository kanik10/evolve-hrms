import * as React from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { Edit3, Plus, Trash2, type LucideIcon } from "lucide-react"
import { useLocation } from "wouter"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { EmptyState } from "./EmptyState"
import { Filters } from "./Filters"
import { OrgDeleteDialog } from "./OrgDeleteDialog"
import { OrgLayout } from "./OrgLayout"
import { OrgPageHeader } from "./OrgPageHeader"
import { StandardMasterTable } from "./StandardMasterTable"

export type OrganizationStatusRecord = { id: string; status: string }
export type OrganizationDrawerMode = "create" | "edit"

export interface OrganizationDrawerProps<TFormValues> {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: OrganizationDrawerMode
  initialValues: TFormValues
  onSubmit: (values: TFormValues) => void
}

export interface OrganizationMasterPageProps<TRecord extends OrganizationStatusRecord, TFormValues> {
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
  getRecordName?: (record: TRecord) => string
  requiredFields?: Array<{ key: keyof TFormValues; label: string }>
  validate?: (values: TFormValues, context: {
    mode: OrganizationDrawerMode
    records: TRecord[]
    editingRecord?: TRecord
  }) => string[]
  searchRecord: (record: TRecord, query: string) => boolean
  filterRecord?: (record: TRecord) => boolean
  detailPath: (record: TRecord) => string
  columns: (handlers: {
    onEdit: (record: TRecord) => void
    onDelete: (record: TRecord) => void
  }) => ColumnDef<TRecord>[]
  renderDrawer: (props: OrganizationDrawerProps<TFormValues>) => React.ReactNode
  extraFilters?: React.ReactNode
  searchPlaceholder?: string
}

export function StatusFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        <SelectItem value="Active">Active</SelectItem>
        <SelectItem value="Inactive">Inactive</SelectItem>
        <SelectItem value="Archived">Archived</SelectItem>
      </SelectContent>
    </Select>
  )
}

export function MasterActionButtons<TRecord>({
  record,
  label,
  onEdit,
  onDelete,
}: {
  record: TRecord
  label: string
  onEdit: (record: TRecord) => void
  onDelete: (record: TRecord) => void
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="icon" onClick={() => onEdit(record)} aria-label={`Edit ${label}`}>
        <Edit3 className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={() => onDelete(record)} aria-label={`Delete ${label}`}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function getEntityTitle(title: string) {
  if (title.endsWith("ies")) return `${title.slice(0, -3)}y`
  if (title.endsWith("s")) return title.slice(0, -1)
  return title
}

export function OrganizationMasterPage<TRecord extends OrganizationStatusRecord, TFormValues>({
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
  getRecordName,
  requiredFields = [],
  validate,
  searchRecord,
  filterRecord,
  detailPath,
  columns,
  renderDrawer,
  extraFilters,
  searchPlaceholder,
}: OrganizationMasterPageProps<TRecord, TFormValues>) {
  const { toast } = useToast()
  const [, navigate] = useLocation()
  const [records, setRecords] = React.useState<TRecord[]>(() => getRecords())
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerMode, setDrawerMode] = React.useState<OrganizationDrawerMode>("create")
  const [editingRecord, setEditingRecord] = React.useState<TRecord | undefined>()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletingRecord, setDeletingRecord] = React.useState<TRecord | undefined>()
  const [loading, setLoading] = React.useState(true)
  const entityTitle = getEntityTitle(title)

  React.useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 450)
    return () => window.clearTimeout(timer)
  }, [])

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
    const missingFields = requiredFields
      .filter((field) => {
        const value = values[field.key]
        return value === undefined || value === null || (typeof value === "string" && value.trim().length === 0)
      })
      .map((field) => `${field.label} is required.`)
    const validationErrors = validate?.(values, { mode: drawerMode, records, editingRecord }) ?? []
    const errors = [...missingFields, ...validationErrors]

    if (errors.length > 0) {
      toast({
        title: `Check ${entityLabel} details`,
        description: errors[0],
        variant: "destructive",
      })
      return
    }

    if (drawerMode === "create") {
      updateRecords((current) => [createRecord(values), ...current])
      toast({ title: `${entityTitle} created`, description: `The ${entityLabel} record has been added.` })
    } else if (editingRecord) {
      updateRecords((current) =>
        current.map((item) => (item.id === editingRecord.id ? ({ ...item, ...values } as TRecord) : item))
      )
      toast({ title: `${entityTitle} updated`, description: `The ${entityLabel} record has been saved.` })
    }

    setRecords(getRecords())
    setDrawerOpen(false)
  }

  const handleConfirmDelete = (action: "delete" | "archive") => {
    if (!deletingRecord) return

    if (action === "delete") {
      updateRecords((current) => current.filter((item) => item.id !== deletingRecord.id))
      toast({ title: `${entityTitle} deleted`, description: "The record has been permanently removed." })
    } else {
      updateRecords((current) =>
        current.map((item) => (item.id === deletingRecord.id ? ({ ...item, status: "Inactive" } as TRecord) : item))
      )
      toast({ title: `${entityTitle} archived`, description: "The record has been archived." })
    }

    setRecords(getRecords())
    setDeleteOpen(false)
    setDeletingRecord(undefined)
  }

  const tableColumns = React.useMemo(
    () =>
      columns({
        onEdit: handleEdit,
        onDelete: (record) => {
          setDeletingRecord(record)
          setDeleteOpen(true)
        },
      }),
    [columns]
  )

  return (
    <OrgLayout section={section}>
      <OrgPageHeader
        icon={icon}
        title={title}
        description={description}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {addLabel}
          </Button>
        }
      />

      <Filters
        search={search}
        onSearchChange={setSearch}
        onClear={() => setSearch("")}
        placeholder={searchPlaceholder}
      >
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
        emptyState={
          <EmptyState
            icon={icon}
            title={`No ${title.toLowerCase()} found`}
            description="Try adjusting search or filters, or create a new record."
            action={{ label: addLabel, onClick: handleCreate, icon: Plus }}
          />
        }
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
          entityName={getRecordName?.(deletingRecord) ?? deletingRecord.id}
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open)
            if (!open) setDeletingRecord(undefined)
          }}
          onConfirm={handleConfirmDelete}
          isArchived={deletingRecord.status === "Inactive" || deletingRecord.status === "Archived"}
        />
      )}
    </OrgLayout>
  )
}
