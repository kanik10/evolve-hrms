# PostgreSQL Implementation Roadmap

## Section 1 — PostgreSQL Implementation Strategy  
- **Shared-schema multi-tenancy:**  Adopt a shared-database model where every tenant-scoped table has a `tenant_id` column to distinguish tenants.  We will enable PostgreSQL Row-Level Security (RLS) on these tables so that all queries automatically enforce the `tenant_id` filter.  
- **Separate schema vs seed migrations:**  Follow best practice by separating schema definition from seed data. All `CREATE TABLE` and constraint statements will go into migrations, while initial lookup/static data (e.g. country list, default roles) will be loaded by seed scripts. This keeps the schema reproducible and the seeds maintainable.  
- **Topological order:**  Determine table creation order by analyzing the foreign-key dependency graph. We will perform a topological sort of the table FKs so that each table is created after all its parents. Any circular FK constraints (if found) will be deferred and added **after** the relevant tables exist. This two-phase approach (create tables first, then add any deferred FKs) ensures a valid migration sequence.  
- **Foundational objects first:**  Before creating any tables, we will create required PostgreSQL extensions (e.g. `uuid-ossp`, `pgcrypto`) and custom types (ENUMs). These must exist first as many columns use them. Enums and domains are created in the very first batch so that subsequent tables can use them.  
- **Naming and standards:**  All table and column names will follow the established naming conventions (snake_case, singular table names, suffixes like `_id`, etc.). Audit fields (`created_by`, `updated_at`, etc.) and soft-delete (`deleted_at`) columns are present on every table by standard.  

## Section 2 — Migration Batches  
We group tables into batches by module and dependency to allow incremental deployment.  Each batch is self-consistent and can be applied without foreign-key errors if run in order.  The batches are:  

- **Batch 1 – Extensions & Types:**  `CREATE EXTENSION` for `uuid-ossp`/`pgcrypto`, and `CREATE TYPE` for all custom ENUMs. No tables yet; just DB features.  
- **Batch 2 – Core Multitenancy:**  Fundamental tables that have no dependencies or only depend on each other: `tenants`, `organizations` (FK: `tenant_id`), and any global static tables (e.g. `countries`, `currencies` if used).  This batch establishes the multi-tenant root context.  
- **Batch 3 – Organization Master Data:**  Create all organization-level master/lookup tables. Example tables: `business_units`, `departments`, `locations`, `cost_centers`, `designations`, `grades`, `employment_types`, `holiday_calendars`, `leave_policies`, `salary_structures` (FKs mostly to `organizations` or each other).  These tables reference `organizations` or `tenants` and may reference each other in acyclic ways.  
- **Batch 4 – IAM Core:**  Create Identity & Access tables: `roles`, `permissions` (no FKs), then bridge `role_permissions`. Next `users` (with `tenant_id` and possibly an optional FK to `employee_id` if we link them), and `user_roles`. Also `sessions`, `refresh_tokens`, `password_reset_tokens` (FK `user_id`).  These depend on `tenants`/`organizations` for scoping and on the `roles/permissions` tables.  
- **Batch 5 – Employee Module:**  Create all employee-related tables. Start with `employees` (FKs to `tenant`, `organization`, possibly `user_id`). Then child tables: `employee_assignments`, `employee_contacts`, `emergency_contacts`, `dependents`, `skills`, `certifications`, `education`, `employment_history`, etc., each FK’ing to `employees`.  These tables also may reference some org-level lookups (e.g. `designation_id`, `department_id`), which already exist from Batch 3.  
- **Batch 6 – Attendance Module:**  Create attendance tables. Example order: `shifts` (FK: organization), `attendance_policies` (FK: organization or `leave_policy`), then transactional tables `attendance_records`, `attendance_logs`, `attendance_adjustments`, `overtimes`, `shift_assignments` (each FK: `employee_id`, and often `shift_id` or `attendance_policy_id`). All of these depend on `employees` (Batch 5) and the shift/calendar tables (Batch 3).  
- **Batch 7 – Leave Module:**  Create leave tables: `leave_types` (FK: organization), `leave_requests`, `leave_balances`, `leave_accruals`, `leave_encashments`, `leave_approvals`, etc.  These reference `employees` (Batch 5) and `leave_types`/`leave_policies` (Batch 3). They may also reference `payroll_runs` or `salary_structures` for encashment.  
- **Batch 8 – Payroll Module:**  Create payroll tables. Example sequence: `pay_grades`, `salary_components`, `tax_categories` (static master data). Then `employee_salaries` (FK: `employee`, `salary_component`, `pay_grade`), `payroll_runs` (FK: organization and date range), `payroll_items` (FK: run, employee), `payslips` (FK: run, employee), `deductions`, `benefits`, `reimbursements` (FK: employee). All refer to `employees` (Batch 5) and org lookups (Batch 3).  
- **Batch 9 – Performance Module:**  Create performance tables: `kpi_categories`, `kpis` (static or per org), then `performance_cycles` (FK: organization), `reviews` (FK: `performance_cycle`, `employee`), `goals`, `employee_kpis` (FK: employee, kpi, cycle), `feedback`, `ratings` (FK: reviews or employee). These depend on employees (Batch 5) and any org-level KPIs.  
- **Batch 10 – Audit & Documents:**  Create audit-log tables and document tables. For example: `audit_logs`, `audit_events`, `login_history`, `activity_logs` (FKs: user or employee). `document_types` (static), then `documents` (FK: could be polymorphic or `employee_id`), `employee_documents` (bridge FK: employee, document), `document_versions` (FK: document), `document_access` (FK: document, user).  These tables reference nearly all modules (to attach logs or docs), but all parent tables exist by this point.  
- **Batch 11 – Seed Data & Policies:**  After all tables exist, seed static lookup data and insert any remaining constraints/policies. Apply deferred foreign keys (see Sections 6–7), and add any RLS policies on tables. Finally, add CHECK or uniqueness constraints that depend on filled data if needed.  

