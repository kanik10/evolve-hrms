# Evolve HRMS — Documents Module: Business Entity Definitions

**Classification:** Internal Engineering Reference  
**Status:** Finalized  
**Module:** Documents  
**Preceding Documents:** `docs/database-standards.md`, `docs/entity-inventory.md`, `docs/employee-domain-entity-definitions.md`, `docs/org-module-entity-definitions.md`

---

## Overview

The Documents module is the platform-wide system of record for all files, binary assets, and structured document artifacts managed by the HRMS. It provides a unified, versioned, and auditable store that every other module depends on when they need to attach, generate, or validate a file.

The module deliberately separates concerns across three layers:

1. **Storage Layer** — `Document File` and `Document Version` handle the physical file lifecycle: what was uploaded, where it lives in object storage, its integrity checksum, and its revision history. The binary data is never stored in the database — only the metadata and the storage reference (key) are persisted.

2. **Classification Layer** — `Document Type` and `Document Metadata` establish the semantic context: what kind of document this is, what structured attributes it carries, and what rules govern its handling (expiry, verification, sensitivity).

3. **Context Layer** — `Employee Document`, `Policy Document`, and `Document Signature` bind a document to its business purpose: associating a file with an employee's record, publishing a policy to the organization, or capturing a legally significant signature event.

### Why Not Collapse This Into One Table

A single "documents" table would conflate four fundamentally different concerns:

| Concern | Entity | Why Separate |
|---------|--------|--------------|
| What the file is (bytes, name, storage location) | Document File + Document Version | Immutable physical facts — change only when a new file is uploaded |
| How the document is classified and what attributes it carries | Document Type + Document Metadata | Schema extension — different types require different attributes |
| Whose document it is and why | Employee Document, Policy Document | Ownership and context — one file can be the same PDF but mean different things per association |
| Whether someone has legally acknowledged or signed it | Document Signature | Legal record — must be independently immutable and verifiable |

This separation also enables fine-grained access control: an HR Admin can see Employee Document verification status without accessing the raw storage key; a manager can see that a policy exists and whether their reports have acknowledged it without accessing employee-sensitive attachments.

### Module Boundary

The Documents module **owns** all `doc_*` entities. It **provides** storage and retrieval services to:
- **Employee module** — Employee Document (employee-attached files)
- **Payroll module** — Investment Proof, Payslip PDF references
- **Leave module** — Leave Request supporting attachments
- **Recruitment module** — Resume, offer letter, appointment letter files
- **IAM module** — User profile photo references

Other modules call into the Documents module to upload, retrieve, version, and sign files. They do not write directly to `doc_*` tables except through the Documents module's own service layer.

---

## Entity Index

