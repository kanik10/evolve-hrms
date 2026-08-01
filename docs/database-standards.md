# Evolve HRMS — Database Standards

**Classification:** Internal Engineering Standard  
**Status:** Finalized  
**Stack:** PostgreSQL · Drizzle ORM · TypeScript  
**Scope:** All database schemas, tables, and migrations across the Evolve HRMS platform  

---

## Overview

This document defines the authoritative database design standards for Evolve HRMS. Every engineer, contractor, and contributor must follow these standards before writing any schema, migration, or query. These conventions ensure consistency, auditability, multi-tenancy correctness, and long-term maintainability across a system that is architecturally comparable to Workday, Darwinbox, Rippling, and BambooHR.

Non-compliance must be flagged in code review and corrected before merge.

---

## 1. Table Naming Conventions

### Rules

| Rule | Standard |
|------|----------|
| Case | `snake_case` — all lowercase, words separated by underscores |
| Plurality | Always **plural** (tables hold collections of rows) |
| Prefix | Module-scoped tables use a **domain prefix** (see domain prefixes below) |
| No abbreviations | Write full words. `employees` not `emps`. `departments` not `depts` |
| No generic names | Never `data`, `records`, `items`, `entries` as a table name |
| Junction tables | Named `{table_a}_{table_b}` in alphabetical order |
| Lookup / reference tables | Suffix with `_types` or `_categories` when appropriate |

### Domain Prefixes

Each functional module owns a namespace prefix. Tables that belong to a module must be prefixed. Cross-cutting tables (tenants, users, audit) have no prefix.

| Domain | Prefix | Example |
|--------|--------|---------|
| Organization | `org_` | `org_departments`, `org_locations` |
| Employee | `emp_` | `emp_profiles`, `emp_documents` |
| Attendance | `att_` | `att_records`, `att_shifts` |
| Leave | `lve_` | `lve_requests`, `lve_policies` |
| Payroll | `pay_` | `pay_runs`, `pay_salary_structures` |
| Performance | `prf_` | `prf_cycles`, `prf_reviews` |
| Recruitment | `rec_` | `rec_jobs`, `rec_candidates` |
| Documents | `doc_` | `doc_files`, `doc_templates` |
| Approvals | `apv_` | `apv_workflows`, `apv_steps` |
| Notifications | `ntf_` | `ntf_messages`, `ntf_subscriptions` |
| System / Admin | `sys_` | `sys_feature_flags`, `sys_audit_logs` |
| Tenant (core) | _(none)_ | `tenants`, `users`, `roles` |

### Examples

```
tenants
users
roles
user_roles
org_departments
org_designations
org_grades
org_cost_centers
org_business_units
org_employment_types
org_holiday_calendars
org_holiday_calendar_days
emp_profiles
emp_bank_accounts
emp_documents
att_shifts
att_shift_assignments
att_records
lve_policies
lve_policy_rules
lve_requests
lve_balances
pay_salary_structures
pay_salary_components
pay_runs
pay_run_lines
```

---

## 2. Column Naming Conventions

### Rules

| Rule | Standard |
|------|----------|
| Case | `snake_case` — all lowercase |
| Clarity | Names must be self-documenting without needing the table name for context |
| No type suffixes | Never `name_str`, `amount_int`. The column name alone must be sufficient |
| No Hungarian notation | No prefixes like `v_`, `n_`, `b_` |
| Boolean prefix | All boolean columns must start with `is_` or `has_` (e.g., `is_active`, `has_direct_reports`) |
| Amounts / money | Suffix with `_amount` (e.g., `base_salary_amount`). Store as `numeric(19,4)` |
| Counts | Suffix with `_count` (e.g., `headcount`, `leave_days_count`) |
| Percentages | Suffix with `_percent` (e.g., `tax_percent`, `attendance_percent`) |
| Duration / interval | Suffix with `_days`, `_hours`, `_minutes` as appropriate |
| External identifiers | Suffix with `_code` for business codes (e.g., `employee_code`, `department_code`) |
| Display names | Use `name` for the primary display label of a record |
| Descriptions | Use `description` (not `desc`, `info`, `notes` unless semantically different) |
| JSON / JSONB columns | Suffix with `_data` (e.g., `metadata`, `config_data`, `custom_fields_data`) |