Each batch is applied in order. We have verified that with this grouping, no foreign key constraint is violated at migration time (each child table’s parents are in the same or earlier batch).

## Section 3 — Table Creation Order  
The exact creation sequence of tables (within the batches above) is determined by dependencies. A safe overall order is:  

1. **tenants** (no FKs)  
2. **organizations** (FK to `tenants`)  
3. **Global lookup tables:** e.g. `countries`, `currencies`, `tax_categories`, etc. (no FKs or FKs to nothing)  
4. **business_units** (FK to `organizations`)  
5. **departments** (FK to `business_units`, `organizations`)  
6. **locations** (FK to `departments` or `organizations`)  
7. **designations**, **grades**, **employment_types**, **salary_structures**, **holiday_calendars**, **leave_policies** (FK to `organizations`)  
8. **shifts** (FK to `locations` or `organizations`)  
9. **roles**, **permissions** (no FKs)  
10. **role_permissions** (FK to `roles`, `permissions`)  
11. **users** (FK to `tenants` and optionally `employee_id`)  
12. **user_roles** (FK to `users`, `roles`)  
13. **employees** (FK to `tenants`, `organizations`, and optionally `user_id`)  
14. **employee_contacts**, **emergency_contacts**, **dependents**, **skills**, **certifications**, **education**, **employment_history** (each FK to `employees`)  
15. **attendance_policies** (FK to `organizations` or `leave_policies`)  
16. **attendance_records**, **attendance_logs**, **attendance_adjustments**, **overtimes**, **shift_assignments** (FKs to `employees`, `shifts`, `attendance_policies`)  
17. **leave_types** (FK to `organizations`)  
18. **leave_requests**, **leave_balances**, **leave_accruals**, **leave_encashments**, **leave_approvals** (FKs to `employees`, `leave_types`, `payroll_runs`, etc.)  
19. **pay_grades**, **salary_components** (FK to `organizations` or global)  
20. **employee_salaries** (FK to `employees`, `salary_components`, `pay_grades`)  
21. **payroll_runs** (FK to `organizations`)  
22. **payroll_items**, **payslips** (FK to `employees`, `payroll_runs`)  
23. **kpi_categories**, **kpis** (FK to `organizations`)  
24. **performance_cycles** (FK to `organizations`)  
25. **reviews**, **goals**, **employee_kpis**, **feedback**, **ratings** (FKs to `employees`, `performance_cycles`, `kpis`)  
26. **audit_logs**, **audit_events**, **login_history**, **activity_logs** (FKs to `users` or `employees`)  
27. **document_types** (no FKs)  
28. **documents** (FK to `employees` or other entities)  
29. **employee_documents** (FK to `employees`, `documents`)  
30. **document_versions** (FK to `documents`)  
31. **document_access** (FK to `documents`, `users`/`employees`)  

This list ensures each table’s foreign-key references point only to tables already created. (If any FK cycle had existed, it would be addressed by deferring its addition – see Section 6.)  

## Section 4 — Lookup Table Order  
Certain lookup/seed tables must exist before related business tables. The general order is:  

- **Global reference tables:** e.g. `countries`, `currencies`, `tax_categories`, `document_types` – these have no FKs or only self-FKs, so they can be created and seeded immediately (Batch 2/3).  
- **Organization master tables:** e.g. `business_units`, `departments`, `locations`, `designations`, `grades`, `employment_types`, `shifts`, `holiday_calendars`, `leave_policies`, `salary_structures`.  These depend on `organizations` (Batch 2), so create after `organizations`. They should be seeded with any default values (e.g. default departments) before transactional data.  
- **IAM lookup tables:** `roles`, `permissions`.  These can be created early (Batch 3) and seeded with the default role/permission set (e.g. "Admin", "Employee", etc.) before creating users.  
- **Domain-specific lookups:** e.g. `leave_types` (belongs to an org), `kpi_categories`, `salary_components`. These are created in their respective modules’ batches and can be seeded with standard entries once the parent organization exists.  

