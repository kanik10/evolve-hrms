import * as React from "react"
import { UserCheck, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { OrgEmptyState } from "../components/OrgEmptyState"

export default function EmploymentTypes() {
  return (
    <OrgLayout section="Employment Types">
      <OrgPageHeader
        icon={UserCheck}
        title="Employment Types"
        description="Define employment classifications such as full-time, part-time, contract, intern, and consultant to standardize workforce categorization."
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Employment Type
          </Button>
        }
      />
      <OrgEmptyState
        icon={UserCheck}
        title="No employment types configured yet"
        description="Create employment type classifications to apply the right leave policies, payroll rules, and statutory obligations to each category of worker."
        action={{ label: "Add Employment Type", icon: Plus }}
        hint="Employment types determine applicable PF, ESI, and leave entitlements in payroll."
      />
    </OrgLayout>
  )
}
