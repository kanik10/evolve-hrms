# Evolve HRMS — Domain Model Review

**Classification:** Internal Engineering Reference  
**Status:** Pre-Database Design Review  
**Scope:** All entity definition documents produced to date  
**Documents Reviewed:**
- `docs/database-standards.md`
- `docs/entity-inventory.md`
- `docs/iam-module-entity-definitions.md`
- `docs/org-module-entity-definitions.md`
- `docs/employee-domain-entity-definitions.md`
- `docs/attendance-module-entity-definitions.md`
- `docs/leave-module-entity-definitions.md`
- `docs/payroll-module-entity-definitions.md`
- `docs/workflow-engine-entity-definitions.md`
- `docs/documents-module-entity-definitions.md`
- `docs/audit-compliance-module-entity-definitions.md`

---

## Review Summary

| Category | Issues Found | Critical | Moderate | Minor |
|----------|-------------|----------|----------|-------|
| Duplicate Entities | 2 | 1 | 1 | — |
| Missing Entities | 14 | 5 | 6 | 3 |
| Duplicate / Redundant Fields | 5 | 1 | 3 | 1 |
| Normalization Issues | 5 | 2 | 2 | 1 |
| Circular FK Dependencies | 2 | 1 | 1 | — |
| Business Rule Conflicts | 8 | 3 | 4 | 1 |
| Missing Relationships | 7 | 3 | 3 | 1 |
| Module Boundary Ambiguities | 4 | 1 | 2 | 1 |
| **Total** | **47** | **17** | **22** | **8** |

**Severity key:** Critical = blocks correct schema design or creates data integrity gaps; Moderate = produces incorrect behavior or reporting; Minor = inconsistency or maintainability concern.

---

## 1. Duplicate Entities

### 1.1 — Employee Document defined in two modules `[CRITICAL]`

**Where:** `employee-domain-entity-definitions.md §9` and `documents-module-entity-definitions.md §5`

Both documents provide a full entity definition for Employee Document with different field sets. The entity inventory places ownership under the Employee module. The Documents module redefines it with a richer model (verification lifecycle, `submission_method`, `is_primary`, `expiry_alert_days_before`).

**Conflict:** Two canonical definitions of the same entity, owned by different documents. The field lists do not match — the Documents module version is significantly more complete.

**Resolution:** Employee Document is a Documents module concern — it bridges an employee to a file. The Employee module document (§9) should be replaced with a cross-reference section pointing to `documents-module-entity-definitions.md §5`. All `emp_documents` table references in the codebase should resolve to `doc_employee_documents`.

---

### 1.2 — Leave Type owned by Organization module but fully defined in Leave module `[MODERATE]`

**Where:** `entity-inventory.md` (Owner Module = Organization); `leave-module-entity-definitions.md §1` (full definition with all business rules)

The entity inventory places Leave Type under Organization Setup with Owner Module = Organization. The Leave module document contains the complete entity definition, including all business rules, validations, and lifecycle.

**Conflict:** Two competing canonical sources for Leave Type's business rules and field list.

**Resolution:** Leave Type's business logic (accrual mechanics, encashment rules, statutory flags) is a Leave domain concern, not an Org concern. Move Leave Type, Leave Policy, and Leave Policy Rule out of the Organization module's ownership and into the Leave module. The Org module document may reference them as "used by the Leave module." Update the entity inventory accordingly.

---

## 2. Missing Entities

### 2.1 — Employee Pay Group Assignment `[CRITICAL]`

**Where:** `payroll-module-entity-definitions.md §1` (Pay Group Business Rules 1–2); `entity-inventory.md` (Pay Group listed, no assignment entity)

The Payroll module states: "Every active employee must belong to exactly one Pay Group." It then says this is "via Pay Group Membership on Employment Record or Leave Policy Assignment." However, neither Employment Record nor Leave Policy Assignment has a `pay_group_id` field defined anywhere. There is no junction entity and no FK path from an employee to their Pay Group.

**Impact:** Cannot process a Payroll Run. The Pay Group membership requirement is architecturally orphaned.

**Resolution:** Add `pay_group_id` as a required FK field to Employment Record. This is the correct home: when employment terms change (new contract, new legal entity), the Pay Group changes too. Add this FK to the Employment Record required fields list. If split Pay Group membership were ever needed, a separate assignment entity would be required, but a single FK on Employment Record is sufficient for the current model.

---

### 2.2 — Employee Holiday Calendar Assignment `[CRITICAL]`

**Where:** `employee-domain-entity-definitions.md §4d` (Location Assignment Business Rule 2); `org-module-entity-definitions.md §6` (Location Relationships)

Location Assignment Business Rule 2 states: "A Location change triggers a re-evaluation of the employee's applicable Holiday Calendar." However, no FK from Location to Holiday Calendar is defined in Location's field list, and no entity records which Holiday Calendar an employee actually follows. A Location may have multiple Holiday Calendars (different years, regional options).

**Impact:** Leave Request day counting, attendance day classification (holiday vs. working day), and Leave Balance initialization are all broken without a defined Holiday Calendar assignment path.

**Resolution:**
1. Add `holiday_calendar_id` FK to the Location entity's required fields — this is the default calendar for all employees at that location.
2. Add an optional `holiday_calendar_id` override to Location Assignment (§4d) — allows individual employees at the same location to follow a different calendar (e.g., different state domicile for regional holidays).
The effective resolution order: Employee Location Assignment override → Location default → Legal Entity default.

---

### 2.3 — Employee Personal Details / Sensitive PII separation contradiction `[CRITICAL]`

**Where:** `entity-inventory.md` (Employee Personal Details listed as a separate entity); `employee-domain-entity-definitions.md §2` (PAN, Aadhaar, DOB on Employee Profile directly)

