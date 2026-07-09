import {
  organizationBusinessUnits,
  organizationBusinessUnitHeads,
  type OrganizationBusinessUnit,
} from "../../data/organizationData"

export type BusinessUnitStatus = OrganizationBusinessUnit["status"]

export type BusinessUnitRecord = OrganizationBusinessUnit

export type BusinessUnitFormValues = Omit<BusinessUnitRecord, "id" | "departments" | "locations" | "costCenters">

export const initialBusinessUnits: BusinessUnitRecord[] = [...organizationBusinessUnits]

export const businessUnitHeads = [...organizationBusinessUnitHeads]

export const availableDepartments = Array.from(new Set(organizationBusinessUnits.flatMap((unit) => unit.departments)))
export const availableLocations = Array.from(new Set(organizationBusinessUnits.flatMap((unit) => unit.locations)))
export const availableCostCenters = Array.from(new Set(organizationBusinessUnits.flatMap((unit) => unit.costCenters)))

export function createEmptyBusinessUnitFormValues(): BusinessUnitFormValues {
  return {
    name: "",
    code: "",
    head: businessUnitHeads[0],
    description: "",
    status: "Active",
  }
}

export let businessUnitsStore: BusinessUnitRecord[] = [...initialBusinessUnits]

export function getBusinessUnits() {
  return businessUnitsStore
}

export function getBusinessUnitById(id: string) {
  return businessUnitsStore.find((unit) => unit.id === id)
}

export function updateBusinessUnits(next: BusinessUnitRecord[] | ((current: BusinessUnitRecord[]) => BusinessUnitRecord[])) {
  businessUnitsStore = typeof next === "function" ? next(businessUnitsStore) : next
  return businessUnitsStore
}
