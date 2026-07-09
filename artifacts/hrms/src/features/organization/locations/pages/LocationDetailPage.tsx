import * as React from "react"
import { useLocation, useParams } from "wouter"
import { ArrowLeft, Building2, Clock3, MapPin, Pencil, Users, BriefcaseBusiness } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { AppLayout } from "@/components/layout/AppLayout"
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
      <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Location</div>}>
        <div className="rounded-xl border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">Location not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">The requested location could not be found.</p>
          <Button className="mt-6" onClick={() => navigate("/organization/locations")}>Back to locations</Button>
        </div>
      </AppLayout>
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
    <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Location details</div>}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" className="h-8 px-0" onClick={() => navigate("/organization/locations")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to locations
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold">{location.name}</h1>
                  <Badge variant={location.status === "Active" ? "default" : "secondary"}>{location.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{location.code} • {location.city}, {location.country}</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setDrawerOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit location
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
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
          </div>

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
        </div>
      </div>

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
    </AppLayout>
  )
}
