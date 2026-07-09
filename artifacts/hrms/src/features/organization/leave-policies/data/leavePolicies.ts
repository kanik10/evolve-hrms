import { organizationLeavePolicies, type OrganizationLeavePolicy, getOrganizationDepartmentOptions } from "../../data/organizationData"

export type LeavePolicyRecord = OrganizationLeavePolicy

export type LeavePolicyFormValues = Omit<LeavePolicyRecord, "id">

export const initialLeavePolicies: LeavePolicyRecord[] = [...organizationLeavePolicies]

export const leavePolicyDepartments = getOrganizationDepartmentOptions()

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
