# Evolve HRMS — Leave Module: Business Entity Definitions

**Classification:** Internal Engineering Reference  
**Status:** Finalized  
**Module:** Leave  
**Preceding Documents:** `docs/database-standards.md`, `docs/entity-inventory.md`, `docs/org-module-entity-definitions.md`, `docs/employee-domain-entity-definitions.md`, `docs/attendance-module-entity-definitions.md`

---

## Overview

The Leave module manages the complete lifecycle of employee absence entitlements — from how leave is defined and configured, to how it is earned, requested, approved, and consumed. It is one of the highest-interaction modules in the HRMS: every employee touches it every time they take time off, and every manager touches it every time they approve a request.

The Leave module has two layers:

**Configuration Layer** (owned jointly by Organization and Leave modules):
- Leave Types — what categories of leave exist
- Leave Policies and Leave Policy Rules — what entitlements apply to whom and under what conditions
- These are defined in the Organization module and referenced here

**Transaction Layer** (owned exclusively by the Leave module):
- Leave Balance — how much leave each employee currently has
- Leave Accrual — the event-by-event record of balance additions
- Leave Request — an employee's application for time off
- Leave Day — the individual calendar dates within a request
- Leave Approval — the decision records on a request
- Leave Adjustment — HR-initiated manual balance corrections
- Leave Encashment — formal cash-out of eligible unused leave

---

## Architecture: Leave Balance as Ledger

The Leave Balance is modeled as a **running ledger** — not a single computed number, but a breakdown of all components that together produce the net available balance. This enables:
- Transparency: employees and HR can see exactly how the balance was built
- Auditability: every addition and deduction is traceable to a source event
- Correction: HR can adjust specific components without rewriting history

```
Leave Balance (per employee, per leave type, per leave year)

  Opening Balance (carried from prior year)
+ Accrued        (earned this year, via accrual events)
+ Adjusted       (manual HR credits — net of all adjustments)
- Used            (consumed by approved Leave Requests)
- Lapsed          (carry-forward days that expired unused)
- Encashed        (days paid out via Leave Encashment)
──────────────────────────────────────────────────────
= Available Balance (what the employee can use right now)
```

Every debit or credit to the balance is backed by a source transaction:
- Accrual events → Leave Accrual records
- Used deductions → Leave Request approvals
- Manual credits/debits → Leave Adjustment records
- Encashment debits → Leave Encashment records
- Lapse debits → Leave Lapse events (year-end processing)

---

## Entity Index

