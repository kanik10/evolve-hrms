export type SalaryStructureRecord = {
  id: string
  structureName: string
  grade: string
  basic: string
  hra: string
  specialAllowance: string
  bonus: string
  pf: string
  esic: string
  professionalTax: string
  tds: string
  status: "Active" | "Inactive"
}

export type SalaryStructureFormValues = Omit<SalaryStructureRecord, "id">

export const initialSalaryStructures: SalaryStructureRecord[] = [
  {
    id: "SAL1",
    structureName: "Manager Grade Structure",
    grade: "Manager",
    basic: "50000",
    hra: "20000",
    specialAllowance: "15000",
    bonus: "5000",
    pf: "1800",
    esic: "0",
    professionalTax: "200",
    tds: "3000",
    status: "Active",
  },
  {
    id: "SAL2",
    structureName: "Executive Structure",
    grade: "Executive",
    basic: "35000",
    hra: "14000",
    specialAllowance: "9000",
    bonus: "3000",
    pf: "1400",
    esic: "0",
    professionalTax: "200",
    tds: "1500",
    status: "Active",
  },
]

export function createEmptySalaryStructureFormValues(): SalaryStructureFormValues {
  return {
    structureName: "",
    grade: "",
    basic: "40000",
    hra: "12000",
    specialAllowance: "8000",
    bonus: "3000",
    pf: "1200",
    esic: "0",
    professionalTax: "200",
    tds: "1000",
    status: "Active",
  }
}

export let salaryStructuresStore: SalaryStructureRecord[] = [...initialSalaryStructures]

export function getSalaryStructures() {
  return salaryStructuresStore
}

export function updateSalaryStructures(next: SalaryStructureRecord[] | ((current: SalaryStructureRecord[]) => SalaryStructureRecord[])) {
  salaryStructuresStore = typeof next === "function" ? next(salaryStructuresStore) : next
  return salaryStructuresStore
}

export function calculateNetSalary(values: SalaryStructureFormValues) {
  const earnings = [Number(values.basic), Number(values.hra), Number(values.specialAllowance), Number(values.bonus)]
    .reduce((sum, amount) => sum + (Number.isFinite(amount) ? amount : 0), 0)

  const deductions = [Number(values.pf), Number(values.esic), Number(values.professionalTax), Number(values.tds)]
    .reduce((sum, amount) => sum + (Number.isFinite(amount) ? amount : 0), 0)

  return earnings - deductions
}
