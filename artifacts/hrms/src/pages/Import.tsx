import * as React from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { PageHeader } from "@/components/PageHeader"
import { FileUploadCard } from "@/components/FileUploadCard"
import { DataTable } from "@/components/DataTable"
import { Badge } from "@/components/ui/badge"

export default function Import() {
  const historyData = [
    { id: "IMP-001", type: "Employee Master", date: "24 Aug 2024, 10:30 AM", status: "Success", records: 45 },
    { id: "IMP-002", type: "Leave Balances", date: "22 Aug 2024, 02:15 PM", status: "Failed", records: 120 },
    { id: "IMP-003", type: "Salary Structures", date: "20 Aug 2024, 09:00 AM", status: "Success", records: 12 },
  ]

  const columns = [
    { header: "Import ID", accessor: (row: any) => <span className="font-mono text-muted-foreground">{row.id}</span> },
    { header: "Import Type", accessor: (row: any) => <span className="font-medium">{row.type}</span> },
    { header: "Date & Time", accessor: (row: any) => row.date },
    { header: "Records", accessor: (row: any) => row.records },
    { header: "Status", accessor: (row: any) => (
      <Badge variant={row.status === 'Success' ? 'success' : 'destructive'}>{row.status}</Badge>
    )},
  ]

  return (
    <AppLayout breadcrumb={<span className="text-sm font-medium">Bulk Upload</span>}>
      <PageHeader 
        title="Bulk Data Import" 
        description="Upload CSV or Excel files to bulk import data into the system."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <FileUploadCard title="Employee Master" description="Import new employees or update existing ones" />
        <FileUploadCard title="Leave Balances" description="Bulk upload leave balances for the year" />
        <FileUploadCard title="Attendance Logs" description="Upload biometric or access card logs" />
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Recent Imports</h3>
        <DataTable columns={columns} data={historyData} />
      </div>
    </AppLayout>
  )
}
