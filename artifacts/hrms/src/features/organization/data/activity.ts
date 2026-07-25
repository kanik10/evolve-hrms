export type OrganizationActivityEntityType =
  | "Department"
  | "Location"
  | "Business Unit"
  | "Leave Policy"
  | "Salary Structure"

export interface OrganizationActivity {
  id: string
  action: string
  timestamp: string
  entityType: OrganizationActivityEntityType
  entityName: string
  user: {
    name: string
    role: string
    avatarUrl?: string
  }
}

export const mockOrganizationActivities: OrganizationActivity[] = [
  {
    id: "activity-001",
    action: "Department Created",
    timestamp: "Today, 10:30 AM",
    entityType: "Department",
    entityName: "Product Engineering",
    user: {
      name: "Aarav Mehta",
      role: "HR Admin",
    },
  },
  {
    id: "activity-002",
    action: "Department Archived",
    timestamp: "Today, 9:15 AM",
    entityType: "Department",
    entityName: "Legacy Operations",
    user: {
      name: "Neha Rao",
      role: "People Ops Lead",
    },
  },
  {
    id: "activity-003",
    action: "Location Updated",
    timestamp: "Yesterday, 4:15 PM",
    entityType: "Location",
    entityName: "Bangalore Tech Park",
    user: {
      name: "Kabir Shah",
      role: "Facilities Manager",
    },
  },
  {
    id: "activity-004",
    action: "Business Unit Added",
    timestamp: "22 Jul 2026, 2:40 PM",
    entityType: "Business Unit",
    entityName: "Digital Commerce",
    user: {
      name: "Isha Nair",
      role: "Org Strategist",
    },
  },
  {
    id: "activity-005",
    action: "Leave Policy Modified",
    timestamp: "20 Jul 2026, 11:05 AM",
    entityType: "Leave Policy",
    entityName: "Annual Leave Policy",
    user: {
      name: "Rohan Verma",
      role: "Payroll Specialist",
    },
  },
  {
    id: "activity-006",
    action: "Salary Structure Updated",
    timestamp: "18 Jul 2026, 5:20 PM",
    entityType: "Salary Structure",
    entityName: "Grade M3 Compensation",
    user: {
      name: "Maya Menon",
      role: "Compensation Analyst",
    },
  },
]
