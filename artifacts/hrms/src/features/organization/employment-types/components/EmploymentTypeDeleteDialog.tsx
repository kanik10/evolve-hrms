import * as React from "react"
import { AlertTriangle, Trash2 } from "lucide-react"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { type EmploymentTypeRecord } from "../data/employmentTypes"

interface EmploymentTypeDeleteDialogProps {
  employmentType: EmploymentTypeRecord
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function EmploymentTypeDeleteDialog({ employmentType, open, onOpenChange, onConfirm }: EmploymentTypeDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <AlertDialogTitle>Delete "{employmentType.typeName}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove the employment type and any policy references tied to it.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