### Reserved Column Names

The following names have fixed, platform-wide meanings and must never be repurposed:

| Column | Meaning |
|--------|---------|
| `id` | Primary key (UUID) |
| `tenant_id` | Multi-tenant foreign key to `tenants.id` |
| `created_at` | Record creation timestamp |
| `updated_at` | Last modification timestamp |
| `deleted_at` | Soft-delete timestamp (null = active) |
| `created_by` | FK to `users.id` — who created the record |
| `updated_by` | FK to `users.id` — who last modified the record |
| `deleted_by` | FK to `users.id` — who soft-deleted the record |
| `effective_from` | Start of a validity period |
| `effective_to` | End of a validity period (null = currently active) |
| `status` | Record lifecycle status (see §13) |
| `sort_order` | Integer for manual ordering within a list |
| `external_id` | Identifier from an external/integrated system |

---

## 3. Primary Key Strategy

### Standard

Every table uses a single-column primary key named **`id`** of type **UUID**.

### Rules

- Primary keys are always **UUID v7** (see §4).
- Primary keys are **never** composite keys. If business uniqueness requires multiple columns, enforce that via a `UNIQUE` constraint separately — the PK remains `id`.
- Primary keys are **immutable**. Once assigned, a PK value must never change.
- Surrogate integer / serial keys (`SERIAL`, `BIGSERIAL`, `IDENTITY`) are **prohibited** in application tables. They may only be used in internal migration tracking tables managed by Drizzle.
- Natural keys (e.g., `employee_code`, `email`) must not serve as primary keys. They may change; UUIDs do not.

### Rationale

- UUIDs allow safe record creation in application memory before the database round-trip.
- UUID v7 is k-sortable (time-ordered), which reduces B-tree index fragmentation compared to UUID v4.
- Consistent PK type across all tables simplifies foreign key declarations, API contract design, and ORM usage.

---

## 4. UUID Strategy

### Version

**UUID v7** is the required standard for all generated identifiers.

UUID v7 encodes a millisecond-precision timestamp in the most-significant bits, making it naturally sortable by creation time. This provides B-tree index performance close to auto-increment while retaining global uniqueness without a central sequence.

### Generation

| Layer | Method |
|-------|--------|
| Database default | PostgreSQL `gen_random_uuid()` is **not** used (it produces v4). UUIDs are generated in the application layer. |
| Application (Node.js) | Use the `uuidv7` npm package (`import { uuidv7 } from 'uuidv7'`) |
| Database fallback | For tables that may receive rows via direct DB operations (migrations, seed data), use a PostgreSQL extension or function that generates v7; otherwise generate in application code and pass the value explicitly. |

### Rules

- All `id` columns must declare `DEFAULT` at the application/ORM layer, not via `gen_random_uuid()` at the DB layer, to ensure v7 is used.
- Never use `uuid_generate_v4()` from the `uuid-ossp` extension for new tables.
- Never shorten or encode UUIDs as Base58/Base62 for storage. Store as the standard 36-character hyphenated string in `UUID` column type (stored as 16 bytes by PostgreSQL internally).
- UUIDs exposed in URLs and APIs are the same values stored in the database — no translation layer.

---

## 5. Foreign Key Naming

### Column Name Pattern

Foreign key columns are named using the **singular form of the referenced table** (without domain prefix), suffixed with `_id`.

```
{referenced_entity_singular}_id
```

### Examples

| References Table | FK Column Name |
|-----------------|----------------|
| `tenants` | `tenant_id` |
| `users` | `user_id` |
| `org_departments` | `department_id` |
| `org_designations` | `designation_id` |
| `org_grades` | `grade_id` |
| `emp_profiles` | `employee_id` |
| `lve_policies` | `leave_policy_id` |
| `pay_salary_structures` | `salary_structure_id` |
| `apv_workflows` | `approval_workflow_id` |

### Disambiguation

When a table has **multiple foreign keys to the same target table**, prefix with a relationship role descriptor:

