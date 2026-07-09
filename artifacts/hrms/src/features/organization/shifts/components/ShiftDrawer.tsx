import * as React from "react"
import { Clock3, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { type ShiftFormValues, createEmptyShiftFormValues, weeklyOffOptions } from "../data/shifts"

interface ShiftDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initialValues?: ShiftFormValues
  onSubmit: (values: ShiftFormValues) => void
}

export function ShiftDrawer({ open, onOpenChange, mode, initialValues, onSubmit }: ShiftDrawerProps) {
  const [values, setValues] = React.useState<ShiftFormValues>(initialValues ?? createEmptyShiftFormValues())

  React.useEffect(() => {
    setValues(initialValues ?? createEmptyShiftFormValues())
  }, [initialValues, open])

  const handleChange = <K extends keyof ShiftFormValues>(key: K, value: ShiftFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Clock3 className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle>{mode === "create" ? "Add shift" : "Edit shift"}</SheetTitle>
              <SheetDescription>
                {mode === "create" ? "Create a new shift definition for staff scheduling." : "Update the shift timings and policy settings."}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="shiftName">Shift Name</Label>
            <Input id="shiftName" value={values.shiftName} onChange={(event) => handleChange("shiftName", event.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input id="startTime" type="time" value={values.startTime} onChange={(event) => handleChange("startTime", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" type="time" value={values.endTime} onChange={(event) => handleChange("endTime", event.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="graceTime">Grace Time</Label>
              <Input id="graceTime" type="number" min="0" value={values.graceTime} onChange={(event) => handleChange("graceTime", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="breakDuration">Break Duration</Label>
              <Input id="breakDuration" type="number" min="0" value={values.breakDuration} onChange={(event) => handleChange("breakDuration", event.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weeklyOff">Weekly Off</Label>
              <Select value={values.weeklyOff} onValueChange={(value) => handleChange("weeklyOff", value)}>
                <SelectTrigger id="weeklyOff">
                  <SelectValue placeholder="Select weekly off" />
                </SelectTrigger>
                <SelectContent>
                  {weeklyOffOptions.map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={values.status} onValueChange={(value) => handleChange("status", value as ShiftFormValues["status"])}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3 border-t pt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={() => onSubmit(values)}>
            {mode === "create" ? "Create shift" : "Save changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
