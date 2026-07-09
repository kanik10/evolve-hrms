import * as React from "react"
import { UserCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { type EmploymentTypeFormValues, createEmptyEmploymentTypeFormValues } from "../data/employmentTypes"

interface EmploymentTypeDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initialValues?: EmploymentTypeFormValues
  onSubmit: (values: EmploymentTypeFormValues) => void
}

export function EmploymentTypeDrawer({ open, onOpenChange, mode, initialValues, onSubmit }: EmploymentTypeDrawerProps) {
  const [values, setValues] = React.useState<EmploymentTypeFormValues>(initialValues ?? createEmptyEmploymentTypeFormValues())

  React.useEffect(() => {
    setValues(initialValues ?? createEmptyEmploymentTypeFormValues())
  }, [initialValues, open])

  const handleChange = <K extends keyof EmploymentTypeFormValues>(key: K, value: EmploymentTypeFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle>{mode === "create" ? "Add employment type" : "Edit employment type"}</SheetTitle>
              <SheetDescription>
                {mode === "create" ? "Create a new employment type for workforce classification." : "Update the employment type details and policy settings."}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="typeName">Type Name</Label>
            <Input id="typeName" value={values.typeName} onChange={(event) => handleChange("typeName", event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={values.description} onChange={(event) => handleChange("description", event.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="benefitsEligible">Benefits Eligible</Label>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <Checkbox id="benefitsEligible" checked={values.benefitsEligible} onCheckedChange={(checked) => handleChange("benefitsEligible", Boolean(checked))} />
                <span className="text-sm">Eligible for benefits</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="noticePeriod">Notice Period</Label>
              <Input id="noticePeriod" value={values.noticePeriod} onChange={(event) => handleChange("noticePeriod", event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={values.status} onValueChange={(value) => handleChange("status", value as EmploymentTypeFormValues["status"])}>
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
            {mode === "create" ? "Create employment type" : "Save changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
