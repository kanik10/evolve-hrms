export type DepartmentStatus = "Active" | "Inactive" | "Archived"

export interface Department {
  id: string
  code: string
  name: string
  headId: string
  head: string
  businessUnit: string
  costCenter: string
  description: string
  status: DepartmentStatus
  employeeCount: number
  budget: string
  locations: string[]
  createdAt: string
  updatedAt: string
}

export type DepartmentFormValues = {
  name: string
  code: string
  headId: string
  businessUnit: string
  costCenter: string
  description: string
  status: "Active" | "Inactive"
}
