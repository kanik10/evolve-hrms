import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { type Department, type DepartmentFormValues } from "../types"
import {
  DepartmentForm,
  departmentFormSchema,
  DEFAULT_DEPT_FORM_VALUES,
} from "./DepartmentForm"
import { DEPARTMENT_HEADS } from "../data/mock"

interface DepartmentDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  department?: Department
  onSubmit: (values: DepartmentFormValues) => void
}

export function DepartmentDrawer({
  open,
  onOpenChange,
  mode,
  department,
  onSubmit,
}: DepartmentDrawerProps) {
  const isEdit = mode === "edit"

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: DEFAULT_DEPT_FORM_VALUES,
    mode: "onTouched",
  })

  const { isSubmitting } = form.formState

  React.useEffect(() => {
    if (!open) return
    if (isEdit && department) {
      form.reset({
        name: department.name,
        code: department.code,
        headId: department.headId,
        businessUnit: department.businessUnit,
        costCenter: department.costCenter,
        description: department.description,
        status: department.status === "Archived" ? "Active" : department.status,
      })
    } else {
      form.reset(DEFAULT_DEPT_FORM_VALUES)
    }
  }, [open, mode, department?.id])

  function handleSubmit(values: DepartmentFormValues) {
    onSubmit(values)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
        <SheetHeader className="px-6 py-5">
          <SheetTitle>
            {isEdit ? "Edit Department" : "Add Department"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the details for this department."
              : "Fill in the details to create a new department."}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <DepartmentForm
            key={`${mode}-${department?.id ?? "new"}-${open ? 1 : 0}`}
            form={form}
            isEdit={isEdit}
          />
        </div>

        <Separator />

        <SheetFooter className="flex-row justify-end gap-2 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={form.handleSubmit(handleSubmit)}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Department"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
