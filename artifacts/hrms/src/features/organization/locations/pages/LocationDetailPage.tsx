import * as React from "react"
import { useLocation, useParams } from "wouter"
import { Building2, Clock3, MapPin, BriefcaseBusiness, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { OrgLayout, DetailLayout, StatusBadge, EmptyState } from "../../index"
import { LocationDrawer } from "../components/LocationDrawer"
import { type LocationFormValues, getLocationById, updateLocations, locationEmployees, locationDepartments } from "../data/locations"

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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Employees at this location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(locationEmployees[location.id] ?? []).map((employee) => (
                  <div key={employee.email} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{employee.name}</p>
                    <p className="text-sm text-muted-foreground">{employee.role}</p>
                    <p className="text-xs text-muted-foreground">{employee.email}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BriefcaseBusiness className="h-4 w-4" />
                  Departments at this location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(locationDepartments[location.id] ?? []).map((department) => (
                  <div key={department.name} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{department.name}</p>
                    <p className="text-sm text-muted-foreground">Head: {department.head}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
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
