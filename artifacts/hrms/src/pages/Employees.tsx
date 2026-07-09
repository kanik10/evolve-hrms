import * as React from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { PageHeader } from "@/components/PageHeader"
import { EmptyState } from "@/components/EmptyState"
import { SearchBar } from "@/components/SearchBar"
import { Button } from "@/components/ui/button"
import { Plus, Users } from "lucide-react"
import { organizationEmployees } from "@/features/organization/data/organizationData"

export default function Employees() {
  return (
    <AppLayout breadcrumb={<span className="text-sm font-medium">Employees</span>}>
      <PageHeader 
        title="Employee Directory" 
        description="Manage all employees across the organization."
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        }
      />

      <div className="flex items-center justify-between mb-6">
        <SearchBar placeholder="Search by name, ID, or role..." />
        <div className="flex gap-2">
          <Button variant="outline">Filter</Button>
          <Button variant="outline">Export</Button>
        </div>
      </div>

      <div className="mt-8 rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Employees linked to organization setup</h3>
          <span className="text-xs text-muted-foreground">{organizationEmployees.length} records</span>
        </div>
        <div className="space-y-2">
          {organizationEmployees.slice(0, 6).map((employee) => (
            <div key={employee.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{employee.name}</p>
                <p className="text-muted-foreground">{employee.department} · {employee.designation}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{employee.location ?? "Unassigned location"}</p>
                <p>{employee.salaryStructureId ?? "No salary structure"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
