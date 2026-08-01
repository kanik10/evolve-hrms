# Evolve HRMS — Entity Inventory

**Classification:** Internal Engineering Reference  
**Status:** Finalized  
**Scope:** All modules across the Evolve HRMS platform  

---

## How to Read This Document

| Column | Meaning |
|--------|---------|
| **Entity Name** | Logical business name (maps directly to a database table via naming conventions in `database-standards.md`) |
| **Module** | Owning functional domain |
| **Purpose** | What this entity represents in the business |
| **Data Type** | `Master` — reference / lookup data; `Transaction` — operational events; `Configuration` — system/tenant settings; `Audit` — immutable event trail |
| **Owner Module** | The module responsible for write operations on this entity |
| **Depends On** | Entities this entity has direct foreign key relationships to (excluding the platform-wide `Tenant` and `User` which are implicit on every entity) |
| **Referenced By** | Entities that hold a foreign key pointing to this entity |
| **Lifecycle** | The business state machine for the entity |

> **Implicit dependencies:** Every entity implicitly depends on **Tenant** (for `tenant_id`) and **User** (for `created_by`, `updated_by`, `deleted_by`). These are not repeated in every row of the Depends On column for brevity.

---

## Module Index

1. [Platform Core](#1-platform-core)
2. [Organization Setup](#2-organization-setup)
3. [Employee](#3-employee)
4. [Attendance](#4-attendance)
5. [Leave](#5-leave)
6. [Payroll](#6-payroll)
7. [Performance](#7-performance)
8. [Recruitment](#8-recruitment)
9. [Documents](#9-documents)
10. [Approvals](#10-approvals)
11. [Notifications](#11-notifications)
12. [Import / Bulk Upload](#12-import--bulk-upload)
13. [System / Administration](#13-system--administration)

---

## 1. Platform Core

| Entity Name | Module | Purpose | Data Type | Owner Module | Depends On | Referenced By | Lifecycle |
|-------------|--------|---------|-----------|--------------|------------|---------------|-----------|
| Tenant | Platform Core | Represents one customer organisation (company) using the HRMS platform. The root multi-tenancy anchor. | Master | Platform Core | — | All entities platform-wide | `draft → active → suspended → terminated` |
| Tenant Settings | Platform Core | Tenant-specific configuration values (timezone, locale, currency, fiscal year start, logo, domain). | Configuration | Platform Core | Tenant | — | `active` (always one active record per tenant) |
| User | Platform Core | A human actor who can authenticate and perform actions. May be an HR admin, manager, or employee user. | Master | Platform Core | Tenant | Employee Profile, Role Assignment, all audit columns (`created_by`, `updated_by`) | `invited → active → suspended → deactivated` |
| Role | Platform Core | A named collection of permissions that can be assigned to users (e.g., Super Admin, HR Manager, Employee). | Master | Platform Core | Tenant | Role Permission, User Role Assignment | `draft → active → inactive` |
| Permission | Platform Core | An atomic capability grant representing a specific action on a resource (e.g., `leave:approve`, `payroll:view`). | Configuration | Platform Core | — | Role Permission | `active → deprecated` |
| User Role Assignment | Platform Core | Junction that associates a User with a Role within a tenant. A user may hold multiple roles. | Transaction | Platform Core | User, Role | — | `active → revoked` |
| Role Permission | Platform Core | Junction that associates a Role with a Permission. Defines what a Role can do. | Configuration | Platform Core | Role, Permission | — | `active → revoked` |

---

## 2. Organization Setup

| Entity Name | Module | Purpose | Data Type | Owner Module | Depends On | Referenced By | Lifecycle |
|-------------|--------|---------|-----------|--------------|------------|---------------|-----------|
| Company Profile | Organization | The legal and operational identity of the company within a tenant. Holds registered name, GST/PAN, address, branding. One record per tenant. | Master | Organization | Tenant | — | `draft → active` |
| Business Unit | Organization | A top-level strategic division of the company (e.g., Technology BU, Commerce BU). Departments roll up into Business Units. | Master | Organization | Tenant, Location | Department, Cost Center, Employee Profile | `draft → active → inactive → archived` |
| Department | Organization | A functional grouping of employees within a Business Unit (e.g., Engineering, Finance, HR). | Master | Organization | Business Unit, Cost Center, Location | Designation, Employee Profile, Employee Department Assignment, Cost Center | `draft → active → inactive → archived` |
| Designation | Organization | A job title or role label within a Department, linked to a Grade level (e.g., Senior Engineer, HR Business Partner). | Master | Organization | Department, Grade | Employee Profile, Employee Designation Assignment, Job Opening | `draft → active → inactive → archived` |
| Location | Organization | A physical or virtual office location where employees are based (city, address, timezone, working hours). | Master | Organization | Tenant | Business Unit, Department, Employee Profile, Shift | `draft → active → inactive → archived` |
| Cost Center | Organization | A financial accountability unit used to allocate headcount costs to specific budgets. | Master | Organization | Business Unit, Department | Department, Employee Profile, Pay Run Line | `draft → active → inactive → archived` |
| Grade | Organization | A hierarchical level classification (e.g., L1–L8) that defines the compensation band and seniority of a position. | Master | Organization | Tenant | Designation, Employee Grade Assignment, Salary Structure | `draft → active → inactive → archived` |
| Employment Type | Organization | The nature of engagement contract for an employee (e.g., Full Time, Part Time, Contract, Intern, Consultant). | Master | Organization | Tenant | Employee Profile, Employee Employment Type Assignment, Leave Policy Rule | `active → inactive` |
| Holiday Calendar | Organization | A named calendar of non-working days applicable to a tenant or specific location (e.g., India 2025 Calendar). | Master | Organization | Location | Holiday Calendar Day, Employee Leave Balance, Leave Request | `draft → active → archived` |
| Holiday Calendar Day | Organization | An individual holiday entry within a Holiday Calendar (name, date, type: national / regional / optional). | Master | Organization | Holiday Calendar | Leave Request (for conflict checking) | `active → cancelled` |
| Shift | Organization | A defined working time window with start/end times, grace period, and overtime rules (e.g., Morning Shift 09:00–18:00). | Master | Organization | Tenant, Location | Shift Assignment, Attendance Record, Shift Roster | `draft → active → inactive → archived` |
| Leave Type | Organization | A category of leave (e.g., Annual Leave, Sick Leave, Casual Leave, Maternity Leave) with rules. Global per tenant. | Master | Organization | Tenant | Leave Policy Rule, Leave Request, Leave Balance | `active → inactive → archived` |
| Leave Policy | Organization | A named bundle of leave entitlements and rules applied to a group of employees (e.g., Standard Policy, Probation Policy). | Master | Organization | Tenant | Leave Policy Rule, Employee Leave Policy Assignment, Leave Balance | `draft → active → inactive → archived` |
| Leave Policy Rule | Organization | A specific entitlement rule within a Leave Policy: ties a Leave Type to a number of days, carry-forward, and encashment rules. | Configuration | Organization | Leave Policy, Leave Type, Employment Type | Leave Balance | `active → inactive` |
| Salary Structure | Organization | A template that defines the composition of compensation for a Grade (basic, HRA, allowances, deductions). | Master | Organization | Grade | Salary Component, Employee Salary Structure Assignment | `draft → active → inactive → archived` |
| Salary Component | Organization | An individual earnings or deduction line within a Salary Structure (e.g., Basic, HRA, PF Employer, TDS). Effective-dated. | Master | Organization | Salary Structure | Employee Compensation, Pay Run Line | `active → inactive` |

---

## 3. Employee

| Entity Name | Module | Purpose | Data Type | Owner Module | Depends On | Referenced By | Lifecycle |
|-------------|--------|---------|-----------|--------------|------------|---------------|-----------|
| Employee Profile | Employee | The central identity record for an employee. Holds the employee code, joining date, current status, and references to all current assignments. | Master | Employee | Tenant, User, Department, Designation, Grade, Location, Employment Type, Business Unit | All emp_ entities, att_records, lve_requests, pay_run_lines, prf_reviews, apv_workflow_instances | `onboarding → probation → active → notice_period → terminated / resigned` |
| Employee Personal Details | Employee | Sensitive personal data for the employee: date of birth, gender, marital status, nationality, PAN, Aadhaar, passport. Stored separately for access control. | Master | Employee | Employee Profile | — | Mirrors Employee Profile lifecycle |
| Employee Address | Employee | Current and permanent addresses for an employee. Multiple address types (current, permanent, correspondence). | Master | Employee | Employee Profile | — | `active → superseded` |
| Employee Emergency Contact | Employee | Emergency contact person(s) for an employee (name, relationship, phone). | Master | Employee | Employee Profile | — | `active → inactive` |
| Employee Education | Employee | Educational qualifications for an employee (degree, institution, year of passing, grade). | Master | Employee | Employee Profile | — | Append-only; `verified → unverified` |
| Employee Work Experience | Employee | Prior employment history entries for an employee before joining. | Master | Employee | Employee Profile | — | Append-only |
| Employee Document | Employee | A reference to an uploaded file associated with an employee (offer letter, certificate, ID proof). Linked to Document store. | Master | Employee | Employee Profile, Document File | — | `draft → active → expired → archived` |
| Employee Bank Account | Employee | Bank account details for salary disbursement. One primary account per employee at any time. | Master | Employee | Employee Profile | Pay Run (for disbursement) | `pending_verification → active → inactive` |
| Employee Compensation | Employee | Effective-dated compensation record: CTC, gross, basic salary amount per revision. Each row = one version. | Transaction | Employee | Employee Profile, Salary Structure, Grade | Pay Run Line | `active → superseded` (via effective dating) |
| Employee Grade Assignment | Employee | Effective-dated record of which Grade an employee holds. One current active row per employee. | Transaction | Employee | Employee Profile, Grade | — | `active → superseded` |
| Employee Designation Assignment | Employee | Effective-dated record of an employee's job title / designation over time. | Transaction | Employee | Employee Profile, Designation | — | `active → superseded` |
| Employee Department Assignment | Employee | Effective-dated record of which Department an employee belongs to. Tracks inter-department transfers. | Transaction | Employee | Employee Profile, Department | — | `active → superseded` |
| Employee Manager Assignment | Employee | Effective-dated record of the reporting manager (and optional dotted-line manager) for an employee. | Transaction | Employee | Employee Profile (self-referencing for manager) | — | `active → superseded` |
| Employee Employment Type Assignment | Employee | Effective-dated record of the employment type for an employee (tracks conversions: intern → full-time). | Transaction | Employee | Employee Profile, Employment Type | Leave Policy Rule, Pay Run | `active → superseded` |
| Employee Shift Assignment | Employee | Associates an employee with a Shift for a date range or schedule period. | Transaction | Employee | Employee Profile, Shift | Attendance Record | `active → superseded → expired` |
| Employee Leave Policy Assignment | Employee | Effective-dated assignment of a Leave Policy to an employee. Determines leave entitlements. | Transaction | Employee | Employee Profile, Leave Policy | Leave Balance | `active → superseded` |
| Employee Leave Balance | Employee | Running tally of an employee's leave balance per Leave Type per year (earned, used, carried, lapsed). | Transaction | Employee | Employee Profile, Leave Type, Leave Policy | Leave Request | Updated on each leave transaction |
| Exit Record | Employee | Captures the full details of an employee's separation: last working day, exit type, exit reason, clearance status, FNF status. | Transaction | Employee | Employee Profile | — | `initiated → clearance_pending → approved → completed` |

---

## 4. Attendance

| Entity Name | Module | Purpose | Data Type | Owner Module | Depends On | Referenced By | Lifecycle |
|-------------|--------|---------|-----------|--------------|------------|---------------|-----------|
| Attendance Record | Attendance | Daily attendance entry for an employee: punch-in, punch-out, working hours, overtime, attendance status (present / absent / half-day / WFH). | Transaction | Attendance | Employee Profile, Shift, Employee Shift Assignment | Payroll Run (for LOP calculation), Leave Request | `open → processed → locked` |
| Attendance Adjustment | Attendance | A request to correct a previously recorded attendance entry (e.g., missed punch, incorrect hours). | Transaction | Attendance | Attendance Record, Employee Profile | Approval Workflow Instance | `draft → pending → approved → rejected` |
| Shift Roster | Attendance | A planned shift schedule for a team or department over a defined period (weekly/monthly). | Transaction | Attendance | Department, Shift | Shift Roster Entry | `draft → published → archived` |
| Shift Roster Entry | Attendance | A single line in a Shift Roster — assigns one employee to a specific shift on a specific date. | Transaction | Attendance | Shift Roster, Employee Profile, Shift | Attendance Record | Immutable once processed |
| Overtime Record | Attendance | A recorded or approved overtime session for an employee, linked to an Attendance Record. | Transaction | Attendance | Attendance Record, Employee Profile | Pay Run Line (if overtime is paid) | `draft → pending → approved → rejected → paid` |

---

## 5. Leave

| Entity Name | Module | Purpose | Data Type | Owner Module | Depends On | Referenced By | Lifecycle |
|-------------|--------|---------|-----------|--------------|------------|---------------|-----------|
| Leave Request | Leave | An employee's application for leave: leave type, dates, duration, reason, supporting documents. | Transaction | Leave | Employee Profile, Leave Type, Leave Balance, Holiday Calendar | Leave Approval, Employee Leave Balance | `draft → pending → approved → rejected → cancelled → withdrawn` |
| Leave Approval | Leave | The approval decision record linked to a Leave Request — captures approver, decision, comments, timestamp. | Transaction | Leave | Leave Request, User (approver) | — | `pending → approved → rejected` |
| Leave Adjustment | Leave | A manual correction to an employee's leave balance (credit or debit) performed by HR, with a reason (e.g., leave encashment, bonus credit). | Transaction | Leave | Employee Profile, Leave Type, Leave Balance | Employee Leave Balance | `pending → applied` |
| Leave Encashment | Leave | A formal request or record of an employee encashing eligible leave days for monetary payout. | Transaction | Leave | Employee Profile, Leave Type, Leave Balance, Leave Policy Rule | Pay Run Line | `draft → pending → approved → paid` |

---

## 6. Payroll

| Entity Name | Module | Purpose | Data Type | Owner Module | Depends On | Referenced By | Lifecycle |
|-------------|--------|---------|-----------|--------------|------------|---------------|-----------|
| Employee Salary Structure Assignment | Payroll | Links an employee to a specific Salary Structure with an effective date. Determines how their salary is computed in a pay run. | Transaction | Payroll | Employee Profile, Salary Structure | Pay Run Line | `active → superseded` |
| Payroll Run | Payroll | A single payroll processing cycle for a tenant (month, pay period). Initiates computation for all eligible employees. | Transaction | Payroll | Tenant, Cost Center | Pay Run Line, Payslip | `draft → processing → computed → review → approved → disbursed → locked` |
| Pay Run Line | Payroll | A single employee's computed earnings and deductions row within a Payroll Run. Contains every component breakdown. | Transaction | Payroll | Payroll Run, Employee Profile, Salary Component, Cost Center, Employee Compensation | Payslip | Immutable once Payroll Run is locked |
| Payslip | Payroll | The generated, employee-visible pay statement for a pay period. Derived from Pay Run Lines. | Transaction | Payroll | Pay Run Line, Employee Profile | — | `generated → published → acknowledged` |
| Tax Declaration | Payroll | An employee's self-declared investment and exemption details for income tax computation under the applicable regime. | Transaction | Payroll | Employee Profile | Investment Proof, Pay Run (for TDS computation) | `draft → submitted → approved → locked` |
| Investment Proof | Payroll | Supporting documents uploaded by an employee to substantiate a Tax Declaration item. | Transaction | Payroll | Tax Declaration, Employee Profile | — | `pending → verified → rejected` |
| Reimbursement Claim | Payroll | An employee's claim for out-of-pocket expense reimbursement (travel, medical, etc.) processed via payroll. | Transaction | Payroll | Employee Profile | Approval Workflow Instance, Pay Run Line | `draft → pending → approved → rejected → paid` |
| Payroll Adjustment | Payroll | An ad-hoc payroll correction record (e.g., arrears, recovery, bonus) added to a Payroll Run outside the standard Salary Structure. | Transaction | Payroll | Payroll Run, Employee Profile | Pay Run Line | `draft → pending → approved → applied` |
| Statutory Compliance Record | Payroll | A computed summary of statutory filings per employee per period (PF, ESIC, PT, TDS). Generated from locked Pay Runs. | Audit | Payroll | Payroll Run, Employee Profile | — | Append-only |

---

## 7. Performance

| Entity Name | Module | Purpose | Data Type | Owner Module | Depends On | Referenced By | Lifecycle |
|-------------|--------|---------|-----------|--------------|------------|---------------|-----------|
| Performance Cycle | Performance | A defined review period for performance evaluations (e.g., Annual Review 2025, Mid-Year Check-In). | Configuration | Performance | Tenant | Performance Review, Employee Goal | `draft → active → closed → archived` |
| Review Template | Performance | A configurable form template defining the structure of a performance review (sections, rating scales, question types). | Configuration | Performance | Tenant | Performance Review | `draft → active → deprecated` |
| Performance Review | Performance | An individual employee's performance review instance within a cycle — contains self-assessment, manager assessment, and final rating. | Transaction | Performance | Employee Profile, Performance Cycle, Review Template | Review Rating, Feedback | `not_started → in_progress → submitted → calibration → finalized` |
| Review Rating | Performance | A single rating given by a reviewer for a specific competency or section within a Performance Review. | Transaction | Performance | Performance Review | — | Immutable once Review is finalized |
| Goal | Performance | A business objective defined by an employee or manager. May be individual, team, or company-level. | Transaction | Performance | Employee Profile, Performance Cycle | KPI, Employee Goal | `draft → active → completed → cancelled` |
| KPI | Performance | A measurable key performance indicator tied to a Goal (target value, unit, actual value at review). | Transaction | Performance | Goal | — | `active → achieved → missed → cancelled` |
| Employee Goal | Performance | The linkage of a Goal to a specific employee within a Performance Cycle. | Transaction | Performance | Goal, Employee Profile, Performance Cycle | — | `active → completed → cancelled` |
| Feedback | Performance | Peer or 360-degree feedback given to or about an employee within a Performance Review. | Transaction | Performance | Performance Review, Employee Profile (giver), Employee Profile (receiver) | — | `requested → submitted → acknowledged` |

---

## 8. Recruitment

| Entity Name | Module | Purpose | Data Type | Owner Module | Depends On | Referenced By | Lifecycle |
|-------------|--------|---------|-----------|--------------|------------|---------------|-----------|
| Job Opening | Recruitment | A published or internal vacancy with details of the role, department, designation, location, headcount, and required qualifications. | Master | Recruitment | Department, Designation, Grade, Location | Job Application, Candidate | `draft → open → on_hold → closed → cancelled` |
| Candidate | Recruitment | A person who has applied or been sourced for one or more Job Openings. Stores personal and professional profile. | Master | Recruitment | Tenant | Job Application, Interview | `new → in_pipeline → hired → rejected → withdrawn` |
| Job Application | Recruitment | A specific application linking a Candidate to a Job Opening. Tracks stage progress through the hiring pipeline. | Transaction | Recruitment | Job Opening, Candidate | Interview, Offer Letter | `applied → screening → interview → assessment → offer → hired → rejected → withdrawn` |
| Interview | Recruitment | A scheduled interview session for a Job Application — includes interviewer, date/time, type (phone/video/onsite), and outcome. | Transaction | Recruitment | Job Application, User (interviewer) | Interview Feedback | `scheduled → completed → cancelled → no_show` |
| Interview Feedback | Recruitment | Structured feedback submitted by an interviewer after an Interview session (rating, recommendation, notes). | Transaction | Recruitment | Interview, User (interviewer) | — | `pending → submitted` |
| Offer Letter | Recruitment | A formal offer generated for a selected Candidate on a Job Application, including CTC, joining date, grade. | Transaction | Recruitment | Job Application, Candidate, Grade, Salary Structure | Employee Profile (on acceptance) | `draft → issued → accepted → rejected → revoked → expired` |

---

## 9. Documents

| Entity Name | Module | Purpose | Data Type | Owner Module | Depends On | Referenced By | Lifecycle |
|-------------|--------|---------|-----------|--------------|------------|---------------|-----------|
| Document File | Documents | A stored file record (metadata + storage reference) for any file uploaded to the system. Tenant-scoped. | Master | Documents | Tenant, User (uploader) | Employee Document, Company Document, Policy Document, Investment Proof, Offer Letter | `uploading → active → archived → deleted` |
| Document Template | Documents | A reusable document template for generating standard HR letters (offer letter, experience letter, appointment letter). | Configuration | Documents | Tenant | Generated Document | `draft → active → deprecated` |
| Generated Document | Documents | A rendered output produced by merging a Document Template with an employee's data (e.g., a specific employee's experience letter). | Transaction | Documents | Document Template, Employee Profile | Employee Document | `draft → generated → issued → acknowledged` |
| Company Document | Documents | A company-level document or policy file accessible to all or a group of employees (e.g., Employee Handbook). | Master | Documents | Document File, Tenant | — | `draft → published → archived` |
| Policy Document | Documents | A formal HR policy document stored in the Policy Library (e.g., Leave Policy PDF, Code of Conduct). | Master | Documents | Document File, Tenant | — | `draft → published → superseded → archived` |

---

## 10. Approvals

| Entity Name | Module | Purpose | Data Type | Owner Module | Depends On | Referenced By | Lifecycle |
|-------------|--------|---------|-----------|--------------|------------|---------------|-----------|
| Approval Workflow | Approvals | A configured multi-step approval chain for a specific business process (e.g., Leave Approval, Expense Claim, Salary Revision). | Configuration | Approvals | Tenant | Approval Workflow Step, Approval Workflow Instance | `draft → active → inactive → archived` |
| Approval Workflow Step | Approvals | A single step within an Approval Workflow — defines the approver (role, specific user, or reporting manager), order, and escalation rules. | Configuration | Approvals | Approval Workflow, Role, User | Approval Step Instance | `active → inactive` |
| Approval Workflow Instance | Approvals | A running instance of an Approval Workflow triggered for a specific business record (e.g., a particular Leave Request). | Transaction | Approvals | Approval Workflow, Employee Profile (initiator) | Approval Step Instance | `pending → approved → rejected → cancelled` |
| Approval Step Instance | Approvals | A single approver's action record within a running Approval Workflow Instance — captures decision, comments, and timestamp. | Transaction | Approvals | Approval Workflow Instance, Approval Workflow Step, User (approver) | — | `pending → approved → rejected → escalated → skipped` |

---

## 11. Notifications

| Entity Name | Module | Purpose | Data Type | Owner Module | Depends On | Referenced By | Lifecycle |
|-------------|--------|---------|-----------|--------------|------------|---------------|-----------|
| Notification Template | Notifications | A named, parameterized message template for system-generated notifications (email, in-app, SMS). | Configuration | Notifications | Tenant | Notification Message | `draft → active → deprecated` |
| Notification Message | Notifications | A dispatched notification sent to a specific user — tied to a triggering event and a Template. | Transaction | Notifications | Notification Template, User (recipient), User (sender or system) | — | `queued → sent → delivered → failed → read` |
| Notification Subscription | Notifications | A user's opt-in or opt-out preference for a specific notification event type and channel. | Configuration | Notifications | User, Tenant | — | `active → unsubscribed` |

---

## 12. Import / Bulk Upload

| Entity Name | Module | Purpose | Data Type | Owner Module | Depends On | Referenced By | Lifecycle |
|-------------|--------|---------|-----------|--------------|------------|---------------|-----------|
| Import Job | Import | A bulk upload operation initiated by an HR admin — covers entity type (employees, departments, leave, payroll), source file, and run parameters. | Transaction | Import | Tenant, User (initiator), Document File (source) | Import Batch, Import Error Log | `queued → processing → completed → failed → partial` |
| Import Batch | Import | A logical batch within an Import Job representing a chunk of rows processed together. | Transaction | Import | Import Job | Import Error Log | `queued → processing → completed → failed` |
| Import Error Log | Import | A per-row error record generated when a row in an Import Batch fails validation or processing. Stores row number, field, error message, raw data. | Audit | Import | Import Batch | — | Append-only |
| Import Template | Import | A downloadable CSV / Excel template definition for a specific entity type (e.g., Employee Upload Template). | Configuration | Import | Tenant | Import Job | `active → deprecated` |

---

## 13. System / Administration

| Entity Name | Module | Purpose | Data Type | Owner Module | Depends On | Referenced By | Lifecycle |
|-------------|--------|---------|-----------|--------------|------------|---------------|-----------|
| Audit Log | System | An immutable, append-only record of every significant write operation across the platform — captures who changed what and when, with old and new values. | Audit | System | Tenant, User | — | Append-only; purge only after retention period |
| System Setting | System | Platform-level configuration key-value pairs managed by Super Admins (feature toggles, global limits, retention policies). | Configuration | System | Tenant | — | `active` (upsert pattern) |
| Feature Flag | System | A per-tenant or global toggle controlling access to specific features or experiments in the platform. | Configuration | System | Tenant | — | `enabled → disabled` |
| Email Template | System | System-managed email body templates used by the notification and document generation pipeline. | Configuration | System | Tenant | Notification Template, Generated Document | `draft → active → deprecated` |
| Country | System | A global reference list of countries. Not tenant-scoped. Used for addresses, location, and compliance rules. | Master | System | — | Location, Employee Address, Company Profile | Static reference data |
| Currency | System | A global reference list of currencies and their ISO codes. Used for payroll and compensation records. | Master | System | — | Tenant Settings, Salary Component, Pay Run | Static reference data |
| Timezone | System | A global reference list of IANA timezones. Used for location and shift configuration. | Master | System | — | Location, Shift, Tenant Settings | Static reference data |

---

## Entity Count Summary

| Module | Master | Transaction | Configuration | Audit | Total |
|--------|--------|-------------|---------------|-------|-------|
| Platform Core | 3 | 2 | 2 | — | 7 |
| Organization Setup | 11 | — | 5 | — | 16 |
| Employee | 10 | 8 | — | — | 18 |
| Attendance | 1 | 4 | — | — | 5 |
| Leave | — | 4 | — | — | 4 |
| Payroll | — | 7 | — | 1 | 8 |
| Performance | — | 6 | 2 | — | 8 |
| Recruitment | 2 | 4 | — | — | 6 |
| Documents | 3 | 1 | 1 | — | 5 |
| Approvals | — | 2 | 2 | — | 4 |
| Notifications | — | 1 | 2 | — | 3 |
| Import | — | 2 | 2 | 1 | 5 (with Import Template) |
| System / Admin | 3 | — | 3 | 1 | 7 |
| **Total** | **33** | **41** | **19** | **3** | **96** |

---

*This document is the authoritative entity catalog for Evolve HRMS. New entities require architecture review before being added. Changes to Owner Module, lifecycle states, or dependency chains require a corresponding update to this document.*
