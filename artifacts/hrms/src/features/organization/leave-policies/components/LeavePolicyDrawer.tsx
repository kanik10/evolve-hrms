import * as React from "react"
import { FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { type LeavePolicyFormValues, createEmptyLeavePolicyFormValues } from "../data/leavePolicies"

interface LeavePolicyDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initialValues?: LeavePolicyFormValues
  onSubmit: (values: LeavePolicyFormValues) => void
}

export function LeavePolicyDrawer({ open, onOpenChange, mode, initialValues, onSubmit }: LeavePolicyDrawerProps) {
  const [values, setValues] = React.useState<LeavePolicyFormValues>(initialValues ?? createEmptyLeavePolicyFormValues())

  React.useEffect(() => {
    setValues(initialValues ?? createEmptyLeavePolicyFormValues())
  }, [initialValues, open])

  const handleChange = <K extends keyof LeavePolicyFormValues>(key: K, value: LeavePolicyFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle>{mode === "create" ? "Add leave policy" : "Edit leave policy"}</SheetTitle>
              <SheetDescription>
                {mode === "create" ? "Create a new leave policy for employee eligibility groups." : "Update the leave policy rules and eligibility."}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="policyName">Policy Name</Label>
            <Input id="policyName" value={values.policyName} onChange={(event) => handleChange("policyName", event.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="annualLeave">Annual Leave</Label>
              <Input id="annualLeave" type="number" min="0" value={values.annualLeave} onChange={(event) => handleChange("annualLeave", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="casualLeave">Casual Leave</Label>
              <Input id="casualLeave" type="number" min="0" value={values.casualLeave} onChange={(event) => handleChange("casualLeave", event.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sickLeave">Sick Leave</Label>
              <Input id="sickLeave" type="number" min="0" value={values.sickLeave} onChange={(event) => handleChange("sickLeave", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carryForward">Carry Forward</Label>
              <Input id="carryForward" type="number" min="0" value={values.carryForward} onChange={(event) => handleChange("carryForward", event.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="negativeBalance">Negative Balance</Label>
              <Select value={values.negativeBalance} onValueChange={(value) => handleChange("negativeBalance", value)}>
                <SelectTrigger id="negativeBalance">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="encashment">Encashment</Label>
              <Select value={values.encashment} onValueChange={(value) => handleChange("encashment", value)}>
                <SelectTrigger id="encashment">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eligibility">Eligibility</Label>
            <Input id="eligibility" value={values.eligibility} onChange={(event) => handleChange("eligibility", event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={values.status} onValueChange={(value) => handleChange("status", value as LeavePolicyFormValues["status"])}>
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
            {mode === "create" ? "Create leave policy" : "Save changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
