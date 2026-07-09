import {
  organizationLocations,
  type OrganizationLocation,
  getOrganizationBusinessUnitOptions,
} from "../../data/organizationData"

export type LocationStatus = OrganizationLocation["status"]

export type LocationRecord = OrganizationLocation

export type LocationFormValues = Omit<LocationRecord, "id">

export const businessUnits = getOrganizationBusinessUnitOptions()

export const initialLocations: LocationRecord[] = [...organizationLocations]

export const locationEmployees: Record<string, Array<{ name: string; role: string; email: string }>> = {
  L01: [
    { name: "Rahul Sharma", role: "Regional Director", email: "rahul.sharma@evolvehr.com" },
    { name: "Priya Singh", role: "HR Manager", email: "priya.singh@evolvehr.com" },
  ],
  L02: [
    { name: "Sneha Patel", role: "Engineering Lead", email: "sneha.patel@evolvehr.com" },
    { name: "Karan Mehta", role: "Product Manager", email: "karan.mehta@evolvehr.com" },
  ],
  L03: [
    { name: "Anjali Desai", role: "Sales Lead", email: "anjali.desai@evolvehr.com" },
  ],
  L04: [
    { name: "Vikram Reddy", role: "Operations Lead", email: "vikram.reddy@evolvehr.com" },
  ],
  L05: [
    { name: "Megha Gupta", role: "Design Manager", email: "megha.gupta@evolvehr.com" },
    { name: "Ravi Kumar", role: "Finance Controller", email: "ravi.kumar@evolvehr.com" },
  ],
}

export const locationDepartments: Record<string, Array<{ name: string; head: string }>> = {
  L01: [
    { name: "Engineering", head: "Rahul Sharma" },
    { name: "HR", head: "Priya Singh" },
  ],
  L02: [
    { name: "Product", head: "Sneha Patel" },
    { name: "IT", head: "Karan Mehta" },
  ],
  L03: [
    { name: "Sales", head: "Anjali Desai" },
  ],
  L04: [
    { name: "Operations", head: "Vikram Reddy" },
  ],
  L05: [
    { name: "Design", head: "Megha Gupta" },
    { name: "Finance", head: "Ravi Kumar" },
  ],
}

export function createEmptyLocationFormValues(): LocationFormValues {
  return {
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    country: "",
    timezone: "",
    workingHours: "",
    businessUnit: businessUnits[0],
    status: "Active",
  }
}

export let locationsStore: LocationRecord[] = [...initialLocations]

export function getLocations() {
  return locationsStore
}

export function getLocationById(id: string) {
  return locationsStore.find((location) => location.id === id)
}

export function updateLocations(
  next: LocationRecord[] | ((current: LocationRecord[]) => LocationRecord[])
) {
  locationsStore = typeof next === "function" ? next(locationsStore) : next
  return locationsStore
}
