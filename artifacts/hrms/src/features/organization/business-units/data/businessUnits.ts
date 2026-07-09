export type BusinessUnitStatus = "Active" | "Inactive"

export type BusinessUnitRecord = {
  id: string
  name: string
  code: string
  head: string
  description: string
  status: BusinessUnitStatus
  departments: string[]
  locations: string[]
  costCenters: string[]
}

export type BusinessUnitFormValues = Omit<BusinessUnitRecord, "id" | "departments" | "locations" | "costCenters">

export const initialBusinessUnits: BusinessUnitRecord[] = [
  {
    id: "BU01",
    name: "Technology BU",
    code: "TECH",
    head: "Rahul Sharma",
    description: "Leads software engineering, product, and platform initiatives.",
    status: "Active",
    departments: ["Engineering", "Product", "IT"],
    locations: ["Mumbai HQ", "Bangalore Tech Park"],
    costCenters: ["Eng Core", "Platform Ops"],
  },
  {
    id: "BU02",
    name: "Commerce BU",
    code: "COMM",
    head: "Sneha Patel",
    description: "Covers sales, marketing, and customer success operations.",
    status: "Active",
    departments: ["Sales", "Marketing"],
    locations: ["Delhi NCR"],
    costCenters: ["Mkt & Sales"],
  },
  {
    id: "BU03",
    name: "Services BU",
    code: "SRV",
    head: "Vikram Reddy",
    description: "Oversees implementation, support, and delivery services.",
    status: "Inactive",
    departments: ["Operations", "Finance"],
    locations: ["Hyderabad Campus"],
    costCenters: ["Operations"],
  },
  {
    id: "BU04",
    name: "Enterprise BU",
    code: "ENT",
    head: "Anjali Desai",
    description: "Targets large strategic accounts and enterprise programs.",
    status: "Active",
    departments: ["Design", "Finance"],
    locations: ["Pune Office"],
    costCenters: ["Admin Setup"],
  },
]

export const businessUnitHeads = ["Rahul Sharma", "Sneha Patel", "Vikram Reddy", "Anjali Desai", "Priya Singh"]

export const availableDepartments = ["Engineering", "Product", "IT", "Sales", "Marketing", "Operations", "Finance", "Design", "HR"]
export const availableLocations = ["Mumbai HQ", "Bangalore Tech Park", "Delhi NCR", "Hyderabad Campus", "Pune Office"]
export const availableCostCenters = ["Eng Core", "Platform Ops", "Mkt & Sales", "Operations", "Admin Setup"]

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
