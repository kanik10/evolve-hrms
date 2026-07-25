import * as React from "react"
import { useLocation, useParams } from "wouter"
import { Building2, Clock3, MapPin, BriefcaseBusiness, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { OrgLayout, DetailLayout, StatusBadge, EmptyState, RelationshipCard } from "../../index"
import { LocationDrawer } from "../components/LocationDrawer"
import { type LocationFormValues, getLocationById, updateLocations } from "../data/locations"
import { organizationBusinessUnits, organizationDepartments, organizationEmployees } from "../../data/organizationData"

export default function LocationDetailPage() {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [location, setLocation] = React.useState(() => getLocationById(params.id))

  React.useEffect(() => {
    setLocation(getLocationById(params.id))
  }, [params.id])

  if (!location) {
    return (
      <OrgLayout section="Locations">
        <EmptyState
          icon={MapPin}
          title="Location not found"
          description="The requested location could not be found."
          action={{ label: "Back to locations", onClick: () => navigate("/organization/locations") }}
        />
      </OrgLayout>
    )
  }

  const handleSubmit = (values: LocationFormValues) => {
    updateLocations((current) =>
      current.map((item) => (item.id === location.id ? { ...item, ...values } : item))
    )
    setLocation((prev) => (prev ? { ...prev, ...values } : prev))
    setDrawerOpen(false)
  }

  const relatedDepartments = organizationDepartments.filter((department) => department.locations.includes(location.name))
  const relatedEmployees = organizationEmployees.filter((employee) => employee.location === location.name)
  const relatedBusinessUnits = organizationBusinessUnits.filter((unit) => unit.locations.includes(location.name))

  return (
    <OrgLayout section="Locations">
      <DetailLayout
        title={location.name}
        subtitle={`${location.code} • ${location.city}, ${location.country}`}
        icon={MapPin}
        status={location.status}
        backLabel="Back to locations"
        onBack={() => navigate("/organization/locations")}
        onEdit={() => setDrawerOpen(true)}
        aside={
          <div className="space-y-6">
            <RelationshipCard
              title="Departments"
              icon={BriefcaseBusiness}
              items={relatedDepartments.map((department) => ({
                id: department.id,
                title: department.name,
                subtitle: `Head: ${department.head}`,
                meta: `${department.employeeCount.toLocaleString()} employees`,
                status: department.status,
                tags: [department.businessUnit, department.costCenter],
              }))}
            />
            <RelationshipCard
              title="Employees"
              icon={Users}
              items={relatedEmployees.map((employee) => ({
                id: employee.id,
                title: employee.name,
                subtitle: employee.designation,
                meta: employee.department,
                status: employee.status,
              }))}
            />
            <RelationshipCard
              title="Business Units"
              icon={Building2}
              items={relatedBusinessUnits.map((unit) => ({
                id: unit.id,
                title: unit.name,
                subtitle: `Head: ${unit.head}`,
                meta: `${unit.departments.length} departments`,
                status: unit.status,
              }))}
            />
          </div>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>Location overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Address</p>
              <p className="mt-1 text-sm">{location.address}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Business unit</p>
              <p className="mt-1 text-sm">{location.businessUnit}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Timezone</p>
              <p className="mt-1 text-sm">{location.timezone}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Working hours</p>
              <p className="mt-1 text-sm">{location.workingHours}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <div className="mt-1">
                <StatusBadge status={location.status} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Map placeholder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed bg-muted/20 text-center">
              <div>
                <p className="text-sm font-medium">Interactive map preview</p>
                <p className="mt-1 text-sm text-muted-foreground">A map integration can be connected here later.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DetailLayout>

      <LocationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode="edit"
        initialValues={{
          name: location.name,
          code: location.code,
          address: location.address,
          city: location.city,
          state: location.state,
          country: location.country,
          timezone: location.timezone,
          workingHours: location.workingHours,
          businessUnit: location.businessUnit,
          status: location.status,
        }}
        onSubmit={handleSubmit}
      />
    </OrgLayout>
  )
}
