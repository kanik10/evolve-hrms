import {
  organizationCostCenters,
  type OrganizationCostCenter,
  getOrganizationDepartmentOptions,
  getOrganizationBusinessUnitOptions,
} from "../../data/organizationData"

export type CostCenterStatus = OrganizationCostCenter["status"]

export type CostCenterRecord = OrganizationCostCenter

export type CostCenterFormValues = Omit<CostCenterRecord, "id">

export const initialCostCenters: CostCenterRecord[] = [...organizationCostCenters]

export const costCenterDepartments = getOrganizationDepartmentOptions()
export const costCenterBusinessUnits = getOrganizationBusinessUnitOptions()

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
