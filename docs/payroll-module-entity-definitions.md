# Evolve HRMS — Payroll Module: Business Entity Definitions

**Classification:** Internal Engineering Reference  
**Status:** Finalized  
**Module:** Payroll  
**Preceding Documents:** `docs/database-standards.md`, `docs/entity-inventory.md`, `docs/org-module-entity-definitions.md`, `docs/employee-domain-entity-definitions.md`, `docs/attendance-module-entity-definitions.md`, `docs/leave-module-entity-definitions.md`

---

## Overview

The Payroll module is the financial engine of the HRMS. It consumes structured inputs from every other module — compensation from the Employee domain, work history from Attendance, leave balances from Leave, approved claims from Reimbursements, and declared investments from Tax — and produces payslips, statutory filings, and disbursement records.

Payroll is the module where errors are most visible and most costly. An underpayment generates employee grievances. An overpayment creates recovery obligations. A missed statutory deduction carries regulatory penalties. Payroll computation must be deterministic, auditable, and fully reproducible: given the same inputs, the same output must be produced every time.

---

## Architecture: Payroll Computation Flow

```
CONFIGURATION INPUTS
├── Pay Group (who is processed, when, how often)
├── Salary Structure + Salary Components (earnings/deduction formulas)
└── Employee Salary Structure Assignment (which structure per employee)

TRANSACTION INPUTS (consumed per pay period)
├── Locked Attendance Days         → LOP count, LOP deduction amount
├── Approved Overtime Records      → Overtime earning lines
├── Approved Leave Encashments     → Encashment earning lines
├── Active Employee Loans          → EMI deduction lines
├── Approved Reimbursement Claims  → Reimbursement earning lines
├── Approved Payroll Adjustments   → Arrear/recovery/bonus lines
└── Active Tax Declaration         → TDS computation inputs

COMPUTATION ENGINE (per employee, per Pay Run)
  ↓
Pay Run Line            ← one per employee: gross, deductions, net pay, LOP days
  ├── Pay Run Earning Lines    ← one per earning component
  ├── Pay Run Deduction Lines  ← one per deduction component
  └── Pay Run Tax Computation  ← TDS, PT detail

OUTPUT
├── Payslip              ← employee-facing pay statement
├── Bank Disbursement    ← net pay → bank account
└── Statutory Compliance ← PF, ESIC, PT, TDS filing records
```

**Payroll is computed bottom-up from component lines.** The `gross_earnings` on the Pay Run Line is the sum of all Pay Run Earning Lines. The `total_deductions` is the sum of all Pay Run Deduction Lines. `net_pay = gross_earnings - total_deductions`. These derived totals must always equal their component sums — this invariant is enforced at computation and locked at run approval.

---

## Entity Index

