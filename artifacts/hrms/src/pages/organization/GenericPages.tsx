import * as React from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { PageHeader } from "@/components/PageHeader"
import { DataTable } from "@/components/DataTable"
import { SearchBar } from "@/components/SearchBar"
import { Button } from "@/components/ui/button"
import { Plus, Edit2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { mockGrades, mockCostCenters, mockEmploymentTypes, mockLeavePolicies, mockSalaryStructures, mockHolidays, mockShifts } from "@/data/mockData"

export function GenericOrgPage({ 
  title, 
  description, 
  data, 
  columns, 
  searchField = "name" 
}: { 
  title: string, 
  description: string, 
  data: any[], 
  columns: any[],
  searchField?: string 
}) {
  const [searchTerm, setSearchTerm] = React.useState("")

  const filteredData = data.filter(d => 
    (d[searchField] || d.title || d.code || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AppLayout breadcrumb={<span className="text-sm font-medium text-muted-foreground">Organization / <span className="text-foreground">{title}</span></span>}>
      <PageHeader 
        title={title} 
        description={description}
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Button>
        }
      />

      <div className="flex items-center justify-between mb-6">
        <SearchBar placeholder={`Search ${title.toLowerCase()}...`} onChange={setSearchTerm} />
      </div>

      <DataTable columns={columns} data={filteredData} />
    </AppLayout>
  )
}

export const CostCenters = () => (
  <GenericOrgPage 
    title="Cost Centers" 
    description="Manage financial tracking units." 
    data={mockCostCenters}
    searchField="name"
    columns={[
      { header: "Code", accessor: (row: any) => <span className="font-mono">{row.code}</span> },
      { header: "Name", accessor: (row: any) => <span className="font-medium">{row.name}</span> },
      { header: "Mapped Departments", accessor: (row: any) => row.mappedDepartments },
      { header: "Status", accessor: (row: any) => <Badge variant={row.status === 'Active' ? 'success' : 'secondary'}>{row.status}</Badge> }
    ]}
  />
)

export const Grades = () => (
  <GenericOrgPage 
    title="Grades" 
    description="Manage employee levels and compensation bands." 
    data={mockGrades}
    searchField="bandName"
    columns={[
      { header: "Code", accessor: (row: any) => <span className="font-mono">{row.code}</span> },
      { header: "Band Name", accessor: (row: any) => <span className="font-medium">{row.bandName}</span> },
      { header: "Salary Range", accessor: (row: any) => row.salaryRange },
      { header: "Status", accessor: (row: any) => <Badge variant={row.status === 'Active' ? 'success' : 'secondary'}>{row.status}</Badge> }
    ]}
  />
)

export const EmploymentTypes = () => (
  <GenericOrgPage 
    title="Employment Types" 
    description="Manage standard employee classifications." 
    data={mockEmploymentTypes}
    searchField="name"
    columns={[
      { header: "Name", accessor: (row: any) => <span className="font-medium">{row.name}</span> },
      { header: "Description", accessor: (row: any) => <span className="text-muted-foreground">{row.description}</span> },
      { header: "Status", accessor: (row: any) => <Badge variant={row.status === 'Active' ? 'success' : 'secondary'}>{row.status}</Badge> }
    ]}
  />
)

export const HolidayCalendar = () => (
  <GenericOrgPage 
    title="Holiday Calendar" 
    description="Manage company holidays." 
    data={mockHolidays}
    searchField="name"
    columns={[
      { header: "Name", accessor: (row: any) => <span className="font-medium">{row.name}</span> },
      { header: "Date", accessor: (row: any) => row.date },
      { header: "Type", accessor: (row: any) => <Badge variant="outline">{row.type}</Badge> },
      { header: "Status", accessor: (row: any) => <Badge variant={row.status === 'Active' ? 'success' : 'secondary'}>{row.status}</Badge> }
    ]}
  />
)

export const ShiftManagement = () => (
  <GenericOrgPage 
    title="Shift Management" 
    description="Manage working hours." 
    data={mockShifts}
    searchField="name"
    columns={[
      { header: "Name", accessor: (row: any) => <span className="font-medium">{row.name}</span> },
      { header: "Timing", accessor: (row: any) => <span className="font-mono text-muted-foreground">{row.timing}</span> },
      { header: "Grace Period", accessor: (row: any) => row.gracePeriod },
      { header: "Status", accessor: (row: any) => <Badge variant={row.status === 'Active' ? 'success' : 'secondary'}>{row.status}</Badge> }
    ]}
  />
)

export const LeavePolicies = () => (
  <GenericOrgPage 
    title="Leave Policies" 
    description="Manage employee time-off rules." 
    data={mockLeavePolicies}
    searchField="name"
    columns={[
      { header: "Name", accessor: (row: any) => <span className="font-medium">{row.name}</span> },
      { header: "Days", accessor: (row: any) => row.days },
      { header: "Carry Forward", accessor: (row: any) => row.carryForward },
      { header: "Status", accessor: (row: any) => <Badge variant={row.status === 'Active' ? 'success' : 'secondary'}>{row.status}</Badge> }
    ]}
  />
)

export const SalaryStructures = () => (
  <GenericOrgPage 
    title="Salary Structures" 
    description="Manage compensation setups." 
    data={mockSalaryStructures}
    searchField="name"
    columns={[
      { header: "Name", accessor: (row: any) => <span className="font-medium">{row.name}</span> },
      { header: "Components", accessor: (row: any) => <span className="text-muted-foreground">{row.components}</span> },
      { header: "Applicable Grades", accessor: (row: any) => <Badge variant="outline">{row.applicableGrades}</Badge> },
      { header: "Status", accessor: (row: any) => <Badge variant={row.status === 'Active' ? 'success' : 'secondary'}>{row.status}</Badge> }
    ]}
  />
)
