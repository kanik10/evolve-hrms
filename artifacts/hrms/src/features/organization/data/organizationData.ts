export type OrganizationStatus = "Active" | "Inactive"
export type OrganizationDepartmentStatus = OrganizationStatus | "Archived"

export interface OrganizationBusinessUnit {
  id: string
  name: string
  code: string
  head: string
  description: string
  status: OrganizationStatus
  departments: string[]
  locations: string[]
  costCenters: string[]
}

export interface OrganizationCostCenter {
  id: string
  name: string
  code: string
  department: string
  businessUnit: string
  status: OrganizationStatus
  budget: string
}

export interface OrganizationLocation {
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
  status: OrganizationStatus
  departmentNames?: string[]
}

export interface OrganizationDepartment {
  id: string
  code: string
  name: string
  headId: string
  head: string
  businessUnit: string
  costCenter: string
  description: string
  status: OrganizationDepartmentStatus
  employeeCount: number
  budget: string
  locations: string[]
  createdAt: string
  updatedAt: string
}

export interface OrganizationEmployee {
  id: string
  name: string
  department: string
  designation: string
  joiningDate: string
  salary: string
  status: "Active" | "On Leave" | "Terminated"
  avatar?: string
  departmentId?: string
  location?: string
  leavePolicyId?: string
  salaryStructureId?: string
}

export interface OrganizationLeavePolicy {
  id: string
  policyName: string
  annualLeave: string
  casualLeave: string
  sickLeave: string
  carryForward: string
  negativeBalance: string
  encashment: string
  eligibility: string
  status: OrganizationStatus
  applicableDepartmentNames?: string[]
}

export interface OrganizationSalaryStructure {
  id: string
  structureName: string
  grade: string
  basic: string
  hra: string
  specialAllowance: string
  bonus: string
  pf: string
  esic: string
  professionalTax: string
  tds: string
  status: OrganizationStatus
  applicableDepartmentNames?: string[]
}

export interface OrganizationGrade {
  id: string
  name: string
  level: string
  salaryRange: string
  status: OrganizationStatus
}

export interface OrganizationEmploymentType {
  id: string
  name: string
  description: string
  status: OrganizationStatus
}

export interface OrganizationShift {
  id: string
  name: string
  timing: string
  gracePeriod: string
  status: OrganizationStatus
}

export interface OrganizationHoliday {
  id: string
  name: string
  date: string
  type: string
  status: OrganizationStatus
}

export const organizationBusinessUnitHeads = [
  "Rahul Sharma",
  "Sneha Patel",
  "Vikram Reddy",
  "Anjali Desai",
  "Priya Singh",
]

export const organizationBusinessUnits: OrganizationBusinessUnit[] = [
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

export const organizationCostCenters: OrganizationCostCenter[] = [
  {
    id: "CC1",
    name: "Engineering Core",
    code: "ENG-01",
    department: "Engineering",
    businessUnit: "Technology BU",
    status: "Active",
    budget: "₹4.5Cr",
  },
  {
    id: "CC2",
    name: "Marketing & Sales",
    code: "MKT-02",
    department: "Sales",
    businessUnit: "Commerce BU",
    status: "Active",
    budget: "₹2.2Cr",
  },
  {
    id: "CC3",
    name: "Operations Support",
    code: "OPS-03",
    department: "Operations",
    businessUnit: "Services BU",
    status: "Inactive",
    budget: "₹1.1Cr",
  },
  {
    id: "CC4",
    name: "Admin & Finance",
    code: "ADM-04",
    department: "Finance",
    businessUnit: "Enterprise BU",
    status: "Active",
    budget: "₹90L",
  },
]

export const organizationLocations: OrganizationLocation[] = [
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
    departmentNames: ["Engineering", "Product", "IT"],
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
    departmentNames: ["Engineering", "Product"],
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
    departmentNames: ["Sales", "Marketing"],
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
    departmentNames: ["Operations", "Finance"],
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
    departmentNames: ["Design", "Finance"],
  },
]