1. [Pay Group](#1-pay-group)
2. [Salary Structure](#2-salary-structure) *(Org module cross-reference)*
3. [Salary Component](#3-salary-component) *(Org module cross-reference)*
4. [Employee Salary Structure Assignment](#4-employee-salary-structure-assignment) *(Employee module cross-reference)*
5. [Payroll Run](#5-payroll-run)
6. [Pay Run Line](#6-pay-run-line)
7. [Pay Run Earning Line](#7-pay-run-earning-line)
8. [Pay Run Deduction Line](#8-pay-run-deduction-line)
9. [Pay Run Tax Computation](#9-pay-run-tax-computation)
10. [Payslip](#10-payslip)
11. [Employee Loan](#11-employee-loan)
12. [Loan Repayment Schedule](#12-loan-repayment-schedule)
13. [Reimbursement Claim](#13-reimbursement-claim)
14. [Reimbursement Claim Line](#14-reimbursement-claim-line)
15. [Tax Declaration](#15-tax-declaration)
16. [Investment Proof](#16-investment-proof)
17. [Payroll Adjustment](#17-payroll-adjustment)
18. [Statutory Compliance Record](#18-statutory-compliance-record)

---

## Relationship Overview

```
Legal Entity
  └── Pay Group (N)
        └── Payroll Run (1 per pay period)
              └── Pay Run Line (1 per employee)
                    ├── Pay Run Earning Lines (N)
                    ├── Pay Run Deduction Lines (N)
                    └── Pay Run Tax Computation (1)
                          └── Payslip (1, after approval)
                                └── Statutory Compliance Record (1, after lock)

Employee Profile
  ├── Salary Structure Assignment ─── Salary Structure ─── Salary Components
  ├── Employee Loans ─── Loan Repayment Schedule
  │                 └── EMI → Pay Run Deduction Lines
  ├── Reimbursement Claims ─── Claim Lines
  │                        └── approved amount → Pay Run Earning Lines
  ├── Tax Declaration ─── Investment Proofs
  │                   └── net taxable → Pay Run Tax Computation → TDS deduction line
  └── Payroll Adjustments → Pay Run Earning/Deduction Lines
```

---

## 1. Pay Group

### Purpose
A Pay Group is a logical classification that determines which employees are processed together in a Payroll Run, on what schedule, and on what payment day. It is the unit of payroll scheduling.

### Business Description
Not all employees are paid on the same day, at the same frequency, or under the same payroll rules. A multinational tenant may have:
- "India Full-Time Salaried" — monthly, paid on the last working day
- "India Contract Workers" — bi-weekly, paid every other Friday
- "Singapore Employees" — monthly, paid on the 25th
- "Interns" — monthly, paid on the last day, separate payroll cycle

The Pay Group defines this grouping. Every employee must belong to exactly one active Pay Group at any time (via Pay Group Membership, which is part of their Employment Record or Leave Policy Assignment).

The Pay Group also defines the **attendance cutoff date** — the date by which Attendance Days must be locked before the payroll run can be initiated. This enforces the discipline of finalizing attendance before computing pay.

### Relationships
- **One Pay Group → One Legal Entity**
- **One Pay Group → One Tenant**
- **One Pay Group → Many Employees** (via Pay Group Membership on Employment Record)
- **One Pay Group → Many Payroll Runs** (one per pay period)

### Business Rules
1. Every active employee must belong to exactly one Pay Group. An employee without a Pay Group assignment cannot be included in any Payroll Run.
2. Pay Group `pay_frequency` determines how many Payroll Runs are created per year: `monthly` = 12, `semi_monthly` = 24, `bi_weekly` = 26.
3. `pay_day_type` defines when payment is issued:
   - `specific_date` — a fixed day of the month (e.g., 28th)
   - `last_working_day` — computed from the Legal Entity's Location calendar
   - `days_after_period_end` — N days after the pay period closes
4. `attendance_cutoff_day` is the day of the month by which all Attendance Days for the pay period must be locked. The Payroll Run cannot advance past `draft` status if any employee in the group has unlocked Attendance Days within the period.
5. A Pay Group cannot be deleted if it has Payroll Runs associated with it.
6. Changing `pay_frequency` on an active Pay Group requires a manual migration plan — it affects all future Payroll Runs and all employees in the group.
7. Pay Groups are Legal Entity-scoped because pay currency, statutory rules, and pay calendars all vary by Legal Entity.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `legal_entity_id` | FK to Legal Entity |
| `name` | Display name (e.g., "India Monthly Salaried", "Contract Bi-Weekly") |
| `code` | Short identifier (e.g., `IND-MONTHLY`, `IND-CONTRACT`) |
| `pay_frequency` | `monthly`, `semi_monthly`, `bi_weekly`, `weekly` |
| `pay_day_type` | `specific_date`, `last_working_day`, `days_after_period_end` |
| `attendance_cutoff_day` | Day of the month by which attendance must be locked (integer 1–31) |
| `status` | `active`, `inactive` |

### Optional Fields
| Field | Description |
|-------|-------------|
| `pay_day` | Integer day of month (required if `pay_day_type = specific_date`) |
| `days_after_period_end` | Integer (required if `pay_day_type = days_after_period_end`) |
| `description` | Purpose and scope of this pay group |
| `includes_employment_types` | Array of Employment Type IDs — restricts auto-assignment to these types |

### Unique Constraints
- `(tenant_id, code)` — Pay Group code unique per tenant
- `(tenant_id, name)` — Pay Group name unique per tenant

### Validation Rules
- `pay_day` must be 1–31 if `pay_day_type = specific_date`
- `days_after_period_end` must be a positive integer if `pay_day_type = days_after_period_end`
- `attendance_cutoff_day` must be between 1 and 28 (to ensure it is a valid day in all months)

### Lifecycle
```
active → inactive
```

### Audit Requirements
- Pay Group creation and configuration changes logged
- Changes to `pay_frequency`, `pay_day_type`, or `attendance_cutoff_day` logged as high-impact events — they affect payroll timing for all employees in the group

---

## 2. Salary Structure

### Purpose
A Salary Structure is a compensation template that defines the earnings and deduction components making up an employee's pay, along with the formula or percentage for each component.

> **Full definition in** `docs/org-module-entity-definitions.md §15`. This section documents Salary Structure's role within Payroll computation.

### Payroll Module Role
At Payroll Run computation time, the engine resolves each employee's active Salary Structure Assignment, reads the Salary Components, and evaluates each component's formula against the employee's CTC and other inputs to produce Pay Run Earning Lines and Pay Run Deduction Lines.

### Key Payroll Rules
1. The Salary Structure used in a Payroll Run is the one active on the **last day of the pay period** for each employee (per their Salary Structure Assignment).
2. If an employee's Salary Structure changes mid-period (effective dating), the computation engine must split the month and apply each structure to its respective portion, pro-rating accordingly.
3. A Salary Structure used in any `locked` Payroll Run is permanently immutable. Changes require a new structure version.
4. The component evaluation sequence follows `display_order` — components may reference earlier components in their formula (e.g., HRA = 40% of Basic, which must be computed before HRA).

---

## 3. Salary Component

### Purpose
A Salary Component is an individual line within a Salary Structure — either an earnings item (Basic, HRA, Allowances) or a deduction item (PF Employee, ESIC Employee, TDS, PT).

> **Full definition in** `docs/org-module-entity-definitions.md §15`. This section documents component behavior in Payroll computation.

### Component Types and Calculation Methods

| Calculation Method | Description | Example |
|--------------------|-------------|---------|
| `percentage_of_ctc` | X% of the employee's annual CTC ÷ 12 | Basic = 40% of CTC |
| `percentage_of_basic` | X% of the computed Basic component | HRA = 40% of Basic |
| `fixed_amount` | A fixed monthly amount regardless of CTC | Mobile Allowance = ₹1,500 |
| `formula` | Expression referencing other components or employee attributes | Special Allowance = Gross - Basic - HRA - Allowances |
| `statutory` | System-computed based on government-mandated slabs | PF = 12% of Basic (max ₹1,800), ESIC = 0.75% of Gross |

### Standard India Statutory Components
| Component Code | Type | Rule |
|---------------|------|------|
| `PF_EMP` | Deduction | 12% of PF-eligible salary (max ₹15,000 basic for statutory cap) |
| `PF_EMPLOYER` | Employer contribution (not deducted from employee) | 12% of PF-eligible salary |
| `ESIC_EMP` | Deduction | 0.75% of gross salary (only if gross ≤ ₹21,000/month) |
| `ESIC_EMPLOYER` | Employer contribution | 3.25% of gross salary |
| `PT` | Deduction | State-specific slab (e.g., Maharashtra: ₹200/month if gross > ₹10,000) |
| `TDS` | Deduction | Monthly TDS = annual projected tax ÷ remaining months in tax year |
| `LOP_DEDUCTION` | Deduction | (Monthly Gross / Working Days in Month) × LOP Days |

---

## 4. Employee Salary Structure Assignment

### Purpose
An effective-dated record linking an employee to a specific Salary Structure for a defined time period. It is the bridge between the structural template and the individual employee's pay computation.

> **Full definition in** `docs/employee-domain-entity-definitions.md`. This section documents its Payroll role.

### Payroll Module Role
- The active Salary Structure Assignment on the last day of the pay period determines which structure is used for that employee
- Historical assignments are preserved for retroactive payroll corrections (arrears computation)
- Assignment changes mid-period trigger pro-rated computation if the effective date falls within the pay period

---

## 5. Payroll Run

### Purpose
A Payroll Run is a single execution of the payroll computation cycle for one Pay Group for one defined pay period. It is the container for all employee pay computations in that batch and the authoritative record of what was paid, to whom, when, and why.

### Business Description
Every month (or every pay period for non-monthly groups), HR or Payroll Admin initiates a Payroll Run for each Pay Group. The run progresses through a governed lifecycle: data is gathered, computations are performed, results are reviewed, errors are corrected, the run is approved, employees are paid, and finally the run is locked for accounting and statutory purposes.

A Payroll Run that has been `locked` is the permanent financial record of that pay period. It cannot be modified in any way. Retroactive corrections to a locked run are handled through Payroll Adjustments in the next open run — not by reopening the locked one.

The Payroll Run is also the trigger for statutory compliance: once locked, the Statutory Compliance Records for PF, ESIC, PT, and TDS are generated from its data.

### Relationships
- **One Payroll Run → One Pay Group**
- **One Payroll Run → One Legal Entity** (via Pay Group)
- **One Payroll Run → One Tenant**
- **One Payroll Run → Many Pay Run Lines** (one per employee in the Pay Group)
- **Referenced by** Payslips, Statutory Compliance Records, Leave Encashment Pay Lines, Reimbursement Pay Lines

### Business Rules
1. Exactly one Payroll Run may be in a non-`locked` state per Pay Group at any time. A second run for the same Pay Group cannot be initiated until the current one is `locked`.
2. A Payroll Run covers a specific `period_start` and `period_end`. These dates define which Attendance Days, Leave Requests, Loans, and Adjustments are included.
3. A Payroll Run cannot advance beyond `draft` status unless:
   - All Attendance Days within the period for employees in the Pay Group are `locked`
   - No Reimbursement Claims or Payroll Adjustments for the period are in `pending` status (all are either `approved`, `rejected`, or `paid`)
4. The `employee_count` on the Payroll Run is set at initiation. If employees join or leave the Pay Group mid-computation (before `computed` status), the run must be regenerated.
5. A `locked` Payroll Run is immutable in every field including its Pay Run Lines, Earning Lines, Deduction Lines, and Tax Computations.
6. If a Payroll Run discovers inconsistencies during computation (e.g., an employee has no Salary Structure Assignment, or their LOP days exceed working days), those employees are placed in an `error` state on their Pay Run Line. The run cannot advance to `review` until all errors are resolved.
7. `total_gross_amount`, `total_deduction_amount`, and `total_net_amount` on the Run are the sums of the corresponding amounts across all Pay Run Lines. These are computed and stored for reporting, not derived on the fly.
8. The run must have an approved `disbursement_batch` reference (from the payment system or bank integration) before transitioning to `disbursed`.
9. Payroll Runs may not be deleted. A run initiated in error must be `cancelled` before it reaches `computed` status.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `pay_group_id` | FK to Pay Group |
| `legal_entity_id` | FK to Legal Entity |
| `period_start` | First date of the pay period (inclusive) |
| `period_end` | Last date of the pay period (inclusive) |
| `pay_date` | Scheduled date on which employee accounts will be credited |
| `status` | Current lifecycle status |
| `employee_count` | Number of employees included in this run |
| `initiated_by` | FK to User — who initiated the run |
| `initiated_at` | Timestamp of initiation |

### Optional Fields
| Field | Description |
|-------|-------------|
| `total_gross_amount` | Sum of gross earnings across all Pay Run Lines (computed, stored) |
| `total_deduction_amount` | Sum of all deductions across all Pay Run Lines |
| `total_net_amount` | Sum of net pay across all Pay Run Lines |
| `total_employer_pf` | Total PF employer contribution for this run (for statutory filing) |
| `total_employer_esic` | Total ESIC employer contribution for this run |
| `computed_at` | Timestamp when computation completed |
| `approved_by` | FK to User — who approved the run |
| `approved_at` | Timestamp of approval |
| `disbursed_at` | Timestamp when bank transfer was initiated |
| `locked_at` | Timestamp of final lock |
| `locked_by` | FK to User — who locked the run |
| `disbursement_batch_reference` | Reference ID from the bank/payment system |
| `run_notes` | Payroll Admin notes on this specific run |
| `cancelled_at` | Timestamp if cancelled |
| `cancellation_reason` | Reason for cancellation |

### Unique Constraints
- `(pay_group_id, period_start, period_end)` — one run per Pay Group per period

### Validation Rules
- `period_end` must be ≥ `period_start`
- `pay_date` must be ≥ `period_end`
- `total_net_amount` must equal `total_gross_amount - total_deduction_amount`
- Status transitions are strictly one-way: `draft → processing → computed → review → approved → disbursed → locked`. Reversals are not permitted except `computed → review` (for corrections).

### Lifecycle
```
draft → processing → computed → review → approved → disbursed → locked
                             ↗ (corrections during review cycle)
                   computed ←→ review (iteration allowed)
cancelled (from draft or processing only)
```
- `draft` — Initiated; pre-computation checks pending
- `processing` — Computation engine is running
- `computed` — All Pay Run Lines computed; ready for HR review
- `review` — HR/Payroll Admin reviewing; corrections can be applied, triggering recompute
- `approved` — Final payroll amounts signed off; ready for disbursement
- `disbursed` — Bank transfer initiated; employees notified
- `locked` — Permanent record; payslips published; statutory records generated

### Audit Requirements
- Every status transition logged with acting user and timestamp
- Recompute events during `review` logged with the reason for recompute
- `approved_by` captured: the person who approved the run takes formal accountability
- `total_net_amount` changes between successive computation cycles logged
- Lock event is a critical financial event — logged at the highest audit priority

---

## 6. Pay Run Line

### Purpose
A Pay Run Line is the per-employee summary record within a Payroll Run, capturing an employee's computed gross earnings, total deductions, net pay, LOP days, and worked days for the pay period. It is the employee's payroll ledger entry for that run.

### Business Description
For every employee included in a Payroll Run, one Pay Run Line is created. This is the rollup record: it does not store the component breakdown (those are Pay Run Earning Lines and Pay Run Deduction Lines), but it stores the aggregated totals and key metadata — how many days the employee worked, how many LOP days are being deducted, what their gross was before deductions, and what the net pay landing in their bank account will be.

The Pay Run Line is what appears on the payroll summary report. HR sees one row per employee, with gross, deductions, net, and LOP days. Drilling into a Pay Run Line shows the component-level breakdowns.

### Relationships
- **One Pay Run Line → One Payroll Run**
- **One Pay Run Line → One Employee Profile**
- **One Pay Run Line → One Tenant**
- **One Pay Run Line → Many Pay Run Earning Lines** (the earnings breakdown)
- **One Pay Run Line → Many Pay Run Deduction Lines** (the deductions breakdown)
- **One Pay Run Line → One Pay Run Tax Computation** (TDS detail)
- **One Pay Run Line → One Payslip** (generated after run approval)
- **One Pay Run Line → One Employee Bank Account** (disbursement target)

### Business Rules
1. Exactly one Pay Run Line per employee per Payroll Run. Duplicate lines for the same employee are a data integrity violation.
2. `gross_earnings` = sum of all Pay Run Earning Lines with `line_type = earnings` for this Pay Run Line.
3. `total_deductions` = sum of all Pay Run Deduction Lines for this Pay Run Line.
4. `net_pay` = `gross_earnings - total_deductions`. The system enforces this as an invariant at compute time and again at lock time.
5. `net_pay` must be ≥ 0. A scenario where deductions exceed earnings is a configuration error that must be surfaced as a `status = error` on the Pay Run Line.
6. `lop_days` is sourced from the count of locked Attendance Days with `attendance_status = absent` that have no corresponding approved Leave Request — i.e., uninstructed absences not covered by any leave.
7. `working_days_in_period` is the total number of working days (not weekends or holidays) in the pay period for the employee's Location.
8. `days_worked` = `working_days_in_period - lop_days - approved_unpaid_leave_days`.
9. A Pay Run Line in `error` status must be manually resolved by HR before the Payroll Run can advance from `computed` to `review`.
10. Once the parent Payroll Run is `locked`, the Pay Run Line and all its child lines are permanently immutable.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `payroll_run_id` | FK to Payroll Run |
| `employee_id` | FK to Employee Profile |
| `pay_period_start` | First date of the pay period (redundant from run, stored for direct query performance) |
| `pay_period_end` | Last date of the pay period |
| `working_days_in_period` | Total working days in the period for this employee |
| `days_worked` | Actual days the employee worked (or was on paid leave) |
| `lop_days` | Number of Loss of Pay days applied |
| `gross_earnings` | Sum of all earning lines |
| `total_deductions` | Sum of all deduction lines |
| `net_pay` | `gross_earnings - total_deductions` |
| `status` | `pending`, `computed`, `error`, `locked` |

### Optional Fields
| Field | Description |
|-------|-------------|
| `bank_account_id` | FK to Employee Bank Account — where this net pay will be credited |
| `approved_leave_days` | Total approved paid leave days in the period |
| `approved_unpaid_leave_days` | Approved leave with no pay (e.g., LOP leave type) |
| `overtime_days` | Number of approved overtime days/sessions in the period |
| `arrear_amount` | Total arrear amount included in this line's earnings (from Payroll Adjustments) |
| `error_message` | Description of computation error if `status = error` |
| `computation_log` | JSON blob of the computation trace for debugging (internal use) |

### Unique Constraints
- `(payroll_run_id, employee_id)` — one line per employee per run

### Validation Rules
- `net_pay` must equal `gross_earnings - total_deductions` exactly (no rounding tolerance)
- `days_worked` must be ≥ 0 and ≤ `working_days_in_period`
- `lop_days` must be ≥ 0 and ≤ `working_days_in_period`
- `lop_days + days_worked` must not exceed `working_days_in_period`
- `net_pay` must be ≥ 0

### Lifecycle
```
pending → computed → locked
        → error (auto, during computation)
error → computed (after HR resolution)
```

### Audit Requirements
- Every status transition logged
- Changes to `gross_earnings`, `total_deductions`, or `net_pay` between computation cycles logged with the delta and cause
- `error` to `computed` transitions logged with the HR resolution action
- Lock event is a critical financial record — part of the parent Payroll Run's lock audit

---

## 7. Pay Run Earning Line

### Purpose
A Pay Run Earning Line is a single earnings component row within an employee's Pay Run Line, capturing the computed value of one Salary Component (or one-time earning) for that pay period.

### Business Description
The Pay Run Earning Line is the granular detail beneath the Pay Run Line summary. Where the Pay Run Line says "gross earnings = ₹75,000", the Pay Run Earning Lines explain how that ₹75,000 was built:
- Basic Salary: ₹40,000
- House Rent Allowance: ₹16,000
- Special Allowance: ₹14,000
- Overtime Pay (Session on Aug 3rd): ₹3,000
- Leave Encashment (5 days): ₹2,000

Each of these is one Pay Run Earning Line. The sum of all Earning Lines = `gross_earnings` on the Pay Run Line.

### Relationships
- **One Pay Run Earning Line → One Pay Run Line**
- **One Pay Run Earning Line → One Employee Profile** (via Pay Run Line)
- **One Pay Run Earning Line → One Tenant**
- **One Pay Run Earning Line → One Salary Component** (for standard structure components)
- **One Pay Run Earning Line → Zero or One Overtime Record** (if sourced from overtime)
- **One Pay Run Earning Line → Zero or One Leave Encashment** (if sourced from encashment)
- **One Pay Run Earning Line → Zero or One Reimbursement Claim** (if sourced from reimbursement)
- **One Pay Run Earning Line → Zero or One Payroll Adjustment** (if sourced from adjustment)

### Business Rules
1. Every Earning Line must be traceable to a source: a Salary Component, an Overtime Record, a Leave Encashment, a Reimbursement Claim, or a Payroll Adjustment. Lines without a traceable source are a data integrity violation.
2. LOP deduction: when `lop_days > 0`, the Basic Salary earning line is computed as `(basic_monthly_amount / working_days_in_period) × days_worked`. The unadjusted monthly amount is also stored as `base_amount` for transparency.
3. `is_pro_rated` is `true` for components adjusted for partial month (joining mid-month, LOP deduction, or structure change mid-month).
4. `is_taxable` is copied from the Salary Component definition. Changing the taxability of a component after employees are enrolled requires HR review.
5. One-time earning lines (overtime, encashment, reimbursement, adjustment) have `earning_line_type = one_time`. Recurring lines have `earning_line_type = recurring`.
6. Pay Run Earning Lines are immutable once the parent Payroll Run is `locked`.
7. The `component_code` is denormalized from the Salary Component for reporting queries — it is set at computation time and does not change if the source component is later renamed.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `pay_run_line_id` | FK to Pay Run Line |
| `employee_id` | FK to Employee Profile |
| `earning_name` | Display name of this earning (e.g., "Basic Salary", "HRA") |
| `component_code` | Code denormalized from source Salary Component (e.g., `BASIC`, `HRA`) |
| `earning_line_type` | `recurring` or `one_time` |
| `amount` | Computed amount for this component in this pay period |
| `is_taxable` | Boolean — whether this earning is part of taxable income |

### Optional Fields
| Field | Description |
|-------|-------------|
| `salary_component_id` | FK to Salary Component (for recurring structure components) |
| `base_amount` | Unadjusted monthly amount before pro-ration (if `is_pro_rated = true`) |
| `pro_rate_factor` | Fraction applied for pro-ration (e.g., 0.75 for 15/20 working days) |
| `is_pro_rated` | Boolean — whether this earning was pro-rated |
| `overtime_record_id` | FK to Overtime Record (if this line originated from overtime) |
| `leave_encashment_id` | FK to Leave Encashment (if this line originated from encashment) |
| `reimbursement_claim_id` | FK to Reimbursement Claim (if this line originated from a claim) |
| `payroll_adjustment_id` | FK to Payroll Adjustment (if this line originated from an adjustment) |
| `calculation_note` | Human-readable note on how the amount was computed |
| `display_order` | Integer for payslip display sequence |
| `is_visible_on_payslip` | Boolean — show this line on the employee payslip |

### Unique Constraints
- `(pay_run_line_id, component_code)` — one line per component code per employee per run (for recurring components). One-time lines may repeat the same component_code if multiple one-time events of the same type exist.

### Validation Rules
- `amount` must be ≥ 0 (earnings are non-negative)
- `pro_rate_factor` must be between 0.0 and 1.0 if set
- Exactly one source FK must be set for `one_time` earning lines (`overtime_record_id` OR `leave_encashment_id` OR `reimbursement_claim_id` OR `payroll_adjustment_id`)

### Lifecycle
Earning Lines are immutable once the parent Payroll Run is `locked`. No lifecycle state of their own.

### Audit Requirements
- Earning Lines are part of the parent Pay Run Line audit log; immutability after lock is the primary control
- One-time earning lines logged with their source event reference

---

## 8. Pay Run Deduction Line

### Purpose
A Pay Run Deduction Line is a single deduction component row within an employee's Pay Run Line, capturing the computed value of one deduction (PF, ESIC, PT, TDS, LOP, Loan EMI) for that pay period.

### Business Description
Mirror of Pay Run Earning Lines, but for the deductions side. The Pay Run Deduction Lines answer: "Of the ₹75,000 gross, what was deducted, and why?"
- PF Employee: ₹1,800
- ESIC Employee: ₹563
- Professional Tax: ₹200
- TDS: ₹8,500
- Loan EMI (Home Loan — Month 4): ₹5,000

Each of these is one Pay Run Deduction Line. The sum of all Deduction Lines = `total_deductions` on the Pay Run Line.

### Relationships
- **One Pay Run Deduction Line → One Pay Run Line**
- **One Pay Run Deduction Line → One Tenant**
- **One Pay Run Deduction Line → One Salary Component** (for standard structure deductions)
- **One Pay Run Deduction Line → Zero or One Loan Repayment Schedule entry** (if EMI deduction)
- **One Pay Run Deduction Line → Zero or One Payroll Adjustment** (if ad-hoc deduction)

### Business Rules
1. Every Deduction Line must be traceable to a source: a Salary Component, a Loan EMI Schedule entry, a Payroll Adjustment, or a system-computed statutory deduction.
2. `deduction_type` classifies the line:
   - `statutory_pf` — PF employee contribution
   - `statutory_esic` — ESIC employee contribution
   - `statutory_pt` — Professional Tax
   - `statutory_tds` — Income Tax TDS
   - `loan_emi` — Loan EMI repayment
   - `salary_advance_recovery` — Recovery of prior advance
   - `adjustment` — Payroll Adjustment deduction
   - `other` — Miscellaneous
3. Statutory deductions (`statutory_*` types) are system-computed and cannot be manually overridden without a Payroll Adjustment record documenting the reason.
4. A Deduction Line for `statutory_tds` must always have a corresponding Pay Run Tax Computation record for the same Pay Run Line. They are created atomically.
5. `employer_contribution_amount` is stored on PF and ESIC deduction lines for reference — it is not deducted from the employee but is included in statutory filing records.
6. `deduction_applicable` is set to `false` for employees below the statutory threshold (e.g., ESIC is not applicable if gross > ₹21,000/month). In this case, the line is created with `amount = 0` and `deduction_applicable = false` for audit transparency.
7. Pay Run Deduction Lines are immutable once the parent Payroll Run is `locked`.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `pay_run_line_id` | FK to Pay Run Line |
| `employee_id` | FK to Employee Profile |
| `deduction_name` | Display name (e.g., "Provident Fund", "Professional Tax", "TDS") |
| `component_code` | Code denormalized from source (e.g., `PF_EMP`, `PT`, `TDS`) |
| `deduction_type` | Classification of the deduction |
| `amount` | Amount deducted from employee's gross for this component |
| `deduction_applicable` | Boolean — whether this deduction actually applies to this employee |

### Optional Fields
| Field | Description |
|-------|-------------|
| `salary_component_id` | FK to Salary Component (for structure-defined deductions) |
| `employer_contribution_amount` | Employer-side contribution (PF employer, ESIC employer) — for statutory filing |
| `loan_repayment_schedule_id` | FK to Loan Repayment Schedule entry — for EMI deductions |
| `payroll_adjustment_id` | FK to Payroll Adjustment — for adjustment-sourced deductions |
| `statutory_basis_amount` | The salary basis used to compute this deduction (e.g., PF-eligible salary for PF computation) |
| `statutory_rate_percent` | Rate applied to compute the deduction (e.g., 12% for PF) |
| `display_order` | Integer for payslip display sequence |
| `is_visible_on_payslip` | Boolean — whether to show this deduction on the payslip |

### Unique Constraints
- `(pay_run_line_id, component_code, deduction_type)` — at most one line per deduction type per employee per run (for statutory deductions). Loan EMIs and adjustments may have multiple lines.

### Validation Rules
- `amount` must be ≥ 0
- `employer_contribution_amount` must be ≥ 0 if set
- `statutory_rate_percent` must be between 0 and 100 if set
- `loan_repayment_schedule_id` must be set if `deduction_type = loan_emi`

### Lifecycle
Immutable once the parent Payroll Run is `locked`.

### Audit Requirements
- Statutory deduction overrides (changing the system-computed TDS or PF) must be explicitly justified via a Payroll Adjustment and logged as high-priority events
- Loan EMI deduction lines linked to their Loan Repayment Schedule entry (creates a traceable connection between the deduction and the loan contract)

---

## 9. Pay Run Tax Computation

### Purpose
A Pay Run Tax Computation is the detailed income tax (TDS) calculation record for one employee in one pay period, documenting the projected annual income, declared exemptions, deductions, net taxable income, the annual tax liability, and the monthly TDS deduction amount computed for that month.

### Business Description
Computing TDS correctly is one of the most complex parts of Indian payroll. It is not simply "X% of salary." The computation involves:

1. **Project the full year's income** from the current month — estimate what the employee will earn for the full tax year (April to March) based on actual paid months plus projected remaining months
2. **Apply exemptions** — HRA exemption, LTA, Standard Deduction (₹50,000), etc.
3. **Apply deductions** from the employee's Tax Declaration — Chapter VI-A (Section 80C, 80D, 80CCD, etc.)
4. **Compute net taxable income** = Gross taxable - Exemptions - Deductions
5. **Apply tax slabs** (old vs. new regime) to compute annual tax liability
6. **Compute monthly TDS** = (Annual Tax Liability - Tax already deducted YTD) ÷ Remaining months in tax year

This computation is reperformed every month because:
- The employee may have updated their Tax Declaration
- Their salary may have changed (increment, structure change)
- LOP in a month changes projected annual income
- Newly added or removed investment proofs change the deduction amount

A Pay Run Tax Computation record captures a snapshot of this computation for the pay period — it is a complete, reproducible audit record.

### Relationships
- **One Pay Run Tax Computation → One Pay Run Line** (exactly one per employee per run)
- **One Pay Run Tax Computation → One Tenant**
- **One Pay Run Tax Computation → Zero or One Tax Declaration** (the active declaration driving this computation)

### Business Rules
1. Exactly one Pay Run Tax Computation per Pay Run Line.
2. The Tax Computation is always computed under a declared tax **regime**: `old_regime` or `new_regime` (India-specific). The employee declares their preferred regime in their Tax Declaration. If no declaration exists, the system defaults to the regime producing the lower tax.
3. `projected_annual_income` = (YTD earnings so far this tax year) + (this month's gross × remaining months in tax year). This is recomputed every month.
4. `total_exemptions` includes HRA exemption (computed from declared rent, HRA component, and city type), LTA, and any other exempt components.
5. `chapter_via_deductions` is sourced from the active Tax Declaration's declared investments (80C, 80D, NPS, etc.) and capped at the statutory limits (80C max ₹1,50,000; NPS additional ₹50,000; etc.).
6. `tds_already_deducted_ytd` is the sum of TDS deducted across all prior Pay Run Lines in the same tax year for this employee.
7. `monthly_tds_amount` = max(0, (`annual_tax_liability - tds_already_deducted_ytd`) ÷ `remaining_months_in_tax_year`). This ensures the remaining annual liability is spread evenly over remaining months, preventing end-of-year TDS spikes.
8. The Tax Computation record must be immutable once the parent Payroll Run is `locked`. It is the evidence for Form 16 and Form 26AS reconciliation.
9. If `monthly_tds_amount < 0` (over-deducted in prior months due to salary reduction), TDS for that month is ₹0 and the over-deduction is absorbed by setting future months to ₹0. TDS refund to the employee happens via income tax filing — not via payroll.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `pay_run_line_id` | FK to Pay Run Line |
| `employee_id` | FK to Employee Profile |
| `tax_year` | Tax year (e.g., 2025 for FY 2025–26) |
| `tax_regime` | `old_regime` or `new_regime` |
| `projected_annual_gross` | Estimated annual gross income for the full tax year |
| `total_exemptions` | Total applicable exemptions (HRA, LTA, standard deduction) |
| `chapter_via_deductions` | Total eligible Chapter VI-A deductions (80C, 80D, etc.) |
| `net_taxable_income` | `projected_annual_gross - total_exemptions - chapter_via_deductions` |
| `annual_tax_liability` | Tax computed on `net_taxable_income` using applicable slabs |
| `surcharge_amount` | Surcharge (if applicable, for high incomes) |
| `education_cess_amount` | 4% cess on tax + surcharge |
| `total_annual_tax` | `annual_tax_liability + surcharge_amount + education_cess_amount` |
| `tds_already_deducted_ytd` | TDS deducted in prior months this tax year |
| `remaining_months_in_tax_year` | Months remaining (including this month) to distribute tax |
| `monthly_tds_amount` | TDS to deduct this month |

### Optional Fields
| Field | Description |
|-------|-------------|
| `tax_declaration_id` | FK to Tax Declaration used for this computation |
| `hra_exemption_amount` | HRA exemption applied (computed per IT rules — min of 3 conditions) |
| `lta_exemption_amount` | LTA exemption applied |
| `nps_employer_deduction` | NPS employer contribution deduction (Section 80CCD(2)) |
| `rebate_87a_amount` | Tax rebate under Section 87A (if taxable income ≤ ₹7,00,000 under new regime) |
| `computation_notes` | Free-text notes on unusual computation aspects |

### Unique Constraints
- `(pay_run_line_id)` — one Tax Computation per Pay Run Line (one per employee per run)

### Validation Rules
- `net_taxable_income` must equal `projected_annual_gross - total_exemptions - chapter_via_deductions`
- `total_annual_tax` must equal `annual_tax_liability + surcharge_amount + education_cess_amount`
- `monthly_tds_amount` must be ≥ 0
- `tax_regime` must be `old_regime` or `new_regime`
- `remaining_months_in_tax_year` must be between 1 and 12

### Lifecycle
Immutable once the parent Payroll Run is `locked`. Serves as the basis for Form 16 generation.

### Audit Requirements
- Tax Computation records are permanent financial evidence. They must never be modified or deleted after the run is locked.
- Computation traces (which declaration was used, which slab was applied) must be reproducible from this record alone without relying on current state of the Tax Declaration

---

## 10. Payslip

### Purpose
A Payslip is the employee-facing pay statement generated from a locked or approved Payroll Run, presenting the month's earnings, deductions, and net pay in a readable, downloadable format.

### Business Description
The Payslip is what the employee sees. It is a structured, rendered document — typically a PDF — that shows all earnings, all deductions, year-to-date totals, bank account details, and the net pay credited to their account. It is also a legal document: employees present payslips for loan applications, rental agreements, and tax filings.

A Payslip is generated from the Pay Run Line + Pay Run Earning Lines + Pay Run Deduction Lines data. It is a denormalized snapshot — once generated, it must reflect exactly what was paid, even if master data changes later (e.g., employee name is corrected — the old payslip still shows the name as it was at pay time).

Payslips are generated after the Payroll Run reaches `approved` status and published once the run is `disbursed`.

### Relationships
- **One Payslip → One Pay Run Line**
- **One Payslip → One Employee Profile**
- **One Payslip → One Payroll Run**
- **One Payslip → One Tenant**
- **Referenced by** Employee (accessible in self-service), HR (accessible in records)

### Business Rules
1. One Payslip per employee per Payroll Run. Payslips are generated in batch for all Pay Run Lines in a run when the run reaches `approved` status.
2. A Payslip is a **snapshot at generation time**. The fields on it (employee name, designation, department, bank account) are captured at generation time and stored directly on the Payslip — they do not derive from current master data. This ensures historical accuracy.
3. Payslips must not be visible to employees until the run is `disbursed` and the Payslip is `published`. HR can view generated payslips in `generated` status for pre-disbursement review.
4. A Payslip must never be deleted. If a Payroll Run is cancelled (before locking), associated Payslips are moved to `cancelled` status and retained.
5. Payslips must include a YTD (year-to-date) section showing cumulative earnings, deductions, and TDS for the tax year to date.
6. The PDF generation engine must render the Payslip using the tenant's logo and brand colors from the Organization record at generation time.
7. Employees must be able to download their own payslips. Managers and HR have access to their team's payslips per their permission scope.
8. `acknowledged_at` is set when the employee opens/downloads the payslip. This is a digital acknowledgement record.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `pay_run_line_id` | FK to Pay Run Line |
| `payroll_run_id` | FK to Payroll Run |
| `employee_id` | FK to Employee Profile |
| `pay_period_start` | First date of the pay period |
| `pay_period_end` | Last date of the pay period |
| `pay_date` | Date on which salary was credited |
| `employee_name` | Snapshot of employee's name at generation time |
| `employee_code` | Snapshot of employee code |
| `designation_name` | Snapshot of designation at generation time |
| `department_name` | Snapshot of department at generation time |
| `legal_entity_name` | Snapshot of Legal Entity name |
| `gross_earnings` | Total gross for the period (denormalized from Pay Run Line) |
| `total_deductions` | Total deductions (denormalized) |
| `net_pay` | Net pay credited (denormalized) |
| `status` | `generated`, `published`, `acknowledged`, `cancelled` |
| `generated_at` | Timestamp of payslip generation |

### Optional Fields
| Field | Description |
|-------|-------------|
| `bank_account_number_masked` | Last 4 digits of bank account for payslip display (e.g., `XXXXXX1234`) |
| `bank_name` | Bank name for display on payslip |
| `ytd_gross` | Year-to-date gross earnings (current tax year) |
| `ytd_tds` | Year-to-date TDS deducted |
| `ytd_pf` | Year-to-date PF employee contribution |
| `pdf_document_id` | FK to Document File — the generated PDF file reference |
| `published_at` | Timestamp when made visible to employee |
| `acknowledged_at` | Timestamp when employee first opened/downloaded |
| `pan_number_masked` | Employee's PAN (last 4 visible) for display |

### Unique Constraints
- `(payroll_run_id, employee_id)` — one payslip per employee per run

### Validation Rules
- `net_pay` must equal `gross_earnings - total_deductions`
- `pay_date` must be ≥ `pay_period_end`
- `status` transitions: `generated → published → acknowledged`; `any → cancelled`

### Lifecycle
```
generated → published → acknowledged
any → cancelled (if Payroll Run is cancelled before lock)
```

### Audit Requirements
- Payslip generation events logged (batch run, timestamp, count)
- `published_at` and `acknowledged_at` logged
- Any access to another employee's payslip by a non-HR user logged as a data access event
- Payslips are subject to data retention law — must never be permanently deleted; only `cancelled` status is permitted

---

## 11. Employee Loan

### Purpose
An Employee Loan is a formal loan extended by the employer to an employee, repaid through monthly EMI deductions from the employee's salary over a defined tenure.

### Business Description
Many organizations offer employee financial benefit programs — interest-free or low-interest salary advances or emergency loans. When an employee requests a loan and it is approved, the employer extends a lump sum and recoups it via systematic monthly salary deductions.

The Employee Loan record is the master record for this facility:
- It captures the principal amount, interest rate, tenure, and monthly EMI
- It generates a Loan Repayment Schedule (the month-by-month amortization plan)
- Each month's EMI is executed as a Pay Run Deduction Line

Loans carry a separate lifecycle from payroll — they span multiple pay periods and must remain active until fully repaid.

### Relationships
- **One Employee Loan → One Employee Profile**
- **One Employee Loan → One Tenant**
- **One Employee Loan → One Approval Workflow Instance** (Approvals module)
- **One Employee Loan → Many Loan Repayment Schedule entries** (one per EMI installment)
- **Loan EMI deductions → Pay Run Deduction Lines** (via Loan Repayment Schedule)

### Business Rules
1. An Employee Loan must be approved before it is disbursed. The approval workflow is typically HR Admin + Finance.
2. `loan_type` classifies the loan: `salary_advance` (no interest, recovered in 1–3 months), `employee_loan` (low/zero interest, longer tenure), `emergency_loan`, `festival_advance`.
3. `interest_rate_percent` is 0 for most employer loans (tax-free benefit). If interest > 0, the interest component is a taxable perquisite per Income Tax rules.
4. `emi_amount` = `(principal + total_interest) / tenure_months`. EMI is fixed; the repayment schedule is a flat amortization.
5. The Loan Repayment Schedule is generated automatically upon loan disbursement — one row per month, from the first deduction month to the final month.
6. The EMI is deducted in the employee's next Pay Run that falls after `disbursement_date`.
7. If an employee's salary in a month is insufficient to cover the EMI, the deduction is reduced to the available net salary and the shortfall is added to the next month's deduction (not carried as separate record — rather, the schedule entry for the shortage month is updated).
8. On employee exit, the outstanding loan balance (`principal_amount - total_repaid_amount`) is deducted from the Full & Final Settlement. If FNF is insufficient, the loan becomes an outstanding receivable.
9. A loan may be **foreclosed** by the employee (paying the remaining balance in one payment outside of payroll) or by HR (FNF recovery). Foreclosure sets `status = foreclosed` and marks all remaining schedule entries as `foreclosed`.
10. A single employee may have at most `max_concurrent_loans` loans active simultaneously (configurable per tenant, default: 2).

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `loan_type` | `salary_advance`, `employee_loan`, `emergency_loan`, `festival_advance` |
| `principal_amount` | Total amount disbursed to the employee |
| `interest_rate_percent` | Annual interest rate (0 for interest-free loans) |
| `tenure_months` | Total number of monthly installments |
| `emi_amount` | Fixed monthly deduction amount |
| `disbursement_date` | Date on which the loan amount was transferred to the employee |
| `first_deduction_month` | Pay period in which the first EMI will be deducted |
| `status` | `pending`, `approved`, `active`, `completed`, `foreclosed`, `rejected` |

### Optional Fields
| Field | Description |
|-------|-------------|
| `loan_reference_number` | HR-assigned loan reference (e.g., `LOAN-2025-0042`) |
| `purpose` | Employee's stated reason for the loan |
| `total_interest_amount` | Total interest computed over the tenure (0 for interest-free) |
| `total_repayable_amount` | `principal_amount + total_interest_amount` |
| `total_repaid_amount` | Running total of EMIs deducted to date |
| `outstanding_balance` | `total_repayable_amount - total_repaid_amount` |
| `approval_workflow_instance_id` | FK to Approval Workflow Instance |
| `approved_by` | FK to User — who approved |
| `approved_at` | Timestamp of approval |
| `exit_recovery_amount` | Amount recovered from FNF on employee exit |
| `foreclosure_date` | Date of foreclosure (if `status = foreclosed`) |
| `foreclosure_amount` | Amount paid at foreclosure |
| `supporting_document_id` | FK to Employee Document — loan application or agreement |

### Unique Constraints
None — multiple loans per employee are permitted up to the concurrent limit.

### Validation Rules
- `principal_amount` must be > 0
- `tenure_months` must be a positive integer
- `emi_amount` must be > 0
- `interest_rate_percent` must be ≥ 0 and ≤ 100
- `emi_amount × tenure_months` must equal `total_repayable_amount` (within rounding tolerance of ₹1)
- `disbursement_date` must not be in the future
- `first_deduction_month` must be ≥ `disbursement_date`

### Lifecycle
```
pending → approved → active → completed
                            → foreclosed
        → rejected
```
- `pending` — Awaiting approval
- `approved` — Approved but not yet disbursed
- `active` — Disbursed; EMI deductions in progress
- `completed` — All EMIs successfully recovered
- `foreclosed` — Closed before tenure (via FNF or voluntary prepayment)
- `rejected` — Denied by approver

### Audit Requirements
- Loan approval and disbursement events logged
- Each EMI deduction linked to its Pay Run Deduction Line (traceable chain: Loan → Schedule → Deduction Line → Pay Run)
- Foreclosure events logged with the reason and recovery source

---

## 12. Loan Repayment Schedule

### Purpose
A Loan Repayment Schedule entry represents one monthly installment in an Employee Loan's amortization plan — capturing the scheduled EMI amount, which pay period it should be deducted in, and whether it has been collected.

### Business Description
When a loan is disbursed, the Loan Repayment Schedule is auto-generated: one record per month of the tenure. Each record is a commitment — in pay period X, deduct EMI amount Y from this employee's salary.

At Pay Run time, the computation engine queries all active Loan Repayment Schedule entries falling within the current pay period, and creates a Pay Run Deduction Line for each.

### Relationships
- **One Loan Repayment Schedule → One Employee Loan**
- **One Loan Repayment Schedule → One Employee Profile**
- **One Loan Repayment Schedule → One Tenant**
- **One Loan Repayment Schedule → Zero or One Pay Run Deduction Line** (set once the EMI is deducted)

### Business Rules
1. Schedule entries are generated automatically at loan disbursement. They must not be manually created or edited without a corresponding Loan Amendment record.
2. `installment_number` runs from 1 to `loan.tenure_months`.
3. `scheduled_deduction_month` is the pay period start date (first day of the month) for which this EMI is scheduled.
4. `status` transitions: `pending → deducted` (on successful Pay Run deduction) or `pending → skipped` (if the employee had insufficient pay and the EMI was not collected) or `pending → foreclosed` (if loan is foreclosed before this installment).
5. A `skipped` installment's shortfall is added to the next period's scheduled EMI — the next entry's `scheduled_amount` is updated to include the skipped amount.
6. All remaining `pending` entries are moved to `foreclosed` when the parent loan is foreclosed.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_loan_id` | FK to Employee Loan |
| `employee_id` | FK to Employee Profile |
| `installment_number` | Sequential number (1 to tenure_months) |
| `scheduled_deduction_month` | Pay period (first day of the month) for this EMI |
| `scheduled_amount` | EMI amount for this installment |
| `status` | `pending`, `deducted`, `skipped`, `foreclosed` |

### Optional Fields
| Field | Description |
|-------|-------------|
| `actual_deducted_amount` | Actual amount deducted (may differ from `scheduled_amount` on partial collection) |
| `deducted_in_pay_run_id` | FK to Payroll Run in which this installment was deducted |
| `pay_run_deduction_line_id` | FK to Pay Run Deduction Line — the deduction record |
| `principal_component` | Principal portion of this installment (for interest-bearing loans) |
| `interest_component` | Interest portion of this installment |
| `outstanding_after_installment` | Remaining loan balance after this installment |
| `skipped_reason` | Reason for skip (e.g., "Insufficient net pay") |

### Unique Constraints
- `(employee_loan_id, installment_number)` — one schedule entry per installment number per loan

### Validation Rules
- `installment_number` must be a positive integer ≤ `loan.tenure_months`
- `scheduled_amount` must be > 0
- `actual_deducted_amount`, if set, must be ≥ 0 and ≤ `scheduled_amount`

### Lifecycle
```
pending → deducted
        → skipped
        → foreclosed
```

### Audit Requirements
- `deducted` events logged with the Pay Run Deduction Line reference
- `skipped` events logged with reason and the updated future installment amount
- Foreclosure events logged

---

## 13. Reimbursement Claim

### Purpose
A Reimbursement Claim is an employee's request for reimbursement of out-of-pocket expenses incurred in the course of performing their work — travel, medical, fuel, communication, or other categories — to be paid through the payroll system.

### Business Description
Employees routinely incur business expenses using personal funds: taxi for a client visit, medical expenses under a health benefit policy, phone bill for business calls, fuel for field sales work. The Reimbursement Claim is the formal request to be repaid.

A Claim has a header (the overall request) and individual Claim Lines (each expense item). After approval, the total approved amount is queued for payment in the next Payroll Run as a non-taxable earnings component.

### Relationships
- **One Reimbursement Claim → One Employee Profile**
- **One Reimbursement Claim → One Tenant**
- **One Reimbursement Claim → One Approval Workflow Instance**
- **One Reimbursement Claim → Many Reimbursement Claim Lines** (individual expense items)
- **Approved amount → Pay Run Earning Line** (the reimbursement earning component)

### Business Rules
1. A Reimbursement Claim is submitted for a specific expense period (typically monthly).
2. `claim_type` determines the benefit policy applied (maximum claimable amount, eligible expense categories, taxability). Types include: `medical`, `travel`, `fuel`, `communication`, `food`, `equipment`, `other`.
3. The `max_claimable_amount` per `claim_type` per month is configured in tenant settings. Claims exceeding the limit are either capped at the limit or rejected — depending on the `over_limit_policy` configuration.
4. Reimbursements for `medical` expenses under the HRA / Medical exemption limit (₹15,000 per year in old regime) are non-taxable. Above the exemption limit, the excess becomes a taxable perquisite.
5. The tax classification of the reimbursement is computed during payroll and reflected as the `is_taxable` flag on the Pay Run Earning Line.
6. Claims must be submitted within `claim_submission_window_days` of the expense date (configurable per tenant, default: 60 days). Older claims require HR override.
7. An approved Reimbursement Claim is queued for payment in the next available Payroll Run for the employee's Pay Group. It must not be held pending for more than one pay cycle without a documented reason.
8. A claim that has been included in a `locked` Payroll Run cannot be cancelled.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `claim_type` | Expense category |
| `claim_period_start` | First date of the expense period |
| `claim_period_end` | Last date of the expense period |
| `claimed_amount` | Total amount claimed by the employee (sum of Claim Lines) |
| `status` | `draft`, `pending`, `approved`, `rejected`, `paid`, `cancelled` |
| `submitted_at` | Timestamp of submission |

### Optional Fields
| Field | Description |
|-------|-------------|
| `approved_amount` | Amount approved by the approver (may be less than `claimed_amount`) |
| `approval_workflow_instance_id` | FK to Approval Workflow Instance |
| `approved_by` | FK to User |
| `approved_at` | Timestamp |
| `pay_run_earning_line_id` | FK to Pay Run Earning Line — set when payment is processed |
| `paid_in_payroll_run_id` | FK to Payroll Run in which this was paid |
| `rejection_reason` | Reason for rejection |
| `employee_notes` | Employee notes on the overall claim |

### Unique Constraints
None — employees may submit multiple claims per period.

### Validation Rules
- `claim_period_end` must be ≥ `claim_period_start`
- `claimed_amount` must be > 0
- `approved_amount`, if set, must be > 0 and ≤ `claimed_amount`
- `claimed_amount` must equal the sum of all Claim Lines' `claimed_amount`

### Lifecycle
```
draft → pending → approved → paid
               → rejected
approved → cancelled (before Pay Run is locked)
```

### Audit Requirements
- Submission, approval, rejection, and payment events logged
- Over-limit claim approvals logged as exceptions with approver justification
- Payment linked to the Pay Run Earning Line

---

## 14. Reimbursement Claim Line

### Purpose
A Reimbursement Claim Line is one individual expense item within a Reimbursement Claim — a single receipt or transaction the employee is seeking reimbursement for.

### Business Description
Each expense is captured as its own line: "On August 3rd, taxi to client office: ₹450." "On August 7th, client dinner: ₹2,200." These are separate Claim Lines within one Claim. Each line references a receipt or supporting document.

### Relationships
- **One Reimbursement Claim Line → One Reimbursement Claim**
- **One Reimbursement Claim Line → One Tenant**
- **One Reimbursement Claim Line → Zero or One Document File** (the receipt)

### Business Rules
1. Each Claim Line must have an `expense_date` within the parent Claim's `claim_period_start` to `claim_period_end`.
2. A supporting receipt document (`receipt_document_id`) is optional but strongly encouraged — some tenants configure it as mandatory for claims above a threshold amount.
3. `approved_amount` on a Claim Line may be less than `claimed_amount` if the approver partially approves the item (e.g., partial approval of an over-limit expense).
4. Claim Lines are immutable once the parent Claim is `paid`.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `reimbursement_claim_id` | FK to Reimbursement Claim |
| `expense_date` | Date the expense was incurred |
| `description` | Brief description of the expense |
| `claimed_amount` | Amount claimed for this line item |

### Optional Fields
| Field | Description |
|-------|-------------|
| `approved_amount` | Approved amount for this line |
| `receipt_document_id` | FK to Document File — the uploaded receipt |
| `vendor_name` | Merchant or service provider name |
| `expense_category_tag` | Sub-category for reporting (e.g., `cab`, `flight`, `hotel`, `meal`) |
| `rejection_note` | Reason if this specific line was rejected or reduced |

### Unique Constraints
None — multiple lines with the same date and category are permitted.

### Validation Rules
- `expense_date` must fall within the parent Claim's `claim_period_start` to `claim_period_end`
- `claimed_amount` must be > 0
- `approved_amount`, if set, must be ≥ 0 and ≤ `claimed_amount`

---

## 15. Tax Declaration

### Purpose
A Tax Declaration is an employee's formal annual declaration of planned or actual tax-saving investments, exemptions, and deductions that reduces their monthly TDS deduction. It is the basis for computing each month's TDS throughout the financial year.

### Business Description
In India, an employee declares their investments at the start of each financial year under Form 12BB. Based on this declaration, the employer computes a reduced TDS deduction each month. At year-end, the employee submits actual proofs (investment certificates, rent receipts, insurance documents). If actuals differ from declarations, TDS is trued up in the final payroll months.

A Tax Declaration covers:
- **HRA Exemption** — declared rent paid, landlord details
- **Section 80C** — ELSS, PPF, LIC, home loan principal, school fees (max ₹1,50,000)
- **Section 80D** — Medical insurance premium (max ₹25,000 self, ₹25,000 parents)
- **Section 80CCD(1B)** — Additional NPS contribution (max ₹50,000)
- **Section 24(b)** — Home loan interest (max ₹2,00,000 for self-occupied)
- **LTA** — Leave Travel Allowance exemption
- **Other Chapter VI-A deductions**

Employees may submit a new declaration at any point in the year. The most recently approved declaration is always the active one for TDS computation.

### Relationships
- **One Tax Declaration → One Employee Profile**
- **One Tax Declaration → One Tenant**
- **One Tax Declaration → Many Investment Proofs** (supporting documents for each declared item)
- **Referenced by** Pay Run Tax Computation (the active declaration drives TDS)

### Business Rules
1. An employee can have at most one `active` Tax Declaration per tax year at any time. Submitting a new declaration supersedes the previous one after approval.
2. A Tax Declaration without Investment Proofs is treated as a **provisional declaration** — TDS is computed based on the declared amounts, but the employee must submit actual proofs by the proof submission deadline (typically December 31 or January 31).
3. If actual proofs submitted are lower than declared amounts, the TDS is recomputed for remaining months with the lower values, and any shortfall from prior months is recovered via increased TDS in the remaining months of the year.
4. `tax_regime` on the Declaration determines whether TDS is computed under the old or new income tax regime. Once submitted and approved, the regime for the year is locked and cannot be changed.
5. All declared amounts must have corresponding Investment Proof documents before the `proof_deadline_date`. Unsubstantiated declarations revert to ₹0 after the deadline.
6. The sum of all declared `section_80c` items must not exceed ₹1,50,000. The system enforces this cap.
7. Tax Declarations are reviewed and approved by HR/Finance. In some tenant configurations, they are auto-approved.
8. A finalized (year-end reconciled) Tax Declaration feeds the Form 16 generation process.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `tax_year` | Financial year (e.g., 2025 for FY2025–26) |
| `tax_regime` | `old_regime` or `new_regime` |
| `status` | `draft`, `submitted`, `approved`, `proof_pending`, `finalized`, `superseded` |
| `submitted_at` | Timestamp of submission |

### Optional Fields
| Field | Description |
|-------|-------------|
| `hra_monthly_rent_amount` | Declared monthly rent paid (for HRA exemption computation) |
| `hra_landlord_name` | Landlord's name |
| `hra_landlord_pan` | Landlord's PAN (mandatory in India if annual rent > ₹1,00,000) |
| `is_metro_city` | Boolean — whether the rental city qualifies as metro (affects HRA % calculation) |
| `section_80c_amount` | Total Section 80C declared investments (max ₹1,50,000) |
| `section_80d_self_amount` | Medical insurance premium for self/family |
| `section_80d_parents_amount` | Medical insurance premium for parents |
| `section_80ccd1b_amount` | Additional NPS contribution (max ₹50,000) |
| `home_loan_principal_amount` | Home loan principal (included in 80C total) |
| `home_loan_interest_amount` | Home loan interest (Section 24b, max ₹2,00,000) |
| `lta_claimed_amount` | LTA exemption claimed |
| `other_chapter_via_amount` | Other eligible Chapter VI-A deductions |
| `proof_deadline_date` | Deadline by which Investment Proofs must be uploaded |
| `approved_by` | FK to User — approver |
| `approved_at` | Timestamp |
| `finalized_at` | Timestamp when year-end reconciliation is done |
| `superseded_by_declaration_id` | FK to Tax Declaration — the newer declaration that replaced this one |

### Unique Constraints
- `(tenant_id, employee_id, tax_year, status)` where `status = active` — at most one active declaration per employee per year

### Validation Rules
- `tax_year` must be the current or upcoming financial year at submission time
- `section_80c_amount` must be ≤ ₹1,50,000 (system enforces statutory cap)
- `section_80d_self_amount` must be ≤ ₹25,000 (₹50,000 for senior citizens)
- `hra_landlord_pan` must be provided if `hra_monthly_rent_amount × 12 > ₹1,00,000`
- `tax_regime` must be `old_regime` or `new_regime`

### Lifecycle
```
draft → submitted → approved → proof_pending → finalized
                             → superseded (when a newer declaration is approved)
```
- `proof_pending` — Approved declaration awaiting year-end proof submission
- `finalized` — Year-end reconciliation complete; feeds Form 16

### Audit Requirements
- Every declaration submission and approval logged
- Regime changes (old vs. new) logged — these significantly affect TDS
- Proof deadline breaches logged with the resulting TDS recalculation
- Supersession events logged (old declaration + new declaration reference)

---

## 16. Investment Proof

### Purpose
An Investment Proof is a supporting document uploaded by an employee to substantiate one declared investment or exemption item within their Tax Declaration — for example, an LIC premium receipt, PPF passbook, or rent receipt.

### Business Description
An employee declares "I have invested ₹50,000 in ELSS mutual funds." The Investment Proof is the actual ELSS statement they upload to prove this claim. HR or Finance reviews and verifies each proof. Only verified proof amounts are accepted for TDS computation.

### Relationships
- **One Investment Proof → One Tax Declaration**
- **One Investment Proof → One Employee Profile**
- **One Investment Proof → One Tenant**
- **One Investment Proof → One Document File** (the uploaded proof document)

### Business Rules
1. Each Investment Proof corresponds to one declared item type (`proof_category`).
2. Multiple proofs can be uploaded for the same category (e.g., three separate LIC policies = three proofs under `section_80c`).
3. `claimed_amount` is what the employee is claiming this proof supports. `approved_amount` is what HR/Finance accepts after reviewing.
4. A proof in `rejected` status does not contribute to the TDS computation. The effective declared amount for TDS purposes = sum of `approved_amount` across all `verified` proofs for each category.
5. Proofs must be uploaded before `tax_declaration.proof_deadline_date`. Late proofs require HR override and are flagged.
6. Once a Payroll Run that references this proof's declaration is `locked`, the proof record is immutable.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `tax_declaration_id` | FK to Tax Declaration |
| `employee_id` | FK to Employee Profile |
| `proof_category` | Declaration category this proof supports: `section_80c`, `section_80d`, `hra`, `home_loan_principal`, `home_loan_interest`, `nps_80ccd`, `lta`, `other` |
| `description` | Brief description (e.g., "LIC Jeevan Anand — Policy #12345") |
| `claimed_amount` | Amount the employee is claiming this proof supports |
| `document_file_id` | FK to Document File — the uploaded proof |
| `status` | `pending`, `verified`, `rejected` |

### Optional Fields
| Field | Description |
|-------|-------------|
| `approved_amount` | Amount accepted by HR after verification (may be ≤ `claimed_amount`) |
| `verified_by` | FK to User — who verified |
| `verified_at` | Timestamp of verification |
| `rejection_reason` | Reason for rejection |
| `financial_year_covered` | The FY the investment covers (important for prior-year investments) |

### Unique Constraints
None — multiple proofs per category are permitted.

### Validation Rules
- `claimed_amount` must be > 0
- `approved_amount`, if set, must be ≥ 0 and ≤ `claimed_amount`
- `proof_category` must be one of the defined enum values

### Lifecycle
```
pending → verified
        → rejected
```

### Audit Requirements
- Verification and rejection events logged with verifier identity
- Rejected proofs must be visible in the employee's declaration audit trail
- Proof amounts that change TDS by more than ₹500/month logged as notable adjustments

---

## 17. Payroll Adjustment

### Purpose
A Payroll Adjustment is an ad-hoc, one-time financial entry added to a specific Payroll Run for a specific employee — covering arrears from prior periods, recovery of overpayments, one-time bonuses, or any compensation change that cannot be expressed through the standard Salary Structure.

### Business Description
Payroll is never perfectly clean. Situations arise that require non-standard entries:
- An increment was processed a month late — the employee is owed ₹5,000 in arrears for the missed increment month
- An employee was overpaid by ₹2,000 in the prior month (system error) — recover it this month
- A performance bonus of ₹50,000 is approved by management for Q2 results
- A referral bonus is due for a successful hire
- An exit settlement includes a notice period shortfall recovery

These are Payroll Adjustments. They are not part of any Salary Structure — they are one-time entries that appear in one specific Payroll Run.

### Relationships
- **One Payroll Adjustment → One Employee Profile**
- **One Payroll Adjustment → One Tenant**
- **One Payroll Adjustment → One Payroll Run** (the run it is applied to)
- **One Payroll Adjustment → One Approval Workflow Instance** (Approvals module)
- **Produces** one Pay Run Earning Line or Pay Run Deduction Line (depending on `adjustment_type`)

### Business Rules
1. Payroll Adjustments must be approved before they can be included in a Payroll Run.
2. `adjustment_category` determines whether the adjustment is a credit (earning) or a debit (deduction) in the employee's pay:
   - Credit types: `arrear`, `bonus`, `incentive`, `referral_bonus`, `exit_settlement_arrear`, `correction_credit`
   - Debit types: `recovery`, `notice_period_shortfall`, `asset_recovery`, `correction_debit`
3. `is_taxable` must be explicitly set. Bonuses are taxable; most recoveries are not. The Pay Run Earning/Deduction Line inherits `is_taxable` from the adjustment.
4. An adjustment targeting a `locked` Payroll Run is rejected. It must target an open run.
5. `applicable_payroll_run_id` specifies which run the adjustment will be applied in. If left null at approval time, it is applied to the next open run for the employee's Pay Group.
6. Payroll Adjustments must not be used to change an employee's base compensation — those require a Salary Structure change via the Employee module. Adjustments are one-time entries only.
7. Once included in a `locked` Payroll Run (via its Pay Run Line), a Payroll Adjustment is immutable.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `adjustment_category` | Type of adjustment (credit or debit) |
| `amount` | Adjustment amount in the Legal Entity's currency |
| `is_taxable` | Boolean — whether this adjustment amount is taxable income |
| `reason` | Justification for the adjustment |
| `status` | `draft`, `pending`, `approved`, `rejected`, `applied`, `cancelled` |
| `created_by` | FK to User |

### Optional Fields
| Field | Description |
|-------|-------------|
| `applicable_payroll_run_id` | FK to Payroll Run — the specific run to apply this in |
| `reference_pay_period_start` | The period the adjustment relates to (e.g., for arrears, the period that was missed) |
| `reference_pay_period_end` | End of the reference period |
| `approval_workflow_instance_id` | FK to Approval Workflow Instance |
| `approved_by` | FK to User |
| `approved_at` | Timestamp |
| `pay_run_earning_line_id` | FK to Pay Run Earning Line (if this is a credit adjustment) |
| `pay_run_deduction_line_id` | FK to Pay Run Deduction Line (if this is a debit adjustment) |
| `rejection_reason` | Reason for rejection |

### Unique Constraints
None — multiple adjustments for the same employee in the same run are permitted.

### Validation Rules
- `amount` must be > 0
- `reason` must be at least 10 characters
- `applicable_payroll_run_id`, if set, must reference a run with `status` not `locked`
- `is_taxable` must be explicitly set (not null)

### Lifecycle
```
draft → pending → approved → applied
               → rejected
approved → cancelled (before the target Payroll Run is locked)
```

### Audit Requirements
- Adjustment approval events logged with the approving authority
- Large adjustments (> configurable threshold, e.g., 20% of monthly gross) require dual authorization
- Applied events logged with the Pay Run Line reference
- Correction adjustments (those correcting prior payroll errors) must reference the original pay period

---

## 18. Statutory Compliance Record

### Purpose
A Statutory Compliance Record is a computed summary of an employee's statutory payroll obligations for one pay period — capturing the PF, ESIC, PT, and TDS amounts for remittance to government authorities. It is generated automatically from a locked Payroll Run and serves as the source for statutory return filings.

### Business Description
After each Payroll Run is locked, the system generates Statutory Compliance Records — one per employee per compliance type (PF, ESIC, PT, TDS) or one combined record per employee per run, depending on the filing structure. These records aggregate into:
- **PF ECR** (Electronic Challan cum Return) — monthly PF filing
- **ESIC Monthly Return** — ESIC contribution submission
- **PT Challans** — state-specific professional tax remittance
- **Form 24Q** — quarterly TDS return for salary income

The Statutory Compliance Record is permanent and immutable — it is a legal record of what was remitted or declared. Corrections require a revised filing (a new Statutory Compliance Record with an amendment flag) rather than modifying the original.

### Relationships
- **One Statutory Compliance Record → One Pay Run Line**
- **One Statutory Compliance Record → One Employee Profile**
- **One Statutory Compliance Record → One Payroll Run**
- **One Statutory Compliance Record → One Tenant**

### Business Rules
1. Statutory Compliance Records are **generated automatically** when a Payroll Run is `locked`. They are never manually created.
2. One record per employee per Payroll Run. It consolidates all statutory deduction amounts for that employee in that period.
3. `pf_employee_contribution` and `pf_employer_contribution` drive the PF ECR. The PF UAN (Universal Account Number) of the employee must be present for PF records.
4. `esic_employee_contribution` and `esic_employer_contribution` are only populated if `esic_applicable = true` (employee's gross ≤ ₹21,000/month in the applicable months).
5. `tds_deducted` must match the `monthly_tds_amount` from the corresponding Pay Run Tax Computation. Any mismatch is a critical data integrity violation.
6. Records are immutable once created. If a Payroll Run is amended (via Payroll Adjustment in a subsequent run for arrears), the amendment generates a new Statutory Compliance Record for the amended period, flagged as `is_amendment = true`.
7. The total `pf_employer_contribution` and `esic_employer_contribution` across all records for a pay period = the employer-side statutory cost reported to Finance.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `payroll_run_id` | FK to Payroll Run |
| `pay_run_line_id` | FK to Pay Run Line |
| `pay_period_start` | Start of the pay period |
| `pay_period_end` | End of the pay period |
| `pf_applicable` | Boolean — whether PF applies to this employee this period |
| `pf_wages` | PF-eligible wages (typically basic salary, capped at ₹15,000 for statutory PF) |
| `pf_employee_contribution` | Employee PF deduction |
| `pf_employer_contribution` | Employer PF contribution |
| `esic_applicable` | Boolean — whether ESIC applies |
| `esic_wages` | ESIC-eligible wages (gross salary) |
| `esic_employee_contribution` | Employee ESIC deduction |
| `esic_employer_contribution` | Employer ESIC contribution |
| `pt_applicable` | Boolean — whether Professional Tax applies |
| `pt_state_code` | ISO state code for PT applicability |
| `pt_deducted` | Professional Tax deducted |
| `tds_deducted` | TDS deducted this period |
| `generated_at` | Timestamp of record generation |

### Optional Fields
| Field | Description |
|-------|-------------|
| `pf_uan` | Employee's PF Universal Account Number |
| `esic_ip_number` | Employee's ESIC Insurance Person number |
| `pan_number` | Employee's PAN (for TDS filing) |
| `is_amendment` | Boolean — whether this record amends a prior filing |
| `amends_record_id` | FK to prior Statutory Compliance Record being amended |
| `amendment_reason` | Reason for amendment |
| `form_24q_quarter` | Quarter this TDS record contributes to (Q1/Q2/Q3/Q4) |
| `challan_reference` | Government challan/payment reference after remittance |
| `remittance_date` | Date the statutory amount was remitted to the authority |

### Unique Constraints
- `(payroll_run_id, employee_id)` — one record per employee per run (amendments get their own records with `is_amendment = true`)

### Validation Rules
- `pf_employee_contribution + pf_employer_contribution` must be consistent with `pf_wages × statutory_rates`
- `tds_deducted` must equal the `monthly_tds_amount` from the employee's Pay Run Tax Computation
- `pf_uan` must be present if `pf_applicable = true` and the employee's PF has been registered

### Lifecycle
Statutory Compliance Records are **append-only**. No modifications permitted after creation. Corrections are new records with `is_amendment = true`.

### Audit Requirements
- Generation batch logged (run lock → compliance record generation)
- Remittance events logged with challan reference
- Amendment events logged with reason and the original record reference
- Compliance records are subject to legal retention periods — minimum 8 years in India

---

## Cross-Module Interactions

| Interaction | Source | Target | Trigger | Notes |
|-------------|--------|--------|---------|-------|
| Attendance LOP → Payroll deduction | Attendance (locked Attendance Days, `absent`) | Pay Run Deduction Line (`lop_deduction` type) | Payroll Run computation | LOP days reduce gross proportionally |
| Overtime pay → Payroll earning | Attendance (Overtime Record, `overtime_pay` disposition) | Pay Run Earning Line | Payroll Run computation | Rate × approved_minutes |
| Leave Encashment → Payroll earning | Leave (Leave Encashment `approved`) | Pay Run Earning Line | Payroll Run computation | Taxable earning |
| Tax Declaration → TDS computation | Leave (Tax Declaration `approved`) | Pay Run Tax Computation | Monthly computation | Active declaration drives monthly TDS |
| Payslip → Employee document | Payroll (Payslip `published`) | Employee Document store | Payslip publication | PDF stored in Documents module |
| Loan EMI → Pay deduction | Payroll (Loan Repayment Schedule) | Pay Run Deduction Line | Payroll Run computation | Each active schedule entry = one deduction line |
| Reimbursement approved → Pay earning | Payroll (Reimbursement Claim `approved`) | Pay Run Earning Line | Payroll Run computation | Non-taxable up to policy limit |
| Payroll Run locked → Leave Balance (LOP auto-deduction) | Payroll (locked Payroll Run) | Leave Balance adjustment (if applicable) | Post-lock processing | If LOP triggers leave deduction, Leave Adjustment is created |
| Employee exit → Loan recovery | Employee (Exit Record initiated) | Employee Loan (outstanding balance) | FNF processing | Outstanding principal deducted from FNF |
| Payroll Run locked → Statutory Compliance | Payroll (Payroll Run `locked`) | Statutory Compliance Record (auto-generated) | Lock event | PF ECR, ESIC, PT, Form 24Q inputs |

---

## Payroll Run Computation: Step-by-Step

When the computation engine processes a Pay Run, it executes the following sequence for each employee:

```
1. Resolve Active Configuration
   ├── Active Salary Structure Assignment → Salary Structure → Salary Components
   ├── Active Pay Group
   └── Active Tax Declaration (most recently approved for the tax year)

2. Determine Working Days
   ├── Total working days in period (from Location's holiday calendar + Shift schedule)
   ├── LOP days (locked Attendance Days with status = absent, no covering leave)
   └── Days worked = working days - LOP days - unpaid leave days

3. Compute Earning Lines (in component display_order sequence)
   ├── For each Salary Component (earnings): evaluate formula/percentage against CTC/basic
   ├── Apply pro-ration if is_pro_ratable = true:
   │     amount = base_amount × (days_worked / working_days_in_period)
   ├── Append one-time earnings:
   │     ├── Overtime pay (approved Overtime Records)
   │     ├── Leave Encashment (approved, not yet paid)
   │     ├── Reimbursements (approved, not yet paid)
   │     └── Payroll Adjustments — credits (approved, targeting this run)
   └── Compute gross_earnings = sum of all earning lines

4. Compute Deduction Lines
   ├── For each Salary Component (deductions): evaluate statutory formula or percentage
   ├── PF Employee: 12% of PF-eligible wages (capped at ₹1,800 for statutory)
   ├── ESIC Employee: 0.75% of gross (only if gross ≤ ₹21,000)
   ├── PT: state-specific slab based on gross
   ├── Loan EMIs: each active Loan Repayment Schedule entry for this period
   ├── Payroll Adjustments — debits (approved, targeting this run)
   └── [TDS deduction is added in step 5 after tax computation]

5. Compute Tax (TDS)
   ├── Project annual income from YTD actuals + remaining month projections
   ├── Apply exemptions and declaration-based deductions
   ├── Compute annual tax liability (old or new regime)
   ├── Subtract YTD TDS already deducted
   └── Monthly TDS = remaining annual liability / remaining months

6. Finalize Pay Run Line
   ├── gross_earnings = sum of earning lines
   ├── total_deductions = sum of deduction lines (including TDS)
   ├── net_pay = gross_earnings - total_deductions
   └── Validate: net_pay ≥ 0; if net_pay < 0 → set status = error

7. Error Handling
   └── Employees with status = error are flagged for HR review before run can advance
```

---

*This document is the authoritative business entity definition for the Payroll module of Evolve HRMS. The core payroll integrity invariant — `net_pay = gross_earnings - total_deductions`, with every component traceable to a source event — must be maintained by all code paths. Payroll records that are `locked` must be treated as financial ledger entries: immutable, permanent, and auditable to the individual computation step.*
