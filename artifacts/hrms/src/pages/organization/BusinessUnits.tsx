import * as React from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { PageHeader } from "@/components/PageHeader"
import { DataTable } from "@/components/DataTable"
import { SearchBar } from "@/components/SearchBar"
import { Button } from "@/components/ui/button"
import { Plus, Edit2, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { mockBusinessUnits } from "@/data/mockData"

export default function BusinessUnits() {
  const [searchTerm, setSearchTerm] = React.useState("")

  const filteredData = mockBusinessUnits.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    { header: "BU Name", accessor: (row: any) => <span className="font-medium text-foreground">{row.name}</span> },
    { header: "BU Head", accessor: (row: any) => row.head },
    { header: "Revenue", accessor: (row: any) => <span className="font-mono">{row.revenue}</span> },
    { header: "Headcount", accessor: (row: any) => row.headcount },
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
    <AppLayout breadcrumb={<span className="text-sm font-medium text-muted-foreground">Organization / <span className="text-foreground">Business Units</span></span>}>
      <PageHeader 
        title="Business Units" 
        description="Manage discrete business segments."
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add BU
          </Button>
        }
      />

      <div className="flex items-center justify-between mb-6">
        <SearchBar placeholder="Search business units..." onChange={setSearchTerm} />
      </div>

      <DataTable columns={columns} data={filteredData} />
    </AppLayout>
  )
}