1. [Document Type](#1-document-type)
2. [Document File](#2-document-file)
3. [Document Version](#3-document-version)
4. [Document Metadata](#4-document-metadata)
5. [Employee Document](#5-employee-document)
6. [Policy Document](#6-policy-document)
7. [Document Signature](#7-document-signature)

---

## Relationship Overview

```
Tenant
  └── Document Type (master classification)
  │
  └── Document File (the logical document concept)
        │
        ├── Document Version (1..N — each upload/revision)
        │     └── Document Signature (0..N — each signer on this version)
        │
        ├── Document Metadata (0..N — structured attributes per document)
        │
        ├── Employee Document (0..N — per employee association)
        │     └── Employee Profile
        │
        └── Policy Document (0..1 — if the file is a policy)
              └── superseded_by → Policy Document (self-referencing version chain)
```

### Cross-Module Dependency Map

```
Documents Module provides:
  ← Employee Module       uses Employee Document (doc_employee_documents)
  ← Payroll Module        uses Document File (investment proofs, payslip PDFs)
  ← Leave Module          uses Document File (supporting attachments on requests)
  ← Recruitment Module    uses Document File + Generated Document (offer letters)
  ← IAM Module            uses Document File (profile photos)
```

---

## 1. Document Type

### Purpose
Document Type is the master classification entity for every kind of document the system handles. It defines what a document is, what rules govern it (verification, expiry, sensitivity), and what structured metadata fields are expected for documents of that type.

### Business Description
Not all documents are equal. An Aadhaar card must be verified, masked in exports, and carries a government ID number as its key attribute. An educational certificate must be verified before payroll confirmation. An employment offer letter is generated by the system, requires an e-signature, and expires 30 days after issuance. A leave application attachment has no verification requirement and no expiry.

Document Type encodes these differences as configuration data rather than hard-coded logic. When a new document category is introduced — say, a visa for employees on international assignments — an HR Admin creates a new Document Type record with the appropriate rules. No code change is required.

Document Types are organized into categories (Identity, Educational, Financial, HR Generated, Policy, General Attachment) so that the UI can present contextual upload forms and the system can apply the correct validation pipeline automatically.

### Relationships
- **One Document Type → One Tenant** (types are tenant-specific to allow customization)
- **One Document Type → Many Document Files** (all files classified under this type)
- **One Document Type → Many Employee Documents** (employee document associations using this type)
- **Referenced by** Employee Document, Document File

### Business Rules
1. A Document Type with `is_system_defined = true` is created by the platform at tenant initialization and cannot be deleted or have its `code` modified. HR Admins may update display names and add metadata field definitions.
2. `code` is the machine-readable identifier used in integrations and permission grants (e.g., `ID_AADHAAR`, `CERT_EDUCATION`, `HR_OFFER_LETTER`). It must be globally unique per tenant.
3. `requires_verification` = true means that an Employee Document of this type must be verified by an authorized HR user before the system treats it as valid. Unverified mandatory documents must block downstream workflows (e.g., payroll run inclusion, probation confirmation).
4. `has_expiry` = true means that documents of this type carry an expiry date. The system must raise alerts `expiry_alert_days_before` days ahead of expiry to HR Admins and the employee.
5. `is_sensitive` = true means documents of this type are classified as sensitive PII. Access requires the `documents:sensitive:view` permission. Storage keys for sensitive documents must not appear in standard API responses.
6. `is_mandatory_at_joining` = true means every employee must have at least one active, verified document of this type on file before the joining process is marked complete.
7. `max_file_size_mb` caps the upload size for documents of this type. It defaults to the tenant-level global cap if not specified.
8. `allowed_mime_types` restricts what file formats are accepted. Documents uploaded with non-allowed MIME types must be rejected at the API layer before storage.
9. A Document Type may be set to `inactive` when no longer applicable. Existing documents of that type are retained. No new documents may be uploaded under an `inactive` type.
10. `metadata_schema` defines the expected structured attributes for this type (e.g., `document_number`, `issuing_authority`, `country_of_issue`). This schema drives the metadata input form in the UI and the validation rules applied at upload.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `code` | Unique machine-readable identifier (e.g., `ID_AADHAAR`, `CERT_DEGREE`, `HR_EXPERIENCE_LETTER`) |
| `name` | Human-readable display name (e.g., "Aadhaar Card", "Degree Certificate", "Experience Letter") |
| `category` | Broad grouping: `identity`, `educational`, `financial`, `hr_generated`, `policy`, `general` |
| `is_system_defined` | Boolean — true for platform-standard types that cannot be deleted |
| `requires_verification` | Boolean — true if HR must verify uploads of this type |
| `has_expiry` | Boolean — true if documents of this type have an expiry date |
| `is_sensitive` | Boolean — true if documents of this type contain sensitive PII |
| `is_mandatory_at_joining` | Boolean — true if at least one verified document of this type is required at joining |
| `status` | `active`, `inactive` |
| `created_at` | Timestamp |
| `updated_at` | Timestamp |
| `created_by` | FK to User |
| `updated_by` | FK to User |

### Optional Fields
| Field | Description |
|-------|-------------|
| `description` | Long-form description of what this document type represents and when it is used |
| `expiry_alert_days_before` | Number of days before expiry to trigger alerts (default: 30) |
| `max_file_size_mb` | Maximum upload size in megabytes for this type; inherits tenant default if null |
| `allowed_mime_types` | Array of permitted MIME types (e.g., `["application/pdf", "image/jpeg", "image/png"]`) |
| `metadata_schema` | JSON Schema definition for the structured attributes expected on documents of this type |
| `requires_signature` | Boolean — true if documents of this type require an e-signature upon upload or issuance |
| `display_order` | Integer — controls rendering order in UI document upload forms |
| `tags` | Array of string tags for search and filtering |
| `deleted_at` | Soft-delete timestamp |
| `deleted_by` | FK to User |

### Unique Constraints
- `(tenant_id, code)` — type code unique per tenant

### Validation Rules
- `code` must match `^[A-Z0-9_]{3,50}$`
- `category` must be one of: `identity`, `educational`, `financial`, `hr_generated`, `policy`, `general`
- `expiry_alert_days_before` must be a positive integer if set
- `max_file_size_mb` must be a positive number; must not exceed the tenant-level global maximum
- `allowed_mime_types` entries must be valid IANA MIME type strings

### Lifecycle
```
active → inactive
inactive → active (can be reactivated)
```
- `active` — Available for use; new documents may be uploaded under this type
- `inactive` — Retired type; no new uploads permitted; existing documents unaffected

### Audit Requirements
- Any change to `is_sensitive`, `requires_verification`, `is_mandatory_at_joining`, or `metadata_schema` must be logged with the old and new values, the acting user, and a timestamp
- System-defined type modifications (display name, description) are logged for change tracking

---

## 2. Document File

### Purpose
Document File is the logical document record — the stable identity anchor for a document regardless of how many times its content is updated. It represents "this document" as a business concept: what it is, who it belongs to, what type it is, and what its current state is. The actual binary content is tracked per-version in Document Version.

### Business Description
When an HR Admin says "Priya's offer letter," they mean one logical document. That document may have been issued, then revised (corrections to the joining date), then re-signed — three revisions, each a new Document Version, but all belonging to the same Document File. The Document File is what gets shared, linked, and referenced across the system. The version history is an implementation detail surfaced only when needed.

Document File does not store binary data. It stores the document's identity, classification, access level, and a pointer to the current active version. The physical file bytes live in an object storage service (e.g., AWS S3, GCS) referenced by the storage key on Document Version.

The Document File also serves as the focal point for cross-module references. When the Payroll module references a payslip, it stores a `document_file_id`. When the Leave module attaches supporting documents to a request, it stores `document_file_id` references. The Documents module owns and governs the file; consuming modules hold foreign keys to it.

### Relationships
- **One Document File → One Tenant**
- **One Document File → One Document Type**
- **One Document File → Many Document Versions** (revision history; one is current)
- **One Document File → Many Document Metadata records** (structured attributes)
- **One Document File → One Employee Document** (if employee-scoped)
- **One Document File → One Policy Document** (if policy-scoped)
- **Referenced by** Employee Document, Policy Document, Payroll (investment proofs, payslips), Leave (attachments), Recruitment (resumes, offer letters)

### Business Rules
1. A Document File is created when any file is first uploaded to the system. The upload process is atomic: the Document File record and the first Document Version record must be created together, or both must be rolled back. A Document File with zero versions is an invalid state.
2. `owning_entity_type` and `owning_entity_id` identify which business object this document belongs to. Valid entity types are: `employee`, `tenant` (company-wide), `policy`, `leave_request`, `reimbursement_claim`, `job_application`. This pair enables scoped queries (e.g., "all documents belonging to employee X").
3. `current_version_id` always points to the most recently activated (non-draft) Document Version. It is updated atomically when a new version is activated. It must never point to a soft-deleted or draft version.
4. `access_level` governs who can retrieve this file beyond the owning entity: `private` (owning entity and HR Admin only), `restricted` (specific role required), `internal` (all authenticated users of the tenant), `public` (accessible without authentication — used only for non-PII assets like company logo).
5. A Document File is never hard-deleted. When a user requests deletion, `deleted_at` is set and the status transitions to `deleted`. The underlying storage object is scheduled for purge after the tenant-configured retention period has elapsed.
6. `is_sensitive` inherits from the Document Type at creation time but may be overridden for individual files (e.g., a general attachment that contains PII in a specific instance).
7. When `status = archived`, the document is read-only. No new versions may be uploaded and no new signatures may be requested. The file remains accessible to authorized users.
8. A Document File may be moved between owning entities only by an HR Admin with the `documents:reassign` permission. Such moves must be logged in full (old owner, new owner, acting user, timestamp, reason).
9. `tags` are freeform labels applied at the file level for search and grouping. They are not access-controlled but cannot contain PII.
10. For HR-generated documents (offer letters, experience letters, payslips), the Document File is created by the system, not by a user upload. The `source` field distinguishes system-generated from user-uploaded files.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `document_type_id` | FK to Document Type |
| `title` | Human-readable document title (e.g., "Offer Letter — Priya Sharma", "Employee Handbook 2025") |
| `owning_entity_type` | Type of the business object this document belongs to: `employee`, `tenant`, `policy`, `leave_request`, `reimbursement_claim`, `job_application` |
| `owning_entity_id` | UUID of the owning business object |
| `source` | Origin of the file: `user_upload`, `system_generated`, `external_import` |
| `access_level` | Visibility scope: `private`, `restricted`, `internal`, `public` |
| `is_sensitive` | Boolean — whether this specific file instance contains sensitive PII |
| `status` | `uploading`, `active`, `archived`, `deleted` |
| `created_at` | Timestamp |
| `updated_at` | Timestamp |
| `created_by` | FK to User |
| `updated_by` | FK to User |

### Optional Fields
| Field | Description |
|-------|-------------|
| `current_version_id` | FK to Document Version — the active version; null during initial upload |
| `description` | Optional freeform description of the document's purpose or contents |
| `tags` | Array of string labels for search and grouping |
| `allowed_viewer_roles` | Array of Role codes permitted to access this file (used when `access_level = restricted`) |
| `retention_days` | Override retention period in days before a deleted file's storage object is purged |
| `deleted_at` | Soft-delete timestamp |
| `deleted_by` | FK to User |

### Unique Constraints
- None beyond the primary key. Multiple Document Files of the same type may exist for the same owning entity (e.g., an employee may have many Aadhaar uploads if they re-upload after correction).

### Validation Rules
- `owning_entity_type` must be one of the defined entity type codes
- `access_level` must be one of `private`, `restricted`, `internal`, `public`
- `access_level = public` is not permitted when `is_sensitive = true`
- `status = deleted` requires `deleted_at` to be set; `deleted_at` set requires `status = deleted`
- `current_version_id`, when set, must reference a Document Version belonging to this Document File that has `status = active`

### Lifecycle
```
uploading → active → archived → deleted
active → archived (when superseded, retired, or replaced)
archived → active (restore, HR Admin only)
```
- `uploading` — Initial transient state during upload; transitions to `active` when the first version is committed
- `active` — Available for viewing, downloading, and new version uploads
- `archived` — Read-only; retained for history; no new versions or signatures
- `deleted` — Soft-deleted; storage object scheduled for purge after retention period

### Audit Requirements
- File creation logged with uploader, timestamp, owning entity, and document type
- Status transitions logged with old status, new status, actor, timestamp, and reason
- `access_level` and `is_sensitive` changes logged individually with old and new values
- Any reassignment of `owning_entity_type` / `owning_entity_id` logged in full
- All download events for `is_sensitive = true` files must be individually logged (who, when, IP)

---

## 3. Document Version

### Purpose
Document Version is an immutable record of one specific revision of a Document File. Each time a document's content is updated — whether by re-uploading, re-generating, or correcting — a new Document Version is created. The previous version is preserved, never overwritten.

### Business Description
Version history matters for compliance and auditing. When an employee's offer letter is generated and signed, then corrected and re-signed after a joining date change, both versions must be on record: the original (with the signature that bound the employee) and the corrected one. Payroll auditors need to know which version of a salary structure document was in effect during a specific pay run.

Document Version captures the physical facts of one file snapshot: where it lives in storage (`storage_key`), what it is (`mime_type`, `original_filename`), how large it is (`file_size_bytes`), whether it arrived intact (`checksum_sha256`), and who uploaded it (`uploaded_by`). Once committed, none of these fields change. Version records are never updated.

The version number is sequential per Document File, starting at 1. Only one version per Document File may be `is_current_version = true` at any time. When a new version is activated, the previous current version's `is_current_version` flag is set to false atomically.

Signatures are captured per version (Document Signature → Document Version) because a signature is always a statement about a specific file's content. A new version requires a new signature.

### Relationships
- **One Document Version → One Document File** (the logical document it belongs to)
- **One Document Version → Many Document Signatures** (signatures on this specific revision)
- **Referenced by** Document File (`current_version_id`), Document Signature

### Business Rules
1. Document Version records are immutable once `status = active`. No field may be updated after activation. If a version is found to be corrupted or incorrect, it must be set to `status = superseded` and a new version uploaded.
2. `version_number` is assigned by the system as `MAX(version_number) + 1` for the parent Document File at creation time. It must be a positive integer starting at 1.
3. `checksum_sha256` must be computed server-side after the file is received in storage. It must not be supplied by the client. At download time, the serving layer must re-verify the checksum before returning the file.
4. `storage_key` is the object storage key that uniquely identifies the binary in the storage backend. It must follow the format `{tenant_id}/{owning_entity_type}/{owning_entity_id}/{document_file_id}/{version_id}/{original_filename_sanitized}`. It must not be exposed in standard API responses; only pre-signed URLs are returned to clients.
5. `mime_type` must be validated against the parent Document Type's `allowed_mime_types` list at upload time. Uploads with disallowed MIME types must be rejected; the Document Version record must not be persisted.
6. `file_size_bytes` must be validated against the parent Document Type's `max_file_size_mb` at upload time. Uploads exceeding the limit must be rejected.
7. When a new version is committed (status transitions from `draft` to `active`), the parent Document File's `current_version_id` must be updated to this version's `id` in the same transaction.
8. A Document Version in `status = superseded` is retained for history and audit. It remains accessible to users with appropriate permissions but is not returned as the default version.
9. `change_summary` is required when creating a version with `version_number > 1`. It must describe what changed from the previous version.
10. The `uploading` status is a transient lock state used while the binary is being transferred to object storage. If the upload fails or times out, the version record transitions to `failed` and must not be promoted.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `document_file_id` | FK to Document File — the logical document this version belongs to |
| `version_number` | Sequential integer revision number (1 = initial upload) |
| `original_filename` | The filename as provided by the uploader (e.g., `aadhaar_front.pdf`) |
| `mime_type` | IANA MIME type of the file (e.g., `application/pdf`, `image/jpeg`) |
| `file_size_bytes` | Size of the stored binary in bytes |
| `storage_key` | Object storage key — never exposed in API responses |
| `checksum_sha256` | SHA-256 hash of the stored binary, computed server-side |
| `is_current_version` | Boolean — true for the single active version of this Document File |
| `status` | `uploading`, `draft`, `active`, `superseded`, `failed` |
| `uploaded_by` | FK to User — the user who initiated this upload or generation |
| `uploaded_at` | Timestamp when this version was committed (status transitioned to `active`) |
| `created_at` | Timestamp |
| `updated_at` | Timestamp |
| `created_by` | FK to User |
| `updated_by` | FK to User |

### Optional Fields
| Field | Description |
|-------|-------------|
| `change_summary` | Required for version_number > 1 — human-readable description of what changed |
| `generation_params` | JSONB — for system-generated versions: the template variables used to produce this file |
| `virus_scan_status` | Result of antivirus scan: `pending`, `clean`, `infected`, `skipped` |
| `virus_scan_at` | Timestamp of the antivirus scan result |
| `storage_region` | Object storage region where the binary resides (for data residency compliance) |
| `deleted_at` | Soft-delete timestamp (cascades from Document File deletion; not directly triggered) |
| `deleted_by` | FK to User |

### Unique Constraints
- `(document_file_id, version_number)` — version numbers are unique per document
- At most one row per `document_file_id` may have `is_current_version = true` (enforced via partial unique index)

### Validation Rules
- `version_number` must be a positive integer
- `version_number = 1` requires no previous version for this `document_file_id`
- `version_number > 1` requires `change_summary` to be non-null and non-empty
- `mime_type` must be a valid IANA MIME type string
- `file_size_bytes` must be a positive integer
- `checksum_sha256` must be exactly 64 hexadecimal characters
- `storage_key` must match the prescribed format pattern
- `status` transitions: `uploading → draft → active → superseded`; `uploading → failed` (terminal)

### Lifecycle
```
uploading → draft → active → superseded
uploading → failed (terminal — upload did not complete)
```
- `uploading` — Binary transfer to object storage is in progress
- `draft` — File received and stored; not yet the active version (awaiting review or promotion)
- `active` — The current active version of the document; serves all download requests
- `superseded` — Replaced by a newer version; retained for history and audit
- `failed` — Upload did not complete; record retained for debugging; storage object not present

### Audit Requirements
- Every status transition logged with actor, timestamp, and transition reason
- Checksum validation failures at download time must be logged as a security event with file id, version id, expected checksum, computed checksum, requesting user, and timestamp
- Any access to `storage_key` by system processes must be logged

---

## 4. Document Metadata

### Purpose
Document Metadata provides a structured, extensible key-value store for domain-specific attributes of a Document File that cannot be captured in a generic file record. Examples include a government ID's document number, an educational certificate's issuing institution, or a visa's country of issue and visa category.

### Business Description
Documents carry attributes beyond their physical file characteristics. An Aadhaar card has a document number, a date of issue, and a state of issue. A degree certificate has an institution name, a graduation year, a subject, and a grade. A professional certification has an issuing body, a certification ID, and an expiry date. These attributes vary by Document Type — there is no single schema that fits all.

Document Metadata uses a key-value model, where the keys (and their types and validation rules) are defined by the Document Type's `metadata_schema`. The system uses the schema to:
- Render the appropriate input form when a document is uploaded
- Validate the values at upload time
- Drive search and filtering (e.g., "find all employees whose passport expires before Dec 2025")
- Power automated alerts (e.g., expiry reminders driven by a `expiry_date` metadata key)

System-defined keys (`is_system_defined = true`) are interpreted by platform logic. Tenant-custom keys (`is_system_defined = false`) are opaque to the engine and surfaced only in the UI.

### Relationships
- **One Document Metadata → One Document File**
- **One Document Metadata → One Tenant**
- **Many Document Metadata records per Document File** (one per attribute key)

### Business Rules
1. Each `(document_file_id, key)` pair must be unique — a document may have only one value per metadata key.
2. Keys for a given Document File must be valid according to the parent Document Type's `metadata_schema`. Unknown keys are rejected unless the Document Type permits `allow_extra_keys = true`.
3. `value_type` determines how `value` is parsed and validated: `string` (free text), `date` (ISO 8601 date), `number` (decimal), `boolean` (`true`/`false`).
4. System-defined keys (e.g., `document_number`, `expiry_date`, `issuing_authority`) are used by platform logic for alerts, verification workflows, and reporting. Their `key` names are fixed constants; HR Admins may not delete or rename them.
5. The `expiry_date` key, when present on a Document File, overrides any expiry logic derived from other fields. The Documents module's scheduler queries all `doc_document_metadata` records with `key = 'expiry_date'` to generate expiry alerts.
6. `value` is always stored as text. The application layer coerces it to the appropriate native type at read time using `value_type`.
7. Metadata records are soft-deleted, not hard-deleted, to preserve the history of what attributes were on file at any point in time.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `document_file_id` | FK to Document File |
| `key` | Metadata attribute key (e.g., `document_number`, `issuing_authority`, `expiry_date`, `graduation_year`) |
| `value` | Attribute value stored as text; parsed using `value_type` |
| `value_type` | Data type for parsing `value`: `string`, `date`, `number`, `boolean` |
| `is_system_defined` | Boolean — true if this key is a platform-reserved constant interpreted by system logic |
| `created_at` | Timestamp |
| `updated_at` | Timestamp |
| `created_by` | FK to User |
| `updated_by` | FK to User |

### Optional Fields
| Field | Description |
|-------|-------------|
| `label` | Display label for this key in the UI (e.g., "Issuing Authority", "Graduation Year") |
| `is_verified` | Boolean — whether this specific attribute value has been verified by HR |
| `verified_by` | FK to User — HR user who verified the value |
| `verified_at` | Timestamp of verification |
| `deleted_at` | Soft-delete timestamp |
| `deleted_by` | FK to User |

### Unique Constraints
- `(document_file_id, key)` — one value per key per document

### Validation Rules
- `key` must match `^[a-z][a-z0-9_]{1,63}$` (snake_case, max 64 chars)
- `value_type = date` requires `value` to be a valid ISO 8601 date string (`YYYY-MM-DD`)
- `value_type = number` requires `value` to be parseable as a decimal number
- `value_type = boolean` requires `value` to be exactly `"true"` or `"false"`
- `is_verified = true` requires both `verified_by` and `verified_at` to be set

---

## 5. Employee Document

### Purpose
Employee Document is the association entity that binds a Document File to a specific employee with employment-specific context: what type of document it is, whether it has been verified, when it expires, and whether it is mandatory for that employee's record to be considered complete.

### Business Description
An employee accumulates many documents across their tenure: their offer letter at joining, identity proofs (PAN, Aadhaar) for statutory compliance, educational certificates for background verification, a relieving letter from their previous employer, payslips for tax calculations, and medical certificates for leave claims. Each of these has a different status, a different verification requirement, and a different consequence if it is missing or expired.

Employee Document does not duplicate the file itself — that lives in Document File and Document Version. Instead, it is the employment context record for "this file, for this employee, in this capacity." The same Document File can theoretically be referenced by multiple employees (e.g., a shared policy acknowledgement), but in practice each employee-document association is unique to the employee.

HR Admins and compliance automation depend on this entity to answer questions like: "Which joining employees are missing their PAN card?" or "Whose passport expires in the next 60 days?" or "Has Priya's degree certificate been verified for payroll confirmation?"

### Relationships
- **One Employee Document → One Tenant**
- **One Employee Document → One Employee Profile**
- **One Employee Document → One Document File**
- **One Employee Document → One Document Type** (denormalized from Document File for query performance)
- **Referenced by** Payroll Run (checks mandatory document completeness before run), Probation Confirmation workflow (checks joining documents)

### Business Rules
1. An employee may have multiple Employee Document records for the same Document Type (e.g., two passports — current and previous). The active, unexpired, verified one is considered the primary for compliance purposes.
2. `verification_status` tracks the HR verification lifecycle for this specific employee-document association. A document can be `pending`, `verified`, or `rejected`. Rejected documents must have a `rejection_reason` recorded.
3. When `verification_status = rejected`, the employee or HR must upload a new Document Version and the verification cycle restarts. The rejected association is retained as history.
4. `is_mandatory` on Employee Document overrides the Document Type's `is_mandatory_at_joining`. This allows HR to mark a specific document as mandatory for a specific employee (e.g., for visa-dependent employment) regardless of the type-level default.
5. `expiry_date` on the Employee Document overrides any `expiry_date` in the document's metadata. This supports cases where the document has an expiry known at association time (e.g., "this passport expires Oct 2026") without requiring a metadata update.
6. The system must send expiry alerts `expiry_alert_days_before` days before `expiry_date` to the employee (self-service) and to HR. The alert cadence is: one alert at the threshold day, a second at half the threshold, and a final alert 7 days before expiry.
7. `submission_method` records how the document reached the system: `self_service` (employee uploaded via portal), `hr_upload` (HR uploaded on behalf), `system_generated` (created by the Documents module, e.g., payslip or offer letter), `bulk_import` (uploaded via import pipeline).
8. An Employee Document record is never hard-deleted. When an employee is terminated, their documents are retained per the statutory retention period. `deleted_at` is set only if the document is formally withdrawn (e.g., the employee requests removal of an erroneously uploaded file — subject to HR approval).
9. The `label` field allows HR to give a contextual name to the association beyond the Document Type name (e.g., "Degree Certificate — B.Tech Computer Science, IIT Delhi, 2019"). This label appears in the employee's document list.
10. Only one Employee Document per `(employee_id, document_type_id)` combination may be `is_primary = true` at any time. Marking a new document as primary automatically demotes the previous primary for the same type.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `employee_id` | FK to Employee Profile |
| `document_file_id` | FK to Document File |
| `document_type_id` | FK to Document Type (denormalized from Document File for query performance) |
| `verification_status` | `pending`, `verified`, `rejected` |
| `is_mandatory` | Boolean — whether this specific document is required for this employee's compliance |
| `is_primary` | Boolean — marks the primary/active document when multiple exist for the same type per employee |
| `submission_method` | How the document was submitted: `self_service`, `hr_upload`, `system_generated`, `bulk_import` |
| `submitted_at` | Timestamp when the document was associated to this employee |
| `created_at` | Timestamp |
| `updated_at` | Timestamp |
| `created_by` | FK to User |
| `updated_by` | FK to User |

### Optional Fields
| Field | Description |
|-------|-------------|
| `label` | Contextual display name for this specific document association |
| `expiry_date` | Expiry date for this employee-document association; overrides document metadata expiry |
| `expiry_alert_days_before` | Number of days before expiry to begin alerting; inherits from Document Type if null |
| `verified_by` | FK to User — HR user who verified the document |
| `verified_at` | Timestamp of verification |
| `rejection_reason` | Required when `verification_status = rejected`; explains why the document was rejected |
| `remarks` | Free-text HR notes about this document |
| `deleted_at` | Soft-delete timestamp |
| `deleted_by` | FK to User |

### Unique Constraints
- At most one row per `(tenant_id, employee_id, document_type_id)` may have `is_primary = true` (enforced via partial unique index)

### Validation Rules
- `verification_status = rejected` requires `rejection_reason` to be non-null
- `verified_by` and `verified_at` must both be set or both be null
- `expiry_date`, if set, must be a future or present date relative to `submitted_at`
- `expiry_alert_days_before` must be a positive integer if set

### Lifecycle
```
pending → verified
pending → rejected → (employee re-uploads new version) → pending
```
- `pending` — Uploaded; awaiting HR verification
- `verified` — HR has confirmed the document is valid
- `rejected` — HR rejected the document (wrong file, unreadable, suspected forgery); employee must re-upload

### Audit Requirements
- Verification decisions (`verified` and `rejected`) must be logged with the HR user, timestamp, and (for rejected) the reason
- All downloads of employee documents classified as `is_sensitive = true` must be individually logged
- Any HR-initiated deletion or withdrawal of an employee document must be logged with reason and approver

---

## 6. Policy Document

### Purpose
Policy Document represents a formal HR or company policy stored in the Policy Library. It governs the lifecycle of a policy from initial drafting through active publication, employee acknowledgement tracking, and eventual supersession by a newer version.

### Business Description
Every organization operates under a body of formal policies: a Code of Conduct, a Leave Policy PDF, an Anti-Harassment Policy, a Remote Work Policy, a Data Privacy Notice. These documents are not attached to individual employees — they are company-wide instruments that employees are required to read and acknowledge. Managing the lifecycle of these policies — knowing which version is current, whether all employees have acknowledged it, and what the previous version said — is a compliance requirement in every regulated industry.

Policy Document is distinct from Employee Document in intent and audience. An Employee Document is personal and scoped to one employee. A Policy Document is institutional and addressed to a group (or all employees). The acknowledgement model is also different: Policy Documents may require a tracked, recorded acknowledgement from every applicable employee, while Employee Documents require only HR verification.

Policy Documents support versioning through the `superseded_by_id` self-reference: when a new version of a policy is published, the old Policy Document record is linked to the new one. This produces a complete lineage chain. HR can always trace which version of the Code of Conduct was active on any given date.

### Relationships
- **One Policy Document → One Tenant**
- **One Policy Document → One Document File** (the published PDF or document asset)
- **One Policy Document → Another Policy Document** via `superseded_by_id` (version lineage chain)
- **Referenced by** Employee acknowledgement tracking, Onboarding checklists, Compliance reporting

### Business Rules
1. A Policy Document must reference a Document File that has `owning_entity_type = 'policy'`. A file uploaded for an employee cannot be promoted to a Policy Document.
2. Only one Policy Document per `(tenant_id, policy_code)` may have `status = published` at any time. Publishing a new version must atomically set the previous published version to `status = superseded` and set its `superseded_by_id` to the new record's id.
3. `version_label` is a human-readable version identifier set by HR at publication time (e.g., "v2.0", "2025 Edition"). It does not follow a system-enforced format.
4. `applies_to` defines the audience scope: `all_employees` means every active employee in the tenant; `employment_type`, `department`, `grade`, or `location` scope the policy to a specific organizational group. The scope is stored as a structured filter expression.
5. `acknowledgement_required = true` means the system must track whether each applicable employee has acknowledged the policy. Acknowledgement is captured as a Document Signature (see Section 7) on the policy's Document Version.
6. `acknowledgement_deadline` sets the date by which all applicable employees must acknowledge. The system sends reminder notifications at `acknowledgement_reminder_days_before` intervals before the deadline.
7. A Policy Document in `status = draft` is not visible to employees — only to HR Admins with the `policy:manage` permission.
8. `effective_date` is the date from which the policy is operationally in force. A policy may be `published` before its `effective_date` (so employees can read it in advance), but compliance checks (e.g., "has every employee acknowledged the current policy?") only activate from `effective_date`.
9. `review_date` is the scheduled date for the policy owner to review whether the policy is still current. The system raises an alert to the `policy_owner` User on this date.
10. A Policy Document may not be deleted if it has any associated acknowledgement records. Deletion is blocked to preserve the legal evidence that employees read and acknowledged a specific policy at a specific time. Supersession (via a new published version) is the correct mechanism for retiring a policy.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `document_file_id` | FK to Document File — the actual policy file asset |
| `policy_code` | Unique machine-readable identifier (e.g., `POL_CODE_OF_CONDUCT`, `POL_LEAVE_2025`) |
| `title` | Human-readable policy title (e.g., "Code of Conduct 2025") |
| `category` | Policy category: `hr_policy`, `code_of_conduct`, `compliance`, `operational`, `safety`, `benefits`, `it_security` |
| `version_label` | Human-readable version label (e.g., "v2.0", "2025 Edition") |
| `applies_to` | JSONB scope filter defining the employee audience (e.g., `{"scope": "all_employees"}` or `{"scope": "department", "ids": [...]}`) |
| `acknowledgement_required` | Boolean — whether employees must formally acknowledge this policy |
| `effective_date` | Date from which this policy is operationally in force |
| `status` | `draft`, `published`, `superseded`, `archived` |
| `published_by` | FK to User — HR Admin who published the policy; null while in draft |
| `created_at` | Timestamp |
| `updated_at` | Timestamp |
| `created_by` | FK to User |
| `updated_by` | FK to User |

### Optional Fields
| Field | Description |
|-------|-------------|
| `description` | Summary of the policy's purpose and scope |
| `policy_owner` | FK to User — the person responsible for maintaining this policy |
| `review_date` | Scheduled review date; triggers an alert to `policy_owner` |
| `acknowledgement_deadline` | Date by which all applicable employees must acknowledge |
| `acknowledgement_reminder_days_before` | Array of integers: days before deadline to send reminder notifications (e.g., `[30, 14, 7, 1]`) |
| `published_at` | Timestamp when the policy was published |
| `superseded_by_id` | FK to Policy Document (self) — the newer version that replaced this policy |
| `superseded_at` | Timestamp when this policy was superseded |
| `tags` | Array of string tags for search and discovery |
| `deleted_at` | Soft-delete timestamp (blocked if acknowledgements exist) |
| `deleted_by` | FK to User |

### Unique Constraints
- `(tenant_id, policy_code, status)` where `status = published` — one published version per policy code per tenant (partial unique index)

### Validation Rules
- `effective_date` must be a valid date; it may be in the future (pre-published policies)
- `review_date`, if set, must be on or after `effective_date`
- `acknowledgement_deadline`, if set, must be on or after `effective_date`
- `acknowledgement_required = true` requires `acknowledgement_deadline` to be set
- `superseded_by_id` must reference a Policy Document with `status = published` and the same `policy_code`
- `status = published` requires `published_by` and `published_at` to be set
- `applies_to` must be a valid JSON object with a `scope` key; if `scope` is not `all_employees`, an `ids` array must be present

### Lifecycle
```
draft → published → superseded → archived
draft → archived (discarded before publication)
```
- `draft` — Being authored; visible only to HR Admins with `policy:manage` permission
- `published` — Active and visible to applicable employees; acknowledgement tracking active
- `superseded` — Replaced by a newer published version; retained for history and legal evidence
- `archived` — Formally retired; no longer visible to employees; retained for audit

### Audit Requirements
- `published` status transition logged with the publishing HR Admin, timestamp, and `effective_date`
- Any changes to `applies_to`, `acknowledgement_required`, or `acknowledgement_deadline` on a published policy must be logged with full field-level diff
- Supersession events logged with the old policy id, new policy id, superseding user, and timestamp
- Deletion attempts blocked and logged when acknowledgement records exist

---

## 7. Document Signature

### Purpose
Document Signature is an immutable record of one electronic signature event on a specific Document Version. It captures who signed, when, by what method, and what cryptographic or regulatory artifact was produced. It is the legal evidence that a specific person agreed to or acknowledged a specific version of a document at a specific moment in time.

### Business Description
Signatures appear across the HRMS in several business contexts:

- **Offer Letter acceptance** — A candidate or new hire signs their offer letter. The signature confirms they have read and accepted the employment terms.
- **Policy acknowledgement** — An employee signs to confirm they have read the company's Code of Conduct, Privacy Policy, or any other policy with `acknowledgement_required = true`.
- **Payslip acknowledgement** — In some tenants, employees sign to acknowledge receipt of their payslip.
- **Exit documentation** — An employee signs the FNF settlement document or the experience letter.
- **HR-generated documents** — Any system-generated document (appointment letter, experience letter, salary revision letter) may require an employee e-signature.

The signature is always against a Document Version, not a Document File. This is intentional: if the document content changes (a new version is created), the old signature is still valid evidence for the old content — but it does not apply to the new version. The new version requires a new signature request.

Document Signature supports multiple signature methods: simple e-sign (click-to-sign, legally binding via audit trail in many jurisdictions), Aadhaar eSign (biometric OTP, legally binding in India under IT Act), DocuSign or similar integrations, and wet digital signatures. The `signature_method` field records which method was used, enabling the legal team to assess the evidentiary weight of each signature.

### Relationships
- **One Document Signature → One Document Version** (the specific revision that was signed)
- **One Document Signature → One User** (`signer_id` — who signed)
- **One Document Signature → One Employee Profile** (`signer_employee_id` — if the signer is an employee; null for external signers)
- **One Document Signature → One User** (`requested_by` — who initiated the signature request)
- **Referenced by** Policy Document (acknowledgement completion), Onboarding checklists, Compliance dashboards

### Business Rules
1. A Document Signature record is immutable once `status = signed`. No field may be updated after signing. If a signature must be revoked (exceptional cases with legal approval), the record is soft-deleted and a new signature request is created on a new Document Version.
2. Each unique `(document_version_id, signer_id)` combination may have at most one non-declined, non-revoked signature. A signer cannot sign the same version twice.
3. `requested_by` is the HR user or system process that sent the signature request. For policy acknowledgements triggered automatically at publishing, `requested_by` refers to the User who published the policy.
4. `signature_method` determines what additional fields are required:
   - `click_to_sign` — `signed_at`, `ip_address`, `device_fingerprint` are sufficient
   - `aadhaar_esign` — `signature_payload` must contain the Aadhaar eSign response XML (stored encrypted)
   - `docusign` — `signature_payload` must contain the DocuSign envelope ID
   - `wet_digital` — `signature_payload` must contain the certificate thumbprint or reference
5. `ip_address` is captured for all signature methods as part of the non-repudiation audit trail. It must be the originating client IP, not a proxy IP. IPv6 addresses are stored in full.
6. `device_fingerprint` is a non-PII hash of device characteristics (user agent, screen resolution, timezone). It is collected to strengthen the audit trail without capturing PII.
7. `expires_at` is the deadline by which the signer must respond. If this timestamp passes without a signature, the system transitions the status to `expired` and notifies `requested_by`. HR may then issue a new request.
8. `reminder_sent_at` records the last time an automated reminder was sent to the signer. Multiple reminders may be sent but only the most recent timestamp is recorded.
9. A declined signature (`status = declined`) must have `decline_reason` recorded. Declining a mandatory signature (e.g., declining to acknowledge the Code of Conduct) must trigger an alert to HR for follow-up action.
10. `signature_payload` must be stored encrypted at rest for `aadhaar_esign` method signatures, as the payload may contain PII from the Aadhaar eSign response. For other methods, the payload is an opaque reference string.
11. A Document Signature record must never be created against a Document Version with `status = superseded` or `failed`. Signature requests may only be issued against versions with `status = active`.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `document_version_id` | FK to Document Version — the specific revision being signed |
| `signer_id` | FK to User — the user account of the signer |
| `signature_method` | Signing method: `click_to_sign`, `aadhaar_esign`, `docusign`, `wet_digital` |
| `status` | `requested`, `signed`, `declined`, `expired`, `revoked` |
| `requested_by` | FK to User — who issued the signature request |
| `requested_at` | Timestamp when the signature request was created |
| `created_at` | Timestamp |
| `updated_at` | Timestamp |
| `created_by` | FK to User |
| `updated_by` | FK to User |

### Optional Fields
| Field | Description |
|-------|-------------|
| `signer_employee_id` | FK to Employee Profile — set when the signer is an employee; null for external signers |
| `signed_at` | Timestamp when the signature was executed; null until signed |
| `ip_address` | Client IP address at the time of signing; required for all completed signatures |
| `device_fingerprint` | Non-PII hash of device characteristics for audit strengthening |
| `signature_payload` | Method-specific artifact: eSign XML reference (encrypted), DocuSign envelope ID, certificate thumbprint |
| `decline_reason` | Required when `status = declined`; records why the signer declined |
| `expires_at` | Deadline for the signer to respond; triggers `expired` transition if unmet |
| `reminder_sent_at` | Timestamp of the last automated reminder sent to the signer |
| `revoked_at` | Timestamp of revocation; set only on `status = revoked` |
| `revoked_by` | FK to User — HR Admin who authorized the revocation |
| `revocation_reason` | Reason for revocation (requires HR approval; exceptional use only) |
| `deleted_at` | Soft-delete timestamp |
| `deleted_by` | FK to User |

### Unique Constraints
- `(document_version_id, signer_id)` where `status NOT IN ('declined', 'revoked')` — at most one active signature per signer per document version (partial unique index)

### Validation Rules
- `signature_method` must be one of `click_to_sign`, `aadhaar_esign`, `docusign`, `wet_digital`
- `status = signed` requires `signed_at`, `ip_address` to be non-null
- `status = declined` requires `decline_reason` to be non-null
- `status = revoked` requires `revoked_by`, `revoked_at`, and `revocation_reason` to be non-null
- `expires_at`, if set, must be after `requested_at`
- `signature_method = aadhaar_esign` requires `signature_payload` to be non-null when `status = signed`
- A signature request must not be created against a Document Version with `status ≠ active`
- `ip_address` must be a valid IPv4 or IPv6 address string

### Lifecycle
```
requested → signed (terminal — immutable record)
requested → declined (terminal — signer declined)
requested → expired (terminal — deadline passed)
signed → revoked (exceptional — HR-approved, soft-deleted)
```
- `requested` — Signature request has been sent; awaiting signer action
- `signed` — Signer has completed the signature; record is immutable
- `declined` — Signer explicitly declined; HR must be notified
- `expired` — Deadline passed without a response; HR may issue a new request
- `revoked` — Signed but subsequently revoked by HR with legal authorization (exceptional; the `signed` record is soft-deleted, not mutated)

### Audit Requirements
- Every status transition logged with actor, timestamp, and transition trigger (user action vs. system expiry)
- `signed` events logged with: signer, document version, method, ip address, device fingerprint, and timestamp — this log must be append-only and immutable (separate from standard updated_by audit)
- `revoked` events require a secondary confirmation step and dual logging: the revocation action log and the supervising HR Admin who approved it
- All signature request creations logged with the requesting actor, targeted signer, and document version
- Declined events logged with the signer, timestamp, and decline reason

---

## Business Invariants

The following cross-entity invariants must hold at all times. Application logic and database constraints share responsibility for enforcing them.

### Invariant 1 — Document File must always have at least one Document Version
A `Document File` record must have at minimum one associated `Document Version`. The creation of a Document File and its first version must be atomic. A query of the form `WHERE document_file_id = X AND status = 'active'` against Document Version must return exactly one row for any active Document File.

### Invariant 2 — Current Version consistency
`Document File.current_version_id` must always point to the single Document Version row where `(document_file_id = X AND is_current_version = true AND status = 'active')`. These two state indicators must be updated in the same transaction.

### Invariant 3 — One published Policy Document per policy code
At any point in time, at most one `Policy Document` record per `(tenant_id, policy_code)` may have `status = published`. The publish-and-supersede operation must be a single atomic transaction.

### Invariant 4 — Signed Document Signature records are immutable
A Document Signature with `status = signed` must never have any of its core signing fields modified: `signer_id`, `signature_method`, `signed_at`, `ip_address`, `signature_payload`. If these records must be invalidated, only `status = revoked` + soft delete is permitted. The original signed record is preserved in the audit log.

### Invariant 5 — Signatures only against active Document Versions
No `Document Signature` record may have a `document_version_id` pointing to a Document Version with `status` other than `active`. Signature requests issued before a version was superseded that remain `status = requested` must be cancelled (transitioned to `expired`) when the version is superseded.

### Invariant 6 — Employee Document verification completeness
An `Employee Document` with `verification_status = verified` must have both `verified_by` and `verified_at` set. An Employee Document with `verification_status = rejected` must have `rejection_reason` set.

### Invariant 7 — Sensitive files never public
A `Document File` with `is_sensitive = true` must never have `access_level = public`. This constraint must be enforced at the application validation layer and also as a database CHECK constraint.

---

## Module Permissions Reference

The Documents module enforces the following permission gates. These are additive to any RBAC role the user holds.

| Permission Code | What It Allows |
|-----------------|----------------|
| `documents:file:upload` | Upload a new Document File and create its first version |
| `documents:file:view` | View Document File metadata (not the binary) |
| `documents:file:download` | Download the binary of a non-sensitive Document Version |
| `documents:sensitive:view` | View metadata of sensitive (`is_sensitive = true`) documents |
| `documents:sensitive:download` | Download the binary of a sensitive Document Version |
| `documents:version:create` | Upload a new version to an existing Document File |
| `documents:employee:manage` | Create, update, and verify Employee Document records |
| `documents:employee:view` | View Employee Document records for employees in scope |
| `documents:policy:manage` | Create, edit, publish, and supersede Policy Documents |
| `documents:policy:view` | View published Policy Documents and acknowledgement status |
| `documents:signature:request` | Send a Document Signature request to another user |
| `documents:signature:revoke` | Revoke a signed Document Signature (requires HR Admin role) |
| `documents:type:manage` | Create and modify Document Types (Super Admin only) |
| `documents:reassign` | Reassign a Document File to a different owning entity |
