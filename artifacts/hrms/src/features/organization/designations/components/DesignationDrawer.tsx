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
import { type Designation, type DesignationFormValues } from "../types"
import {
  DesignationForm,
  designationFormSchema,
  DEFAULT_DESG_FORM_VALUES,
} from "./DesignationForm"

interface DesignationDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  designation?: Designation
  onSubmit: (values: DesignationFormValues) => void
}

export function DesignationDrawer({
  open,
  onOpenChange,
  mode,
  designation,
  onSubmit,
}: DesignationDrawerProps) {
  const isEdit = mode === "edit"

  const form = useForm<DesignationFormValues>({
    resolver: zodResolver(designationFormSchema),
    defaultValues: DEFAULT_DESG_FORM_VALUES,
    mode: "onTouched",
  })

  const { isSubmitting } = form.formState

  React.useEffect(() => {
    if (!open) return
    if (isEdit && designation) {
      form.reset({
        name: designation.name,
        code: designation.code,
        departmentId: designation.departmentId,
        gradeId: designation.gradeId,
        description: designation.description,
        status:
          designation.status === "Archived" ? "Active" : designation.status,
      })
    } else {
      form.reset(DEFAULT_DESG_FORM_VALUES)
    }
  }, [open, mode, designation?.id])

  function handleSubmit(values: DesignationFormValues) {
    onSubmit(values)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
        <SheetHeader className="px-6 py-5">
          <SheetTitle>
            {isEdit ? "Edit Designation" : "Add Designation"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the details for this designation."
              : "Fill in the details to create a new designation."}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <DesignationForm
            key={`${mode}-${designation?.id ?? "new"}-${open ? 1 : 0}`}
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
            {isEdit ? "Save Changes" : "Create Designation"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
