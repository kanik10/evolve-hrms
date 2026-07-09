import * as React from "react"
import { useLocation, useParams } from "wouter"
import { ArrowLeft, Building2, Pencil, Briefcase, MapPin, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppLayout } from "@/components/layout/AppLayout"
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
      <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Business Unit</div>}>
        <div className="rounded-xl border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">Business unit not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">The selected business unit could not be found.</p>
          <Button className="mt-6" onClick={() => navigate("/organization/business-units")}>Back to business units</Button>
        </div>
      </AppLayout>
    )
  }

  const handleSubmit = (values: BusinessUnitFormValues) => {
    updateBusinessUnits((current) => current.map((item) => (item.id === businessUnit.id ? { ...item, ...values } : item)))
    setBusinessUnit((prev) => (prev ? { ...prev, ...values } : prev))
    setDrawerOpen(false)
  }

  return (
    <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Business unit details</div>}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" className="h-8 px-0" onClick={() => navigate("/organization/business-units")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to business units
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold">{businessUnit.name}</h1>
                  <Badge variant={businessUnit.status === "Active" ? "default" : "secondary"}>{businessUnit.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{businessUnit.code} • Head: {businessUnit.head}</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setDrawerOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit business unit
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
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
            </CardContent>
          </Card>

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
        </div>
      </div>

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
    </AppLayout>
  )
}
