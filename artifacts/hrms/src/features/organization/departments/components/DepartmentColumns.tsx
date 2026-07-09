import * as React from "react"
import { Link } from "wouter"
import { type ColumnDef } from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type Department, type DepartmentStatus } from "../types"

// ── Helpers ──────────────────────────────────────────────────────────────────

interface SortableCol {
  toggleSorting: (desc?: boolean) => void
  getIsSorted: () => false | "asc" | "desc"
}

function SortableHeader({
  column,
  label,
}: {
  column: SortableCol
  label: string
}) {
  const sorted = column.getIsSorted()
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 font-medium text-muted-foreground hover:text-foreground"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40" />
      )}
    </Button>
  )
}

function StatusBadge({ status }: { status: DepartmentStatus }) {
  if (status === "Active")
    return <Badge variant="success">{status}</Badge>
  if (status === "Inactive")
    return <Badge variant="secondary">{status}</Badge>
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {status}
    </Badge>
  )
}

// ── Column factory ────────────────────────────────────────────────────────────

interface ColumnActions {
  onEdit: (dept: Department) => void
  onDelete: (dept: Department) => void
  onArchive: (dept: Department) => void
}

export function getDepartmentColumns({
  onEdit,
  onDelete,
  onArchive,
}: ColumnActions): ColumnDef<Department>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 44,
    },
    {
      accessorKey: "code",
      header: ({ column }) => <SortableHeader column={column} label="Code" />,
      cell: ({ row }) => (
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          {row.getValue("code")}
        </span>
      ),
      size: 90,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column} label="Department" />
      ),
      cell: ({ row }) => (
        <Link href={`/organization/departments/${row.original.id}`}>
          <span className="cursor-pointer font-medium text-foreground underline-offset-4 hover:text-primary hover:underline transition-colors">
            {row.getValue("name")}
          </span>
        </Link>
      ),
    },
    {
      accessorKey: "head",
      header: ({ column }) => <SortableHeader column={column} label="Head" />,
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("head")}</span>
      ),
    },
    {
      accessorKey: "businessUnit",
      header: "Business Unit",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.getValue("businessUnit")}
        </span>
      ),
    },
    {
      accessorKey: "costCenter",
      header: "Cost Center",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.getValue("costCenter")}
        </span>
      ),
    },
    {
      accessorKey: "employeeCount",
      header: ({ column }) => (
        <SortableHeader column={column} label="Headcount" />
      ),
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">
          {(row.getValue("employeeCount") as number).toLocaleString()}
        </span>
      ),
      size: 100,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.getValue<DepartmentStatus>("status")} />
      ),
      size: 110,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const dept = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Row actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <Link
                  href={`/organization/departments/${dept.id}`}
                  className="flex cursor-pointer items-center"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(dept)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {dept.status !== "Archived" && (
                <DropdownMenuItem onClick={() => onArchive(dept)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(dept)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
      size: 52,
    },
  ]
}
