import * as React from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface FiltersProps {
  search: string
  onSearchChange: (value: string) => void
  onClear?: () => void
  children: React.ReactNode
  placeholder?: string
  searchClassName?: string
}

export function Filters({ search, onSearchChange, onClear, children, placeholder = "Search...", searchClassName }: FiltersProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className={searchClassName ?? "relative min-w-[220px] flex-1"}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          className="pl-9"
          aria-label={placeholder}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
      {onClear && search.trim() && (
        <Button variant="ghost" size="sm" onClick={onClear} className="lg:ml-auto">
          <X className="mr-1.5 h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  )
}