```
reporting_manager_id   → references emp_profiles
dotted_line_manager_id → references emp_profiles
approved_by_id         → references users
rejected_by_id         → references users
```

### Constraint Name Pattern

```
fk_{table}_{column}
```

Examples:
```
fk_emp_profiles_department_id
fk_emp_profiles_designation_id
fk_lve_requests_employee_id
fk_lve_requests_leave_policy_id
fk_pay_run_lines_pay_run_id
```

### Rules

- All foreign keys must have an explicit named constraint.
- Default referential actions: `ON DELETE RESTRICT`, `ON UPDATE CASCADE`.
- Soft-deletable parent tables should use `ON DELETE RESTRICT` — never `CASCADE` — because the child rows must survive with the parent's `deleted_at` set, not be physically removed.
- Nullable FKs are permitted where the relationship is optional (e.g., `reporting_manager_id` may be null for the top of a hierarchy).

---

## 6. Index Naming

### Pattern

```
idx_{table}_{column(s)}
```

For multi-column indexes, join column names with `_`:

```
idx_{table}_{col1}_{col2}
```

For partial indexes, append a meaningful qualifier:

```
idx_{table}_{column}_active
idx_{table}_{column}_pending
```

### Examples

```
idx_emp_profiles_tenant_id
idx_emp_profiles_tenant_id_department_id
idx_emp_profiles_email
idx_lve_requests_employee_id_status
idx_lve_requests_tenant_id_created_at
idx_att_records_employee_id_date
idx_att_records_tenant_id_date_active       ← partial: WHERE deleted_at IS NULL
idx_pay_runs_tenant_id_status
```

### Rules

- Every foreign key column must have an index (to avoid sequential scans on joins).
- `tenant_id` must always appear as the **leading column** in any composite index on a multi-tenant table (partition-like isolation at the query planner level).
- `(tenant_id, status)` composite indexes are required on every table that has a `status` column and is expected to be filtered frequently.
- `(tenant_id, deleted_at)` partial index (`WHERE deleted_at IS NULL`) is required on all soft-deletable tables.
- Unique indexes use pattern `uq_{table}_{column(s)}` (see §7).
- Do not add indexes speculatively. Add indexes that correspond to known query patterns. Document the query the index supports in a comment on the Drizzle index definition.
- GIN indexes for JSONB columns use: `gin_idx_{table}_{column}`.

---

## 7. Constraint Naming

All constraints must be explicitly named. Never rely on database-generated constraint names.

### Patterns

| Constraint Type | Pattern | Example |
|----------------|---------|---------|
| Primary Key | `pk_{table}` | `pk_emp_profiles` |
| Foreign Key | `fk_{table}_{column}` | `fk_emp_profiles_department_id` |
| Unique | `uq_{table}_{column(s)}` | `uq_emp_profiles_employee_code` |
| Check | `chk_{table}_{description}` | `chk_lve_requests_dates_order` |
| Not Null | Enforced via column definition; no separate constraint name needed | — |
| Exclusion | `exc_{table}_{description}` | `exc_att_shifts_no_overlap` |

### Multi-column Unique Constraints

```
uq_{table}_{col1}_{col2}
```

Example: an employee code that is unique per tenant:
```
uq_emp_profiles_tenant_id_employee_code
```

### Check Constraint Guidelines

- Every `effective_from` / `effective_to` pair must have a check: `effective_from <= effective_to OR effective_to IS NULL`.
- Percentage columns must have a check: `value >= 0 AND value <= 100`.
- Amount columns must have a check: `value >= 0` (or specify signed if negative amounts are valid).

---

## 8. Enum Strategy

### Approach: Application-Layer Enums with Database Check Constraints

Enums in this system are **not** defined as PostgreSQL `ENUM` types. Instead:

1. Values are stored as `TEXT` columns in PostgreSQL.
2. Allowed values are enforced via **named CHECK constraints** at the database level.
3. The canonical enum definition lives in TypeScript as a `const` object, shared across the codebase.

### Rationale

PostgreSQL native `ENUM` types are difficult to alter (`ALTER TYPE ... ADD VALUE` cannot be done inside a transaction). TEXT + CHECK constraints can be altered via standard `ALTER TABLE` migrations with zero downtime risk.