The entity inventory explicitly models "Employee Personal Details" as a separate entity with the note: "Stored separately for access control." The employee domain definitions place PAN, Aadhaar, date of birth, passport, and other sensitive PII directly in Employee Profile's optional fields. These two approaches are architecturally incompatible.

**Impact:** If sensitive PII is on Employee Profile, row-level access control requires column masking across a wide table. If it is in a separate entity, access control is enforced at the JOIN level, which is cleaner for RBAC but doubles the read path for standard employee views.

**Resolution:** Make an explicit architectural decision and update both documents to be consistent.

- **Option A (simpler):** Remove Employee Personal Details from the entity inventory. Keep sensitive fields on Employee Profile. Enforce column-level masking in the application layer using the `employee:profile:view_sensitive` permission. Update the inventory note.
- **Option B (cleaner for access control):** Extract all sensitive PII fields (DOB, gender, marital status, PAN, Aadhaar, passport, UAN) from Employee Profile into a separate `emp_personal_details` entity (1:1 with Employee Profile). Fully define this entity in the employee domain definitions. The profile table becomes safe to expose to broader roles without masking concerns.

**Recommendation:** Option B. The employee profile table is read by nearly every module. Separating PII ensures that managers who can read employee operational data cannot inadvertently access government identifiers.

---

### 2.4 — Leave Lapse Event `[CRITICAL]`

**Where:** `leave-module-entity-definitions.md` (Leave Balance ledger model)

The Leave Balance ledger explicitly lists: `Lapsed = carry-forward days that expired unused` and "Lapse debits → Leave Lapse events (year-end processing)." However, no Leave Lapse entity is defined anywhere in the leave module definitions.

**Impact:** The year-end lapse computation has no table to write to. The Leave Balance's `lapsed_days` field cannot be traced back to an event record, breaking the ledger invariant ("all debits must be backed by a source transaction").

**Resolution:** Define a `lve_leave_lapse` entity with fields: `id`, `tenant_id`, `employee_id`, `leave_type_id`, `leave_balance_id`, `lapsed_days`, `leave_year`, `lapse_date`, `policy_rule_id` (the rule that governed the carry-forward cap), `created_at`. This is structurally similar to Leave Accrual but represents a debit event at year-end.

---

### 2.5 — Session entity missing from IAM `[CRITICAL]`

**Where:** `audit-compliance-module-entity-definitions.md` (Login Event, Audit Log — both reference `session_id`); `iam-module-entity-definitions.md` (no Session entity)

The Audit module introduces `session_id` as a first-class correlation key shared between Login Events and Audit Logs. Without a Session entity, there is no authoritative record of which sessions are currently active, no mechanism for forced session invalidation ("sign out everywhere"), and no structured way to list a user's active devices.

**Impact:** Cannot implement forced logout, session listing, security incident response (terminate all sessions for a compromised account), or concurrent session limits.

**Resolution:** Add a `Session` entity to the IAM module with fields: `id` (= `session_id` used in audit), `tenant_id`, `user_id`, `status` (`active` / `expired` / `revoked`), `login_method`, `ip_address`, `device_fingerprint`, `user_agent`, `geo_country`, `created_at` (= login time), `expires_at`, `last_activity_at`, `revoked_at`, `revoked_by`. This entity is the lifecycle record for a session; Login Events with `session_id` are the event log within it.

---

### 2.6 — Employee Bank Account `[MODERATE]`

**Where:** `entity-inventory.md` (listed under Employee); `employee-domain-entity-definitions.md` (not defined)

Employee Bank Account is listed in the entity inventory with lifecycle `pending_verification → active → inactive` and noted as referenced by Pay Run for disbursement. It does not appear in the employee domain entity definitions document.

**Resolution:** Define the entity in employee domain definitions. Required fields at minimum: `id`, `tenant_id`, `employee_id`, `account_holder_name`, `bank_name`, `ifsc_code` (India), `account_number` (masked display), `account_type` (`savings`, `current`, `salary`), `is_primary`, `verification_status`, `verified_by`, `verified_at`. The account number must be stored encrypted at rest and never returned unmasked in API responses.

---

### 2.7 — Employee Compensation (Salary Structure Assignment) `[MODERATE]`

**Where:** `payroll-module-entity-definitions.md §4` (cross-reference to employee domain); `entity-inventory.md` (listed); `employee-domain-entity-definitions.md` (no definition)

Employee Compensation / Salary Structure Assignment is referenced in Payroll as "full definition in `docs/employee-domain-entity-definitions.md`" but that document does not define it. The Payroll module cannot be correctly implemented without this entity.

**Resolution:** Define in employee domain definitions: effective-dated CTC, gross, basic salary figures per revision, plus `salary_structure_id` FK to the applicable structure. This is the bridge between the Org module's Salary Structure template and the individual employee's pay numbers.

---

### 2.8 — Employee Education and Employee Work Experience `[MODERATE]`

**Where:** `entity-inventory.md` (both listed); `employee-domain-entity-definitions.md` (neither defined)

Both entities are in the inventory but absent from the definitions document. These are needed for onboarding, background verification workflows, and the employee profile view.

**Resolution:** Define both in employee domain definitions. Employee Education fields: institution, degree, subject, year of passing, grade/percentage, `verification_status`. Employee Work Experience fields: employer name, designation, start/end date, responsibilities, `is_verified`.

---

### 2.9 — Exit Record `[MODERATE]`

**Where:** `entity-inventory.md` (Exit Record as a separate entity with clearance/FNF tracking); `employee-domain-entity-definitions.md §3` (exit fields on Employment Record)

Employment Record has `exit_type`, `exit_reason`, `exit_reason_detail`, `last_working_date`, `rehire_eligibility` directly on it. The entity inventory separately lists "Exit Record" with "clearance status, FNF status." The boundary between these two is undefined.

