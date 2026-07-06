import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export function SearchBar({ placeholder = "Search...", onChange }: { placeholder?: string, onChange?: (val: string) => void }) {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        className="pl-9 bg-background/50"
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  )
}
