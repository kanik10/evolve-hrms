# ENUM Review

- **Use cases:** Static code-like values (e.g. gender, marital status, document status, leave status, attendance status) can use ENUM types **if** the list is truly fixed. However, for most HRMS lookups we recommend **lookup tables or check-constraints** instead. As a rule of thumb, use ENUMs **only for very small, unchanging lists**. Adding or removing an ENUM value requires an `ALTER TYPE` and can be cumbersome (pre-PG12 it couldn’t run inside transactions).  
- **Lookup tables:** For any list that needs metadata, ordering, or frequent updates by admins (e.g. *Expense Types*, *Benefit Types*, *Performance Rating Scales*, *Document Types*), use a lookup table with a foreign key. This allows adding new values without DDL changes.  
- **Check constraints:** For short, fixed lists that change very rarely (e.g. *pay frequency*, *currency code* if treated as fixed), a `TEXT` column with a `CHECK (...)` constraint is a flexible alternative to ENUM. It’s transactional and easier to evolve than ENUM. For example:  
  ```sql
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','terminated','pending'))
  ```  
- **Recommendations:**  
  - Tables like `employees` (e.g. employee status), `leave_requests` (status), or `payroll_run` (state) should **not** use hard-coded ENUMs unless values are truly static. Prefer a lookup or check-constraint for flexibility.  
  - Lookup tables (e.g. `document_types`, `holiday_types`, `kpi_categories`) are **mandatory** where business users may add values. Use foreign keys for referential integrity.  
  - ENUMs may be used *optionally* for fixed codes like state abbreviations or currency codes only if policy forbids changes; otherwise treat those as seeded lookup rows.  

# JSONB Review

- **Use cases:** PostgreSQL’s `JSONB` is excellent for *schema-flexible* data. Use it for columns that hold dynamic or variable attributes not known at design time. For example, an `employee` could have a `custom_attributes JSONB` column to store arbitrary key-values (hobbies, certifications), or a `documents` table could store OCR metadata or external system payloads. Also use JSONB for *metadata blobs* (e.g. workflow payloads, integration hooks). Common patterns include user settings, imported API data, or feature flags.  
- **Performance:** Index JSONB columns when you filter on their contents. Create a **GIN** index for containment queries (`@>`) and **expression indexes** on specific JSON keys you query often. For example:  
  ```sql
  CREATE INDEX idx_emp_attributes ON employees USING gin(custom_attributes);
  CREATE INDEX idx_emp_pref_color ON employees ((custom_attributes->>'favorite_color'));
  ```  
- **Caveats:** Avoid JSONB for fields frequently used in `WHERE`, `JOIN`, or `ORDER BY`. If a JSON field is actually a fixed attribute, it’s faster to make it a normal column. JSONB queries are slower than native columns and indexes only cover the queried paths. Don’t use JSONB as a crutch for a fixed schema.  
- **Recommendations:**  
  - **Optional**: Add JSONB to tables like `employees` (`custom_data`, `preferences`) or `workflow_tasks` (`metadata`), where flexible extension is needed. Ensure these columns have a default of `'{}'`.  
  - **Mandatory**: If any table stores highly variable attributes (e.g. dynamic workflow steps, extra audit info), JSONB can be useful. For example, an `audit_events` table could have a `details JSONB` for extra event data.  
  - **Indexing**: Any JSONB column that will be filtered (e.g. find employees with `jsonb @> {'remote': true}`) must have a GIN index for performance.  

# Index Optimization

- **Primary keys & types:** Use `BIGINT GENERATED ALWAYS AS IDENTITY` for all primary keys (or `UUID DEFAULT gen_random_uuid()` if globally unique IDs are needed). This is more robust than `SERIAL` and avoids overflow in very large tables. Always create indexes on all FKs, including many-to-many bridges.  
- **Composite indexes:** Essential in multi-tenant schemas. For any table with a `tenant_id`, create composite indexes beginning with `(tenant_id, ...)` to speed up typical queries that filter by tenant first. For example, on `employees` index `(tenant_id, department_id, last_name)` if common queries filter by tenant and department. Composite indexes reduce I/O by clustering on tenant. Make sure the column order matches query patterns.  
- **Partial indexes:** For *soft-delete* tables (with `deleted_at`), add a partial index like `WHERE deleted_at IS NULL`. This keeps indexes smaller by excluding deleted rows. For example:  
  ```sql
  CREATE INDEX idx_emp_active ON employees(id) WHERE deleted_at IS NULL;
  ```  
  This significantly improves performance when filtering only active rows. Similarly, if some status (e.g. `status='active'`) is very common, a partial index on that value can speed up lookups.  
