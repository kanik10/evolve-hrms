import * as React from "react"
import { useLocation, useParams } from "wouter"
import { Building2, Pencil, Briefcase, MapPin, Receipt } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OrgLayout, DetailLayout, StatusBadge, EmptyState } from "../../index"
import { Button } from "@/components/ui/button"
import { BusinessUnitDrawer } from "../components/BusinessUnitDrawer"
import { getBusinessUnitById, updateBusinessUnits, type BusinessUnitFormValues } from "../data/businessUnits"

export default function BusinessUnitDetailPage() {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [businessUnit, setBusinessUnit] = React.useState(() => getBusinessUnitById(params.id))

  React.useEffect(() => {
    setBusinessUnit(getBusinessUnitById(params.id))
  }, [params.id])

  if (!businessUnit) {
    return (
      <OrgLayout section="Business Units">
        <EmptyState
          icon={Building2}
          title="Business unit not found"
          description="The selected business unit could not be found."
          action={{ label: "Back to business units", onClick: () => navigate("/organization/business-units") }}
        />
      </OrgLayout>
    )
  }

  const handleSubmit = (values: BusinessUnitFormValues) => {
    updateBusinessUnits((current) => current.map((item) => (item.id === businessUnit.id ? { ...item, ...values } : item)))
    setBusinessUnit((prev) => (prev ? { ...prev, ...values } : prev))
    setDrawerOpen(false)
  }

  return (
    <OrgLayout section="Business Units">
      <DetailLayout
        title={businessUnit.name}
        subtitle={`${businessUnit.code} • Head: ${businessUnit.head}`}
        icon={Building2}
        status={businessUnit.status}
        backLabel="Back to business units"
        onBack={() => navigate("/organization/business-units")}
        onEdit={() => setDrawerOpen(true)}
        aside={
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Briefcase className="h-4 w-4" />Departments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {businessUnit.departments.map((department) => (
                  <div key={department} className="rounded-lg border px-3 py-2 text-sm">{department}</div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" />Locations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {businessUnit.locations.map((location) => (
                  <div key={location} className="rounded-lg border px-3 py-2 text-sm">{location}</div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Receipt className="h-4 w-4" />Cost centers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {businessUnit.costCenters.map((center) => (
                  <div key={center} className="rounded-lg border px-3 py-2 text-sm">{center}</div>
                ))}
              </CardContent>
            </Card>
          </div>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>Business unit overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Description</p>
              <p className="mt-1">{businessUnit.description}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Head</p>
                <p className="mt-1 font-medium">{businessUnit.head}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Code</p>
                <p className="mt-1 font-medium">{businessUnit.code}</p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <div className="mt-1">
                <StatusBadge status={businessUnit.status} />
              </div>
            </div>
          </CardContent>
        </Card>
      </DetailLayout>

      <BusinessUnitDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode="edit"
        initialValues={{
          name: businessUnit.name,
          code: businessUnit.code,
          head: businessUnit.head,
          description: businessUnit.description,
          status: businessUnit.status,
        }}
        onSubmit={handleSubmit}
      />
    </OrgLayout>
  )
}