**Resolution:** Separate concerns clearly:
- Employment Record retains only the contractual exit facts: `exit_type`, `last_working_date`. Remove `exit_reason_detail`, `rehire_eligibility` from Employment Record.
- Define Exit Record as the operational exit workflow entity: `initiated_at`, `resignation_date` (if applicable), `exit_interview_date`, `exit_reason`, `exit_reason_detail`, `clearance_status` (`pending_clearance` → `clearance_complete`), `fnf_status` (`pending` → `processed`), `fnf_amount`, `rehire_eligibility`, `rehire_notes`, `noc_document_id`. Exit Record lifecycle: `initiated → clearance_pending → clearance_complete → fnf_processed → closed`.

---

### 2.10 — Document Template and Generated Document `[MODERATE]`

**Where:** `entity-inventory.md` (both listed under Documents); `documents-module-entity-definitions.md` (not defined — document only covers 7 entities)

Both entities are declared in the inventory. They are required for offer letter generation, experience letters, and appointment letters referenced across the Employee and Payroll modules.

**Resolution:** Add Document Template and Generated Document to the Documents module definitions.

---

### 2.11 — Attendance entity inventory vs. module definitions mismatch `[MINOR]`

**Where:** `entity-inventory.md` (5 entities: Attendance Record, Attendance Adjustment, Shift Roster, Shift Roster Entry, Overtime Record); `attendance-module-entity-definitions.md` (8 entities: Attendance Log, Attendance Day, Shift Roster, Shift Roster Entry, Timesheet, Timesheet Entry, Overtime Record, Attendance Adjustment, Regularization Request)

The attendance module definitions use a two-layer architecture (Attendance Log + Attendance Day) instead of the single "Attendance Record" in the inventory. Timesheet, Timesheet Entry, and Regularization Request are also present in the definitions but not the inventory.

**Resolution:** Update the entity inventory Section 4 to reflect the actual model: replace "Attendance Record" with "Attendance Log" and "Attendance Day"; add Timesheet, Timesheet Entry, and Regularization Request. Update the entity count summary row.

---

### 2.12 — IAM sub-entities missing from entity inventory `[MINOR]`

**Where:** `entity-inventory.md` (no User Identity, no Access Scope); `iam-module-entity-definitions.md §2, §7` (both fully defined)

User Identity and Access Scope are fully defined entities in the IAM document but absent from the inventory.

**Resolution:** Add both to the entity inventory Section 1 (Platform Core).

---

### 2.13 — `sys_audit_logs` vs. `aud_audit_logs` inconsistency across all modules `[MINOR]`

**Where:** Every module document's "Audit Requirements" section references `sys_audit_logs`; the Audit & Compliance module defines `aud_audit_logs` with the `aud_` prefix

All cross-module audit requirements sections must be updated to reference `aud_audit_logs`. The `sys_` prefix referenced throughout older module documents is stale.

**Resolution:** Update all audit requirement sections in all module documents to reference `aud_audit_logs`. Update `docs/database-standards.md` to add the `aud_` prefix to the domain prefix table.

---

## 3. Duplicate / Redundant Fields

### 3.1 — Statutory identifiers on both Organization and Legal Entity `[CRITICAL]`

**Where:** `org-module-entity-definitions.md §2` (Organization); `org-module-entity-definitions.md §3` (Legal Entity)

Organization has: `pan_number`, `tan_number`, `gst_number`, `cin_number`, `epf_registration_number`, `esic_registration_number`, `pt_registration_number`.

Legal Entity Business Rule 4 explicitly states: "Statutory registration numbers (PAN, TAN, GST, EIN) belong to the Legal Entity, not the Organization."

