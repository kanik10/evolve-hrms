import * as React from "react"
import { type LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface FormSectionProps {
  icon: LucideIcon
  title: string
  description?: string
  children: React.ReactNode
}

export function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: FormSectionProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {description && (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pb-6 pt-6">{children}</CardContent>
    </Card>
  )
}
