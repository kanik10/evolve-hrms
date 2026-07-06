import * as React from "react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"

export function DataTable({ 
  columns, 
  data, 
  onRowClick 
}: { 
  columns: { header: string, accessor: (row: any) => React.ReactNode, className?: string }[],
  data: any[],
  onRowClick?: (row: any) => void
}) {
  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border rounded-lg">
        No records found.
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-card/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent bg-muted/50">
            {columns.map((col, i) => (
              <TableHead key={i} className={col.className}>{col.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow 
              key={i} 
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
            >
              {columns.map((col, j) => (
                <TableCell key={j} className={col.className}>
                  {col.accessor(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
