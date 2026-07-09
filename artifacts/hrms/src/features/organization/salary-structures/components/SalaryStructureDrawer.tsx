import * as React from "react"
import { Banknote, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SalaryStructureBuilder } from "./SalaryStructureBuilder"
import { type SalaryStructureFormValues, createEmptySalaryStructureFormValues } from "../data/salaryStructures"

interface SalaryStructureDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initialValues?: SalaryStructureFormValues
  onSubmit: (values: SalaryStructureFormValues) => void
}

export function SalaryStructureDrawer({ open, onOpenChange, mode, initialValues, onSubmit }: SalaryStructureDrawerProps) {
  const [values, setValues] = React.useState<SalaryStructureFormValues>(initialValues ?? createEmptySalaryStructureFormValues())

  React.useEffect(() => {
    setValues(initialValues ?? createEmptySalaryStructureFormValues())
  }, [initialValues, open])

  const handleChange = (key: keyof SalaryStructureFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Banknote className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle>{mode === "create" ? "Create salary structure" : "Edit salary structure"}</SheetTitle>
              <SheetDescription>
                {mode === "create" ? "Design a compensation structure with earnings, deductions, and live net salary calculations." : "Adjust the salary structure fields and preview the updated net pay."}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SalaryStructureBuilder values={values} onChange={handleChange} />

        <div className="mt-8 flex justify-end gap-3 border-t pt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={() => onSubmit(values)}>
            {mode === "create" ? "Create structure" : "Save changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
