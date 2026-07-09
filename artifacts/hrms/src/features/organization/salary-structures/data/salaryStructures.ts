import { organizationSalaryStructures, type OrganizationSalaryStructure, getOrganizationDepartmentOptions } from "../../data/organizationData"

export type SalaryStructureRecord = OrganizationSalaryStructure

export type SalaryStructureFormValues = Omit<SalaryStructureRecord, "id">

export const initialSalaryStructures: SalaryStructureRecord[] = [...organizationSalaryStructures]

export const salaryStructureDepartments = getOrganizationDepartmentOptions()

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
