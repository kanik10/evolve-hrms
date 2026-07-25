import * as React from "react"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { useLocation, useParams } from "wouter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppLayout } from "@/components/layout/AppLayout"
import { getHolidays } from "../holiday-calendar/data/holidays"

export default function HolidayDetailPage() {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const holiday = React.useMemo(() => getHolidays().find((item) => item.id === params.id), [params.id])

  if (!holiday) {
    return (
      <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Holiday details</div>}>
        <div className="rounded-xl border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">Holiday not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">The requested holiday could not be found.</p>
          <Button className="mt-6" onClick={() => navigate("/organization/holiday-calendar")}>Back to holiday calendar</Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Holiday details</div>}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" className="h-8 px-0" onClick={() => navigate("/organization/holiday-calendar")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to holiday calendar
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{holiday.name}</h1>
                <p className="text-sm text-muted-foreground">{holiday.location}</p>
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Holiday overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Date</p>
              <p className="mt-1 text-sm">{new Date(holiday.date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Type</p>
              <p className="mt-1 text-sm">{holiday.holidayType}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
              <p className="mt-1 text-sm">{holiday.location}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Flags</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {holiday.mandatory ? <Badge>Mandatory</Badge> : null}
                {holiday.optional ? <Badge variant="secondary">Optional</Badge> : null}
                {holiday.recurring ? <Badge variant="outline">Recurring</Badge> : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
