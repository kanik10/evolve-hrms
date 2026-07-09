import * as React from "react"
import { Palmtree, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { OrgEmptyState } from "../components/OrgEmptyState"

export default function LeavePolicies() {
  return (
    <OrgLayout section="Leave Policies">
      <OrgPageHeader
        icon={Palmtree}
        title="Leave Policies"
        description="Define leave types, accrual rules, carry-forward limits, encashment rules, and eligibility criteria for different employee categories."
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Leave Policy
          </Button>
        }
      />
      <OrgEmptyState
        icon={Palmtree}
        title="No leave policies defined yet"
        description="Create leave types such as Annual Leave, Sick Leave, and Casual Leave with their respective entitlements, accrual frequency, and carry-forward caps."
        action={{ label: "Add Leave Policy", icon: Plus }}
        hint="Leave policies are applied to employees based on employment type and grade."
      />
    </OrgLayout>
  )
}
