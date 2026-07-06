import * as React from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { PageHeader } from "@/components/PageHeader"
import { DataTable } from "@/components/DataTable"
import { SearchBar } from "@/components/SearchBar"
import { Button } from "@/components/ui/button"
import { Plus, Edit2, Trash2, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { mockLocations } from "@/data/mockData"

export default function Locations() {
  const [searchTerm, setSearchTerm] = React.useState("")

  const filteredData = mockLocations.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    { header: "Location Name", accessor: (row: any) => (
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-foreground">{row.name}</span>
      </div>
    ) },
    { header: "Address", accessor: (row: any) => <span className="text-muted-foreground truncate block max-w-[250px]">{row.address}</span> },
    { header: "Type", accessor: (row: any) => <Badge variant="outline">{row.type}</Badge> },
    { header: "Status", accessor: (row: any) => (
      <Badge variant={row.status === 'Active' ? 'success' : 'secondary'}>{row.status}</Badge>
    )},
    { header: "Actions", accessor: (row: any) => (
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>
    ), className: "text-right" }
  ]

  return (
    <AppLayout breadcrumb={<span className="text-sm font-medium text-muted-foreground">Organization / <span className="text-foreground">Locations</span></span>}>
      <PageHeader 
        title="Locations" 
        description="Manage physical office spaces and branches."
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        }
      />

      <div className="flex items-center justify-between mb-6">
        <SearchBar placeholder="Search locations..." onChange={setSearchTerm} />
      </div>

      <DataTable columns={columns} data={filteredData} />
    </AppLayout>
  )
}