export const organizationDepartments: OrganizationDepartment[] = [
  {
    id: "dept-001",
    code: "ENG",
    name: "Engineering",
    headId: "EMP001",
    head: "Rahul Sharma",
    businessUnit: "Technology BU",
    costCenter: "Eng Core",
    description: "Responsible for all product engineering, platform infrastructure, and technical delivery across the organization.",
    status: "Active",
    employeeCount: 120,
    budget: "₹4.5Cr",
    locations: ["Mumbai HQ", "Bangalore Tech Park", "Hyderabad Campus"],
    createdAt: "2021-01-15",
    updatedAt: "2024-03-20",
  },
  {
    id: "dept-002",
    code: "PROD",
    name: "Product",
    headId: "EMP002",
    head: "Sneha Patel",
    businessUnit: "Technology BU",
    costCenter: "Eng Core",
    description: "Drives product strategy, roadmap planning, and cross-functional coordination to deliver customer value.",
    status: "Active",
    employeeCount: 45,
    budget: "₹1.8Cr",
    locations: ["Mumbai HQ", "Bangalore Tech Park"],
    createdAt: "2021-01-15",
    updatedAt: "2024-02-10",
  },
  {
    id: "dept-003",
    code: "MKT",
    name: "Marketing",
    headId: "EMP003",
    head: "Karan Johar",
    businessUnit: "Commerce BU",
    costCenter: "Mkt & Sales",
    description: "Manages brand strategy, demand generation, digital marketing, and corporate communications.",
    status: "Active",
    employeeCount: 38,
    budget: "₹2.2Cr",
    locations: ["Mumbai HQ", "Delhi NCR"],
    createdAt: "2021-01-15",
    updatedAt: "2024-01-08",
  },
  {
    id: "dept-004",
    code: "HR",
    name: "HR",
    headId: "EMP004",
    head: "Priya Singh",
    businessUnit: "Enterprise BU",
    costCenter: "Admin Setup",
    description: "Oversees talent acquisition, employee relations, learning & development, and organizational culture.",
    status: "Active",
    employeeCount: 22,
    budget: "₹80L",
    locations: ["Mumbai HQ"],
    createdAt: "2021-01-15",
    updatedAt: "2023-11-15",
  },
  {
    id: "dept-005",
    code: "FIN",
    name: "Finance",
    headId: "EMP005",
    head: "Amit Verma",
    businessUnit: "Enterprise BU",
    costCenter: "Admin Setup",
    description: "Manages financial reporting, treasury, accounts payable/receivable, and statutory compliance.",
    status: "Active",
    employeeCount: 31,
    budget: "₹1.2Cr",
    locations: ["Mumbai HQ"],
    createdAt: "2021-01-15",
    updatedAt: "2024-02-28",
  },
  {
    id: "dept-006",
    code: "OPS",
    name: "Operations",
    headId: "EMP006",
    head: "Vikram Reddy",
    businessUnit: "Services BU",
    costCenter: "Operations",
    description: "Coordinates end-to-end delivery operations, process optimization, and vendor management.",
    status: "Active",
    employeeCount: 67,
    budget: "₹2.5Cr",
    locations: ["Mumbai HQ", "Bangalore Tech Park", "Pune Office"],
    createdAt: "2021-03-10",
    updatedAt: "2024-03-05",
  },
  {
    id: "dept-007",
    code: "SALES",
    name: "Sales",
    headId: "EMP007",
    head: "Anjali Desai",
    businessUnit: "Commerce BU",
    costCenter: "Mkt & Sales",
    description: "Manages new business acquisition, enterprise account management, and revenue forecasting.",
    status: "Active",
    employeeCount: 89,
    budget: "₹3.0Cr",
    locations: ["Mumbai HQ", "Delhi NCR", "Bangalore Tech Park", "Hyderabad Campus"],
    createdAt: "2021-01-15",
    updatedAt: "2024-03-18",
  },
  {
    id: "dept-008",
    code: "LEGAL",
    name: "Legal",
    headId: "EMP008",
    head: "Ravi Kumar",
    businessUnit: "Enterprise BU",
    costCenter: "Admin Setup",
    description: "Handles corporate legal matters, contract management, IP protection, and regulatory compliance.",
    status: "Active",
    employeeCount: 15,
    budget: "₹50L",
    locations: ["Mumbai HQ"],
    createdAt: "2021-04-01",
    updatedAt: "2023-12-10",
  },
  {
    id: "dept-009",
    code: "DESIGN",
    name: "Design",
    headId: "EMP009",
    head: "Megha Gupta",
    businessUnit: "Technology BU",
    costCenter: "Eng Core",
    description: "Responsible for UX research, product design, brand design, and design systems.",
    status: "Active",
    employeeCount: 28,
    budget: "₹1.0Cr",
    locations: ["Mumbai HQ", "Bangalore Tech Park"],
    createdAt: "2021-06-15",
    updatedAt: "2024-01-22",
  },
  {
    id: "dept-010",
    code: "IT",
    name: "IT",
    headId: "EMP010",
    head: "Suresh Nair",
    businessUnit: "Technology BU",
    costCenter: "Eng Core",
    description: "Manages IT infrastructure, security operations, device management, and internal tooling.",
    status: "Active",
    employeeCount: 41,
    budget: "₹1.5Cr",
    locations: ["Mumbai HQ", "Bangalore Tech Park", "Delhi NCR", "Hyderabad Campus", "Pune Office"],
    createdAt: "2021-01-15",
    updatedAt: "2024-03-01",
  },
  {
    id: "dept-011",
    code: "CS",
    name: "Customer Success",
    headId: "EMP007",
    head: "Anjali Desai",
    businessUnit: "Services BU",
    costCenter: "Operations",
    description: "Ensures customer retention, onboarding success, and net revenue expansion through proactive engagement.",
    status: "Inactive",
    employeeCount: 0,
    budget: "₹0",
    locations: ["Mumbai HQ"],
    createdAt: "2024-01-10",
    updatedAt: "2024-03-20",
  },
  {
    id: "dept-012",
    code: "DA",
    name: "Data & Analytics",
    headId: "EMP001",
    head: "Rahul Sharma",
    businessUnit: "Technology BU",
    costCenter: "Eng Core",
    description: "Previously managed business intelligence, data engineering, and analytics platforms. Merged into Engineering.",
    status: "Archived",
    employeeCount: 18,
    budget: "₹90L",
    locations: ["Mumbai HQ", "Bangalore Tech Park"],
    createdAt: "2021-01-15",
    updatedAt: "2023-09-30",
  },
]