### Standard Pattern

**TypeScript definition (single source of truth):**

```typescript
// lib/db/src/enums/employment-status.ts
export const EmploymentStatus = {
  ACTIVE: 'active',
  ON_LEAVE: 'on_leave',
  PROBATION: 'probation',
  NOTICE_PERIOD: 'notice_period',
  TERMINATED: 'terminated',
  RESIGNED: 'resigned',
} as const;

export type EmploymentStatus = typeof EmploymentStatus[keyof typeof EmploymentStatus];
```

**Database CHECK constraint:**
The Drizzle schema generates a CHECK constraint from the TypeScript values array. The constraint name follows the `chk_{table}_{column}` pattern.

### Naming Rules for Enum Values

- All enum string values are **lowercase `snake_case`**.
- Values must be human-readable and self-explanatory.
- Never use integers or single-letter codes as enum values.

### Enum Ownership

All enum definitions live in `lib/db/src/enums/`. Each enum has its own file. Enums are exported from a barrel index. No inline enum values in schema files.

### Common Platform Enums

The following enums are defined at the platform level and must not be redefined per-module:

| Enum | Values |
|------|--------|
| `RecordStatus` | `active`, `inactive`, `draft`, `archived` |
| `ApprovalStatus` | `pending`, `approved`, `rejected`, `cancelled`, `withdrawn` |
| `Gender` | `male`, `female`, `non_binary`, `prefer_not_to_say` |
| `MaritalStatus` | `single`, `married`, `divorced`, `widowed`, `separated` |
| `EmploymentType` | `full_time`, `part_time`, `contract`, `intern`, `consultant` |
| `PayFrequency` | `weekly`, `bi_weekly`, `semi_monthly`, `monthly` |
| `LeaveStatus` | `pending`, `approved`, `rejected`, `cancelled`, `withdrawn` |
| `ImportStatus` | `queued`, `processing`, `completed`, `failed`, `partial` |

---

## 9. Timestamp Fields

### Standard

All timestamp columns store values in **UTC**. The application is responsible for timezone conversion at the presentation layer. The database never stores local times.

### Column Type

Use `TIMESTAMPTZ` (timestamp with time zone) for all timestamp columns. Never use `TIMESTAMP` (without time zone).

### Required Timestamp Columns

Every application table **must** include the following:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | When the row was first inserted |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | When the row was last updated, maintained by trigger or ORM hook |

### Optional Timestamp Columns

| Column | Type | Nullable | When to Use |
|--------|------|----------|-------------|
| `deleted_at` | `TIMESTAMPTZ` | NULL | All soft-deletable tables (see §11) |
| `effective_from` | `TIMESTAMPTZ` or `DATE` | NOT NULL | Effective-dated records (see §12) |
| `effective_to` | `TIMESTAMPTZ` or `DATE` | NULL | Effective-dated records (null = open-ended / currently active) |
| `published_at` | `TIMESTAMPTZ` | NULL | Content or announcement tables |
| `approved_at` | `TIMESTAMPTZ` | NULL | Approval workflow tables |
| `rejected_at` | `TIMESTAMPTZ` | NULL | Approval workflow tables |
| `processed_at` | `TIMESTAMPTZ` | NULL | Background job processing tables |

### `updated_at` Maintenance

`updated_at` must be automatically refreshed on every UPDATE. This is enforced by a PostgreSQL trigger (`set_updated_at`) applied to every table, **and** by the Drizzle ORM `.onUpdateNow()` modifier. Both must be present for defense in depth.

### DATE vs TIMESTAMPTZ for Effective Dating

- Use `DATE` when the effective date is a calendar day boundary (e.g., a salary revision effective on January 1).
- Use `TIMESTAMPTZ` when the effective moment is time-precise (e.g., a shift start time).
- Within a single table, `effective_from` and `effective_to` must be the same type.

---

## 10. Audit Fields

### Purpose

Audit fields track the identity of who performed each write operation. They are non-negotiable in an HRMS where every salary change, leave approval, and employee termination must be attributable to a specific actor.

### Required Audit Columns

