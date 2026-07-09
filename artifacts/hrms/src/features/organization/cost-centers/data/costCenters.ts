export type CostCenterStatus = "Active" | "Inactive"

export type CostCenterRecord = {
  id: string
  name: string
  code: string
  department: string
  businessUnit: string
  status: CostCenterStatus
  budget: string
}

export type CostCenterFormValues = Omit<CostCenterRecord, "id">

export const initialCostCenters: CostCenterRecord[] = [
  {
    id: "CC1",
    name: "Engineering Core",
    code: "ENG-01",
    department: "Engineering",
    businessUnit: "Technology BU",
    status: "Active",
    budget: "₹4.5Cr",
  },
  {
    id: "CC2",
    name: "Marketing & Sales",
    code: "MKT-02",
    department: "Sales",
    businessUnit: "Commerce BU",
    status: "Active",
    budget: "₹2.2Cr",
  },
  {
    id: "CC3",
    name: "Operations Support",
    code: "OPS-03",
    department: "Operations",
    businessUnit: "Services BU",
    status: "Inactive",
    budget: "₹1.1Cr",
  },
  {
    id: "CC4",
    name: "Admin & Finance",
    code: "ADM-04",
    department: "Finance",
    businessUnit: "Enterprise BU",
    status: "Active",
    budget: "₹90L",
  },
]

export const costCenterDepartments = ["Engineering", "Product", "Sales", "Marketing", "Operations", "Finance", "HR", "IT", "Design"]
export const costCenterBusinessUnits = ["Technology BU", "Commerce BU", "Services BU", "Enterprise BU"]

export function createEmptyCostCenterFormValues(): CostCenterFormValues {
  return {
    name: "",
    code: "",
    department: costCenterDepartments[0],
    businessUnit: costCenterBusinessUnits[0],
    status: "Active",
    budget: "₹0",
  }
}

export let costCentersStore: CostCenterRecord[] = [...initialCostCenters]

export function getCostCenters() {
  return costCentersStore
}

export function getCostCenterById(id: string) {
  return costCentersStore.find((costCenter) => costCenter.id === id)
}

export function updateCostCenters(next: CostCenterRecord[] | ((current: CostCenterRecord[]) => CostCenterRecord[])) {
  costCentersStore = typeof next === "function" ? next(costCentersStore) : next
  return costCentersStore
}