export const organizationEmployees: OrganizationEmployee[] = [
  { id: "EMP001", name: "Rahul Sharma", department: "Engineering", designation: "Director", joiningDate: "12 Jan 2020", salary: "₹45,00,000", status: "Active", departmentId: "dept-001", location: "Mumbai HQ", leavePolicyId: "LP1", salaryStructureId: "SAL1" },
  { id: "EMP002", name: "Sneha Patel", department: "Product", designation: "Product Manager", joiningDate: "05 Mar 2021", salary: "₹28,00,000", status: "Active", departmentId: "dept-002", location: "Bangalore Tech Park", leavePolicyId: "LP1", salaryStructureId: "SAL2" },
  { id: "EMP003", name: "Karan Johar", department: "Marketing", designation: "VP Marketing", joiningDate: "10 Aug 2019", salary: "₹55,00,000", status: "Active", departmentId: "dept-003", location: "Delhi NCR", leavePolicyId: "LP2", salaryStructureId: "SAL1" },
  { id: "EMP004", name: "Priya Singh", department: "HR", designation: "HR Business Partner", joiningDate: "22 Nov 2021", salary: "₹18,00,000", status: "Active", departmentId: "dept-004", location: "Mumbai HQ", leavePolicyId: "LP1", salaryStructureId: "SAL2" },
  { id: "EMP005", name: "Amit Verma", department: "Finance", designation: "Finance Controller", joiningDate: "15 Jan 2018", salary: "₹35,00,000", status: "Active", departmentId: "dept-005", location: "Pune Office", leavePolicyId: "LP1", salaryStructureId: "SAL2" },
  { id: "EMP006", name: "Vikram Reddy", department: "Operations", designation: "Operations Lead", joiningDate: "01 Sep 2020", salary: "₹22,00,000", status: "Active", departmentId: "dept-006", location: "Hyderabad Campus", leavePolicyId: "LP2", salaryStructureId: "SAL2" },
  { id: "EMP007", name: "Anjali Desai", department: "Sales", designation: "Sales Associate", joiningDate: "14 Feb 2022", salary: "₹12,00,000", status: "Active", departmentId: "dept-007", location: "Delhi NCR", leavePolicyId: "LP2", salaryStructureId: "SAL2" },
  { id: "EMP008", name: "Ravi Kumar", department: "Legal", designation: "Legal Counsel", joiningDate: "30 Jun 2021", salary: "₹25,00,000", status: "Active", departmentId: "dept-008", location: "Mumbai HQ", leavePolicyId: "LP1", salaryStructureId: "SAL1" },
  { id: "EMP009", name: "Megha Gupta", department: "Design", designation: "Designer", joiningDate: "10 Oct 2022", salary: "₹14,00,000", status: "Active", departmentId: "dept-009", location: "Pune Office", leavePolicyId: "LP2", salaryStructureId: "SAL2" },
  { id: "EMP010", name: "Suresh Nair", department: "IT", designation: "System Admin", joiningDate: "25 Apr 2019", salary: "₹16,00,000", status: "Active", departmentId: "dept-010", location: "Mumbai HQ", leavePolicyId: "LP1", salaryStructureId: "SAL1" },
  { id: "EMP011", name: "Rohit Bansal", department: "Engineering", designation: "Senior Engineer", joiningDate: "12 May 2021", salary: "₹24,00,000", status: "On Leave", departmentId: "dept-001", location: "Mumbai HQ", leavePolicyId: "LP1", salaryStructureId: "SAL1" },
  { id: "EMP012", name: "Nisha Kapoor", department: "Engineering", designation: "Software Engineer", joiningDate: "01 Jul 2023", salary: "₹12,00,000", status: "Active", departmentId: "dept-001", location: "Bangalore Tech Park", leavePolicyId: "LP2", salaryStructureId: "SAL1" },
]

