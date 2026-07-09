import * as React from "react"
import { type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface MasterFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  icon: LucideIcon
  title: string
  description: string
  cancelLabel?: string
  submitLabel: string
  onSubmit: () => void
  children: React.ReactNode
}

export function MasterForm({ open, onOpenChange, icon: Icon, title, description, cancelLabel = "Cancel", submitLabel, onSubmit, children }: MasterFormProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5">{children}</div>

        <div className="mt-8 flex justify-end gap-3 border-t pt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{cancelLabel}</Button>
          <Button onClick={onSubmit}>{submitLabel}</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
