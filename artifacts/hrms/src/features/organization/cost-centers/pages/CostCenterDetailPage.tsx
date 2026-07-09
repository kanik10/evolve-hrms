import * as React from "react"
import { useLocation, useParams } from "wouter"
import { ArrowLeft, DollarSign, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppLayout } from "@/components/layout/AppLayout"
import { CostCenterDrawer } from "../components/CostCenterDrawer"
import { getCostCenterById, updateCostCenters, type CostCenterFormValues } from "../data/costCenters"

export default function CostCenterDetailPage() {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [costCenter, setCostCenter] = React.useState(() => getCostCenterById(params.id))

  React.useEffect(() => {
    setCostCenter(getCostCenterById(params.id))
  }, [params.id])

  if (!costCenter) {
    return (
      <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Cost Center</div>}>
        <div className="rounded-xl border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">Cost center not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">The requested cost center could not be found.</p>
          <Button className="mt-6" onClick={() => navigate("/organization/cost-centers")}>Back to cost centers</Button>
        </div>
      </AppLayout>
    )
  }

  const handleSubmit = (values: CostCenterFormValues) => {
    updateCostCenters((current) => current.map((item) => (item.id === costCenter.id ? { ...item, ...values } : item)))
    setCostCenter((prev) => (prev ? { ...prev, ...values } : prev))
    setDrawerOpen(false)
  }

  return (
    <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Cost center details</div>}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" className="h-8 px-0" onClick={() => navigate("/organization/cost-centers")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to cost centers
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold">{costCenter.name}</h1>
                  <Badge variant={costCenter.status === "Active" ? "default" : "secondary"}>{costCenter.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{costCenter.code} • {costCenter.department}</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setDrawerOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit cost center
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cost center overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Department</p>
              <p className="mt-1 text-sm">{costCenter.department}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Business Unit</p>
              <p className="mt-1 text-sm">{costCenter.businessUnit}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Budget</p>
              <p className="mt-1 text-sm">{costCenter.budget}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <p className="mt-1 text-sm">{costCenter.status}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <CostCenterDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode="edit"
        initialValues={{
          name: costCenter.name,
          code: costCenter.code,
          department: costCenter.department,
          businessUnit: costCenter.businessUnit,
          status: costCenter.status,
          budget: costCenter.budget,
        }}
        onSubmit={handleSubmit}
      />
    </AppLayout>
  )
}
