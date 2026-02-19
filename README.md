# Mission Control - Agent Governance System

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage->80%25-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

Mission Control is a comprehensive governance system for AI agent orchestration, implementing L0/L1/L2 clearance-based action enforcement, immutable audit trails with cryptographic verification, and human-in-the-loop approval workflows for critical operations.

## Features

### 🔐 L0/L1/L2 Clearance Enforcement
- **L0 (Public)**: Read operations, status queries - no restrictions
- **L1 (Standard)**: Configuration changes, service deployment - requires L1+ clearance
- **L2 (Critical)**: Resource destruction, production changes, fund transfers - requires human approval

### 🔗 Immutable Audit Trail
- Cryptographically chained entries with SHA-256 hashing
- Tamper-evident logging with automatic integrity verification
- Exportable JSON format for compliance and analysis

### 👤 Human-in-the-Loop Approval
- Configurable approval workflows for L2 actions
- Multiple approver support with unanimous or threshold-based approval
- Emergency stop capability for security incidents

## Installation

```bash
npm install @missioncontrol/jarvis
```

## Quick Start

```typescript
import { MissionControl, ClearanceLevel, ActionType } from '@missioncontrol/jarvis';

// Initialize Mission Control
const mc = new MissionControl({
  l2ApprovalTimeoutMs: 300000,      // 5 minutes
  requiredApprovers: 1,
  autoRejectOnTimeout: true,
  auditRetentionDays: 365,
  hashAlgorithm: 'SHA-256',
  enableImmutableAudit: true,
});

// Register L2 approvers
mc.registerApprover({
  id: 'approver-1',
  name: 'Security Officer',
  clearanceLevel: ClearanceLevel.L2,
  email: 'security@example.com',
});

// Define agent identity
const agent = {
  id: 'agent-001',
  name: 'Deployment Agent',
  clearanceLevel: ClearanceLevel.L1,
  sessionId: 'session-abc',
};

// Execute L0 action (immediate)
const l0Result = await mc.execute(
  ActionType.READ_PUBLIC,
  agent,
  { resource: 'status' },
  async (payload) => {
    return { status: 'operational' };
  }
);

// Execute L1 action (immediate with logging)
const l1Result = await mc.execute(
  ActionType.DEPLOY_SERVICE,
  agent,
  { service: 'api', version: '1.2.0' },
  async (payload) => {
    // Deploy service...
    return { deployed: true, id: 'svc-123' };
  }
);

// Execute L2 action (requires approval)
const l2Result = await mc.execute(
  ActionType.DESTROY_RESOURCE,
  agent,  // L1 agent can't execute directly
  { resourceId: 'r-123', force: true },
  async (payload) => {
    // This won't execute until approved
    return { destroyed: true };
  }
);

if ('approvalPending' in l2Result) {
  console.log(`Waiting for approval: ${l2Result.approvalId}`);
  // Human approver calls: mc.approveAction(l2Result.approvalId, 'approver-1')
}
```

## Action Types

### L0 Actions (Public)
- `READ_PUBLIC` - Read public data
- `QUERY_STATUS` - Query system status
- `LIST_RESOURCES` - List available resources

### L1 Actions (Standard)
- `MODIFY_CONFIG` - Modify configuration
- `DEPLOY_SERVICE` - Deploy services
- `MANAGE_SECRETS` - Manage secrets (with L1)
- `EXECUTE_COMMAND` - Execute standard commands

### L2 Actions (Critical - Requires Approval)
- `DESTROY_RESOURCE` - Destroy/delete resources
- `MODIFY_PRODUCTION` - Modify production systems
- `TRANSFER_FUNDS` - Transfer funds
- `DELETE_AUDIT_LOG` - Delete audit entries
- `ESCALATE_PRIVILEGES` - Escalate privileges
- `EXECUTE_ARBITRARY` - Execute arbitrary code

## Clearance Hierarchy

```
L2 (Critical)
  └─ Can execute: L2, L1, L0
  └─ Requires human approval for L2

L1 (Standard)
  └─ Can execute: L1, L0
  └─ Cannot execute L2

L0 (Public)
  └─ Can execute: L0 only
  └─ Cannot execute L1, L2
```

## Approval Workflow

