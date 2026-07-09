import * as React from "react"
import { DollarSign, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { OrgEmptyState } from "../components/OrgEmptyState"

export default function CostCenters() {
  return (
    <OrgLayout section="Cost Centers">
      <OrgPageHeader
        icon={DollarSign}
        title="Cost Centers"
        description="Define financial tracking units to attribute expenses, manage budget allocation, and generate cost reports by department or function."
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Cost Center
          </Button>
        }
      />
      <OrgEmptyState
        icon={DollarSign}
        title="No cost centers configured yet"
        description="Create cost centers and map them to departments or business units. Cost center codes are used in payroll processing and financial reporting."
        action={{ label: "Add Cost Center", icon: Plus }}
        hint="Cost centers integrate with your payroll module for accurate expense attribution."
      />
    </OrgLayout>
  )
}
