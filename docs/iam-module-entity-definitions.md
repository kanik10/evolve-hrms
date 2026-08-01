# Evolve HRMS — Identity & Access Module: Business Entity Definitions

**Classification:** Internal Engineering Reference  
**Status:** Finalized  
**Module:** Identity & Access (IAM)  
**Preceding Documents:** `docs/database-standards.md`, `docs/entity-inventory.md`, `docs/org-module-entity-definitions.md`

---

## Overview

The Identity & Access module is the security spine of Evolve HRMS. It controls who can log in, what they can see, and what they are permitted to do — across every module, every tenant, and every data boundary.

This is not a generic auth library. It is a purpose-built IAM model for a multi-tenant enterprise HRMS where the same system serves Super Admins managing the platform, HR Admins configuring an organization, Managers approving requests for their teams, and Employees viewing only their own data. Each of these actors needs fundamentally different access, sometimes within the same tenant.

The model follows a **Role-Based Access Control (RBAC)** pattern layered with **scope constraints** to enforce data boundary rules. Permissions represent atomic capabilities. Roles bundle permissions into named job functions. Scopes constrain the organizational boundary within which a Role's permissions are effective. Together they form the complete authorization answer: *who can do what, on which data, in which boundary.*

No module, API endpoint, or UI component may implement its own authorization logic. All authorization decisions must be resolved by evaluating this model.

---

## Design Principles

| Principle | Statement |
|-----------|-----------|
| **Deny by default** | A user has no access to anything unless it is explicitly granted through a Role assignment. There are no implicit permissions. |
| **Least privilege** | Users are granted the minimum permissions needed to perform their job. Broad roles like "admin" must be granted deliberately and audited. |
| **Separation of concerns** | Permissions describe capability. Roles describe job function. Scopes describe data boundary. These three concepts are modeled separately and composed at runtime. |
| **Tenant isolation is absolute** | No user may access data belonging to another Tenant. This is enforced structurally by the data model, not by application code alone. |
| **Auditability is non-negotiable** | Every grant, revocation, and privilege escalation must produce an immutable audit record with actor, target, and timestamp. |
| **Human identity is separate from system credentials** | A User represents the human. Their authentication credential (password hash, MFA secret, SSO token) is stored in a separate User Identity entity to allow credential rotation without touching the User record. |

---

## Entity Index