Despite this rule, these fields appear on Organization too. For single-entity companies, this creates two rows with identical values. For multi-entity groups, the Organization-level values are ambiguous (which Legal Entity's numbers are they?).

**Resolution:** Remove all statutory identifier fields from Organization. Organization retains only brand and configuration data: `registered_name`, `display_name`, `logo_url`, `country_code`, `currency_code`, `fiscal_year_start_month`, `default_timezone`, `industry_type`, `website_url`. All statutory identifiers live exclusively on Legal Entity.

---

### 3.2 — `accrual_basis` / `accrual_type` vocabulary divergence `[MODERATE]`

**Where:** `leave-module-entity-definitions.md §1` (Leave Type: `accrual_basis` values `upfront`, `monthly`, `on_demand`); Leave Policy Rule (Org module cross-reference): `accrual_type` values `upfront`, `monthly`

Two different field names for the same concept, and Leave Policy Rule omits the `on_demand` value that Leave Type supports. If a Leave Type is configured as `on_demand`, no Leave Policy Rule can correctly express the corresponding accrual behavior.

**Resolution:** Standardize to `accrual_type` across both entities. Add `on_demand` to Leave Policy Rule's valid `accrual_type` values. Leave Type is the type-level permission; Leave Policy Rule is the policy-level configuration — both must share the same vocabulary.

---

### 3.3 — Exit fields split across Employment Record and Exit Record `[MODERATE]`

**Where:** `employee-domain-entity-definitions.md §3` (Employment Record optional fields); `entity-inventory.md` (Exit Record)

`exit_type`, `exit_reason`, `exit_reason_detail`, `last_working_date`, `rehire_eligibility` are on Employment Record. These same concepts are implied by the Exit Record entity in the inventory. The duplication is compounded by the fact that Exit Record is not yet defined, leaving its exact field set unknown.

**Resolution:** As described in Missing Entity §2.9 — establish the boundary. Employment Record keeps only the contractual facts needed to close the record; Exit Record owns the operational exit process. Remove `exit_reason_detail` and `rehire_eligibility` from Employment Record; those belong on Exit Record.

---

### 3.4 — `document_type_id` denormalized on Employee Document `[MODERATE]`

**Where:** `documents-module-entity-definitions.md §5` (Employee Document required fields)

Employee Document has `document_type_id` as a required field, noted as "denormalized from Document File for query performance." However, Document File already has `document_type_id`. If Document File's type is ever corrected, Employee Document's copy diverges silently.

**Resolution:** Either:
- Remove `document_type_id` from Employee Document and accept the JOIN cost in list queries (preferred — removes the consistency risk).
- If the denormalization is kept for performance, add a validation rule and application-layer constraint ensuring Employee Document's `document_type_id` always equals its Document File's `document_type_id`. Document the denormalization explicitly as an intentional optimization with its consistency contract.

---

### 3.5 — `registered_address` embedded on three entities with inconsistent structure `[MINOR]`

**Where:** Organization, Legal Entity, and Location all embed address data as fields (line1, line2, city, state, postal_code) without a shared structure contract

These three entities each embed address fields without a standardized structure. Field names differ slightly (`address_line_1` vs. `registered_address` as a blob vs. individual fields on Location).

**Resolution:** Define a shared address structure specification in `docs/database-standards.md` — the canonical set of address columns and their naming. Every entity that embeds an address must use the same column names. This is not a normalization issue (embedding is fine for these entities; they have one address each) but a naming consistency issue.

---

## 4. Normalization Issues

### 4.1 — Cost Center Assignment unique constraint directly contradicts split allocation `[CRITICAL]`

**Where:** `employee-domain-entity-definitions.md §4e` (Cost Center Assignment)

The entity simultaneously states:

- **Unique Constraint:** "At most one Cost Center Assignment per employee where `effective_to IS NULL`"
- **Business Rule 3:** "Multiple Cost Center Assignment rows exist for the same employee with the same `effective_from` date — one per Cost Center — with their `allocation_percent` values summing to 100"

A partial unique index on `(employee_id) WHERE effective_to IS NULL` enforces at most one row, making the split allocation model impossible to store.

**Resolution:** Remove the partial unique index entirely. Replace with:
1. A partial unique index on `(tenant_id, employee_id) WHERE effective_to IS NULL AND is_primary = true` — enforces exactly one primary cost center
2. An application-level constraint: sum of `allocation_percent` for all rows where `(employee_id, effective_from)` matches and `effective_to IS NULL` must equal 100
3. A check constraint: `allocation_percent BETWEEN 1 AND 100`

---

### 4.2 — `location_ids` array field on Department violates 1NF `[CRITICAL]`

**Where:** `org-module-entity-definitions.md §5` (Department optional fields)

Department has `location_ids` as an array of Location UUIDs. This is a multi-valued attribute stored as an array, violating first normal form and making FK constraints, join queries, and cascade logic impossible to enforce at the database level.

**Resolution:** Remove `location_ids` from Department. Replace with a proper junction table `org_department_locations (department_id, location_id, is_primary, created_at, created_by)`. This enables FK constraints to both Department and Location, supports cascade rules when a Location is archived, and allows correct queries ("all departments operating from this location").

---

### 4.3 — Location has no `holiday_calendar_id` FK in its field definitions `[MODERATE]`

**Where:** `org-module-entity-definitions.md §6` (Location — Relationships mentions Holiday Calendar; field list does not include `holiday_calendar_id`)

Location's Relationships section says "One Location → One Holiday Calendar" but no corresponding FK field is defined in Location's required or optional field tables.

**Resolution:** Add `holiday_calendar_id` to Location's optional fields. It should reference the Holiday Calendar that applies to employees at this location by default. For locations where multiple calendars apply (e.g., different applicable calendars by year), the Holiday Calendar's own FK to Location (or the proposed junction from §2.2) handles the one-to-many direction.

---

### 4.4 — Assignment sub-entities missing standard audit columns `[MODERATE]`

**Where:** `employee-domain-entity-definitions.md §4a–§4g` (all seven Assignment sub-entities)

Database standards require `created_at`, `updated_at`, `updated_by` on every table. All seven assignment entities (4a Department Assignment through 4g Leave Policy Assignment) only list `created_by` in their required fields. None include `created_at`, `updated_at`, or `updated_by`.

**Resolution:** Add the missing standard columns to all seven assignment entity field tables: `created_at` (required), `updated_at` (required), `updated_by` (required FK to User). The effective-dating pattern does not exempt these entities from standard audit columns — `updated_by` is still needed to track who closed the record (`effective_to` is set by an UPDATE to the existing row).

---

### 4.5 — `photo_url` on Employee Profile should be a proper FK `[MINOR]`

**Where:** `employee-domain-entity-definitions.md §2` (Employee Profile optional fields)

Employee Profile Business Rule 10 states: "The `photo_url` must be stored as a reference to the Document store, not as binary data directly in the profile." However, `photo_url` is defined as a URL string, not as a `document_file_id` FK to `doc_files`. A plain URL string cannot enforce referential integrity, carry access controls, or respect the Documents module's lifecycle.

**Resolution:** Replace `photo_url` with `profile_photo_document_id` FK to `doc_files`. This enforces that the photo goes through the standard document upload pipeline with proper access control, soft-delete, and lifecycle management. The URL is derived at API response time from the Document File's current version.

---

## 5. Circular FK Dependencies

### 5.1 — Document File ↔ Document Version bidirectional FK `[CRITICAL]`

**Where:** `documents-module-entity-definitions.md §2` (Document File: `current_version_id` FK to Document Version); `documents-module-entity-definitions.md §3` (Document Version: `document_file_id` FK to Document File)

The two entities reference each other directly: Document File → Document Version → Document File. This creates a mutual FK cycle. At insert time, Document File must be created first (Document Version doesn't exist yet), requiring `current_version_id = null`. Then Document Version is created with `document_file_id` set. Then Document File is UPDATED to set `current_version_id`. This UPDATE breaks the immutability expectation and requires either a nullable FK with a deferred constraint or a different design.

**Concrete problem:** Most FK constraint validators and ORMs will refuse to create two tables with mutual FKs without deferrable constraints. Drizzle ORM's TypeScript-based schema definition does not natively support deferrable FKs without raw SQL.

**Resolution:** Remove `current_version_id` from Document File entirely. The current version is derived at query time:

```sql
SELECT * FROM doc_document_versions
WHERE document_file_id = $id AND is_current_version = true AND status = 'active'
LIMIT 1;
```

This eliminates the circular dependency, the two-step insert pattern, and the UPDATE requirement. The `is_current_version` boolean on Document Version remains as the authoritative marker; it is updated atomically when a new version is activated. Add a partial unique index on `(document_file_id) WHERE is_current_version = true AND status = 'active'` to enforce the single-current-version invariant without a circular FK.

---

### 5.2 — BU Head / Department Head → Employee → Department/BU → Head (logical cycle) `[MODERATE]`

**Where:** `org-module-entity-definitions.md §4, §5` (Business Unit, Department); `employee-domain-entity-definitions.md §4a` (Department Assignment)

Business Unit → `bu_head_employee_id` → Employee Profile → Department Assignment → Department → `department_head_employee_id` → Employee Profile.

This is a logical cycle, not a direct circular FK, but it creates an ordering problem at initial tenant setup: you cannot create a Department Head employee before their Department exists, and you cannot set the Department Head before the employee exists. The bootstrapping sequence must be: create org structure first (Tenant → Legal Entity → BU → Dept → Grade/Location) → create employee → assign employee as head.

**Resolution:** Enforce at the database and application level that all head employee FKs are nullable at entity creation and may be set only after the employee exists. Validate that the Department Head employee's active Department Assignment points to this Department (soft warning, not hard block — the head may be from another department in matrix structures). Document the initialization sequence explicitly in onboarding documentation.

---

## 6. Business Rule Conflicts

### 6.1 — Attendance Adjustment approval routing contradiction `[CRITICAL]`

**Where:** `entity-inventory.md` (Attendance Adjustment: "Referenced By: Approval Workflow Instance"); `attendance-module-entity-definitions.md §7` ("directly updates: Attendance Day (no approval required by default)")

The entity inventory implies Attendance Adjustment goes through an Approval Workflow. The attendance module definition says it directly updates Attendance Day without approval. These cannot both be correct simultaneously.

**Resolution:** Define the intended behavior explicitly. Recommended resolution: Attendance Adjustment (HR-initiated) is a direct correction and does NOT require a workflow approval — HR has the authority to correct records. Regularization Request (employee-initiated) DOES require approval workflow routing. Update the entity inventory to remove the Approval Workflow Instance reference from Attendance Adjustment's "Referenced By" column. Regularization Request should have the workflow reference instead.

---

### 6.2 — Employee Profile `status` and Employment Record `employment_stage` synchronization undefined `[CRITICAL]`

**Where:** `employee-domain-entity-definitions.md §2` (Employee Profile lifecycle); `employee-domain-entity-definitions.md §3` (Employment Record business rules)

Employee Profile has lifecycle states: `onboarding → probation → active → ...`
Employment Record has `employment_stage`: `probation` | `confirmed`

There is no defined invariant or trigger specifying when the Employee Profile transitions from `probation` to `active`. Business Rule 8 on Employee Profile says: "The Profile `status` answers 'is this person in the system?' while the Employment Record answers 'what are the active terms of their engagement?'" — but gives no synchronization rule.

**Impact:** An employee could have `employment_stage = confirmed` on their Employment Record while their Profile is still `status = probation`, causing incorrect permission gates, leave policy triggers, and reporting.

**Resolution:** Add a cross-module invariant: "When Employment Record `employment_stage` is updated to `confirmed` (probation confirmation), Employee Profile `status` must be atomically updated from `probation` to `active` in the same database transaction." Define this as a system event that triggers both updates via the employment confirmation workflow.

---

### 6.3 — Policy Acknowledgement references Policy Document, not Document Version `[CRITICAL]`

**Where:** `audit-compliance-module-entity-definitions.md §4` (Policy Acknowledgement required fields: `policy_document_id`); `documents-module-entity-definitions.md §6, §3` (Policy Document → Document File → Document Versions)

Policy Acknowledgement records which Policy Document an employee acknowledged, but not which specific Document Version. A Policy Document can have its underlying file updated (new Document Version created) after some employees have already acknowledged. The existing acknowledgements then technically cover a different version of the content than the current file.

**Impact:** In a regulatory audit, the organization cannot prove that an employee acknowledged the specific document content currently on file. A POSH compliance audit requires proving the employee read and acknowledged the exact text of the policy.

**Resolution:** Add `document_version_id` as a required FK field on Policy Acknowledgement, referencing `doc_document_versions`. When an employee acknowledges a policy, the system records not just the Policy Document but the specific Document Version ID that was current at the time of acknowledgement. This becomes the non-repudiable content reference.

---

### 6.4 — Leave Type `on_demand` accrual value has no corresponding Policy Rule support `[MODERATE]`

**Where:** `leave-module-entity-definitions.md §1` (Leave Type: `accrual_basis = on_demand`); Leave Policy Rule (`accrual_type` supports only `upfront` or `monthly`)

Leave Type explicitly supports `accrual_basis = on_demand` (balance available as-needed up to policy limit). Leave Policy Rule has no mechanism to express `on_demand` entitlement — only `upfront` and `monthly`. A Sick Leave type configured as `on_demand` cannot be correctly configured in any Leave Policy Rule.

**Resolution:** As noted in §3.2 — standardize the vocabulary and add `on_demand` to Leave Policy Rule's `accrual_type` valid values. For `on_demand`, the Leave Balance does not have a scheduled accrual; instead, the system grants the full `annual_entitlement_days` upfront at the start of the leave year, making `on_demand` operationally equivalent to `upfront`. Confirm this semantic in the Leave Policy Rule definition.

---

### 6.5 — Leave Type `is_carry_forward_eligible` / `is_encashable` override logic not enforceable as a constraint `[MODERATE]`

**Where:** `leave-module-entity-definitions.md §1` (Business Rules 7, 8)

Rules state: "If `is_carry_forward_eligible = false` on Leave Type, carry-forward is not permitted regardless of what Leave Policy Rule says." This cross-entity constraint (Leave Policy Rule's `carry_forward_max_days` must be 0 if Leave Type disallows it) cannot be enforced as a DB constraint and is only documented as prose.

**Resolution:** Add an explicit validation to the Leave Policy Rule save path: when a Leave Policy Rule is created or updated, validate that `carry_forward_max_days > 0` is only permitted if the associated Leave Type has `is_carry_forward_eligible = true`. Similarly for `encashment_eligible`. This should be a service-layer validation with a specific error code.

---

### 6.6 — Half Day attendance status requires Leave Request but computation creates it from hours `[MODERATE]`

**Where:** `attendance-module-entity-definitions.md §2` (Attendance Day business rules and computation logic)

The computation logic defines: "Attendance Logs present + total_worked_minutes between half-day and full-day threshold → `attendance_status = half_day`." Business Rule 4 also states: "An `on_leave` Attendance Day must reference an approved Leave Request." Half-day leave also requires a Leave Request. But a system-computed `half_day` (from short hours) does not involve a Leave Request.

**Conflict:** `attendance_status = half_day` has two distinct origins with different requirements — one requires a Leave Request, one does not. If both map to the same status value, the Payroll module cannot correctly distinguish "approved half-day leave" (which consumes leave balance) from "short-hours half-day" (which may trigger LOP).

**Resolution:** Introduce a separate `attendance_status = half_day_short_hours` value or a supplementary `half_day_source` field (`leave_approved` | `short_hours_computed`) alongside the `half_day` status. The Payroll module must use `half_day_source` to correctly route the deduction: `leave_approved` → deduct from Leave Balance; `short_hours_computed` → apply LOP per configured policy.

---

### 6.7 — Audit Log writes in same transaction conflicts with streaming export `[MODERATE]`

**Where:** `audit-compliance-module-entity-definitions.md §1` (Business Rule 10: "The audit write must be synchronous within the database transaction"); `audit-compliance-module-entity-definitions.md §6` (Data Export Log Business Rule 2: "failure to produce an entry must cause the export operation to fail")

HTTP streaming responses begin before the response body is complete. Starting a DB transaction to write a Data Export Log, then beginning the HTTP stream, means the transaction is open for the full duration of the stream. This can hold DB locks for seconds to minutes, creating contention.

**Resolution:** Clarify in both entity definitions that exports follow a two-phase pattern: (1) Write Data Export Log with `status = pending` in a synchronous transaction BEFORE stream begins; (2) Begin streaming; (3) On stream completion, update status to `completed` in a second transaction. This pattern must be explicitly documented as the "pre-log then stream" contract, distinguishing exports from the general "single transaction" rule that applies to business entity mutations.

---

### 6.8 — `Employment Record → offer_letter_document_id` FK target is Employee Document, not Document File `[MINOR]`

**Where:** `employee-domain-entity-definitions.md §3` (Employment Record optional fields)

Employment Record has `offer_letter_document_id` FK pointing to "Employee Document." Employee Document is an association entity that links an employee to a Document File. The offer letter as a concept should be a Document File reference, not an Employee Document association reference. The Employee Document association is the secondary artifact; the Document File is the primary document record.

**Resolution:** Change the FK target to `doc_files.id` and rename the field to `offer_letter_document_file_id`. Similarly for `appointment_letter_document_id`. The Employee Document association for these files can still exist (documenting that Priya's offer letter is associated with her employee record) but the Employment Record's direct reference should be to the file itself for correct document retrieval.

---

## 7. Missing Relationships

### 7.1 — Employment Record has no `pay_group_id` FK `[CRITICAL]`

As detailed in §2.1. The FK path from Employee to Pay Group is entirely absent.

**Resolution:** Add `pay_group_id` FK (required) to Employment Record. This aligns with the existing pattern: Employment Record captures all the terms of engagement with the Legal Entity. Pay Group is one of those terms.

---

### 7.2 — Location has no explicit Holiday Calendar FK in its field definitions `[CRITICAL]`

As detailed in §4.3 and §2.2. Holiday Calendar is referenced in Location relationships but the FK is absent from the field list.

**Resolution:** Add `default_holiday_calendar_id` FK (optional, since a Location may not have a calendar pre-configured) to Location's optional fields.

---

### 7.3 — Attendance Day has no FK to the Payroll Run that locked it `[MODERATE]`

**Where:** `attendance-module-entity-definitions.md §2` (Attendance Day: `lock_status` field); `payroll-module-entity-definitions.md §5` (Payroll Run)

Attendance Day has `lock_status = locked` but no FK to which Payroll Run initiated the lock. The relationship exists conceptually ("Attendance Days are locked when a Payroll Run is initiated") but is not traceable from the Attendance Day record.

**Impact:** Cannot answer: "Which payroll run locked this attendance day?" for dispute resolution or retroactive correction analysis.

**Resolution:** Add `locked_by_payroll_run_id` FK (optional, set only when `lock_status = locked` via payroll initiation) to Attendance Day. Manual month-end locks by HR Admin have `lock_status = locked` with this FK null, distinguishing the two lock sources.

---

### 7.4 — Leave Encashment has no FK to the Pay Run Line that processed it `[MODERATE]`

**Where:** `leave-module-entity-definitions.md §10` (Leave Encashment); `payroll-module-entity-definitions.md §7` (Pay Run Earning Lines)

The payroll computation flow describes: "Approved Leave Encashments → Encashment earning lines." Once a Leave Encashment is processed in a Payroll Run, there is no FK on the Leave Encashment record pointing to the resulting Pay Run Earning Line. The traceability is one-directional (Payroll Run may reference the encashment) but the Leave module has no pointer back.

**Resolution:** Add `pay_run_line_id` FK (optional, set after Payroll processes the encashment) to Leave Encashment. Set concurrently with the transition to `status = paid`. Similarly, add this pattern to Overtime Record (when it generates a Pay Run Earning Line) and Reimbursement Claim (when it is paid via payroll).

---

### 7.5 — Overtime Record has no FK to the Leave Accrual it generates for Comp-Off `[MODERATE]`

**Where:** `attendance-module-entity-definitions.md §6` (Overtime Record); `leave-module-entity-definitions.md §5` (Leave Accrual)

Overtime Record Business Rules state: "Approved overtime may generate a Compensatory Off balance" (i.e., a Leave Accrual event for the Comp-Off Leave Type). No FK is defined from Overtime Record to the resulting Leave Accrual record.

**Resolution:** Add `comp_off_leave_accrual_id` FK (optional, set only when overtime disposition is `comp_off`) to Overtime Record. This closes the traceability chain: Attendance Day → Overtime Record → Leave Accrual → Leave Balance.

---

### 7.6 — Policy Acknowledgement must reference Document Version `[CRITICAL]`

As detailed in §6.3. Policy Acknowledgement lacks a `document_version_id` FK, making it impossible to prove which exact document content the employee acknowledged.

**Resolution:** Add `document_version_id` as a required FK field to Policy Acknowledgement (FK to `doc_document_versions`).

---

### 7.7 — Consent Record scoped to Employee Profile only — excludes candidates `[MINOR]`

**Where:** `audit-compliance-module-entity-definitions.md §5` (Consent Record: `employee_id` FK to Employee Profile)

Consent Record's `employee_id` FK constrains the data subject to be an existing Employee Profile. However, recruitment candidates require GDPR-compliant consent for background checks, CV data processing, and reference verification before they have an Employee Profile. After hiring, the candidate's consent record must be linked to their Employee Profile.

**Resolution:** Replace `employee_id` with a polymorphic subject pattern:
- Add `subject_type` field: `employee` | `candidate`
- Replace `employee_id` with `subject_id` (UUID — the ID of either the Employee Profile or Candidate record)
- When a candidate becomes an employee, update `subject_type = employee` and `subject_id = new_employee_profile_id` in the same onboarding transaction that links Candidate to Employee Profile.

---

## 8. Module Boundary Ambiguities

### 8.1 — Leave Type, Leave Policy, Leave Policy Rule owned by Organization but logically belong to Leave `[CRITICAL]`

As detailed in §1.2. The current arrangement puts Leave-domain business rules in the Org module document while the Leave module document cross-references them. This creates:
- Two places to update when Leave Type rules change
- Confusion for engineers about which module owns the migration for `lve_leave_types`
- Incorrect ownership in the entity inventory

**Resolution:** Formalize the following boundary:
- Organization module owns: Employment Type, Grade, Salary Structure, Salary Component (compensation structure), Holiday Calendar, Shift — these are genuinely "org setup" entities used by multiple modules
- Leave module owns: Leave Type, Leave Policy, Leave Policy Rule — these are leave domain configuration entities not used outside of the Leave and Payroll (LOP) modules
- Move Leave Type, Leave Policy, Leave Policy Rule from entity inventory Section 2 to Section 5. Update the org module document to remove their definitions and replace with a cross-reference.

---

### 8.2 — Salary Structure and Salary Component ownership in Org module `[MODERATE]`

**Where:** `entity-inventory.md` (Salary Structure, Salary Component under Organization Setup); `payroll-module-entity-definitions.md §2, §3` (extensive Payroll-specific business rules on these entities)

Salary Structure and Salary Component are compensation definition entities — their primary consumers are the Payroll module and the Employee Compensation assignment. They have no operational role in generic organizational hierarchy management.

**Resolution:** Move Salary Structure and Salary Component from Organization module ownership to Payroll module ownership in the entity inventory and in the canonical module document. Rationale: Compensation structures change when payroll rules change (statutory updates, fiscal year reconfiguration) — that is a Payroll concern, not an Org concern.

---

### 8.3 — Approval Delegation (Workflow Engine) vs. Access Scope (IAM) — matrix organizations `[MODERATE]`

**Where:** `workflow-engine-entity-definitions.md §8` (Approval Delegation); `iam-module-entity-definitions.md §7` (Access Scope)

Approval Delegation allows a user to temporarily delegate their approval authority to another user. Access Scope constrains the org boundary within which a Role's permissions are effective. For a delegated approver, it is unclear whether the delegation also transfers the delegator's Access Scope. Can Priya (scoped to the Bangalore Engineering department) delegate to Rahul (scoped to the Mumbai Sales department) and have Rahul see Bangalore Engineering leave requests?

**Impact:** Without an explicit rule on scope inheritance during delegation, the implementation will make an arbitrary decision that may violate RBAC principles or block legitimate delegation scenarios.

**Resolution:** Add to Approval Delegation's business rules: "A Delegation record may optionally carry a `scope_constraint_id` FK to Access Scope. If set, the delegate's approval authority is constrained to the scope on the delegation record, not the delegate's own assigned scope. If not set, the delegate's own Access Scope applies." This makes scope inheritance explicit and configurable.

---

### 8.4 — Exit Record clearance workflow touches multiple modules `[MINOR]`

**Where:** Missing entity Exit Record (§2.9)

The Exit Record clearance process (IT clearance, asset return, finance settlement, HR sign-off) naturally involves multiple modules — there is no single owning module. Without defining the entity, it is unclear whether clearance tracking lives in Employee module, a future HR Ops module, or the Approval module.

**Resolution:** When Exit Record is defined (§2.9), its ownership should be the Employee module (`emp_exit_records`). The clearance workflow should be powered by the Workflow Engine (an approval workflow instance per exit record), following the same pattern as leave approvals and attendance adjustments.

---

## Consolidated Action List (Priority Order)

### P0 — Blocks database design; must fix before schema is written

| # | Action | Document(s) to Update |
|---|--------|----------------------|
| 1 | Remove `current_version_id` from Document File; derive current version via `is_current_version` flag | `documents-module-entity-definitions.md §2` |
| 2 | Fix Cost Center Assignment unique constraint; remove it for split allocations; add `is_primary` partial index | `employee-domain-entity-definitions.md §4e` |
| 3 | Add `pay_group_id` FK to Employment Record | `employee-domain-entity-definitions.md §3` |
| 4 | Remove `location_ids` array from Department; define `org_department_locations` junction | `org-module-entity-definitions.md §5` |
| 5 | Add `document_version_id` (required) to Policy Acknowledgement | `audit-compliance-module-entity-definitions.md §4` |
| 6 | Remove statutory identifiers from Organization; leave them only on Legal Entity | `org-module-entity-definitions.md §2` |
| 7 | Resolve Employee Document duplicate definition; make Employee module cross-reference Documents module | `employee-domain-entity-definitions.md §9` |
| 8 | Define Leave Lapse entity | `leave-module-entity-definitions.md` |
| 9 | Add Session entity to IAM module | `iam-module-entity-definitions.md` |
| 10 | Define cross-module invariant for Employee Profile status ↔ Employment Record employment_stage sync | `employee-domain-entity-definitions.md §2, §3` |

### P1 — Produces incorrect behavior or data gaps; fix before first migration

| # | Action | Document(s) to Update |
|---|--------|----------------------|
| 11 | Add `holiday_calendar_id` FK to Location fields; add optional `holiday_calendar_id` to Location Assignment | `org-module-entity-definitions.md §6`, `employee-domain-entity-definitions.md §4d` |
| 12 | Add `created_at`, `updated_at`, `updated_by` to all seven Assignment entity field tables | `employee-domain-entity-definitions.md §4a–§4g` |
| 13 | Standardize `accrual_basis` / `accrual_type` vocabulary; add `on_demand` to Leave Policy Rule | `leave-module-entity-definitions.md §1`, Org module cross-ref |
| 14 | Define Employee Personal Details separation decision; update both documents | `entity-inventory.md`, `employee-domain-entity-definitions.md §2` |
| 15 | Clarify Attendance Adjustment approval routing; remove Approval Workflow reference from its inventory entry | `entity-inventory.md`, `attendance-module-entity-definitions.md §7` |
| 16 | Define Employee Bank Account entity | `employee-domain-entity-definitions.md` |
| 17 | Define Employee Compensation / Salary Structure Assignment entities | `employee-domain-entity-definitions.md` |
| 18 | Define Exit Record entity with clearance/FNF boundary | `employee-domain-entity-definitions.md` |
| 19 | Add `half_day_source` field to Attendance Day | `attendance-module-entity-definitions.md §2` |
| 20 | Add `locked_by_payroll_run_id` FK to Attendance Day | `attendance-module-entity-definitions.md §2` |
| 21 | Add `pay_run_line_id` FK to Leave Encashment, Overtime Record, Reimbursement Claim | `leave-module-entity-definitions.md §10`, `attendance-module-entity-definitions.md §6`, `payroll-module-entity-definitions.md §13` |
| 22 | Add `comp_off_leave_accrual_id` FK to Overtime Record | `attendance-module-entity-definitions.md §6` |
| 23 | Move Leave Type, Leave Policy, Leave Policy Rule ownership to Leave module in inventory | `entity-inventory.md` |
| 24 | Replace `photo_url` with `profile_photo_document_file_id` FK on Employee Profile | `employee-domain-entity-definitions.md §2` |
| 25 | Fix `offer_letter_document_id` FK target from Employee Document to Document File | `employee-domain-entity-definitions.md §3` |
| 26 | Clarify two-phase logging pattern for streaming exports | `audit-compliance-module-entity-definitions.md §6` |

### P2 — Consistency and completeness; fix before module implementation begins

| # | Action | Document(s) to Update |
|---|--------|----------------------|
| 27 | Define Employee Education and Employee Work Experience entities | `employee-domain-entity-definitions.md` |
| 28 | Add Document Template and Generated Document to Documents module definitions | `documents-module-entity-definitions.md` |
| 29 | Update entity inventory Attendance section to reflect two-layer model | `entity-inventory.md §4` |
| 30 | Add User Identity and Access Scope to entity inventory | `entity-inventory.md §1` |
| 31 | Add Timesheet, Timesheet Entry, Regularization Request to entity inventory | `entity-inventory.md §4` |
| 32 | Update all module audit requirement sections from `sys_audit_logs` to `aud_audit_logs` | All module documents |
| 33 | Add `aud_` prefix to `database-standards.md` domain prefix table | `docs/database-standards.md` |
| 34 | Make Consent Record polymorphic (employee + candidate subjects) | `audit-compliance-module-entity-definitions.md §5` |
| 35 | Add scope inheritance rule to Approval Delegation | `workflow-engine-entity-definitions.md §8` |
| 36 | Standardize embedded address field names across Organization, Legal Entity, Location | `org-module-entity-definitions.md §2, §3, §6` |
| 37 | Add Leave Encashment ↔ Leave Accrual carry-forward constraint as a validation rule | `leave-module-entity-definitions.md §1` |
| 38 | Move Salary Structure and Salary Component to Payroll module ownership | `entity-inventory.md` |
