# Evolve HRMS — Audit & Compliance Module: Business Entity Definitions

**Classification:** Internal Engineering Reference  
**Status:** Finalized  
**Module:** Audit & Compliance  
**Preceding Documents:** `docs/database-standards.md`, `docs/entity-inventory.md`, `docs/iam-module-entity-definitions.md`, `docs/documents-module-entity-definitions.md`

---

## Overview

The Audit & Compliance module is the system-of-record for all events that must be preserved, verifiable, and producible on demand for regulatory, legal, and operational purposes. Where every other module answers "what is the current state of the business?", this module answers "what has happened, to what, by whom, and when — provably."

The module is not a logging utility bolted on as an afterthought. It is a first-class domain with its own entity model, retention policies, access controls, and integrity guarantees. It exists because enterprise HRMS platforms are audited — by statutory authorities (income tax, provident fund, labor law), by external auditors (ISO 27001, SOC 2), by internal compliance teams, and by employees exercising their rights under data protection law (GDPR, India DPDP Act).

### The Six Evidence Categories

The module is organized around six distinct evidence concerns:

| Entity | Evidence Concern | Who Demands It |
|--------|-----------------|----------------|
| **Audit Log** | What write operations occurred across the platform | Internal audit, regulatory inspection, forensic investigation |
| **Entity Change Log** | What exact field values changed and what they changed to | HR audit trail, compliance review, dispute resolution |
| **Login Event** | Who accessed the system, from where, and how | IT security, SOC 2, ISO 27001, data breach investigation |
| **Policy Acknowledgement** | Which employees have read and confirmed which policies | POSH compliance, ISO 27001, Code of Conduct enforcement |
| **Consent Record** | What data processing the employee has consented to | GDPR Article 7, India DPDP Act, privacy audit |
| **Data Export Log** | What personal data left the system, who extracted it, and why | GDPR Article 30, data breach traceability, insider threat detection |

### Design Invariants

All six entities in this module share three non-negotiable properties:

1. **Immutability** — No record in this module may be updated or hard-deleted after creation. The only permitted mutation is `deleted_at` being set by a system purge process after the legally mandated retention period has elapsed, and only when a Super Admin has explicitly configured the retention policy for that event class.

2. **Completeness** — A missing audit record is a compliance failure. The module's write path must be synchronous with the transaction it observes (not fire-and-forget). An audit write failure must cause the originating operation to fail rather than succeed silently without a trail.

3. **Tenant isolation** — Every record is scoped to a `tenant_id`. Super Admin operations on a tenant's data produce records scoped to that tenant, not to a system-level log, ensuring that a tenant can always receive a complete audit export of all events affecting their data.

### Module Boundary

The Audit & Compliance module **owns** all `aud_*` entities. It **receives** write calls from every other module in the platform. No module writes to `aud_*` tables directly — all writes flow through the audit service layer, which handles batching, correlation ID assignment, and integrity tagging.

The module exposes read APIs to:
- **HR Admins** — access to Entity Change Logs and Policy Acknowledgements for their tenant
- **Compliance Officers** — full read access to all six event types for their tenant
- **Employees** — read access to their own Login Events and Consent Records (DSAR — Data Subject Access Request fulfillment)
- **Super Admins** — cross-tenant administrative access to Login Events and Data Export Logs for the platform

### Module Prefix

This module uses the `aud_` table prefix. This is a new prefix not listed in the original `docs/database-standards.md` domain prefix table. The standards document must be updated to add:

| Domain | Prefix | Example |
|--------|--------|---------|
| Audit & Compliance | `aud_` | `aud_audit_logs`, `aud_login_events` |

---

## Entity Index

