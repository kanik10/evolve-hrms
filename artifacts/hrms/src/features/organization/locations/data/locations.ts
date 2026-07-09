export type LocationStatus = "Active" | "Inactive"

export type LocationRecord = {
  id: string
  name: string
  code: string
  address: string
  city: string
  state: string
  country: string
  timezone: string
  workingHours: string
  businessUnit: string
  status: LocationStatus
}

export type LocationFormValues = Omit<LocationRecord, "id">

export const businessUnits = [
  "Technology BU",
  "Commerce BU",
  "Services BU",
  "Enterprise BU",
]

export const initialLocations: LocationRecord[] = [
  {
    id: "L01",
    name: "Mumbai HQ",
    code: "MUM-HQ",
    address: "Bandra Kurla Complex, Plot 14",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    timezone: "IST (UTC+5:30)",
    workingHours: "Mon-Fri, 09:00-18:00",
    businessUnit: "Technology BU",
    status: "Active",
  },
  {
    id: "L02",
    name: "Bangalore Tech Park",
    code: "BLR-TP",
    address: "Electronic City, Phase 1",
    city: "Bangalore",
    state: "Karnataka",
    country: "India",
    timezone: "IST (UTC+5:30)",
    workingHours: "Mon-Fri, 09:00-18:00",
    businessUnit: "Technology BU",
    status: "Active",
  },
  {
    id: "L03",
    name: "Delhi NCR",
    code: "DEL-NCR",
    address: "Cyber City, Gurugram",
    city: "Gurugram",
    state: "Haryana",
    country: "India",
    timezone: "IST (UTC+5:30)",
    workingHours: "Mon-Fri, 09:00-18:00",
    businessUnit: "Commerce BU",
    status: "Active",
  },
  {
    id: "L04",
    name: "Hyderabad Campus",
    code: "HYD-CAMP",
    address: "HITEC City, Tower 2",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    timezone: "IST (UTC+5:30)",
    workingHours: "Mon-Fri, 09:00-18:00",
    businessUnit: "Services BU",
    status: "Inactive",
  },
  {
    id: "L05",
    name: "Pune Office",
    code: "PNQ-01",
    address: "Hinjewadi Phase 3",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    timezone: "IST (UTC+5:30)",
    workingHours: "Mon-Fri, 09:00-18:00",
    businessUnit: "Enterprise BU",
    status: "Active",
  },
]

export const locationEmployees: Record<string, Array<{ name: string; role: string; email: string }>> = {
  L01: [
    { name: "Rahul Sharma", role: "Regional Director", email: "rahul.sharma@evolvehr.com" },
    { name: "Priya Nair", role: "HR Manager", email: "priya.nair@evolvehr.com" },
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
    { name: "HR", head: "Priya Nair" },
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
