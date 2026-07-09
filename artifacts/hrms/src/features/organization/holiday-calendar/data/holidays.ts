export type HolidayRecord = {
  id: string
  name: string
  date: string
  location: string
  holidayType: string
  mandatory: boolean
  optional: boolean
  recurring: boolean
}

export type HolidayFormValues = Omit<HolidayRecord, "id">

export const holidayLocations = ["Mumbai HQ", "Bangalore Tech Park", "Delhi NCR", "Hyderabad Campus", "Pune Office"]
export const holidayTypes = ["National", "Regional", "Company", "Religious", "Floating"]

export const initialHolidays: HolidayRecord[] = [
  {
    id: "HL1",
    name: "New Year's Day",
    date: "2026-01-01",
    location: "Mumbai HQ",
    holidayType: "National",
    mandatory: true,
    optional: false,
    recurring: true,
  },
  {
    id: "HL2",
    name: "Republic Day",
    date: "2026-01-26",
    location: "Delhi NCR",
    holidayType: "National",
    mandatory: true,
    optional: false,
    recurring: true,
  },
  {
    id: "HL3",
    name: "Diwali",
    date: "2026-11-08",
    location: "Bangalore Tech Park",
    holidayType: "Religious",
    mandatory: false,
    optional: true,
    recurring: true,
  },
  {
    id: "HL4",
    name: "Company Foundation Day",
    date: "2026-03-15",
    location: "Hyderabad Campus",
    holidayType: "Company",
    mandatory: true,
    optional: false,
    recurring: true,
  },
]

export function createEmptyHolidayFormValues(): HolidayFormValues {
  return {
    name: "",
    date: "",
    location: holidayLocations[0],
    holidayType: holidayTypes[0],
    mandatory: true,
    optional: false,
    recurring: false,
  }
}

export let holidaysStore: HolidayRecord[] = [...initialHolidays]

export function getHolidays() {
  return holidaysStore
}

export function updateHolidays(next: HolidayRecord[] | ((current: HolidayRecord[]) => HolidayRecord[])) {
  holidaysStore = typeof next === "function" ? next(holidaysStore) : next
  return holidaysStore
}
