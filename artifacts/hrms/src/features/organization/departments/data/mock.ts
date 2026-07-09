import { getOrganizationBusinessUnitOptions, getOrganizationCostCenterOptions, getOrganizationDepartmentOptions, organizationBusinessUnits, organizationDepartments, organizationEmployees, organizationLocations, type OrganizationBusinessUnit, type OrganizationCostCenter, type OrganizationDepartment } from "../../data/organizationData"

export type Department = OrganizationDepartment

export const BUSINESS_UNITS = getOrganizationBusinessUnitOptions()

export const COST_CENTERS = getOrganizationCostCenterOptions().map((value) => ({ value, label: value }))

export const DEPARTMENT_HEADS = organizationEmployees.map((employee) => ({ id: employee.id, name: employee.name }))

export const mockDepartments: Department[] = [...organizationDepartments]
