import * as React from "react"
import { Clock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { OrgEmptyState } from "../components/OrgEmptyState"

export default function ShiftManagement() {
  return (
    <OrgLayout section="Shift Management">
      <OrgPageHeader
        icon={Clock}
        title="Shift Management"
        description="Configure working hour schedules, shift timings, grace periods, and overtime rules for different employee groups."
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Shift
          </Button>
        }
      />
      <OrgEmptyState
        icon={Clock}
        title="No shifts configured yet"
        description="Create shift definitions (Morning, General, Evening, Night) with start/end times and grace periods. Shifts are assigned to employees and used by the attendance module."
        action={{ label: "Add Shift", icon: Plus }}
        hint="Shifts integrate with biometric devices and attendance rules for accurate tracking."
      />
    </OrgLayout>
  )
}