1. [User](#1-user)
2. [User Identity](#2-user-identity)
3. [Role](#3-role)
4. [Permission](#4-permission)
5. [Role Permission](#5-role-permission)
6. [User Role Assignment](#6-user-role-assignment)
7. [Access Scope](#7-access-scope)

---

## Relationship Overview

```
Tenant
  └── User ─────────────── User Identity (1:1)
        │
        ├── User Role Assignment (N) ──── Role ──── Role Permission (N) ──── Permission
        │         │
        │         └── Access Scope (0..1)
        │                └── scoped to: Legal Entity | Business Unit | Department | Location
        │
        └── Employee Profile (1:1 optional)
```

**Authorization resolution at runtime:**

```
Request: "Can user U perform action A on resource R?"

1. Load all active User Role Assignments for user U
2. For each assignment, load the Role's Permission set via Role Permissions
3. If any Role contains Permission for action A:
   a. Check if the Role Assignment has an Access Scope
   b. If scoped: verify resource R falls within the scope boundary
   c. If unscoped: grant applies across the entire tenant
4. If no matching permission found → DENY
```

---

## 1. User

### Purpose
A User is a human actor who has been granted access to the Evolve HRMS platform within a Tenant. The User record holds identity, contact information, and the current account state. It is the subject of all authorization decisions.

### Business Description
Every person interacting with the system — whether an HR Admin configuring leave policies, a Manager approving a salary revision, or an Employee viewing their payslip — is represented as a User. Users are always scoped to a Tenant; there is no cross-tenant user record.

A User may or may not be linked to an Employee Profile. HR Admins, Super Admins, and system integrators may be Users with no corresponding employee record. Conversely, every employee in the system will have exactly one User account created at onboarding that links to their Employee Profile.

A User's identity credentials (password, MFA, SSO tokens) are deliberately stored in a separate User Identity entity (§2). This allows security operations (credential reset, MFA enforcement, SSO migration) to be performed without modifying the User record and without touching HR data.

### Relationships
- **One User → One Tenant** (a user belongs to exactly one tenant)
- **One User → One User Identity** (authentication credentials, 1:1)
- **One User → Zero or One Employee Profile** (employee users link to their HR record)
- **One User → Many User Role Assignments** (the roles they hold)
- **One User → Many audit columns** (`created_by`, `updated_by`, `deleted_by`) across all entities in the system

### Business Rules
1. A User must belong to exactly one Tenant. Users cannot be shared across tenants.
2. A User's `email` is their primary identifier within the system. It must be unique per tenant and is used for login, notifications, and password resets.
3. An Employee Profile may not exist without a corresponding User. When an employee is onboarded, their User account is created first; the Employee Profile is then linked to that User.
4. A User can exist without an Employee Profile — for system admins, integration service accounts, and external auditors.
5. A User with `status = deactivated` cannot log in and cannot be assigned new Roles, but their historical audit records must be preserved with their `user_id` intact.
6. A User's email address may not be changed if it is used as their SSO identifier. Email changes require the HR Admin to confirm intent and re-verify the new address.
7. A User marked as `is_service_account` represents a machine/API client identity, not a human. Service accounts cannot hold HR-facing roles and cannot be linked to an Employee Profile.
8. Deactivating a User does not delete their Role Assignments — those are merely suspended. If the User is reactivated, Role Assignments are reinstated.
9. A single `email` address may not be assigned to more than one active User within the same tenant.
10. The Evolve platform Super Admin Users exist outside any tenant scope. They are modeled in a separate system-level user store, not in the tenant `users` table.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 — primary key |
| `tenant_id` | FK to Tenant |
| `email` | Primary login identifier. Must be unique within the tenant. |
| `first_name` | User's given name |
| `last_name` | User's family name |
| `status` | Current account lifecycle status |
| `is_service_account` | Boolean — machine/API identity flag |
| `created_at` | Timestamp |
| `updated_at` | Timestamp |

### Optional Fields
| Field | Description |
|-------|-------------|
| `employee_id` | FK to Employee Profile — set when a User corresponds to an employee |
| `phone_number` | Mobile number for SMS OTP and MFA fallback |
| `display_name` | Override for how this user's name appears in the UI (defaults to `first_name + last_name`) |
| `avatar_url` | Profile picture URL |
| `preferred_language` | ISO 639-1 language code for UI localization |
| `preferred_timezone` | IANA timezone — overrides the tenant default for this user's session display |
| `invited_at` | Timestamp when the invitation email was sent |
| `last_login_at` | Timestamp of the most recent successful login (updated on each login; not an audit field) |
| `deactivated_at` | Timestamp of when the account was deactivated |
| `deactivated_by` | FK to User — who performed the deactivation |
| `notes` | Internal HR notes about this user account (not visible to the user) |

### Unique Constraints
- `(tenant_id, email)` — email unique per tenant
- `(tenant_id, employee_id)` where not null — each employee linked to at most one user per tenant

### Validation Rules
- `email` must be a valid RFC 5321 email address; must be lowercased before storage
- `first_name` and `last_name` must each be 1–100 characters
- `phone_number`, if provided, must be a valid E.164 format number (`+[country_code][number]`)
- `preferred_language`, if set, must be a valid ISO 639-1 code
- `preferred_timezone`, if set, must be a valid IANA timezone identifier
- `is_service_account` cannot be `true` if `employee_id` is set

### Lifecycle
```
invited → active → suspended → deactivated
             ↑_______↓
          (reactivation from suspended only)
```
- `invited` — Account created; invitation email sent; user has not yet set their password
- `active` — Authenticated and operational
- `suspended` — Temporarily blocked (e.g., non-compliance, security hold, parental leave). Login denied. Roles preserved.
- `deactivated` — Permanent. Employee has left the organization or account is retired. Login denied. All Role Assignments are effectively revoked. Record is soft-deleted but retained.

### Audit Requirements
- Every status transition must be logged: acting user, old status, new status, timestamp, reason
- `email` changes must be logged with old and new values
- Account creation (who created it, when) must be logged
- `last_login_at` is updated on every login — this is not an audit log entry; it is a mutable operational field
- Any `is_service_account` flag change must be logged with justification
- Login failures (incorrect password, locked account) are captured in a separate `sys_auth_events` log, not in the User audit trail

---

## 2. User Identity

### Purpose
User Identity stores the authentication credentials and security configuration for a User — separated from the User record to isolate sensitive credential data, enforce strict access control over it, and allow credential lifecycle operations without touching HR or profile data.

### Business Description
Authentication answers: "Is this person who they claim to be?" The User Identity entity holds everything that answers that question: the hashed password, MFA configuration, SSO provider link, login attempt counters, and session security settings.

Separating User Identity from User ensures:
- The HR team can manage User profile data (name, email, department) without ever touching authentication secrets.
- Security engineers can rotate credentials, enforce MFA, or link SSO without modifying the User record.
- Auditing of credential changes is isolated to a high-sensitivity log and not mixed with profile change history.
- In a microservices future, the auth service can own User Identity entirely while the HRMS service owns User.

There is exactly one User Identity per User. It is created atomically with the User record.

### Relationships
- **One User Identity → One User** (1:1, mandatory)
- **One User Identity → One Tenant** (via User)

### Business Rules
1. A User Identity record must be created at the same time as the User record — they are created atomically.
2. Passwords must never be stored in plaintext. The `password_hash` field stores only the output of an approved hashing algorithm (Argon2id is required; bcrypt is acceptable as a fallback for legacy migrations).
3. The `password_hash` field must never be returned in any API response, included in any log, or passed through any message queue. It must only ever be read in the authentication service for comparison.
4. If the tenant has SSO enabled (`auth_provider = sso`), password-based login must be disabled for non-service-account users unless explicitly allowed by the tenant's security policy.
5. `failed_login_count` is incremented on every failed login attempt and reset to 0 on successful login. When it reaches the `max_failed_login_attempts` threshold (system-configured, default: 5), the account must be automatically `locked_until` a time-bounded cooldown period.
6. An account locked due to failed attempts unlocks automatically when `locked_until` passes. It may also be manually unlocked by an HR Admin, which must be logged.
7. MFA is enforced per tenant policy. If `mfa_enforced` is set at the tenant level, users with `mfa_enabled = false` must be prompted to enroll on their next login and cannot bypass it.
8. MFA secrets (`mfa_secret`) must be encrypted at rest and treated with the same sensitivity as `password_hash`.
9. `email_verified` must be `true` before an `invited` user can be moved to `active`. Email verification uses a time-limited token, not stored in this entity (it is stored in a transient token store).
10. Password reset tokens are not stored in this entity — they are stored in a dedicated, short-lived token store outside the main database with a TTL of 15 minutes.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `user_id` | FK to User (1:1) |
| `auth_provider` | How this user authenticates: `password`, `google_sso`, `microsoft_sso`, `saml`, `api_key` |
| `email_verified` | Boolean — whether the email address has been confirmed |
| `mfa_enabled` | Boolean — whether MFA is active for this user |
| `failed_login_count` | Integer — count of consecutive failed login attempts |
| `created_at` | Timestamp |
| `updated_at` | Timestamp |

### Optional Fields
| Field | Description |
|-------|-------------|
| `password_hash` | Argon2id hash of the user's password. Null if `auth_provider != password` |
| `password_changed_at` | Timestamp of last password change. Used for password expiry enforcement. |
| `mfa_secret` | Encrypted TOTP secret (e.g., for Google Authenticator). Null if MFA is not enabled. |
| `mfa_backup_codes` | Encrypted array of one-time backup codes. Consumed on use. |
| `mfa_enrolled_at` | Timestamp when MFA was activated |
| `sso_provider_user_id` | The subject identifier from the SSO provider (e.g., Google sub claim, Azure OID) |
| `sso_provider_email` | Email as returned by the SSO provider (may differ from the User's primary email) |
| `locked_until` | Timestamp until which the account is locked due to failed attempts. Null = not locked. |
| `last_password_change_at` | Timestamp of most recent successful password change |
| `force_password_reset` | Boolean — forces the user to reset password on next login (set by admin or on first invite) |
| `api_key_hash` | Hashed API key for service accounts using `api_key` auth provider |
| `api_key_last_used_at` | Timestamp of last API key usage |
| `api_key_expires_at` | Expiry date for the API key |

### Unique Constraints
- `user_id` — one User Identity per User (1:1)
- `sso_provider_user_id` — unique per tenant when set (prevents SSO identity collision)

### Validation Rules
- `auth_provider` must be one of: `password`, `google_sso`, `microsoft_sso`, `saml`, `api_key`
- If `auth_provider = password`, `password_hash` must be set
- If `auth_provider` is an SSO variant, `sso_provider_user_id` must be set
- `failed_login_count` must be a non-negative integer
- `mfa_backup_codes`, if set, must be a non-empty array; each code must be consumed and removed on use
- `api_key_expires_at`, if set, must be a future timestamp at the time of creation

### Lifecycle
The User Identity lifecycle mirrors the User lifecycle exactly. It has no independent lifecycle state. When a User is deactivated, the User Identity becomes inert — login is rejected at the User status check before credentials are even evaluated.

### Audit Requirements
- `password_hash` changes (password resets, password changes) must be logged with timestamp and whether the change was self-initiated or admin-forced. The old hash must never be logged.
- `mfa_enabled` changes (enrollment and disablement) must be logged
- `force_password_reset` activations must be logged with the admin who set it
- Account lock events (`locked_until` set) must be logged with the final failed attempt timestamp
- Manual unlock events (admin clearing `locked_until`) must be logged
- `sso_provider_user_id` changes (SSO re-linking) must be logged
- `api_key_hash` rotation events must be logged

---

## 3. Role

### Purpose
A Role is a named collection of Permissions that represents a job function or access profile within the HRMS. Roles are assigned to Users and serve as the primary mechanism for granting access. Permissions are never assigned directly to users — only through Roles.

### Business Description
Rather than managing permissions for individual users (which becomes unmanageable at scale), the system groups related permissions into Roles that map to recognizable job functions. When an HR manager joins, you assign them the "HR Manager" Role — they inherit all the permissions that role carries. When access requirements change for that function, you update the Role once, and it takes effect for all users holding it.

Every Tenant starts with a set of system-defined Roles (immutable defaults defined by the platform) and may create custom Roles for their specific organizational structure.

**System Roles** (platform-defined, cannot be deleted or fully modified):

| Role Name | Audience |
|-----------|----------|
| `HR Super Admin` | Full HR system admin for the tenant; manages all modules, all employees |
| `HR Manager` | Manages HR operations; cannot access payroll sensitive data by default |
| `Payroll Admin` | Full payroll access; limited HR profile access |
| `Finance Viewer` | Read-only access to payroll and cost center reports |
| `Recruiter` | Full access to Recruitment module only |
| `Department Manager` | Scope-limited: can approve leave, view attendance, initiate reviews for their department |
| `Employee` | Self-service only: own profile, own payslips, own leave requests |
| `IT Admin` | User management, SSO configuration, API keys |

**Custom Roles** are created by the tenant's HR Admin to model roles that don't fit the system defaults.

### Relationships
- **One Role → One Tenant**
- **One Role → Many Role Permissions** (the permissions bundled into this role)
- **One Role → Many User Role Assignments** (the users who hold this role)

### Business Rules
1. Permissions are never directly assigned to a User. The only path to a permission is through a Role.
2. A User may hold multiple Roles simultaneously. Their effective permission set is the union of all permissions across all their active Role Assignments.
3. System Roles (`is_system_role = true`) are created by the platform and exist in every new tenant automatically. Their core permission set cannot be removed — only additional permissions may be added by the tenant.
4. System Roles cannot be deleted by tenant admins. They can be set to `inactive` to prevent new assignments, but existing assignments are not automatically revoked.
5. Custom Roles (`is_system_role = false`) are fully tenant-managed — created, edited, and deleted by the HR Admin.
6. A Custom Role cannot be deleted if it has active User Role Assignments. It must be set to `inactive` first, and users must be reassigned.
7. A Role must have at least one Role Permission before it can be assigned to users.
8. Role names must be unique within a tenant.
9. Roles are tenant-scoped. There are no cross-tenant roles, and no user from Tenant A can hold a role from Tenant B.
10. The `Employee` system role is automatically assigned to every new user with a linked Employee Profile at the time of account creation. It cannot be revoked from employees.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `name` | Display name of the role (e.g., "HR Manager", "Payroll Admin") |
| `code` | Internal identifier (e.g., `HR_MANAGER`, `PAYROLL_ADMIN`) |
| `is_system_role` | Boolean — whether this is a platform-defined non-deletable role |
| `status` | Current lifecycle status |

### Optional Fields
| Field | Description |
|-------|-------------|
| `description` | Narrative describing who should hold this role and what they can do |
| `is_scopable` | Boolean — whether this role supports Access Scope constraints (§7). Not all roles are meaningfully scopable. |
| `cloned_from_role_id` | FK to Role — if this custom role was created by cloning a system role, records the origin |
| `sort_order` | Integer for display ordering in the role management UI |

### Unique Constraints
- `(tenant_id, code)` — Role code unique per tenant
- `(tenant_id, name)` — Role name unique per tenant

### Validation Rules
- `code` must be 2–50 characters, uppercase with underscores (`^[A-Z_]{2,50}$`)
- `name` must be 2–100 characters
- System roles (`is_system_role = true`) may only be created by the platform provisioning process, not by tenant admin API calls
- `cloned_from_role_id`, if set, must reference a role in the same tenant

### Lifecycle
```
draft → active → inactive
```
- `draft` — Being configured; permissions can be added freely; not assignable to users
- `active` — Assignable to users
- `inactive` — No new assignments; existing User Role Assignments are preserved but effectively suspended pending admin review

### Audit Requirements
- Role creation logged (who, when, is_system_role flag)
- Every Role Permission addition and removal must be logged — changing a Role's permission set affects every user holding that role simultaneously
- Status transitions logged
- `is_scopable` changes logged

---

## 4. Permission

### Purpose
A Permission is an atomic, indivisible capability grant that represents the right to perform a specific action on a specific resource within the system. Permissions are the lowest-level building block of the access control model.

### Business Description
Permissions are defined by the platform engineering team — not by tenants. They are embedded in the system's code as constants and seeded into the database. Each Permission maps to an actual gate that is checked in the API layer before an operation is allowed.

Every API endpoint, data-modifying operation, and sensitive view is guarded by one or more Permission checks. If the calling user's effective permission set (derived from their active Roles) does not include the required Permission, the request is rejected with a 403 Forbidden response.

Permissions follow a structured naming convention:

```
{module}:{resource}:{action}
```

Examples:
```
leave:requests:view_own
leave:requests:view_all
leave:requests:approve
leave:policy:manage
payroll:runs:initiate
payroll:runs:view_own_payslip
payroll:salary:view_all
employee:profile:view_own
employee:profile:view_team
employee:profile:manage
org:departments:manage
reports:payroll:export
administration:users:manage
administration:roles:manage
```

### Relationships
- **One Permission → Many Role Permissions** (permissions are bundled into Roles)
- Permissions have no FK to Tenant — they are platform-wide constants shared across all tenants

### Business Rules
1. Permissions are platform-defined and version-controlled. No tenant may create, edit, or delete a Permission.
2. Permissions are immutable once deployed. If a permission's semantics change, a new permission code is introduced and the old one is deprecated — never edited in place.
3. The `action` segment of a permission code must come from a controlled vocabulary: `view_own`, `view_team`, `view_all`, `create`, `edit`, `delete`, `approve`, `reject`, `export`, `manage`, `initiate`, `lock`, `unlock`.
4. Permissions with `view_own` action only allow the user to access records that belong to them. Permissions with `view_team` allow access to records in their team (defined by Access Scope, §7). Permissions with `view_all` grant tenant-wide visibility.
5. A `deprecated` Permission must not be removed from existing Role Permissions immediately — it must be replaced by the tenant admin with the new permission before it is removed from the codebase.
6. The platform seed process ensures all defined permissions exist in the database before the application starts.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `code` | The permission identifier string (e.g., `leave:requests:approve`) |
| `module` | The module this permission belongs to (e.g., `leave`, `payroll`, `employee`) |
| `resource` | The resource within the module (e.g., `requests`, `salary`, `profile`) |
| `action` | The operation being controlled (from the controlled vocabulary above) |
| `display_name` | Human-readable label for the permissions management UI |
| `status` | `active` or `deprecated` |

### Optional Fields
| Field | Description |
|-------|-------------|
| `description` | Detailed explanation of what this permission grants and any caveats |
| `deprecated_at` | Timestamp when the permission was deprecated |
| `replaced_by_permission_id` | FK to Permission — the successor permission code when deprecating |
| `is_sensitive` | Boolean — marks high-privilege permissions (e.g., payroll export, user management) that require additional logging or MFA confirmation |
| `sort_order` | Integer for ordering within the permissions management UI |

### Unique Constraints
- `code` — globally unique across the platform (no two permissions may share the same code string)

### Validation Rules
- `code` must follow the pattern `^[a-z_]+:[a-z_]+:[a-z_]+$`
- `module`, `resource`, `action` must each be lowercase with underscores only
- `action` must be one of the controlled vocabulary values
- `replaced_by_permission_id`, if set, must reference an `active` Permission
- A `deprecated` Permission must have `replaced_by_permission_id` set

### Lifecycle
```
active → deprecated
```
- Permissions are never deleted from the database once created. They are deprecated.
- Deprecated permissions continue to function for any Role that still carries them, until the tenant admin migrates those roles to the replacement permission.

### Audit Requirements
- Permission deprecations must be logged with timestamp, acting platform admin, and replacement permission
- There is no tenant-level audit for permissions themselves — tenants cannot change permissions. All permission auditing is at the platform level.
- The combination of Role Permission and User Role Assignment audit logs provides the full picture of what a user can do at any point in time

---

## 5. Role Permission

### Purpose
Role Permission is the junction entity that binds a Permission to a Role. It defines which atomic capabilities are included in a given Role's access profile.

### Business Description
When an HR Admin creates or configures a Role, they select from the available Permissions to build the Role's access profile. Each selection creates a Role Permission record. The aggregate of all Role Permission records for a Role defines everything a user holding that Role can do.

This is a pure junction table with minimal additional metadata — its significance is entirely in the combination of `role_id` and `permission_id`.

For system roles, Role Permissions are seeded by the platform. For custom roles, they are managed by the tenant HR Admin through the Roles management UI.

### Relationships
- **One Role Permission → One Role**
- **One Role Permission → One Permission**

### Business Rules
1. A Permission may appear in multiple Roles. There is no concept of "exclusive" permissions.
2. The same Permission may not be added to the same Role more than once (the combination `(role_id, permission_id)` is unique).
3. Removing a Permission from a Role takes effect immediately for all users holding that Role — there is no deferred revocation.
4. Adding a Permission to a Role takes effect immediately for all users holding that Role.
5. For system roles, the platform-seeded Role Permission set forms a protected baseline. Tenant admins may add supplementary permissions to system roles but may not remove the baseline set.
6. When a Permission is deprecated, the system must alert tenant admins of any roles that carry it and prompt migration. The Role Permission record is not automatically deleted.
7. Role Permission records are not soft-deleted. When a permission is removed from a role, the record is hard-deleted, and the event is captured in the audit log.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `role_id` | FK to Role |
| `permission_id` | FK to Permission |
| `granted_by` | FK to User — who added this permission to the role |
| `granted_at` | Timestamp of when the permission was added to the role |

### Optional Fields
| Field | Description |
|-------|-------------|
| `notes` | Justification or context for why this permission was added to this role |

### Unique Constraints
- `(role_id, permission_id)` — a permission may appear only once in a given role

### Validation Rules
- `role_id` must reference an `active` or `draft` Role (permissions may be configured before a role is published)
- `permission_id` must reference an `active` Permission (deprecated permissions may not be newly added)
- `granted_by` must be a User with the `administration:roles:manage` permission within the same tenant

### Lifecycle
Role Permission records have no lifecycle state. They exist (active) or they are removed. Removal is a hard delete with an audit log entry.

### Audit Requirements
- Every Role Permission addition must be logged: role, permission, acting user, timestamp
- Every Role Permission removal must be logged: role, permission, acting user, timestamp, reason
- Bulk role permission changes (e.g., when cloning a role) must produce individual log entries per permission, not a single bulk entry
- These logs are critical for access-change audits (SOC 2, ISO 27001, DPDPA compliance)

---

## 6. User Role Assignment

### Purpose
A User Role Assignment grants a specific Role to a specific User. It is the bridge between a human actor and their set of permissions. It may be optionally scoped to limit where the role's permissions apply.

### Business Description
This is the operational entity that authorizes a user. When an HR Admin onboards a new HR Executive, they create a User Role Assignment linking the user to the "HR Manager" Role. That single action immediately grants the user every permission bundled in that Role, effective immediately.

An assignment may carry an optional Access Scope (§7) to constrain the role to a subset of the organization — for example, assigning "Department Manager" role scoped to the Engineering Department, so the user can only exercise manager permissions on Engineering employees.

A user may hold multiple Role Assignments simultaneously. Their effective access is the union of all permissions across all active assignments.

### Relationships
- **One User Role Assignment → One User**
- **One User Role Assignment → One Role**
- **One User Role Assignment → One Tenant**
- **One User Role Assignment → Zero or One Access Scope** (optional scope constraint)

### Business Rules
1. A User may be assigned the same Role only once (duplicate assignments are blocked). A user who needs broader access should be assigned a higher-privilege Role or have the existing Role's permission set updated.
2. An assignment with `valid_from` in the future is a scheduled assignment. It becomes effective at `valid_from` time and must not grant access before that timestamp.
3. An assignment with `valid_to` in the past is an expired assignment and must not grant access. Expired assignments are not soft-deleted — they remain as historical records.
4. When a user is suspended or deactivated, their Role Assignments are not deleted. They are preserved. If the user is reactivated, assignments that have not expired resume immediately.
5. The `Employee` system role assignment (given automatically to every employee user) cannot be revoked by HR Admins — only by a platform Super Admin in exceptional circumstances.
6. An assignment may be scoped (with an Access Scope) or unscoped (tenant-wide). If unscoped, the role's permissions apply to all data in the tenant. If scoped, permissions apply only within the scope boundary.
7. Assigning a Role to a User must be performed by a User with the `administration:users:manage` permission.
8. Self-assignment (assigning a role to yourself) is prohibited unless the actor is a platform Super Admin.
9. When a Role is set to `inactive`, existing assignments are not automatically deleted but the role's permissions cease to be effective — the authorization engine treats inactive role assignments as non-granting.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `user_id` | FK to User |
| `role_id` | FK to Role |
| `assigned_by` | FK to User — who created this assignment |
| `assigned_at` | Timestamp when the assignment was created |
| `status` | `active` or `revoked` |

### Optional Fields
| Field | Description |
|-------|-------------|
| `access_scope_id` | FK to Access Scope — if set, constrains where this role applies (§7) |
| `valid_from` | Timestamp from which this assignment is effective. Null = effective immediately. |
| `valid_to` | Timestamp after which this assignment expires. Null = no expiry. |
| `revoked_by` | FK to User — who revoked the assignment |
| `revoked_at` | Timestamp of revocation |
| `revocation_reason` | Free-text reason for revocation |
| `notes` | Justification for why this role was granted |

### Unique Constraints
- `(tenant_id, user_id, role_id)` where `status = active` — a user may hold each role only once as an active assignment

### Validation Rules
- `role_id` must reference an `active` Role
- `user_id` must reference an `active` or `invited` User within the same tenant
- `valid_from`, if set, must be ≤ `valid_to` if `valid_to` is also set
- `assigned_by` must be a User with appropriate assignment permissions (enforced at API layer, not DB layer)
- `access_scope_id`, if set, must belong to the same tenant and the Role must have `is_scopable = true`
- Self-assignment (`user_id = assigned_by`) is rejected at the application layer

### Lifecycle
```
active → revoked
```
Assignments also have a time-bounded effective state:
- `valid_from > now()` → Scheduled (exists but not yet effective)
- `valid_from ≤ now() AND (valid_to IS NULL OR valid_to > now())` → Effective
- `valid_to ≤ now()` → Expired (exists as history; not effective)
- `status = revoked` → Explicitly revoked by an admin (not effective)

### Audit Requirements
- Every assignment creation must be logged: user, role, scope, assigned_by, valid_from, valid_to, timestamp
- Every revocation must be logged: user, role, revoked_by, reason, timestamp
- Role assignment changes (editing valid_from, valid_to, or scope) must be logged — there is no silent modification
- Bulk assignment operations (e.g., role change during org restructure) must produce individual log entries per assignment
- These logs are the primary evidence for access rights reviews in compliance audits

---

## 7. Access Scope

### Purpose
An Access Scope defines the organizational boundary within which a User Role Assignment's permissions are effective. It constrains a role-holder's access to a specific subset of the tenant's data — a Legal Entity, Business Unit, Department, or Location — rather than granting tenant-wide access.

### Business Description
Without scoping, every Role assignment is tenant-wide. This works for HR Admins (they manage all employees) but breaks down for Managers (a Department Manager should only be able to approve leave for their own department, not approve leave for the entire company).

Access Scopes solve this by attaching a boundary to a User Role Assignment. The boundary is defined by one of the organizational hierarchy levels: Legal Entity, Business Unit, Department, or Location.

Examples:

| User | Role | Access Scope | Effective Access |
|------|------|--------------|-----------------|
| Priya Sharma | HR Manager | *(none)* | All employees in all departments across the tenant |
| Rohit Nair | Department Manager | Department: Engineering | Can manage leave/attendance/reviews only for Engineering employees |
| Ananya Desai | HR Manager | Business Unit: Technology BU | Full HR access, but only within Technology BU |
| Sanjay Mehra | Finance Viewer | Legal Entity: Acme Technologies India | Can view payroll reports for the Indian entity only |

When evaluating whether user U may access record R, the authorization engine:
1. Finds all active Role Assignments for U
2. For each assignment, checks if the user's role permissions include the required capability
3. If the assignment has an Access Scope, checks whether R's organizational context (its department, BU, legal entity, or location) falls within the scope
4. Access is granted if at least one assignment both carries the permission and passes the scope check

### Relationships
- **One Access Scope → One Tenant**
- **One Access Scope → One Scope Target** (exactly one of: Legal Entity, Business Unit, Department, or Location)
- **One Access Scope → Many User Role Assignments** (the assignments it constrains)

### Business Rules
1. An Access Scope is defined by exactly one `scope_type` and one `scope_entity_id`. You cannot define a scope that spans multiple departments or business units in a single Access Scope. Multiple scoped Role Assignments must be used instead.
2. `scope_type` must be one of: `legal_entity`, `business_unit`, `department`, `location`.
3. The scope entity referenced by `scope_entity_id` must belong to the same tenant as the Access Scope.
4. A scope of type `department` includes all employees whose active Department Assignment is in that department. It does not automatically include sub-departments — sub-departments must be explicitly scoped in separate Access Scopes.
5. A scope of type `business_unit` includes all employees across all departments under that Business Unit.
6. A scope of type `legal_entity` includes all employees under that Legal Entity.
7. A scope of type `location` includes all employees whose primary work location is that Location.
8. An Access Scope can be shared across multiple User Role Assignments (e.g., multiple managers of the same department all have scoped assignments pointing to the same scope record).
9. Deleting or archiving a scope-target entity (e.g., archiving a Department) must trigger a system alert that all User Role Assignments referencing that scope will become effectively empty and users will lose access — HR Admin must remediate.
10. Access Scopes do not grant permissions on their own. They only constrain where existing Role permissions apply.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `name` | A descriptive label for this scope (e.g., "Engineering Department Scope") |
| `scope_type` | The organizational hierarchy level being scoped: `legal_entity`, `business_unit`, `department`, `location` |
| `scope_entity_id` | UUID of the entity this scope targets (the actual Legal Entity, BU, Department, or Location ID) |

### Optional Fields
| Field | Description |
|-------|-------------|
| `description` | Explanation of this scope and its intended use |
| `include_sub_units` | Boolean — if `true` and scope_type is `department`, automatically includes all sub-departments (via `parent_department_id` hierarchy). If `true` and scope_type is `business_unit`, automatically includes nested BUs. Defaults to `false`. |

### Unique Constraints
- `(tenant_id, scope_type, scope_entity_id)` — at most one Access Scope definition per entity (multiple assignments can share the same scope record)

### Validation Rules
- `scope_type` must be one of the four defined values
- `scope_entity_id` must reference a valid, active entity of the type specified by `scope_type`, within the same tenant
- `name` must be 2–100 characters
- `include_sub_units` may only be `true` for `scope_type` values that have hierarchical children (`department`, `business_unit`)

### Lifecycle
```
active → inactive
```
- `inactive` — The scope record is disabled. All User Role Assignments referencing it lose the scope constraint and must be re-scoped by an admin. (Note: inactivating a scope does not automatically widen the role to tenant-wide — it triggers an alert and requires admin resolution.)

### Audit Requirements
- Access Scope creation, modification (`scope_entity_id` change, `include_sub_units` change), and inactivation must all be logged
- Any User Role Assignment referencing an Access Scope that becomes `inactive` or whose `scope_entity_id` entity is archived must generate an alert entry in the audit log
- All authorization decisions against scoped assignments must be capturable in debug-level access logs for security investigation purposes (this is not a persistent per-request log but must be producible for incident investigation)

---

## Cross-Entity Authorization Flow

```
HTTP Request
    │
    ├─ Extract JWT / Session Token
    │       └─ Resolve user_id, tenant_id
    │
    ├─ Check User.status == 'active'
    │       └─ If not → 401 Unauthorized
    │
    ├─ Load User Role Assignments
    │       WHERE user_id = X
    │         AND tenant_id = Y
    │         AND status = 'active'
    │         AND (valid_from IS NULL OR valid_from <= now())
    │         AND (valid_to IS NULL OR valid_to > now())
    │         AND role.status = 'active'
    │
    ├─ For each assignment, load Role Permissions
    │       └─ Collect all permission.code values
    │
    ├─ Check if required permission.code is in the collected set
    │       └─ If not → 403 Forbidden
    │
    └─ If assignment has an Access Scope:
            └─ Resolve resource's organizational context
                    (its department_id, business_unit_id, legal_entity_id, location_id)
                └─ Check if context falls within scope boundary
                        └─ If not → 403 Forbidden
                        └─ If yes → ALLOW
```

---

## Permission Code Reference by Module

| Module | Sample Permissions |
|--------|-------------------|
| **Employee** | `employee:profile:view_own`, `employee:profile:view_team`, `employee:profile:view_all`, `employee:profile:manage`, `employee:documents:view_own`, `employee:documents:manage` |
| **Organization** | `org:departments:view`, `org:departments:manage`, `org:grades:manage`, `org:leave_policies:manage`, `org:salary_structures:manage` |
| **Attendance** | `attendance:records:view_own`, `attendance:records:view_team`, `attendance:adjustments:approve` |
| **Leave** | `leave:requests:view_own`, `leave:requests:view_team`, `leave:requests:approve`, `leave:policy:manage`, `leave:balance:adjust` |
| **Payroll** | `payroll:runs:initiate`, `payroll:runs:approve`, `payroll:runs:view_all`, `payroll:payslip:view_own`, `payroll:salary:view_all`, `payroll:reports:export` |
| **Performance** | `performance:reviews:view_own`, `performance:reviews:view_team`, `performance:cycles:manage`, `performance:goals:manage_team` |
| **Recruitment** | `recruitment:jobs:manage`, `recruitment:candidates:view`, `recruitment:offers:issue` |
| **Reports** | `reports:headcount:view`, `reports:payroll:view`, `reports:payroll:export`, `reports:attrition:view` |
| **Administration** | `administration:users:manage`, `administration:roles:manage`, `administration:audit_logs:view`, `administration:settings:manage` |
| **Documents** | `documents:company:view`, `documents:company:manage`, `documents:employee:view_own`, `documents:employee:view_all` |

---

## System Role → Permission Baseline

| System Role | Key Permissions (non-exhaustive) |
|-------------|----------------------------------|
| `HR Super Admin` | All permissions across all modules |
| `HR Manager` | `employee:profile:manage`, `leave:requests:approve`, `attendance:records:view_all`, `org:departments:view`, `reports:headcount:view` |
| `Payroll Admin` | `payroll:runs:initiate`, `payroll:runs:approve`, `payroll:salary:view_all`, `payroll:reports:export`, `employee:profile:view_all` |
| `Finance Viewer` | `payroll:runs:view_all`, `payroll:reports:export`, `reports:payroll:view` |
| `Department Manager` | `employee:profile:view_team`, `leave:requests:approve`, `attendance:records:view_team`, `performance:reviews:view_team` ← all scoped to department |
| `Recruiter` | All `recruitment:*` permissions |
| `Employee` | `employee:profile:view_own`, `leave:requests:view_own`, `payroll:payslip:view_own`, `attendance:records:view_own`, `documents:employee:view_own` |
| `IT Admin` | `administration:users:manage`, `administration:roles:manage`, `administration:settings:manage` |

---

*This document is the authoritative business entity definition for the Identity & Access module of Evolve HRMS. Authorization logic in any module, API layer, or UI must be derived from and consistent with this model. Any deviation requires a documented architecture decision record.*
