import * as React from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Edit3, Plus, Search, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { HolidayDeleteDialog } from "../holiday-calendar/components/HolidayDeleteDialog"
import { HolidayDrawer } from "../holiday-calendar/components/HolidayDrawer"
import { type HolidayFormValues, createEmptyHolidayFormValues, getHolidays, holidayLocations, type HolidayRecord, updateHolidays } from "../holiday-calendar/data/holidays"

export default function HolidayCalendar() {
  const [holidays, setHolidays] = React.useState<HolidayRecord[]>(() => getHolidays())
  const [view, setView] = React.useState<"calendar" | "list">("calendar")
  const [search, setSearch] = React.useState("")
  const [locationFilter, setLocationFilter] = React.useState("all")
  const [yearFilter, setYearFilter] = React.useState<string>(String(new Date().getFullYear()))
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerMode, setDrawerMode] = React.useState<"create" | "edit">("create")
  const [editingHoliday, setEditingHoliday] = React.useState<HolidayRecord | undefined>()
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deletingHoliday, setDeletingHoliday] = React.useState<HolidayRecord | undefined>()
  const [month, setMonth] = React.useState<Date>(new Date())

  const filteredHolidays = React.useMemo(() => {
    const query = search.trim().toLowerCase()

    return [...holidays]
      .filter((holiday) => {
        const holidayYear = new Date(holiday.date).getFullYear().toString()
        const matchesYear = yearFilter === "all" || holidayYear === yearFilter
        const matchesLocation = locationFilter === "all" || holiday.location === locationFilter
        const matchesSearch =
          !query ||
          holiday.name.toLowerCase().includes(query) ||
          holiday.location.toLowerCase().includes(query) ||
          holiday.holidayType.toLowerCase().includes(query)

        return matchesYear && matchesLocation && matchesSearch
      })
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
  }, [holidays, search, locationFilter, yearFilter])

  React.useEffect(() => {
    if (yearFilter !== "all") {
      setMonth(new Date(`${yearFilter}-01-01`))
    }
  }, [yearFilter])

  const calendarEvents = React.useMemo(() => {
    return filteredHolidays.map((holiday) => ({
      date: new Date(holiday.date),
      title: holiday.name,
      description: `${holiday.location} • ${holiday.holidayType}`,
    }))
  }, [filteredHolidays])

  const openCreateDrawer = () => {
    setEditingHoliday(undefined)
    setDrawerMode("create")
    setDrawerOpen(true)
  }

  const openEditDrawer = (holiday: HolidayRecord) => {
    setEditingHoliday(holiday)
    setDrawerMode("edit")
    setDrawerOpen(true)
  }

  const handleSubmit = (values: HolidayFormValues) => {
    if (drawerMode === "create") {
      const newHoliday: HolidayRecord = {
        id: `HL${Date.now().toString().slice(-3)}`,
        ...values,
      }
      updateHolidays((current) => [newHoliday, ...current])
      setHolidays(getHolidays())
    } else if (editingHoliday) {
      updateHolidays((current) => current.map((item) => (item.id === editingHoliday.id ? { ...item, ...values } : item)))
      setHolidays(getHolidays())
    }

    setDrawerOpen(false)
  }

  const confirmDelete = () => {
    if (!deletingHoliday) return

    updateHolidays((current) => current.filter((item) => item.id !== deletingHoliday.id))
    setHolidays(getHolidays())
    setDeleteOpen(false)
    setDeletingHoliday(undefined)
  }

  return (
    <OrgLayout section="Holiday Calendar">
      <OrgPageHeader
        icon={CalendarDays}
        title="Holiday Calendar"
        description="Manage national, regional, and company holidays by location and year with calendar and list views."
        action={
          <Button onClick={openCreateDrawer}>
            <Plus className="mr-2 h-4 w-4" />
            Add Holiday
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.1fr_0.5fr_0.4fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search holidays" className="pl-9" />
        </label>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {holidayLocations.map((location) => (
              <SelectItem key={location} value={location}>{location}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="2027">2027</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={view} onValueChange={(value) => setView(value as "calendar" | "list")} className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{month.toLocaleString("default", { month: "long", year: "numeric" })}</span>
            </div>
            <p className="text-sm text-muted-foreground">{filteredHolidays.length} holidays visible</p>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <Calendar
              month={month}
              onMonthChange={setMonth}
              modifiers={{
                holiday: calendarEvents.map((event) => event.date),
              }}
              modifiersClassNames={{
                holiday: "bg-primary/10 text-primary font-semibold",
              }}
              components={{
                DayButton: ({ day, ...props }) => {
                  const date = day.date
                  const holiday = filteredHolidays.find((item) => new Date(item.date).toDateString() === date.toDateString())
                  return (
                    <CalendarDayButton day={day} {...props}>
                      <span>{date.getDate()}</span>
                      {holiday ? <span className="text-[10px] font-medium text-primary">{holiday.name}</span> : null}
                    </CalendarDayButton>
                  )
                },
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Holiday Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHolidays.length > 0 ? (
                  filteredHolidays.map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell className="font-medium">{holiday.name}</TableCell>
                      <TableCell>{new Date(holiday.date).toLocaleDateString()}</TableCell>
                      <TableCell>{holiday.location}</TableCell>
                      <TableCell>{holiday.holidayType}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {holiday.mandatory ? <Badge>Mandatory</Badge> : null}
                          {holiday.optional ? <Badge variant="secondary">Optional</Badge> : null}
                          {holiday.recurring ? <Badge variant="outline">Recurring</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" onClick={() => openEditDrawer(holiday)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => { setDeletingHoliday(holiday); setDeleteOpen(true) }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No holidays match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <HolidayDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        initialValues={editingHoliday ? {
          name: editingHoliday.name,
          date: editingHoliday.date,
          location: editingHoliday.location,
          holidayType: editingHoliday.holidayType,
          mandatory: editingHoliday.mandatory,
          optional: editingHoliday.optional,
          recurring: editingHoliday.recurring,
        } : createEmptyHolidayFormValues()}
        onSubmit={handleSubmit}
      />

      {deletingHoliday && (
        <HolidayDeleteDialog
          holiday={deletingHoliday}
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open)
            if (!open) setDeletingHoliday(undefined)
          }}
          onConfirm={confirmDelete}
        />
      )}
    </OrgLayout>
  )
}