Every application table **must** include:

| Column | Type | Nullable | FK Target | Description |
|--------|------|----------|-----------|-------------|
| `created_by` | `UUID` | NOT NULL | `users.id` | User who created the record |
| `updated_by` | `UUID` | NOT NULL | `users.id` | User who last updated the record |

### Conditional Audit Columns

| Column | Type | Nullable | FK Target | When to Add |
|--------|------|----------|-----------|-------------|
| `deleted_by` | `UUID` | NULL | `users.id` | All soft-deletable tables |
| `approved_by` | `UUID` | NULL | `users.id` | Approval workflow tables |
| `rejected_by` | `UUID` | NULL | `users.id` | Approval workflow tables |

### System Operations

When a record is created or modified by a system process (background job, migration, scheduled task) rather than a human user, a designated **system user UUID** (stored in `sys_config` or environment config) must be used. Never use null for audit columns.

### Full Audit Log

In addition to audit columns on each table, high-sensitivity tables (payroll, salary, termination, role assignments) must emit events to `sys_audit_logs`. The audit log captures: `tenant_id`, `table_name`, `record_id`, `action` (`INSERT`/`UPDATE`/`DELETE`), `changed_by`, `changed_at`, `old_values` (JSONB), `new_values` (JSONB).

---

## 11. Soft Delete Strategy

### Standard

Physical deletion (`DELETE` statement) is **prohibited** for all core HRMS entity tables. All deletions are logical / soft deletes.

### Mechanism

Soft delete is implemented via the `deleted_at` timestamp column:

- `deleted_at IS NULL` → the record is **active**
- `deleted_at IS NOT NULL` → the record is **soft-deleted**

When deleting, also set `deleted_by` to the acting user's ID.

### Tables Subject to Soft Delete

All tables in the following domains must implement soft delete:

- All employee data (`emp_*`)
- All organization setup (`org_*`)
- All leave records (`lve_*`)
- All payroll records (`pay_*`)
- All document records (`doc_*`)
- All approval records (`apv_*`)
- `users`, `roles`, `tenants`

### Tables Exempt from Soft Delete

The following may use hard delete (with appropriate caution):

- `sys_audit_logs` — immutable, append-only; rows are never deleted by the application
- `ntf_messages` — may be purged after a retention window
- Transient / queue tables

### Query Requirements

- All application queries against soft-deletable tables **must** include a `WHERE deleted_at IS NULL` clause unless the intent is explicitly to include deleted records (e.g., audit reports).
- A partial index `idx_{table}_tenant_id_active` (`WHERE deleted_at IS NULL`) must exist on every frequently queried soft-deletable table.
- ORM-level query utilities must enforce this automatically. Never rely on developers manually adding the filter.

### Cascading Soft Deletes

When soft-deleting a parent record (e.g., a department), child records (e.g., employees in that department) are **not** automatically soft-deleted. The application must handle the business logic separately. The database FK uses `ON DELETE RESTRICT` to prevent accidental orphaning.

### Hard Delete Policy

Hard deletes require a deliberate administrative action and must be logged to `sys_audit_logs` before execution. They are never exposed via standard API endpoints.

---

## 12. Effective Dating Strategy

### Purpose

Effective dating tracks how a record's state changes over time. This is critical for HRMS accuracy: a salary revision, a grade change, or a reporting line change must be effective from a specific date, while historical records remain queryable as they were.

### Pattern

Effective-dated records use **temporal versioning**: a new row is inserted for each change. The current state is the row where `effective_to IS NULL` (or `effective_to >= CURRENT_DATE`).

### Required Columns

| Column | Type | Description |
|--------|------|-------------|
| `effective_from` | `DATE` | Date from which this version is valid (inclusive) |
| `effective_to` | `DATE` | Date until which this version is valid (inclusive), null = open-ended |

### Applicable Tables

Effective dating is required on:

- `emp_compensations` — salary / CTC history
- `emp_grade_assignments` — grade history per employee
- `emp_designation_assignments` — designation / job title history
- `emp_department_assignments` — department history
- `emp_manager_assignments` — reporting line history
- `emp_employment_type_assignments` — employment type changes
- `org_salary_structures` — when structure rules change over time
- `pay_salary_components` — component rate changes
- `lve_policy_assignments` — leave policy changes per employee

