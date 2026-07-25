import * as React from "react"
import { useLocation, useParams } from "wouter"
import { Building2, Briefcase, MapPin, Receipt } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OrgLayout, DetailLayout, StatusBadge, EmptyState, RelationshipCard } from "../../index"
import { BusinessUnitDrawer } from "../components/BusinessUnitDrawer"
import { getBusinessUnitById, updateBusinessUnits, type BusinessUnitFormValues } from "../data/businessUnits"
import { organizationCostCenters, organizationDepartments, organizationLocations } from "../../data/organizationData"

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

  const relatedDepartments = organizationDepartments.filter((department) => department.businessUnit === businessUnit.name)
  const relatedLocations = organizationLocations.filter((location) => location.businessUnit === businessUnit.name)
  const relatedCostCenters = organizationCostCenters.filter((center) => center.businessUnit === businessUnit.name)

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
            <RelationshipCard
              title="Departments"
              icon={Briefcase}
              items={relatedDepartments.map((department) => ({
                id: department.id,
                title: department.name,
                subtitle: `Head: ${department.head}`,
                meta: `${department.employeeCount.toLocaleString()} employees`,
                status: department.status,
                tags: [department.costCenter],
              }))}
            />
            <RelationshipCard
              title="Locations"
              icon={MapPin}
              items={relatedLocations.map((location) => ({
                id: location.id,
                title: location.name,
                subtitle: `${location.city}, ${location.country}`,
                meta: location.workingHours,
                status: location.status,
              }))}
            />
            <RelationshipCard
              title="Cost Centers"
              icon={Receipt}
              items={relatedCostCenters.map((center) => ({
                id: center.id,
                title: center.name,
                subtitle: center.code,
                meta: `Budget: ${center.budget}`,
                status: center.status,
                tags: [center.department],
              }))}
            />
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