- **Covering indexes (INCLUDE):** Use the `INCLUDE` clause to create covering indexes for index-only scans. If you frequently query columns `A,B` but also select column `C`, create an index on `(A,B) INCLUDE (C)`. This lets Postgres return results without visiting the table. For example, if `attendance` queries often filter by `(tenant_id,date)` and return `hours`, do:  
  ```sql
  CREATE INDEX idx_attendance_date ON attendance (tenant_id, date) INCLUDE (hours);
  ```  
  Covering indexes reduce I/O and improve query speed, especially on large tables.  
- **GIN/BRIN indexes:**  
  - **GIN:** For array or full-text fields. Already noted for JSONB. Also if you have full-text (TSVECTOR) columns for searching names or notes, add a GIN or GIST index. For example, an `employees` table might have `search_vector tsvector` indexed with `USING GIN`.  
  - **BRIN:** For very large append-only tables (log/audit tables, attendance logs, payroll items). If you have a monotonically increasing column (like a timestamp), a BRIN index dramatically reduces index size and insertion cost. For example, partitioned `attendance_logs` by month with a BRIN index on `log_timestamp` could yield 1,000× smaller index. Use BRIN on columns that correlate with physical order (typically timestamps or IDs in insertion order).  
- **Expression indexes:** Already covered in JSONB and covering. Also consider indexes on computed values (e.g. on `lower(username)` for case-insensitive lookup).  
- **Recommendations:**  
  - **Mandatory:** Index all foreign keys and any column used in JOIN/WHERE. Composite indexes on `(tenant_id, col1, col2)` should be considered essential. Use partial indexes for soft-deleted or status-flagged rows to avoid scanning irrelevant rows.  
  - **Optional:** Covering (INCLUDE) indexes on extremely hot query patterns for dashboard queries. GIN on JSONB or TSVECTOR columns for search. BRIN on logs/timeseries to save space.  

# Generated Columns

- **Purpose:** Use generated columns to store derived or concatenated values **inside the database**, avoiding repetitive calculation in application code. A generated column is *always computed* from other columns (like a persisted computed field). For example, if `employees` has `first_name` and `last_name`, create `full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED`. This ensures data consistency and speeds up queries that sort/filter by full name. Similarly, `net_salary` can be generated from salary components, or `years_of_service` from hire date. Generated columns act like stored views.  
- **Storage:** In PostgreSQL, generated columns can be *virtual* (computed on read) or *stored* (computed on write). We recommend **stored** (the default) for frequently accessed fields, so they appear in indexes.  
- **Affected tables:** Likely candidates include:  
  - `employees`: e.g. `full_name`, `age`, `tenure_years`.  
  - `payroll_items` or `payslips`: e.g. `net_pay = gross_pay - deductions`.  
  - `attendance`: e.g. `day_of_week` from date, if needed for reporting.  
  - `documents`: e.g. `file_extension` from filename.  
- **Benefits:** Generated columns eliminate redundancy and ensure correctness. They improve query performance by allowing indexes on computed values (an index on `full_name` avoids computing it at query time). They also keep logic centralized in the DB schema.  
- **Recommendations:**  
  - **Mandatory:** Use generated columns for any deterministic, read-heavy calculated fields (e.g. `full_name`, `net_salary`, `leave_days_used`). This reduces application logic and ensures uniform computation. The generation expression must be IMMUTABLE (no volatile functions).  
  - **Optional:** You may create virtual generated columns for very seldom-used fields (to save space), but note virtual columns have limitations (e.g. not indexable if using user-defined types).  

# Views & Materialized Views

- **Views (standard):** Use normal `CREATE VIEW` for convenience and encapsulation. For example, create views like `vw_employee_profile` that join `employees` with `departments`/`designations` for easier querying. Views enforce consistent joins and can simplify application queries. They are always up-to-date but run the underlying query each time.  
- **Materialized Views:** Use `MATERIALIZED VIEW` for **heavy aggregates or reports** that do not need to be real-time. For example, an **attendance_summary** materialized view could pre-aggregate daily attendance per department, or a **leave_balance_summary** for quick dashboard stats. Materialized views store the results physically, so reading them is very fast, but they must be refreshed to get updated data.  
  - For instance, a `sales_summary` example in PostgreSQL docs shows summarizing a large table by month and refreshing nightly. Similarly, we can summarize payroll costs by department per month or headcount by grade.  
  - Materialized views can have their own indexes for performance. Use them for data that changes slowly or for historical reports. Always schedule a refresh (e.g. nightly or on-demand) via a job or `REFRESH MATERIALIZED VIEW`.  
