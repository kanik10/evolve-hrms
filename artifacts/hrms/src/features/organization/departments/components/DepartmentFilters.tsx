import * as React from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BUSINESS_UNITS } from "../data/mock"

interface DepartmentFiltersProps {
  search: string
  onSearchChange: (val: string) => void
  statusFilter: string
  onStatusChange: (val: string) => void
  buFilter: string
  onBUChange: (val: string) => void
}

export function DepartmentFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  buFilter,
  onBUChange,
}: DepartmentFiltersProps) {
  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || buFilter !== "all"

  const clearAll = () => {
    onSearchChange("")
    onStatusChange("all")
    onBUChange("all")
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search departments..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-background/50"
        />
      </div>

      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="Active">Active</SelectItem>
          <SelectItem value="Inactive">Inactive</SelectItem>
          <SelectItem value="Archived">Archived</SelectItem>
        </SelectContent>
      </Select>

      <Select value={buFilter} onValueChange={onBUChange}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="All business units" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Business Units</SelectItem>
          {BUSINESS_UNITS.map((bu) => (
            <SelectItem key={bu} value={bu}>
              {bu}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="mr-1.5 h-3.5 w-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