1. [Leave Type](#1-leave-type)
2. [Leave Policy](#2-leave-policy)
3. [Leave Policy Rule](#3-leave-policy-rule)
4. [Leave Balance](#4-leave-balance)
5. [Leave Accrual](#5-leave-accrual)
6. [Leave Request](#6-leave-request)
7. [Leave Day](#7-leave-day)
8. [Leave Approval](#8-leave-approval)
9. [Leave Adjustment](#9-leave-adjustment)
10. [Leave Encashment](#10-leave-encashment)

---

## Relationship Overview

```
Tenant
  ├── Leave Type (N) ─────────────────────────────────────────────────────────┐
  │                                                                            │
  └── Leave Policy (N)                                                        │
        └── Leave Policy Rule (N) ── Leave Type, Employment Type             │
              │                                                                │
Employee Profile                                                               │
  │                                                                            │
  ├── Leave Policy Assignment (from Employee module, §4g) ── Leave Policy     │
  │                                                                            │
  ├── Leave Balance (1 per leave_type per leave_year) ─────── Leave Type ────┘
  │     └── sourced from:
  │           ├── Leave Accrual (N per balance)
  │           ├── Leave Request approval (N debits)
  │           ├── Leave Adjustment (N credits/debits)
  │           ├── Leave Encashment (N debits)
  │           └── Leave Lapse (year-end event)
  │
  └── Leave Request (N)
        ├── Leave Type
        ├── Leave Balance (checked at submission)
        ├── Leave Day (N — one per calendar date in range)
        │     └── Holiday Calendar Day (cross-check)
        │     └── Attendance Day (updated on approval)
        └── Leave Approval (1..N — one per approval step)
              └── Approval Workflow Instance (Approvals module)
```

---

## 1. Leave Type

### Purpose
A Leave Type defines a named, rule-governed category of employee absence — the fundamental unit of leave classification. It represents what kind of absence is being requested: Annual Leave, Sick Leave, Casual Leave, Maternity Leave, Paternity Leave, Compensatory Off, and so on.

### Business Description
Leave Types are the vocabulary of absence management. Before an employee can apply for time off, there must be a Leave Type that describes the nature of that absence. Each Leave Type carries behavioral flags that control how it interacts with the rest of the system: whether it requires documentation, whether half-days are allowed, whether it is gender-restricted, whether it is accrual-based or upfront-granted, and whether it has any statutory backing.

Leave Types are tenant-wide master data — they are not scoped to a department or location. The same "Annual Leave" type is available to all employees across the organization. What differs per employee group is the **entitlement** (how many days), which is configured in Leave Policy Rules, not in the Leave Type itself.

### Categories of Leave Types

| Category | Examples | Characteristics |
|----------|---------|----------------|
| **Earned / Privilege Leave** | Annual Leave, Privilege Leave, Earned Leave | Accrues over time; carry-forward typically allowed; encashment eligible |
| **Casual Leave** | Casual Leave, Personal Day | Non-accruing; upfront grant; typically no carry-forward |
| **Sick / Medical Leave** | Sick Leave, Medical Leave | May require medical certificate after threshold; limited carry-forward |
| **Statutory / Mandated** | Maternity Leave, Paternity Leave, Bereavement Leave, Adoption Leave | Country/regulation mandated; fixed duration; not deducted from standard balances |
| **Compensatory** | Compensatory Off | Generated by Overtime Records in the Attendance module; consumed like regular leave |
| **Optional / Restricted** | Optional Holiday, Restricted Holiday | Employee chooses from a pool; limited quantity per year |
| **Loss of Pay** | LOP | Not technically a leave type but modeled here for UI consistency; automatically applied when other balances are exhausted |
| **Special** | Study Leave, Sabbatical, Voting Leave | Tenant-defined; governed by separate rules |

### Relationships
- **One Leave Type → One Tenant**
- **One Leave Type → Many Leave Policy Rules** (Leave Types are assigned entitlement rules within each Policy)
- **One Leave Type → Many Leave Balances** (one balance per employee per leave type per year)
- **One Leave Type → Many Leave Requests** (the type being applied for)
- **Referenced by** Leave Adjustments, Leave Accruals, Leave Encashments

### Business Rules
1. Leave Types are defined once per tenant and reused across all Leave Policies. The same "Annual Leave" type appears in multiple policies with different day counts.
2. `accrual_basis` determines how the entitlement is given:
   - `upfront` — full year's entitlement granted on leave year start (or joining date, pro-rated if applicable)
   - `monthly` — a fraction of the annual entitlement is credited at the start (or end) of each month
   - `on_demand` — leave is available as needed up to the policy limit (Sick Leave model in some companies)
3. `allow_half_day` controls whether an employee can apply for 0.5 days. If `false`, all requests must be in whole-day units.
4. `allow_negative_balance` is a type-level flag. The Leave Policy Rule can further restrict this per policy. If both permit it, the employee can go negative.
5. `is_gender_restricted` combined with `applicable_gender` ensures leaves like Maternity Leave are only available to employees of the declared gender.
6. `requires_document_after_days` is the number of consecutive sick/absence days after which a supporting document (medical certificate) becomes mandatory for submission.
7. `is_carry_forward_eligible` — if `false`, unused days of this type are lapsed at year-end regardless of what the Leave Policy Rule says. The Leave Policy Rule can only set carry-forward to `true` if the Leave Type permits it.
8. `is_encashable` — same override principle: the Leave Policy Rule cannot enable encashment if the Leave Type prohibits it.
9. Leave Types marked `is_statutory = true` are regulated by law. Their entitlement floors cannot be set below the legal minimum in Leave Policy Rules. The system enforces this via validation.
10. A Leave Type that has Leave Balances or Leave Requests against it cannot be deactivated.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `name` | Display name (e.g., "Annual Leave", "Sick Leave", "Maternity Leave") |
| `code` | Short identifier (e.g., `AL`, `SL`, `ML`, `CL`, `COMP`) |
| `accrual_basis` | `upfront`, `monthly`, `on_demand` |
| `allow_half_day` | Boolean — whether 0.5-day applications are permitted |
| `is_carry_forward_eligible` | Boolean — whether unused days can roll into the next leave year |
| `is_encashable` | Boolean — whether unused days can be monetarily encashed |
| `is_statutory` | Boolean — whether this leave type is mandated by law |
| `status` | Current lifecycle status |

### Optional Fields
| Field | Description |
|-------|-------------|
| `description` | Explanation of when and how this leave type should be used |
| `color_code` | Hex color code for display on leave calendars (e.g., `#4F46E5`) |
| `icon_code` | Icon identifier for UI display |
| `is_gender_restricted` | Boolean — whether this leave type applies only to a specific gender |
| `applicable_gender` | `male`, `female`, `non_binary` — required if `is_gender_restricted = true` |
| `requires_document_after_days` | Integer — consecutive days after which a document is mandatory. Null = never required |
| `allow_negative_balance` | Boolean — whether employees can go into negative balance for this type |
| `max_negative_balance_days` | Maximum negative balance allowed (decimal) |
| `is_sandwich_rule_applicable` | Boolean — whether Saturdays/Sundays/holidays between leave dates are counted as leave days (sandwich rule) |
| `min_days_per_application` | Minimum days per application (e.g., 1 for whole-day leaves, 0.5 if half-days allowed) |
| `max_days_per_application` | Maximum consecutive days in a single application |
| `max_applications_per_year` | Maximum number of times this leave type can be applied in a year |
| `advance_notice_days` | Minimum days notice required before the leave start date |
| `is_compensatory_type` | Boolean — marks this as a Compensatory Off type; balances are fed by Overtime Records |
| `is_loss_of_pay` | Boolean — marks this as an LOP type; no balance; applied automatically by system |
| `sort_order` | Integer for display ordering in leave type pickers |

### Unique Constraints
- `(tenant_id, code)` — Leave Type code unique per tenant
- `(tenant_id, name)` — Leave Type name unique per tenant

### Validation Rules
- `code` must be 1–10 characters, uppercase alphanumeric
- `name` must be 2–100 characters
- `applicable_gender` must be set if `is_gender_restricted = true`
- `max_negative_balance_days`, if set, must be ≥ 0
- `requires_document_after_days`, if set, must be a positive integer
- `advance_notice_days`, if set, must be a non-negative integer
- `max_days_per_application` must be ≥ `min_days_per_application` if both are set
- `is_loss_of_pay` and `is_compensatory_type` cannot both be `true` on the same record

### Lifecycle
```
active → inactive → archived
```
- `active` — Available for use in Leave Policies and Leave Requests
- `inactive` — No new Policy Rules or Requests; existing balances preserved
- `archived` — Fully retired; historical data only

### Audit Requirements
- Leave Type creation and `status` transitions logged
- Changes to `is_statutory`, `is_gender_restricted`, `allow_negative_balance` must be logged as high-impact configuration changes — they affect all employees using this leave type
- Changes to `requires_document_after_days` logged

---

## 2. Leave Policy

### Purpose
A Leave Policy is a named configuration bundle that defines the complete set of leave entitlements for a group of employees. It answers: "For employees on this policy, what leave types are they entitled to, and on what terms?"

### Business Description
Leave Policies allow the same organization to have different leave arrangements for different employee groups. A "Standard Full-Time Policy" gives 24 Annual Leave days. A "Probation Policy" gives only 6 Casual Leave days with no carry-forward. A "Contract Workers Policy" gives only statutory minimums.

An employee has exactly one active Leave Policy at any time (via their Leave Policy Assignment in the Employee module). When their assignment changes (e.g., probation confirmation), a new Leave Balance initialization is triggered under the new policy's rules.

The Leave Policy itself is a header — it has no entitlement values of its own. All entitlement details live in Leave Policy Rules (§3).

> Note: Leave Policy is defined in full in `docs/org-module-entity-definitions.md §14`. This section summarizes its role within the Leave module's transaction flow. The authoritative definition is in the Org module document.

### Relationships
- **One Leave Policy → One Tenant**
- **One Leave Policy → Many Leave Policy Rules** (the entitlement configuration)
- **One Leave Policy → Many Employee Leave Policy Assignments** (via Employee module)
- **One Leave Policy → Many Leave Balances** (employees on this policy have balances initialized from it)

### Business Rules — Leave Module Perspective
1. A Leave Policy cannot be deactivated if active employees are assigned to it via Employee Leave Policy Assignments.
2. When a Leave Policy's Leave Policy Rules are modified after employees are on it, the changes do not retroactively alter already-initialized Leave Balances for the current leave year. Changes take effect at the next year-start or when a new Employee Leave Policy Assignment is created.
3. Deleting a Leave Policy with historical Leave Balances or Leave Requests is prohibited.

### Required Fields
*(Full definition in Org module document)*
`id`, `tenant_id`, `name`, `code`, `status`

### Lifecycle
```
draft → active → inactive → archived
```

---

## 3. Leave Policy Rule

### Purpose
A Leave Policy Rule is the specific entitlement configuration for a single Leave Type within a Leave Policy. It defines how many days are granted, how they accrue, whether they can be carried forward, and the conditions under which negative balance or encashment is permitted.

### Business Description
If a Leave Policy is the container, the Leave Policy Rule is each row in the entitlement table. Rule: "In the Standard Full-Time Policy, Annual Leave is granted at 24 days per year, accruing 2 days per month, with carry-forward of up to 10 days, expiring on March 31 of the following year."

Each rule links a Leave Type to its quantity and behavioral parameters within a specific policy context. The same Leave Type can have different rules in different policies.

> Note: Leave Policy Rule is defined in full in `docs/org-module-entity-definitions.md §14`. This section documents its impact on Leave module transactions.

### Business Rules — Leave Module Perspective
1. The Leave Balance initialization engine reads the active Leave Policy Rule for the employee's assigned policy and leave type to determine opening entitlements.
2. The Leave Accrual engine reads `accrual_type` and `annual_entitlement_days` to compute monthly accrual amounts.
3. The year-end lapse engine reads `carry_forward_max_days` and `carry_forward_expiry_days` to compute lapsing amounts.
4. Changes to `annual_entitlement_days` or `carry_forward_max_days` on an active rule are allowed but do not retroactively adjust balances. They apply to the next accrual cycle or year.
5. `min_service_days_for_eligibility` is evaluated at Leave Request submission time — an employee with fewer service days than this threshold cannot submit a request for this leave type.
6. The `employment_type_id` on a rule, if set, means this rule only applies to employees of that employment type within the policy. This allows a single policy to have different entitlements for full-time vs. contract employees.

### Required Fields
*(Full definition in Org module document)*
`id`, `tenant_id`, `leave_policy_id`, `leave_type_id`, `annual_entitlement_days`, `accrual_type`

### Key Fields — Leave Module Reference
| Field | Leave Module Significance |
|-------|--------------------------|
| `annual_entitlement_days` | Total days credited per year (upfront or spread across accruals) |
| `accrual_type` | `upfront` or `monthly` — drives Leave Accrual record creation |
| `carry_forward_max_days` | Cap on how many days survive into the next year |
| `carry_forward_expiry_days` | Days after year-start when carry-forward days lapse |
| `encashment_eligible` | Whether Leave Encashment records can be created for this type |
| `encashment_max_days` | Cap on how many days can be encashed per year |
| `negative_balance_allowed` | Whether Leave Requests can be approved into negative balance |
| `is_pro_rated_on_joining` | Whether joining-date entitlement is pro-rated by remaining leave year days |
| `min_service_days_for_eligibility` | Service days required before first request is allowed |

---

## 4. Leave Balance

### Purpose
The Leave Balance is the authoritative, real-time record of an employee's leave position for a specific Leave Type within a specific leave year. It is the single source of truth for how much leave an employee has available, how much they have used, and how the balance was built.

### Business Description
At the start of each leave year, Leave Balances are initialized for every active employee for every Leave Type they are entitled to under their assigned Leave Policy. As the year progresses, the balance evolves: accruals add to it, leave requests deduct from it, adjustments correct it, and at year-end, the lapse engine closes out unused amounts.

The Leave Balance is structured as a decomposed ledger — not just a single number. It stores each component separately so HR and the employee can understand exactly how the balance arrived at its current value.

**Leave Year** is defined by the Organization's `fiscal_year_start_month`. If the fiscal year starts April 1, the leave year runs April 1 to March 31.

### Relationships
- **One Leave Balance → One Employee Profile**
- **One Leave Balance → One Leave Type**
- **One Leave Balance → One Tenant**
- **Referenced by** Leave Requests (check available balance), Leave Accruals, Leave Adjustments, Leave Encashments (all contribute to this balance)

### Business Rules
1. Exactly one Leave Balance record exists per `(employee_id, leave_type_id, leave_year)`. Duplicate records for the same combination are a data integrity violation.
2. Leave Balances are created by the **Balance Initialization** process, which runs on:
   - Leave year start (for all active employees)
   - When a new employee joins mid-year (pro-rated initialization)
   - When an employee's Leave Policy changes (new balances initialized under the new policy)
3. The `available_days` field is a computed derived value: `opening_balance + accrued_days + adjusted_days - used_days - lapsed_days - encashed_days`. It is stored for read performance and must be kept in sync with its source components.
4. No direct modification of `available_days` is permitted — all changes must flow through the component fields via their respective source transactions (accruals, requests, adjustments, encashments, lapse events).
5. `used_days` is incremented only when a Leave Request against this balance is **approved** (not when submitted). It is decremented if the approved request is subsequently cancelled or withdrawn before the leave start date.
6. If a Leave Request is cancelled **after** the leave start date, the `used_days` credit-back policy is configurable per tenant: partial refund (only future days refunded), full refund, or no refund.
7. `lapsed_days` is populated by the year-end **Lapse Processing** job. Lapse = max(0, `opening_balance` + `accrued_days` + `adjusted_days` - `carry_forward_max_days` - `used_days` - `encashed_days`). This is the days that cannot be carried forward.
8. When the leave year rolls over, any carry-forward days become the `opening_balance` of the new year's Leave Balance record.
9. `opening_balance` for year 1 of employment (first Leave Balance) is set by the policy's `is_pro_rated_on_joining` rule. If upfront and pro-rated, it is `(annual_entitlement_days / leave_year_days) × remaining_days_in_year`.
10. `balance_as_of_date` is the date through which the balance is current. It is updated every time any component changes. It enables point-in-time balance queries.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `leave_type_id` | FK to Leave Type |
| `leave_year` | Integer — the leave year this balance belongs to (e.g., 2025 for FY2025–26 if year starts April) |
| `leave_year_start_date` | First date of the leave year (e.g., 2025-04-01) |
| `leave_year_end_date` | Last date of the leave year (e.g., 2026-03-31) |
| `opening_balance` | Days credited at the start of the year (pro-rated or full entitlement) |
| `accrued_days` | Running total of days added by Leave Accrual events this year |
| `used_days` | Running total of days consumed by approved Leave Requests this year |
| `adjusted_days` | Net days added/subtracted by HR-initiated Leave Adjustments this year |
| `lapsed_days` | Days that lapsed at year-end (did not carry forward) |
| `encashed_days` | Days monetarily encashed via Leave Encashment records this year |
| `available_days` | Computed: `opening_balance + accrued_days + adjusted_days - used_days - lapsed_days - encashed_days` |
| `balance_as_of_date` | Date through which this balance is current |

### Optional Fields
| Field | Description |
|-------|-------------|
| `carried_forward_from_previous_year` | Days carried into `opening_balance` from the prior year's Leave Balance |
| `leave_policy_id` | FK to Leave Policy under which this balance was initialized |
| `leave_policy_rule_id` | FK to Leave Policy Rule that governs this balance |
| `is_closed` | Boolean — whether the year is complete and the balance is finalized |
| `closed_at` | Timestamp when the leave year was closed |
| `notes` | HR notes (e.g., "Balance corrected after policy change on 2025-07-01") |

### Unique Constraints
- `(tenant_id, employee_id, leave_type_id, leave_year)` — one balance per employee per type per year

### Validation Rules
- `available_days` must always equal `opening_balance + accrued_days + adjusted_days - used_days - lapsed_days - encashed_days`; deviations are a data integrity error
- `available_days` may be negative only if the Leave Type and Leave Policy Rule permit `negative_balance_allowed`
- `used_days` must be ≥ 0 at all times
- `lapsed_days` must be ≥ 0 at all times
- `encashed_days` must be ≥ 0 at all times
- `leave_year_end_date` must be ≥ `leave_year_start_date`
- `balance_as_of_date` must be ≤ today's date

### Lifecycle
```
active → closed
```
- `active` — Leave year is in progress; balance is live and updating
- `closed` — Leave year has ended; balance is finalized; no further transactions permitted

### Audit Requirements
- Leave Balance initialization events logged (who triggered the init, what values were set)
- Every component change (`accrued_days`, `used_days`, `adjusted_days`, `lapsed_days`, `encashed_days`) logged with the source transaction reference and delta
- Year-end lapse events logged
- Manual override of `available_days` (outside of proper transaction flow) is a critical audit violation and must be flagged

---

## 5. Leave Accrual

### Purpose
A Leave Accrual is an individual event record capturing a single credit of leave days to an employee's Leave Balance. For Leave Types with `accrual_basis = monthly`, accrual records are generated periodically by the system. For `upfront` types, a single accrual record is generated at year initialization.

### Business Description
For many organizations, Annual Leave is earned gradually — not all given on day one. An employee earns 2 days of Annual Leave per month worked. This is more equitable: an employee who joins in November doesn't get 24 days immediately; they earn 2 per month for the time they are employed that year.

The Leave Accrual entity captures each of these credit events:
- "On April 30, 2025, employee Priya earned 2.0 days of Annual Leave for April 2025."
- "On May 31, 2025, employee Priya earned 2.0 days of Annual Leave for May 2025."

Each accrual is a discrete event with its own audit trail. If an accrual was computed incorrectly (e.g., due to mid-month joining), it can be identified, reversed, and reissued — without corrupting the overall balance.

For `upfront` Leave Types, one accrual record is generated at the start of the leave year with the full year's entitlement.

### Relationships
- **One Leave Accrual → One Leave Balance** (the balance it credits)
- **One Leave Accrual → One Employee Profile**
- **One Leave Accrual → One Leave Type**
- **One Leave Accrual → One Tenant**

### Business Rules
1. Leave Accruals are generated automatically by the **Accrual Processing** job. They are not created manually by HR Admins in the normal flow.
2. For `monthly` accrual types: The accrual job runs at the start (or end, depending on configuration) of each month and generates one Accrual record per employee per eligible leave type.
3. Monthly accrual amount = `annual_entitlement_days / 12` (rounded to 2 decimal places). Rounding convention is configurable: `round_up`, `round_down`, `round_nearest`.
4. Pro-rated accrual for joining-month employees: if `is_pro_rated_on_joining = true`, the first month's accrual = `(monthly_rate × remaining_working_days_in_month / total_working_days_in_month)`.
5. Accruals are not generated for months when the employee was entirely on Loss of Pay (configurable per tenant).
6. Once created, an Accrual record cannot be edited. If incorrect, it must be reversed (a negative Accrual record with `reversal_of_accrual_id`) and a corrected one issued.
7. The sum of all Accrual records for a `(employee_id, leave_type_id, leave_year)` must equal the Leave Balance's `accrued_days`. This invariant is checked by the data integrity monitoring job.
8. For `upfront` types, the single opening accrual = `opening_balance` derived from the Leave Policy Rule, adjusted for pro-rating if applicable.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `leave_balance_id` | FK to Leave Balance being credited |
| `leave_type_id` | FK to Leave Type |
| `accrual_date` | The date on which this accrual was credited |
| `accrual_period_start` | First day of the accrual period (e.g., April 1 for April accrual) |
| `accrual_period_end` | Last day of the accrual period (e.g., April 30 for April accrual) |
| `accrual_days` | Number of days credited (may be negative for reversals) |
| `accrual_type` | `opening`, `monthly`, `reversal`, `correction` |

### Optional Fields
| Field | Description |
|-------|-------------|
| `reversal_of_accrual_id` | FK to Leave Accrual — for reversal records, the original accrual being reversed |
| `computation_notes` | How the accrual amount was calculated (for debugging and audit) |
| `is_pro_rated` | Boolean — whether this accrual was pro-rated |
| `pro_rate_factor` | The fraction applied for pro-rating (e.g., 0.6 for 18/30 days worked) |

### Unique Constraints
- `(tenant_id, employee_id, leave_type_id, accrual_period_start, accrual_type)` where `accrual_type != 'reversal'` — one non-reversal accrual per employee per type per period

### Validation Rules
- `accrual_days` may be negative only for `accrual_type = reversal`
- `accrual_period_end` must be ≥ `accrual_period_start`
- `reversal_of_accrual_id` must be set if `accrual_type = reversal`
- `accrual_date` must fall within the leave year of the referenced `leave_balance_id`
- `leave_balance_id.leave_year_start_date` ≤ `accrual_period_start` ≤ `leave_balance_id.leave_year_end_date`

### Lifecycle
Leave Accruals have no lifecycle state — they are immutable records (append-only). Corrections are made via reversal + new accrual, not by editing.

### Audit Requirements
- All Accrual record creation and reversal events are inherently audit records
- The accrual batch job run must be logged: run timestamp, number of employees processed, total days accrued, any failures
- Reversal events logged with the authorizing HR user and reason

---

## 6. Leave Request

### Purpose
A Leave Request is an employee's formal application to take time off for a specific period, under a specific Leave Type. It is the primary transaction record in the Leave module and the trigger for the approval workflow, balance deduction, and attendance update.

### Business Description
When an employee plans to take leave, they submit a Leave Request. The request captures: what type of leave (Annual, Sick, Casual), from when to when, the stated reason, and any supporting documentation. The request then enters an approval flow where the employee's manager (and possibly HR) approves or rejects it.

On approval:
- The Leave Balance is debited by the approved number of leave days
- The Attendance Days for each leave date are updated to `on_leave` status
- Notifications are sent to the employee and relevant parties

On rejection or cancellation:
- Any deducted balance is reversed
- Attendance Days revert to their original status
- The employee is notified

A Leave Request covers a date range. Individual calendar dates within that range are managed by Leave Day records (§7), which handle the nuances of weekends, holidays, and half-days within the range.

### Relationships
- **One Leave Request → One Employee Profile** (the applicant)
- **One Leave Request → One Leave Type**
- **One Leave Request → One Leave Balance** (checked at submission, debited on approval)
- **One Leave Request → One Tenant**
- **One Leave Request → Many Leave Days** (one per calendar date in the range)
- **One Leave Request → One or Many Leave Approvals** (one per approval step)
- **One Leave Request → One Approval Workflow Instance** (via Approvals module)
- **Referenced by** Attendance Days (`leave_request_id` on approved leave dates)

### Business Rules
1. A Leave Request cannot be submitted for a date in the past beyond the tenant-configured **backdated leave window** (default: 7 days). Requests beyond this window require HR Admin override.
2. At submission, the system must check the employee's Leave Balance `available_days` against the requested days. If insufficient and `negative_balance_allowed = false` for this leave type, submission is blocked.
3. A Leave Request must not overlap with another `approved` or `pending` Leave Request for the same employee. Overlapping requests are rejected at submission.
4. The `total_requested_days` is computed from the Leave Days breakdown — not from `(to_date - from_date + 1)`. Weekends, holidays, and half-days within the range affect the actual count.
5. Leave Requests submitted for a date that already has an `approved` Leave Request from a different leave type (e.g., applying for Casual Leave on a day already approved as Sick Leave) are blocked.
6. Cancellation is permitted by the employee if the leave has not yet started (`leave_from_date > today`). Post-start cancellation requires HR Admin override.
7. Withdrawal is permitted before approval is finalized. Once approved, only cancellation is available.
8. A Leave Request is automatically moved to `auto_approved` status if the employee's Leave Policy Rule for this leave type has `requires_approval = false` (e.g., Sick Leave may be self-approved in some policies).
9. When a Leave Request is approved, the system must update the corresponding Attendance Days atomically — the balance deduction and attendance update are a single transaction.
10. Partial approval is supported: a manager may approve fewer days than requested (e.g., approve 3 of 5 requested days). This creates a partial approval with `approved_days < requested_days`.
11. Leave Requests submitted for a period where the Leave Balance is already `closed` (year-end lapse applied) are rejected.
12. The `is_emergency` flag bypasses the advance notice day check and can fast-track approval routing in some tenant configurations.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `leave_type_id` | FK to Leave Type |
| `leave_balance_id` | FK to Leave Balance being debited |
| `leave_from_date` | First day of the leave period (inclusive) |
| `leave_to_date` | Last day of the leave period (inclusive) |
| `requested_days` | Total chargeable leave days computed from Leave Day records |
| `reason` | Employee's reason for leave |
| `status` | Current request lifecycle status |
| `submitted_at` | Timestamp of submission |

### Optional Fields
| Field | Description |
|-------|-------------|
| `approved_days` | Days approved (may differ from `requested_days` in partial approvals) |
| `half_day_portion` | `first_half` or `second_half` — if this is a half-day request |
| `is_emergency` | Boolean — emergency leave flag; bypasses advance notice check |
| `supporting_document_id` | FK to Employee Document — medical certificate or other evidence |
| `handover_notes` | Work handover information provided by the employee |
| `manager_notes` | Notes added by the approving manager |
| `cancellation_reason` | Reason provided when the request is cancelled |
| `cancelled_by` | FK to User — who cancelled the request |
| `cancelled_at` | Timestamp of cancellation |
| `approval_workflow_instance_id` | FK to Approval Workflow Instance — the running approval chain |
| `auto_approved` | Boolean — whether the request was auto-approved without manual review |
| `contact_during_leave` | Phone/email where the employee can be reached during their absence |

### Unique Constraints
No absolute unique constraint — an employee may have multiple requests in different periods. Overlap prevention is enforced via business logic.

### Validation Rules
- `leave_to_date` must be ≥ `leave_from_date`
- `leave_from_date` must be ≥ employee's `joining_date`
- `requested_days` must be > 0
- `approved_days`, if set, must be > 0 and ≤ `requested_days`
- `reason` must be at least 5 characters
- Advance notice check: `leave_from_date - submitted_at_date >= leave_type.advance_notice_days` (unless `is_emergency = true`)
- Max days per application check: `requested_days <= leave_type.max_days_per_application` (if set)
- `half_day_portion` must only be set if `leave_type.allow_half_day = true` and the request is for exactly 0.5 days

### Lifecycle
```
draft → pending → approved
                → rejected
                → partially_approved
pending → withdrawn (employee-initiated before decision)
approved → cancelled (before or during leave)
```

- `draft` — Saved but not yet submitted (not all systems support draft state)
- `pending` — Submitted; awaiting approver decision
- `approved` — All approval steps completed positively; balance debited; attendance updated
- `partially_approved` — Approved for fewer days than requested (partial approval)
- `rejected` — Denied by approver
- `withdrawn` — Employee recalled before approval decision
- `cancelled` — Employee or HR cancelled an already-approved leave

### Audit Requirements
- Leave Request submission logged: employee, leave type, dates, requested days, timestamp
- Every status transition logged with actor and timestamp
- Balance debit events logged with the request reference and the delta applied to `used_days`
- Cancellation events (especially post-start cancellations by HR) logged as high-priority events
- Backdated submissions logged with the override authorization reference
- Partial approval events logged with the full and approved day counts

---

## 7. Leave Day

### Purpose
A Leave Day is an individual calendar date entry within a Leave Request, capturing whether that specific date contributes to leave deduction and how much is charged. It is the detailed breakdown layer that makes the Leave Request duration calculation accurate across weekends, holidays, and half-days.

### Business Description
When an employee applies for leave from Monday to Friday, the request spans 5 calendar dates. But if Wednesday is a public holiday, only 4 days should be deducted from their leave balance. The Leave Day entity captures this date-by-date reality.

For every calendar date in the `leave_from_date` to `leave_to_date` range of a Leave Request, one Leave Day record is created at submission time. Each record evaluates:
- Is this date a working day for the employee (after checking the applicable Holiday Calendar and weekly off pattern from their Shift)?
- If working: how many days are charged (1.0 for full day, 0.5 for half day)?
- If holiday or week-off: how many days are charged (0.0, unless the Sandwich Rule applies)?

The sum of all `deduction_days` across a Leave Request's Leave Days equals the `requested_days` on the header.

### Relationships
- **One Leave Day → One Leave Request**
- **One Leave Day → One Employee Profile** (via Leave Request)
- **One Leave Day → One Tenant**
- **One Leave Day → Zero or One Holiday Calendar Day** (if the date is a holiday)
- **One Leave Day → One Attendance Day** (the attendance record for this date, updated on approval)

### Business Rules
1. Leave Days are created automatically when a Leave Request is submitted — one per calendar date in the range. They are never manually created by users.
2. The `day_type` for each Leave Day is determined at creation time by checking:
   - Is the date in the employee's Holiday Calendar? → `holiday`
   - Is the date a week-off per the employee's Shift schedule? → `week_off`
   - Otherwise → `working_day`
3. `deduction_days` for `holiday` and `week_off` records is 0.0 by default.
4. If the Leave Type has `is_sandwich_rule_applicable = true`, `holiday` and `week_off` Leave Days embedded between working-day Leave Days within the same request have their `deduction_days` set to 1.0 (they count as leave days). This is re-evaluated if any days are changed after initial creation.
5. For half-day requests: the single Leave Day record has `deduction_days = 0.5` and `half_day_portion` matching the Leave Request.
6. Leave Days are immutable once the Leave Request is `approved`. If the leave is cancelled, Leave Days are not deleted — they remain as a historical record of what was approved and when.
7. The Attendance Day for each approved Leave Day date is updated to `attendance_status = on_leave` with the `leave_request_id` reference.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `leave_request_id` | FK to Leave Request |
| `employee_id` | FK to Employee Profile |
| `leave_date` | The specific calendar date this record represents |
| `day_type` | `working_day`, `week_off`, `holiday` |
| `deduction_days` | Days charged to the balance for this date (0.0, 0.5, or 1.0) |

### Optional Fields
| Field | Description |
|-------|-------------|
| `holiday_calendar_day_id` | FK to Holiday Calendar Day — if `day_type = holiday` |
| `half_day_portion` | `first_half` or `second_half` — if `deduction_days = 0.5` |
| `attendance_day_id` | FK to Attendance Day — the attendance record updated on approval |
| `is_sandwich_rule_applied` | Boolean — whether this day's deduction was set by the sandwich rule |

### Unique Constraints
- `(leave_request_id, leave_date)` — one Leave Day per date per request

### Validation Rules
- `leave_date` must fall within the parent Leave Request's `leave_from_date` to `leave_to_date` range
- `deduction_days` must be one of: 0.0, 0.5, or 1.0
- `half_day_portion` must be set if `deduction_days = 0.5`
- `day_type` must be consistent with `deduction_days`: `week_off` and `holiday` types must have `deduction_days = 0.0` unless sandwich rule is applied
- Sum of `deduction_days` across all Leave Days in a request must equal the `requested_days` on the Leave Request header

### Lifecycle
Leave Days are immutable once created. They follow the Leave Request lifecycle — they are created at submission and remain permanently as historical records even if the request is cancelled or rejected.

### Audit Requirements
- Leave Day creation batch logged as part of Leave Request submission audit
- Sandwich rule application events logged — this is a non-obvious deduction that employees may question

---

## 8. Leave Approval

### Purpose
A Leave Approval is the recorded decision of a single approver on a Leave Request at a specific step in the approval chain. It captures who approved or rejected, what they decided, when, and any notes they provided.

### Business Description
Most leave requests go through one approver (the employee's reporting manager). Some — longer leaves, certain leave types, or leaves above a day threshold — may require multi-step approval (manager → HR → HR Head). Each step produces one Leave Approval record.

The Leave Approval entity is the concrete record of an approver's action. It is distinct from the Approval Workflow Instance (which governs the routing, steps, and escalation logic in the Approvals module). The Leave Approval captures only the substantive leave decision — the verdict, the approved days, and the stated rationale.

### Relationships
- **One Leave Approval → One Leave Request**
- **One Leave Approval → One User** (the approver)
- **One Leave Approval → One Tenant**
- **One Leave Approval → One Approval Step Instance** (the Approvals module step this corresponds to)

### Business Rules
1. A Leave Approval record is created for each step in the approval chain where a human makes a decision. Auto-approved requests generate a system Leave Approval with `approved_by` set to the system user.
2. The approval decision on the final required step triggers the Leave Request status change to `approved` (or `rejected`). Intermediate approvals advance the workflow but do not change the Leave Request status.
3. `approved_days` may be less than `requested_days` — this represents partial approval. If any step partially approves, the Leave Request becomes `partially_approved` and the balance is debited by `approved_days`.
4. A rejection at any step in the chain immediately sets the Leave Request to `rejected`. Downstream approvers in the chain do not act.
5. An approval cannot be reversed after it is recorded. If an approved leave needs to be undone, the Leave Request must be `cancelled` — this triggers a balance reversal.
6. The approver must be an active employee with the `leave:requests:approve` permission scoped to the applicant's department or in their reporting chain.
7. Approval decisions must be made within the escalation window (configurable per tenant, default: 48 hours). After this window, the request is either auto-escalated to the next approver or auto-approved, depending on tenant configuration.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `leave_request_id` | FK to Leave Request |
| `approved_by` | FK to User — the approver |
| `decision` | `approved`, `rejected`, `partially_approved` |
| `decided_at` | Timestamp of the decision |
| `step_number` | The step in the approval chain (1 for first approver, 2 for second, etc.) |

### Optional Fields
| Field | Description |
|-------|-------------|
| `approved_days` | Days approved (required if `decision = partially_approved`) |
| `approval_notes` | Comments provided by the approver |
| `approval_step_instance_id` | FK to Approval Step Instance in the Approvals module |
| `is_auto_approved` | Boolean — whether this was system auto-approval |
| `is_escalated` | Boolean — whether this step was escalated from a prior approver timeout |
| `escalated_from_user_id` | FK to User — the original approver who timed out |

### Unique Constraints
- `(leave_request_id, step_number)` — one approval record per step per request

### Validation Rules
- `decision` must be one of `approved`, `rejected`, `partially_approved`
- `approved_days` must be set if `decision = partially_approved`
- `approved_days` must be > 0 and ≤ `leave_request.requested_days`
- `decided_at` must not be before the Leave Request `submitted_at`
- `approved_by` must hold the `leave:requests:approve` permission for the applicant

### Lifecycle
Leave Approval records have no lifecycle of their own — they are immutable once created. The Leave Request's `status` field reflects the overall approval outcome.

### Audit Requirements
- Every Leave Approval decision logged: request ID, approver, decision, days approved, timestamp
- Partial approval events logged with the difference in days (what was requested vs what was approved)
- Auto-approval events logged with the rule that triggered auto-approval
- Escalation events logged with the original approver and timeout duration

---

## 9. Leave Adjustment

### Purpose
A Leave Adjustment is an HR-initiated, authorized modification to an employee's Leave Balance — either a credit (adding days) or a debit (removing days) — for reasons outside the standard accrual, request, or encashment flows.

### Business Description
HR sometimes needs to manually correct leave balances. Scenarios:
- An employee was incorrectly debited due to a system error — credit the balance
- A policy change mid-year results in all employees receiving an extra 2 days of Casual Leave — bulk credit
- An employee abused sick leave and HR is recovering the days outside the standard request flow — debit
- A rejoining employee needs their prior-service leave balance restored
- A system migration imported incorrect opening balances — correction adjustment

Leave Adjustments are always accompanied by a reason. They immediately update the Leave Balance's `adjusted_days` component and the computed `available_days`.

### Relationships
- **One Leave Adjustment → One Leave Balance** (the balance being adjusted)
- **One Leave Adjustment → One Employee Profile**
- **One Leave Adjustment → One Leave Type**
- **One Leave Adjustment → One Tenant**
- **Applied by** User (HR Admin with `leave:balance:adjust` permission)

### Business Rules
1. Leave Adjustments are applied immediately and update the Leave Balance in real time.
2. A Leave Adjustment may only target a Leave Balance with `is_closed = false`. Adjustments to closed-year balances require a Super Admin override and are automatically logged as critical events.
3. `adjustment_days` is positive for credits and negative for debits.
4. A debit Adjustment that would take the `available_days` below zero is blocked unless the Leave Type's `allow_negative_balance = true`.
5. The `reason` field is mandatory and must be at least 10 characters.
6. Bulk adjustments (applying the same adjustment to multiple employees simultaneously, e.g., a policy change credit) must reference a common `batch_id` to group them for audit readability.
7. Leave Adjustments cannot be deleted or reversed. A reverse adjustment (equal and opposite `adjustment_days`) must be submitted if a prior adjustment was made in error.
8. The total net `adjusted_days` component of a Leave Balance is the sum of all Leave Adjustment records for that `(employee_id, leave_type_id, leave_year)`.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `leave_balance_id` | FK to Leave Balance being adjusted |
| `leave_type_id` | FK to Leave Type |
| `leave_year` | The leave year this adjustment applies to |
| `adjustment_days` | Number of days adjusted — positive = credit, negative = debit |
| `adjustment_type` | `credit_correction`, `debit_correction`, `policy_change_credit`, `migration_correction`, `bulk_credit`, `other` |
| `reason` | Mandatory justification (minimum 10 characters) |
| `adjusted_by` | FK to User — the HR Admin who applied the adjustment |
| `adjusted_at` | Timestamp of adjustment |

### Optional Fields
| Field | Description |
|-------|-------------|
| `batch_id` | Reference ID for bulk adjustments — groups related adjustments |
| `reversal_of_adjustment_id` | FK to Leave Adjustment — if this is a reversal of a prior adjustment |
| `supporting_reference` | External reference (e.g., policy change memo number, ticket ID) |
| `approved_by` | FK to User — if dual authorization is configured for adjustments |
| `employee_notified` | Boolean — whether the employee was notified of this adjustment |

### Unique Constraints
None — multiple adjustments on the same balance are permitted.

### Validation Rules
- `adjustment_days` must not be 0 (zero-adjustment is meaningless)
- `adjustment_type` must be one of the defined enum values
- `reason` must be at least 10 characters
- Debit adjustment must not result in `available_days < 0` unless `leave_type.allow_negative_balance = true`
- `reversal_of_adjustment_id`, if set, must reference an adjustment on the same `leave_balance_id`

### Lifecycle
Leave Adjustments are immutable once applied. The adjustment record itself IS the audit trail.

### Audit Requirements
- Every Leave Adjustment is a high-priority audit event; the entity is the audit record
- Bulk adjustments (same `batch_id`) must be reviewable in aggregate and individually
- Adjustments to closed-year balances trigger a critical-priority system alert
- `adjustment_days` deviations > 5 days in a single adjustment should trigger a secondary approval requirement (configurable per tenant)

---

## 10. Leave Encashment

### Purpose
A Leave Encashment is a formal record of an employee monetarily encashing eligible unused leave days — converting leave balance into a cash payout processed via Payroll.

### Business Description
Some organizations allow employees to convert accumulated unused annual leave into cash — typically at year-end, during the Full & Final Settlement upon exit, or at a designated encashment window. Leave Encashment governs this process formally.

The encashment is governed by the Leave Policy Rule (`encashment_eligible = true`, `encashment_max_days`). When an employee submits a Leave Encashment request for N days, the following happens on approval:
1. The Leave Balance's `encashed_days` is incremented by N
2. `available_days` is reduced by N
3. A Pay Run Line for the encashment amount is created in the current (or next) Payroll Run

The monetary value of each encashed day = `(monthly_gross_salary / working_days_in_month)` × `encashed_days`. The formula may be configured per tenant or per Leave Type.

### Relationships
- **One Leave Encashment → One Employee Profile**
- **One Leave Encashment → One Leave Balance** (the balance being debited)
- **One Leave Encashment → One Leave Type**
- **One Leave Encashment → One Tenant**
- **Referenced by** Pay Run Line (the payroll entry for the encashment amount)

### Business Rules
1. A Leave Encashment may only be created if the Leave Type's `is_encashable = true` and the Leave Policy Rule's `encashment_eligible = true`.
2. `encashment_days` must not exceed:
   - The Leave Policy Rule's `encashment_max_days` for the current year
   - The employee's `available_days` on the target Leave Balance
3. The employee must have a minimum balance of `encashment_min_retention_days` remaining after encashment (configurable per Leave Type — some policies require the employee to retain at least 10 days before encashing).
4. Leave Encashment requests go through an approval workflow (HR Admin approval at minimum).
5. Once approved, the encashment is processed in the next eligible Payroll Run for the employee's Legal Entity.
6. The encashment payout is taxable as salary income in most jurisdictions. The Payroll module applies TDS accordingly.
7. Multiple encashment requests in the same leave year are permitted up to the `encashment_max_days` annual limit.
8. A Leave Encashment may not be reversed after the corresponding Pay Run has been `locked`. Before that, a cancellation triggers a reversal of both the balance and the Pay Run Line.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `leave_balance_id` | FK to Leave Balance being debited |
| `leave_type_id` | FK to Leave Type |
| `leave_year` | The leave year from which days are being encashed |
| `encashment_days` | Number of days to be encashed |
| `encashment_type` | `year_end`, `mid_year`, `exit_fnf`, `voluntary` |
| `status` | `draft`, `pending`, `approved`, `rejected`, `paid`, `cancelled` |
| `submitted_at` | Timestamp of submission |

### Optional Fields
| Field | Description |
|-------|-------------|
| `encashment_amount` | Computed monetary value of the encashment (set on approval, before Pay Run) |
| `encashment_rate_per_day` | Per-day rate used for computation (salary / working days) |
| `pay_run_line_id` | FK to Pay Run Line — set once the amount is included in a Payroll Run |
| `approved_by` | FK to User — who approved |
| `approved_at` | Timestamp of approval |
| `rejected_reason` | Reason for rejection |
| `cancellation_reason` | Reason for cancellation |
| `exit_record_id` | FK to Exit Record — for `exit_fnf` type encashments |

### Unique Constraints
None — multiple encashments per balance per year are permitted up to the policy limit.

### Validation Rules
- `encashment_days` must be > 0
- `encashment_days` must not exceed the Leave Policy Rule's `encashment_max_days` minus already-encashed days this year
- `encashment_days` must not exceed `leave_balance.available_days` minus the Leave Type's `encashment_min_retention_days`
- `encashment_type` must be one of the defined enum values
- `leave_type.is_encashable` must be `true`
- `leave_policy_rule.encashment_eligible` must be `true` for the employee's active policy

### Lifecycle
```
draft → pending → approved → paid
               → rejected
approved → cancelled (only before Pay Run is locked)
```

### Audit Requirements
- Leave Encashment submission, approval, rejection, and payment events all logged
- Payment event logged with Pay Run Line reference and monetary amount
- Cancellation after approval logged with the Payroll reversal reference
- Year-end bulk encashment processing (for organizations that auto-encash at year-end) logged as a batch event with individual employee records

---

## Leave Year-End Processing

Year-end is a critical batch process in the Leave module. The following events occur in sequence:

### Step 1 — Lapse Calculation
For every active Leave Balance of the closing year:
1. Compute excess = max(0, `available_days` before lapse - `carry_forward_max_days` from Leave Policy Rule)
2. Set `lapsed_days = excess`
3. Update `available_days` accordingly
4. Log a Leave Lapse event

### Step 2 — Carry-Forward Initialization
For every active Leave Balance where `carry_forward_max_days > 0`:
1. Compute carried = min(`available_days`, `carry_forward_max_days`)
2. Create next year's Leave Balance record with `opening_balance = carried`
3. Set `carried_forward_from_previous_year = carried` on the new balance
4. Log an Opening Balance initialization event

### Step 3 — New Year Initialization
For Leave Types with `accrual_basis = upfront`:
1. Grant the full year's entitlement as a single Leave Accrual record with `accrual_type = opening`
2. Add to the new year's `accrued_days`

For `monthly` accrual types:
1. The first month's accrual will be generated by the monthly accrual job in the new year's first month

### Step 4 — Carry-Forward Expiry Monitoring
For balances where `carry_forward_expiry_days` is configured:
1. A job monitors the new year's balance for the expiry date (e.g., June 30)
2. On that date, any remaining carry-forward days that were not used are lapsed
3. A lapse event is logged and the balance updated

---

## Cross-Module Interactions

| Interaction | Source | Target | Trigger | Notes |
|-------------|--------|--------|---------|-------|
| Leave Request approved → Attendance updated | Leave (Leave Request `approved`) | Attendance Day `attendance_status = on_leave` | Approval event | Atomic transaction |
| Attendance absent → Leave auto-deduction | Attendance (Attendance Day `absent`) | Leave Balance debit + Leave Adjustment (`debit_correction`) | Daily batch | If tenant has LOP auto-deduction enabled |
| Overtime comp-off → Leave Balance credit | Attendance (Overtime Record `comp_off_credited`) | Leave Balance `accrued_days` + Leave Accrual | Overtime approval event | Leave Type must be `is_compensatory_type = true` |
| Leave Encashment → Payroll pay line | Leave (Leave Encashment `approved`) | Pay Run Line | Next Payroll Run processing | Leave module feeds amount; Payroll computes tax |
| Employee exit → Leave FNF | Employee (Exit Record `initiated`) | Leave Encashment (`exit_fnf`) | Exit workflow trigger | Remaining balance encashed or lapsed per policy |
| Leave Policy change → Balance re-init | Employee (Leave Policy Assignment change) | Leave Balance initialization | Assignment change event | New balance created under new policy |

---

*This document is the authoritative business entity definition for the Leave module of Evolve HRMS. Leave balance integrity — the invariant that `available_days` always equals the sum of its components — must be maintained by all operations. Any code path that modifies a Leave Balance must do so through the defined transaction entities.*
