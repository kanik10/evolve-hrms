# Evolve HRMS — Workflow Engine: Business Entity Definitions

**Classification:** Internal Engineering Reference  
**Status:** Finalized  
**Module:** Approvals / Workflow Engine (Platform Core)  
**Preceding Documents:** `docs/database-standards.md`, `docs/entity-inventory.md`, `docs/leave-module-entity-definitions.md`, `docs/attendance-module-entity-definitions.md`, `docs/payroll-module-entity-definitions.md`

---

## Overview

The Workflow Engine is the platform's generic, entity-agnostic approval and automation infrastructure. It powers every process in the HRMS that requires structured human decision-making — leave requests, attendance corrections, reimbursement claims, payroll adjustments, exit processing, and more.

The engine is deliberately designed to know nothing about the business records it processes. It does not know what a Leave Request is. It knows only that some entity with a type and an ID needs to pass through a defined sequence of steps, collecting decisions from configured actors, and that certain actions must execute when specific events occur.

This separation produces three benefits:

1. **Reusability** — the same engine powers approval flows for every module without per-module approval code
2. **Configurability** — HR Admins can design and modify approval chains without engineering involvement
3. **Auditability** — every approval decision, delegation, escalation, and timeout is captured in a single, consistent audit structure regardless of the business domain

---

## Design Philosophy

### The Definition-Instance Model

The Workflow Engine uses a two-layer model that mirrors how all templated systems work:

```
Workflow Definition     ← the blueprint (designed by HR Admin, rarely changes)
  └── Step Definitions  ← ordered list of steps in the blueprint
        ├── Step Conditions    ← when does this step execute?
        └── Step Actions       ← what happens on specific step events?

Workflow Instance       ← one running execution (created per business record)
  └── Step Instances    ← one per executed step in the running workflow
```

A Workflow Definition is a stable template. A Workflow Instance is an ephemeral execution against one specific business record. Instances reference their Definition but are fully independent — modifying a Definition does not affect in-flight Instances.

### The Engine Contract

The Workflow Engine exposes a simple contract to all consuming modules:

```
START   WorkflowEngine.initiate(entity_type, entity_id, context)
          → resolves the matching Workflow Definition
          → creates a Workflow Instance
          → executes the first eligible Step
          → returns instance_id

DECIDE  WorkflowEngine.record_decision(instance_id, step_instance_id, decision, actor, notes)
          → validates actor authority and delegation
          → records the Step Instance decision
          → evaluates transition conditions
          → advances to the next eligible step or completes the instance
          → fires configured Actions

QUERY   WorkflowEngine.get_status(instance_id)
          → returns current step, overall status, decision history

CANCEL  WorkflowEngine.cancel(instance_id, reason, actor)
          → marks instance cancelled; fires cancellation Actions
```

Consuming modules call `initiate` when a record needs approval and react to completion via Actions (callbacks / event hooks). The module is responsible for updating its own record state in response to workflow outcomes — not the engine.

---

## Architecture Overview

```
Configuration Layer (HR Admin-managed)
┌────────────────────────────────────────────────────────────────┐
│  Workflow Definition                                           │
│    ├── entity_type: leave_request                             │
│    ├── trigger_conditions: leave_type = 'ML'                  │
│    └── Step Definitions (ordered):                            │
│          Step 1: Reporting Manager (approval)                 │
│            ├── Condition: requested_days > 5                  │
│            ├── Escalation: after 48 hrs → Department Head     │
│            └── Actions:                                        │
│                  on_approved: notify employee                 │
│                  on_rejected: notify employee, update status  │
│          Step 2: HR Admin (approval, for ML only)             │
│            └── Condition: leave_type.is_statutory = true      │
│          Step 3: Auto-action (update leave balance)           │
└────────────────────────────────────────────────────────────────┘

Execution Layer (system-managed, per business record)
┌────────────────────────────────────────────────────────────────┐
│  Workflow Instance (leave_request: abc-123)                   │
│    ├── status: in_progress                                    │
│    ├── current_step_number: 2                                 │
│    └── Step Instances:                                         │
│          Step 1 Instance → Manager Priya → approved at 10:32 │
│          Step 2 Instance → HR Admin → pending                 │
└────────────────────────────────────────────────────────────────┘

Support Layer
┌────────────────────────────────────────────────────────────────┐
│  Approval Delegation                                          │
│    Priya (delegate: Rahul) Aug 1–Aug 10 (on leave)           │
│    → All pending steps assigned to Priya → reassigned to Rahul│
└────────────────────────────────────────────────────────────────┘
```

---

## Entity Index

