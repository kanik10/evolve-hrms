import * as React from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { PageHeader } from "@/components/PageHeader"
import { DataTable } from "@/components/DataTable"
import { SearchBar } from "@/components/SearchBar"
import { Button } from "@/components/ui/button"
import { Plus, Edit2, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { mockDesignations } from "@/data/mockData"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function Designations() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)

  const filteredData = mockDesignations.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    { header: "ID", accessor: (row: any) => <span className="text-muted-foreground font-mono">{row.id}</span> },
    { header: "Designation Title", accessor: (row: any) => <span className="font-medium text-foreground">{row.name}</span> },
    { header: "Level", accessor: (row: any) => <Badge variant="outline">{row.grade}</Badge> },
    { header: "Department Ref", accessor: (row: any) => row.departmentId },
    { header: "Status", accessor: (row: any) => (
      <Badge variant={row.status === 'Active' ? 'success' : 'secondary'}>{row.status}</Badge>
    )},
    { header: "Actions", accessor: (row: any) => (
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ), className: "text-right" }
  ]

  return (
    <AppLayout breadcrumb={<span className="text-sm font-medium text-muted-foreground">Organization / <span className="text-foreground">Designations</span></span>}>
      <PageHeader 
        title="Designations" 
        description="Manage job titles and hierarchy levels."
        action={
          <Button onClick={() => setIsSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Designation
          </Button>
        }
      />

      <div className="flex items-center justify-between mb-6">
        <SearchBar placeholder="Search designations..." onChange={setSearchTerm} />
      </div>

      <DataTable columns={columns} data={filteredData} />

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-[425px]">
          <SheetHeader className="mb-6">
            <SheetTitle>Add Designation</SheetTitle>
            <SheetDescription>
              Create a new job designation in the organization.
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Designation Title</Label>
              <Input id="title" placeholder="e.g. Senior Software Engineer" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="level">Level / Band</Label>
              <Input id="level" placeholder="e.g. L3" />
            </div>

            <div className="pt-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
              <Button onClick={() => setIsSheetOpen(false)}>Save</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  )
}
