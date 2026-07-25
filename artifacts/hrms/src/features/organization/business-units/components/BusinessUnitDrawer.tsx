import * as React from "react"
import { Building2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MasterForm } from "../../components/MasterForm"
import { type BusinessUnitFormValues, createEmptyBusinessUnitFormValues, businessUnitHeads } from "../data/businessUnits"

interface BusinessUnitDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initialValues?: BusinessUnitFormValues
  onSubmit: (values: BusinessUnitFormValues) => void
}

export function BusinessUnitDrawer({
  open,
  onOpenChange,
  mode,
  initialValues,
  onSubmit,
}: BusinessUnitDrawerProps) {
  const [values, setValues] = React.useState<BusinessUnitFormValues>(initialValues ?? createEmptyBusinessUnitFormValues())

  React.useEffect(() => {
    setValues(initialValues ?? createEmptyBusinessUnitFormValues())
  }, [initialValues, open])

  const handleChange = <K extends keyof BusinessUnitFormValues>(key: K, value: BusinessUnitFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <MasterForm
      open={open}
      onOpenChange={onOpenChange}
      icon={Building2}
      title={mode === "create" ? "Add business unit" : "Edit business unit"}
      description={mode === "create" ? "Create a new business unit and assign its leadership." : "Update the business unit details and ownership."}
      cancelIcon={<X className="mr-2 h-4 w-4" />}
      submitLabel={mode === "create" ? "Create business unit" : "Save changes"}
      onSubmit={() => onSubmit(values)}
    >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Business Unit</Label>
              <Input id="name" value={values.name} onChange={(event) => handleChange("name", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" value={values.code} onChange={(event) => handleChange("code", event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="head">Head</Label>
            <Select value={values.head} onValueChange={(value) => handleChange("head", value)}>
              <SelectTrigger id="head">
                <SelectValue placeholder="Select head" />
              </SelectTrigger>
              <SelectContent>
                {businessUnitHeads.map((head) => (
                  <SelectItem key={head} value={head}>
                    {head}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} value={values.description} onChange={(event) => handleChange("description", event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={values.status} onValueChange={(value) => handleChange("status", value as BusinessUnitFormValues["status"])}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
    </MasterForm>
  )
}
