import * as React from "react"
import { BarChart2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { OrgEmptyState } from "../components/OrgEmptyState"

export default function Grades() {
  return (
    <OrgLayout section="Grades">
      <OrgPageHeader
        icon={BarChart2}
        title="Grades"
        description="Create employee grade bands and career levels with associated compensation ranges, designation mappings, and benefit entitlements."
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Grade
          </Button>
        }
      />
      <OrgEmptyState
        icon={BarChart2}
        title="No grade bands defined yet"
        description="Define grade levels (e.g. G1–G7) with salary bands and map them to designations. Grades drive compensation benchmarking and promotion workflows."
        action={{ label: "Add Grade", icon: Plus }}
        hint="Grades are referenced in salary structures, offer letters, and performance reviews."
      />
    </OrgLayout>
  )
}