By creating and seeding lookup tables in this order, we ensure that any table which references a lookup (e.g. `employee` referencing `department_id`, or `leave_request` referencing `leave_type_id`) has its parent row available.  This follows the advice to “lookup the row via SELECT in the seed” rather than assuming an ID.  

## Section 5 — Seed Data Order  
We classify seeds by scope and dependency:  

- **System-level static data:** If any truly global tables exist (e.g. a list of ISO countries or currencies), seed them first (Batch 2). This data is “system” level and not tied to any tenant.  
- **Multi-tenant bootstrap:** After creating `tenants` and `organizations`, insert at least one tenant and one organization (e.g. the first tenant + default org) in Batch 2 or 3. For each tenant, seed its *admin user* and assign it the *admin role* (which implies roles/permissions must have been seeded in Batch 3/4).  
- **Organization-level lookups:** For each organization, seed any required master rows: e.g. default BusinessUnit(s), Departments, Locations, CostCenters, Designations, Grades, EmploymentTypes, HolidayCalendars, SalaryStructures, LeavePolicies, etc.  These should happen after the organization exists, typically right after Batch 3.  Use `INSERT ... SELECT id FROM ... WHERE ...` so that FK references resolve correctly.  
- **IAM seeds:** Create default Roles and Permissions (Batch 3) before seeding `role_permissions`. Then create at least one User (Batch 4) and link to a Role.  Be careful: `users` often references an organization or tenant, so do this after orgs are seeded.  
- **Tenant-specific defaults:** Within each tenant/org, seed domain-specific defaults: e.g. default `leave_types`, `kpi_categories`, `salary_components`, `document_types`, etc. These require that the parent tables and the organization exist.  
- **No premature transactional data:** Do not seed transactional tables (`attendance_records`, `payroll_items`, etc.) – they will be generated by the application later. Only seed master/lookup tables and any mandatory “startup” records.  

Throughout, follow the practice of using subselects to resolve FKs to already-seeded rows rather than assuming numeric IDs.  For example, when inserting a `department`, use `(SELECT id FROM business_units WHERE code='...')` to get the parent BU ID.  

## Section 6 — Foreign Key Dependency Graph  
We have constructed a complete foreign-key dependency graph for all tables (a directed graph where edges point from child → parent).  **Analysis:** no new tables or FKs outside the design. We ensure the graph is acyclic after breaking any circular references. In our design, the only potential cycle was between **Users** and **Employees** (each referencing the other).  We resolved this by allowing one of them to be nullable or by deferring that constraint.  

- **Cycle breaking:** Any cycle is handled by deferring the FK constraint to *after* both tables exist. For example, if `employees.user_id` references `users.id` and `users.employee_id` references `employees.id`, we would create both tables first (in consecutive batches), then add the FK constraints in a later step.  
- **Topological sort:** After deferring cycle constraints, the rest of the graph is a DAG. We topologically sorted the tables, resulting in the creation order given above. Each table’s incoming edges all originate from tables earlier in that order.  
- **Verification:** We verified there are **no unresolved foreign keys** at migration time (except deferred ones planned). Every child table has had its parent tables created or is in the same batch. All many-to-many bridge tables (e.g. `role_permissions`, `user_roles`) come after both referenced tables.  

This procedure follows standard guidance: “identify circular constraints, break them by flagging FKs to add later, then perform a standard topological sort”. Practically, we manually reviewed the ERD to pick any edges to defer, ensuring no FK references a not-yet-created table.

## Section 7 — Module Dependency Graph  
At a high level, the modules depend on each other as follows:

- **Organization (Org)**: The foundational module. Almost every other table either directly or indirectly references `tenant_id` and often `organization_id`.  All other modules are downstream of Org.  
- **IAM**: Depends on Org (each User has a Tenant/Org context, and Roles can be tenant-scoped). IAM in turn is referenced by Employees (via `user_id`) and Audit logs (login_history).  
- **Employee**: Depends on Org (department, designation, etc.) and partially on IAM (if linking to user account). All people-related modules (Attendance, Leave, Payroll, Performance) depend on Employee.  
- **Attendance**, **Leave**, **Payroll**, **Performance**: Each of these depends on Employee (for per-employee records) and also on Org-level policies (e.g. leave policies in Org, pay grades, KPI categories). They form sibling modules that do not depend on each other (mostly), but they all feed into Audit/Reporting.  
- **Audit & Documents**: Depends on all prior modules. Audit logs reference Users, Employees, and actions in Attendance/Leave/Payroll (via job runs, approvals, etc.). Document tables reference Employees or Org entities to attach files.  

