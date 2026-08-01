# Evolve HRMS — Employee Domain: Business Entity Definitions

**Classification:** Internal Engineering Reference  
**Status:** Finalized  
**Module:** Employee  
**Preceding Documents:** `docs/database-standards.md`, `docs/entity-inventory.md`, `docs/org-module-entity-definitions.md`, `docs/iam-module-entity-definitions.md`

---

## Overview

The Employee domain is the operational center of the HRMS. Every other transactional module — Attendance, Leave, Payroll, Performance, Approvals — executes against an employee record as its subject. Getting the Employee domain model correct is the single most important data design decision after the Organization hierarchy.

This document adopts a deliberate separation strategy: employee data is split across purpose-specific entities rather than collapsed into one large table. This separation is not cosmetic. It enables precise access control (HR Admins can see compensation; employees can see their personal data; managers can see their team's org assignments), clean effective-dating (each dimension of an employee's position changes independently), and independent audit trails for each data category.

### Data Separation Rationale

| Data Category | Entity | Why Separate |
|---------------|--------|--------------|
| Who the person is | Employee Profile | Immutable identity anchor — never changes structurally |
| Sensitive personal data | Employee Profile (personal section) | Access-controlled separately from operational data |
| What the organization calls them | Employment Record | Governed by legal contract; effective-dated |
| Where they sit in the org | Employee Assignment (sub-entities) | Each dimension changes independently on different dates |
| Who they report to | Manager Assignment | Cross-entity relationship; changes independently |
| How to reach them | Employee Contact | Changes more frequently; separate update pathway |
| Where they live | Employee Address | Residential data; controlled for statutory compliance |
| Who to call in emergency | Emergency Contact | Sensitive; updated by employee self-service |
| Their documents | Employee Document | Binary file metadata; separate from profile |
| Tenant-defined fields | Custom Field Values | Schema extension; cannot pollute the core model |

---

## Entity Index