1. [Workflow Definition](#1-workflow-definition)
2. [Workflow Step Definition](#2-workflow-step-definition)
3. [Workflow Step Condition](#3-workflow-step-condition)
4. [Workflow Step Action](#4-workflow-step-action)
5. [Workflow Instance](#5-workflow-instance)
6. [Workflow Step Instance](#6-workflow-step-instance)
7. [Workflow Transition Rule](#7-workflow-transition-rule)
8. [Approval Delegation](#8-approval-delegation)

---

## 1. Workflow Definition

### Purpose
A Workflow Definition is the complete, reusable blueprint for one approval or automation process. It defines what type of business entity it handles, the conditions under which it is selected, and contains the ordered set of Step Definitions that constitute the workflow.

### Business Description
A Workflow Definition answers the question: "When this type of record arrives for approval, what happens?" There can be multiple Workflow Definitions for the same entity type — the engine selects the correct one by evaluating each definition's `trigger_conditions` against the incoming record's attributes.

Examples:
- "Short Leave Approval" — for Leave Requests with `requested_days ≤ 3`; one-step: Reporting Manager
- "Long Leave Approval" — for Leave Requests with `requested_days > 3`; two steps: Manager → HR Admin
- "Maternity Leave Approval" — for Leave Requests where `leave_type.is_statutory = true`; two steps: Manager → HR Head
- "Expense Reimbursement — Standard" — for claims ≤ ₹5,000; one step: Manager
- "Expense Reimbursement — High Value" — for claims > ₹5,000; two steps: Manager → Finance

The engine evaluates all matching Definitions for the entity type, scores them by `priority`, and selects the highest-priority matching Definition. If no definition matches, the `default` Definition for the entity type is used. If no default exists, the record cannot be submitted.

### Relationships
- **One Workflow Definition → One Tenant**
- **One Workflow Definition → Many Workflow Step Definitions** (ordered, the blueprint steps)
- **One Workflow Definition → Many Workflow Instances** (active and historical executions)

### Business Rules
1. Workflow Definitions are scoped to one `trigger_entity_type`. A single definition cannot handle multiple entity types.
2. Exactly one Workflow Definition per `trigger_entity_type` per tenant may have `is_default = true`. This is the fallback when no other definition's conditions match.
3. Workflow Definitions are selected at initiation time by evaluating `trigger_conditions` (a set of Workflow Step Conditions on the definition itself, not on steps). The highest-priority matching definition wins.
4. A Workflow Definition must have at least one Step Definition before it can be `activated`.
5. A Workflow Definition in `active` status may not have its steps reordered or removed — those changes require creating a new version (`superseded_by_definition_id`) while keeping the old one for in-flight instances.
6. `version` is an integer that increments each time a new version of the same logical workflow is created. In-flight Instances always reference the Definition version that was active when they were initiated.
7. A Workflow Definition with `requires_all_steps_approved = false` means a single approval at any required step is sufficient for completion (useful for "any one of these managers can approve" patterns). The default is `true` — all required steps must be approved for the workflow to complete.
8. `auto_approve_if_no_steps_match` controls behavior when all steps are conditionally skipped — either auto-approve the record (true) or block with an error (false).

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `name` | Human-readable name (e.g., "Standard Leave Approval") |
| `code` | Unique identifier (e.g., `LEAVE_STD`, `EXPENSE_HIGH_VALUE`) |
| `trigger_entity_type` | The type of business record this workflow handles (e.g., `leave_request`, `reimbursement_claim`) |
| `is_default` | Boolean — fallback definition for this entity type when no conditions match |
| `priority` | Integer — higher = evaluated first when multiple definitions match |
| `version` | Integer version number |
| `status` | `draft`, `active`, `inactive`, `archived` |

### Optional Fields
| Field | Description |
|-------|-------------|
| `description` | Explanation of when this workflow applies and what it does |
| `trigger_conditions_logic` | `all` (AND) or `any` (OR) — how trigger conditions are combined |
| `requires_all_steps_approved` | Boolean (default: true) — whether all steps must approve for completion |
| `auto_approve_if_no_steps_match` | Boolean — whether to auto-complete if all steps are skipped |
| `completion_sla_hours` | Maximum hours the entire workflow should take (for SLA monitoring) |
| `superseded_by_definition_id` | FK to Workflow Definition — the newer version that replaced this one |
| `tags` | Array of string tags for filtering in the admin UI (e.g., `["leave", "statutory"]`) |
| `created_by` | FK to User — who created this definition |

### Unique Constraints
- `(tenant_id, code)` — Workflow Definition code unique per tenant
- `(tenant_id, trigger_entity_type, is_default)` where `is_default = true` — one default per entity type per tenant

### Validation Rules
- `priority` must be a positive integer
- `trigger_conditions_logic` must be `all` or `any`
- `completion_sla_hours` must be a positive number if set
- A Definition cannot be `activated` if it has zero Step Definitions
- Only one `is_default = true` Definition may exist per `(tenant_id, trigger_entity_type)`

### Lifecycle
```
draft → active → inactive → archived
active → inactive (can be reactivated)
active → archived (when superseded by a new version)
```
- `draft` — Being configured; not available for use
- `active` — Selectable for new Workflow Instances
- `inactive` — Paused; in-flight Instances continue; no new Instances can be initiated
- `archived` — Permanently retired; replaced by a newer version

### Audit Requirements
- Activation, deactivation, and archival logged with acting user and timestamp
- Version increments logged with the change description
- Deletion is prohibited — Workflow Definitions with historical Instances must be retained

---

## 2. Workflow Step Definition

### Purpose
A Workflow Step Definition is a single step in a Workflow Definition — specifying who acts at that step, what type of action they take (approve, auto-process, notify), how the actual approver is resolved, and what escalation rules apply if no decision is made within the time window.

### Business Description
Each step in a workflow blueprint represents one unit of work. Most steps are approval steps — they wait for a specific human actor to make a decision. But steps can also be:
- **Auto-action steps** — the engine automatically performs an action without human involvement (e.g., "auto-approve if leave balance is sufficient")
- **Notification steps** — send a notification to one or more parties without awaiting a response (e.g., notify the department head's admin when a long leave is approved)
- **Parallel approval steps** — all designated approvers must respond (consensus-based approval)

The most important design decision in a Step Definition is how the approver is resolved. The engine supports dynamic approver resolution — the approver is not always a fixed user but is often computed at runtime from the business record's context.

### Approver Resolution Types

| `approver_resolution_type` | How the Approver Is Resolved | Example |
|---------------------------|------------------------------|---------|
| `reporting_manager` | Employee's active Manager Assignment (solid-line) | First-line manager |
| `nth_level_manager` | Manager's manager, resolved N levels up (`approver_level_offset`) | Skip-level (2nd manager) |
| `department_head` | Head of the employee's current Department | Dept Head |
| `business_unit_head` | Head of the employee's Business Unit | BU Head |
| `specific_role` | Any active user holding `approver_role_id` in the employee's scope | All HR Managers in dept |
| `specific_user` | Always the user identified by `approver_user_id` | Fixed approver (e.g., CFO) |
| `cost_center_owner` | Finance owner of the employee's primary Cost Center | Finance Approver |
| `previous_step_approver` | Whoever approved the previous step | Chained approval |
| `dynamic_expression` | CEL expression evaluated against workflow context | Complex routing logic |

### Relationships
- **One Workflow Step Definition → One Workflow Definition**
- **One Workflow Step Definition → One Tenant**
- **One Workflow Step Definition → Many Workflow Step Conditions** (eligibility conditions)
- **One Workflow Step Definition → Many Workflow Step Actions** (event-based actions)
- **One Workflow Step Definition → Many Workflow Step Instances** (runtime executions)

### Business Rules
1. `step_order` must be unique within a Workflow Definition and determines execution sequence.
2. `step_type` determines the nature of the step:
   - `approval` — waits for an approver's explicit decision (`approved` / `rejected` / `returned`)
   - `auto_approve` — engine automatically advances the workflow without human action
   - `notification` — sends a notification and immediately advances without waiting
   - `parallel_approval` — multiple approvers are notified; step completes when all respond (or `min_approvals_required` respond if configured)
3. For `step_type = approval`, the `approver_resolution_type` must be set.
4. `is_required` = `false` marks an optional step — if the resolved approver is unavailable or the step's conditions are not met, the step is skipped rather than blocking.
5. `escalation_after_hours` is the window within which the approver must act. At expiry, the engine executes the escalation policy defined by `escalation_type`:
   - `escalate_to_next_level` — step is reassigned to the approver's manager
   - `escalate_to_role` — step is reassigned to users of `escalation_role_id`
   - `auto_approve` — step is automatically approved after the window
   - `auto_reject` — step is automatically rejected
   - `alert_only` — HR is alerted but the step remains pending
6. `allow_return_to_submitter` — whether the approver can send the record back to the submitter for clarification (as a `returned` decision), without rejecting it outright.
7. For `approver_resolution_type = dynamic_expression`, the `dynamic_approver_expression` is a CEL (Common Expression Language) string evaluated against the Workflow Instance context. It must resolve to a User ID.
8. `min_approvals_required` is only relevant for `parallel_approval` steps — specifies how many of the designated approvers must approve for the step to be considered approved.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `workflow_definition_id` | FK to Workflow Definition |
| `step_order` | Integer — execution sequence (1 = first) |
| `step_name` | Display name (e.g., "Reporting Manager Approval", "HR Admin Sign-off") |
| `step_type` | `approval`, `auto_approve`, `notification`, `parallel_approval` |
| `is_required` | Boolean — whether the step must be executed or can be skipped |

### Optional Fields
| Field | Description |
|-------|-------------|
| `step_description` | Guidance shown to the approver explaining what to review |
| `approver_resolution_type` | How the acting user is resolved (required for `approval` and `parallel_approval` steps) |
| `approver_role_id` | FK to Role — required if `approver_resolution_type = specific_role` |
| `approver_user_id` | FK to User — required if `approver_resolution_type = specific_user` |
| `approver_level_offset` | Integer — manager levels up (required for `nth_level_manager`) |
| `dynamic_approver_expression` | CEL expression string (required for `dynamic_expression` type) |
| `escalation_after_hours` | Hours before escalation triggers |
| `escalation_type` | `escalate_to_next_level`, `escalate_to_role`, `auto_approve`, `auto_reject`, `alert_only` |
| `escalation_role_id` | FK to Role — target for `escalate_to_role` escalation |
| `max_escalation_levels` | Maximum number of escalation chains before `alert_only` kicks in |
| `allow_return_to_submitter` | Boolean — allow the approver to send back for revision |
| `min_approvals_required` | Integer — for parallel_approval: minimum approvals needed |
| `sla_hours` | Expected completion time for this step specifically |
| `step_instructions_template` | Notification template code for instructions sent to the approver |

### Unique Constraints
- `(workflow_definition_id, step_order)` — step order unique within a definition

### Validation Rules
- `step_order` must be a positive integer
- `approver_resolution_type` must be set for `approval` and `parallel_approval` step types
- `approver_role_id` required when `approver_resolution_type = specific_role`
- `approver_user_id` required when `approver_resolution_type = specific_user`
- `dynamic_approver_expression`, if set, must be syntactically valid CEL
- `escalation_after_hours` must be a positive number if set
- `min_approvals_required`, if set, must be ≥ 1

### Lifecycle
Step Definitions follow their parent Workflow Definition lifecycle. Individually they can be marked `inactive` within a draft Definition (removed from execution) but cannot be deleted if Instances have executed against them.

### Audit Requirements
- Creation, modification, and deactivation of Step Definitions logged
- Changes to `approver_resolution_type` on an active Definition logged — affects all future approvals

---

## 3. Workflow Step Condition

### Purpose
A Workflow Step Condition is a predicate evaluated at runtime that controls whether a Step (or the entire Workflow Definition) executes. Conditions enable conditional branching — skipping steps that are not applicable, or selecting different Workflow Definitions for different scenarios.

### Business Description
Conditions are what make the Workflow Engine flexible. Without conditions, every Leave Request would go through the same steps regardless of duration, type, or employee level. With conditions:
- "Skip the HR Admin step if the leave is ≤ 5 days" → Step Condition on Step 2
- "Only use the High-Value Expense workflow if claim > ₹5,000" → Definition trigger condition
- "Require VP approval if the employee is a Manager grade" → Step Condition on the final approval step
- "Skip the department head notification if it's a weekend" → Step Condition with a date function

Conditions are expressed as attribute evaluations on the **Workflow Context** — a JSON object built at instance initiation time containing the trigger entity's data and related attributes.

### Workflow Context

The engine builds a context object at initiation time that contains:

```json
{
  "entity": {
    "type": "leave_request",
    "id": "...",
    "requested_days": 8,
    "leave_type_code": "AL",
    "leave_type_is_statutory": false,
    "leave_from_date": "2025-08-05",
    "claimed_amount": null
  },
  "employee": {
    "id": "...",
    "grade_level": 5,
    "department_head_id": "...",
    "manager_id": "...",
    "is_on_probation": false,
    "service_years": 2.5
  },
  "tenant": {
    "country_code": "IN",
    "plan": "enterprise"
  }
}
```

All condition expressions evaluate against this context object. The context schema is fixed per `trigger_entity_type` — each module documents what fields it populates in the context.

### Condition Structure

Each Workflow Step Condition can be expressed in two ways:

**Simple (attribute-based):**
- `attribute_path` — dot-notation path into the context (e.g., `entity.requested_days`)
- `operator` — comparison operator
- `comparison_value` — the value to compare against
- e.g., `entity.requested_days > 5`

**Complex (expression-based):**
- `condition_expression` — a full CEL expression (e.g., `entity.requested_days > 5 && employee.grade_level >= 6`)

### Relationships
- **One Workflow Step Condition → One Workflow Step Definition** (for step-level conditions) OR **One Workflow Definition** (for trigger-level conditions)
- **One Workflow Step Condition → One Tenant**

### Business Rules
1. Conditions attached to a **Workflow Definition** (`condition_scope = trigger`) are evaluated when selecting which definition to use. They determine if this definition fires for the given record.
2. Conditions attached to a **Workflow Step Definition** (`condition_scope = step`) are evaluated at step execution time. They determine if this step is executed or skipped.
3. `condition_logic` on the Step or Definition level determines how multiple conditions are combined: `all` (AND — all conditions must be true) or `any` (OR — any condition being true is sufficient).
4. A condition evaluating to `false` on a `is_required = false` step causes that step to be **skipped**. The instance advances to the next step.
5. A condition evaluating to `false` on a `is_required = true` step causes the workflow to **halt** with an error — this is a configuration error (required step with blocking conditions).
6. Conditions that reference attributes not present in the context object evaluate to `false` by default (safe failure).
7. Conditions are immutable once the parent Definition is `active` and has in-flight Instances. Modifications require a new Definition version.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `condition_scope` | `trigger` (definition-level) or `step` (step-level) |
| `workflow_definition_id` | FK to Workflow Definition (always set) |
| `condition_sequence` | Integer — display and evaluation order |
| `condition_type` | `simple` or `expression` |

### Optional Fields — Simple Conditions
| Field | Description |
|-------|-------------|
| `workflow_step_definition_id` | FK to Workflow Step Definition (set for `condition_scope = step`) |
| `attribute_path` | Dot-notation path into workflow context (e.g., `entity.requested_days`) |
| `operator` | `equals`, `not_equals`, `greater_than`, `less_than`, `greater_than_or_equal`, `less_than_or_equal`, `in`, `not_in`, `contains`, `is_null`, `is_not_null` |
| `comparison_value` | String representation of the value to compare (type-cast by the engine) |
| `comparison_value_type` | `string`, `number`, `boolean`, `date`, `array` — how to cast `comparison_value` |

### Optional Fields — Expression Conditions
| Field | Description |
|-------|-------------|
| `condition_expression` | CEL expression string evaluated against workflow context |
| `condition_description` | Human-readable description of what this condition checks (for admin UI display) |

### Unique Constraints
- `(workflow_step_definition_id, condition_sequence)` — sequence unique per step

### Validation Rules
- For `condition_type = simple`: `attribute_path`, `operator`, and `comparison_value` must all be set
- For `condition_type = expression`: `condition_expression` must be set and must pass CEL syntax validation
- `operator` must be one of the defined enum values
- `comparison_value_type` must be set for simple conditions

### Lifecycle
Conditions are immutable once the parent Definition is active with in-flight Instances. They share the parent Definition's lifecycle.

### Audit Requirements
- Condition creation and modification logged as part of the Definition's audit trail
- Condition evaluation results (true/false, for which step, in which instance) logged per Step Instance for debugging

---

## 4. Workflow Step Action

### Purpose
A Workflow Step Action is a configured automated reaction to a specific event during workflow execution — a notification sent, a field updated, a downstream workflow triggered, or a webhook fired — executed by the engine without human intervention.

### Business Description
Actions are what connect the Workflow Engine to the rest of the HRMS. When a Leave Request is approved, the engine doesn't intrinsically know to update the `attendance_status` on the relevant Attendance Days — that is an Action. When a Reimbursement Claim is rejected, the Action sends a notification to the employee and a Slack message to the finance team.

Actions decouple the workflow routing logic from the business outcomes. This allows HR Admins to add, remove, or modify the effects of approval decisions without changing application code.

### Action Trigger Events

| `trigger_event` | When It Fires |
|-----------------|---------------|
| `step_approved` | An approver approves the step |
| `step_rejected` | An approver rejects the step |
| `step_returned` | An approver returns the record to submitter |
| `step_escalated` | The escalation timer fires and the step is escalated |
| `step_auto_approved` | The step is auto-approved (by timeout or engine logic) |
| `step_skipped` | The step's conditions evaluate to false and it is skipped |
| `instance_completed` | All required steps are approved — workflow is done |
| `instance_rejected` | Any required step is rejected — workflow is done |
| `instance_cancelled` | The workflow is cancelled by the submitter or an admin |
| `instance_expired` | The workflow's `completion_sla_hours` elapsed |

### Action Types

| `action_type` | What It Does |
|---------------|-------------|
| `send_notification` | Dispatches a notification via the Notifications module (email, in-app, SMS) |
| `update_entity_field` | Updates a field on the trigger entity (e.g., set `leave_request.status = approved`) |
| `create_workflow_instance` | Initiates a new Workflow Instance for a downstream entity |
| `execute_webhook` | Sends an HTTP POST to a configured webhook URL |
| `create_audit_log` | Creates a custom audit log entry in `sys_audit_logs` |
| `update_related_entity` | Updates a field on a related entity (e.g., update Attendance Day on leave approval) |

### Relationships
- **One Workflow Step Action → One Workflow Step Definition** (most common)
- OR **One Workflow Step Action → One Workflow Definition** (instance-level events like `instance_completed`)
- **One Workflow Step Action → One Tenant**

### Business Rules
1. Actions are executed **synchronously** for `update_entity_field` and `update_related_entity` — the field update happens within the same transaction as the decision record.
2. Actions are executed **asynchronously** for `send_notification` and `execute_webhook` — they are queued and processed by background workers. Failure of an async action does not roll back the decision.
3. Multiple Actions may be configured for the same `trigger_event` on the same step. They execute in `action_sequence` order.
4. `action_config` is a JSON object whose schema depends on `action_type`:
   - For `send_notification`: `{ "template_code": "LEAVE_APPROVED", "recipient": "submitter" | "approver" | "all_approvers" | "specific_user_id" }`
   - For `update_entity_field`: `{ "field_path": "status", "value": "approved" }` or `{ "field_path": "status", "value_expression": "instance.overall_status" }`
   - For `create_workflow_instance`: `{ "entity_type": "leave_balance_update", "entity_id_expression": "entity.leave_balance_id" }`
   - For `execute_webhook`: `{ "url": "https://hooks.example.com/...", "method": "POST", "headers": {}, "payload_template": "{...}" }`
5. Actions that fail must be logged to the workflow action execution log. Failed `update_entity_field` actions are treated as critical failures and must be alerted to the system admin.
6. The `is_enabled` flag allows HR Admins to temporarily disable an action without deleting it.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `workflow_definition_id` | FK to Workflow Definition |
| `trigger_event` | The event that fires this action |
| `action_type` | The type of automated action to execute |
| `action_sequence` | Integer — execution order when multiple actions share a trigger event |
| `action_config` | JSON configuration specific to `action_type` |
| `is_enabled` | Boolean — whether this action is active |

### Optional Fields
| Field | Description |
|-------|-------------|
| `workflow_step_definition_id` | FK to Workflow Step Definition (if step-level event; null for instance-level events) |
| `action_name` | Human-readable label (e.g., "Notify Employee on Approval") |
| `failure_policy` | `fail_silently`, `retry_3x`, `alert_admin` — how to handle action failures |
| `retry_count` | How many times to retry async actions on failure |

### Unique Constraints
- `(workflow_step_definition_id, trigger_event, action_sequence)` — sequence unique per trigger per step

### Validation Rules
- `trigger_event` must be one of the defined enum values
- `action_type` must be one of the defined enum values
- `action_config` must be valid JSON and pass schema validation for the declared `action_type`
- `action_sequence` must be a positive integer

### Lifecycle
Actions share the lifecycle of their parent Workflow Definition. `is_enabled` provides runtime toggling without lifecycle changes.

### Audit Requirements
- Every Action execution logged: action ID, instance ID, step instance ID, trigger event, outcome (success/failure), execution timestamp
- Failed synchronous actions logged as critical system events with full error detail
- Async action retry events logged

---

## 5. Workflow Instance

### Purpose
A Workflow Instance is one live execution of a Workflow Definition against a specific business record. It tracks the overall state of the approval process — which step is currently pending, what decisions have been made, and whether the workflow has completed.

### Business Description
When an employee submits a Leave Request, the engine creates a Workflow Instance. That Instance is the runtime envelope for everything that happens during the approval journey for that specific Leave Request. It knows which Definition it is executing, what step it is currently on, and what the overall outcome is.

An Instance is created once and progresses forward. It cannot be restarted (a cancelled instance requires a new submission creating a new Instance). Multiple Instances for the same business record in non-terminal states are prohibited — only one active Instance per record at a time.

### Relationships
- **One Workflow Instance → One Workflow Definition** (the blueprint it executes)
- **One Workflow Instance → One Tenant**
- **One Workflow Instance → Many Workflow Step Instances** (one per executed step)
- **Referenced by** business records as `approval_workflow_instance_id` (Leave Request, Reimbursement Claim, Payroll Adjustment, Regularization Request, etc.)

### Business Rules
1. A Workflow Instance is created by calling `WorkflowEngine.initiate()`. Only one active (non-terminal) Instance may exist per `(trigger_entity_type, trigger_entity_id)`.
2. `trigger_entity_type` is the string identifier of the business record type (e.g., `leave_request`, `reimbursement_claim`). It matches the `trigger_entity_type` on the Workflow Definition.
3. `trigger_entity_id` is the UUID of the specific business record.
4. `workflow_context` is a JSON snapshot of the context object built at initiation time. It is immutable — even if the business record changes during the approval process, the Instance continues to evaluate conditions against the context captured at start.
5. `current_step_number` tracks which step is currently awaiting a decision. It is updated each time a step completes and the engine advances.
6. `overall_status` is the aggregate outcome:
   - `pending` — at least one step is still awaiting a decision
   - `completed` — all required steps are approved
   - `rejected` — at least one required step is rejected
   - `returned` — the record has been sent back to the submitter for revision
   - `cancelled` — the submitter or an admin cancelled the workflow
   - `expired` — the `completion_sla_hours` elapsed without completion
7. Cancellation is only permitted if the Instance has not yet reached `completed` or `rejected` status.
8. When an Instance reaches a terminal state (`completed`, `rejected`, `cancelled`, `expired`), it fires `instance_completed` or `instance_rejected` Actions defined on the Workflow Definition.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `workflow_definition_id` | FK to Workflow Definition |
| `workflow_definition_version` | Snapshot of the definition version at initiation time |
| `trigger_entity_type` | Entity type string (e.g., `leave_request`) |
| `trigger_entity_id` | UUID of the business record |
| `initiated_by` | FK to User — who initiated (typically the submitter) |
| `initiated_at` | Timestamp of initiation |
| `current_step_number` | The step order number currently awaiting action |
| `overall_status` | `pending`, `completed`, `rejected`, `returned`, `cancelled`, `expired` |
| `workflow_context` | JSON snapshot of the context object at initiation |

### Optional Fields
| Field | Description |
|-------|-------------|
| `completed_at` | Timestamp when the instance reached a terminal state |
| `sla_deadline_at` | Computed deadline based on `completion_sla_hours` |
| `is_sla_breached` | Boolean — whether the SLA deadline was exceeded |
| `total_steps_count` | Total eligible steps in the selected definition |
| `steps_completed_count` | Count of steps that have reached a terminal state |
| `cancellation_reason` | Reason provided when cancelled |
| `cancelled_by` | FK to User — who cancelled |

### Unique Constraints
- No two active (non-terminal) Instances may share `(tenant_id, trigger_entity_type, trigger_entity_id)`

### Validation Rules
- `trigger_entity_id` must reference an existing record of `trigger_entity_type`
- `workflow_context` must be valid JSON
- `current_step_number` must be ≤ total step count in the referenced Definition

### Lifecycle
```
pending → completed
        → rejected
        → returned (sent back to submitter; may re-enter pending after resubmission)
        → cancelled
        → expired
```
Terminal states (`completed`, `rejected`, `cancelled`, `expired`) are permanent — no transitions out.

### Audit Requirements
- Instance creation logged with the selected Definition ID and trigger context
- Every status transition logged with timestamp and actor
- SLA breach events logged as monitoring alerts
- Terminal state events logged as the primary outcome record for compliance reporting

---

## 6. Workflow Step Instance

### Purpose
A Workflow Step Instance is the runtime record of one step's execution within a Workflow Instance — capturing who the actual approver was (resolved at runtime), what decision was made, when, and what notes were provided.

### Business Description
Where the Workflow Step Definition says "the approver is the Reporting Manager," the Workflow Step Instance says "for employee Priya's leave request, the Reporting Manager resolved to user Rahul, who approved it at 11:45 AM on Aug 3, 2025, with the note 'Approved — ensure client handover before travel.'"

Every human touchpoint in the approval process produces one Step Instance record. They are the granular, permanent audit log of who approved what and when.

Step Instances also capture the technical side: which delegation was active (if the resolved approver was acting as a delegate for someone else), whether the step timed out, and how many times it was re-assigned due to escalation.

### Relationships
- **One Workflow Step Instance → One Workflow Instance**
- **One Workflow Step Instance → One Workflow Step Definition** (the blueprint step)
- **One Workflow Step Instance → One Tenant**
- **One Workflow Step Instance → One User** (the resolved acting approver — may differ from the canonical approver if a delegation is active)
- **One Workflow Step Instance → Zero or One Approval Delegation** (if a delegation was used)

### Business Rules
1. A Step Instance is created when the engine reaches a step and the step's conditions evaluate to `true`. If conditions evaluate to `false`, a Step Instance is still created but with `step_status = skipped` — maintaining a complete execution trace.
2. `resolved_approver_id` is the User ID of the person the engine assigned this step to — the result of the approver resolution logic. For `specific_user` type, it is always the configured user. For `reporting_manager`, it is resolved at runtime from the employee's active Manager Assignment.
3. `acting_as_delegate_for_id` is populated when the resolved approver has an active Approval Delegation and the step is being handled by the delegate instead.
4. `step_status` progresses from `pending` to a terminal state when the approver acts. Terminal states: `approved`, `rejected`, `returned`, `skipped`, `auto_approved`, `escalated`, `expired`.
5. `escalated_to_user_id` is set when the step is escalated — the step remains in `escalated` status until the new approver acts, at which point it moves to `approved` or `rejected`.
6. `decision_at` and `decision_by` must both be set on any terminal state except `skipped`, `expired`, and `auto_approved`.
7. For `parallel_approval` steps, multiple Step Instances are created — one per designated approver. The parent Step is considered complete once `min_approvals_required` instances are approved.
8. Step Instance records are immutable once their `step_status` reaches a terminal state.
9. `approver_notes` is optional but strongly recommended for rejections — it helps the submitter understand what to change.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `workflow_instance_id` | FK to Workflow Instance |
| `workflow_step_definition_id` | FK to Workflow Step Definition |
| `step_order` | Denormalized from Step Definition for direct query performance |
| `resolved_approver_id` | FK to User — who was assigned this step (resolved at creation time) |
| `step_status` | `pending`, `approved`, `rejected`, `returned`, `skipped`, `auto_approved`, `escalated`, `expired` |
| `created_at` | Timestamp when this step was initiated |
| `due_at` | Deadline for this step (created_at + escalation_after_hours) |

### Optional Fields
| Field | Description |
|-------|-------------|
| `acting_as_delegate_for_id` | FK to User — the original approver this person is delegating for |
| `delegation_id` | FK to Approval Delegation — the active delegation record used |
| `decision_at` | Timestamp when the approver made their decision |
| `decision_by` | FK to User — who actually made the decision (usually = `resolved_approver_id`) |
| `approver_notes` | Comments provided by the approver |
| `escalated_at` | Timestamp when escalation triggered |
| `escalated_to_user_id` | FK to User — new approver after escalation |
| `escalation_level` | Integer — how many escalation levels have occurred (prevents infinite loops) |
| `condition_evaluation_result` | Boolean — result of the step condition evaluation (for audit/debug) |
| `skipped_reason` | Explanation of why the step was skipped |

### Unique Constraints
- `(workflow_instance_id, workflow_step_definition_id, resolved_approver_id)` — for non-parallel steps. Parallel steps relax this constraint.

### Validation Rules
- `step_status` transitions are governed by the state machine; invalid transitions are rejected
- `decision_at` must be set for all terminal states except `skipped`, `expired`, `auto_approved`
- `escalated_to_user_id` must be set if `step_status = escalated`
- `due_at` must be ≥ `created_at`

### Lifecycle
```
pending → approved
        → rejected
        → returned (back to submitter)
        → skipped (conditions not met)
        → auto_approved (timeout or engine decision)
        → escalated → (new pending assignment for escalated user)
        → expired
```
All terminal states are permanent.

### Audit Requirements
- Every Step Instance creation and status transition is a primary audit record — this IS the approval audit trail
- Delegation usage logged (delegate acted on behalf of delegator)
- Escalation chains logged (who escalated to whom, when, why)
- Expired steps logged as SLA breach events

---

## 7. Workflow Transition Rule

### Purpose
A Workflow Transition Rule defines the routing logic after a step reaches a terminal state — specifically, which step to execute next based on the outcome of the current step. It enables non-linear workflows where different decisions lead to different subsequent paths.

### Business Description
In a simple linear workflow, each step always leads to the next one in order. But real approval processes are rarely linear:
- "If the Manager rejects a leave request, end the workflow immediately (do not go to HR)"
- "If the expense claim is approved but amount > ₹50,000, route to Finance Head before marking as approved"
- "If the leave type is Maternity Leave and the Manager approves, skip the standard HR step and go directly to the HR Head step"

Transition Rules allow this conditional branching. They are evaluated after a step reaches a terminal state and before the engine selects the next step.

### How Routing Works (Default vs. Rule-based)
```
Step N reaches terminal state
  ↓
Engine evaluates Transition Rules for (Step N, terminal_state):
  → If a matching rule exists with a target step → jump to that step
  → If a rule says "terminate" → close the instance
  → If no rules match → advance to Step N+1 (default linear behavior)
```

### Relationships
- **One Workflow Transition Rule → One Workflow Step Definition** (the "from" step)
- **One Workflow Transition Rule → One Workflow Definition**
- **One Workflow Transition Rule → One Tenant**

### Business Rules
1. Transition Rules are evaluated in `rule_priority` order. The first matching rule wins.
2. `from_step_definition_id` is the step whose outcome triggers this evaluation.
3. `on_event` is the terminal state that triggers this rule (`approved`, `rejected`, `returned`, etc.).
4. `condition_expression` is an optional CEL expression evaluated against the workflow context and instance state. If null, the rule always matches for the given `on_event`.
5. `target_action` specifies what happens when the rule matches:
   - `go_to_step` — advance to `target_step_order`
   - `terminate_approved` — close the Instance with `overall_status = completed`
   - `terminate_rejected` — close the Instance with `overall_status = rejected`
   - `return_to_submitter` — set Instance status to `returned`
   - `restart_from_step` — restart execution from `target_step_order` (for `returned` flows)
6. If no Transition Rules match and the step is not the last in the definition, the engine advances to the next `step_order` in sequence.
7. If the step is the last in the definition and no rules say otherwise:
   - All steps approved → `overall_status = completed`
   - Any required step rejected → `overall_status = rejected`

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `workflow_definition_id` | FK to Workflow Definition |
| `from_step_definition_id` | FK to Workflow Step Definition — the step this rule applies to |
| `on_event` | The terminal state that triggers this rule |
| `target_action` | `go_to_step`, `terminate_approved`, `terminate_rejected`, `return_to_submitter`, `restart_from_step` |
| `rule_priority` | Integer — lower = evaluated first |

### Optional Fields
| Field | Description |
|-------|-------------|
| `condition_expression` | CEL expression for conditional routing (null = always matches) |
| `target_step_order` | Required for `go_to_step` and `restart_from_step` — which step to go to |
| `rule_description` | Human-readable explanation of the routing logic |

### Unique Constraints
- `(from_step_definition_id, on_event, rule_priority)` — priority unique per event per step

### Validation Rules
- `target_step_order` must be set for `go_to_step` and `restart_from_step` actions
- `target_step_order` must reference a valid step order within the same Definition
- `rule_priority` must be a positive integer
- `on_event` must be a valid terminal state value

### Lifecycle
Transition Rules share the lifecycle of their parent Workflow Definition.

### Audit Requirements
- Rule evaluation outcomes logged per Step Instance execution (which rule matched, what the engine did)

---

## 8. Approval Delegation

### Purpose
An Approval Delegation is a time-bound authorization granted by one user (the Delegator) to another user (the Delegate) to act on their behalf in approval workflows — typically activated when the Delegator is on leave, travelling, or otherwise unavailable.

### Business Description
A manager going on a 2-week vacation should not become a blocker for their team's leave approvals, expense claims, and regularization requests. An Approval Delegation allows them to say: "From Aug 5 to Aug 19, my colleague Rahul will handle all approvals on my behalf."

When the engine resolves an approver for a step, it checks if the resolved approver has an active Delegation for that step's `trigger_entity_type`. If so, the step is assigned to the Delegate instead, with the Delegator identified in the `acting_as_delegate_for_id` field of the Step Instance.

### Scope of Delegation

Delegations can be scoped to control what the delegate is authorized to handle:

| `delegation_scope` | What It Covers |
|--------------------|----------------|
| `all` | All workflow types — total delegation of approval authority |
| `entity_type` | Only workflows for a specific `trigger_entity_type` (e.g., only leave requests) |
| `specific_workflow` | Only a specific Workflow Definition |

### Relationships
- **One Approval Delegation → One User** (the Delegator — whose authority is being delegated)
- **One Approval Delegation → One User** (the Delegate — who receives the authority)
- **One Approval Delegation → One Tenant**
- **Referenced by** Workflow Step Instances (when delegation is active)

### Business Rules
1. An Approval Delegation requires both a `valid_from` and `valid_to` date. Open-ended delegations are not permitted.
2. The Delegate must be an active user in the same tenant. The Delegate must hold at least one role that carries approval permissions. The engine does not require the Delegate to have the same approval permissions as the Delegator — the delegation itself grants authority for the specified scope.
3. A Delegator may have at most one active Delegation per `delegation_scope + entity_type` combination at any time. Overlapping delegations for the same scope are rejected.
4. The Delegate cannot further delegate the delegated authority — no chaining of delegations.
5. If the Delegator creates a new Delegation while a prior Delegation for the same scope is active, the prior Delegation is automatically expired.
6. Delegation applies only to **future** Step Instances. It does not retroactively reassign already-pending steps. HR Admin can manually reassign pending steps separately.
7. The Delegator can revoke the Delegation at any time by setting `revoked_at`.
8. HR Admin can create delegations on behalf of a Delegator (e.g., if the manager goes on emergency leave without setting up a delegation).
9. When the delegation is active, the Step Instance's `acting_as_delegate_for_id` is set to the Delegator's User ID, and `resolved_approver_id` is set to the Delegate — providing full traceability.

### Required Fields
| Field | Description |
|-------|-------------|
| `id` | UUID v7 |
| `tenant_id` | FK to Tenant |
| `delegator_user_id` | FK to User — who is granting the delegation |
| `delegate_user_id` | FK to User — who is receiving the authority |
| `valid_from` | Date from which the delegation is active |
| `valid_to` | Date on which the delegation expires |
| `delegation_scope` | `all`, `entity_type`, `specific_workflow` |
| `status` | `active`, `expired`, `revoked` |
| `created_by` | FK to User — who set up the delegation (may be Delegator or HR Admin) |

### Optional Fields
| Field | Description |
|-------|-------------|
| `trigger_entity_type` | Required if `delegation_scope = entity_type` — the entity type being delegated |
| `workflow_definition_id` | Required if `delegation_scope = specific_workflow` |
| `reason` | Reason for the delegation (e.g., "On annual leave Aug 5–19") |
| `revoked_at` | Timestamp of revocation |
| `revoked_by` | FK to User — who revoked the delegation |
| `auto_notify_delegator` | Boolean — whether to notify the Delegator when the Delegate takes an action |
| `notify_submitter_of_delegation` | Boolean — whether submitters are told their request is being handled by a delegate |

### Unique Constraints
- `(tenant_id, delegator_user_id, delegation_scope, trigger_entity_type, status)` where `status = active` — one active delegation per delegator per scope per type

### Validation Rules
- `valid_to` must be > `valid_from`
- `valid_to` must be in the future at creation time
- `delegate_user_id` must not equal `delegator_user_id` (cannot delegate to yourself)
- `trigger_entity_type` must be set if `delegation_scope = entity_type`
- `workflow_definition_id` must be set if `delegation_scope = specific_workflow`

### Lifecycle
```
active → expired (when valid_to is reached, system transition)
       → revoked (when manually cancelled before expiry)
```

### Audit Requirements
- Delegation creation and revocation logged with acting user and reason
- Every use of a delegation (Delegate acting on a step) logged on the Step Instance
- Delegation setup by HR Admin on behalf of another user flagged as an elevated-privilege action

---

## Module Integration Patterns

This section defines exactly how Leave, Payroll, Attendance, and Expenses connect to the same shared Workflow Engine.

---

### Integration Pattern: Leave Module

**Trigger Points:**
- `Leave Request` submitted → `WorkflowEngine.initiate("leave_request", leave_request.id, context)`
- `Leave Encashment` submitted → `WorkflowEngine.initiate("leave_encashment", leave_encashment.id, context)`

**Workflow Context Built by Leave Module:**
```json
{
  "entity": {
    "type": "leave_request",
    "id": "...",
    "requested_days": 8,
    "leave_type_code": "AL",
    "leave_type_is_statutory": false,
    "leave_type_requires_document": false,
    "has_supporting_document": true,
    "leave_from_date": "2025-08-05",
    "is_backdated": false,
    "is_emergency": false
  },
  "employee": {
    "id": "...",
    "service_years": 2.5,
    "is_on_probation": false,
    "grade_level": 4,
    "manager_id": "...",
    "department_head_id": "...",
    "department_id": "..."
  }
}
```

**Standard Leave Workflow Definitions:**

| Definition Name | Trigger Condition | Steps |
|-----------------|-------------------|-------|
| Short Leave | `entity.requested_days <= 3` | Step 1: Reporting Manager |
| Standard Leave | `entity.requested_days > 3 && !entity.leave_type_is_statutory` | Step 1: Reporting Manager → Step 2: HR Admin |
| Statutory Leave | `entity.leave_type_is_statutory = true` | Step 1: Reporting Manager → Step 2: HR Admin → Step 3: HR Head |
| Emergency Leave | `entity.is_emergency = true` | Step 1: Reporting Manager (SLA: 2 hrs; auto-approve on timeout) |
| Leave Encashment | *(default for entity type)* | Step 1: Reporting Manager → Step 2: HR Admin |

**Actions Configured on Leave Workflows:**

| Trigger Event | Action | Effect |
|---------------|--------|--------|
| `instance_completed` | `update_entity_field` | Set `leave_request.status = approved` |
| `instance_completed` | `update_related_entity` | Set `attendance_day.attendance_status = on_leave` for each leave date |
| `instance_completed` | `update_related_entity` | Debit `leave_balance.used_days` by `approved_days` |
| `instance_completed` | `send_notification` | Notify employee: "Your leave request has been approved" |
| `instance_rejected` | `update_entity_field` | Set `leave_request.status = rejected` |
| `instance_rejected` | `send_notification` | Notify employee: "Your leave request has been rejected" |
| `step_returned` | `update_entity_field` | Set `leave_request.status = returned` |
| `step_escalated` | `send_notification` | Alert HR of pending escalation |

**Reuse:** The same engine step definitions for "Reporting Manager Approval" and "HR Admin Approval" are used across all leave workflows and across other modules — no duplication.

---

### Integration Pattern: Payroll Module

**Trigger Points:**
- `Reimbursement Claim` submitted → `WorkflowEngine.initiate("reimbursement_claim", claim.id, context)`
- `Payroll Adjustment` submitted → `WorkflowEngine.initiate("payroll_adjustment", adjustment.id, context)`
- `Employee Loan` application → `WorkflowEngine.initiate("employee_loan", loan.id, context)`
- `Leave Encashment` (joint with Leave module) → `WorkflowEngine.initiate("leave_encashment", encashment.id, context)`
- `Tax Declaration` submitted → `WorkflowEngine.initiate("tax_declaration", declaration.id, context)`

**Workflow Context Built by Payroll Module (for Reimbursement Claim):**
```json
{
  "entity": {
    "type": "reimbursement_claim",
    "id": "...",
    "claim_type": "travel",
    "claimed_amount": 12500,
    "expense_period_days": 5
  },
  "employee": {
    "id": "...",
    "grade_level": 5,
    "manager_id": "...",
    "cost_center_owner_id": "..."
  }
}
```

**Standard Payroll Workflow Definitions:**

| Definition Name | Trigger Condition | Steps |
|-----------------|-------------------|-------|
| Standard Reimbursement | `entity.claimed_amount <= 5000` | Step 1: Reporting Manager |
| High-Value Reimbursement | `entity.claimed_amount > 5000 && entity.claimed_amount <= 25000` | Step 1: Reporting Manager → Step 2: Finance (Cost Center Owner) |
| Executive Reimbursement | `entity.claimed_amount > 25000` | Step 1: Reporting Manager → Step 2: Finance → Step 3: Finance Head |
| Payroll Adjustment — Bonus | `entity.adjustment_category = 'bonus'` | Step 1: HR Admin → Step 2: Finance |
| Payroll Adjustment — Recovery | `entity.adjustment_category = 'recovery'` | Step 1: HR Admin (single step — HR has authority) |
| Employee Loan | *(default for entity type)* | Step 1: HR Admin → Step 2: Finance |

**Actions on Reimbursement Workflow:**

| Trigger Event | Action | Effect |
|---------------|--------|--------|
| `instance_completed` | `update_entity_field` | Set `reimbursement_claim.status = approved` |
| `instance_completed` | `update_entity_field` | Set `reimbursement_claim.approved_amount` from approval decision |
| `instance_completed` | `send_notification` | Notify employee: "Your reimbursement has been approved and queued for payment" |
| `instance_rejected` | `update_entity_field` | Set `reimbursement_claim.status = rejected` |
| `instance_rejected` | `send_notification` | Notify employee with rejection reason |

---

### Integration Pattern: Attendance Module

**Trigger Points:**
- `Regularization Request` submitted → `WorkflowEngine.initiate("regularization_request", request.id, context)`
- `Overtime Record` submitted → `WorkflowEngine.initiate("overtime_record", overtime.id, context)`

**Workflow Context Built by Attendance Module (for Regularization Request):**
```json
{
  "entity": {
    "type": "regularization_request",
    "id": "...",
    "regularization_date": "2025-08-01",
    "requested_status": "present",
    "work_arrangement": "remote",
    "has_supporting_document": false,
    "days_since_regularization_date": 3
  },
  "employee": {
    "id": "...",
    "manager_id": "...",
    "monthly_regularization_count": 2,
    "monthly_regularization_limit": 3
  }
}
```

**Standard Attendance Workflow Definitions:**

| Definition Name | Trigger Condition | Steps |
|-----------------|-------------------|-------|
| Standard Regularization | `entity.days_since_regularization_date <= 7` | Step 1: Reporting Manager |
| Backdated Regularization | `entity.days_since_regularization_date > 7` | Step 1: Reporting Manager → Step 2: HR Admin |
| Overtime — Regular Day | `entity.overtime_type = 'regular_day_overtime'` | Step 1: Reporting Manager |
| Overtime — Holiday/Week-off | `entity.overtime_type in ['holiday_overtime', 'week_off_overtime']` | Step 1: Reporting Manager → Step 2: HR Admin |

**Actions on Regularization Workflow:**

| Trigger Event | Action | Effect |
|---------------|--------|--------|
| `instance_completed` | `update_entity_field` | Set `regularization_request.status = approved` |
| `instance_completed` | `update_related_entity` | Update `attendance_day.attendance_status` to requested status |
| `instance_completed` | `update_related_entity` | Create backdated Attendance Log entries if `create_backdated_log = true` |
| `instance_rejected` | `update_entity_field` | Set `regularization_request.status = rejected` |
| `instance_rejected` | `send_notification` | Notify employee |

**Actions on Overtime Workflow:**

| Trigger Event | Action | Effect |
|---------------|--------|--------|
| `instance_completed` | `update_entity_field` | Set `overtime_record.status = approved` |
| `instance_completed` | Conditional branch on `entity.disposition` | If `overtime_pay` → queue for next Pay Run; if `comp_off` → credit Leave Balance |
| `instance_rejected` | `update_entity_field` | Set `overtime_record.status = rejected` |

---

### Integration Pattern: Expenses

The Expenses (Reimbursement) workflow is already covered in the Payroll integration pattern above, since Reimbursement Claims are owned by the Payroll module. However, the Workflow Engine's reuse pattern means the same Step Definitions ("Reporting Manager Approval", "Finance Approval") are referenced by both the Leave Encashment workflow and the Reimbursement Claim workflow without duplication.

**The Expense module's use of the engine illustrates three key reuse patterns:**

**1. Shared Step Resolution** — "Reporting Manager Approval" step is defined once at the Workflow Definition level. The `approver_resolution_type = reporting_manager` logic is evaluated fresh per instance. The same step definition is referenced across Reimbursement, Overtime, and Leave Request workflows.

**2. Condition-Gated Routing** — The Finance step in "High-Value Reimbursement" is identical to the Finance step in "Employee Loan" (both use `approver_resolution_type = cost_center_owner`). The routing to this step is governed by a Transition Rule in each Definition.

**3. Action Reuse** — The `send_notification` action template `"APPROVAL_COMPLETED"` is a shared Notification Template referenced by multiple Definitions. The template uses dynamic variables (`{{entity.type}}`, `{{employee.name}}`) to produce appropriate messages regardless of the source module.

---

## Pre-Built Workflow Catalog

The following Workflow Definitions are provisioned out of the box for every new tenant. HR Admins can modify steps, conditions, and actions but cannot delete these defaults.

| Code | Entity Type | Default Steps | Customizable? |
|------|-------------|---------------|---------------|
| `LEAVE_STD` | `leave_request` | Reporting Manager | Yes |
| `LEAVE_LONG` | `leave_request` | Manager → HR Admin | Yes |
| `LEAVE_STATUTORY` | `leave_request` | Manager → HR Admin → HR Head | Yes |
| `LEAVE_EMERGENCY` | `leave_request` | Manager (2hr SLA, auto-approve) | Yes |
| `LEAVE_ENCASHMENT` | `leave_encashment` | Manager → HR Admin | Yes |
| `REIMBURSEMENT_STD` | `reimbursement_claim` | Reporting Manager | Yes |
| `REIMBURSEMENT_HIGH` | `reimbursement_claim` | Manager → Finance | Yes |
| `OVERTIME_STD` | `overtime_record` | Reporting Manager | Yes |
| `OVERTIME_HOLIDAY` | `overtime_record` | Manager → HR Admin | Yes |
| `REGULARIZATION_STD` | `regularization_request` | Reporting Manager | Yes |
| `REGULARIZATION_BACK` | `regularization_request` | Manager → HR Admin | Yes |
| `PAYROLL_ADJ_BONUS` | `payroll_adjustment` | HR Admin → Finance | Yes |
| `PAYROLL_ADJ_RECOVERY` | `payroll_adjustment` | HR Admin | Yes |
| `EMPLOYEE_LOAN` | `employee_loan` | HR Admin → Finance | Yes |
| `TAX_DECLARATION` | `tax_declaration` | Auto-approve (no human step) | Yes |
| `EXIT_INITIATION` | `exit_record` | HR Admin → Manager | Yes |

---

## Engine Design Invariants

These are the correctness guarantees the engine must enforce at all times:

1. **One active instance per record** — `(trigger_entity_type, trigger_entity_id)` with non-terminal status is unique. The engine rejects `initiate()` if one is already active.
2. **Immutable decisions** — Step Instance records in terminal states cannot be modified. The audit trail is permanent.
3. **Context snapshot** — `workflow_context` on the Instance is captured once at initiation and never updated. Conditions always evaluate against this snapshot.
4. **Definition version pinning** — An in-flight Instance always executes the Definition version that was active when it was initiated. Modifying the Definition does not affect in-flight Instances.
5. **Action atomicity** — `update_entity_field` and `update_related_entity` actions execute within the same database transaction as the decision record. If they fail, the decision is rolled back.
6. **Delegation traceability** — Every step handled by a delegate must record `acting_as_delegate_for_id`. No anonymous delegation is permitted.
7. **Finite escalation** — `max_escalation_levels` prevents infinite escalation chains. When the limit is reached, the escalation policy defaults to `alert_only`.
8. **Terminal state finality** — No transitions out of `completed`, `rejected`, `cancelled`, or `expired`. These states are permanent records.

---

*This document is the authoritative business entity definition for the Workflow Engine of Evolve HRMS. All modules that require structured approval or automation must use this engine — no module-specific approval tables are permitted. The engine's contract (`initiate`, `record_decision`, `get_status`, `cancel`) is the only interface through which approval flows may be initiated or advanced.*