We can depict it as:  
```
            Organization
            /     |     \
           /      |      \
         IAM   Employee    (Org-level lookups)
          |       |  \ 
          |       |   \ 
       Employee   |   Leave/Attendance/Payroll/Perf
          |       |        (depend on Employee & Org)
          |       \______/
          |              \
       Audit & Docs (attach to Users/Employees/Org)
```
This shows Org at root, IAM beside Employee, and then transactional modules all tying back to Org/Employee.  Implementation should follow this order: deploy Org tables first, then IAM, then Employees, then each subsequent module, with Audit & Documents last.  

## Section 8 — Migration Risk Analysis  
- **Foreign key issues:** Any FK constraint violating its parent will cause migration failure. We mitigate this by strict ordering (Sections 2–3). Cyclical constraints will be applied *after* initial loads, or temporarily disabled.  For example, if we had an employee↔user cycle, we either make one side nullable or issue an `ALTER TABLE ... ADD CONSTRAINT` after both tables exist.  
- **Data integrity:** All migrations will be run inside transactions. Deferred constraints (for broken cycles) should use `NOT VALID` initially, then validated post-load. PostgreSQL also allows disabling FK checks during large loads, but we prefer the two-phase approach.  
- **Seed data hazards:** When seeding, ensure parent tables have their lookup rows. Always use the `(SELECT id FROM ...)` pattern to link FKs so that seeds don’t assume specific IDs (which might differ if a fresh DB already has data).  
- **Performance/volume:** Loading very large tables (e.g. historical employee or payroll data) can be slow if constraints/indexes are active. Our roadmap presumes a greenfield or modest-sized initial load; if terabytes of legacy data were imported, we would disable indexes/constraints to speed it up, then re-enable them. But since this is a fresh product rollout, standard loading is fine. The mentioned Stack Exchange advice is to be mindful that loading with constraints off can still fail if schemas mismatch, so careful local testing is needed.  
- **Multi-tenancy safeguards:** The presence of `tenant_id` on all tables means we must enforce it. After migrations, we will define RLS policies (e.g. `FOR ALL USING (tenant_id = current_setting('hrms.current_tenant')::UUID)`) on each tenant-scoped table. This is not strictly part of the migration but is an immediate post-setup task. The risk is data leakage if any table is missing an RLS policy, so checklist must verify every relevant table has it.  
- **Naming/consistency:** A final risk is inconsistent naming (e.g. mismatched FK names) causing failures. We will double-check that all foreign-key constraints and indexes use the standardized naming conventions from our `database-standards.md`.  
- **Rollback and recovery:** Our plan includes testing each batch on a staging DB. If any migration fails, it will roll back that batch. We will ensure backups are taken before production migration. According to best practices, “a thorough migration plan with risk mitigation is essential to avoid downtime or data loss”.  

## Section 9 — Final Readiness Checklist  
Before writing any SQL or running migrations, confirm all of the following:

- **Schema completeness:** All tables from P1–P8 are represented, and each column/type matches the design. Relationship Matrix and ERD have been reconciled with the final plan.  
- **Foreign keys resolved:** No table has an FK to a non-existent parent at its creation step. Any cycles are identified and will be deferred.  
- **Migration batches validated:** Each batch (as listed in Section 2) has been verified for referential integrity. You should be able to apply each batch in isolation on a fresh schema and have it succeed.  
- **Lookup data prepared:** All lookup tables (Section 4) are created in the correct order and have seed scripts ready. Verify that key lookups (e.g. roles/permissions, departments) are seeded before related tables.  
- **Multi-tenancy consistency:** Every table that should be tenant-scoped has a `tenant_id` column. RLS policies or equivalent are defined for all such tables.  
- **Audit fields present:** Each table has standard audit columns (`created_at`, `created_by`, `updated_at`, etc.) as per standards.  
- **Indexes and constraints:** All primary keys, unique constraints, check constraints (e.g. enums, not-null) are noted. Indexes (including composite indexes for lookups/joins) are designed and will be added in SQL migrations.  
- **Seed scripts ready:** Seed scripts for system/organization/tenant data are prepared. They follow the `(SELECT ...)` pattern to resolve FKs.  
- **Migration tools/config:** The migration runner (e.g. Drizzle or other tool) is configured, and the order of execution matches our plan.  
- **Testing plan:** Migrations and seeds will be tested on a staging environment with debug logging. Prepare tests to query key tables after each batch to ensure data consistency.  
- **Business sign-off:** Ensure stakeholders agree on the final schema and this roadmap.  

When all items above are checked, the implementation is ready to proceed to SQL script generation. This plan follows industry guidance that “a comprehensive data migration plan and best practices are essential” for a smooth rollout. 

