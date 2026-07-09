import * as React from "react"
import { ArrowLeft, Clock3, Pencil } from "lucide-react"
import { useLocation, useParams } from "wouter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppLayout } from "@/components/layout/AppLayout"
import { ShiftDrawer } from "../components/ShiftDrawer"
import { type ShiftFormValues, getShifts, type ShiftRecord } from "../data/shifts"

export default function ShiftDetailPage() {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [shift, setShift] = React.useState<ShiftRecord | undefined>(() => {
    const shifts = getShifts()
    return shifts.find((item) => item.id === params.id)
  })

  React.useEffect(() => {
    const shifts = getShifts()
    setShift(shifts.find((item) => item.id === params.id))
  }, [params.id])

  if (!shift) {
    return (
      <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Shift details</div>}>
        <div className="rounded-xl border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">Shift not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">The requested shift could not be found.</p>
          <Button className="mt-6" onClick={() => navigate("/organization/shifts")}>Back to shifts</Button>
        </div>
      </AppLayout>
    )
  }

  const handleSubmit = (values: ShiftFormValues) => {
    const nextShifts = getShifts().map((item) => (item.id === shift.id ? { ...item, ...values } : item))
    const updatedShift = nextShifts.find((item) => item.id === shift.id)
    setShift(updatedShift)
    setDrawerOpen(false)
  }

  return (
    <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Shift details</div>}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" className="h-8 px-0" onClick={() => navigate("/organization/shifts")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to shifts
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Clock3 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold">{shift.shiftName}</h1>
                  <Badge variant={shift.status === "Active" ? "default" : "secondary"}>{shift.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{shift.startTime} – {shift.endTime}</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setDrawerOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit shift
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Shift overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Start time</p>
              <p className="mt-1 text-sm">{shift.startTime}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">End time</p>
              <p className="mt-1 text-sm">{shift.endTime}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Grace time</p>
              <p className="mt-1 text-sm">{shift.graceTime} mins</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Break duration</p>
              <p className="mt-1 text-sm">{shift.breakDuration} mins</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Weekly off</p>
              <p className="mt-1 text-sm">{shift.weeklyOff}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <p className="mt-1 text-sm">{shift.status}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ShiftDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode="edit"
        initialValues={{
          shiftName: shift.shiftName,
          startTime: shift.startTime,
          endTime: shift.endTime,
          graceTime: shift.graceTime,
          breakDuration: shift.breakDuration,
          weeklyOff: shift.weeklyOff,
          status: shift.status,
        }}
        onSubmit={handleSubmit}
      />
    </AppLayout>
  )
}