- **Recommendations:**  
  - **Views:** Create views for any complex joins or filters that are frequently used (e.g. active employees, organizational hierarchies). They’re mandatory for consistent abstraction.  
  - **Materialized Views:** Identify expensive, read-heavy queries (like year-to-date payroll totals, leave utilization charts). For these, a materialized view yields orders-of-magnitude faster reads. Mark them optional; they require refresh strategy but greatly speed up reporting.  

# Triggers & Functions

- **Update timestamps:** Add an `updated_at` timestamp and trigger on every table. A single plpgsql trigger function can set `NEW.updated_at = now()` on update. This is a mandatory pattern to ensure data timeliness. For example:  
  ```sql
  CREATE OR REPLACE FUNCTION update_updated_at() 
    RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```  
  Then attach `BEFORE UPDATE` triggers on all tables. This guarantees `updated_at` is maintained at the DB level (safer than relying on app code).  
- **Soft-delete & auditing:** If using soft deletes, consider a trigger to log deletions or fill `deleted_at`. Similarly, **audit triggers** (or the `pgaudit` extension) can capture changes. For example, trigger functions could insert into `audit_log` on INSERT/UPDATE/DELETE of sensitive tables. Use triggers judiciously; complex business logic is often better in the application.  
- **Business logic functions:** Implement common calculations in SQL functions if they may be reused by multiple services. For example, a function `calculate_net_salary(employee_id)` could encapsulate payroll rules. Stored procedures (v14+) can orchestrate multi-step operations (e.g. running a full payroll cycle with multiple table inserts). Use them for encapsulation, but keep business logic simple in DB to avoid hidden complexity.  
- **Deferred constraints:** Generally, foreign keys are enforced immediately. However, if any circular or multi-step integrity needs exist, mark those FKs as `DEFERRABLE INITIALLY DEFERRED` to allow batch operations in one transaction. This is optional and only needed for very specific cases (the design should avoid most cycles).  
- **Recommendations:**  
  - **Mandatory:** Implement the `update_updated_at` trigger on all tables. Use basic trigger functions for audit logging if required by compliance.  
  - **Optional:** Use PL/pgSQL functions for reusable calculations (e.g. leave accrual, salary components). Use stored procedures for complex workflows (e.g. month-end payroll) if you want them database-managed. Keep triggers simple (timestamps, cascading deletes) to avoid maintenance headaches.

# Partitioning Strategy

- **High-volume tables:** Partition large, append-only tables by range on a logical key (typically a date). Likely candidates:  
  - **Audit logs / Activity logs / Login history:** Partition by month or year on timestamp.  
  - **Attendance records:** Partition by month (attendance grows daily).  
  - **Payroll items / Payslips:** Partition by payroll run date or year.  
  - **Tenure metrics:** Partition large historical tables (like `employee_history`) if needed by year.  
- **Benefits:** Partitioning **vastly improves performance** for huge tables by pruning irrelevant partitions and reducing index size. As Amazon’s docs note, partitioning “provides for faster queries of large tables” and makes maintenance (like dropping old partitions) easier. For example, putting older audit logs in past partitions lets you archive them quickly without affecting new data.  
- **Approach:** Use PostgreSQL native declarative partitioning (PG10+). Range partition by date for time-series data. Optionally use the `pg_partman` extension for automated partition creation and maintenance.  
- **Recommendations:**  
  - **Mandatory:** Partition any table expected to grow beyond a few million rows over years (especially logging tables). This is strongly recommended for tables with timestamps as a natural partition key.  
  - **Optional:** For moderately sized tables, standard indexing may suffice. However, consider manual partitions for very high-growth tables to reduce index bloat and speed up deletes/archiving.  

# RLS & Multi-tenancy

- **Tenant isolation:** Every table that has a `tenant_id` (or `org_id`) should enable **Row-Level Security (RLS)** to enforce per-tenant visibility. RLS ensures that any user or API session only sees rows belonging to its tenant. For example, do:  
  ```sql
  ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON employees
    USING (tenant_id = current_setting('app.tenant_id')::uuid);
  ```  
  Then set the session variable `app.tenant_id` upon connection. This pattern ensures *each tenant can only access its own data*, greatly enhancing security.  
