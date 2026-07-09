import * as React from "react"
import { ArrowLeft, Pencil, UserCheck } from "lucide-react"
import { useLocation, useParams } from "wouter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppLayout } from "@/components/layout/AppLayout"
import { EmploymentTypeDrawer } from "../components/EmploymentTypeDrawer"
import { getEmploymentTypes, type EmploymentTypeFormValues, type EmploymentTypeRecord } from "../data/employmentTypes"

export default function EmploymentTypeDetailPage() {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [employmentType, setEmploymentType] = React.useState<EmploymentTypeRecord | undefined>(() => {
    return getEmploymentTypes().find((item) => item.id === params.id)
  })

  React.useEffect(() => {
    setEmploymentType(getEmploymentTypes().find((item) => item.id === params.id))
  }, [params.id])

  if (!employmentType) {
    return (
      <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Employment Type</div>}>
        <div className="rounded-xl border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">Employment type not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">The requested employment type could not be found.</p>
          <Button className="mt-6" onClick={() => navigate("/organization/employment-types")}>Back to employment types</Button>
        </div>
      </AppLayout>
    )
  }

  const handleSubmit = (values: EmploymentTypeFormValues) => {
    const nextItems = getEmploymentTypes().map((item) => (item.id === employmentType.id ? { ...item, ...values } : item))
    const updated = nextItems.find((item) => item.id === employmentType.id)
    setEmploymentType(updated)
    setDrawerOpen(false)
  }

  return (
    <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Employment type details</div>}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" className="h-8 px-0" onClick={() => navigate("/organization/employment-types")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to employment types
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold">{employmentType.typeName}</h1>
                  <Badge variant={employmentType.status === "Active" ? "default" : "secondary"}>{employmentType.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Benefits eligible: {employmentType.benefitsEligible ? "Yes" : "No"}</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setDrawerOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit employment type
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employment type overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Description</p>
              <p className="mt-1 text-sm">{employmentType.description}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Notice period</p>
              <p className="mt-1 text-sm">{employmentType.noticePeriod}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <EmploymentTypeDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode="edit"
        initialValues={{
          typeName: employmentType.typeName,
          description: employmentType.description,
          benefitsEligible: employmentType.benefitsEligible,
          noticePeriod: employmentType.noticePeriod,
          status: employmentType.status,
        }}
        onSubmit={handleSubmit}
      />
    </AppLayout>
  )
}
