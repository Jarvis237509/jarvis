# Mission Control - API Reference

Complete API reference for Mission Control v0.3.0 (PR #3: Governance Slice)

---

## Core Classes

### MissionControl

The main orchestrator coordinating enforcement, audit trail, and approval workflows.

#### Constructor

```typescript
new MissionControl(config?: Partial<GovernanceConfig>)
```

**Parameters:**
- `config` - Partial governance configuration (see below)

**Default Config:**
```typescript
{
  l2ApprovalTimeoutMs: 300000,  // 5 minutes
  requiredApprovers: 1,
  autoRejectOnTimeout: true,
  auditRetentionDays: 365,
  hashAlgorithm: 'SHA-256',
  enableImmutableAudit: true,
}
```

#### Methods

##### execute()

Execute an action with full governance enforcement.

```typescript
async execute<T>(
  actionType: ActionType,
  agentIdentity: AgentIdentity,
  payload: unknown,
  executor: (payload: unknown) => Promise<T>
): Promise<
  | { result: T; auditEntry: AuditEntry }
  | { approvalPending: true; approvalId: string }
>
```

**Parameters:**
- `actionType` - Type of action to execute (L0/L1/L2)
- `agentIdentity` - Identity of the requesting agent
- `payload` - Data for the action
- `executor` - Function that performs the action

**Returns:**
- Immediate result with audit entry (L0/L1)
- Pending approval reference (L2)

**Example:**
```typescript
const result = await mc.execute(
  ActionType.DEPLOY_SERVICE,
  agent,
  { service: 'api', version: '1.2.0' },
  async (payload) => {
    // Deploy logic here
    return { deployed: true };
  }
);
```

##### approveAction()

Approve a pending L2 action.

```typescript
async approveAction(
  approvalId: string,
  approverId: string,
  signature?: string,
  reason?: string
): Promise<ApprovalRequest>
```

##### rejectAction()

Reject a pending L2 action.

```typescript
async rejectAction(
  approvalId: string,
  approverId: string,
  rejectionReason: string,
  signature?: string
): Promise<ApprovalRequest>
```

##### getPendingApprovals()

Get all pending approval requests.

```typescript
getPendingApprovals(): ApprovalRequest[]
```

##### verifyAuditIntegrity()

Verify the cryptographic integrity of the audit trail.

```typescript
verifyAuditIntegrity(): boolean
```

**Returns:** `true` if chain is valid, `false` if tampering detected

##### exportAuditTrail()

Export the full audit trail as JSON.

```typescript
exportAuditTrail(): string
```

##### onEvent()

Register a handler for governance events.

```typescript
onEvent(
  type: GovernanceEventType,
  handler: (event: GovernanceEvent) => void
): () => void
```

**Returns:** Unsubscribe function

##### emergencyStop()

Immediately revoke all pending approvals.

```typescript
async emergencyStop(reason: string): Promise<void>
```

---

### AuditTrail

Cryptographically-chained immutable audit logging.

#### Methods

##### record()

Record an action execution to the audit trail.

```typescript
async record(
  actionRequest: ActionRequest,
  actionResult: ActionResult,
  agentIdentity: AgentIdentity,
  approvalRequest?: ApprovalRequest
): Promise<AuditEntry>
```

##### verifyChain()

Verify the cryptographic chain integrity.

```typescript
verifyChain(): boolean
```

##### getEntry()

Retrieve a specific audit entry by ID.

```typescript
getEntry(id: string): AuditEntry | undefined
```

##### getAllEntries()

Get all audit entries (immutable copy).

```typescript
getAllEntries(): ReadonlyArray<AuditEntry>
```

##### getEntriesByActionType()

Filter entries by action type.

```typescript
getEntriesByActionType(actionType: string): ReadonlyArray<AuditEntry>
```

##### getEntriesByAgent()

Filter entries by agent ID.

```typescript
getEntriesByAgent(agentId: string): ReadonlyArray<AuditEntry>
```

##### getEntriesByTimeRange()

Filter entries by time range.

```typescript
getEntriesByTimeRange(
  start: Date,
  end: Date
): ReadonlyArray<AuditEntry>
```

##### exportToJSON()

Export audit trail with chain status.

```typescript
exportToJSON(): string
```

---

### ApprovalWorkflow

Human-in-the-loop approval system for L2 actions.

#### Constructor

```typescript
new ApprovalWorkflow(
  config: GovernanceConfig,
  workflowConfig?: Partial<ApprovalWorkflowConfig>
)
```

**Workflow Defaults:**
```typescript
{
  minApprovers: 1,
  maxApprovers: 3,
  requireUnanimous: false,
  escalationTimeoutMs: 300000,
  notifyChannels: ['email', 'slack'],
  requireMFA: true,
}
```

#### Methods

##### registerApprover()

Register an L2-approved approver.

```typescript
registerApprover(approver: ApproverIdentity): void
```

**Note:** Approver must have `ClearanceLevel.L2`

##### unregisterApprover()

Remove an approver from the registry.

```typescript
unregisterApprover(approverId: string): void
```

##### submitForApproval()

Submit an action for L2 approval.

```typescript
async submitForApproval(
  actionRequest: ActionRequest,
  requester: AgentIdentity
): Promise<ApprovalRequest>
```

##### approve()

Submit an approval decision.

```typescript
async approve(
  approvalId: string,
  approverId: string,
  signature?: string,
  reason?: string
): Promise<ApprovalRequest>
```

##### reject()

Reject a pending approval.

```typescript
async reject(
  approvalId: string,
  approverId: string,
  rejectionReason: string,
  signature?: string
): Promise<ApprovalRequest>
```

##### revoke()

Revoke a previously approved request (emergency use).

```typescript
async revoke(
  approvalId: string,
  revokedBy: string,
  reason: string
): Promise<ApprovalRequest>
```

## Types

### Enums

#### ClearanceLevel

```typescript
enum ClearanceLevel {
  L0 = 'L0',  // Public
  L1 = 'L1',  // Standard
  L2 = 'L2',  // Critical
}
```

#### ActionType

```typescript
enum ActionType {
  // L0 - No approval needed
  READ_PUBLIC = 'READ_PUBLIC',
  QUERY_STATUS = 'QUERY_STATUS',
  LIST_RESOURCES = 'LIST_RESOURCES',

  // L1 - Requires L1+ clearance
  MODIFY_CONFIG = 'MODIFY_CONFIG',
  DEPLOY_SERVICE = 'DEPLOY_SERVICE',
  MANAGE_SECRETS = 'MANAGE_SECRETS',
  EXECUTE_COMMAND = 'EXECUTE_COMMAND',

  // L2 - Requires human approval
  DESTROY_RESOURCE = 'DESTROY_RESOURCE',
  MODIFY_PRODUCTION = 'MODIFY_PRODUCTION',
  TRANSFER_FUNDS = 'TRANSFER_FUNDS',
  DELETE_AUDIT_LOG = 'DELETE_AUDIT_LOG',
  ESCALATE_PRIVILEGES = 'ESCALATE_PRIVILEGES',
  EXECUTE_ARBITRARY = 'EXECUTE_ARBITRARY',
}
```

#### ApprovalStatus

```typescript
enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}
```

#### GovernanceEventType

```typescript
enum GovernanceEventType {
  ACTION_REQUESTED = 'ACTION_REQUESTED',
  ACTION_APPROVED = 'ACTION_APPROVED',
  ACTION_REJECTED = 'ACTION_REJECTED',
  ACTION_EXECUTED = 'ACTION_EXECUTED',
  ACTION_FAILED = 'ACTION_FAILED',
  CLEARANCE_VIOLATION = 'CLEARANCE_VIOLATION',
  APPROVAL_TIMEOUT = 'APPROVAL_TIMEOUT',
  AUDIT_TAMPER_DETECTED = 'AUDIT_TAMPER_DETECTED',
}
```

### Interfaces

#### AgentIdentity

```typescript
interface AgentIdentity {
  id: string;
  name: string;
  clearanceLevel: ClearanceLevel;
  sessionId: string;
  publicKey?: string;
}
```

#### ApproverIdentity

```typescript
interface ApproverIdentity {
  id: string;
  name: string;
  clearanceLevel: ClearanceLevel;
  email?: string;
  publicKey?: string;
}
```

#### ActionRequest

```typescript
interface ActionRequest {
  id: string;
  actionType: ActionType;
  agentId: string;
  timestamp: Date;
  payload: unknown;
  signature?: string;
  correlationId?: string;
}
```

#### ActionResult

```typescript
interface ActionResult {
  success: boolean;
  requestId: string;
  timestamp: Date;
  output?: unknown;
  error?: string;
  executedBy?: string;
}
```

#### ApprovalRequest

```typescript
interface ApprovalRequest {
  id: string;
  actionRequestId: string;
  status: ApprovalStatus;
  requestedBy: AgentIdentity;
  requestedAt: Date;
  approvers: string[];
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  expiresAt: Date;
  evidenceHash: string;
}
```

#### AuditEntry

```typescript
interface AuditEntry {
  id: string;
  timestamp: Date;
  sequenceNumber: number;
  actionRequest: ActionRequest;
  actionResult: ActionResult;
  approvalRequest?: ApprovalRequest;
  agentIdentity: AgentIdentity;
  previousHash: string;
  entryHash: string;
  immutableProof: string;
}
```

#### GovernanceConfig

```typescript
interface GovernanceConfig {
  l2ApprovalTimeoutMs: number;
  requiredApprovers: number;
  autoRejectOnTimeout: boolean;
  auditRetentionDays: number;
  hashAlgorithm: 'SHA-256' | 'SHA-384' | 'SHA-512';
  enableImmutableAudit: boolean;
  emergencyOverrideKey?: string;
}
```

## Error Handling

### MissionControlError

```typescript
class MissionControlError extends Error {
  readonly code: string;
  readonly auditEntry?: AuditEntry;

  constructor(message: string, code: string, auditEntry?: AuditEntry);
}
```

**Error Codes:**
- `ENFORCEMENT_REJECTED` - Action blocked by governance rules
- `EXECUTION_FAILED` - Action execution threw an error
- `APPROVAL_NOT_FOUND` - Approval ID doesn't exist
- `APPROVAL_ALREADY_DECIDED` - Action already approved/rejected
- `APPROVER_UNAUTHORIZED` - Approver not registered for this action
- `APPROVER_ALREADY_DECIDED` - Approver already submitted decision
- `CLEARANCE_VIOLATION` - Agent lacks required clearance

---

## Related Documentation

- [Operator Guide](./OPERATORS.md) - Human-readable operations reference
- [Deployment Guide](./DEPLOYMENT.md) - Deployment and validation
- [Main README](../README.md) - Getting started guide