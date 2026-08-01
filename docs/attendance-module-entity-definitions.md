# Evolve HRMS — Attendance Module: Business Entity Definitions

**Classification:** Internal Engineering Reference  
**Status:** Finalized  
**Module:** Attendance  
**Preceding Documents:** `docs/database-standards.md`, `docs/entity-inventory.md`, `docs/org-module-entity-definitions.md`, `docs/employee-domain-entity-definitions.md`

---

## Overview

The Attendance module is the operational heartbeat of the HRMS. It captures every working hour an employee renders, converts raw capture events into clean daily records, manages the schedule that governs expectations, tracks authorized overtime, and handles the correction workflow when reality deviates from the record.

Attendance data is one of the most sensitive inputs in the system. It directly determines:
- **Loss of Pay (LOP)** — absent days deducted from salary in the Payroll module
- **Leave auto-marking** — uninstructed absences that trigger leave deduction or LOP
- **Overtime pay** — authorized extra hours that generate Overtime Pay Run Lines
- **Compliance reporting** — Factories Act compliance, Shop & Establishment registers
- **Performance signals** — attendance patterns surfaced in performance analytics

Getting attendance right requires precision at every layer — from the raw capture event through to the locked monthly record that Payroll consumes.

---

## Architecture: The Two-Layer Model

The Attendance module is built on a deliberate two-layer design:

```
Layer 1 — Capture (Immutable)
  └── Attendance Log
        Raw punch events from every input source.
        One record per punch event.
        Never modified after creation.
        Source of truth for what actually happened.

Layer 2 — Computation (Correctable)
  └── Attendance Day
        One record per employee per calendar date.
        Computed from Attendance Logs against Shift expectations.
        The input to Payroll, Leave auto-marking, and Reports.
        Can be corrected via Adjustments and Regularizations.
        Locked at month-end once Payroll Run is initiated.
```

This separation is critical:
- Raw logs remain as immutable evidence — they cannot be edited, only supplemented
- The computed Day record is what business logic acts on — it can be corrected within rules
- Every correction to an Attendance Day preserves the full correction audit trail

---

## Entity Index

