import * as React from "react"
import { MapPin, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { OrgEmptyState } from "../components/OrgEmptyState"

export default function Locations() {
  return (
    <OrgLayout section="Locations">
      <OrgPageHeader
        icon={MapPin}
        title="Locations"
        description="Manage office locations, branch addresses, remote work hubs, and registered corporate addresses."
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        }
      />
      <OrgEmptyState
        icon={MapPin}
        title="No locations configured yet"
        description="Add your company's physical offices, branches, and registered addresses. Locations are used to assign employees, apply regional leave policies, and generate compliance filings."
        action={{ label: "Add Location", icon: Plus }}
        hint="Each location can have its own holiday calendar and statutory configuration."
      />
    </OrgLayout>
  )
}