1. [Employee](#1-employee)
2. [Employee Profile](#2-employee-profile)
3. [Employment Record](#3-employment-record)
4. [Employee Assignment](#4-employee-assignment)
   - 4a. Department Assignment
   - 4b. Grade Assignment
   - 4c. Job Title Assignment
   - 4d. Location Assignment
   - 4e. Cost Center Assignment
   - 4f. Shift Assignment
   - 4g. Leave Policy Assignment
5. [Manager Assignment](#5-manager-assignment)
6. [Emergency Contact](#6-emergency-contact)
7. [Employee Address](#7-employee-address)
8. [Employee Contact](#8-employee-contact)
9. [Employee Document](#9-employee-document)
10. [Custom Fields](#10-custom-fields)

---

## Relationship Overview

```
Tenant
  └── Employee (the concept — entry point for the domain)
        │
        ├── Employee Profile (1:1) ──── User (IAM module)
        │
        ├── Employment Record (1..N effective-dated)
        │     └── Legal Entity, Employment Type
        │
        ├── Department Assignment (1..N effective-dated) ──── Department
        ├── Grade Assignment (1..N effective-dated) ──────── Grade
        ├── Job Title Assignment (1..N effective-dated) ──── Job Title
        ├── Location Assignment (1..N effective-dated) ────── Location
        ├── Cost Center Assignment (1..N effective-dated) ── Cost Center
        ├── Shift Assignment (1..N effective-dated) ────────── Shift
        ├── Leave Policy Assignment (1..N effective-dated) ── Leave Policy
        │
        ├── Manager Assignment (1..N effective-dated) ──── Employee Profile (self-ref)
        │
        ├── Employee Contact (1:1)
        ├── Employee Address (1..N by type)
        ├── Emergency Contact (1..N)
        ├── Employee Document (1..N)
        └── Custom Field Values (0..N) ──── Custom Field Definition
```

### The Current State Snapshot

At any point in time, an employee's full organizational position is the union of the latest active row from each effective-dated assignment entity. Reading an employee's "current state" means querying:

```
Employment Record        → current legal entity, employment type, joining date, status
Department Assignment    → current department
Grade Assignment         → current grade
Job Title Assignment     → current job title
Location Assignment      → current work location
Cost Center Assignment   → current cost center
Shift Assignment         → current shift
Leave Policy Assignment  → current leave policy entitlements
Manager Assignment       → current reporting manager(s)
```

This is the canonical way to read an employee record. There are no denormalized "current" columns duplicated on the Employee Profile — those are projection concerns handled by the application layer.

---

## 1. Employee

### Purpose
"Employee" is the business concept that encompasses all data about a person engaged by the organization. As a domain, it is the collection of all entities below. There is no single "Employee table" that holds everything — the concept materializes as the Employee Profile plus all associated assignment, contact, and document entities.

### Business Description
When someone says "look up employee Priya Sharma," they mean: find her identity record, her current job position, her manager, her contact details, her documents, and her custom field values — as a unified view. The HRMS surfaces this as an Employee Record view, but underneath it is a composed read across multiple entities.

The Employee domain owns the data. Other modules consume it:
- **Attendance** reads the employee's current shift and location
- **Leave** reads their leave policy assignment and leave balance
- **Payroll** reads their compensation, cost center, and banking details
- **Performance** reads their grade, job title, and manager
- **Approvals** reads their manager assignment to route approval chains

### Module Boundaries
The Employee module writes to all `emp_*` entities. It does not write to Attendance, Leave, or Payroll tables. Cross-module data (e.g., leave balance) is owned by the respective module and linked to the employee via their `employee_id`.

---

## 2. Employee Profile

### Purpose
Employee Profile is the immutable identity anchor for a person in the system. It holds who the person is — their name, personal details, statutory identifiers, and biographic data. It is the root entity that all other employee data hangs from.

### Business Description
The Employee Profile is created once when an employee is onboarded and fundamentally represents the person, not the job. Personal attributes — date of birth, gender, nationality, government IDs — are stored here. These are the facts that identify a human being and rarely change.

The Profile contains two categories of data:
1. **Operational identity** — employee code, joining date, status — that the rest of the system uses to reference this person.
2. **Personal biographic data** — date of birth, gender, PAN, Aadhaar, passport — that is access-restricted and subject to data protection regulations.

The Profile deliberately does not contain positional or employment-terms data (job title, department, salary, manager). Those belong to the assignment entities and Employment Record respectively. The reason: positional data changes over a career, and each change must be independently trackable with its own effective date and audit trail.

### Relationships
- **One Employee Profile → One Tenant**
- **One Employee Profile → One User** (IAM — the account they log in with)
- **One Employee Profile → One Employment Record** (active at any time)
- **One Employee Profile → Many effective-dated Assignment records** (Department, Grade, Job Title, Location, Cost Center, Shift, Leave Policy)
- **One Employee Profile → One Manager Assignment** (active at any time)
- **One Employee Profile → One Employee Contact**
- **One Employee Profile → Many Employee Addresses** (by address type)
- **One Employee Profile → Many Emergency Contacts**
- **One Employee Profile → Many Employee Documents**
- **One Employee Profile → Many Custom Field Values**
- **Referenced by** all transactional modules (Attendance, Leave, Payroll, Performance, Approvals, Recruitment) via `employee_id`

### Business Rules
1. An Employee Profile must be linked to exactly one User account. The User account must be created first; the Employee Profile is then associated with it.
2. An Employee Profile is created when an employee is onboarded. The `employee_code` is the human-readable identifier used in payslips, offer letters, and all HR communications.
3. `employee_code` must be unique per tenant. The format is tenant-configurable (e.g., `EMP-0001`, `ACM-001`).
4. The `date_of_birth` field is subject to data protection regulations. Access to it must be controlled by the `employee:profile:view_sensitive` permission. It must not appear in list views or exports unless the actor has that permission.
5. Government-issued identifiers (PAN, Aadhaar, Passport) are classified as **sensitive PII**. They must be masked in API responses by default and only revealed on explicit, logged requests with appropriate permission.
6. An Employee Profile is never hard-deleted. It is soft-deleted at termination. The record must be retained for the legally mandated period (7 years in India).
7. `gender` and `marital_status` are self-declared by the employee and may be updated at any time by the employee or an HR Admin.
8. A Profile's `status` is the system-of-record lifecycle state for the employee. It is distinct from the Employment Record status. The Profile `status` answers "is this person in the system?" while the Employment Record answers "what are the active terms of their engagement?"
9. When an employee is transferred between Legal Entities (inter-company transfer), the Employee Profile remains the same record — only a new Employment Record and updated Assignments are created.
10. The `photo_url` must be stored as a reference to the Document store, not as binary data directly in the profile.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `user_id` | FK to User — the login account |
| `employee_code` | Human-readable unique identifier (e.g., `EMP-00124`) |
| `first_name` | Legal given name |
| `last_name` | Legal family name |
| `status` | Employee lifecycle status |
| `joining_date` | Date of first employment with this organization (immutable after confirmation) |
| `created_at` | Timestamp |
| `updated_at` | Timestamp |
| `created_by` | FK to User |
| `updated_by` | FK to User |

### Optional Fields
| Field | Description |
|-------|-------------|
| `middle_name` | Legal middle name or initials |
| `preferred_name` | Name the employee prefers to go by (used in UI and comms) |
| `date_of_birth` | Date of birth — **sensitive PII** |
| `gender` | Declared gender: `male`, `female`, `non_binary`, `prefer_not_to_say` |
| `marital_status` | `single`, `married`, `divorced`, `widowed`, `separated` |
| `nationality` | ISO 3166-1 alpha-2 country code of nationality |
| `blood_group` | Blood group (for emergency medical info): `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-` |
| `pan_number` | Permanent Account Number — **sensitive PII**, India |
| `aadhaar_number` | Aadhaar UID — **sensitive PII**, India. Must be stored masked (last 4 digits visible) |
| `passport_number` | Passport number — **sensitive PII** |
| `passport_expiry_date` | Passport expiry date |
| `uan_number` | Universal Account Number (PF) — India |
| `photo_url` | Reference to uploaded profile photo in document store |
| `father_name` | Father's name (required for some statutory filings in India) |
| `mother_name` | Mother's name |
| `spouse_name` | Spouse's name (for nominee/insurance records) |
| `physically_challenged` | Boolean — for statutory reporting and accessibility |
| `deleted_at` | Soft-delete timestamp |
| `deleted_by` | FK to User who performed the soft delete |

### Unique Constraints
- `(tenant_id, employee_code)` — employee code unique per tenant
- `(tenant_id, user_id)` — one employee profile per user per tenant
- `(tenant_id, pan_number)` — PAN unique per tenant if set
- `(tenant_id, aadhaar_number)` — Aadhaar unique per tenant if set

### Validation Rules
- `employee_code` must match the tenant-configured format pattern (default: `^[A-Z0-9-]{3,20}$`)
- `date_of_birth`, if set, must result in age ≥ 14 years and ≤ 80 years at time of `joining_date`
- `joining_date` must not be more than 90 days in the future (pre-hire allowed) or more than 50 years in the past
- `pan_number` must match `[A-Z]{5}[0-9]{4}[A-Z]{1}` if provided
- `aadhaar_number` must be exactly 12 digits if provided; stored with the last 4 digits unmasked, the rest masked
- `passport_expiry_date`, if set, must be after `joining_date`
- `nationality` must be a valid ISO 3166-1 alpha-2 code

### Lifecycle
```
onboarding → probation → active → notice_period → terminated
                                               → resigned
                                               → absconded
onboarding → rejected (pre-joining dropout)
```

- `onboarding` — Record created; employee has not yet started. Joining date is in the future or today.
- `probation` — Employee has started; within the probation period defined by their Employment Record.
- `active` — Confirmed, fully operational employee.
- `notice_period` — Resignation or termination initiated; last working day set.
- `terminated` — Employment ended by the organization.
- `resigned` — Employment ended by the employee.
- `absconded` — Employee ceased attendance without formal notice.
- `rejected` — Pre-joining dropout (offer accepted but employee did not join).

### Audit Requirements
- Profile creation logged with the HR Admin who created it, timestamp, and initial `employee_code`
- Any change to sensitive PII fields (PAN, Aadhaar, passport) must be individually logged with old value (masked), new value (masked), who changed it, and when
- `status` transitions logged with: old status, new status, effective date, reason, acting user
- `joining_date` changes (pre-joining corrections only) must be logged — this field is immutable once the employee transitions to `probation`
- Any change to `photo_url` logged

---

## 3. Employment Record

### Purpose
The Employment Record is the formal legal engagement record between an employee and a Legal Entity. It captures the contractual terms of the employment relationship: which company employs them, on what terms, from when, and — upon exit — until when and for what reason.

### Business Description
While the Employee Profile answers "who is this person?", the Employment Record answers "on what terms are they engaged?" It is the closest entity to an employment contract in the data model.

Every employee has exactly one active Employment Record at any time. When employment terms change materially — a different Legal Entity (inter-company transfer), a probation conversion, a notice period — a new Employment Record is created and the previous one is closed. This produces a complete history of formal engagement changes across the employee's tenure.

Key scenarios that produce a new Employment Record:
- **Initial hire** — First record created at onboarding
- **Probation confirmation** — New record with `employment_stage = confirmed` and `probation_end_date` set
- **Inter-company transfer** — Old record closed; new record created under the new Legal Entity
- **Rehire** — A fresh record when a previously terminated employee rejoins
- **Contract renewal** — Fixed-term contract employees get a new record at renewal

### Relationships
- **One Employment Record → One Employee Profile**
- **One Employment Record → One Legal Entity** (which company formally employs them)
- **One Employment Record → One Employment Type** (full-time, contract, intern, etc.)
- **One Employment Record → One Tenant** (via Employee Profile)
- **Referenced by** Payroll Runs (to determine legal entity for salary disbursement and statutory compliance)

### Business Rules
1. Exactly one Employment Record must be active (`effective_to IS NULL`) for an employee at any time while they are in `onboarding`, `probation`, `active`, or `notice_period` status.
2. When a new Employment Record is created, the previous active record must have its `effective_to` set to `new_effective_from - 1 day`. These two operations must be atomic.
3. `joining_date` on the Employment Record is the date on which this specific engagement began. For an initial hire, this matches the Employee Profile `joining_date`. For a rehire, it is the new joining date.
4. `probation_end_date` must be on or after `joining_date`. It is calculated at creation time from the Employment Type's `default_probation_days` but may be overridden.
5. `confirmation_date` is the date the employee was confirmed (end of probation). It must be on or after `probation_end_date`.
6. `notice_period_days` is the contractually agreed notice period for this engagement. It defaults from the Employment Type but may be individually negotiated.
7. When an employee is terminated or resigns, the active Employment Record receives `last_working_date`, `exit_type`, and `exit_reason`. The record is then closed (`effective_to = last_working_date`).
8. An Employment Record is never hard-deleted. Historical records are retained for audit and statutory compliance.
9. A terminated Employment Record may not be the basis for a new Payroll Run. The Payroll module must check that a valid, active Employment Record exists before including an employee in a run.
10. `fixed_term_end_date` is only applicable when `employment_type.code = 'FTC'` (Fixed Term Contract). It must be provided for FTC employees and the system must alert HR before the date arrives.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `legal_entity_id` | FK to Legal Entity — who formally employs this person |
| `employment_type_id` | FK to Employment Type |
| `joining_date` | Start date of this specific engagement |
| `employment_stage` | `probation`, `confirmed` |
| `effective_from` | Date from which this record is valid |
| `effective_to` | Date until which this record is valid (null = currently active) |

### Optional Fields
| Field | Description |
|-------|-------------|
| `probation_end_date` | Expected end date of the probation period |
| `confirmation_date` | Actual date the employee was confirmed post-probation |
| `notice_period_days` | Contractual notice period in calendar days |
| `fixed_term_end_date` | End date for fixed-term contracts — triggers renewal alert before expiry |
| `last_working_date` | Final day the employee was/will be present |
| `exit_type` | `resigned`, `terminated`, `absconded`, `end_of_contract`, `retirement`, `death_in_service` |
| `exit_reason` | Free-text or enum reason for exit (e.g., "better opportunity", "performance") |
| `exit_reason_detail` | Additional narrative captured in the exit interview |
| `rehire_eligibility` | Boolean — whether the employee is eligible for rehire (set at exit) |
| `offer_letter_document_id` | FK to Employee Document — the offer letter for this engagement |
| `appointment_letter_document_id` | FK to Employee Document — the formal appointment letter |
| `created_by` | FK to User |
| `updated_by` | FK to User |

### Unique Constraints
- At most one Employment Record per employee where `effective_to IS NULL` (enforced via partial unique index)

### Validation Rules
- `effective_from` must equal `joining_date` for the first Employment Record
- `effective_to`, if set, must be ≥ `effective_from`
- `probation_end_date`, if set, must be ≥ `joining_date`
- `confirmation_date`, if set, must be ≥ `probation_end_date`
- `last_working_date`, if set, must be ≥ `joining_date`
- `fixed_term_end_date`, if set, must be > `joining_date`
- `exit_type` must be set before `effective_to` is populated on an active record
- `employment_stage` must be one of the defined enum values

### Lifecycle
```
active (effective_to IS NULL) → closed (effective_to IS NOT NULL)
```
Each individual record has exactly two states. The "employee lifecycle" is managed at the Employee Profile level. The Employment Record is a versioned snapshot of contractual terms.

### Audit Requirements
- Every new Employment Record creation logged (who created it, effective date, employment type, legal entity)
- Every closure of an Employment Record logged (who closed it, effective_to date, reason)
- `exit_type` and `exit_reason` assignments logged — exit management audit trail
- `probation_end_date` changes logged (extensions must be tracked)
- `notice_period_days` override logged with the original value and justification

---

## 4. Employee Assignment

### Purpose
Employee Assignments are a family of effective-dated records, each tracking one dimension of an employee's organizational position over time. When any positional attribute changes, a new assignment row is inserted — the old one is not updated. This produces a complete historical trail of every placement change across the employee's career.

### Design Pattern: Effective Dating

All Assignment entities share this fundamental pattern:

| Aspect | Rule |
|--------|------|
| **Current record** | The row where `effective_to IS NULL` (or `effective_to >= today`) |
| **Historical records** | All rows where `effective_to < today` |
| **Change operation** | Set `effective_to = new_effective_from - 1 day` on the current row; insert a new row with `effective_from = change_date` |
| **Atomicity** | The close and the insert must be a single database transaction |
| **Retroactive changes** | Permitted for corrections, but the change to a historical row must be logged as an amendment with the original and corrected values |
| **Future-dated changes** | Permitted — an assignment may be created with `effective_from` in the future, allowing pre-staged changes (e.g., a transfer effective next month) |

### Why Each Assignment Is Its Own Entity

Each dimension is independent. An employee can:
- Get a grade promotion (Grade Assignment changes) without changing department
- Transfer to a new location (Location Assignment changes) without changing their job title
- Be put on a different shift (Shift Assignment changes) without a grade change

Collapsing these into one "position" entity would force a new version of the entire position record for any single-dimension change, creating an explosion of meaningless history rows.

---

### 4a. Department Assignment

#### Purpose
Records which Department an employee belongs to at any point in time. Primary driver of org chart placement, leave approval routing, and access scope boundaries for department managers.

#### Business Rules
1. Every employee must have an active Department Assignment from their `joining_date` onwards.
2. A Department Assignment change constitutes an **inter-department transfer**. The system must trigger a notification to the old and new Department Heads.
3. The Department Assignment drives which department manager sees this employee in scoped views.
4. If a Department is archived, any employees with active assignments to it must be reassigned before the archive can proceed.
5. A retroactive Department Assignment correction (changing a past effective_from) requires HR Admin authorization and must be logged as an amendment.

#### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `department_id` | FK to Department |
| `effective_from` | Date from which this assignment is active |
| `effective_to` | Date until which this assignment is valid (null = current) |
| `created_by` | FK to User |

#### Optional Fields
| Field | Description |
|-------|-------------|
| `transfer_reason` | Reason for department transfer (`internal_transfer`, `restructuring`, `role_change`, `promotion`) |
| `transfer_notes` | Free-text notes about the transfer context |

#### Unique Constraints
- At most one Department Assignment per employee where `effective_to IS NULL`

---

### 4b. Grade Assignment

#### Purpose
Records the seniority level (Grade) an employee holds at any point in time. The Grade drives compensation band eligibility, approval authority, and career level visibility.

#### Business Rules
1. Every employee must have an active Grade Assignment from their `joining_date`.
2. A Grade change is a **promotion** (upward) or **demotion** (downward). The direction must be automatically determined by comparing the previous Grade's `level` to the new one.
3. A Grade change must trigger a compensation review alert — the employee's current compensation should be validated against the new Grade's salary band.
4. Grade Assignment history is the source of truth for the employee's career progression timeline.
5. The system must warn (not block) if the new Grade's salary band minimum exceeds the employee's current compensation.

#### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `grade_id` | FK to Grade |
| `effective_from` | Date from which this grade is active |
| `effective_to` | Date until which this grade is valid (null = current) |
| `created_by` | FK to User |

#### Optional Fields
| Field | Description |
|-------|-------------|
| `change_type` | `initial`, `promotion`, `demotion`, `correction` |
| `change_reason` | Free-text or enum reason for the grade change |

#### Unique Constraints
- At most one Grade Assignment per employee where `effective_to IS NULL`

---

### 4c. Job Title Assignment

#### Purpose
Records the Job Title (designation) held by an employee at any point in time. This is what appears on business cards, offer letters, and payslips.

#### Business Rules
1. Every employee must have an active Job Title Assignment from `joining_date`.
2. A Job Title change may or may not coincide with a Grade change. Both are independently managed.
3. The Job Title's Grade must be consistent with the employee's current Grade Assignment. A mismatch must produce a validation warning (not a hard block — exceptions exist for transition periods).
4. The Job Title Assignment is the source of truth for what title appears on system-generated letters.
5. When an employee receives a promotion that involves both a Grade change and a Job Title change, both assignment records must be created with the same `effective_from` date.

#### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `job_title_id` | FK to Job Title |
| `effective_from` | Date from which this title is active |
| `effective_to` | Date until which this title is valid (null = current) |
| `created_by` | FK to User |

#### Optional Fields
| Field | Description |
|-------|-------------|
| `change_reason` | Reason for title change |
| `display_on_payslip` | Boolean — override to control whether this exact title appears on the payslip |

#### Unique Constraints
- At most one Job Title Assignment per employee where `effective_to IS NULL`

---

### 4d. Location Assignment

#### Purpose
Records the primary work Location of an employee at any point in time. Location drives holiday calendar assignment, state-level statutory compliance (Professional Tax), and attendance geo-rules.

#### Business Rules
1. Every employee must have an active Location Assignment from `joining_date`.
2. A Location change triggers a re-evaluation of the employee's applicable Holiday Calendar for the current year.
3. A cross-state Location change (e.g., Mumbai → Bengaluru) must trigger a Professional Tax re-computation alert for the current payroll period.
4. `work_arrangement` captures whether the employee is working in-office, remote, or hybrid at this location — this is distinct from the Location being `is_remote`.

#### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `location_id` | FK to Location |
| `effective_from` | Date from which this location is active |
| `effective_to` | Date until which this location is valid (null = current) |
| `created_by` | FK to User |

#### Optional Fields
| Field | Description |
|-------|-------------|
| `work_arrangement` | `in_office`, `remote`, `hybrid` |
| `relocation_type` | `permanent`, `temporary` — for temporary deputation, `effective_to` must be set |

#### Unique Constraints
- At most one Location Assignment per employee where `effective_to IS NULL`

---

### 4e. Cost Center Assignment

#### Purpose
Records which Cost Center an employee's salary and overhead costs are attributed to at any point in time, for financial reporting and GL integration.

#### Business Rules
1. Every employee must have an active Cost Center Assignment from `joining_date`.
2. A single employee's cost may be split across multiple Cost Centers using `allocation_percent`. The allocation percentages across all active Cost Center Assignments for one employee must sum to exactly 100%.
3. When allocation is split, multiple Cost Center Assignment rows exist for the same employee with the same `effective_from` date — one per Cost Center — with their `allocation_percent` values summing to 100.
4. Cost Center Assignments drive how payroll run line items are posted to the General Ledger in accounting integrations.
5. The primary Cost Center (highest `allocation_percent`, or `is_primary = true`) is what appears on the employee's profile view and org chart.

#### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `cost_center_id` | FK to Cost Center |
| `allocation_percent` | Percentage of this employee's cost attributed to this cost center |
| `effective_from` | Date from which this assignment is active |
| `effective_to` | Date until which this assignment is valid (null = current) |
| `created_by` | FK to User |

#### Optional Fields
| Field | Description |
|-------|-------------|
| `is_primary` | Boolean — marks the primary cost center when allocation is split |

#### Validation Rules
- `allocation_percent` must be between 1 and 100
- Sum of `allocation_percent` for all active assignments (same `effective_from`, same `employee_id`) must equal 100

---

### 4f. Shift Assignment

#### Purpose
Records the working shift applicable to an employee for attendance calculation purposes, at any point in time.

#### Business Rules
1. Every employee must have an active Shift Assignment from `joining_date`.
2. Shift changes take effect from the next attendance day after the `effective_from` date. Attendance records already captured are not retroactively recalculated.
3. Shift Roster entries take precedence over Shift Assignments on specific dates — the Shift Assignment is the default; the Roster is an override.
4. For employees on flexible/rotational shifts, the `shift_id` may point to a "Flexible" shift definition, and the actual daily schedule is governed by the Shift Roster.

#### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `shift_id` | FK to Shift |
| `effective_from` | Date from which this shift applies |
| `effective_to` | Date until which this shift applies (null = current) |
| `created_by` | FK to User |

#### Optional Fields
| Field | Description |
|-------|-------------|
| `assignment_reason` | Reason for shift change |

#### Unique Constraints
- At most one Shift Assignment per employee where `effective_to IS NULL`

---

### 4g. Leave Policy Assignment

#### Purpose
Records which Leave Policy governs an employee's leave entitlements at any point in time. This drives the leave balance initialization and determines which leave types and quotas the employee is eligible for.

#### Business Rules
1. Every employee must have an active Leave Policy Assignment from `joining_date`.
2. When a Leave Policy Assignment changes (e.g., employee converts from probation policy to standard policy upon confirmation), leave balances must be recalculated from the new assignment's `effective_from` date.
3. An employee on probation is typically assigned a `Probation Policy` with restricted entitlements. On confirmation, they are transitioned to the `Standard Policy`.
4. Leave Policy Assignments drive the Leave module's balance initialization. The Payroll module references them for Loss of Pay calculations.
5. When an employee's Employment Type changes, the HR Admin must review and update the Leave Policy Assignment if the new Employment Type has different leave entitlements.

#### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `leave_policy_id` | FK to Leave Policy |
| `effective_from` | Date from which this policy applies |
| `effective_to` | Date until which this policy applies (null = current) |
| `created_by` | FK to User |

#### Optional Fields
| Field | Description |
|-------|-------------|
| `assignment_reason` | `initial`, `probation_confirmation`, `employment_type_change`, `policy_revision`, `correction` |

#### Unique Constraints
- At most one Leave Policy Assignment per employee where `effective_to IS NULL`

---

### Audit Requirements (All Assignment Entities)
- Every new assignment creation logged: entity type, employee, new value, effective_from, created_by, timestamp
- Every assignment closure logged: entity type, employee, closed value, effective_to, closed_by, timestamp
- Retroactive corrections (changing `effective_from` of a historical row) logged as amendments: old effective_from, new effective_from, who corrected it, why
- Future-dated assignments logged at time of creation; a second log entry generated when they become effective
- Bulk assignment changes (e.g., department restructure moving 50 employees) must produce individual log entries per employee, not one bulk entry

---

## 5. Manager Assignment

### Purpose
Manager Assignment is the effective-dated record of the reporting relationship for an employee — who their primary (solid-line) manager is, and optionally, who their secondary (dotted-line) manager is. It is the backbone of approval routing, access scope, and org chart rendering.

### Business Description
The reporting hierarchy in an HRMS is not a static tree embedded in a department table. It changes: employees get new managers when their manager leaves, when they transfer teams, or when the organization restructures. Each of these changes must be captured with its exact effective date so that historical approval records and access scopes are correct at the time they occurred.

Manager Assignment is a self-referencing relationship on the Employee entity. Both the employee and the manager are Employee Profiles within the same tenant.

Manager types:
- **Solid-line manager** (`reporting_type = solid_line`) — The formal, administrative reporting manager. Receives leave requests, approves attendance corrections, conducts performance reviews. Every employee must have exactly one solid-line manager at all times (except the top of the hierarchy).
- **Dotted-line manager** (`reporting_type = dotted_line`) — A secondary manager with functional authority. Does not handle administrative approvals by default; their role is configurable per tenant. An employee may have zero or more dotted-line managers.
- **Skip-level manager** — Not a stored relationship; derived by traversing the solid-line tree two levels up. Not modeled as a separate entity.
- **Functional manager** (`reporting_type = functional`) — Tenant-configurable; used in matrix organizations.

### Relationships
- **One Manager Assignment → One Employee Profile** (the employee being managed)
- **One Manager Assignment → One Employee Profile** (the manager)
- **One Manager Assignment → One Tenant**

### Business Rules
1. The solid-line manager must be a different Employee than the employee themselves (no self-reporting).
2. The solid-line reporting chain must be acyclic — employee A cannot report to B if B reports to A at any point in the hierarchy. This must be validated before saving a new Manager Assignment.
3. Every employee except the top-level executive(s) must have exactly one active solid-line Manager Assignment at all times.
4. When a manager's employment is terminated, all of their direct reports' Manager Assignments must be updated before or on the manager's last working date. The system must alert HR when a manager's notice period begins.
5. The manager must be an `active` employee in the same tenant. An employee cannot report to someone from a different tenant or a terminated employee.
6. A dotted-line Manager Assignment does not expire automatically when the manager is terminated. It must be explicitly closed or it will be flagged in data quality alerts.
7. The reporting hierarchy depth is not architecturally capped but practical operational limits (e.g., >10 levels) should trigger a data quality warning.
8. Manager Assignment changes are the primary trigger for recalculating Approval Workflow chains in the Approvals module.
9. Cross-department reporting is fully valid — an employee in the Engineering department can report to a manager in the Product department.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile — the subordinate |
| `manager_employee_id` | FK to Employee Profile — the manager |
| `reporting_type` | `solid_line`, `dotted_line`, `functional` |
| `effective_from` | Date from which this reporting relationship is active |
| `effective_to` | Date until which this relationship is valid (null = current) |
| `created_by` | FK to User |

### Optional Fields
| Field | Description |
|-------|-------------|
| `change_reason` | Reason for manager change (`initial`, `manager_exit`, `transfer`, `restructuring`, `correction`) |
| `notes` | Internal HR notes about this reporting relationship |

### Unique Constraints
- At most one solid-line Manager Assignment per employee where `effective_to IS NULL`

### Validation Rules
- `employee_id` must not equal `manager_employee_id`
- `manager_employee_id` must reference an `active` Employee Profile
- `reporting_type` must be one of `solid_line`, `dotted_line`, `functional`
- Creating a solid-line assignment must pass a cycle-detection check on the full reporting hierarchy
- `effective_from` must not precede the employee's `joining_date`

### Lifecycle
```
active (effective_to IS NULL) → closed (effective_to IS NOT NULL)
```

### Audit Requirements
- Every Manager Assignment creation logged: employee, manager, type, effective_from, created_by
- Every Manager Assignment closure logged: employee, manager, effective_to, closed_by, change_reason
- Hierarchy cycle-check violations must be logged as security/data-integrity events even if the operation was blocked
- Manager exits that leave direct reports without a manager must be logged as open data quality issues until resolved

---

## 6. Emergency Contact

### Purpose
Emergency Contact records the person(s) an employee designates to be notified in case of a medical emergency, accident, or other critical situation while the employee is at work.

### Business Description
This is information collected during onboarding and maintained by the employee throughout their tenure. It is accessed only in genuine emergencies by authorized HR Admins or Managers. It must never appear in list exports, reporting dashboards, or bulk data operations.

An employee may designate one or more emergency contacts with a priority order.

### Relationships
- **One Emergency Contact → One Employee Profile**
- **One Emergency Contact → One Tenant**

### Business Rules
1. An employee should have at least one Emergency Contact. The system prompts for this during onboarding but does not hard-block if not provided.
2. Exactly one Emergency Contact per employee must be designated as `is_primary = true`.
3. An employee may have up to 3 Emergency Contacts.
4. Emergency Contact data is accessible via the `employee:emergency_contacts:view` permission only. It must not appear in standard employee list views.
5. Emergency Contacts are updated by the employee via self-service or by an HR Admin. Managers do not have write access.
6. Emergency Contact phone numbers must be different from the employee's own registered phone number.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `full_name` | Contact person's full name |
| `relationship` | Relationship to the employee: `spouse`, `parent`, `sibling`, `child`, `friend`, `other` |
| `primary_phone` | Primary contact phone number in E.164 format |
| `is_primary` | Boolean — designates this as the primary emergency contact |

### Optional Fields
| Field | Description |
|-------|-------------|
| `secondary_phone` | Secondary phone number |
| `email` | Email address |
| `address` | Brief address (city, state is sufficient) |
| `notes` | Any special information (e.g., "available only after 6 PM") |

### Unique Constraints
- `(employee_id, is_primary)` where `is_primary = true` — at most one primary contact per employee

### Validation Rules
- `primary_phone` must be a valid E.164 format number
- `relationship` must be one of the defined enum values
- At most 3 Emergency Contact records per employee (enforced at application layer)
- `is_primary = true` must be set on exactly one record per employee

### Lifecycle
```
active → inactive
```
Inactive contacts are retained for audit but not shown in the active view.

### Audit Requirements
- Any change to an Emergency Contact record (add, edit, remove) must be logged
- Access events (when the contact is viewed) are not individually logged unless the viewer is accessing in emergency context — that event is logged to `sys_audit_logs` as a sensitive data access

---

## 7. Employee Address

### Purpose
Employee Address stores the residential and correspondence addresses for an employee, organized by address type. Used for statutory filings, payslip mailing, and document generation.

### Business Description
Employees typically have two relevant addresses: their **current/permanent residence** (where they live now, used for PT and income tax jurisdiction) and their **permanent address** (used on Form 16, PF nomination, and formal statutory documents). These may differ — a professional living in Bengaluru may still have their family home in Kerala as their permanent address.

A third address type, **correspondence**, may be needed when the employee wants documents delivered to a different address (e.g., a care-of address or temporary residence).

### Relationships
- **One Employee Address → One Employee Profile**
- **One Employee Address → One Tenant**

### Business Rules
1. An employee may have one address per `address_type`. Multiple records of the same type are not permitted.
2. `address_type` options: `current`, `permanent`, `correspondence`.
3. The `current` address is the tax domicile for Professional Tax computation (India). When the `current` address state changes, a PT re-computation alert must be triggered.
4. Address data is treated as **PII** and is subject to data protection rules. Access requires `employee:profile:view_sensitive` permission.
5. Employees may update their own addresses via self-service. Changes to `current` address are routed through HR confirmation in tenants that have enabled address verification workflows.
6. Addresses are soft-deleted (historical versions preserved) when updated to maintain a history for statutory filing reference.
7. Country, state, and city fields must reference the system's reference data where available to ensure consistency in statutory reporting.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `address_type` | `current`, `permanent`, `correspondence` |
| `address_line_1` | Street address, building name, flat number |
| `city` | City name |
| `state_province` | State or province |
| `country_code` | ISO 3166-1 alpha-2 country code |
| `postal_code` | Pin code or zip code |

### Optional Fields
| Field | Description |
|-------|-------------|
| `address_line_2` | Area, locality, landmark |
| `state_code` | ISO 3166-2 state code (for statutory mapping) |
| `is_verified` | Boolean — whether HR has verified this address |
| `verified_at` | Timestamp of verification |
| `verified_by` | FK to User who verified |
| `effective_from` | Date from which this address is valid (defaults to date of entry) |

### Unique Constraints
- `(employee_id, address_type)` — one address record per type per employee

### Validation Rules
- `address_line_1` must be 3–200 characters
- `city` must be 2–100 characters
- `postal_code` must match the expected format for the given `country_code` where known
- `country_code` must be a valid ISO 3166-1 alpha-2 code
- `address_type` must be one of the defined enum values

### Lifecycle
```
active → superseded
```
When an address is updated, the old record is soft-deleted with `deleted_at` and a new record is created. This preserves the address history for statutory purposes.

### Audit Requirements
- Every address creation, update, and deletion logged with acting user and timestamp
- `state_province` changes on `current` address logged specifically (triggers PT review)
- Address verification events logged (who verified, when, method)

---

## 8. Employee Contact

### Purpose
Employee Contact stores the communication details for an employee — work phone, personal phone, and personal email — used for HR communications, notifications, MFA, and emergency reach-out.

### Business Description
An employee has multiple contact channels. Work contacts are assigned by the organization (work email is usually their User email). Personal contacts are self-declared and used for:
- SMS OTP / MFA authentication
- Leave approval notifications via SMS
- Salary credit notifications
- System alerts when work email is unreachable

Work email is stored on the User record (in the IAM module). Personal contacts live here.

### Relationships
- **One Employee Contact → One Employee Profile** (1:1)
- **One Employee Contact → One Tenant**

### Business Rules
1. Each Employee has exactly one Employee Contact record. It is created during onboarding.
2. `personal_email` must be different from the employee's work email (stored on the User record) to avoid confusion during offboarding.
3. `personal_mobile` is the number used for MFA fallback and payslip SMS. Changes to this field must be verified via OTP to the new number before taking effect.
4. Personal contact data is accessible by the employee themselves and HR Admins with appropriate permissions. Managers do not have access to personal contact details by default.
5. When `personal_mobile` is changed, the User Identity `phone_number` must also be updated atomically if it was being used for MFA.
6. `work_phone` is the office/extension number and is visible in the employee directory.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile (unique — 1:1) |

### Optional Fields
| Field | Description |
|-------|-------------|
| `personal_mobile` | Personal mobile number in E.164 format — used for MFA, SMS notifications |
| `personal_email` | Personal email — used for payslip delivery if configured by tenant |
| `work_phone` | Office or desk phone number — appears in employee directory |
| `work_extension` | Internal phone extension |
| `linkedin_url` | LinkedIn profile URL (used in recruitment and org directory) |
| `skype_id` | Legacy communication handle |
| `slack_member_id` | Slack member ID for integration-based notifications |

### Unique Constraints
- `employee_id` — one Contact record per employee
- `(tenant_id, personal_mobile)` — personal mobile unique per tenant (prevents two employees sharing one MFA number)
- `(tenant_id, personal_email)` — personal email unique per tenant

### Validation Rules
- `personal_mobile` must be a valid E.164 format number if set
- `personal_email` must be a valid email address if set; must differ from the User's work email
- `linkedin_url` must be a valid URL matching `^https://www\.linkedin\.com/` if set

### Lifecycle
The Employee Contact record mirrors the Employee Profile lifecycle — it is never independently lifecycle-managed. It is soft-deleted when the Employee Profile is soft-deleted.

### Audit Requirements
- `personal_mobile` changes logged with old value (masked), new value (masked), OTP verification status, who initiated
- `personal_email` changes logged with old and new value, who initiated
- Access to personal contact details logged when accessed outside of self-service context

---

## 9. Employee Document

### Purpose
Employee Document is a metadata record that links a file (stored in the Document module) to a specific employee, categorizes it by document type, and tracks its validity period and verification status.

### Business Description
Employees accumulate documents throughout their tenure: government-issued ID proofs submitted during onboarding, educational certificates for qualification verification, the offer letter and appointment letter from their engagement, performance appraisal letters, salary revision letters, experience letters at exit, and medical certificates for sick leave.

The actual binary file is stored in the Document module (`doc_files` entity). The Employee Document entity is the contextual bridge that says: "this specific file, with this document type, belongs to this employee, was verified on this date, and expires on this date."

Document categories:
- **Identity proofs** — PAN card, Aadhaar, passport, driving license
- **Address proofs** — utility bill, bank statement, Aadhaar
- **Educational certificates** — degree, diploma, professional certifications
- **Employment letters** — offer letter, appointment letter, confirmation letter, salary revision letter
- **Statutory documents** — Form 16, PF nomination, ESIC card
- **Exit documents** — resignation letter, experience letter, relieving letter, FNF settlement
- **Other** — medical certificate, visa, work permit

### Relationships
- **One Employee Document → One Employee Profile**
- **One Employee Document → One Document File** (the actual uploaded file in the doc_ module)
- **One Employee Document → One Tenant**

### Business Rules
1. An Employee Document is a reference record — the actual file content is stored in the Document module. This entity is the metadata and classification layer.
2. `document_type` controls what category the document belongs to. It must come from a tenant-configurable list of document types.
3. If a document type is marked as `is_mandatory` in the tenant's document checklist, the system must flag employees who are missing that document type.
4. Documents with an `expiry_date` (e.g., passports, work permits, certifications) must trigger an alert to HR and the employee N days before expiry (configurable per document type, default: 30 days).
5. `verification_status` tracks whether HR has reviewed and confirmed the document is genuine and valid. Payroll and compliance processes may require certain documents to be `verified` before proceeding.
6. A document may be superseded: when an employee provides a new version (e.g., renewed passport), the old Employee Document record is marked `superseded`, and the new one is created.
7. Employees may upload their own documents via self-service for defined document types. HR-managed document types (employment letters, statutory filings) can only be uploaded by HR Admins.
8. An Employee Document record is never hard-deleted. Even after exit, documents are retained per the data retention policy.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `document_file_id` | FK to Document File (in the Documents module) |
| `document_type` | Category of document (from tenant document type list) |
| `document_name` | Display name for this document (e.g., "PAN Card — Priya Sharma") |
| `uploaded_by_type` | `employee_self` or `hr_admin` — who uploaded it |
| `created_at` | Timestamp |

### Optional Fields
| Field | Description |
|-------|-------------|
| `document_number` | ID number on the document (e.g., passport number, PAN number) |
| `issued_by` | Issuing authority (e.g., "Ministry of External Affairs") |
| `issued_date` | Date the document was issued |
| `expiry_date` | Date the document expires — triggers alerts when approaching |
| `verification_status` | `pending`, `verified`, `rejected` |
| `verified_by` | FK to User who verified the document |
| `verified_at` | Timestamp of verification |
| `rejection_reason` | Reason if verification was rejected |
| `is_superseded` | Boolean — whether this document has been replaced by a newer version |
| `superseded_by_document_id` | FK to the newer Employee Document that replaces this |
| `notes` | HR notes about this document |

### Unique Constraints
- `(employee_id, document_type, is_superseded)` where `is_superseded = false` — at most one active document per type per employee (soft constraint; some types allow multiple active documents, e.g., certifications)

### Validation Rules
- `expiry_date`, if set, must be after `issued_date`
- `document_type` must be one of the tenant-configured document type values
- `document_number`, if set, must pass the format validation for the specific `document_type` (e.g., PAN format check)
- `verification_status` must be one of `pending`, `verified`, `rejected`

### Lifecycle
```
pending → verified
       → rejected
verified → superseded (when replaced by a newer version)
```

### Audit Requirements
- Every document upload logged: employee, document type, uploaded by, upload timestamp
- Every verification decision logged: who verified/rejected, timestamp, decision
- Rejection events logged with reason
- Document expiry alerts generated and logged
- Access to sensitive document content (viewing the actual file) logged for compliance document types (PAN, Aadhaar, passport)

---

## 10. Custom Fields

### Purpose
Custom Fields provide a tenant-controlled schema extension mechanism that allows HR Admins to capture business-specific employee attributes that are not part of the standard data model — without requiring code changes or database migrations.

### Business Description
Every organization has unique HR data needs. One company tracks "Employee Blood Type" (for field operations safety). Another tracks "Vehicle Registration Number" (for parking permits). A third tracks "Professional Certification Number" (for client-facing compliance). These cannot all be built into the standard model.

Custom Fields solve this by giving HR Admins a self-service way to define new fields — specifying the field name, data type, which entity they attach to, whether they are mandatory, and what their validation rules are. The actual values for each employee are then stored in Custom Field Values records.

This is a two-entity pattern:
- **Custom Field Definition** — the schema (what the field is, what type, what rules)
- **Custom Field Value** — the data (an employee's actual value for a specific field)

### Custom Field Definition

#### Purpose
Defines a custom attribute that HR Admins want to capture for employees, configuring the field's type, label, validation, and which employee entity it extends.

#### Business Description
An HR Admin opens the "Custom Fields" settings page and creates a new field. They define: the label ("Blood Type"), the data type (`select`), the options (`A+, A-, B+, B-, AB+, AB-, O+, O-`), whether it is mandatory, and which entity it applies to (`employee_profile`). After saving, the field immediately appears in the Employee Profile form for data entry.

#### Business Rules
1. Custom Field Definitions are scoped to a Tenant — each tenant has its own set.
2. The `entity_type` field controls which entity the custom field extends. Supported target entities: `employee_profile`, `employment_record`.
3. Supported `field_type` values: `text` (short text), `textarea` (long text), `number`, `decimal`, `date`, `select` (single-select), `multi_select`, `boolean`, `url`, `email`.
4. For `select` and `multi_select` types, the `options` list must contain at least two items.
5. A Custom Field Definition, once created and populated with values, cannot have its `field_type` changed. A new definition must be created and data migrated.
6. A `field_code` is a machine-readable identifier (snake_case) for the field used in API responses, exports, and integrations. Once set, it is immutable.
7. Mandatory custom fields must be filled before an Employee Profile can be moved from `onboarding` to `probation` status — configurable per tenant.
8. Soft-deleted Custom Field Definitions retain all their values and the field code in the API response as `null`, ensuring integrations do not break.
9. Maximum of 100 Custom Field Definitions per entity type per tenant (platform limit to prevent model abuse).

#### Required Fields — Custom Field Definition
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `entity_type` | Target entity: `employee_profile`, `employment_record` |
| `field_code` | Machine-readable snake_case identifier (e.g., `blood_type`, `vehicle_reg_no`) — immutable |
| `field_label` | Human-readable label shown in the UI (e.g., "Blood Type") |
| `field_type` | `text`, `textarea`, `number`, `decimal`, `date`, `select`, `multi_select`, `boolean`, `url`, `email` |
| `is_mandatory` | Boolean — whether this field must be filled during onboarding |
| `is_active` | Boolean — whether this field is currently visible and editable |
| `sort_order` | Integer for display ordering in the UI |

#### Optional Fields — Custom Field Definition
| Field | Description |
|-------|-------------|
| `field_description` | Help text shown below the field in the UI |
| `options` | JSONB array of `{value, label}` objects — required for `select` and `multi_select` types |
| `default_value` | Default value pre-populated in the form for new employees |
| `min_value` | Minimum value for `number` and `decimal` types |
| `max_value` | Maximum value for `number` and `decimal` types |
| `max_length` | Maximum character length for `text` and `textarea` types |
| `regex_pattern` | Validation regex for `text` type (e.g., `^[A-Z]{2}[0-9]{6}$` for a vehicle number) |
| `section_label` | Grouping label — custom fields with the same `section_label` are visually grouped |
| `is_pii` | Boolean — marks this field as containing Personally Identifiable Information (controls access and export behavior) |
| `is_searchable` | Boolean — whether employees can be searched/filtered by this field's value |

#### Unique Constraints
- `(tenant_id, entity_type, field_code)` — field code unique per entity per tenant

#### Validation Rules
- `field_code` must match `^[a-z][a-z0-9_]{1,49}$` — lowercase, starts with a letter, underscores allowed, max 50 characters
- `field_code` is immutable once created
- For `select` and `multi_select`: `options` must be a non-empty array with at least 2 items; each option must have a non-empty `value` and `label`; `value` strings must be unique within the options array
- `regex_pattern`, if set, must be a valid regular expression (validated at save time)
- `min_value` must be ≤ `max_value` if both are set
- `field_type` may not be changed after the first Custom Field Value for this definition has been created

#### Lifecycle
```
active → inactive
```
Inactive definitions are hidden from the UI and not validated at onboarding. Their values in existing records are preserved and returned in API responses as `null`. They are never hard-deleted.

---

### Custom Field Value

#### Purpose
Stores the actual value of a Custom Field for a specific employee record.

#### Business Description
Once a Custom Field Definition exists, each employee's record may carry a value for that field. Custom Field Values are stored as a key-value structure — one row per `(employee_id, custom_field_definition_id)` pair. The value is stored in a typed column appropriate to the `field_type` to enable proper querying and sorting.

#### Business Rules
1. A Custom Field Value row may only exist for a `Custom Field Definition` that is `is_active = true` at the time of creation.
2. For mandatory fields, the value must not be null or empty when the Employee Profile is confirmed.
3. When a Custom Field Definition is made `inactive`, existing Custom Field Values are not deleted — they are retained as historical data.
4. For `select` fields, the value must be one of the current options in the definition's `options` list. If the options list changes and an employee's existing value is no longer valid, a data quality alert is raised.
5. For `multi_select` fields, the stored value is a JSONB array of option values.
6. Custom Field Values are returned in API responses nested under the employee record in a `custom_fields` map keyed by `field_code`.

#### Required Fields — Custom Field Value
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `custom_field_definition_id` | FK to Custom Field Definition |
| `created_by` | FK to User |
| `updated_by` | FK to User |

#### Optional Fields — Custom Field Value
| Field | Description |
|-------|-------------|
| `value_text` | Value storage for `text`, `textarea`, `email`, `url` types |
| `value_number` | Value storage for `number` type (integer) |
| `value_decimal` | Value storage for `decimal` type (numeric) |
| `value_date` | Value storage for `date` type |
| `value_boolean` | Value storage for `boolean` type |
| `value_json` | Value storage for `select` (single string) and `multi_select` (JSON array) types |

#### Unique Constraints
- `(employee_id, custom_field_definition_id)` — one value record per field per employee

#### Validation Rules
- The populated column must match the `field_type` of the referenced Custom Field Definition
- For `select`: the stored value must be present in the definition's `options.value` list
- For mandatory fields: the relevant value column must not be null
- For `text`: length must not exceed `max_length` if set
- For `number`/`decimal`: value must be within `min_value` and `max_value` if set
- For `text` with `regex_pattern`: value must match the pattern

#### Audit Requirements — Custom Fields
- Custom Field Definition creation, deactivation, and options changes logged (options changes are particularly sensitive as they can invalidate existing values)
- Custom Field Value writes logged: employee, field, old value, new value, who changed it, timestamp
- `is_pii = true` field access and export events logged

---

## Onboarding Completeness Checklist

The Employee domain defines the onboarding completeness model. An employee is considered fully onboarded when all of the following are satisfied:

| Item | Entity | Condition |
|------|--------|-----------|
| Profile created | Employee Profile | `status = onboarding` or beyond |
| User account linked | User | `user_id` set on profile |
| Employment record created | Employment Record | Active record exists |
| Department assigned | Department Assignment | Active record exists |
| Grade assigned | Grade Assignment | Active record exists |
| Job title assigned | Job Title Assignment | Active record exists |
| Location assigned | Location Assignment | Active record exists |
| Cost center assigned | Cost Center Assignment | Active record with 100% total |
| Shift assigned | Shift Assignment | Active record exists |
| Leave policy assigned | Leave Policy Assignment | Active record exists |
| Reporting manager set | Manager Assignment | Active solid-line record exists |
| Contact details entered | Employee Contact | Record exists |
| Current address entered | Employee Address | `address_type = current` record exists |
| Emergency contact added | Emergency Contact | At least one record with `is_primary = true` |
| Mandatory documents uploaded | Employee Document | All mandatory document types have a record |
| Mandatory custom fields set | Custom Field Value | All mandatory definitions have a non-null value |

This checklist drives the onboarding progress indicator in the HR Admin UI and determines when the employee can transition from `onboarding` to `probation` status.

---

## Cross-Module Consumption of Employee Data

| Module | Reads From Employee Domain | What It Uses |
|--------|---------------------------|--------------|
| **Attendance** | Shift Assignment, Location Assignment | Compute expected schedule; validate geo-location |
| **Leave** | Leave Policy Assignment, Department Assignment, Manager Assignment | Determine entitlements; route approvals |
| **Payroll** | Employment Record, Grade Assignment, Cost Center Assignment, Bank Account | Determine eligible employees, cost allocation, disbursement |
| **Performance** | Job Title Assignment, Grade Assignment, Manager Assignment, Department Assignment | Contextualize reviews; set review chains |
| **Approvals** | Manager Assignment, Department Assignment | Build approval chains |
| **Reports** | All assignment entities | Headcount, attrition, org hierarchy analytics |
| **IAM** | Employee Profile → User link | Resolve user_id to employee context for scope checks |
| **Notifications** | Employee Contact | Deliver SMS, email notifications |

---

*This document is the authoritative business entity definition for the Employee domain of Evolve HRMS. No module may write to `emp_*` entities outside the Employee module's service boundary. All cross-module reads are performed via read-only projections.*