1. [Audit Log](#1-audit-log)
2. [Entity Change Log](#2-entity-change-log)
3. [Login Event](#3-login-event)
4. [Policy Acknowledgement](#4-policy-acknowledgement)
5. [Consent Record](#5-consent-record)
6. [Data Export Log](#6-data-export-log)

---

## Relationship Overview

```
Tenant
  └── Audit Log (one per write operation across the platform)
        └── Entity Change Log (one per changed field within that operation)

  └── Login Event (one per authentication event; independent of business mutations)

  └── Policy Acknowledgement (one per employee × policy version)
        ├── Employee Profile
        ├── Policy Document (Documents module)
        └── Document Signature (Documents module — when signed)

  └── Consent Record (one per employee × consent type; versioned)
        └── Employee Profile

  └── Data Export Log (one per bulk or sensitive data extraction event)
        ├── User (requestor)
        └── Document File (Documents module — if the export is stored as a file)
```

### Correlation Model

Audit Log and Login Event are linked by `session_id` and `correlation_id`. A user's session begins with a Login Event (type `login_success`). All Audit Logs produced during that session carry the same `session_id`. A single HTTP request that produces multiple Audit Logs (e.g., a bulk operation that updates many records) shares a `correlation_id`. This enables forensic reconstruction of exactly what a user did during a specific session or a specific request.

```
Login Event (session_id: S1) ← session anchor
  │
  ├── Audit Log (session_id: S1, correlation_id: R1) ← first request
  │     └── Entity Change Log (audit_log_id: L1)
  │     └── Entity Change Log (audit_log_id: L1)
  │
  ├── Audit Log (session_id: S1, correlation_id: R2) ← second request
  │     └── Entity Change Log (audit_log_id: L2)
  │
  └── Login Event (session_id: S1, event_type: logout) ← session end
```

---

## 1. Audit Log

### Purpose
An Audit Log record is the immutable event header for every significant write operation performed anywhere in the HRMS platform. It captures the business action (what happened), the affected entity (what it happened to), the actor (who did it), the access context (from where and via what channel), and the outcome. It is the top-level index into the platform's event history.

### Business Description
When an HR Admin changes an employee's salary, three things happen in the data layer: a new `emp_compensation` row is created, an old row is closed, and two Entity Change Log records are produced. The Audit Log is the single record that says "this salary change event occurred." The Entity Change Logs are the detail beneath it.

Audit Log is deliberately coarse-grained at the event level. It answers "what operation ran?" — not "what exact bytes changed?" That field-level detail lives in Entity Change Log. This two-level model serves two audiences: an HR Admin browsing an employee's change history needs the Audit Log (a clean list of dated events); a compliance auditor investigating a specific change needs to drill into Entity Change Log.

Not every database write produces an Audit Log entry. The audit-worthy operations are those with business significance: entity creates, entity updates, entity deletes, approval decisions, payroll runs, imports, exports, and privilege changes. High-frequency operational writes (e.g., notification delivery status updates, import progress counters) do not produce Audit Log entries.

### Relationships
- **One Audit Log → One Tenant**
- **One Audit Log → One User** (`actor_id` — who performed the action; null for automated system actions)
- **One Audit Log → Many Entity Change Logs** (field-level diffs for this event)

### Business Rules
1. Audit Log records are **immutable** from the moment they are committed. No application code path may issue an UPDATE or DELETE against the `aud_audit_logs` table. The database role used by the application must have INSERT-only rights on this table.
2. `action_type` is the controlled vocabulary of auditable operations. Only values from the defined enum are permitted. Adding a new action type requires a schema change, not a freeform string.
3. `entity_type` is the machine-readable type code of the business entity affected (e.g., `emp_profile`, `lve_request`, `pay_run`). It matches the domain prefix convention so that queries can group audit history by module.
4. `entity_id` is the UUID of the specific record affected. If the operation spans multiple records (e.g., a bulk status update), each affected record produces its own Audit Log entry sharing the same `correlation_id`.
5. `actor_id` is null only for system-initiated operations — scheduled jobs, background processors, or integration webhooks. When null, `actor_type = 'system'` and `actor_system_name` must be set. A human-initiated action must always have `actor_id` set.
6. `ip_address` is captured for all human-initiated operations. For API integrations, it is the source IP of the calling system. It must be the verified originating IP, not a forwarded or proxy IP without `X-Forwarded-For` validation.
7. `outcome` indicates whether the operation succeeded. `failure` records must carry a non-null `failure_reason`. Even failed operations must produce an Audit Log entry — an attempted unauthorized action that is blocked is as significant as one that succeeds.
8. `correlation_id` links all Audit Log entries produced within a single HTTP request or job execution. If one request triggers three entity mutations, all three Audit Log entries share the same `correlation_id`. This is set by the API layer before any database writes begin.
9. `session_id` links all Audit Log entries produced during a user's authenticated session. It is the same `session_id` recorded on the Login Event that opened the session.
10. The audit write must be **synchronous** within the database transaction that produces the business record change. The application must not use fire-and-forget async queues for audit writes. If the audit write fails, the enclosing transaction must roll back, and the business operation must fail.
11. Purging Audit Log records is only permitted after the tenant's configured `audit_retention_days` has elapsed for that event class. Purging must itself produce a system-level Audit Log entry recording the purge batch (how many records, covering what date range, authorized by whom).

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `action_type` | Controlled vocabulary of the operation: `create`, `update`, `delete`, `soft_delete`, `restore`, `approve`, `reject`, `cancel`, `submit`, `publish`, `lock`, `unlock`, `assign`, `revoke`, `export`, `import`, `login`, `logout`, `password_reset`, `mfa_enroll`, `permission_change`, `bulk_update` |
| `entity_type` | Machine-readable type code of the affected entity (e.g., `emp_profile`, `lve_request`, `pay_run`, `doc_policy_document`) |
| `entity_id` | UUID of the specific record affected |
| `actor_type` | Who initiated the action: `user`, `system`, `integration` |
| `outcome` | Result of the operation: `success`, `failure`, `partial` |
| `occurred_at` | Timestamp (UTC) when the operation occurred — set by the application, not a DB default |
| `created_at` | Timestamp — DB-level insert time; may differ from `occurred_at` for async writes |

### Optional Fields
| Field | Description |
|-------|-------------|
| `actor_id` | FK to User — null for system/integration actions |
| `actor_system_name` | Name of the automated system or integration that performed the action (e.g., `payroll_scheduler`, `attendance_sync`) |
| `ip_address` | IPv4 or IPv6 address of the actor at time of action |
| `user_agent` | HTTP User-Agent string for browser/API client identification |
| `session_id` | Session identifier linking this event to the actor's Login Event |
| `correlation_id` | UUID shared across all Audit Log entries produced in a single request |
| `module` | Module that owns the affected entity (e.g., `employee`, `leave`, `payroll`) — derived from `entity_type` prefix; stored for query convenience |
| `description` | Short human-readable summary of the operation (e.g., "Salary revised from ₹80,000 to ₹95,000") |
| `failure_reason` | Required when `outcome = failure`; machine-readable error code or human-readable message |
| `metadata` | JSONB — additional context not captured in other fields (e.g., `{"bulk_count": 147, "import_job_id": "..."}`) |

### Unique Constraints
- None beyond primary key. Duplicate Audit Log entries for the same operation are a system bug, not a data model violation.

### Validation Rules
- `action_type` must be one of the defined controlled vocabulary values
- `actor_id` must be non-null when `actor_type = 'user'`
- `actor_system_name` must be non-null when `actor_type` is `system` or `integration`
- `failure_reason` must be non-null when `outcome = failure`
- `occurred_at` must not be more than 60 seconds in the future relative to `created_at`
- `ip_address` must be a valid IPv4 or IPv6 address string when set

### Lifecycle
```
(created — immutable) → (purged after retention period by scheduled process only)
```
Audit Log records have no status field. They are created once and never updated. The only end state is physical purge, which is a system operation governed by the retention policy.

### Audit Requirements
The Audit & Compliance module is self-referential at the system level: purge operations against `aud_audit_logs` must themselves be recorded in a system-level purge log that is held for an additional retention period beyond the original log's expiry.

---

## 2. Entity Change Log

### Purpose
An Entity Change Log record captures the field-level detail of a single attribute change within an Audit Log event. For every field that was modified in a write operation, one Entity Change Log record is produced, recording the field name, its value before the change, its value after the change, and the sensitivity classification of that field's data.

### Business Description
The Audit Log tells you that an employee's record was updated at 14:32 on 15 March 2025 by HR Admin Rahul. The Entity Change Log tells you that specifically their `pan_number` changed from `ABCDE1234F` to `FGHIJ5678K` (masked), their `grade_id` changed from `L3` to `L4`, and their `base_salary_amount` changed from `80000.00` to `95000.00`.

This granularity matters in several real scenarios:

- **Salary dispute** — An employee disputes their payslip. The payroll auditor needs to know exactly when the salary amount changed and what it changed from.
- **GDPR right of rectification** — An employee reports that their date of birth was incorrectly entered. Compliance must show that the error was corrected, what the wrong value was, and what the correct value is now.
- **PAN number investigation** — The income tax authority flags a PAN number discrepancy. The system must show every instance where that field was written, who wrote it, and what values were involved.
- **Grade manipulation suspicion** — An internal auditor suspects that a grade was changed improperly. They need the exact old and new values with the acting user's identity.

Entity Change Log stores all values as text (`old_value_text`, `new_value_text`). The application layer serializes typed values (dates, numbers, UUIDs) to their canonical text representations before writing. This ensures the log is always readable without schema knowledge of the source table.

For fields classified as `sensitive` or `pii`, the values are stored in a masked form — the change is recorded (a change occurred and what it changed to) but the actual value is not readable without additional access rights. The masking is applied by the audit service layer, not the database. A user with `audit:sensitive:view` permission may retrieve the unmasked values from a separate, more tightly controlled read path.

### Relationships
- **One Entity Change Log → One Audit Log** (the event that produced this field change)
- **One Entity Change Log → One Tenant**
- **One Audit Log → Many Entity Change Logs** (one per changed field)

### Business Rules
1. Entity Change Log records are **immutable**. No application code path may issue an UPDATE or DELETE against the `aud_entity_change_logs` table.
2. An Entity Change Log is produced for every field that changes in an update operation. Read-only fields, timestamps (`created_at`, `updated_at`), and audit columns (`created_by`, `updated_by`) are excluded — their changes are implicitly captured in the Audit Log event.
3. For `action_type = create`, Entity Change Log records capture `old_value_text = NULL` and `new_value_text = {initial value}` for each non-null field set at creation. This documents the initial state of the record.
4. For `action_type = delete` or `soft_delete`, Entity Change Log records capture `old_value_text = {last value}` and `new_value_text = NULL` for key fields of the deleted entity. At a minimum, the `id`, `status`, and `deleted_at` fields must be recorded.
5. `data_classification` must be set by the audit service based on a field-level classification registry. This registry is a configuration table (not modeled here but owned by the System Admin module) that maps `(entity_type, field_name)` to a classification: `standard`, `pii`, `sensitive_pii`, `financial`, `credential`. Unregistered fields default to `standard`.
6. For fields with `data_classification` of `pii`, `sensitive_pii`, or `credential`: both `old_value_text` and `new_value_text` are stored in a masked form (e.g., `ABCDE****F` for a PAN number; `****` for a password hash). The `is_masked = true` flag is set on the record.
7. The `is_masked = true` flag on a record is itself immutable. A masked record cannot be unmasked retroactively — the full value was never stored. Auditors requiring the actual value must retrieve it from the source table (with appropriate permissions) and cross-reference by timestamp.
8. Foreign key fields (e.g., `department_id`, `grade_id`) store the UUID in `old_value_text` and `new_value_text`. The audit query layer is responsible for resolving UUIDs to human-readable labels at display time.
9. `array_index` is used for changes within JSONB array fields or array columns — it records which element of the array was affected.
10. All Entity Change Log records for a given Audit Log event must be written in the same database transaction as the Audit Log record itself.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `audit_log_id` | FK to Audit Log — the parent event |
| `entity_type` | Type code of the entity whose field changed (e.g., `emp_profile`, `lve_request`) |
| `entity_id` | UUID of the specific record whose field changed |
| `field_name` | Database column name of the changed field (e.g., `base_salary_amount`, `department_id`, `status`) |
| `old_value_text` | Value of the field before the change, serialized as text; null for creates |
| `new_value_text` | Value of the field after the change, serialized as text; null for deletes |
| `data_classification` | Sensitivity of this field: `standard`, `pii`, `sensitive_pii`, `financial`, `credential` |
| `is_masked` | Boolean — true if `old_value_text` and `new_value_text` are stored in masked form |
| `created_at` | Timestamp |

### Optional Fields
| Field | Description |
|-------|-------------|
| `array_index` | Integer — for array or JSONB path changes; the index of the affected element |
| `json_path` | Dot-notation path for changes within a JSONB column (e.g., `config_data.fiscal_year_start`) |
| `change_reason` | Human-provided reason for the change, if the source operation captured one (e.g., HR comment on a salary revision) |

### Unique Constraints
- `(audit_log_id, entity_id, field_name)` — one change record per field per audit event. A field can appear in at most one change record for a given audit log entry.

### Validation Rules
- `data_classification` must be one of `standard`, `pii`, `sensitive_pii`, `financial`, `credential`
- `is_masked = true` requires that neither `old_value_text` nor `new_value_text` contains any value that would expose unmasked sensitive data — validated at write time by the audit service
- For `action_type = create` on the parent Audit Log: `old_value_text` must be null
- For `action_type = delete` on the parent Audit Log: `new_value_text` must be null

### Lifecycle
```
(created — immutable) → (purged after retention period with parent Audit Log)
```
Entity Change Log records are purged together with their parent Audit Log record. They share the same retention period and the same purge authorization pathway.

### Audit Requirements
Entity Change Log is itself an audit artifact. The purge of Entity Change Log records must be recorded in the same system-level purge log as their parent Audit Log records.

---

## 3. Login Event

### Purpose
A Login Event is an immutable record of a single authentication or session lifecycle event for a User. It captures every meaningful interaction a user has with the authentication system: successful logins, failed attempts, multi-factor authentication challenges and outcomes, password resets, account lockouts, and session terminations.

### Business Description
Login Events exist independently of Audit Logs because authentication is not a business record mutation — it is an access event. The volume, retention requirements, and compliance consumers are different:

- **Volume** — A system with 500 users may produce 2,000–5,000 login events per day. Mixing these into the business Audit Log would degrade query performance for HR use cases.
- **Retention** — Many security standards (ISO 27001, SOC 2) require login event retention for 12–24 months, independent of and often shorter than the business audit trail requirement of 7 years.
- **Consumers** — IT security teams, not HR, primarily consume login events. They need to detect brute force attacks, identify compromised accounts, trace insider threats, and produce security incident reports.
- **Regulatory context** — GDPR's requirement to demonstrate "appropriate technical measures" for data security is served in part by showing login monitoring is in place. Login Events are the evidence.

Each failed login attempt, MFA bypass attempt, and account lockout must produce a Login Event record. The system's brute-force detection logic reads from `aud_login_events` to count recent failures for a given `user_id` or `ip_address` before deciding to trigger a lockout.

### Relationships
- **One Login Event → One Tenant** (null for pre-tenant-resolution events, e.g., email not found during login)
- **One Login Event → One User** (`user_id` — null for failed attempts where the user account could not be identified)
- **One Login Event → Many Audit Logs** (via shared `session_id` — the session anchor)

### Business Rules
1. Login Event records are **immutable** from the moment they are created. No UPDATE or DELETE is permitted on `aud_login_events`.
2. A `session_id` is generated at the time of a `login_success` event and is embedded in the authentication token issued to the client. This `session_id` is the correlation key across all Audit Logs produced during the session. When the session ends (logout, expiry, forced termination), a new Login Event of the appropriate termination type is created with the same `session_id`.
3. `user_id` may be null for `login_failed` events where the submitted email address does not match any user record in the system. In this case, `attempted_identifier` must be set to the email or username submitted by the client (stored as a one-way hash — never in plain text — to enable pattern analysis without exposing the submitted value).
4. `tenant_id` may be null for failed login attempts that occur before tenant resolution (e.g., a login attempt to an email domain that is not associated with any tenant in the system).
5. `ip_address` must always be set for all Login Event types. It is a security invariant — an authentication event without a source IP is not a valid event.
6. `failure_reason` must be set for all event types in the `login_failed`, `mfa_failed`, and `account_locked` categories. The reason must be a controlled vocabulary value (not a free-text message) to enable consistent pattern analysis.
7. `geo_country` and `geo_city` are derived from `ip_address` using a GeoIP database at event creation time. They are stored at creation time and must not be recomputed retroactively — the geographic attribution must reflect the state of the GeoIP database at the time of the event.
8. `login_method` records how the user authenticated. For SSO logins, `sso_provider` must be set. For Aadhaar eSign-based authentication, `mfa_method = aadhaar_otp` must be set.
9. For `event_type = account_locked`, the system must record `locked_reason` (e.g., `brute_force_threshold_exceeded`, `admin_manual_lock`, `suspicious_location_detection`) so the unlock workflow can be correctly initiated.
10. Device fingerprint is stored as a one-way hash (SHA-256 of device characteristics) to enable device recognition without storing PII device identifiers. It must not be reversed.
11. Login Events for `event_type = login_success` must be produced before the authentication token is returned to the client. If the Login Event write fails, the authentication must fail — a session that has no Login Event record must never exist.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `event_type` | Classification of the authentication event: `login_success`, `login_failed`, `logout`, `session_expired`, `session_revoked`, `password_reset_requested`, `password_reset_completed`, `mfa_challenge_sent`, `mfa_success`, `mfa_failed`, `account_locked`, `account_unlocked`, `sso_login_success`, `sso_login_failed`, `token_refreshed` |
| `ip_address` | Source IP address of the client (IPv4 or IPv6) |
| `login_method` | Authentication mechanism: `password`, `sso`, `magic_link`, `api_key`, `aadhaar_esign` |
| `occurred_at` | Timestamp (UTC) of the event — set by the application |
| `created_at` | Timestamp — DB-level insert time |

### Optional Fields
| Field | Description |
|-------|-------------|
| `tenant_id` | FK to Tenant — null for pre-tenant-resolution failed attempts |
| `user_id` | FK to User — null for failed attempts where the user account was not found |
| `session_id` | Session identifier; set on `login_success` and shared by all events in that session |
| `user_agent` | HTTP User-Agent string for device/browser identification |
| `device_fingerprint` | SHA-256 hash of device characteristics for device recognition (non-reversible) |
| `geo_country` | ISO 3166-1 alpha-2 country code derived from `ip_address` at event time |
| `geo_city` | City name derived from `ip_address` at event time |
| `mfa_method` | MFA mechanism used (if applicable): `totp`, `sms_otp`, `email_otp`, `aadhaar_otp`, `hardware_key`, `none` |
| `sso_provider` | Identity provider name for SSO logins (e.g., `google_workspace`, `azure_ad`, `okta`) |
| `failure_reason` | Controlled vocabulary reason for failed events: `invalid_password`, `account_not_found`, `account_suspended`, `account_locked`, `mfa_timeout`, `mfa_max_attempts`, `sso_token_invalid`, `sso_email_mismatch`, `session_not_found`, `token_expired` |
| `attempted_identifier` | SHA-256 hash of the email/username submitted during a failed login where the account was not found — never stored in plain text |
| `locked_reason` | Reason for account lock: `brute_force_threshold_exceeded`, `admin_manual_lock`, `suspicious_location_detection`, `concurrent_session_violation` |
| `risk_score` | Integer 0–100: computed risk score for this event (high score triggers alerts) |
| `is_suspicious` | Boolean — flagged by anomaly detection (unusual location, unusual time, new device) |
| `metadata` | JSONB — additional context (e.g., `{"redirect_uri": "...", "client_app": "hrms_mobile"}`) |

### Unique Constraints
- None beyond primary key. Multiple events of the same type for the same user are expected (e.g., many `mfa_challenge_sent` events per user).

### Validation Rules
- `ip_address` must always be set and must be a valid IPv4 or IPv6 address
- `failure_reason` must be non-null when `event_type` is `login_failed`, `mfa_failed`, or `account_locked`
- `session_id` must be non-null when `event_type` is `login_success`
- `session_id` must match the originating `login_success` event's `session_id` for all subsequent events in that session
- `mfa_method` must be non-null when `event_type` is `mfa_challenge_sent`, `mfa_success`, or `mfa_failed`
- `sso_provider` must be non-null when `login_method = sso`
- `attempted_identifier`, when set, must be a 64-character hexadecimal string (SHA-256 hash)

### Lifecycle
```
(created — immutable) → (purged after security retention period)
```
Login Event records are subject to a separate, shorter retention period from business Audit Logs. The default retention period is 24 months. The purge must be logged in the system-level purge log.

---

## 4. Policy Acknowledgement

### Purpose
A Policy Acknowledgement is the compliance evidence record that a specific employee has read and formally confirmed a specific version of a company policy. It is the legally significant artifact that proves organizational policy awareness and is the primary record produced for POSH compliance, ISO 27001 controls, Code of Conduct enforcement, and any regulatory inspection that asks "can you prove your employees were trained on / aware of Policy X?"

### Business Description
Every time an organization publishes a new version of a policy that requires acknowledgement, each applicable employee must acknowledge it. The Policy Document (in the Documents module) defines the policy and marks it as requiring acknowledgement. The Policy Acknowledgement record in the Audit & Compliance module is the per-employee evidence that the obligation was fulfilled.

The separation of concerns is deliberate:
- The **Policy Document** (Documents module) owns the policy content, its publication lifecycle, and its audience scope.
- The **Document Signature** (Documents module) owns the cryptographic e-sign event on the file.
- The **Policy Acknowledgement** (Audit & Compliance module) owns the compliance evidence — it is the record an auditor points to. It may reference a Document Signature (for e-signed acknowledgements) or stand alone (for click-through acknowledgements without a formal signature).

An employee acknowledging a policy via a "I have read and understood" checkbox produces a Policy Acknowledgement record. An employee who e-signs the policy document produces both a Document Signature and a Policy Acknowledgement. Both flow into the same compliance record to give compliance officers a single table to query.

### Relationships
- **One Policy Acknowledgement → One Tenant**
- **One Policy Acknowledgement → One Employee Profile** (`employee_id`)
- **One Policy Acknowledgement → One Policy Document** (`policy_document_id` — Documents module)
- **One Policy Acknowledgement → One Document Signature** (`document_signature_id` — Documents module; null for click-through acknowledgements)
- **Referenced by** Compliance dashboards, Onboarding completion checks, POSH audit exports, Regulatory inspection reports

### Business Rules
1. Policy Acknowledgement records are **immutable** once `status = acknowledged`. No acknowledged record may be updated or deleted. Revocation (exceptional, HR Admin only) produces a new record with `status = revoked` and sets `revoked_at`, `revoked_by`, and `revocation_reason`. The original acknowledged record is never mutated.
2. Each `(tenant_id, employee_id, policy_document_id)` combination must have at most one non-revoked Policy Acknowledgement record. A second acknowledgement of the same policy version by the same employee is a duplicate and must be rejected.
3. When a new Policy Document version is published (superseding the old), the old acknowledgements remain valid as evidence for the old version. Employees must re-acknowledge the new version separately. Re-acknowledgement of a new version produces a new Policy Acknowledgement record linked to the new `policy_document_id`.
4. `acknowledgement_method` records how the employee acknowledged the policy: `click_through` (a checkbox or button in the UI), `e_signature` (a Document Signature was captured), `physical_paper` (signed physical copy, digitized by HR), or `mandatory_training_completion` (completion of an associated LMS module).
5. `is_within_deadline` is set at the time of acknowledgement by comparing `acknowledged_at` against the Policy Document's `acknowledgement_deadline`. It must not be recomputed retroactively.
6. `is_overdue` is set at the time of acknowledgement when `acknowledged_at > policy_document.acknowledgement_deadline`. Both `is_within_deadline = false` and `is_overdue = true` may be true simultaneously for late acknowledgements.
7. For employees who have not acknowledged a policy before its deadline, the system must create a Policy Acknowledgement record with `status = overdue` on the day after the deadline. This enables compliance dashboards to show "not acknowledged" and "overdue" employees without a gap (absence of a record means "not yet requested"; `status = overdue` means "requested and not fulfilled by deadline").
8. `reminded_at` records the timestamp of the last acknowledgement reminder sent to the employee. Multiple reminders may be sent; only the most recent timestamp is stored. A separate Notification record (Notifications module) is created for each reminder.
9. `document_signature_id` must be set when `acknowledgement_method = e_signature`. It must reference a Document Signature record with `status = signed` and `document_version_id` pointing to the current version of the associated Policy Document's Document File.
10. An employee who is in `notice_period` or `terminated` status at the time of policy publication is excluded from the acknowledgement requirement. The system must not create acknowledgement requests for terminated employees.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile — the employee who acknowledged (or must acknowledge) |
| `policy_document_id` | FK to Policy Document (Documents module) — the specific policy version |
| `acknowledgement_method` | Method used: `click_through`, `e_signature`, `physical_paper`, `mandatory_training_completion` |
| `status` | Current state: `pending`, `acknowledged`, `overdue`, `revoked`, `exempted` |
| `created_at` | Timestamp — when the acknowledgement request was created |
| `updated_at` | Timestamp |
| `created_by` | FK to User — the system or HR Admin that created the acknowledgement request |
| `updated_by` | FK to User |

### Optional Fields
| Field | Description |
|-------|-------------|
| `document_signature_id` | FK to Document Signature (Documents module) — required for `acknowledgement_method = e_signature` |
| `acknowledged_at` | Timestamp when the employee completed the acknowledgement; null until acknowledged |
| `acknowledged_by` | FK to User — the user account that submitted the acknowledgement (normally the employee; may be HR for `physical_paper` method) |
| `is_within_deadline` | Boolean — whether the acknowledgement was received before the policy's deadline |
| `is_overdue` | Boolean — whether the acknowledgement was received after the policy's deadline |
| `ip_address` | Source IP address at the time of acknowledgement (for click-through and e-signature methods) |
| `reminded_at` | Timestamp of the most recent acknowledgement reminder sent |
| `exemption_reason` | Required when `status = exempted`; records why this employee was exempted |
| `exempted_by` | FK to User — HR Admin who granted the exemption |
| `exempted_at` | Timestamp of exemption grant |
| `revoked_at` | Timestamp of revocation |
| `revoked_by` | FK to User — HR Admin who revoked |
| `revocation_reason` | Required when `status = revoked`; reason for revoking a previously valid acknowledgement |
| `notes` | HR Admin notes on this specific acknowledgement record |

### Unique Constraints
- `(tenant_id, employee_id, policy_document_id)` where `status NOT IN ('revoked')` — at most one active acknowledgement per employee per policy version (partial unique index)

### Validation Rules
- `document_signature_id` must be non-null when `acknowledgement_method = e_signature`
- `acknowledged_at` must be non-null when `status = acknowledged`
- `acknowledged_by` must be non-null when `status = acknowledged`
- `exemption_reason`, `exempted_by`, and `exempted_at` must all be set or all be null
- `revocation_reason`, `revoked_by`, and `revoked_at` must all be set or all be null
- `is_within_deadline` and `is_overdue` must not both be true simultaneously
- `status = overdue` requires `acknowledged_at` to be null (it was not acknowledged)

### Lifecycle
```
pending → acknowledged (terminal — immutable)
pending → overdue (system-set the day after acknowledgement deadline)
overdue → acknowledged (late but eventually completed — terminal)
pending → exempted (HR Admin grants exemption)
acknowledged → revoked (exceptional — HR Admin with audit trail)
```
- `pending` — Acknowledgement request created; employee has not yet responded
- `acknowledged` — Employee has confirmed acknowledgement; record is immutable
- `overdue` — Acknowledgement deadline passed without employee response; employee may still acknowledge
- `exempted` — Employee formally exempted from this policy's acknowledgement requirement
- `revoked` — Previously acknowledged; revoked by HR Admin with documented reason

### Audit Requirements
- All `acknowledged` status transitions must be logged with: employee, policy document version, acknowledgement method, IP address (for digital methods), and timestamp
- All revocations must require a two-step confirmation from an HR Admin and must be logged in full with the revocation reason
- The compliance dashboard must be able to produce a point-in-time report showing all employees' acknowledgement status for any policy version, as of any historical date

---

## 5. Consent Record

### Purpose
A Consent Record captures a data subject's (employee's) explicit consent or withdrawal of consent for a specific category of personal data processing. It is the platform's evidence of compliance with consent obligations under GDPR (Articles 6, 7, 9), India's Digital Personal Data Protection Act 2023 (DPDP Act), and equivalent data protection frameworks.

### Business Description
An employee's personal data is processed for many purposes across the HRMS: running payroll, calculating statutory deductions, verifying identity, sending communications, conducting background checks, processing health or disability data for benefits. Each purpose may require a different legal basis and, where the legal basis is consent, a separately recorded consent event.

Consent Record is not about the policies that govern data processing at the organizational level — that is covered by the company's Privacy Notice and Privacy Policy. Consent Record is about the individual data subject's specific grant or withdrawal of permission for a specific processing purpose at a specific moment in time.

Key properties of a legally valid consent under GDPR and DPDP Act:
- **Informed** — The data subject was shown the specific purpose and data types before consenting
- **Freely given** — Consent was not bundled with a condition of employment (for most non-essential processing purposes)
- **Specific** — Each purpose requires a separate consent; one blanket consent is not valid
- **Revocable** — The data subject must be able to withdraw consent, and the system must record the withdrawal
- **Evidenced** — The exact text shown to the user at the time of consent must be preserved

Consent Record captures all of these. `consent_text_hash` is a SHA-256 hash of the consent text shown to the user at the time of consent, enabling the organization to prove that the user saw specific text without storing the full text redundantly per record (the full text versions are stored in a consent text version registry).

### Relationships
- **One Consent Record → One Tenant**
- **One Consent Record → One Employee Profile** (the data subject; `employee_id`)
- **One Consent Record → One User** (`collected_by` — who presented the consent form; may be `system` for automated presentation)
- **Referenced by** DSAR (Data Subject Access Request) export, privacy compliance reports, data deletion/anonymization workflows

### Business Rules
1. Consent Records are **append-only**. Consent is never modified — a withdrawal of consent creates a new Consent Record with `status = withdrawn` linked via `replaces_consent_id` to the original grant record. The original grant record is never touched.
2. Each active consent is identified by `(tenant_id, employee_id, consent_type, purpose_code)`. At any given time, there must be at most one record in `status = active` for a given combination. This is the "current state" of consent for that purpose.
3. `consent_type` identifies the category of personal data or processing activity being consented to. Each type maps to a regulatory classification. Types include: `general_data_processing` (standard employment HR data), `sensitive_data_processing` (health, disability, biometric), `marketing_communications` (newsletters, employer branding), `background_verification` (third-party checks), `data_transfer_international` (transfers to processors in other countries), `biometric_data` (fingerprint attendance systems), `analytics_profiling` (performance analytics, predictive tools), `third_party_sharing` (sharing with payroll processors, benefits providers).
4. `legal_basis` records the legal basis claimed for this processing activity under GDPR Article 6 (or equivalent). Where the legal basis is `consent`, this record is the evidence. Where the legal basis is `contract`, `legal_obligation`, or `legitimate_interest`, consent may still be recorded as a formality of notification, but its withdrawal does not legally mandate cessation of processing (and `legal_basis_note` must explain this to the data subject).
5. `consent_text_hash` is a SHA-256 hash of the full text of the consent statement shown to the user. The full text must be stored in a consent text version registry (not modeled here; a system configuration entity keyed by hash) so that the exact wording can be reproduced for regulatory evidence.
6. `collection_method` records how consent was gathered: `web_portal_checkbox` (interactive), `onboarding_form` (part of the joining form), `email_confirmation` (email with a confirmation link), `paper_form_digitized` (physical form entered by HR), `verbal_with_witness` (recorded verbal consent with HR as witness — used rarely, requires `witness_id`).
7. `expires_at` may be set for consent types that have a defined validity period (e.g., background verification consent is valid for one year per hire). When the expiry date passes, the system transitions the record to `status = expired` and, if the processing purpose is still active, creates a new consent request.
8. Withdrawal of consent must be processed within 72 hours of the employee's request per GDPR Article 7(3). The system must create the withdrawal Consent Record immediately upon the employee's action and trigger a data processing cessation workflow for the relevant purpose.
9. `data_types_covered` lists the specific personal data fields or categories included in this consent (e.g., `["date_of_birth", "health_data", "biometric_fingerprint"]`). This enables precise scoping — a consent for biometric data does not extend to health data.
10. Consent Records for a terminated employee must be retained for the statutory retention period even after the employee's departure. Proof of consent must be available for regulatory investigation even after the employment relationship ends.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile — the data subject |
| `consent_type` | Category of processing being consented to: `general_data_processing`, `sensitive_data_processing`, `marketing_communications`, `background_verification`, `data_transfer_international`, `biometric_data`, `analytics_profiling`, `third_party_sharing` |
| `purpose_code` | Specific processing purpose identifier (e.g., `BG_CHECK_JOINING`, `BIOMETRIC_ATTENDANCE_GGN`, `SALARY_PROCESSOR_ADP`) |
| `purpose_description` | Human-readable statement of the specific processing purpose |
| `legal_basis` | Legal basis for processing: `consent`, `contract`, `legal_obligation`, `vital_interests`, `legitimate_interest`, `public_task` |
| `status` | Lifecycle state: `active`, `withdrawn`, `expired`, `superseded` |
| `consent_text_hash` | SHA-256 hash of the exact consent statement text shown to the data subject |
| `collection_method` | How consent was collected: `web_portal_checkbox`, `onboarding_form`, `email_confirmation`, `paper_form_digitized`, `verbal_with_witness` |
| `collected_at` | Timestamp when the consent was given or when the withdrawal was recorded |
| `collected_by` | FK to User — who presented the consent form (system or HR Admin) |
| `created_at` | Timestamp |

### Optional Fields
| Field | Description |
|-------|-------------|
| `data_types_covered` | Array of specific data categories or field names covered by this consent |
| `ip_address` | Source IP address of the data subject at the time of consent (for digital methods) |
| `device_fingerprint` | SHA-256 hash of device characteristics for consent attribution evidence |
| `expires_at` | Expiry date for time-limited consents |
| `withdrawn_at` | Timestamp of withdrawal; set on withdrawal records |
| `withdrawal_reason` | Data subject's stated reason for withdrawal (optional; may assist compliance response) |
| `replaces_consent_id` | FK to Consent Record (self) — the prior consent record this record supersedes or revokes |
| `legal_basis_note` | Explanation presented to the data subject when `legal_basis ≠ consent` (clarifying their rights) |
| `witness_id` | FK to User — HR witness for `collection_method = verbal_with_witness` |
| `processor_name` | Name of the third-party processor this consent relates to (e.g., "ADP Payroll India Pvt Ltd") |
| `cross_border_destination` | Country code(s) for `consent_type = data_transfer_international` |
| `metadata` | JSONB — additional attributes specific to the consent context |

### Unique Constraints
- `(tenant_id, employee_id, consent_type, purpose_code, status)` where `status = active` — at most one active consent per data subject per purpose (partial unique index)

### Validation Rules
- `legal_basis` must be one of the defined values; it cannot be a freeform string
- `consent_type` must be one of the defined controlled vocabulary values
- `collection_method = verbal_with_witness` requires `witness_id` to be set
- `consent_type = data_transfer_international` requires `cross_border_destination` to be set
- `status = withdrawn` requires `withdrawn_at` to be set
- `replaces_consent_id`, when set, must reference a Consent Record with `status` in `active` or `expired` — a withdrawn consent cannot be withdrawn again
- `consent_text_hash` must be a 64-character hexadecimal string (SHA-256)
- `data_types_covered`, when set, must be a non-empty array

### Lifecycle
```
active → withdrawn (data subject exercises right to withdraw)
active → expired (time-limited consent passes expiry date)
active → superseded (a new consent record replaces this one via replaces_consent_id)
```
- `active` — Consent is in force; processing is permitted under this basis
- `withdrawn` — Data subject has withdrawn consent; processing based solely on this consent must cease
- `expired` — Time-limited consent has passed its `expires_at` date
- `superseded` — Replaced by an updated consent record (e.g., after a policy text revision that required re-consent)

### Audit Requirements
- All consent events (initial grant, withdrawal, expiry) must be logged with the exact timestamp, collection method, and the hash of the consent text displayed
- Withdrawal events must trigger an automated notification to the tenant's Data Protection Officer (or designated HR compliance contact)
- All Consent Records for a given employee must be exportable as part of a DSAR response in machine-readable format within the regulatory response window

---

## 6. Data Export Log

### Purpose
A Data Export Log records every event in which personal, financial, or operationally sensitive data was extracted from the Evolve HRMS platform in bulk or on an ad-hoc basis. It is the platform's implementation of GDPR Article 30 (Records of Processing Activities) for data egress events, and the primary forensic resource for data breach investigation and insider threat detection.

### Business Description
Data leaves the HRMS platform in many ways: an HR Admin exports the employee list to a spreadsheet, a payroll accountant downloads the monthly payroll register, a manager pulls a leave report for their team, a data subject submits a Data Subject Access Request (DSAR) and receives an extract of all their personal data, an integration API pulls attendance records to a third-party system, or a Super Admin performs a full tenant data export for migration.

Without a Data Export Log, the organization cannot answer the most fundamental question in a data breach investigation: "Who had access to this data, and when?" GDPR's 72-hour breach notification obligation requires being able to scope the breach — which records were potentially exposed, over what time period, and to whom.

Data Export Log is not a record of every individual API read (that would be unmanageable). It covers three classes of egress events:
1. **Bulk exports** — any operation that extracts more than one employee's data in a single request
2. **Sensitive field exports** — any operation that includes fields classified as `sensitive_pii` (PAN, Aadhaar, salary, bank account details) regardless of row count
3. **DSAR exports** — any structured data subject access request response
4. **Integration pull events** — any external system pulling data via API that covers more than a threshold record count

Every covered egress event must produce exactly one Data Export Log record. The record captures what was exported (entity types), who exported it, why, how many records, what filters bounded it, and — critically — whether the exported file was stored and where.

### Relationships
- **One Data Export Log → One Tenant**
- **One Data Export Log → One User** (`requested_by` — the human who initiated the export; null for automated integration pulls)
- **One Data Export Log → One Document File** (`export_file_id` — if the export was written to a file stored in the Documents module; null for streamed downloads not retained)
- **Referenced by** GDPR Article 30 register, Data breach investigation tooling, Insider threat analytics, DSAR completion records

### Business Rules
1. Data Export Log records are **immutable** once created. No UPDATE or DELETE is permitted.
2. Every export that satisfies the coverage criteria (bulk, sensitive field, DSAR, or integration threshold) must produce a Data Export Log entry. Failure to produce an entry must cause the export operation to fail. An export without a log record is a compliance violation.
3. `export_scope` is a structured summary of what was exported — it must include: the entity types covered (e.g., `["emp_profiles", "emp_compensation", "pay_run_lines"]`), the approximate row count per entity type, and the field list if the export was field-selective.
4. `filters_applied` captures the query parameters or filter state that bounded the export (e.g., `{"department_id": "...", "date_range": {"from": "2025-01-01", "to": "2025-03-31"}}`). This is essential for scoping a data breach — it tells investigators which specific subset of records was potentially exposed.
5. `record_count` is the total number of data subject records included in the export. For an employee list export with 250 employees, `record_count = 250`. For a payroll register with 250 employees and 12 pay periods, `record_count = 250` (data subjects) with `row_count = 3000` (rows in the file).
6. `contains_sensitive_fields` is a Boolean set to `true` when the export includes any field with `data_classification` of `sensitive_pii` or `financial`. This flag enables rapid scoping in a breach scenario ("which exports contained salary data?").
7. `purpose` and `legal_basis` must be recorded for all exports. These fields document the processing activity under GDPR Article 30 and must align with the tenant's Records of Processing Activities (RoPA). For routine HR reporting, `legal_basis = legitimate_interest` and `purpose = hr_administration` is standard. For DSAR exports, `legal_basis = legal_obligation` and `purpose = data_subject_access_request`.
8. `export_file_id` references the Document File created for the exported data, if the export was written to a stored file. For streamed downloads (returned directly over HTTP without storage), `export_file_id` is null but `download_count` must be tracked.
9. `download_count` is incremented each time the export file is downloaded. If a stored export file is downloaded 3 times (shared with 3 colleagues), each download must be recorded — this is the only way to determine how many copies of the data may exist outside the system.
10. `accessed_by` tracks which User accounts downloaded the export file after its creation (for stored exports shared via a link). It is a JSONB array of `{user_id, downloaded_at, ip_address}` objects.
11. `expires_at` sets the time at which the stored export file is automatically purged. Exports containing sensitive PII must not be retained indefinitely. Default retention for sensitive exports: 7 days. For DSAR exports: 30 days (or per regulatory requirement). After expiry, the Document File is deleted and `status = expired` is set on the Data Export Log.
12. For integration API pull events (`export_type = integration_pull`), `requested_by` is null and `integration_name` must identify the external system. `integration_name` must match a registered integration identifier in the tenant's integration registry.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `export_type` | Category of the export event: `employee_list`, `payroll_register`, `attendance_report`, `leave_report`, `dsar_export`, `custom_query_export`, `integration_pull`, `full_tenant_export`, `compliance_report`, `audit_trail_export` |
| `entity_types_included` | Array of entity type codes included in the export (e.g., `["emp_profiles", "emp_compensation", "pay_run_lines"]`) |
| `record_count` | Number of distinct data subject (employee) records included |
| `contains_sensitive_fields` | Boolean — true if any `sensitive_pii` or `financial` classified fields are included |
| `purpose` | Human-readable statement of the export's business purpose |
| `legal_basis` | Legal basis for this egress activity: `legitimate_interest`, `legal_obligation`, `consent`, `contract` |
| `output_format` | File format of the export: `csv`, `xlsx`, `pdf`, `json`, `xml` |
| `status` | `pending`, `completed`, `failed`, `expired` |
| `initiated_at` | Timestamp when the export was requested |
| `created_at` | Timestamp |
| `created_by` | FK to User |

### Optional Fields
| Field | Description |
|-------|-------------|
| `requested_by` | FK to User — the human who initiated the export; null for automated integration pulls |
| `integration_name` | Identifier of the external integration system for `export_type = integration_pull` |
| `export_file_id` | FK to Document File (Documents module) — null for non-retained streamed downloads |
| `filters_applied` | JSONB — query filters that bounded the export; required for compliance scoping |
| `export_scope` | JSONB — structured breakdown of entity types and field lists in the export |
| `row_count` | Total number of rows in the export file (may differ from `record_count` for multi-row-per-employee formats) |
| `completed_at` | Timestamp when the export was fully generated |
| `download_count` | Number of times the export file has been downloaded |
| `first_downloaded_at` | Timestamp of the first download |
| `last_downloaded_at` | Timestamp of the most recent download |
| `accessed_by` | JSONB array of `{user_id, downloaded_at, ip_address}` objects for post-creation downloads |
| `expires_at` | Timestamp after which the stored export file is purged |
| `failure_reason` | Machine-readable reason for `status = failed` |
| `ip_address` | Source IP address of the user who initiated the export |
| `approved_by` | FK to User — required for export types that need a secondary approval (e.g., `full_tenant_export`, `dsar_export`) |
| `approved_at` | Timestamp of approval |
| `notes` | Optional free-text note from the initiating user stating the export's business context |

### Unique Constraints
- None beyond primary key. Multiple exports of the same type may legitimately occur on the same day.

### Validation Rules
- `export_type` must be one of the defined controlled vocabulary values
- `entity_types_included` must be a non-empty array of known entity type codes
- `record_count` must be a non-negative integer
- `contains_sensitive_fields = true` triggers an automatic `approved_by` requirement for export types where tenant settings require dual authorization for sensitive exports
- `legal_basis` must be one of the defined values
- `export_type = integration_pull` requires `integration_name` to be set
- `accessed_by`, when set, must be a valid JSON array where each element has `user_id`, `downloaded_at`, and `ip_address`
- `expires_at`, when set, must be after `completed_at`

### Lifecycle
```
pending → completed → expired (after retention period)
pending → failed (terminal — export generation failed)
```
- `pending` — Export has been requested; generation in progress
- `completed` — Export generated successfully; available for download (if stored)
- `failed` — Export generation failed; `failure_reason` recorded; no file produced
- `expired` — Retention period elapsed; stored file purged; log record retained

### Audit Requirements
- All Data Export Log records are themselves audit artifacts. They must be included in any GDPR Article 30 RoPA report for the tenant.
- For `export_type = dsar_export`, the completion of the export must trigger a notification to the Data Protection Officer and must be linked to the original DSAR request record.
- For `contains_sensitive_fields = true` exports, the `accessed_by` field must be updated synchronously on every download event — not asynchronously.
- All exports with `record_count > 1000` or `contains_sensitive_fields = true` must produce an automated alert to the Compliance Officer role holder for the tenant.

---

## Business Invariants

The following cross-entity invariants must hold at all times across the Audit & Compliance module.

### Invariant 1 — Complete write coverage
Every application write operation that modifies a business entity must produce an Audit Log record in the same database transaction. An entity modification without an Audit Log record is an invalid system state. The audit service must enforce this at the service layer; it must not be left to individual module developers.

### Invariant 2 — Entity Change Log completeness for updates
Every Audit Log record with `action_type = update` or `action_type = bulk_update` must have at least one associated Entity Change Log record. An update audit with no field changes recorded is an invalid state (it means either the write was a no-op and should not have produced an Audit Log, or the change capture failed).

### Invariant 3 — Session continuity
All Audit Log records with a non-null `session_id` must have a corresponding Login Event record with the same `session_id` and `event_type = login_success`. A session cannot exist in the audit trail without a recorded login.

### Invariant 4 — Consent currency
For any active processing purpose that has `consent` as its legal basis, there must be exactly one Consent Record with `status = active` for each applicable employee. If a consent is withdrawn, the downstream processing workflows for that purpose must be halted before the 72-hour regulatory deadline.

### Invariant 5 — Policy Acknowledgement coverage
For every Policy Document with `acknowledgement_required = true` and `status = published`, there must be a Policy Acknowledgement record for every employee in scope (as defined by `policy_document.applies_to`). The record may be in `pending`, `acknowledged`, `overdue`, or `exempted` status — but it must exist. Absence of a record means the compliance tracking system has a gap, which is itself a compliance failure.

### Invariant 6 — Export logging completeness
Every bulk data export, sensitive field export, DSAR export, and integration pull that satisfies the coverage criteria must have a Data Export Log record created before the first byte of data is sent to the client. An export without a log record must not proceed.

### Invariant 7 — Immutability of all records
No record in the `aud_*` table namespace may be the subject of an UPDATE statement in any application code path. The database role used by the application must have INSERT-only rights on all `aud_*` tables. UPDATE rights on `aud_*` tables must be held exclusively by the system purge process, which may only set `deleted_at` on records that have exceeded their retention period.

---

## Module Permissions Reference

| Permission Code | What It Allows |
|-----------------|----------------|
| `audit:log:view` | View Audit Log records for the tenant (HR Admin, Compliance Officer) |
| `audit:change_log:view` | View Entity Change Log records (standard fields) |
| `audit:change_log:view_sensitive` | View Entity Change Log records for `sensitive_pii` and `financial` classified fields (unmasked) |
| `audit:login_event:view` | View Login Event records for the tenant |
| `audit:login_event:view_all` | View Login Events across all tenants (Super Admin / Platform Security) |
| `audit:policy_ack:view` | View Policy Acknowledgement records and acknowledgement status dashboard |
| `audit:policy_ack:manage` | Create, exempt, and revoke Policy Acknowledgement records |
| `audit:consent:view` | View own Consent Records (Employee — self-service) |
| `audit:consent:view_all` | View all Consent Records for the tenant (DPO, Compliance Officer) |
| `audit:consent:manage` | Record new consents and process withdrawals on behalf of employees |
| `audit:export_log:view` | View Data Export Log records for the tenant |
| `audit:export_log:view_all` | View Data Export Log records across all tenants (Super Admin) |
| `audit:export:approve` | Approve sensitive or high-volume export requests requiring dual authorization |
| `audit:purge:authorize` | Authorize the purge of audit records after retention period (Super Admin only) |
