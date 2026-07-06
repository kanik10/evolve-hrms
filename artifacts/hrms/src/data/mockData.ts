import { z } from "zod";

export type Department = {
  id: string;
  name: string;
  head: string;
  employeeCount: number;
  budget: string;
  status: "Active" | "Inactive";
};

export const mockDepartments: Department[] = [
  { id: "D001", name: "Engineering", head: "Rahul Sharma", employeeCount: 120, budget: "₹4.5Cr", status: "Active" },
  { id: "D002", name: "Product", head: "Sneha Patel", employeeCount: 45, budget: "₹1.8Cr", status: "Active" },
  { id: "D003", name: "Marketing", head: "Karan Johar", employeeCount: 38, budget: "₹2.2Cr", status: "Active" },
  { id: "D004", name: "HR", head: "Priya Singh", employeeCount: 22, budget: "₹80L", status: "Active" },
  { id: "D005", name: "Finance", head: "Amit Verma", employeeCount: 31, budget: "₹1.2Cr", status: "Active" },
  { id: "D006", name: "Operations", head: "Vikram Reddy", employeeCount: 67, budget: "₹2.5Cr", status: "Active" },
  { id: "D007", name: "Sales", head: "Anjali Desai", employeeCount: 89, budget: "₹3.0Cr", status: "Active" },
  { id: "D008", name: "Legal", head: "Ravi Kumar", employeeCount: 15, budget: "₹50L", status: "Active" },
  { id: "D009", name: "Design", head: "Megha Gupta", employeeCount: 28, budget: "₹1.0Cr", status: "Active" },
  { id: "D010", name: "IT", head: "Suresh Nair", employeeCount: 41, budget: "₹1.5Cr", status: "Active" },
];

export type Designation = {
  id: string;
  title: string;
  level: string;
  departmentId: string;
  status: "Active" | "Inactive";
};

export const mockDesignations: Designation[] = [
  { id: "DS01", title: "Manager", level: "L4", departmentId: "D001", status: "Active" },
  { id: "DS02", title: "Senior Engineer", level: "L3", departmentId: "D001", status: "Active" },
  { id: "DS03", title: "Director", level: "L6", departmentId: "D001", status: "Active" },
  { id: "DS04", title: "VP", level: "L7", departmentId: "D001", status: "Active" },
  { id: "DS05", title: "Analyst", level: "L1", departmentId: "D005", status: "Active" },
  { id: "DS06", title: "Executive", level: "L2", departmentId: "D007", status: "Active" },
  { id: "DS07", title: "Designer", level: "L2", departmentId: "D009", status: "Active" },
  { id: "DS08", title: "HR Business Partner", level: "L4", departmentId: "D004", status: "Active" },
  { id: "DS09", title: "Product Manager", level: "L4", departmentId: "D002", status: "Active" },
  { id: "DS10", title: "Sales Associate", level: "L1", departmentId: "D007", status: "Active" },
  { id: "DS11", title: "System Admin", level: "L2", departmentId: "D010", status: "Active" },
  { id: "DS12", title: "Legal Counsel", level: "L4", departmentId: "D008", status: "Active" },
  { id: "DS13", title: "Marketing Specialist", level: "L2", departmentId: "D003", status: "Active" },
  { id: "DS14", title: "Operations Lead", level: "L3", departmentId: "D006", status: "Active" },
  { id: "DS15", title: "Finance Controller", level: "L5", departmentId: "D005", status: "Active" },
];

export type Location = {
  id: string;
  name: string;
  address: string;
  type: string;
  status: "Active" | "Inactive";
};

export const mockLocations: Location[] = [
  { id: "L01", name: "Mumbai HQ", address: "Bandra Kurla Complex, Mumbai", type: "HQ", status: "Active" },
  { id: "L02", name: "Bangalore Tech Park", address: "Electronic City, Bangalore", type: "Office", status: "Active" },
  { id: "L03", name: "Delhi NCR", address: "Cyber City, Gurugram", type: "Branch", status: "Active" },
  { id: "L04", name: "Hyderabad Campus", address: "HITEC City, Hyderabad", type: "Office", status: "Active" },
  { id: "L05", name: "Pune Office", address: "Hinjewadi, Pune", type: "Branch", status: "Active" },
  { id: "L06", name: "Chennai Center", address: "Taramani, Chennai", type: "Office", status: "Active" },
  { id: "L07", name: "Kolkata Branch", address: "Salt Lake, Kolkata", type: "Branch", status: "Active" },
];

export type BusinessUnit = {
  id: string;
  name: string;
  head: string;
  revenue: string;
  headcount: number;
  status: "Active" | "Inactive";
};

