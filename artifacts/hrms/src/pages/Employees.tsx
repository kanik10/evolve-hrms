import * as React from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { PageHeader } from "@/components/PageHeader"
import { EmptyState } from "@/components/EmptyState"
import { SearchBar } from "@/components/SearchBar"
import { Button } from "@/components/ui/button"
import { Plus, Users } from "lucide-react"

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

      {/* For now, just showing empty state to demonstrate */}
      <div className="mt-8">
        <EmptyState 
          icon={<Users className="h-8 w-8" />}
          title="No employees found"
          description="You haven't added any employees yet, or no employees match your search criteria."
          action={
            <Button variant="outline">
              Clear Search
            </Button>
          }
        />
      </div>
    </AppLayout>
  )
}
