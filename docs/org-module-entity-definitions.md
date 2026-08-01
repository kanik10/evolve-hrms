# Evolve HRMS — Organization Module: Business Entity Definitions

**Classification:** Internal Engineering Reference  
**Status:** Finalized  
**Module:** Organization  
**Preceding Documents:** `docs/database-standards.md`, `docs/entity-inventory.md`

---

## Overview

The Organization module is the structural foundation of the entire HRMS. Every other module — employees, payroll, attendance, leave, performance — derives its context from the organizational hierarchy defined here. Getting this model right is the most consequential design decision in the system.

This document defines the business meaning, rules, relationships, and lifecycle of every entity in the Organization module. It is the authoritative reference for product, engineering, and QA. No schema, API, or UI may deviate from these definitions without a documented architecture decision.

---

## Entity Index

1. [Tenant](#1-tenant)
2. [Organization](#2-organization)
3. [Legal Entity](#3-legal-entity)
4. [Business Unit](#4-business-unit)
5. [Department](#5-department)
6. [Location](#6-location)
7. [Cost Center](#7-cost-center)
8. [Grade](#8-grade)
9. [Job Family](#9-job-family)
10. [Job Title](#10-job-title)
11. [Employment Type](#11-employment-type)
12. [Holiday Calendar](#12-holiday-calendar)
13. [Shift](#13-shift)
14. [Leave Policy](#14-leave-policy)
15. [Salary Structure](#15-salary-structure)

---

## Relationship Overview

```
Tenant
  └── Organization (Company Profile)
        └── Legal Entity (1..N)
              └── Business Unit (1..N)
                    ├── Department (1..N)
                    │     └── Job Title (1..N) ── Job Family
                    ├── Cost Center (1..N)
                    └── Location (1..N)

Tenant
  ├── Grade (1..N) ──────────── Salary Structure (1..N)
  ├── Employment Type (1..N)
  ├── Leave Policy (1..N)
  ├── Holiday Calendar (1..N) ── Location
  └── Shift (1..N) ──────────── Location
```

---

## 1. Tenant

### Purpose
The Tenant is the root entity of the entire platform. It represents one paying customer organization — the company that has licensed Evolve HRMS. Every single record in the database belongs to exactly one Tenant. This is the primary multi-tenancy anchor.

### Business Description
When a new company signs up for Evolve HRMS, a Tenant record is created. All subsequent configuration, employee data, payroll, and transactions are scoped under this Tenant. Multiple Tenants are completely isolated from one another at the data layer. A Tenant does not represent a legal entity or an office — it represents the business relationship between Evolve and the customer.

A Tenant may contain multiple Legal Entities (see §3), multiple Business Units, and thousands of employees. The Tenant itself holds only the top-level identity and platform contract information.

### Relationships
- **One Tenant → One Organization** (the company profile)
- **One Tenant → Many Legal Entities**
- **One Tenant → Many Users**
- **One Tenant → Many Roles**
- **One Tenant → All org_, emp_, att_, lve_, pay_, prf_ records** (implicit via `tenant_id`)

### Business Rules
1. A Tenant must be created before any other record in the system can be created.
2. A Tenant cannot be deleted; it can only be `suspended` or `terminated`.
3. Tenant `slug` (URL-friendly identifier) must be globally unique across the entire platform, not just per tenant.
4. A `terminated` Tenant's data must be retained for the legally mandated retention period before any purge is eligible.
5. Only Super Admins of the Evolve platform (not of the customer company) can create, suspend, or terminate a Tenant.
6. All cross-tenant operations must be explicitly authorized and logged to `sys_audit_logs` with both tenant contexts recorded.
7. A Tenant may not be re-activated from `terminated` status. A new Tenant must be created.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 — platform-generated primary key |
| `name` | Legal or trading name of the customer organization |
| `slug` | URL-safe, globally unique short identifier (e.g., `acme-corp`) |
| `status` | Current platform lifecycle state |
| `plan` | Subscribed product plan (e.g., `starter`, `growth`, `enterprise`) |
| `country_code` | Primary country of operation (ISO 3166-1 alpha-2) |
| `created_at` | Platform-assigned creation timestamp |

### Optional Fields
| Field | Description |
|-------|-------------|
| `logo_url` | Hosted URL of the tenant's logo |
| `primary_domain` | Custom domain for SSO / white-label login (e.g., `hr.acmecorp.com`) |
| `contract_start_date` | Date the subscription contract began |
| `contract_end_date` | Date the subscription contract expires or was terminated |
| `notes` | Internal platform notes (not visible to customer) |

### Unique Constraints
- `slug` — globally unique across all tenants
- `primary_domain` — globally unique if set (no two tenants can share a login domain)

### Validation Rules
- `name` must be between 2 and 200 characters
- `slug` must match `^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$` — lowercase letters, numbers, hyphens only
- `country_code` must be a valid ISO 3166-1 alpha-2 code
- `contract_end_date`, if set, must be on or after `contract_start_date`
- `plan` must be one of the platform-defined plan values

### Audit Requirements
- Creation, every status transition, and plan changes must be logged to `sys_audit_logs`
- No Tenant record may ever be hard-deleted from the database by the application
- All audit log entries for Tenant-level changes must record the Evolve platform Super Admin user who made the change

### Lifecycle
```
draft → active → suspended → terminated
          ↑_________↓
       (reactivation from suspended only)
```
- `draft` — Tenant created but onboarding not complete; no employees can be added
- `active` — Fully operational
- `suspended` — Non-payment or violation; login blocked but data preserved
- `terminated` — Contract ended; data in retention period, no access

### Future Scalability
- Multi-region data residency: Tenant record will gain a `data_region` field to route storage and compute to specific geographic regions (EU, US, IN) for data sovereignty compliance
- White-label / partner tenants: A `partner_tenant_id` self-reference will support reseller hierarchy
- Usage metering: Tenant will gain fields for active seat count and billing cycle to support usage-based pricing

---

## 2. Organization

### Purpose
The Organization entity stores the official business identity and operational configuration of a company within a Tenant. It is the customer-facing company record that employees, payslips, offer letters, and compliance documents reference.

### Business Description
While Tenant represents the platform contract, Organization represents the company as it presents itself to the world. This is where the registered company name, logo, statutory identifiers (GST, PAN, TAN, CIN), registered address, fiscal year configuration, and branding live. There is exactly one Organization per Tenant.

The Organization record is what appears on payslips, offer letters, tax filings, and the HRMS header. In jurisdictions where a company has multiple legal registrations (subsidiaries, branches), those are modeled as Legal Entities (§3) that sit beneath the Organization.

### Relationships
- **One Organization → One Tenant** (parent)
- **One Organization → Many Legal Entities**
- **One Organization → Many Business Units** (through Legal Entities)

### Business Rules
1. There is exactly one Organization per Tenant. A second Organization record cannot be created for the same Tenant.
2. The Organization `registered_name` is the legally registered business name and must match statutory filings.
3. The `display_name` is the brand name used in the HRMS UI and employee-facing communications; it may differ from `registered_name`.
4. Fiscal year start month defines the boundary for annual leave accruals, performance cycles, and payroll year-end processing. Changing it after employees are onboarded has cascading impact and requires a migration workflow.
5. The default currency set here is the payroll and compensation currency for all employees unless overridden at the Legal Entity level.
6. An Organization cannot be deleted. Its lifecycle mirrors the Tenant.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `registered_name` | Official legal name on company registration certificate |
| `display_name` | Brand name shown in the HRMS UI and employee communications |
| `country_code` | Country of primary incorporation (ISO 3166-1 alpha-2) |
| `default_currency_code` | ISO 4217 currency code for payroll (e.g., `INR`, `USD`) |
| `fiscal_year_start_month` | Integer 1–12 representing the month the financial/HR year begins |
| `default_timezone` | IANA timezone identifier (e.g., `Asia/Kolkata`) |
| `status` | `draft` or `active` |

### Optional Fields
| Field | Description |
|-------|-------------|
| `logo_url` | Primary logo used on payslips, offer letters, HRMS header |
| `website_url` | Company website |
| `registered_address` | Full registered office address (structured: line1, line2, city, state, pincode, country) |
| `pan_number` | Permanent Account Number (India-specific tax identifier) |
| `tan_number` | Tax Deduction Account Number (India-specific) |
| `gst_number` | GST registration number |
| `cin_number` | Company Identification Number |
| `epf_registration_number` | Employee Provident Fund employer registration |
| `esic_registration_number` | Employee State Insurance Corporation employer registration |
| `pt_registration_number` | Professional Tax registration |
| `incorporation_date` | Date the company was legally incorporated |
| `industry_type` | Industry classification (e.g., `technology`, `manufacturing`, `retail`) |
| `employee_strength_band` | Nominal headcount band (e.g., `1-50`, `51-200`, `201-1000`) for compliance thresholds |

### Unique Constraints
- `tenant_id` — only one Organization per Tenant
- `pan_number` — unique per tenant if set
- `cin_number` — unique per tenant if set

### Validation Rules
- `fiscal_year_start_month` must be an integer between 1 and 12
- `default_currency_code` must be a valid ISO 4217 code
- `default_timezone` must be a valid IANA timezone identifier
- `pan_number` must match the regex `[A-Z]{5}[0-9]{4}[A-Z]{1}` if provided (India)
- `gst_number` must be 15 characters following the GSTIN format if provided
- `website_url` must be a valid URL if provided

### Audit Requirements
- All changes to statutory identifiers (PAN, TAN, GST, CIN) must be logged with the old and new value
- Changes to `fiscal_year_start_month` must trigger a platform alert to the HR Admin, as this has system-wide cascading consequences
- Every field change is captured in `sys_audit_logs`

### Lifecycle
```
draft → active
```
- `draft` — Onboarding not yet complete; employees cannot be added
- `active` — Fully configured; operational

### Future Scalability
- Multi-language support: Organization will gain `supported_locales` to control which UI languages are available to that tenant's employees
- White-labeling: A `theme_config_data` JSON field will hold brand colors, typography overrides, and email header/footer customization per organization

---

## 3. Legal Entity

### Purpose
A Legal Entity represents a distinct legally registered company or subsidiary within the same Tenant. It allows a group of companies (parent + subsidiaries) or a company with separate statutory registrations across states/countries to operate under one HRMS while maintaining payroll and compliance separation.

### Business Description
Many enterprise customers are not a single company — they are a group. Example: "Acme Group" (the Tenant) may own "Acme Technologies Pvt. Ltd." (India), "Acme Inc." (USA), and "Acme DMCC" (UAE). Each subsidiary has its own payroll, tax registrations, employment contracts, and compliance obligations.

The Legal Entity sits between the Organization and Business Unit. Business Units, Departments, and Employees are assigned to a Legal Entity. Payroll runs are executed per Legal Entity. All statutory filings are associated with a Legal Entity's registration numbers.

If a customer is a single company with no subsidiaries, they will have exactly one Legal Entity, automatically created during onboarding, mirroring the Organization.

### Relationships
- **One Legal Entity → One Organization** (parent)
- **One Legal Entity → One Tenant** (via Organization)
- **One Legal Entity → Many Business Units**
- **One Legal Entity → Many Employees** (through their Business Unit/Department)
- **One Legal Entity → Many Pay Runs** (payroll is executed per Legal Entity)

### Business Rules
1. Every tenant must have at least one Legal Entity. It is created automatically during Organization onboarding.
2. An employee belongs to exactly one Legal Entity at any point in time (their active Employment Type Assignment carries this context).
3. Payroll currency may differ per Legal Entity (an Indian subsidiary pays in INR, a US subsidiary pays in USD).
4. Statutory registration numbers (PAN, TAN, GST, EIN) belong to the Legal Entity, not the Organization.
5. Leave Policies and Holiday Calendars may be assigned at the Legal Entity level to reflect country-specific entitlements.
6. A Legal Entity may not be deleted if it has active employees assigned to it. It must be set to `inactive` first.
7. Inter-company employee transfers require the old Legal Entity's `Employment Type Assignment` to be closed and a new one created under the new Legal Entity.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `organization_id` | FK to Organization |
| `name` | Legal registered name of this entity |
| `entity_code` | Short internal code (e.g., `ACME-IN`, `ACME-US`) |
| `country_code` | Country of incorporation (ISO 3166-1 alpha-2) |
| `currency_code` | Payroll and compensation currency (ISO 4217) |
| `timezone` | Primary operational timezone (IANA) |
| `status` | `draft → active → inactive → archived` |

### Optional Fields
| Field | Description |
|-------|-------------|
| `registered_address` | Structured registered address |
| `pan_number` | India: PAN |
| `tan_number` | India: TAN |
| `gst_number` | India: GSTIN |
| `cin_number` | India: CIN |
| `ein_number` | USA: Employer Identification Number |
| `epf_registration_number` | India: PF employer code |
| `esic_registration_number` | India: ESIC employer code |
| `professional_tax_state` | India: State for PT applicability |
| `incorporation_date` | Date of legal incorporation |
| `parent_legal_entity_id` | Self-referencing FK for holding company structures |
| `fiscal_year_start_month` | Override organization-level fiscal year if this entity's fiscal year differs |

### Unique Constraints
- `entity_code` — unique per tenant
- `pan_number` — unique per tenant if set
- `ein_number` — unique per tenant if set

### Validation Rules
- `entity_code` must be 2–20 characters, uppercase alphanumeric with hyphens
- `currency_code` must be a valid ISO 4217 code
- `country_code` must be a valid ISO 3166-1 alpha-2 code
- `timezone` must be a valid IANA timezone identifier
- Statutory identifiers must pass country-specific format validation where applicable

### Audit Requirements
- All statutory identifier changes logged with old and new values
- Legal Entity `status` transitions logged with the acting user
- Any change to `currency_code` after employees are active must trigger a business-impact alert — this cannot be changed casually

### Lifecycle
```
draft → active → inactive → archived
```
- `draft` — Being configured before going live
- `active` — Operational; employees can be assigned
- `inactive` — No longer accepting new assignments; existing employees must be transferred
- `archived` — Dissolved or fully wound down; read-only

### Future Scalability
- Country-specific compliance modules (US: EEO, ACA; India: Shops & Establishments Act; UAE: WPS) will be configured at the Legal Entity level
- Transfer pricing and inter-company cost allocation will reference Legal Entity for cross-entity billing

---

## 4. Business Unit

### Purpose
A Business Unit represents the highest-level strategic division within a Legal Entity — a major organizational segment with its own P&L accountability, leadership, and functional identity.

### Business Description
Business Units model the top-level partitioning of a company into major operational segments. Examples: Technology BU, Sales & Marketing BU, Operations BU, Corporate Functions. They sit below the Legal Entity and above Departments. They are used for reporting roll-ups, headcount planning, budget allocation, and org chart rendering.

A Business Unit typically has a BU Head (a senior employee) and aggregates multiple Departments, Cost Centers, and Locations under its umbrella.

### Relationships
- **One Business Unit → One Legal Entity** (parent)
- **One Business Unit → One Tenant** (via Legal Entity)
- **One Business Unit → Many Departments**
- **One Business Unit → Many Cost Centers**
- **One Business Unit → Many Locations** (a BU may span multiple locations)
- **BU Head → One Employee Profile** (optional at creation, required before `active`)

### Business Rules
1. A Business Unit must belong to exactly one Legal Entity.
2. A Business Unit can span multiple Locations but must belong to one Legal Entity.
3. The BU Head must be an active employee in the same tenant. The BU Head need not be in a Department within this BU.
4. Archiving a Business Unit is only permitted when all its Departments are either `inactive` or `archived`.
5. A Business Unit code must be unique within the tenant (not just within the Legal Entity) for unambiguous reporting.
6. Deleting a Business Unit is prohibited. Soft delete via `archived` status only.
7. At least one Business Unit must exist under a Legal Entity before Departments can be created.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `legal_entity_id` | FK to Legal Entity |
| `name` | Display name of the Business Unit |
| `code` | Short alphanumeric identifier (e.g., `TECH`, `COMM`) |
| `status` | Current lifecycle status |

### Optional Fields
| Field | Description |
|-------|-------------|
| `bu_head_employee_id` | FK to Employee Profile — the Business Unit Head |
| `description` | Brief description of the BU's function and scope |
| `sort_order` | Integer for display ordering in org charts and dropdowns |
| `cost_budget_amount` | Annual headcount cost budget for this BU |
| `cost_budget_currency_code` | Currency of the budget amount |

### Unique Constraints
- `(tenant_id, code)` — BU code unique per tenant
- `(tenant_id, name)` — BU name unique per tenant

### Validation Rules
- `code` must be 2–10 characters, uppercase alphanumeric
- `name` must be 2–100 characters
- `bu_head_employee_id`, if set, must reference an `active` Employee in the same tenant
- `sort_order` must be a positive integer

### Audit Requirements
- BU Head assignment changes must be logged (who, old employee, new employee, timestamp)
- Status transitions logged with acting user
- `cost_budget_amount` changes logged with old/new values

### Lifecycle
```
draft → active → inactive → archived
```
- `draft` — Configured but not published in the org chart
- `active` — Operational; departments can be assigned
- `inactive` — Hidden from new assignments; existing data preserved
- `archived` — Permanently closed; read-only; requires all departments to be inactive/archived first

### Future Scalability
- BUs will support a `parent_bu_id` self-reference for multi-level BU hierarchies (sub-BUs within a large BU) as companies scale
- BU-level workforce planning targets (headcount plan vs actuals) will be tracked as a separate entity linked to Business Unit

---

## 5. Department

### Purpose
A Department is a functional team or organizational unit within a Business Unit, grouping employees who share a common function, skillset, or business objective.

### Business Description
Departments are the primary organizational unit most employees experience day-to-day. Every employee belongs to exactly one Department (their active Department Assignment). Departments drive leave approval chains, headcount reporting, access control for managers, and cost allocation.

Examples: Engineering, Product Design, Sales, Finance, Human Resources, Marketing, Customer Success, Legal.

A Department has a Department Head (typically the functional manager), belongs to one Business Unit, maps to one or more Cost Centers, and may span multiple Locations.

### Relationships
- **One Department → One Business Unit** (parent)
- **One Department → One or Many Cost Centers** (funding source)
- **One Department → Many Locations** (a dept may have employees in multiple offices)
- **Department Head → One Employee Profile**
- **One Department → Many Job Titles** (the positions available in this department)
- **One Department → Many Employee Department Assignments**

### Business Rules
1. A Department must belong to exactly one Business Unit and therefore exactly one Legal Entity.
2. A Department may be linked to multiple Cost Centers for budget allocation (primary cost center is mandatory; secondary cost centers are optional).
3. The Department Head must be an active employee in the same tenant.
4. A Department cannot be archived while it has employees with an active Department Assignment pointing to it.
5. When a Department Head's employment terminates, the Department Head field becomes null and an HR alert is raised to re-assign.
6. Department codes must be unique within the tenant.
7. A Department may be transferred between Business Units; this is a significant restructuring event that must be logged.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `business_unit_id` | FK to Business Unit |
| `name` | Display name of the Department |
| `code` | Short alphanumeric identifier (e.g., `ENG`, `HR`, `FIN`) |
| `primary_cost_center_id` | FK to Cost Center — primary budget owner |
| `status` | Current lifecycle status |

### Optional Fields
| Field | Description |
|-------|-------------|
| `department_head_employee_id` | FK to Employee Profile — the functional head |
| `description` | Description of the department's function |
| `parent_department_id` | FK to Department (self-reference) — for sub-departments (e.g., Backend Engineering within Engineering) |
| `location_ids` | Array of Location IDs this department operates in |
| `sort_order` | Integer for display ordering |
| `headcount_budget` | Approved headcount limit for this department |

### Unique Constraints
- `(tenant_id, code)` — Department code unique per tenant
- `(tenant_id, name, business_unit_id)` — Department name unique within a BU

### Validation Rules
- `code` must be 2–10 characters, uppercase alphanumeric
- `name` must be 2–100 characters
- `department_head_employee_id`, if set, must be an `active` Employee
- `parent_department_id` must not create a circular reference
- `headcount_budget`, if set, must be a positive integer

### Audit Requirements
- Department Head changes logged (old, new, timestamp, acting user)
- Business Unit transfers logged as a significant restructuring event
- Status transitions logged
- Cost Center reassignment logged with old/new values

### Lifecycle
```
draft → active → inactive → archived
```
- `draft` — Being set up; not visible to employees
- `active` — Operational; employees can be assigned
- `inactive` — Frozen for new hires; existing employees still mapped
- `archived` — Dissolved; all employees must have been transferred out first

### Future Scalability
- `parent_department_id` enables unlimited-depth sub-department hierarchies, which will power the Org Chart feature
- Department-level OKRs and headcount plan vs actual reporting will link to this entity

---

## 6. Location

### Purpose
A Location represents a physical office, remote hub, or virtual designation where employees are geographically based. It drives timezone-aware operations, shift scheduling, holiday calendar assignment, and compliance.

### Business Description
Every employee has a primary work Location. Location determines which Holiday Calendar applies to them, their default timezone for attendance calculations, and in some countries, state-level statutory compliance (e.g., Professional Tax in India, which varies by state).

Locations can be physical offices (Mumbai HQ, Bangalore Tech Park), remote zones (Work From Home — India), or international offices (Singapore Office).

### Relationships
- **One Location → One Legal Entity** (primary owner)
- **One Location → One or Many Business Units** (a location may house multiple BUs)
- **One Location → One Holiday Calendar** (typically assigned at location level for regional holidays)
- **One Location → Many Shifts** (location-specific shift timings)
- **One Location → Many Employees** (their primary work location)

### Business Rules
1. A Location must belong to one Legal Entity, which determines the currency, payroll, and primary statutory context.
2. Every Location must have a valid IANA timezone — this is non-negotiable for correct attendance and shift calculations.
3. A Location can be tagged as `is_remote` to indicate it represents a virtual/WFH category rather than a physical address.
4. A Location can be tagged as `is_headquarters` — only one Location per Legal Entity may carry this flag.
5. A Location cannot be archived while it has employees with an active primary location assignment.
6. State and country on a Location drive statutory compliance rule-mapping (PT slab, labour law applicability).

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `legal_entity_id` | FK to Legal Entity |
| `name` | Display name of the location (e.g., "Mumbai HQ", "Bangalore Tech Park") |
| `code` | Short identifier (e.g., `MUM`, `BLR`, `DEL`) |
| `country_code` | ISO 3166-1 alpha-2 |
| `timezone` | IANA timezone identifier |
| `status` | Current lifecycle status |

### Optional Fields
| Field | Description |
|-------|-------------|
| `address_line_1` | Street address |
| `address_line_2` | Suite, floor, building |
| `city` | City name |
| `state_province` | State or province name |
| `postal_code` | Pin/zip code |
| `state_code` | ISO 3166-2 state code for statutory mapping |
| `is_headquarters` | Boolean — marks this as the primary registered office |
| `is_remote` | Boolean — marks this as a virtual/WFH location |
| `phone_number` | Office phone number |
| `standard_working_hours_per_day` | Default working hours per day at this location (e.g., 8.5) |
| `standard_working_days_per_week` | Default working days per week (e.g., 5) |

### Unique Constraints
- `(tenant_id, code)` — Location code unique per tenant
- `(legal_entity_id, is_headquarters)` where `is_headquarters = true` — at most one HQ per Legal Entity

### Validation Rules
- `country_code` must be a valid ISO 3166-1 alpha-2 code
- `timezone` must be a valid IANA timezone identifier
- `code` must be 2–10 characters, uppercase alphanumeric
- `standard_working_hours_per_day` must be between 1 and 24
- `standard_working_days_per_week` must be between 1 and 7
- `is_headquarters` and `is_remote` cannot both be `true` on the same record

### Audit Requirements
- Timezone changes must be logged with a business-impact warning — affects all attendance records for employees at this location
- `is_headquarters` flag changes logged
- Status transitions logged

### Lifecycle
```
draft → active → inactive → archived
```
- `draft` — Configuration in progress
- `active` — Operational; employees can be assigned
- `inactive` — No new assignments; existing employees may still be mapped
- `archived` — Office closed; all employees must have been transferred

### Future Scalability
- Geofencing coordinates (latitude, longitude, radius) will be added to support mobile attendance punch-in/out via GPS
- Location-level seating capacity and hot-desk booking will extend this entity for hybrid workplace management

---

## 7. Cost Center

### Purpose
A Cost Center is a financial classification unit used to attribute employee headcount costs, payroll expenses, and operational budgets to specific business segments for financial reporting and cost control.

### Business Description
Every employee's salary, benefits, and overhead are attributed to one or more Cost Centers. This drives the General Ledger integration, departmental P&L reporting, and budget vs. actuals analysis. Finance teams use Cost Centers to answer: "How much did it cost to run the Engineering department in Q3?"

Cost Centers often align with Departments but are not identical. A Department may draw from multiple Cost Centers (e.g., a shared services department splitting costs between product and sales). An employee may also have their cost split across multiple Cost Centers using a percentage allocation.

### Relationships
- **One Cost Center → One Business Unit** (primary owner)
- **One Cost Center → One Legal Entity** (via Business Unit)
- **One Cost Center → Many Departments** (departments point to their primary cost center)
- **One Cost Center → Many Pay Run Lines** (payroll costs posted to it)

### Business Rules
1. Every Cost Center must belong to exactly one Business Unit.
2. Cost Center codes must be unique per Legal Entity (as they may be exported to accounting systems like SAP, Oracle, Tally).
3. A Cost Center may have an annual budget amount that the HRMS tracks against actual payroll run costs.
4. An employee's payroll cost can be split across multiple Cost Centers using percentage allocations. The percentages must sum to exactly 100%.
5. A Cost Center cannot be archived while it has active employees or open Pay Run Lines linked to it.
6. Finance owns the Cost Center master in accounting systems; HR maintains the mapping. Changes to a Cost Center's GL code should require Finance approval.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `business_unit_id` | FK to Business Unit |
| `name` | Display name (e.g., "Engineering Core", "Mkt & Sales") |
| `code` | External accounting code (e.g., `CC-1001`) |
| `status` | Current lifecycle status |

### Optional Fields
| Field | Description |
|-------|-------------|
| `description` | Purpose and scope of this cost center |
| `gl_code` | General Ledger account code in the accounting system |
| `annual_budget_amount` | Approved annual budget for this cost center |
| `budget_currency_code` | Currency of the budget |
| `finance_owner_employee_id` | FK to Employee — the Finance team member responsible |
| `sort_order` | Integer for display ordering in dropdowns |

### Unique Constraints
- `(legal_entity_id, code)` — Cost Center code unique per Legal Entity

### Validation Rules
- `code` must be 2–20 characters
- `annual_budget_amount`, if set, must be a non-negative decimal
- `gl_code`, if set, must follow the accounting system's code format (configurable per tenant)
- `finance_owner_employee_id`, if set, must be an active Employee

### Audit Requirements
- `gl_code` changes must be logged — Finance reconciliation depends on this
- `annual_budget_amount` changes logged with old/new values
- Status transitions logged

### Lifecycle
```
draft → active → inactive → archived
```

### Future Scalability
- Hierarchical Cost Centers (parent-child GL structure) will be supported via `parent_cost_center_id`
- Real-time budget consumption tracking: running total of payroll costs against the budget will be maintained as a computed field updated after each Pay Run

---

## 8. Grade

### Purpose
A Grade is a hierarchical seniority level classification that defines the compensation band, authority scope, and career progression rung an employee occupies. It is the primary anchor for compensation decisions and job architecture.

### Business Description
Grades form the backbone of the job architecture. Every position in the company maps to a Grade. Grades define: what pay band an employee can be in, which Salary Structure template applies, what their approval authority level is, and what their career level is relative to others in the organization.

Example grade ladder: L1 (Intern), L2 (Associate), L3 (Engineer), L4 (Senior Engineer), L5 (Staff Engineer), L6 (Principal Engineer), M1 (Engineering Manager), M2 (Director), M3 (VP), M4 (C-Suite).

### Relationships
- **One Grade → One Tenant**
- **One Grade → Many Job Titles** (a grade may contain multiple job titles)
- **One Grade → Many Salary Structures** (compensation bands tied to grade)
- **One Grade → Many Employee Grade Assignments** (effective-dated employee history)

### Business Rules
1. Grades are tenant-level master data and are not scoped to a Legal Entity or Business Unit — they apply across the organization.
2. Every Job Title must be associated with exactly one Grade.
3. A Grade defines a minimum and maximum salary band. An employee's compensation must fall within their grade's band (enforced as a warning, not a hard block, to allow exceptions for counter-offers).
4. Grades are ordered by `level` — an integer where higher numbers indicate more senior positions. Level must be unique per tenant.
5. A Grade cannot be deactivated if active Job Titles or active Employee Grade Assignments reference it.
6. Grade codes must be unique per tenant.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `name` | Display name (e.g., "L3 — Engineer", "M2 — Director") |
| `code` | Short code (e.g., `L3`, `M2`) |
| `level` | Integer sort position representing seniority (higher = more senior) |
| `status` | Current lifecycle status |

### Optional Fields
| Field | Description |
|-------|-------------|
| `description` | Narrative description of the seniority level and expectations |
| `min_salary_amount` | Minimum compensation in the default organizational currency |
| `max_salary_amount` | Maximum compensation in the default organizational currency |
| `is_management_grade` | Boolean — whether this grade carries people management responsibility |
| `sort_order` | Integer for visual ordering in UI dropdowns (typically mirrors `level`) |

### Unique Constraints
- `(tenant_id, code)` — Grade code unique per tenant
- `(tenant_id, level)` — Grade level unique per tenant

### Validation Rules
- `level` must be a positive integer
- `min_salary_amount`, if set, must be non-negative
- `max_salary_amount`, if set, must be ≥ `min_salary_amount`
- `code` must be 1–10 characters

### Audit Requirements
- Salary band changes (`min_salary_amount`, `max_salary_amount`) logged with old/new values — these affect compensation planning
- Status transitions logged

### Lifecycle
```
draft → active → inactive → archived
```
- `inactive` — No new assignments; existing employees retain their current grade
- `archived` — Grade retired; all employees on this grade must have been re-graded

### Future Scalability
- Grade bands will be extended to support multiple currency bands per Grade for multi-country entities
- Grade will anchor the Compensation Benchmarking feature (market data comparison) via integration with survey providers like Mercer or Aon

---

## 9. Job Family

### Purpose
A Job Family groups related Job Titles that share a common discipline, skillset, or function under one umbrella — providing a layer of job architecture above Job Title for career pathing, compensation benchmarking, and workforce analytics.

### Business Description
Job Families allow the organization to cluster job roles by their fundamental nature, independent of level or department. Examples: "Software Engineering" (contains: Junior Engineer, Engineer, Senior Engineer, Staff Engineer), "Sales" (contains: SDR, Account Executive, Regional Sales Manager), "People & Culture" (contains: HR Associate, HR Business Partner, VP HR).

Job Families are the lens through which organizations conduct skills inventory, succession planning, and salary benchmarking. They are also used to define career paths — an employee in a Job Family can see their potential growth trajectory.

### Relationships
- **One Job Family → One Tenant**
- **One Job Family → Many Job Titles**
- **Job Family is optional on Job Title** — Job Titles may exist without a Job Family, but this is discouraged for mature setups

### Business Rules
1. Job Families are tenant-wide and not scoped to a Business Unit or Department.
2. A Job Family groups Job Titles by discipline, not by hierarchy — a single Job Family may span multiple Grades.
3. A Job Title can belong to exactly one Job Family.
4. Job Family codes must be unique per tenant.
5. A Job Family cannot be archived if it has active Job Titles linked to it.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `name` | Display name (e.g., "Software Engineering", "Sales", "Finance") |
| `code` | Short identifier (e.g., `SWE`, `SALES`, `FIN`) |
| `status` | Current lifecycle status |

### Optional Fields
| Field | Description |
|-------|-------------|
| `description` | Description of the skills domain and career scope of this family |
| `parent_job_family_id` | Self-referencing FK — for Job Family Groups (e.g., "Technology" group containing "Software Engineering" and "Product Management") |
| `sort_order` | Integer for display ordering |

### Unique Constraints
- `(tenant_id, code)` — Job Family code unique per tenant
- `(tenant_id, name)` — Job Family name unique per tenant

### Validation Rules
- `code` must be 2–10 characters, uppercase alphanumeric
- `name` must be 2–100 characters
- `parent_job_family_id` must not create a circular reference

### Audit Requirements
- Name changes logged (affects career path documentation)
- Status transitions logged

### Lifecycle
```
draft → active → inactive → archived
```

### Future Scalability
- Job Family will be the anchor for the AI-powered Skills Taxonomy feature, mapping Job Families to standardized O*NET or ESCO occupational codes
- Succession planning and career path visualization will traverse Job Family relationships to suggest movement paths

---

## 10. Job Title

### Purpose
A Job Title is the specific role label assigned to a position within the organization. It defines the function and seniority of a role at the intersection of a Department, Grade, and Job Family.

### Business Description
A Job Title is what appears on business cards, offer letters, employment contracts, and LinkedIn profiles. It is more specific than a Job Family and is anchored to both a Grade (seniority) and typically a Department (function). Examples: "Senior Software Engineer" (Grade: L4, Job Family: Software Engineering, Department: Engineering), "HR Business Partner" (Grade: M1, Job Family: People & Culture, Department: HR).

Note: In the entity inventory, this was labelled "Designation". In the domain model, "Job Title" is the business-facing name; the database table will be `org_job_titles` following the naming convention.

### Relationships
- **One Job Title → One Grade** (mandatory — determines compensation band)
- **One Job Title → One Job Family** (strongly recommended)
- **One Job Title → One Department** (typically; a job title may be generic across departments)
- **One Job Title → Many Employee Designation Assignments** (effective-dated)
- **One Job Title → Many Job Openings** (recruitment)

### Business Rules
1. Every Job Title must be linked to exactly one Grade.
2. A Job Title should be linked to a Job Family; this is mandatory for tenants that have configured their Job Family structure.
3. A Job Title may be department-specific or tenant-wide (generic). A generic job title (e.g., "Office Assistant") can be assigned to employees across departments.
4. Job Title codes must be unique per tenant.
5. A Job Title cannot be deactivated while active employees hold it as their current designation assignment.
6. The same Job Title name may not exist in the same Department (prevents duplication).
7. When a Job Title's Grade is changed, existing Employee Designation Assignments are not retroactively changed — a new assignment row must be created.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `grade_id` | FK to Grade |
| `name` | Display name (e.g., "Senior Software Engineer") |
| `code` | Short identifier (e.g., `SSE`, `HRBP`) |
| `status` | Current lifecycle status |

### Optional Fields
| Field | Description |
|-------|-------------|
| `job_family_id` | FK to Job Family |
| `department_id` | FK to Department — if null, the title is generic/cross-functional |
| `description` | Role purpose, responsibilities summary |
| `is_people_manager` | Boolean — designates this as a managerial role with direct reports |
| `sort_order` | Integer for display ordering |

### Unique Constraints
- `(tenant_id, code)` — Job Title code unique per tenant
- `(tenant_id, name, department_id)` — Job Title name unique within a department (nulls on `department_id` allowed for generic titles)

### Validation Rules
- `code` must be 2–10 characters, uppercase alphanumeric
- `name` must be 2–150 characters
- `grade_id` must reference an `active` Grade
- `job_family_id`, if set, must reference an `active` Job Family

### Audit Requirements
- `grade_id` changes logged — this is a compensation architecture change
- `is_people_manager` changes logged
- Status transitions logged

### Lifecycle
```
draft → active → inactive → archived
```

### Future Scalability
- Job Titles will link to a standardized `soc_code` (Standard Occupational Classification) field to support EEOC filings in the US and NIC filings in India
- Job Title will serve as the anchor for AI-driven job description generation and skill requirement mapping

---

## 11. Employment Type

### Purpose
Employment Type defines the nature and terms of the contractual engagement between the company and an individual — whether they are a full-time salaried employee, part-time worker, contractor, intern, or consultant.

### Business Description
Employment Type drives critical downstream behavior: which Leave Policy entitlements apply, whether the employee is included in statutory payroll runs (PF/ESIC), whether they receive benefits, and what their notice period terms are. It is one of the most important classification fields on an employee record.

Examples: Full Time, Part Time, Contract, Intern, Consultant, Probationer (often treated separately), Fixed Term Contract.

### Relationships
- **One Employment Type → One Tenant**
- **One Employment Type → Many Employee Employment Type Assignments** (effective-dated)
- **One Employment Type → Many Leave Policy Rules** (entitlements differ by employment type)

### Business Rules
1. Employment Types are tenant-wide master data.
2. Every employee must have an active Employment Type Assignment at all times from their joining date.
3. Changing an employee's employment type (e.g., Intern → Full Time on conversion) must be done via a new effective-dated Employment Type Assignment, not by editing the existing one.
4. Some statutory rules are conditional on Employment Type — for example, PF deduction typically applies only to Full Time and Part Time employees, not Contractors or Consultants.
5. An Employment Type cannot be deactivated if active employees have it as their current employment type.
6. The `is_statutory_applicable` flag controls whether standard statutory deductions (PF, ESIC, PT) apply to employees on this type.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `name` | Display name (e.g., "Full Time", "Contract") |
| `code` | Short identifier (e.g., `FT`, `CT`, `INTERN`) |
| `is_statutory_applicable` | Boolean — whether standard statutory deductions apply |
| `status` | Current lifecycle status |

### Optional Fields
| Field | Description |
|-------|-------------|
| `description` | Description of the employment arrangement |
| `is_payroll_included` | Boolean — whether employees of this type are included in standard payroll runs |
| `default_notice_period_days` | Default notice period in days for this employment type |
| `is_benefits_eligible` | Boolean — whether employees of this type are eligible for company benefits |
| `sort_order` | Integer for dropdown ordering |

### Unique Constraints
- `(tenant_id, code)` — Employment Type code unique per tenant
- `(tenant_id, name)` — Employment Type name unique per tenant

### Validation Rules
- `code` must be 2–10 characters, uppercase alphanumeric
- `name` must be 2–100 characters
- `default_notice_period_days`, if set, must be a non-negative integer

### Audit Requirements
- Any change to `is_statutory_applicable` or `is_payroll_included` must be logged with a high-priority audit trail — these flags directly affect statutory compliance
- Status transitions logged

### Lifecycle
```
active → inactive
```
- Employment Types do not have a `draft` state — they are simple, immediately-active reference values
- `inactive` — Retired from new use; existing assignments remain valid

### Future Scalability
- Employment Type will gain country-specific compliance flags (e.g., `is_esi_applicable` in India, `is_aca_applicable` in the USA) as statutory modules are built out
- Employment Type categories will link to the AI assistant for contract generation templates

---

## 12. Holiday Calendar

### Purpose
A Holiday Calendar defines the set of public, national, regional, and optional holidays applicable to a group of employees, determining which days are non-working and how leave calculations handle them.

### Business Description
Holiday Calendars are the source of truth for non-working days. They are used by the Leave module (to exclude holidays from leave duration calculations), the Attendance module (to mark auto-present on holidays), and Payroll (to compute Loss of Pay correctly).

A tenant may have multiple Holiday Calendars — one per state/country (e.g., "India — Maharashtra 2025", "India — Karnataka 2025") or one per office location. Each Calendar has a set of Holiday Days with specific dates, names, and types.

### Relationships
- **One Holiday Calendar → One Tenant**
- **One Holiday Calendar → One or Many Locations** (which locations observe this calendar)
- **One Holiday Calendar → Many Holiday Calendar Days** (the list of holidays)
- **One Holiday Calendar → Many Employees** (via their Location or direct assignment)

### Business Rules
1. A Holiday Calendar is scoped to a calendar year. A new Calendar must be published for each new year.
2. An employee's applicable Holiday Calendar is determined by their primary Location. If a Location has no Calendar assigned, the tenant default Calendar applies.
3. Holiday types are: `national` (mandatory, all employees), `regional` (applies to a specific state/region), `optional` (employee can choose from a pool of X optional holidays per year).
4. A Holiday Calendar cannot be published (set to `active`) with zero Holiday Days.
5. Once a Holiday Calendar is set to `active` and has processed leave requests against it, its Holiday Days cannot be deleted — only marked `cancelled`.
6. A `cancelled` Holiday Day changes the leave balance for anyone who took leave on that day and triggers a recalculation.
7. A tenant must have at most one `default` Holiday Calendar per year. The default is used when no location-specific calendar exists.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `name` | Display name (e.g., "India — Maharashtra — 2025") |
| `calendar_year` | The year this calendar is valid for (integer) |
| `country_code` | Country this calendar applies to |
| `status` | Current lifecycle status |

### Optional Fields
| Field | Description |
|-------|-------------|
| `state_province_code` | State/region this calendar is specific to (ISO 3166-2) |
| `is_default` | Boolean — whether this is the tenant's default calendar for the year when no location-specific calendar applies |
| `description` | Description of applicability |
| `location_ids` | Locations that observe this calendar |
| `optional_holiday_quota` | Number of optional holidays an employee may choose per year from this calendar |

### Unique Constraints
- `(tenant_id, name, calendar_year)` — Calendar name unique per year per tenant
- `(tenant_id, calendar_year, is_default)` where `is_default = true` — at most one default calendar per year

### Validation Rules
- `calendar_year` must be a 4-digit integer (e.g., 2024–2099)
- `country_code` must be a valid ISO 3166-1 alpha-2 code
- A Calendar cannot be published without at least one Holiday Day
- `optional_holiday_quota` must be a non-negative integer ≤ total optional holidays in the calendar

### Audit Requirements
- Additions and cancellations of Holiday Calendar Days must be logged — these affect leave balances
- `is_default` flag changes logged
- Status transitions logged

### Lifecycle
```
draft → active → archived
```
- `draft` — Being built; holidays can be freely added/edited
- `active` — Published; holidays can only be cancelled, not deleted; new holidays can still be added
- `archived` — Year has passed; read-only

### Future Scalability
- Holiday Calendar will support automatic population via integration with public holiday API providers (Calendarific, Nager.Date) per country
- Floating holiday banks (where employees can designate any eligible day as a holiday) will extend the optional holiday mechanism

---

## 13. Shift

### Purpose
A Shift defines a named, scheduled working time block with fixed start and end times, break durations, overtime rules, and grace periods. It governs how employee working hours are captured, validated, and converted into attendance status.

### Business Description
Shifts define the time boundaries of a workday for attendance purposes. Every employee has a Shift assigned for a given period. The Shift determines: when their punch-in is on-time vs. late, how long their workday should be, how overtime is computed, and what their expected break time is.

Examples: "Morning Shift (09:00–18:00)", "Night Shift (22:00–06:00)", "Flexible Shift (any 9 hours between 07:00–21:00)", "Rotational Shift".

### Relationships
- **One Shift → One Tenant**
- **One Shift → One Location** (optional — a shift may be location-specific or global)
- **One Shift → Many Employee Shift Assignments** (effective-dated)
- **One Shift → Many Attendance Records**
- **One Shift → Many Shift Roster Entries**

### Business Rules
1. A Shift's `start_time` and `end_time` define the expected work window. For shifts spanning midnight (night shifts), `end_time` may be the next calendar day — this is handled via an `is_overnight` flag.
2. `grace_period_minutes` defines the allowable late-arrival buffer before the employee is marked "late" in attendance.
3. `minimum_hours_for_full_day` defines the threshold below which an employee is marked "half-day" instead of "present".
4. `minimum_hours_for_half_day` defines the threshold below which an employee is marked "absent".
5. A Shift cannot be deleted or deactivated if active Employee Shift Assignments reference it with a future `effective_from` date.
6. When a Shift's timings are changed after it has been used in processed attendance, a new Shift must be created — the existing one must not be edited.
7. Flexible shifts do not have fixed start/end times; they only enforce `minimum_hours_per_day` and a `window_start_time` / `window_end_time` range.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `name` | Display name (e.g., "Morning Shift", "Night Shift", "General Shift") |
| `code` | Short identifier (e.g., `MS`, `NS`, `GS`) |
| `shift_type` | `fixed` or `flexible` |
| `start_time` | Shift start time (`TIME` — HH:MM) — required for `fixed` shifts |
| `end_time` | Shift end time (`TIME`) — required for `fixed` shifts |
| `status` | Current lifecycle status |

### Optional Fields
| Field | Description |
|-------|-------------|
| `location_id` | FK to Location — if null, shift is tenant-wide |
| `is_overnight` | Boolean — whether the shift spans midnight into the next day |
| `grace_period_minutes` | Late arrival allowance in minutes before marking "late" |
| `break_duration_minutes` | Standard unpaid break time per shift (deducted from worked hours) |
| `minimum_hours_for_full_day` | Minimum worked hours to count as full day (e.g., 7.0 hours) |
| `minimum_hours_for_half_day` | Minimum worked hours to count as half day (e.g., 3.5 hours) |
| `window_start_time` | Earliest valid punch-in for flexible shifts |
| `window_end_time` | Latest valid punch-out for flexible shifts |
| `overtime_applicable` | Boolean — whether overtime hours are tracked and eligible for payment |
| `overtime_threshold_hours` | Hours after which overtime kicks in (e.g., 8 hours = standard; 9+ = overtime) |

### Unique Constraints
- `(tenant_id, code)` — Shift code unique per tenant
- `(tenant_id, name, location_id)` — Shift name unique per location per tenant

### Validation Rules
- For `fixed` shifts: `start_time` and `end_time` are required
- For `flexible` shifts: `window_start_time` and `window_end_time` are required
- `end_time` must differ from `start_time` (zero-duration shifts are invalid)
- `grace_period_minutes` must be 0–120
- `minimum_hours_for_half_day` must be less than `minimum_hours_for_full_day`
- `overtime_threshold_hours` must be a positive decimal if set

### Audit Requirements
- Changes to `start_time`, `end_time`, `minimum_hours_for_full_day`, or `grace_period_minutes` after the Shift has processed attendance records must be flagged — they cannot be edited retroactively
- Status transitions logged

### Lifecycle
```
draft → active → inactive → archived
```
- `inactive` — Retired; no new assignments; existing roster entries remain
- `archived` — Historical record only; not shown in active dropdowns

### Future Scalability
- Biometric device integration will link Shift records to physical attendance terminals for automated punch-in validation
- AI-powered shift optimization will use Shift entity as the planning unit for demand-based rostering

---

## 14. Leave Policy

### Purpose
A Leave Policy is a named configuration bundle that defines the full set of leave entitlements for a group of employees — how many days of each leave type they receive, whether they can carry forward unused leave, and the rules governing encashment and negative balances.

### Business Description
Leave Policies are assigned to employees and determine their annual leave entitlements. Different employee groups get different policies: a Full Time employee gets 24 annual leave days and 12 sick leave days; an intern may get 6 casual leave days with no carry-forward; a contract worker may get only statutory leaves.

A Leave Policy contains one or more Leave Policy Rules, where each rule links a Leave Type (Annual Leave, Sick Leave, etc.) to a specific entitlement configuration. The Policy is then assigned to employees via an effective-dated Employee Leave Policy Assignment.

### Relationships
- **One Leave Policy → One Tenant**
- **One Leave Policy → Many Leave Policy Rules** (the entitlement details per leave type)
- **One Leave Policy → Many Employee Leave Policy Assignments** (effective-dated assignments to employees)
- **Leave Policy Rule → Leave Type** (what kind of leave the rule governs)
- **Leave Policy Rule → Employment Type** (optional — rule applies only to this employment type)

### Business Rules
1. A Leave Policy is a header record; it has no entitlement values itself — those live in Leave Policy Rules.
2. A Leave Policy must have at least one Leave Policy Rule before it can be published (set to `active`).
3. Within a single Leave Policy, the same Leave Type must not appear in more than one Leave Policy Rule (each leave type has exactly one rule per policy).
4. When an employee's Leave Policy changes, their leave balances are recalculated from the new policy's rules as of the effective date.
5. A Leave Policy cannot be deactivated if active employees are assigned to it. Those employees must be transitioned to a new policy first.
6. Leave Policy names must be unique per tenant.
7. Changes to Leave Policy Rules after employees are assigned must not retroactively alter already-granted balances for the current leave year. New rules apply from the next accrual cycle.

### Required Fields — Leave Policy

| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `name` | Display name (e.g., "Standard Full-Time Policy", "Probation Policy") |
| `code` | Short identifier |
| `status` | Current lifecycle status |

### Optional Fields — Leave Policy

| Field | Description |
|-------|-------------|
| `description` | Policy narrative — who it applies to and key features |
| `applicable_employment_type_ids` | Array of Employment Type IDs this policy is intended for (guidance only; actual assignment is via Employee Leave Policy Assignment) |
| `probation_period_days` | If set, employees in probation receive a restricted entitlement for the first N days |

### Required Fields — Leave Policy Rule

| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `leave_policy_id` | FK to Leave Policy |
| `leave_type_id` | FK to Leave Type |
| `annual_entitlement_days` | Total leave days granted per year |
| `accrual_type` | `upfront` (full year granted on Jan 1 / anniversary) or `monthly` (X days per month) |

### Optional Fields — Leave Policy Rule

| Field | Description |
|-------|-------------|
| `employment_type_id` | FK to Employment Type — if set, rule applies only when employee is on this type |
| `carry_forward_max_days` | Maximum unused days that can be carried into the next year (0 = no carry-forward) |
| `carry_forward_expiry_days` | Days after leave year start by which carried days must be consumed or they lapse |
| `encashment_eligible` | Boolean — whether unused leave days can be encashed |
| `encashment_max_days` | Maximum days that can be encashed per year |
| `negative_balance_allowed` | Boolean — whether the employee can go into negative leave balance |
| `negative_balance_max_days` | Maximum negative balance allowed |
| `is_pro_rated_on_joining` | Boolean — whether entitlement is pro-rated based on joining date |
| `min_service_days_for_eligibility` | Minimum number of days of service before this leave type becomes available |
| `document_required_after_days` | Number of consecutive days after which a supporting document (e.g., medical certificate) is mandatory |

### Unique Constraints
- `(tenant_id, name)` — Policy name unique per tenant
- `(tenant_id, code)` — Policy code unique per tenant
- `(leave_policy_id, leave_type_id)` — Each Leave Type can appear only once in a Policy

### Validation Rules
- `annual_entitlement_days` must be a non-negative decimal (half-days supported)
- `carry_forward_max_days` must be ≤ `annual_entitlement_days`
- `encashment_max_days` must be ≤ `annual_entitlement_days`
- `negative_balance_max_days`, if set, must be a positive decimal
- `min_service_days_for_eligibility` must be a non-negative integer
- `document_required_after_days` must be a positive integer if set

### Audit Requirements
- Any change to entitlement values in a Leave Policy Rule after the policy is `active` must be logged with the old and new values and flagged as a high-impact change
- Employee Leave Policy Assignment changes logged (transitions between policies)
- Status transitions logged

### Lifecycle — Leave Policy
```
draft → active → inactive → archived
```

### Lifecycle — Leave Policy Rule
```
active → inactive
```

### Future Scalability
- Leave Policy will support conditional entitlement logic (e.g., "annual leave increases by 1 day for every 2 years of service") via a rule expression engine
- Multi-jurisdiction compliance: Country-specific statutory minimum leave rules will be enforced as system-level Leave Policy templates that tenant policies must satisfy or exceed

---

## 15. Salary Structure

### Purpose
A Salary Structure is a compensation template tied to a Grade that defines the formula for calculating an employee's gross pay, net pay, and each individual earnings and deduction component. It is the master blueprint from which each employee's payslip is generated.

### Business Description
A Salary Structure answers: "For an employee at Grade L4, what does their compensation look like?" It defines each pay component — Basic Salary (as a % of CTC), House Rent Allowance, Special Allowance, Provident Fund (employer + employee), ESIC, Professional Tax, TDS — and the formula or fixed amount for each.

When an employee is assigned to a Salary Structure, and their CTC is set, the system derives each component value by applying the structure's formulas to the CTC. This drives payroll computation.

A Salary Structure has a header (the structure) and detail lines (Salary Components). Multiple structures can exist per Grade (e.g., a standard structure and an ESOP-eligible structure for senior grades).

### Relationships
- **One Salary Structure → One Grade** (the seniority context)
- **One Salary Structure → One Tenant**
- **One Salary Structure → Many Salary Components** (the component breakdown)
- **One Salary Structure → Many Employee Salary Structure Assignments** (effective-dated, links employees to structures)
- **Salary Component → Many Pay Run Lines** (actual values computed during payroll)

### Business Rules — Salary Structure

1. A Salary Structure must belong to exactly one Grade.
2. Multiple active Salary Structures may exist for the same Grade to support different variants (e.g., standard vs. higher HRA for metro cities).
3. A Salary Structure must contain at least one `earnings` component and typically at least one `deduction` component before it can be activated.
4. The sum of all percentage-based earnings components that derive from CTC must equal 100% of CTC or there must be a residual "Special Allowance" component to absorb the remainder — the structure must be balanced.
5. Salary Structure names must be unique per tenant.
6. A Salary Structure cannot be modified after it has been used in a processed Payroll Run. A new version (a new Salary Structure record) must be created.
7. Effective dating applies at the Employee Salary Structure Assignment level, not the structure itself.

### Business Rules — Salary Component

1. Each component has a `component_type`: `earnings` or `deduction`.
2. Each component has a `calculation_method`: `fixed_amount`, `percentage_of_ctc`, `percentage_of_basic`, `formula` (for complex expressions), or `statutory` (system-computed based on statutory slabs).
3. Components flagged as `is_statutory` are governed by government-mandated rules (PF, ESIC, PT, TDS) and their formulas are managed by the system, not the user.
4. The `display_order` field controls the sequence in which components appear on the payslip.
5. A `taxable` flag indicates whether the component is included in gross taxable income.
6. A component marked `is_pro_ratable` will be proportionally reduced for employees joining or leaving mid-month.

### Required Fields — Salary Structure

| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `grade_id` | FK to Grade |
| `name` | Display name (e.g., "Standard L4 Structure", "Metro HRA Structure L4") |
| `code` | Short identifier |
| `status` | Current lifecycle status |

### Optional Fields — Salary Structure

| Field | Description |
|-------|-------------|
| `description` | Narrative of what this structure is for and who it applies to |
| `effective_from` | Date from which this structure is valid (for version tracking at structure level) |
| `notes` | Internal notes for payroll team |

### Required Fields — Salary Component

| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `salary_structure_id` | FK to Salary Structure |
| `name` | Display name (e.g., "Basic Salary", "HRA", "PF Employee") |
| `code` | Short identifier (e.g., `BASIC`, `HRA`, `PF_EMP`) |
| `component_type` | `earnings` or `deduction` |
| `calculation_method` | `fixed_amount`, `percentage_of_ctc`, `percentage_of_basic`, `formula`, `statutory` |
| `is_statutory` | Boolean — system-managed statutory component |
| `taxable` | Boolean — whether this component is part of taxable income |
| `display_order` | Integer controlling the order on the payslip |

### Optional Fields — Salary Component

| Field | Description |
|-------|-------------|
| `fixed_amount` | Amount if `calculation_method = fixed_amount` |
| `percentage_value` | Percentage if `calculation_method` is percentage-based (e.g., 40 for 40% of CTC) |
| `formula_expression` | Formula string if `calculation_method = formula` (validated at save time) |
| `is_pro_ratable` | Boolean — pro-rate this component for partial months |
| `is_visible_on_payslip` | Boolean — whether to show on employee payslip (some employer-side components may be hidden) |
| `max_amount` | Cap on this component (useful for statutory caps like ESIC) |
| `min_amount` | Floor on this component |
| `description` | Explanation of the component for payroll team reference |

### Unique Constraints
- `(tenant_id, name)` — Salary Structure name unique per tenant
- `(tenant_id, code)` — Salary Structure code unique per tenant
- `(salary_structure_id, code)` — Component code unique within a structure

### Validation Rules
- For `percentage_of_ctc` components: `percentage_value` must be 0–100
- For `fixed_amount` components: `fixed_amount` must be ≥ 0
- `formula_expression` must be parseable by the payroll computation engine (validated at save)
- `max_amount`, if set, must be ≥ `min_amount`
- `display_order` must be a positive integer unique within the structure
- The aggregate of all `percentage_of_ctc` earnings components must not exceed 100%

### Audit Requirements
- Any change to a Salary Component's `calculation_method`, `percentage_value`, or `fixed_amount` on an active structure must be logged — these directly affect payroll output
- Structure status transitions logged
- Employee Salary Structure Assignment changes logged with effective date

### Lifecycle — Salary Structure
```
draft → active → inactive → archived
```
- `draft` — Components being defined; not available for employee assignment
- `active` — Assignable to employees; components may be adjusted but with logged changes
- `inactive` — No new assignments; existing employees remain on this structure until transitioned
- `archived` — No longer used; all employees must have been migrated to another structure

### Lifecycle — Salary Component
```
active → inactive
```

### Future Scalability
- Formula-based components will evolve into a full expression engine supporting conditional logic (e.g., "if employee_city = 'Mumbai' then HRA = 50% of basic, else 40%")
- Salary Structure will extend to support ESOP, RSU, and variable pay component types for senior grades
- Multi-currency structures will allow components to be denominated in different currencies for international employees

---

## Appendix — Cross-Entity Dependency Map

```
Tenant ──────────────────────────────────────────────────────────────────┐
  │                                                                       │
  ├── Organization                                                        │
  │     └── Legal Entity                                                  │
  │           └── Business Unit ─── Cost Center                          │
  │                 └── Department ─── Job Title ─── Job Family          │
  │                       │                └── Grade ─── Salary Structure│
  │                 Location                                              │
  │                                                                       │
  ├── Employment Type                                                     │
  ├── Grade                                                               │
  ├── Job Family                                                          │
  ├── Holiday Calendar ─── Holiday Calendar Days                         │
  ├── Shift                                                               │
  └── Leave Policy ─── Leave Policy Rules ─── Leave Type                 │
                                                                          │
Employee Profile ─── (all of the above via Assignments) ─────────────────┘
```

---

*This document is the authoritative business entity definition for the Organization module of Evolve HRMS. It must be reviewed and updated whenever a business rule changes. Engineering must not implement schema or API behavior that contradicts these definitions.*
