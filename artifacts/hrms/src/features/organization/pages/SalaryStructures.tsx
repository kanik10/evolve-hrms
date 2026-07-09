import * as React from "react"
import { Banknote, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { OrgEmptyState } from "../components/OrgEmptyState"

export default function SalaryStructures() {
  return (
    <OrgLayout section="Salary Structures">
      <OrgPageHeader
        icon={Banknote}
        title="Salary Structures"
        description="Build compensation frameworks with earnings components, deductions, statutory contributions, and grade-based applicability rules."
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Structure
          </Button>
        }
      />
      <OrgEmptyState
        icon={Banknote}
        title="No salary structures created yet"
        description="Define salary structures by listing components like Basic, HRA, Conveyance, PF, and Professional Tax. Each structure is linked to a grade band and drives monthly payroll computation."
        action={{ label: "Add Structure", icon: Plus }}
        hint="Salary structures are referenced at payroll run time based on the employee's assigned grade."
      />
    </OrgLayout>
  )
}