### Constraint

Every effective-dated table must have:

```
CHECK (effective_to IS NULL OR effective_from <= effective_to)
```

Named: `chk_{table}_effective_date_order`

### Querying Current State

The "current" record is always:

```
WHERE effective_from <= CURRENT_DATE
  AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
  AND deleted_at IS NULL
```

This query pattern must be encapsulated in a reusable ORM utility function — never written inline across multiple places.

### Closing a Record

When a new version is created, the previous version's `effective_to` must be set to `new_effective_from - 1 day`. This is performed as an atomic transaction.

### Non-Effective-Dated Tables

Not every table requires effective dating. Lookup tables (`org_departments`, `org_grades`) that store current state only use `is_active` / `status` to toggle them. Effective dating adds complexity and should only be applied where a historical audit trail of changes is a genuine business requirement.

---

## 13. Status Field Strategy

### Standard

All tables that represent entities with a lifecycle use a `status` column of type `TEXT` with a CHECK constraint bound to a defined enum.

### Purpose vs `deleted_at`

| Mechanism | Purpose |
|-----------|---------|
| `deleted_at` | Marks a record as removed from the system (logical delete) |
| `status` | Tracks where a record is in its business lifecycle |

These are independent. A record can be `status = 'inactive'` and `deleted_at IS NULL` (it still exists, but is inactive). A deleted record (`deleted_at IS NOT NULL`) retains its last `status` for audit purposes.

### Rules

- `status` is always a `TEXT` column, not a boolean.
- Boolean `is_active` columns may coexist alongside `status` as a denormalized convenience field for performance, but `status` is the source of truth.
- Every `status` column must be bound to a named CHECK constraint.
- Status transitions are governed by the application layer. The database only enforces valid values, not valid transitions.

### Module Status Enums

Each module defines its own status enum. Cross-referencing the platform-level enums in §8 is required. Custom statuses must go through architecture review before being added.

#### Entity Lifecycle Statuses

Used on master data tables (`org_departments`, `org_grades`, `emp_profiles`, etc.):

```
draft → active → inactive → archived
```

- `draft` — created but not yet published / approved
- `active` — operational, visible to users
- `inactive` — temporarily disabled, hidden from default views
- `archived` — permanently closed, read-only for historical purposes

#### Approval Workflow Statuses

Used on transactional tables (`lve_requests`, `apv_workflow_instances`, etc.):

```
draft → pending → approved → rejected
                           → cancelled
                           → withdrawn
```

#### Import Statuses

Used on `import_jobs`, `import_batches`:

```
queued → processing → completed
                    → failed
                    → partial
```

### Indexing

Every `status` column on a table expected to be filtered by status must be indexed, typically as:

```
idx_{table}_tenant_id_status
```

---

## 14. Tenant Isolation Strategy

### Model

Evolve HRMS uses a **shared database, shared schema** multi-tenancy model. All tenants share the same PostgreSQL database and the same table definitions. Isolation is enforced at the row level via `tenant_id`.

### Tenant Identifier

Every multi-tenant table carries a `tenant_id` column:

| Column | Type | Nullable | FK Target |
|--------|------|----------|-----------|
| `tenant_id` | `UUID` | NOT NULL | `tenants.id` |

### Tables with `tenant_id`

Every table **except** the following must have `tenant_id`:

- `tenants` itself
- Pure lookup / reference tables that are global to the platform and shared across tenants (e.g., `sys_country_codes`, `sys_currency_codes`, `sys_timezones`)
- Internal system tables (`sys_migrations`, `sys_feature_flags` if global)

### Enforcement

Tenant isolation is enforced at **three layers**:

1. **Database layer**: `tenant_id` NOT NULL constraint + FK to `tenants` table.
2. **ORM layer**: All query builders must accept a `tenantId` parameter that is injected as a mandatory `WHERE tenant_id = ?` clause. A shared ORM utility (`withTenant(db, tenantId)`) wraps all queries to enforce this. Direct table queries bypassing this utility are prohibited.
3. **API layer**: The `tenant_id` is resolved from the authenticated session / JWT claim and must never be accepted from user input in request bodies or query parameters.

