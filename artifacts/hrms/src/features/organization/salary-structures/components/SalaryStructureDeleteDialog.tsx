import * as React from "react"
import { AlertTriangle, Trash2 } from "lucide-react"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { type SalaryStructureRecord } from "../data/salaryStructures"

interface SalaryStructureDeleteDialogProps {
  salaryStructure: SalaryStructureRecord
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function SalaryStructureDeleteDialog({ salaryStructure, open, onOpenChange, onConfirm }: SalaryStructureDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <AlertDialogTitle>Delete "{salaryStructure.structureName}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove the salary structure from the organization payroll configuration.
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
