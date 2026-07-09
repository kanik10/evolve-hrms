import * as React from "react"
import { CalendarDays, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { OrgEmptyState } from "../components/OrgEmptyState"

export default function HolidayCalendar() {
  return (
    <OrgLayout section="Holiday Calendar">
      <OrgPageHeader
        icon={CalendarDays}
        title="Holiday Calendar"
        description="Manage national holidays, regional observances, and company-specific days off for the current and upcoming financial year."
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Holiday
          </Button>
        }
      />
      <OrgEmptyState
        icon={CalendarDays}
        title="No holidays scheduled yet"
        description="Add national holidays and company-declared holidays for the year. Multiple calendars can be created for different locations or regions."
        action={{ label: "Add Holiday", icon: Plus }}
        hint="Holiday calendars are linked to locations for region-specific employee scheduling."
      />
    </OrgLayout>
  )
}
