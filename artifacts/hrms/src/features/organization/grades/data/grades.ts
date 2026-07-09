export type GradeStatus = "Active" | "Inactive"

export type GradeRecord = {
  id: string
  grade: string
  level: string
  description: string
  salaryBand: string
  status: GradeStatus
}

export type GradeFormValues = Omit<GradeRecord, "id">

export const initialGrades: GradeRecord[] = [
  {
    id: "G1",
    grade: "G1",
    level: "Entry",
    description: "Early-career contributors with foundational responsibilities.",
    salaryBand: "₹4.0L - ₹6.0L",
    status: "Active",
  },
  {
    id: "G2",
    grade: "G2",
    level: "Associate",
    description: "Skilled contributors managing routine functional work independently.",
    salaryBand: "₹6.0L - ₹8.5L",
    status: "Active",
  },
  {
    id: "G3",
    grade: "G3",
    level: "Manager",
    description: "People managers handling moderate scope and cross-functional coordination.",
    salaryBand: "₹10.0L - ₹14.0L",
    status: "Active",
  },
  {
    id: "G4",
    grade: "G4",
    level: "Senior Manager",
    description: "Senior leaders driving strategic initiatives and broader teams.",
    salaryBand: "₹16.0L - ₹22.0L",
    status: "Inactive",
  },
]

export function createEmptyGradeFormValues(): GradeFormValues {
  return {
    grade: "",
    level: "",
    description: "",
    salaryBand: "",
    status: "Active",
  }
}

export let gradesStore: GradeRecord[] = [...initialGrades]

export function getGrades() {
  return gradesStore
}

export function updateGrades(next: GradeRecord[] | ((current: GradeRecord[]) => GradeRecord[])) {
  gradesStore = typeof next === "function" ? next(gradesStore) : next
  return gradesStore
}
