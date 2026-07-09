export type ShiftRecord = {
  id: string
  shiftName: string
  startTime: string
  endTime: string
  graceTime: string
  breakDuration: string
  weeklyOff: string
  status: "Active" | "Inactive"
}

export type ShiftFormValues = Omit<ShiftRecord, "id">

export const weeklyOffOptions = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export const initialShifts: ShiftRecord[] = [
  {
    id: "SFT1",
    shiftName: "Morning Shift",
    startTime: "09:00",
    endTime: "18:00",
    graceTime: "10",
    breakDuration: "45",
    weeklyOff: "Sunday",
    status: "Active",
  },
  {
    id: "SFT2",
    shiftName: "General Shift",
    startTime: "10:00",
    endTime: "19:00",
    graceTime: "15",
    breakDuration: "30",
    weeklyOff: "Saturday",
    status: "Active",
  },
  {
    id: "SFT3",
    shiftName: "Night Shift",
    startTime: "22:00",
    endTime: "06:00",
    graceTime: "20",
    breakDuration: "60",
    weeklyOff: "Friday",
    status: "Inactive",
  },
]

export function createEmptyShiftFormValues(): ShiftFormValues {
  return {
    shiftName: "",
    startTime: "09:00",
    endTime: "18:00",
    graceTime: "10",
    breakDuration: "30",
    weeklyOff: weeklyOffOptions[0],
    status: "Active",
  }
}

export let shiftsStore: ShiftRecord[] = [...initialShifts]

export function getShifts() {
  return shiftsStore
}

export function updateShifts(next: ShiftRecord[] | ((current: ShiftRecord[]) => ShiftRecord[])) {
  shiftsStore = typeof next === "function" ? next(shiftsStore) : next
  return shiftsStore
}