1. [Attendance Log](#1-attendance-log)
2. [Attendance Day](#2-attendance-day)
3. [Shift Assignment & Shift Roster](#3-shift-assignment--shift-roster)
   - 3a. Shift Roster
   - 3b. Shift Roster Entry
4. [Timesheet](#4-timesheet)
5. [Timesheet Entry](#5-timesheet-entry)
6. [Overtime Record](#6-overtime-record)
7. [Attendance Adjustment](#7-attendance-adjustment)
8. [Regularization Request](#8-regularization-request)

---

## Relationship Overview

```
Shift (org module)
  └── Employee Shift Assignment (employee module, §4f)
        └── Shift Roster
              └── Shift Roster Entry ──── Employee, Shift, Date

Employee Profile
  │
  ├── Attendance Log (N, raw punch events per day)
  │     └── source: biometric | mobile | web | api | manual
  │
  ├── Attendance Day (1 per calendar date)
  │     ├── computed from: Attendance Logs
  │     ├── governed by: Employee Shift Assignment / Shift Roster Entry
  │     ├── checked against: Holiday Calendar Day
  │     ├── cross-checked: Leave Request (approved leave days)
  │     └── consumed by: Payroll Run (LOP), Leave auto-marking
  │
  ├── Timesheet (1 per period per employee, if enabled)
  │     └── Timesheet Entry (N rows — project / task allocations)
  │
  ├── Overtime Record (N, one per authorized overtime session)
  │     ├── linked to: Attendance Day
  │     └── consumed by: Pay Run Line (overtime pay) or Comp-off Balance
  │
  ├── Regularization Request (N, employee-initiated day corrections)
  │     └── triggers: Approval Workflow → updates Attendance Day on approval
  │
  └── Attendance Adjustment (N, HR-initiated day corrections)
        └── directly updates: Attendance Day (no approval required by default)
```

---

## 1. Attendance Log

### Purpose
An Attendance Log is a single, immutable punch event captured from any attendance input source. It is the raw evidence layer — the unprocessed record of every moment an employee marked their presence or absence. It feeds the computation engine that produces Attendance Days.

### Business Description
Every time an employee interacts with an attendance capture point — tapping a biometric terminal, checking in via the mobile app with a selfie, clicking "Mark Attendance" on the web portal, or being synced from an access control system — a new Attendance Log record is created.

A single working day for a single employee may produce multiple Attendance Log records:
- `09:02` — Punch In (shift start)
- `13:05` — Punch Out (lunch break start)
- `13:58` — Punch In (lunch break end)
- `18:33` — Punch Out (shift end)

These raw events are the raw material. The Attendance Day computation engine reads all Attendance Logs for a given employee on a given date and calculates: first punch time, last punch time, total working hours, break time, and net productive hours.

Attendance Logs are **append-only**. Once created, they cannot be edited or deleted. If a log was created in error (e.g., a device malfunction produced a spurious punch), the correction is made at the Attendance Day level via an Adjustment — the erroneous Log remains as evidence that the event was captured.

### Capture Sources
| Source Type | Description |
|-------------|-------------|
| `biometric` | Physical biometric terminal (fingerprint, face recognition, card swipe) |
| `mobile_app` | Employee self-service mobile app — typically with selfie + GPS validation |
| `web_portal` | Desktop browser-based attendance marking |
| `api_integration` | Third-party access control system, visitor management, or HRM integration |
| `manual_hr` | Manually entered by HR Admin (e.g., to record an entry for a field employee) |
| `backdated_regularization` | Inserted as part of an approved Regularization Request |

### Relationships
- **One Attendance Log → One Employee Profile**
- **One Attendance Log → One Tenant**
- **One Attendance Log → One Location** (where the punch occurred, if geo/device available)

### Business Rules
1. Attendance Logs are immutable. Once created, no field may be updated by any actor, system, or process. There are no UPDATE or DELETE operations on this entity.
2. Every Log must have a `punch_timestamp` stored in UTC. The local time displayed to users is derived by applying the employee's Location timezone.
3. `punch_type` is determined at capture time and must be one of: `in`, `out`, `break_start`, `break_end`. If the capture source cannot determine the type (e.g., a simple biometric terminal that toggles), `punch_type` defaults to `unknown` and the computation engine applies toggle logic.
4. `capture_source` must be accurately recorded — it is used in dispute resolution and audit.
5. For `mobile_app` captures, `latitude` and `longitude` must be captured and stored as the GPS coordinates at the time of punch. Geo-fence validation (checking the employee was within the allowed radius of their Location) is performed at capture time; the result is stored in `geo_validation_status`.
6. Multiple Attendance Logs for the same employee on the same date and the same `punch_type` in quick succession (within the configurable deduplication window, default: 60 seconds) are treated as duplicates. The second event is stored but flagged `is_duplicate = true` and excluded from computation.
7. Attendance Logs created by `backdated_regularization` must carry the `regularization_request_id` that authorized their creation.
8. The Attendance Day computation engine must be triggered (or re-triggered) whenever a new Attendance Log is created for a date whose Attendance Day is not yet `locked`.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `punch_timestamp` | UTC timestamp of the punch event |
| `capture_source` | How the punch was captured: `biometric`, `mobile_app`, `web_portal`, `api_integration`, `manual_hr`, `backdated_regularization` |
| `created_at` | Timestamp of record creation (may differ from `punch_timestamp` for backdated entries) |

### Optional Fields
| Field | Description |
|-------|-------------|
| `punch_type` | `in`, `out`, `break_start`, `break_end`, `unknown` — type of punch event |
| `location_id` | FK to Location — the office/site where the punch was captured |
| `device_id` | Identifier of the biometric device or terminal that captured the event |
| `latitude` | GPS latitude at time of mobile punch |
| `longitude` | GPS longitude at time of mobile punch |
| `geo_validation_status` | `within_range`, `out_of_range`, `not_applicable` — result of geo-fence check |
| `distance_from_office_meters` | Computed distance from the nearest expected office location (for mobile punches) |
| `selfie_image_url` | Reference to selfie photo captured at mobile punch-in (stored in doc store) |
| `face_match_confidence` | Float 0–1: AI face match confidence score for biometric photo verification |
| `is_duplicate` | Boolean — flagged by the deduplication engine |
| `regularization_request_id` | FK to Regularization Request — if this log was created as part of an approved regularization |
| `ip_address` | IP address of the device for web portal punches |
| `notes` | Notes added by HR for manually-entered logs |

### Unique Constraints
None. Multiple logs per employee per timestamp are possible (different devices/sources); deduplication is handled via `is_duplicate` flag.

### Validation Rules
- `punch_timestamp` must not be more than 30 days in the past (configurable per tenant — prevents unlimited backdating)
- `punch_timestamp` must not be in the future (future-dated logs are rejected)
- `latitude` and `longitude` must both be present if either is provided
- `latitude` must be between -90.0 and 90.0
- `longitude` must be between -180.0 and 180.0
- `face_match_confidence` must be between 0.0 and 1.0 if provided
- `capture_source` must be one of the defined enum values

### Lifecycle
Attendance Logs have no lifecycle states — they are append-only permanent records. The only status concept is `is_duplicate`.

### Audit Requirements
- Attendance Logs created via `manual_hr` must log the HR user who entered them and the stated reason
- Attendance Logs created via `backdated_regularization` must carry the approved Regularization Request reference
- Geo-fence failures (`geo_validation_status = out_of_range`) must be surfaced in HR dashboards as exceptions — not silently ignored
- Bulk log imports (via API or device sync) must be traceable to an import job record

---

## 2. Attendance Day

### Purpose
An Attendance Day is the computed, business-meaningful daily attendance record for one employee on one calendar date. It synthesizes raw Attendance Logs, compares them against the employee's Shift expectations, cross-checks against Leave and Holiday data, and produces the definitive answer to: "What was this employee's attendance status on this day?"

### Business Description
While Attendance Logs tell you what happened at the raw punch level, the Attendance Day tells you what it means in HR terms: Was the employee present? Was it a full day or half day? Were they working from home? How many hours did they work? Did they arrive late? Were they absent without prior approval?

This is the record that Payroll consumes when computing Loss of Pay. It is what the Manager sees on the team attendance dashboard. It is what determines whether an absent day should be auto-converted to a Leave deduction.

One Attendance Day record exists per employee per calendar date from their joining date onwards — for both working days and non-working days (weekends, holidays). The `day_type` field distinguishes between them.

The computation engine runs after each new Attendance Log arrives and at configurable intervals (e.g., end of each day as a batch job). Until the day is `locked`, the computed result can change as more logs arrive or as corrections are applied.

### Computation Logic

The Attendance Day is computed using the following decision sequence:

```
1. Determine the applicable Shift for the employee on this date
   (Shift Roster Entry takes precedence over Employee Shift Assignment)

2. Determine day_type:
   ├── Is the date a Holiday Calendar Day? → day_type = 'holiday'
   ├── Is the date a weekend per the Shift's weekly schedule? → day_type = 'week_off'
   └── Otherwise → day_type = 'working_day'

3. For working_day:
   ├── Has the employee an approved Leave Request for this date? → attendance_status = 'on_leave'
   ├── No Attendance Logs at all?
   │     └── attendance_status = 'absent' (pending end-of-day; may trigger regularization prompt)
   └── Attendance Logs exist:
         ├── Compute first_punch_in, last_punch_out from non-duplicate IN/OUT logs
         ├── Compute total_worked_minutes = last_punch_out - first_punch_in - break_minutes
         ├── Compare total_worked_minutes to shift.minimum_hours_for_full_day:
         │     ├── ≥ full_day threshold → attendance_status = 'present'
         │     ├── ≥ half_day threshold AND < full_day → attendance_status = 'half_day'
         │     └── < half_day threshold → attendance_status = 'absent' or 'short_hours'
         ├── Compare first_punch_in to shift.start_time + grace_period_minutes:
         │     └── if late → is_late = true, late_by_minutes = delta
         └── Compute overtime_minutes = total_worked_minutes - shift.standard_hours_minutes
               (if > 0 and shift.overtime_applicable = true)

4. For WFH:
   If work_arrangement on the day = 'remote' (from Shift Roster Entry or Location Assignment),
   attendance_status = 'wfh' if punch-in occurred, else treated as absent.
```

### Relationships
- **One Attendance Day → One Employee Profile**
- **One Attendance Day → One Tenant**
- **One Attendance Day → One Shift** (the applicable shift on this date — from Roster or Assignment)
- **One Attendance Day → Zero or One Leave Request** (if the day is `on_leave`)
- **One Attendance Day → Zero or One Holiday Calendar Day** (if `day_type = holiday`)
- **Referenced by** Overtime Records, Regularization Requests, Attendance Adjustments, Payroll Run (LOP computation)

### Business Rules
1. Exactly one Attendance Day record must exist per `(employee_id, attendance_date)`. Duplicate records are a data integrity violation.
2. An Attendance Day is created (or initialized) for every calendar date from the employee's `joining_date` onwards. Days before joining are never created.
3. An Attendance Day that has `attendance_status = absent` and no approved Leave Request for that date must be flagged for potential auto-leave deduction or LOP, per the tenant's configured absence policy.
4. An `on_leave` Attendance Day must reference an approved Leave Request. If the leave was retrospectively rejected, the Attendance Day must be recomputed and the status updated.
5. `holiday` and `week_off` days have no attendance obligation. An employee who works on these days (and it is authorized) generates an Overtime Record.
6. Once `lock_status = locked`, no further modifications are permitted — no Adjustments, no Regularizations, no recomputation. Payroll has consumed this record. Corrections to a locked day require a Payroll Adjustment in the Payroll module.
7. An Attendance Day must be locked before a Payroll Run for that period can be initiated. The lock is applied month-end by the HR Admin or by the Payroll Run initiation process.
8. The `work_arrangement` on the day (`in_office`, `remote`, `hybrid`) is resolved from the Shift Roster Entry for the date if present, otherwise from the employee's active Location Assignment.
9. Short Hours (`attendance_status = short_hours`) is distinct from `half_day`. Half Day means the employee was explicitly approved for a half-day. Short Hours means they were expected for a full day but worked between the half-day and full-day thresholds. Configuration controls whether Short Hours triggers LOP.
10. The `override_reason` field captures why a human actor manually overrode the computed `attendance_status`. This must always be set when a manual override occurs.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `attendance_date` | The calendar date this record represents (DATE type) |
| `day_type` | `working_day`, `week_off`, `holiday` |
| `attendance_status` | `present`, `absent`, `half_day`, `short_hours`, `on_leave`, `holiday`, `week_off`, `wfh`, `on_duty` |
| `lock_status` | `open`, `processed`, `locked` |

### Optional Fields
| Field | Description |
|-------|-------------|
| `shift_id` | FK to Shift — the shift applicable on this date |
| `leave_request_id` | FK to Leave Request — if `attendance_status = on_leave` |
| `holiday_calendar_day_id` | FK to Holiday Calendar Day — if `day_type = holiday` |
| `first_punch_in` | UTC timestamp of the first valid punch-in log |
| `last_punch_out` | UTC timestamp of the last valid punch-out log |
| `total_worked_minutes` | Net working minutes computed from logs (after break deduction) |
| `break_minutes` | Total break time in minutes |
| `late_by_minutes` | Minutes by which the employee arrived after the shift start + grace period |
| `early_departure_minutes` | Minutes by which the employee left before the expected shift end |
| `overtime_minutes` | Minutes worked beyond the standard shift duration |
| `is_late` | Boolean — whether the employee arrived after grace period |
| `work_arrangement` | `in_office`, `remote`, `hybrid` — where the employee worked |
| `is_manually_overridden` | Boolean — whether a human actor changed the computed status |
| `override_by` | FK to User — who overrode the status |
| `override_reason` | Mandatory free-text reason when `is_manually_overridden = true` |
| `override_at` | Timestamp of the override |
| `source_regularization_id` | FK to Regularization Request — if the Day was updated via a regularization |
| `source_adjustment_id` | FK to Attendance Adjustment — if the Day was updated via an HR adjustment |
| `computed_at` | Timestamp of the last computation run for this day |

### Unique Constraints
- `(tenant_id, employee_id, attendance_date)` — one record per employee per date

### Validation Rules
- `attendance_date` must be ≥ the employee's `joining_date`
- `attendance_date` must not be in the future at time of creation (days are initialized as the date arrives)
- `first_punch_in`, if set, must be on `attendance_date` (in the employee's local timezone)
- `last_punch_out`, if set, must be ≥ `first_punch_in`
- `total_worked_minutes`, if set, must be ≥ 0
- `lock_status` transitions are one-way: `open → processed → locked`. No reversal of `locked`.
- `override_reason` must not be null when `is_manually_overridden = true`
- `attendance_status = on_leave` requires `leave_request_id` to be set
- `attendance_status = holiday` requires `holiday_calendar_day_id` to be set

### Lifecycle
```
open → processed → locked
```
- `open` — Day is live; logs are still arriving or recomputation may occur. Corrections via Regularization and Adjustment are allowed.
- `processed` — Day has been computed; no more logs expected; pending final HR review before lock.
- `locked` — Payroll Run has been initiated for this period. No further changes. Read-only.

### Audit Requirements
- Every change to `attendance_status` after initial computation must be logged: old status, new status, source (regularization / adjustment / recomputation), who triggered it, timestamp
- Every lock event logged: who locked it, timestamp, method (manual lock / payroll run trigger)
- Manual overrides (`is_manually_overridden = true`) are classified as high-priority audit events and must be individually reviewable in the HR Admin attendance audit report
- LOP computation changes: if a locked day's LOP impact changes (via a post-period adjustment), both the Attendance module and Payroll module must log the cross-module impact

---

## 3. Shift Assignment & Shift Roster

### Cross-Reference
The **Employee Shift Assignment** — the effective-dated record that assigns a default Shift to an employee — is defined in the Employee domain (`docs/employee-domain-entity-definitions.md`, §4f). It is the baseline schedule. This section defines the override layer: the **Shift Roster** and **Shift Roster Entry**, which override the baseline for specific dates.

### Shift Resolution Order (for a given employee on a given date)
```
1. Is there a Shift Roster Entry for this employee on this date?
   YES → Use the Shift from the Roster Entry
   NO  → Fall through to step 2

2. Is there an active Employee Shift Assignment covering this date?
   YES → Use the Shift from the Assignment
   NO  → Flag as "no shift assigned" — data quality error; attendance cannot be computed
```

---

### 3a. Shift Roster

#### Purpose
A Shift Roster is a planned schedule published for a team or department over a defined calendar period (typically a week or a month). It specifies which employee works which shift on which day, overriding the default Employee Shift Assignment for those dates.

#### Business Description
Shift Rosters exist primarily for organizations with rotating, staggered, or non-standard shift patterns — manufacturing, BPO, healthcare, retail, hospitality, and field operations. A roster allows HR or a shift supervisor to plan the schedule for the next period, publish it so employees can view it, and lock it once the period begins.

Without rosters, every employee follows their single default Shift Assignment indefinitely. With rosters, a supervisor can plan: "For the week of Aug 4–10, employee A is on Morning, employee B is on Afternoon, employee C has a day off on Aug 6."

#### Relationships
- **One Shift Roster → One Tenant**
- **One Shift Roster → One Department** (the team the roster covers)
- **One Shift Roster → Many Shift Roster Entries** (one row per employee-date combination)

#### Business Rules
1. A Shift Roster covers a specific date range (`period_start` to `period_end`). Overlapping rosters for the same department are not permitted.
2. A roster must be `published` before it is visible to employees. In `draft` status, only HR and supervisors can see it.
3. Once a roster is `published`, the covered date range begins and Attendance Days for those dates start using Roster Entries as the shift source.
4. A roster that has been fully processed (all dates have `locked` Attendance Days) transitions to `archived`.
5. Deleting a roster that has any `locked` or `processed` Attendance Day entries is prohibited.
6. The roster covers all employees in the target Department. Employees added to the department after the roster is published receive their default Shift Assignment for the remaining dates — the roster is not automatically extended to them.
7. A roster may cover a subset of employees in a department (for flexible or project-based scheduling). The `coverage_type` field determines this.

#### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `department_id` | FK to Department |
| `name` | Display name (e.g., "Engineering — August 2025 Roster") |
| `period_start` | First date this roster covers (inclusive) |
| `period_end` | Last date this roster covers (inclusive) |
| `status` | `draft`, `published`, `archived` |
| `created_by` | FK to User |

#### Optional Fields
| Field | Description |
|-------|-------------|
| `coverage_type` | `full_department` or `partial` — whether the roster covers all dept employees |
| `notes` | Internal notes for shift planners |
| `published_at` | Timestamp of publication |
| `published_by` | FK to User who published |

#### Unique Constraints
- No two active Shift Rosters for the same `department_id` may have overlapping `period_start`–`period_end` ranges

#### Validation Rules
- `period_end` must be ≥ `period_start`
- `period_start` must not be more than 90 days in the past (retroactive rosters require admin override)
- `status` transitions: `draft → published → archived` only; no reversal

#### Lifecycle
```
draft → published → archived
```

#### Audit Requirements
- Roster publication logged (who, when)
- Post-publication modifications to Roster Entries logged (which employee-date was changed, old shift, new shift, who changed it)

---

### 3b. Shift Roster Entry

#### Purpose
A Shift Roster Entry is a single row within a Shift Roster, assigning one employee to one specific shift (or one day off) on one specific date.

#### Business Description
If the Shift Roster is the schedule plan, the Shift Roster Entry is each individual cell in that schedule grid. "Employee Priya is on Night Shift on August 5th." That is one Shift Roster Entry.

Roster Entries can also represent planned days off (`is_day_off = true`), WFH days, or on-duty travel days — providing granular per-day scheduling beyond what the default Shift Assignment can express.

#### Relationships
- **One Shift Roster Entry → One Shift Roster**
- **One Shift Roster Entry → One Employee Profile**
- **One Shift Roster Entry → One Shift** (unless `is_day_off = true`)
- **One Shift Roster Entry → One Tenant**
- **Referenced by** Attendance Day computation (as the shift source for the date)

#### Business Rules
1. At most one Shift Roster Entry per `(employee_id, roster_date)` within a Roster. Duplicate date assignments for the same employee in the same roster are prohibited.
2. An employee can only appear in one Roster Entry per date across all active rosters. Cross-roster conflicts for the same employee-date are a data integrity violation.
3. A Shift Roster Entry with `is_day_off = true` must not have a `shift_id`.
4. A Shift Roster Entry with `work_arrangement = remote` means the employee is scheduled to work from home on that date. This is reflected in the `work_arrangement` field of the computed Attendance Day.
5. Modifying a Shift Roster Entry after the associated Attendance Day is `locked` is not permitted.
6. Modifications to Roster Entries for `processed` Attendance Days are permitted but must trigger an Attendance Day recomputation and require HR authorization.

#### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `shift_roster_id` | FK to Shift Roster |
| `employee_id` | FK to Employee Profile |
| `roster_date` | The specific calendar date this entry covers |
| `is_day_off` | Boolean — whether this is a planned non-working day for the employee |

#### Optional Fields
| Field | Description |
|-------|-------------|
| `shift_id` | FK to Shift — the shift for this date (required if `is_day_off = false`) |
| `work_arrangement` | `in_office`, `remote`, `hybrid` — where the employee works on this date |
| `notes` | Planner notes (e.g., "On-site client visit") |

#### Unique Constraints
- `(shift_roster_id, employee_id, roster_date)` — one entry per employee per date per roster

#### Validation Rules
- `shift_id` must be set if `is_day_off = false`
- `shift_id` must not be set if `is_day_off = true`
- `roster_date` must fall within the parent Shift Roster's `period_start` and `period_end`
- `work_arrangement` must be one of `in_office`, `remote`, `hybrid`

#### Lifecycle
Roster Entries follow the lifecycle of their parent Shift Roster. They are individually immutable once the corresponding Attendance Day is `locked`.

#### Audit Requirements
- Modifications to Roster Entries for published rosters logged (who, old shift, new shift, date, reason)

---

## 4. Timesheet

### Purpose
A Timesheet is a period-based record of an employee's self-reported or system-aggregated working hours, organized for project allocation, billing, and work-hour compliance purposes. It is a period-level container that holds individual time entries.

### Business Description
Timesheets serve a different purpose than Attendance Days. While Attendance Days answer "was the employee at work?", Timesheets answer "what did they work on?" They are used primarily in:
- **Professional services / consulting firms** — billable hours need to be tracked by project and client
- **Knowledge worker compliance** — certain jurisdictions require employers to maintain records of working hours (EU Working Time Directive, India Shops & Establishments Act in certain categories)
- **Remote/flexible work policies** — to ensure employees are meeting their contracted hours even without physical punch-in
- **Project cost allocation** — attributing employee time to specific projects or cost objectives

Timesheets are optional per tenant configuration. In organizations where pure attendance is sufficient (manufacturing, retail), Timesheets may be disabled.

A Timesheet is the header record for a specific employee and pay period. It contains one or more Timesheet Entries, each capturing time spent on a specific project, task, or activity.

### Relationships
- **One Timesheet → One Employee Profile**
- **One Timesheet → One Tenant**
- **One Timesheet → Many Timesheet Entries** (the detailed time allocations)
- **One Timesheet → One Manager** (for approval routing via the Approvals module)

### Business Rules
1. Timesheets are created per pay period (weekly, bi-weekly, or monthly — configured per tenant). One Timesheet per employee per period.
2. An employee cannot submit a Timesheet for a future period.
3. A Timesheet cannot be submitted unless its total logged hours meet the minimum required for the period (configurable per tenant; default: employee's standard weekly/monthly hours per their Shift).
4. Once `submitted`, a Timesheet routes to the employee's reporting manager for approval via the Approvals module.
5. Once `approved`, a Timesheet is `locked`. Its entries cannot be edited. The approved hours are available for project cost reporting and billing integrations.
6. A `rejected` Timesheet is returned to the employee for correction and resubmission.
7. If a tenant has Timesheets enabled with `auto_populate = true`, Timesheet Entries are pre-populated from the employee's Attendance Days at the start of each period, and the employee reviews and supplements them with project allocations.
8. Timesheet total hours must reconcile with the corresponding Attendance Days' `total_worked_minutes` within a configurable tolerance (default: ±30 minutes per day). Significant discrepancies must be flagged.
9. For employees on flexible shifts, the Timesheet is the primary mechanism for working hour verification in lieu of strict punch times.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `period_start` | First date of the timesheet period |
| `period_end` | Last date of the timesheet period |
| `total_logged_minutes` | Sum of minutes across all Timesheet Entries |
| `status` | Current lifecycle status |
| `created_at` | Timestamp |
| `updated_at` | Timestamp |

### Optional Fields
| Field | Description |
|-------|-------------|
| `submitted_at` | Timestamp of employee submission |
| `approved_at` | Timestamp of manager approval |
| `approved_by` | FK to User — the approving manager |
| `rejected_at` | Timestamp of rejection |
| `rejected_by` | FK to User — who rejected |
| `rejection_reason` | Reason for rejection |
| `notes` | Employee notes on the timesheet |
| `approval_workflow_instance_id` | FK to Approval Workflow Instance — the running approval flow |

### Unique Constraints
- `(tenant_id, employee_id, period_start, period_end)` — one timesheet per employee per period

### Validation Rules
- `period_end` must be ≥ `period_start`
- `period_start` must not be in the future
- `total_logged_minutes` must be ≥ 0
- Total hours from all Timesheet Entries must sum to `total_logged_minutes`
- `period_start` must align to the tenant's configured timesheet period boundary (e.g., always a Monday for weekly, always the 1st for monthly)

### Lifecycle
```
draft → submitted → approved
                 → rejected → (employee corrects) → submitted
approved → locked
```
- `draft` — Employee is filling in the timesheet
- `submitted` — Sent for manager approval
- `approved` — Manager approved; time allocations are finalized
- `rejected` — Manager rejected; returned to employee
- `locked` — Period end has passed; all changes frozen; source for billing / cost reports

### Audit Requirements
- Submission logged (employee, timestamp)
- Approval and rejection logged (manager, decision, timestamp, reason)
- Post-approval edits are prohibited; any administrative override must be logged as a high-priority audit event
- Discrepancies between Timesheet total hours and Attendance Day hours logged as exceptions

---

## 5. Timesheet Entry

### Purpose
A Timesheet Entry is a single line within a Timesheet capturing the hours an employee worked on a specific date against a specific project, task category, or activity type.

### Business Description
If the Timesheet is the weekly/monthly container, the Timesheet Entry is each row in it. Each entry says: "On Tuesday Aug 5th, I spent 6 hours on Project Alpha and 2 hours on internal meetings."

Timesheet Entries link working time to cost objects (projects, cost centers, activities) enabling project cost accounting, client billing, and internal resource tracking.

For employees in non-project organizations, entries may simply categorize time by activity type (e.g., "core work", "meetings", "training", "admin") without project codes.

### Relationships
- **One Timesheet Entry → One Timesheet**
- **One Timesheet Entry → One Tenant**
- **One Timesheet Entry → One Employee Profile** (via Timesheet)
- **One Timesheet Entry → One Attendance Day** (the date this entry corresponds to)

### Business Rules
1. Timesheet Entries must not be created for dates outside the parent Timesheet's `period_start` to `period_end`.
2. Total `logged_minutes` across all Timesheet Entries for the same employee on the same date must not exceed the `total_worked_minutes` from the corresponding Attendance Day by more than the tenant-configured tolerance.
3. `activity_type` is the minimum categorization. `project_code` and `task_code` are optional enhancements for project-based organizations.
4. Timesheet Entries for dates where the Attendance Day has `day_type = week_off` or `holiday` are permitted only if the corresponding Overtime Record has been approved (the employee worked on their day off).
5. Once the parent Timesheet is `locked`, Timesheet Entries are immutable.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `timesheet_id` | FK to Timesheet |
| `employee_id` | FK to Employee Profile |
| `entry_date` | The specific calendar date this entry covers |
| `logged_minutes` | Minutes logged for this entry |
| `activity_type` | Category of work: `billable_project`, `internal_project`, `meetings`, `training`, `admin`, `on_duty_travel`, `other` |

### Optional Fields
| Field | Description |
|-------|-------------|
| `project_code` | External project or client code from the project management system |
| `task_code` | Sub-task or work item code |
| `description` | Brief description of the work done |
| `is_billable` | Boolean — whether these hours are billable to a client |
| `billing_rate_amount` | Hourly billing rate for this entry (used in billing reports) |

### Unique Constraints
None — multiple entries per day per timesheet are normal (different projects on the same day).

### Validation Rules
- `logged_minutes` must be between 1 and 1440 (1 minute to 24 hours)
- `entry_date` must fall within the parent Timesheet's `period_start` and `period_end`
- `activity_type` must be one of the defined enum values
- `billing_rate_amount` must be ≥ 0 if set

### Lifecycle
Entries follow the parent Timesheet lifecycle. Once the Timesheet is `locked`, entries are permanently immutable.

### Audit Requirements
- Any modification to a submitted (but not yet approved) Timesheet Entry logged
- Modifications to entries on approved timesheets are prohibited; override events must be logged

---

## 6. Overtime Record

### Purpose
An Overtime Record documents an authorized session of work performed by an employee beyond their standard shift hours, on a regular working day, on a week-off, or on a holiday — capturing the extra hours, the authorization, and the disposition (paid as overtime pay, or credited as Compensatory Off).

### Business Description
Overtime is not simply "working late." In the HRMS context, overtime is a governed business process:
1. Work beyond standard hours occurs
2. It is recognized and authorized (by the manager or HR)
3. A business decision is made: is the employee paid extra (`overtime_pay`) or given compensatory time off (`comp_off`)?
4. If `comp_off`, a compensatory leave credit is added to the employee's leave balance
5. If `overtime_pay`, the overtime hours and rate are forwarded to the Payroll Run

Unapproved overtime is not processed. An employee who stays late without authorization has no overtime claim. The system's computation of `overtime_minutes` on the Attendance Day surfaces the potential claim; it is not a guarantee of payment.

Holiday and week-off work is treated as a special category of overtime. Working on a designated holiday typically carries a higher multiplier rate.

### Relationships
- **One Overtime Record → One Attendance Day** (the day the overtime was worked)
- **One Overtime Record → One Employee Profile**
- **One Overtime Record → One Tenant**
- **Referenced by** Pay Run Line (if `disposition = overtime_pay`) or Leave Balance (if `disposition = comp_off`)

### Business Rules
1. An Overtime Record can only be created for a date that has a corresponding Attendance Day with `overtime_minutes > 0` (i.e., the employee actually worked beyond standard hours), OR for dates where `day_type = week_off` or `holiday` (the employee worked on a non-working day).
2. An Overtime Record begins in `draft` status when submitted by the employee or created by HR. It requires manager approval before being processed.
3. `overtime_type` distinguishes the nature of overtime:
   - `regular_day_overtime` — worked beyond standard hours on a normal working day
   - `week_off_overtime` — worked on a scheduled week-off day
   - `holiday_overtime` — worked on a designated holiday
4. The `pay_multiplier` is the rate multiplier applied to the employee's standard hourly rate when computing overtime pay. It defaults based on `overtime_type` (configurable per tenant: regular = 1.5x, week-off = 2.0x, holiday = 2.5x).
5. `disposition` must be set before the Overtime Record can be `approved`:
   - `overtime_pay` — the overtime is paid in the current Payroll Run
   - `comp_off` — the employee is credited with compensatory leave
6. Once approved, the Overtime Record cannot be modified. The payroll or leave credit it generates is immutable.
7. For `comp_off` overtime records, the corresponding leave credit must be credited to the employee's leave balance within the `comp_off_expiry_days` window defined in the Leave Policy.
8. An Attendance Day that is `locked` cannot have new Overtime Records created against it.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `attendance_day_id` | FK to Attendance Day — the day overtime was worked |
| `overtime_date` | The calendar date of the overtime (redundant with Attendance Day but stored for query convenience) |
| `overtime_type` | `regular_day_overtime`, `week_off_overtime`, `holiday_overtime` |
| `claimed_minutes` | Minutes of overtime claimed by the employee or HR |
| `status` | `draft`, `pending`, `approved`, `rejected`, `cancelled`, `paid`, `comp_off_credited` |

### Optional Fields
| Field | Description |
|-------|-------------|
| `approved_minutes` | Minutes approved by the manager (may differ from `claimed_minutes` if partial approval) |
| `disposition` | `overtime_pay` or `comp_off` — how the overtime is compensated |
| `pay_multiplier` | Rate multiplier for overtime pay computation (e.g., 1.5, 2.0) |
| `approved_by` | FK to User — the approving manager |
| `approved_at` | Timestamp of approval |
| `rejected_by` | FK to User |
| `rejection_reason` | Reason for rejection |
| `pay_run_line_id` | FK to Pay Run Line — set once overtime pay is included in a Payroll Run |
| `comp_off_expiry_date` | Date by which the compensatory leave must be utilized |
| `notes` | Employee notes justifying the overtime |

### Unique Constraints
- `(tenant_id, employee_id, attendance_day_id, overtime_type)` — at most one overtime record per type per employee per day

### Validation Rules
- `claimed_minutes` must be > 0 and ≤ 720 (max 12 hours overtime per day)
- `approved_minutes`, if set, must be > 0 and ≤ `claimed_minutes`
- `overtime_date` must match the `attendance_date` of the referenced `attendance_day_id`
- `pay_multiplier` must be ≥ 1.0 and ≤ 5.0
- `disposition` must be set before status can move to `approved`
- `comp_off_expiry_date`, if set, must be after `overtime_date`

### Lifecycle
```
draft → pending → approved → paid (if overtime_pay)
                           → comp_off_credited (if comp_off)
                → rejected
                → cancelled
```

### Audit Requirements
- All status transitions logged with acting user and timestamp
- `approved_minutes` deviating from `claimed_minutes` logged with the difference and approver's reason
- `comp_off_credited` events linked to the leave balance credit entry
- `paid` events linked to the Pay Run Line record

---

## 7. Attendance Adjustment

### Purpose
An Attendance Adjustment is an HR Admin-initiated correction to a computed Attendance Day record, used when the system-computed status is factually incorrect and must be overridden without requiring employee initiation or multi-step approval.

### Business Description
While Regularization Requests (§8) are employee-initiated and go through approval, Attendance Adjustments are HR-driven corrections — applied by HR Admins who have the `attendance:adjustments:apply` permission.

Scenarios that warrant an Attendance Adjustment:
- The biometric device malfunctioned for a day and no punch records exist for 40 employees at a location
- An employee was recorded absent but was on official duty travel (no punch available)
- A system outage prevented attendance data sync from a remote location
- A payroll cutoff requires a batch correction before the month is locked
- HR is correcting a prior period before payroll runs (within the unlocked window)

Unlike Regularization Requests, Adjustments do not require an approval workflow by default (the HR Admin applying them is already authorized). However, high-impact adjustments (e.g., bulk corrections affecting >10 employees, or corrections to near-locked periods) may be configured to require dual authorization.

### Relationships
- **One Attendance Adjustment → One Attendance Day** (the day being corrected)
- **One Attendance Adjustment → One Employee Profile**
- **One Attendance Adjustment → One Tenant**
- **Applied by** User (HR Admin with attendance adjustment permission)

### Business Rules
1. An Adjustment may only target an Attendance Day with `lock_status = open` or `processed`. Adjustments to `locked` days are prohibited.
2. The Adjustment stores both the `old_status` (before correction) and `new_status` (after correction). Both must be populated at time of application.
3. Adjustments are not soft-deletable. Once applied, the adjustment record is permanent. To undo an adjustment, a second adjustment must be created reversing it.
4. The `reason` field is mandatory on all Adjustments. Free-text is required. It is displayed in the employee's attendance history and the HR audit report.
5. Bulk adjustments (correcting the same status for multiple employees on the same date, e.g., a system outage) should reference a `batch_adjustment_id` to group them for audit readability.
6. Applying an Adjustment triggers an immediate recomputation of the target Attendance Day's derived values (LOP impact, overtime recalculation).
7. An Attendance Day may have multiple Adjustment records if multiple corrections were made. The `applied_at` timestamps establish the sequence.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `attendance_day_id` | FK to Attendance Day being corrected |
| `adjustment_date` | The calendar date being corrected |
| `old_status` | Attendance status before this adjustment |
| `new_status` | Attendance status after this adjustment |
| `reason` | Mandatory justification for the adjustment |
| `applied_by` | FK to User — the HR Admin who applied the adjustment |
| `applied_at` | Timestamp of application |

### Optional Fields
| Field | Description |
|-------|-------------|
| `old_first_punch_in` | Previous first punch-in timestamp (if correcting punch times) |
| `new_first_punch_in` | Corrected first punch-in timestamp |
| `old_last_punch_out` | Previous last punch-out timestamp |
| `new_last_punch_out` | Corrected last punch-out timestamp |
| `old_total_worked_minutes` | Previous computed working minutes |
| `new_total_worked_minutes` | Corrected working minutes |
| `batch_adjustment_id` | Reference ID for bulk adjustments (groups related adjustments for audit) |
| `source_document` | Reference to supporting document (e.g., travel approval, manager email) |

### Unique Constraints
None — multiple Adjustments on the same Attendance Day are permitted (sequential corrections).

### Validation Rules
- `old_status` must match the current `attendance_status` on the target Attendance Day at the time of application
- `new_status` must be one of the valid attendance status enum values
- `old_status` and `new_status` must be different
- `adjustment_date` must match `attendance_date` of the referenced `attendance_day_id`
- The referenced `attendance_day_id` must have `lock_status != locked`
- `new_first_punch_in`, if set, must be before `new_last_punch_out`
- `reason` must be at least 10 characters

### Lifecycle
Attendance Adjustments have no lifecycle of their own — they are applied immediately and are immutable. The Attendance Day they target transitions its `is_manually_overridden` flag to `true` and `source_adjustment_id` is updated.

### Audit Requirements
- Every Attendance Adjustment is inherently an audit event; the entity itself IS the audit record
- Bulk adjustments (via `batch_adjustment_id`) must be reviewable as a group in the admin audit log
- Adjustments to days within 3 days of a Payroll Run cutoff must trigger a high-priority notification to the Payroll Admin

---

## 8. Regularization Request

### Purpose
A Regularization Request is an employee-initiated petition to correct or supplement their own Attendance Day record — typically to account for a missed punch, a forgotten check-in, or a day when attendance was not captured but work was performed.

### Business Description
Employees forget to punch in. Biometric devices sometimes fail. A field employee working at a client site may have no access to the company's attendance system. A Regularization Request is the employee's formal mechanism to explain what actually happened and request their attendance record be corrected.

Unlike Attendance Adjustments (which are HR-applied), Regularization Requests go through an approval workflow — typically the employee's reporting manager. Only after the manager approves does the Attendance Day get updated. This preserves the manager's awareness and authority over their team's attendance record.

When approved, the request:
1. Updates the target Attendance Day with the corrected status and punch times
2. Optionally creates backdated Attendance Log entries (with `capture_source = backdated_regularization`) to reflect the corrected punches

### Relationships
- **One Regularization Request → One Employee Profile** (the requesting employee)
- **One Regularization Request → One Attendance Day** (the day being regularized)
- **One Regularization Request → One Tenant**
- **One Regularization Request → One Approval Workflow Instance** (the running approval)
- **On approval → updates** Attendance Day and optionally creates Attendance Logs

### Business Rules
1. An employee may submit only one pending Regularization Request per `(employee_id, attendance_date)` at a time. A second submission for the same date is blocked until the first is resolved.
2. A Regularization Request can only target an Attendance Day with `lock_status = open` or `processed`. Requests for `locked` days are rejected.
3. The request must specify `requested_in_time` or `requested_out_time` (or both) — the corrected punch times the employee claims. These must be plausible given the day's shift definition.
4. The employee must provide a `reason` for the regularization. This is displayed to the approver.
5. The number of Regularization Requests an employee can submit per calendar month is configurable per tenant (default: 3). Exceeding this limit requires HR Admin override.
6. Upon manager approval, the system performs the following atomically:
   a. Sets the target Attendance Day's `attendance_status` to the `requested_status`
   b. Sets `first_punch_in` and `last_punch_out` from the approved times
   c. Recomputes `total_worked_minutes`, `is_late`, `late_by_minutes`
   d. Sets `source_regularization_id` on the Attendance Day
   e. If `create_backdated_log = true`, inserts new Attendance Log records with `capture_source = backdated_regularization`
7. If the manager rejects the request, the Attendance Day remains unchanged.
8. A regularization cannot change an `on_leave` day — leave requests must be cancelled through the Leave module.
9. Managers may request additional information from the employee before deciding. The `manager_notes` field captures this communication.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `attendance_day_id` | FK to Attendance Day being regularized |
| `regularization_date` | The calendar date being regularized |
| `reason` | Employee's explanation for the missed/incorrect attendance |
| `status` | `draft`, `pending`, `approved`, `rejected`, `cancelled` |
| `created_at` | Timestamp |

### Optional Fields
| Field | Description |
|-------|-------------|
| `requested_in_time` | The corrected punch-in time the employee is claiming (UTC timestamp) |
| `requested_out_time` | The corrected punch-out time the employee is claiming (UTC timestamp) |
| `requested_status` | The attendance status the employee is requesting (`present`, `wfh`, `on_duty`, `half_day`) |
| `work_arrangement` | `in_office`, `remote`, `on_duty` — where the employee claims to have worked |
| `supporting_document_id` | FK to Employee Document — supporting evidence (e.g., manager email, client visit proof) |
| `create_backdated_log` | Boolean — whether approved request should create backdated Attendance Logs |
| `approval_workflow_instance_id` | FK to Approval Workflow Instance |
| `manager_notes` | Notes added by the approving manager during review |
| `approved_by` | FK to User — who approved |
| `approved_at` | Timestamp of approval |
| `rejected_by` | FK to User — who rejected |
| `rejected_at` | Timestamp of rejection |
| `rejection_reason` | Reason provided by rejector |

### Unique Constraints
- `(tenant_id, employee_id, regularization_date, status)` where `status = pending` — at most one pending regularization per employee per date

### Validation Rules
- `regularization_date` must be ≥ employee's `joining_date`
- `regularization_date` must not be in the future
- `requested_in_time`, if set, must be on `regularization_date` (in employee's timezone)
- `requested_out_time`, if set, must be after `requested_in_time`
- `requested_status` must be a valid attendance status; cannot be `absent`, `on_leave`, `holiday`, or `week_off` (those cannot be self-corrected via regularization)
- `reason` must be at least 10 characters
- The referenced `attendance_day_id` must have `lock_status != locked`
- An employee must not have exceeded the tenant-configured monthly regularization limit

### Lifecycle
```
draft → pending → approved
               → rejected
pending → cancelled (by employee before decision)
```

### Audit Requirements
- Every Regularization Request creation logged
- Approval and rejection events logged (approver, timestamp, reason)
- When approval triggers Attendance Day updates, both the request approval and the resulting Attendance Day change are independently logged
- Monthly regularization count is monitored; employees exceeding the limit are flagged in the HR attendance exception report
- Patterns of repeated regularization for the same employee must be surfaced in data quality alerts

---

## Module Boundaries & Cross-Module Interactions

| Interaction | Source | Target | Trigger | Direction |
|-------------|--------|--------|---------|-----------|
| Shift drives attendance expectations | Org (Shift) | Attendance Day computation | Daily batch / log arrival | Org → Attendance |
| Leave approval marks attendance | Leave (Leave Request approved) | Attendance Day `attendance_status = on_leave` | Leave approval event | Leave → Attendance |
| Attendance absent days trigger leave auto-deduction | Attendance Day `absent` | Leave (Leave Balance debit) | End-of-day batch | Attendance → Leave |
| Locked Attendance Days feed LOP to Payroll | Attendance Day `locked` | Payroll Run (LOP component) | Pay Run initiation | Attendance → Payroll |
| Overtime approval generates Pay Run line | Overtime Record `approved, disposition = overtime_pay` | Payroll Run (Pay Run Line) | Payroll Run processing | Attendance → Payroll |
| Overtime comp-off credits leave | Overtime Record `approved, disposition = comp_off` | Leave Balance credit | Approval event | Attendance → Leave |
| Regularization approval uses Approvals module | Regularization Request | Approval Workflow Instance | Request submission | Attendance → Approvals |
| Holiday calendar marks non-working days | Org (Holiday Calendar Day) | Attendance Day `day_type = holiday` | Daily batch | Org → Attendance |

---

## Attendance Policy Configuration Reference

The following tenant-level configuration values govern Attendance module behavior. These are not entities; they are stored in Tenant Settings.

| Configuration | Description | Default |
|---------------|-------------|---------|
| `punch_deduplication_window_seconds` | Time window for filtering duplicate punch events | 60 seconds |
| `max_backdated_log_days` | Maximum days in the past for which new Attendance Logs are accepted | 30 days |
| `monthly_regularization_limit` | Maximum Regularization Requests per employee per month | 3 |
| `absent_auto_lop_enabled` | Whether uninstructed absences are auto-converted to LOP | `true` |
| `absent_auto_leave_deduction_enabled` | Whether uninstructed absences first deduct from leave balance before LOP | `true` |
| `overtime_default_multiplier_regular` | Pay multiplier for regular-day overtime | 1.5 |
| `overtime_default_multiplier_week_off` | Pay multiplier for week-off overtime | 2.0 |
| `overtime_default_multiplier_holiday` | Pay multiplier for holiday overtime | 2.5 |
| `timesheet_enabled` | Whether Timesheets are required or optional | `false` |
| `timesheet_period_type` | `weekly`, `bi_weekly`, `monthly` | `monthly` |
| `attendance_lock_day_of_month` | Day of the month on which Attendance Days are locked | 1 (of following month) |

---

*This document is the authoritative business entity definition for the Attendance module of Evolve HRMS. All attendance computation logic, correction workflows, and payroll interfaces must be implemented in alignment with these definitions.*
