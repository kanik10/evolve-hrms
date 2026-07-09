import * as React from "react"
import { Building, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { OrgEmptyState } from "../components/OrgEmptyState"

export default function BusinessUnits() {
  return (
    <OrgLayout section="Business Units">
      <OrgPageHeader
        icon={Building}
        title="Business Units"
        description="Structure your organization into discrete business segments with dedicated leadership, headcount, and revenue tracking."
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Business Unit
          </Button>
        }
      />
      <OrgEmptyState
        icon={Building}
        title="No business units defined yet"
        description="Create business units to segment your workforce by product lines, geographies, or service verticals. Each BU can have its own head and financial metrics."
        action={{ label: "Add Business Unit", icon: Plus }}
        hint="Business units can span multiple departments and locations."
      />
    </OrgLayout>
  )
}