export const mockBusinessUnits: BusinessUnit[] = [
  { id: "BU01", name: "Technology BU", head: "Rahul Sharma", revenue: "₹45Cr", headcount: 350, status: "Active" },
  { id: "BU02", name: "Commerce BU", head: "Sneha Patel", revenue: "₹80Cr", headcount: 220, status: "Active" },
  { id: "BU03", name: "Services BU", head: "Vikram Reddy", revenue: "₹30Cr", headcount: 410, status: "Active" },
  { id: "BU04", name: "Enterprise BU", head: "Anjali Desai", revenue: "₹120Cr", headcount: 150, status: "Active" },
];

export type CostCenter = {
  id: string;
  code: string;
  name: string;
  mappedDepartments: string;
  status: "Active" | "Inactive";
};

export const mockCostCenters: CostCenter[] = [
  { id: "CC1", code: "CC001", name: "Eng Core", mappedDepartments: "Engineering, IT", status: "Active" },
  { id: "CC2", code: "CC002", name: "Mkt & Sales", mappedDepartments: "Marketing, Sales", status: "Active" },
  { id: "CC3", code: "CC003", name: "Operations", mappedDepartments: "Operations", status: "Active" },
  { id: "CC4", code: "CC004", name: "Admin Setup", mappedDepartments: "HR, Finance, Legal", status: "Active" },
];

export type Grade = {
  id: string;
  code: string;
  bandName: string;
  salaryRange: string;
  status: "Active" | "Inactive";
};

export const mockGrades: Grade[] = [
  { id: "G1", code: "G1", bandName: "Executive", salaryRange: "₹3L - ₹6L", status: "Active" },
  { id: "G2", code: "G2", bandName: "Senior Executive", salaryRange: "₹6L - ₹10L", status: "Active" },
  { id: "G3", code: "G3", bandName: "Assistant Manager", salaryRange: "₹10L - ₹15L", status: "Active" },
  { id: "G4", code: "G4", bandName: "Manager", salaryRange: "₹15L - ₹25L", status: "Active" },
  { id: "G5", code: "G5", bandName: "Senior Manager", salaryRange: "₹25L - ₹40L", status: "Active" },
  { id: "G6", code: "G6", bandName: "Director", salaryRange: "₹40L - ₹70L", status: "Active" },
  { id: "G7", code: "G7", bandName: "VP", salaryRange: "₹70L+", status: "Active" },
];

export type EmploymentType = {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Inactive";
};

export const mockEmploymentTypes: EmploymentType[] = [
  { id: "ET1", name: "Full-time", description: "Standard 40 hours per week", status: "Active" },
  { id: "ET2", name: "Part-time", description: "Up to 20 hours per week", status: "Active" },
  { id: "ET3", name: "Contract", description: "Fixed term contract", status: "Active" },
  { id: "ET4", name: "Intern", description: "Internship program", status: "Active" },
  { id: "ET5", name: "Consultant", description: "External consultant", status: "Active" },
];

export type Holiday = {
  id: string;
  name: string;
  date: string;
  type: string;
  status: "Active" | "Inactive";
};

export const mockHolidays: Holiday[] = [
  { id: "H01", name: "Republic Day", date: "26 Jan 2024", type: "National", status: "Active" },
  { id: "H02", name: "Holi", date: "25 Mar 2024", type: "Festival", status: "Active" },
  { id: "H03", name: "Good Friday", date: "29 Mar 2024", type: "Festival", status: "Active" },
  { id: "H04", name: "Eid-ul-Fitr", date: "11 Apr 2024", type: "Festival", status: "Active" },
  { id: "H05", name: "Independence Day", date: "15 Aug 2024", type: "National", status: "Active" },
  { id: "H06", name: "Gandhi Jayanti", date: "02 Oct 2024", type: "National", status: "Active" },
  { id: "H07", name: "Dussehra", date: "12 Oct 2024", type: "Festival", status: "Active" },
  { id: "H08", name: "Diwali", date: "31 Oct 2024", type: "Festival", status: "Active" },
  { id: "H09", name: "Christmas", date: "25 Dec 2024", type: "Festival", status: "Active" },
];

export type Shift = {
  id: string;
  name: string;
  timing: string;
  gracePeriod: string;
  status: "Active" | "Inactive";
};

export const mockShifts: Shift[] = [
  { id: "SH1", name: "Morning", timing: "06:00 AM - 02:00 PM", gracePeriod: "15 mins", status: "Active" },
  { id: "SH2", name: "General", timing: "09:00 AM - 06:00 PM", gracePeriod: "15 mins", status: "Active" },
  { id: "SH3", name: "Evening", timing: "02:00 PM - 10:00 PM", gracePeriod: "15 mins", status: "Active" },
  { id: "SH4", name: "Night", timing: "10:00 PM - 06:00 AM", gracePeriod: "15 mins", status: "Active" },
];

export type LeavePolicy = {
  id: string;
  name: string;
  days: number;
  carryForward: string;
  status: "Active" | "Inactive";
};