### Single Approver
```typescript
const workflow = new ApprovalWorkflow(config, {
  minApprovers: 1,
  requireUnanimous: false,
});
```

### Multiple Approvers (Threshold)
```typescript
const workflow = new ApprovalWorkflow(config, {
  minApprovers: 2,
  requireUnanimous: false,
});
```

### Unanimous Approval
```typescript
const workflow = new ApprovalWorkflow(config, {
  minApprovers: 3,
  requireUnanimous: true,
});
```

## Audit Trail

### Verify Integrity
```typescript
const isValid = mc.verifyAuditIntegrity();
console.log(`Audit chain valid: ${isValid}`);
```

### Export for Compliance
```typescript
const auditJSON = mc.exportAuditTrail();
// Save to file or send to compliance system
```

### Query Entries
```typescript
const auditTrail = mc.getAuditTrail();

// By action type
const destroyActions = auditTrail.getEntriesByActionType(ActionType.DESTROY_RESOURCE);

// By agent
const agentActions = auditTrail.getEntriesByAgent('agent-001');

// By time range
const recentActions = auditTrail.getEntriesByTimeRange(
  new Date(Date.now() - 24 * 60 * 60 * 1000),
  new Date()
);
```

## Event Monitoring

```typescript
mc.onEvent(GovernanceEventType.ACTION_EXECUTED, (event) => {
  console.log(`Action executed: ${event.payload.actionId}`);
});

mc.onEvent(GovernanceEventType.CLEARANCE_VIOLATION, (event) => {
  // Alert security team
  alertSecurity(event);
});

mc.onEvent(GovernanceEventType.AUDIT_TAMPER_DETECTED, (event) => {
  // Critical: Audit chain compromised
  emergencyShutdown();
});
```

## Emergency Stop

```typescript
// In case of security incident
await mc.emergencyStop('Security breach detected - all pending approvals revoked');
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `l2ApprovalTimeoutMs` | number | 300000 | Timeout for L2 approval (ms) |
| `requiredApprovers` | number | 1 | Default required approvers |
| `autoRejectOnTimeout` | boolean | true | Auto-reject expired approvals |
| `auditRetentionDays` | number | 365 | Audit retention period |
| `hashAlgorithm` | string | 'SHA-256' | Hash algorithm for chain |
| `enableImmutableAudit` | boolean | true | Enable audit immutability |

## API Reference

### MissionControl
- `execute(actionType, agent, payload, executor)` - Execute action with governance
- `approveAction(approvalId, approverId)` - Approve pending L2 action
- `rejectAction(approvalId, approverId, reason)` - Reject pending action
- `registerApprover(approver)` - Register L2 approver
- `getPendingApprovals()` - Get all pending approvals
- `verifyAuditIntegrity()` - Verify audit chain
- `exportAuditTrail()` - Export audit as JSON
- `emergencyStop(reason)` - Revoke all pending approvals

### AuditTrail
- `record(request, result, agent, approval?)` - Record audit entry
- `verifyChain()` - Verify chain integrity
- `getEntry(id)` - Get entry by ID
- `getAllEntries()` - Get all entries
- `getEntriesByActionType(type)` - Filter by action type
- `getEntriesByAgent(agentId)` - Filter by agent
- `getEntriesByTimeRange(start, end)` - Filter by time

### ApprovalWorkflow
- `submitForApproval(action, requester)` - Submit for approval
- `approve(approvalId, approverId)` - Approve request
- `reject(approvalId, approverId, reason)` - Reject request
- `revoke(approvalId, by, reason)` - Revoke approved request
- `registerApprover(approver)` - Register approver

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Architecture

```
┌─────────────────┐
│  MissionControl │
│   (Orchestrator)│
└────────┬────────┘
         │
    ┌────┴────┬─────────────┐
    ▼         ▼             ▼
┌────────┐ ┌──────────┐ ┌───────────┐
│Enforce-│ │  Audit   │ │ Approval  │
│  ment  │ │  Trail   │ │  Workflow │
│ Engine │ │(Immutable│ │ (Human-in-│
│(L0/L1/ │ │  Chain)  │ │ the-loop) │
│  L2)   │ │          │ │           │
└────────┘ └──────────┘ └───────────┘
```

## License

MIT © Mission Control Team