- **Session settings:** Instead of creating a DB user per tenant, use a single app role and set a `current_setting` (as in Crunchy’s example). All queries automatically filter by the tenant ID policy.  
- **Indexing:** On all tenant-scoped tables, create a composite primary key or index on `(tenant_id, id)` so that lookups by tenant are efficient.  
- **RLS caveats:** RLS rules add some overhead but are essential for SaaS isolation. Test thoroughly to ensure no policy gaps.  
- **Recommendations:**  
  - **Mandatory:** Enable RLS on every multi-tenant table with appropriate policies. This is non-optional for a true multi-tenant SaaS. Always include `tenant_id` in each table’s primary key or unique constraints (often composite) so the RLS filter is in the index.  
  - **Optional:** For single-tenant-specific tables (e.g. global lookups like `countries`, `currencies`), RLS is not needed. But ensure these global tables are protected from unwanted updates.  

# PostgreSQL Extensions

- **Essential extensions:**  
  - `pgcrypto`: For cryptographic functions (e.g. `gen_random_uuid()`, password hashing, encryption). Use it if you generate UUIDs or need hashing in triggers/functions.  
  - `uuid-ossp`: (Optional) For legacy UUID generation (v1, v4). If using `pgcrypto`’s `gen_random_uuid()`, `uuid-ossp` is unnecessary.  
  - `pg_trgm`: For similarity/search. Create `pg_trgm` to support full-text or fuzzy search (e.g. trigram indexes on `username`, `documents.title`). This greatly improves LIKE / ILIKE performance on text.  
  - `pgaudit`: For compliance-level auditing. It logs detailed SQL activity (session and object level). Consider it if regulatory audit trails are needed. Otherwise, standard logs or custom audit tables may suffice.  
  - `pg_partman`: (Optional) To manage partitions automatically. If many partitioned tables exist, this helps automate creation and maintenance of new partitions.  
  - `hstore`: (Optional) If you have many small key-value attributes and don’t need JSONB’s full capability, `hstore` is lighter (although JSONB is typically preferred nowadays).  
  - `tablefunc`: (Optional) For functions like `crosstab()` if you need pivot-table queries in SQL.  
  - `citext`: (Optional) For case-insensitive text columns (e.g. usernames) if desired; it auto-normalizes to lowercase for comparisons.  
- **Installation:** These should be created in the setup scripts (e.g. `CREATE EXTENSION pgcrypto; CREATE EXTENSION pg_trgm; CREATE EXTENSION pgaudit;`).  
- **Recommendations:**  
  - **Mandatory:** `pgcrypto` (for UUIDs, hashing) and `pg_trgm` (for advanced text search) are strongly advised.  
  - **Optional:** `pgaudit` for heavy audit logging (if not using custom solution), `pg_partman` if using partitioning heavily, and others as needed by features.  

# Final PostgreSQL Optimization Recommendations

- **Schema conventions:** Use `BIGINT GENERATED ALWAYS AS IDENTITY` for all PKs. Adopt consistent naming and data types. Ensure every FK column is indexed.  
- **Multitenancy:** Include `tenant_id` in all core tables. Always index `(tenant_id, id)` and enable RLS policies by tenant.  
- **Timestamps & Soft Deletes:** Add `created_at, updated_at` with triggers on all tables. Use `deleted_at` for soft deletes on entities needing undeletion. Add partial indexes on `WHERE deleted_at IS NULL`.  
- **Data modeling:** Replace inflexible ENUMs with lookup tables or check constraints. Convert fixed lookup tables to seeded master tables (e.g. countries, currencies, roles).  
- **Indexes:** Review query patterns and add composite indexes (especially including `tenant_id`) and covering indexes to match them. Use GIN on JSONB/TSVECTOR columns. Consider BRIN on logs/audit tables to save space.  
- **Performance tuning:** After schema, tune Postgres (shared_buffers ≈25% RAM, work_mem per query, effective_cache_size, etc.***). Use `pg_stat_statements` to find slow queries, then index or optimize. Employ connection pooling (pgBouncer) in production for high load.  
- **Security:** Enforce SSL, use strong passwords, apply `pgcrypto` for password hashing, enable `pgAudit` if regulations require it. Use RLS and DB roles per principle of least privilege.  
- **Future growth:** Document partition strategy (range partitions for high-growth tables). Plan regular vacuuming and archiving of old partitions. Use materialized views for analytics refresh.  
- **Summary:** The schema should leverage PostgreSQL features to enhance performance and safety. The **mandatory** items (bigint IDs, RLS, triggers for timestamps, FK indexes, lookup tables, core extensions) must be implemented. The **optional** optimizations (extra indexes, materialized views, specialized extensions) can be added iteratively as needed for performance. With these optimizations, the Evolve HRMS database will be scalable, secure, and maintainable.