export const organizationLeavePolicies: OrganizationLeavePolicy[] = [
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
    applicableDepartmentNames: ["Engineering", "Product", "Sales", "Marketing", "HR", "Finance"],
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
    applicableDepartmentNames: ["Operations", "IT", "Design"],
  },
]

export const organizationSalaryStructures: OrganizationSalaryStructure[] = [
  {
    id: "SAL1",
    structureName: "Manager Grade Structure",
    grade: "Manager",
    basic: "50000",
    hra: "20000",
    specialAllowance: "15000",
    bonus: "5000",
    pf: "1800",
    esic: "0",
    professionalTax: "200",
    tds: "3000",
    status: "Active",
    applicableDepartmentNames: ["Engineering", "Product", "Sales", "Marketing"],
  },
  {
    id: "SAL2",
    structureName: "Executive Structure",
    grade: "Executive",
    basic: "35000",
    hra: "14000",
    specialAllowance: "9000",
    bonus: "3000",
    pf: "1400",
    esic: "0",
    professionalTax: "200",
    tds: "1500",
    status: "Active",
    applicableDepartmentNames: ["HR", "Finance", "Operations", "IT"],
  },
]

export const organizationGrades: OrganizationGrade[] = [
  { id: "G1", name: "Executive", level: "L2", salaryRange: "₹3L - ₹6L", status: "Active" },
  { id: "G2", name: "Manager", level: "L4", salaryRange: "₹15L - ₹25L", status: "Active" },
  { id: "G3", name: "Senior Manager", level: "L5", salaryRange: "₹25L - ₹40L", status: "Active" },
  { id: "G4", name: "Director", level: "L6", salaryRange: "₹40L - ₹70L", status: "Active" },
]

export const organizationEmploymentTypes: OrganizationEmploymentType[] = [
  { id: "ET1", name: "Full-time", description: "Standard 40 hours per week", status: "Active" },
  { id: "ET2", name: "Part-time", description: "Up to 20 hours per week", status: "Active" },
  { id: "ET3", name: "Contract", description: "Fixed term contract", status: "Active" },
  { id: "ET4", name: "Intern", description: "Internship program", status: "Active" },
]

export const organizationShifts: OrganizationShift[] = [
  { id: "SH1", name: "Morning", timing: "06:00 AM - 02:00 PM", gracePeriod: "15 mins", status: "Active" },
  { id: "SH2", name: "General", timing: "09:00 AM - 06:00 PM", gracePeriod: "15 mins", status: "Active" },
  { id: "SH3", name: "Evening", timing: "02:00 PM - 10:00 PM", gracePeriod: "15 mins", status: "Active" },
]

export const organizationHolidays: OrganizationHoliday[] = [
  { id: "H01", name: "Republic Day", date: "26 Jan 2024", type: "National", status: "Active" },
  { id: "H02", name: "Holi", date: "25 Mar 2024", type: "Festival", status: "Active" },
  { id: "H03", name: "Good Friday", date: "29 Mar 2024", type: "Festival", status: "Active" },
]

export function getOrganizationBusinessUnitOptions() {
  return organizationBusinessUnits.map((unit) => unit.name)
}

export function getOrganizationCostCenterOptions() {
  return organizationCostCenters.map((center) => center.name)
}

export function getOrganizationLocationOptions() {
  return organizationLocations.map((location) => location.name)
}

export function getOrganizationDepartmentOptions() {
  return organizationDepartments.map((department) => department.name)
}

export function getOrganizationEmployeeOptions() {
  return organizationEmployees.map((employee) => ({ id: employee.id, name: employee.name, department: employee.department }))
}

export function getOrganizationLeavePolicyOptions() {
  return organizationLeavePolicies.map((policy) => policy.policyName)
}

export function getOrganizationSalaryStructureOptions() {
  return organizationSalaryStructures.map((structure) => structure.structureName)
}

export function getOrganizationDepartmentsForLocation(locationName: string) {
  return organizationDepartments.filter((department) => department.locations.includes(locationName))
}

export function getOrganizationDepartmentsForBusinessUnit(businessUnitName: string) {
  return organizationDepartments.filter((department) => department.businessUnit === businessUnitName)
}

export function getOrganizationCostCentersForBusinessUnit(businessUnitName: string) {
  return organizationCostCenters.filter((center) => center.businessUnit === businessUnitName)
}

export function getOrganizationLocationsForBusinessUnit(businessUnitName: string) {
  return organizationLocations.filter((location) => location.businessUnit === businessUnitName)
}

export function getOrganizationDepartmentByName(name: string) {
  return organizationDepartments.find((department) => department.name === name)
}
