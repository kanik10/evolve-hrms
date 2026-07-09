export type DesignationStatus = "Active" | "Inactive" | "Archived"

export interface Designation {
  id: string
  code: string
  name: string
  departmentId: string
  department: string
  gradeId: string
  grade: string
  description: string
  status: DesignationStatus
  employeeCount: number
  createdAt: string
  updatedAt: string
}

export type DesignationFormValues = {
  name: string
  code: string
  departmentId: string
  gradeId: string
  description: string
  status: "Active" | "Inactive"
}