export const mockLeavePolicies: LeavePolicy[] = [
  { id: "LP1", name: "Annual Leave", days: 18, carryForward: "Yes (Max 10)", status: "Active" },
  { id: "LP2", name: "Sick Leave", days: 10, carryForward: "No", status: "Active" },
  { id: "LP3", name: "Casual Leave", days: 6, carryForward: "No", status: "Active" },
  { id: "LP4", name: "Maternity Leave", days: 180, carryForward: "No", status: "Active" },
  { id: "LP5", name: "Paternity Leave", days: 15, carryForward: "No", status: "Active" },
];

export type SalaryStructure = {
  id: string;
  name: string;
  components: string;
  applicableGrades: string;
  status: "Active" | "Inactive";
};

export const mockSalaryStructures: SalaryStructure[] = [
  { id: "SS1", name: "Band A Structure", components: "Basic, HRA, PF", applicableGrades: "G1, G2", status: "Active" },
  { id: "SS2", name: "Band B Structure", components: "Basic, HRA, Conveyance, PF", applicableGrades: "G3, G4", status: "Active" },
  { id: "SS3", name: "Band C Structure", components: "Basic, HRA, Special, PF", applicableGrades: "G5, G6", status: "Active" },
];

export type Employee = {
  id: string;
  name: string;
  department: string;
  designation: string;
  joiningDate: string;
  salary: string;
  status: "Active" | "On Leave" | "Terminated";
  avatar?: string;
};

export const mockEmployees: Employee[] = [
  { id: "EMP001", name: "Rahul Sharma", department: "Engineering", designation: "Director", joiningDate: "12 Jan 2020", salary: "₹45,00,000", status: "Active" },
  { id: "EMP002", name: "Sneha Patel", department: "Product", designation: "Product Manager", joiningDate: "05 Mar 2021", salary: "₹28,00,000", status: "Active" },
  { id: "EMP003", name: "Karan Johar", department: "Marketing", designation: "VP Marketing", joiningDate: "10 Aug 2019", salary: "₹55,00,000", status: "Active" },
  { id: "EMP004", name: "Priya Singh", department: "HR", designation: "HR Business Partner", joiningDate: "22 Nov 2021", salary: "₹18,00,000", status: "Active" },
  { id: "EMP005", name: "Amit Verma", department: "Finance", designation: "Finance Controller", joiningDate: "15 Jan 2018", salary: "₹35,00,000", status: "Active" },
  { id: "EMP006", name: "Vikram Reddy", department: "Operations", designation: "Operations Lead", joiningDate: "01 Sep 2020", salary: "₹22,00,000", status: "Active" },
  { id: "EMP007", name: "Anjali Desai", department: "Sales", designation: "Sales Associate", joiningDate: "14 Feb 2022", salary: "₹12,00,000", status: "Active" },
  { id: "EMP008", name: "Ravi Kumar", department: "Legal", designation: "Legal Counsel", joiningDate: "30 Jun 2021", salary: "₹25,00,000", status: "Active" },
  { id: "EMP009", name: "Megha Gupta", department: "Design", designation: "Designer", joiningDate: "10 Oct 2022", salary: "₹14,00,000", status: "Active" },
  { id: "EMP010", name: "Suresh Nair", department: "IT", designation: "System Admin", joiningDate: "25 Apr 2019", salary: "₹16,00,000", status: "Active" },
  { id: "EMP011", name: "Rohit Bansal", department: "Engineering", designation: "Senior Engineer", joiningDate: "12 May 2021", salary: "₹24,00,000", status: "On Leave" },
  { id: "EMP012", name: "Nisha Kapoor", department: "Engineering", designation: "Software Engineer", joiningDate: "01 Jul 2023", salary: "₹12,00,000", status: "Active" },
];

export const chartDataHeadcount = [
  { name: 'Jan', value: 2400 },
  { name: 'Feb', value: 2450 },
  { name: 'Mar', value: 2500 },
  { name: 'Apr', value: 2580 },
  { name: 'May', value: 2600 },
  { name: 'Jun', value: 2650 },
  { name: 'Jul', value: 2700 },
  { name: 'Aug', value: 2750 },
  { name: 'Sep', value: 2780 },
  { name: 'Oct', value: 2800 },
  { name: 'Nov', value: 2820 },
  { name: 'Dec', value: 2847 },
];

export const chartDataDepartment = [
  { name: 'Engineering', value: 120 },
  { name: 'Sales', value: 89 },
  { name: 'Operations', value: 67 },
  { name: 'Product', value: 45 },
  { name: 'IT', value: 41 },
];

export const chartDataAttendance = [
  { name: 'Mon', value: 95 },
  { name: 'Tue', value: 96 },
  { name: 'Wed', value: 94 },
  { name: 'Thu', value: 93 },
  { name: 'Fri', value: 91 },
];
