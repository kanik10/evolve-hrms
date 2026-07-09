import * as React from "react"
import { ArrowLeft, FileText, Pencil } from "lucide-react"
import { useLocation, useParams } from "wouter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppLayout } from "@/components/layout/AppLayout"
import { LeavePolicyDrawer } from "../components/LeavePolicyDrawer"
import { type LeavePolicyFormValues, getLeavePolicies, type LeavePolicyRecord } from "../data/leavePolicies"

export default function LeavePolicyDetailPage() {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [leavePolicy, setLeavePolicy] = React.useState<LeavePolicyRecord | undefined>(() => {
    const policies = getLeavePolicies()
    return policies.find((item) => item.id === params.id)
  })

  React.useEffect(() => {
    const policies = getLeavePolicies()
    setLeavePolicy(policies.find((item) => item.id === params.id))
  }, [params.id])

  if (!leavePolicy) {
    return (
      <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Leave policy details</div>}>
        <div className="rounded-xl border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">Leave policy not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">The requested leave policy could not be found.</p>
          <Button className="mt-6" onClick={() => navigate("/organization/leave-policies")}>Back to leave policies</Button>
        </div>
      </AppLayout>
    )
  }

  const handleSubmit = (values: LeavePolicyFormValues) => {
    const nextPolicies = getLeavePolicies().map((item) => (item.id === leavePolicy.id ? { ...item, ...values } : item))
    const updatedPolicy = nextPolicies.find((item) => item.id === leavePolicy.id)
    setLeavePolicy(updatedPolicy)
    setDrawerOpen(false)
  }

  return (
    <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Leave policy details</div>}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" className="h-8 px-0" onClick={() => navigate("/organization/leave-policies")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to leave policies
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold">{leavePolicy.policyName}</h1>
                  <Badge variant={leavePolicy.status === "Active" ? "default" : "secondary"}>{leavePolicy.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Eligibility: {leavePolicy.eligibility}</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setDrawerOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit policy
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Leave policy overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Annual leave</p>
              <p className="mt-1 text-sm">{leavePolicy.annualLeave} days</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Casual leave</p>
              <p className="mt-1 text-sm">{leavePolicy.casualLeave} days</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Sick leave</p>
              <p className="mt-1 text-sm">{leavePolicy.sickLeave} days</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Carry forward</p>
              <p className="mt-1 text-sm">{leavePolicy.carryForward} days</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Negative balance</p>
              <p className="mt-1 text-sm">{leavePolicy.negativeBalance}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Encashment</p>
              <p className="mt-1 text-sm">{leavePolicy.encashment}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <LeavePolicyDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode="edit"
        initialValues={{
          policyName: leavePolicy.policyName,
          annualLeave: leavePolicy.annualLeave,
          casualLeave: leavePolicy.casualLeave,
          sickLeave: leavePolicy.sickLeave,
          carryForward: leavePolicy.carryForward,
          negativeBalance: leavePolicy.negativeBalance,
          encashment: leavePolicy.encashment,
          eligibility: leavePolicy.eligibility,
          status: leavePolicy.status,
        }}
        onSubmit={handleSubmit}
      />
    </AppLayout>
  )
}
