import * as React from "react"
import { MapPin, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { type LocationFormValues, businessUnits, createEmptyLocationFormValues } from "../data/locations"

interface LocationDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initialValues?: LocationFormValues
  onSubmit: (values: LocationFormValues) => void
}

export function LocationDrawer({
  open,
  onOpenChange,
  mode,
  initialValues,
  onSubmit,
}: LocationDrawerProps) {
  const [values, setValues] = React.useState<LocationFormValues>(
    initialValues ?? createEmptyLocationFormValues()
  )

  React.useEffect(() => {
    setValues(initialValues ?? createEmptyLocationFormValues())
  }, [initialValues, open])

  const handleChange = <K extends keyof LocationFormValues>(key: K, value: LocationFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle>{mode === "create" ? "Add location" : "Edit location"}</SheetTitle>
              <SheetDescription>
                {mode === "create"
                  ? "Create a new office location for your organization."
                  : "Update your location details and working preferences."}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name</Label>
              <Input id="name" value={values.name} onChange={(e) => handleChange("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Location Code</Label>
              <Input id="code" value={values.code} onChange={(e) => handleChange("code", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" rows={3} value={values.address} onChange={(e) => handleChange("address", e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={values.city} onChange={(e) => handleChange("city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={values.state} onChange={(e) => handleChange("state", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={values.country} onChange={(e) => handleChange("country", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" value={values.timezone} onChange={(e) => handleChange("timezone", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workingHours">Working Hours</Label>
              <Input id="workingHours" value={values.workingHours} onChange={(e) => handleChange("workingHours", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessUnit">Business Unit</Label>
              <Select value={values.businessUnit} onValueChange={(value) => handleChange("businessUnit", value)}>
                <SelectTrigger id="businessUnit">
                  <SelectValue placeholder="Select business unit" />
                </SelectTrigger>
                <SelectContent>
                  {businessUnits.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={values.status} onValueChange={(value) => handleChange("status", value as LocationFormValues["status"])}>
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

        <div className="mt-8 flex justify-end gap-3 border-t pt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={() => onSubmit(values)}>
            {mode === "create" ? "Create location" : "Save changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
