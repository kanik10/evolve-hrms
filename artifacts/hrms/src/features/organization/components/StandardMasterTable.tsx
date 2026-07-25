import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface StandardMasterTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData>[]
  entityLabel: string
  emptyState: React.ReactNode
  getRowId: (row: TData) => string
  onRowClick?: (row: TData) => void
  loading?: boolean
  showSelection?: boolean
  wrapSortableHeaders?: boolean
}

export function StandardMasterTable<TData>({
  data,
  columns,
  entityLabel,
  emptyState,
  getRowId,
  onRowClick,
  loading = false,
  showSelection = true,
  wrapSortableHeaders = true,
}: StandardMasterTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  React.useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }))
    setRowSelection({})
  }, [data])

  const tableColumns = React.useMemo<ColumnDef<TData>[]>(
    () =>
      showSelection
        ? [
            {
              id: "select",
              size: 44,
              enableSorting: false,
              header: ({ table }) => (
                <Checkbox
                  checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                  }
                  onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
                  aria-label="Select all rows"
                />
              ),
              cell: ({ row }) => (
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
                  aria-label="Select row"
                  onClick={(event) => event.stopPropagation()}
                />
              ),
            },
            ...columns,
          ]
        : columns,
    [columns, showSelection]
  )

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, rowSelection, pagination },
    getRowId,
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const selectedCount = Object.keys(rowSelection).length
  const pageCount = Math.max(table.getPageCount(), 1)
  const firstResult = pagination.pageIndex * pagination.pageSize + 1
  const lastResult = Math.min((pagination.pageIndex + 1) * pagination.pageSize, data.length)
  const handleRowNavigate = (row: TData) => {
    onRowClick?.(row)
  }

  return (
    <div className="space-y-4">
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
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.column.getSize() !== 150 ? header.column.getSize() : undefined }}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() && wrapSortableHeaders ? (
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-left font-medium"
                        onClick={header.column.getToggleSortingHandler()}
                        aria-label={`Sort by ${String(header.column.columnDef.header)}`}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {tableColumns.map((column, columnIndex) => (
                    <TableCell key={column.id ?? columnIndex}>
                      <div className="h-4 w-full max-w-[180px] animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                  onKeyDown={(event) => {
                    if (!onRowClick || (event.target as Element).closest('button, input, a, [role="menuitem"], [role="checkbox"]')) return
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      handleRowNavigate(row.original)
                    }
                  }}
                  onClick={(event) => {
                    if ((event.target as Element).closest('button, input, a, [role="menuitem"], [role="checkbox"]')) return
                    handleRowNavigate(row.original)
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={tableColumns.length} className="p-0">
                  {emptyState}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <p className="text-sm text-muted-foreground">
          {data.length === 0
            ? "No results"
            : `Showing ${firstResult}-${lastResult} of ${data.length} ${entityLabel}${data.length !== 1 ? "s" : ""}`}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">Rows per page</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
                setPagination((current) => ({ ...current, pageIndex: 0, pageSize: Number(value) }))
              }}
            >
            <SelectTrigger className="h-8 w-16">
              <span className="sr-only">Rows per page</span>
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
              <span className="sr-only">Previous page</span>
            </Button>
            <span className="min-w-[60px] text-center text-sm tabular-nums">
              {pagination.pageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