### Index Strategy for Tenant Isolation

- `tenant_id` must be the **first column** in every composite index on multi-tenant tables.
- A single-column index on `tenant_id` alone is required on every multi-tenant table (PostgreSQL will use it for tenant-wide queries and as the basis for composite index planning).

### Cross-Tenant Operations

- Cross-tenant data access is **prohibited** in standard application flows.
- Super Admin operations that require cross-tenant access must go through a dedicated, audited service layer — never via the standard tenant-scoped query utilities.
- Super Admin actions are logged to `sys_audit_logs` with both source and target `tenant_id` values recorded.

### Tenant Onboarding

When a new tenant is created:

1. A row is inserted into `tenants`.
2. A **tenant provisioning job** seeds the required reference/default data (default leave policies, holiday calendars, approval workflows) scoped to the new `tenant_id`.
3. All seed inserts use the designated system user UUID for `created_by` / `updated_by`.
4. The tenant `status` is set to `draft` until configuration is complete, then transitions to `active`.

### Data Residency Notes

The current architecture does not implement row-level security (PostgreSQL RLS) at the database layer. Tenant isolation relies entirely on application-layer enforcement. If RLS is adopted in the future, these standards will be versioned and updated. All schema definitions must remain compatible with a future RLS migration.

---

## Appendix A — Drizzle ORM Conventions

### Schema File Structure

```
lib/db/src/
  schema/
    index.ts          ← barrel export
    tenants.ts
    users.ts
    org/
      departments.ts
      designations.ts
      grades.ts
      ...
    emp/
      profiles.ts
      compensations.ts
      ...
    lve/
      policies.ts
      requests.ts
      ...
    pay/
      salary-structures.ts
      runs.ts
      ...
  enums/
    index.ts
    record-status.ts
    approval-status.ts
    employment-type.ts
    ...
  migrations/
    ...
```

### Drizzle Table Definition Checklist

Every Drizzle table definition must:

- [ ] Use the correct domain-prefixed table name string
- [ ] Declare `id` as UUID with application-generated UUID v7 default
- [ ] Declare `tenant_id` as UUID NOT NULL with FK (unless exempt)
- [ ] Include `created_at`, `updated_at` with `defaultNow()`
- [ ] Include `created_by`, `updated_by` UUID columns with FK to `users`
- [ ] Declare `deleted_at` nullable if the table is soft-deletable
- [ ] Name all FK constraints explicitly following `fk_{table}_{column}`
- [ ] Name all unique constraints explicitly following `uq_{table}_{column}`
- [ ] Name all check constraints explicitly following `chk_{table}_{description}`
- [ ] Define indexes for `tenant_id` and all FK columns

---

## Appendix B — Naming Quick Reference

| Object | Pattern | Example |
|--------|---------|---------|
| Table | `{prefix}_{plural_noun}` | `emp_profiles` |
| Column | `snake_case` | `base_salary_amount` |
| Primary Key column | `id` | `id` |
| Foreign Key column | `{entity}_id` | `department_id` |
| PK Constraint | `pk_{table}` | `pk_emp_profiles` |
| FK Constraint | `fk_{table}_{column}` | `fk_emp_profiles_department_id` |
| Unique Constraint | `uq_{table}_{column}` | `uq_emp_profiles_employee_code` |
| Check Constraint | `chk_{table}_{description}` | `chk_lve_requests_dates_order` |
| Index | `idx_{table}_{columns}` | `idx_emp_profiles_tenant_id_status` |
| Partial Index | `idx_{table}_{columns}_{qualifier}` | `idx_emp_profiles_tenant_id_active` |
| GIN Index | `gin_idx_{table}_{column}` | `gin_idx_emp_profiles_custom_fields_data` |
| Unique Index | `uq_{table}_{columns}` | `uq_emp_profiles_tenant_id_employee_code` |

---

*This document is the single source of truth for Evolve HRMS database design. All deviations require written approval from the Principal Database Architect and must be documented here as versioned amendments.*
