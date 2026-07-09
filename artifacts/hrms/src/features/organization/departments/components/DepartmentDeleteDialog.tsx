import * as React from "react"
import { AlertTriangle, Archive, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { type Department } from "../types"

interface DepartmentDeleteDialogProps {
  department: Department
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (action: "delete" | "archive") => void
}

export function DepartmentDeleteDialog({
  department,
  open,
  onOpenChange,
  onConfirm,
}: DepartmentDeleteDialogProps) {
  const isAlreadyArchived = department.status === "Archived"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <AlertDialogTitle>Delete "{department.name}"?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                This will permanently remove the{" "}
                <span className="font-medium text-foreground">
                  {department.name}
                </span>{" "}
                department and all associated configurations. This action cannot
                be undone.
              </p>
              {!isAlreadyArchived && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-400">
                  <p className="text-xs font-medium">
                    Consider archiving instead
                  </p>
                  <p className="mt-0.5 text-xs">
                    Archiving preserves historical records and employee
                    associations while deactivating the department.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-row gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <div className="flex flex-1 gap-2 sm:flex-none">
            {!isAlreadyArchived && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onConfirm("archive")}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            )}
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => onConfirm("delete")}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
