export type LeavePolicyRecord = {
  id: string
  policyName: string
  annualLeave: string
  casualLeave: string
  sickLeave: string
  carryForward: string
  negativeBalance: string
  encashment: string
  eligibility: string
  status: "Active" | "Inactive"
}

export type LeavePolicyFormValues = Omit<LeavePolicyRecord, "id">

export const initialLeavePolicies: LeavePolicyRecord[] = [
  {
    id: "LP1",
    policyName: "Standard Full-Time",
    annualLeave: "24",
    casualLeave: "8",
    sickLeave: "12",
    carryForward: "10",
    negativeBalance: "No",
    encashment: "Yes",
    eligibility: "All Full-Time Employees",
    status: "Active",
  },
  {
    id: "LP2",
    policyName: "Contract Employees",
    annualLeave: "12",
    casualLeave: "4",
    sickLeave: "6",
    carryForward: "0",
    negativeBalance: "No",
    encashment: "No",
    eligibility: "Contractors and Consultants",
    status: "Active",
  },
]

export function createEmptyLeavePolicyFormValues(): LeavePolicyFormValues {
  return {
    policyName: "",
    annualLeave: "20",
    casualLeave: "8",
    sickLeave: "10",
    carryForward: "5",
    negativeBalance: "No",
    encashment: "No",
    eligibility: "",
    status: "Active",
  }
}

export let leavePoliciesStore: LeavePolicyRecord[] = [...initialLeavePolicies]

export function getLeavePolicies() {
  return leavePoliciesStore
}

export function updateLeavePolicies(next: LeavePolicyRecord[] | ((current: LeavePolicyRecord[]) => LeavePolicyRecord[])) {
  leavePoliciesStore = typeof next === "function" ? next(leavePoliciesStore) : next
  return leavePoliciesStore
}
