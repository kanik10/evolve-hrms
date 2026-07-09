import * as React from "react"
import { CalendarDays, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { type HolidayFormValues, createEmptyHolidayFormValues, holidayLocations, holidayTypes } from "../data/holidays"

interface HolidayDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initialValues?: HolidayFormValues
  onSubmit: (values: HolidayFormValues) => void
}

export function HolidayDrawer({ open, onOpenChange, mode, initialValues, onSubmit }: HolidayDrawerProps) {
  const [values, setValues] = React.useState<HolidayFormValues>(initialValues ?? createEmptyHolidayFormValues())

  React.useEffect(() => {
    setValues(initialValues ?? createEmptyHolidayFormValues())
  }, [initialValues, open])

  const handleChange = <K extends keyof HolidayFormValues>(key: K, value: HolidayFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle>{mode === "create" ? "Add holiday" : "Edit holiday"}</SheetTitle>
              <SheetDescription>
                {mode === "create" ? "Create a new holiday entry for a location and year." : "Update the holiday details and rules."}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Holiday Name</Label>
              <Input id="name" value={values.name} onChange={(event) => handleChange("name", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={values.date} onChange={(event) => handleChange("date", event.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select value={values.location} onValueChange={(value) => handleChange("location", value)}>
                <SelectTrigger id="location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {holidayLocations.map((location) => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="holidayType">Holiday Type</Label>
              <Select value={values.holidayType} onValueChange={(value) => handleChange("holidayType", value)}>
                <SelectTrigger id="holidayType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {holidayTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox id="mandatory" checked={values.mandatory} onCheckedChange={(checked) => handleChange("mandatory", Boolean(checked))} />
              <Label htmlFor="mandatory" className="cursor-pointer">Mandatory</Label>
            </div>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox id="optional" checked={values.optional} onCheckedChange={(checked) => handleChange("optional", Boolean(checked))} />
              <Label htmlFor="optional" className="cursor-pointer">Optional</Label>
            </div>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox id="recurring" checked={values.recurring} onCheckedChange={(checked) => handleChange("recurring", Boolean(checked))} />
              <Label htmlFor="recurring" className="cursor-pointer">Recurring</Label>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3 border-t pt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={() => onSubmit(values)}>
            {mode === "create" ? "Create holiday" : "Save changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
