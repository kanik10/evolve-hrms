export type EmploymentTypeStatus = "Active" | "Inactive"

export type EmploymentTypeRecord = {
  id: string
  typeName: string
  description: string
  benefitsEligible: boolean
  noticePeriod: string
  status: EmploymentTypeStatus
}

export type EmploymentTypeFormValues = Omit<EmploymentTypeRecord, "id">

export const initialEmploymentTypes: EmploymentTypeRecord[] = [
  {
    id: "ET1",
    typeName: "Permanent",
    description: "Full-time employees with standard benefits and long-term employment.",
    benefitsEligible: true,
    noticePeriod: "60 days",
    status: "Active",
  },
  {
    id: "ET2",
    typeName: "Contract",
    description: "Fixed-term employees engaged for a defined project or duration.",
    benefitsEligible: false,
    noticePeriod: "30 days",
    status: "Active",
  },
  {
    id: "ET3",
    typeName: "Consultant",
    description: "Specialist external resources engaged for advisory and project work.",
    benefitsEligible: false,
    noticePeriod: "15 days",
    status: "Active",
  },
  {
    id: "ET4",
    typeName: "Intern",
    description: "Temporary learners or trainees with a defined program period.",
    benefitsEligible: false,
    noticePeriod: "7 days",
    status: "Inactive",
  },
  {
    id: "ET5",
    typeName: "Freelancer",
    description: "Independent workers engaged on a task or project basis.",
    benefitsEligible: false,
    noticePeriod: "0 days",
    status: "Active",
  },
]

export function createEmptyEmploymentTypeFormValues(): EmploymentTypeFormValues {
  return {
    typeName: "",
    description: "",
    benefitsEligible: false,
    noticePeriod: "",
    status: "Active",
  }
}

export let employmentTypesStore: EmploymentTypeRecord[] = [...initialEmploymentTypes]

export function getEmploymentTypes() {
  return employmentTypesStore
}

export function updateEmploymentTypes(next: EmploymentTypeRecord[] | ((current: EmploymentTypeRecord[]) => EmploymentTypeRecord[])) {
  employmentTypesStore = typeof next === "function" ? next(employmentTypesStore) : next
  return employmentTypesStore
}
