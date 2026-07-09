import { getOrganizationDepartmentOptions, organizationDesignations, type OrganizationDesignation } from "../../data/organizationData"

export type Designation = OrganizationDesignation

export const DEPARTMENT_OPTIONS = getOrganizationDepartmentOptions().map((name, index) => ({ id: `dept-${String(index + 1).padStart(3, "0")}`, name }))

export const GRADE_OPTIONS = [
  { id: "G1", band: "Executive", salaryRange: "₹3L – ₹6L" },
  { id: "G2", band: "Senior Executive", salaryRange: "₹6L – ₹10L" },
  { id: "G3", band: "Assistant Manager", salaryRange: "₹10L – ₹15L" },
  { id: "G4", band: "Manager", salaryRange: "₹15L – ₹25L" },
  { id: "G5", band: "Senior Manager", salaryRange: "₹25L – ₹40L" },
  { id: "G6", band: "Director", salaryRange: "₹40L – ₹70L" },
  { id: "G7", band: "VP", salaryRange: "₹70L+" },
] as const

export const mockDesignations: Designation[] = [...organizationDesignations]
