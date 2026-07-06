import * as React from "react"
import { FileUp } from "lucide-react"

export function FileUploadCard({ title, description }: { title: string, description?: string }) {
  return (
    <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center bg-card/30 hover:bg-card/50 transition-colors cursor-pointer text-center">
      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
        <FileUp className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-6">{description}</p>}
      <p className="text-xs text-muted-foreground">Drag and drop files here or click to browse</p>
    </div>
  )
}
