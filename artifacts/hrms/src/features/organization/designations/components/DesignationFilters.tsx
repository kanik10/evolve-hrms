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
import { DEPARTMENT_OPTIONS } from "../data/mock"

interface DesignationFiltersProps {
  search: string
  onSearchChange: (val: string) => void
  statusFilter: string
  onStatusChange: (val: string) => void
  deptFilter: string
  onDeptChange: (val: string) => void
}

export function DesignationFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  deptFilter,
  onDeptChange,
}: DesignationFiltersProps) {
  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || deptFilter !== "all"

  const clearAll = () => {
    onSearchChange("")
    onStatusChange("all")
    onDeptChange("all")
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] max-w-xs flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search designations..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-background/50 pl-9"
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

      <Select value={deptFilter} onValueChange={onDeptChange}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="All departments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {DEPARTMENT_OPTIONS.map((dept) => (
            <SelectItem key={dept.id} value={dept.name}>
              {dept.name}
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
