import * as React from "react"
import { DollarSign, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { type CostCenterFormValues, createEmptyCostCenterFormValues, costCenterBusinessUnits, costCenterDepartments } from "../data/costCenters"

interface CostCenterDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initialValues?: CostCenterFormValues
  onSubmit: (values: CostCenterFormValues) => void
}

export function CostCenterDrawer({ open, onOpenChange, mode, initialValues, onSubmit }: CostCenterDrawerProps) {
  const [values, setValues] = React.useState<CostCenterFormValues>(initialValues ?? createEmptyCostCenterFormValues())

  React.useEffect(() => {
    setValues(initialValues ?? createEmptyCostCenterFormValues())
  }, [initialValues, open])

  const handleChange = <K extends keyof CostCenterFormValues>(key: K, value: CostCenterFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle>{mode === "create" ? "Add cost center" : "Edit cost center"}</SheetTitle>
              <SheetDescription>
                {mode === "create" ? "Create a new cost center for tracking budgets and allocations." : "Update the cost center details and assignments."}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Cost Center Name</Label>
              <Input id="name" value={values.name} onChange={(event) => handleChange("name", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" value={values.code} onChange={(event) => handleChange("code", event.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={values.department} onValueChange={(value) => handleChange("department", value)}>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {costCenterDepartments.map((department) => (
                    <SelectItem key={department} value={department}>{department}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessUnit">Business Unit</Label>
              <Select value={values.businessUnit} onValueChange={(value) => handleChange("businessUnit", value)}>
                <SelectTrigger id="businessUnit">
                  <SelectValue placeholder="Select business unit" />
                </SelectTrigger>
                <SelectContent>
                  {costCenterBusinessUnits.map((businessUnit) => (
                    <SelectItem key={businessUnit} value={businessUnit}>{businessUnit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget</Label>
            <Input id="budget" value={values.budget} onChange={(event) => handleChange("budget", event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={values.status} onValueChange={(value) => handleChange("status", value as CostCenterFormValues["status"])}>
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
            {mode === "create" ? "Create cost center" : "Save changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
