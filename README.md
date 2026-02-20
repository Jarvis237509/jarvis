# Mission Control — Agent Governance System

[![Version](https://img.shields.io/badge/version-0.3.0-blue)]()
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-%3E80%25-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

> **Current Release: v0.3.0 (Governance Slice)** — PR #3 merged and production-ready

Mission Control is a comprehensive governance system for AI agent orchestration, implementing:

- 🔐 **L0/L1/L2 Clearance Enforcement** — Risk-graded action authorization
- 🔗 **Immutable Audit Trail** — Cryptographically-verified chain logging  
- 👤 **Human-in-the-Loop Approval** — L2 action authorization workflows

---

## Quick Install

```bash
npm install @missioncontrol/jarvis
```

Requires Node.js >= 18.0.0

---

## Clearance Levels at a Glance

| Level | Name | Operations | Requires Approval |
|-------|------|------------|-------------------|
| L0 | 🔓 Public | Read, query, list | No |
| L1 | 🔑 Standard | Config, deploy, secrets | Agent L1+ clearance |
| L2 | 🔒 Critical | Destroy, production, funds | Human authorization |

---

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
  id: 'security-lead',
  name: 'Security Officer',
  clearanceLevel: ClearanceLevel.L2,
  email: 'security@example.com',
});

// Define agent
const agent = {
  id: 'deploy-bot',
  name: 'Deployment Agent',
  clearanceLevel: ClearanceLevel.L1,
  sessionId: 'sess-abc',
};

// L0 action — executes immediately
const l0Result = await mc.execute(
  ActionType.QUERY_STATUS,
  agent,
  { resource: 'api' },
  async () => ({ status: 'operational' })
);

// L1 action — executes immediately (L1+ clearance verified)
const l1Result = await mc.execute(
  ActionType.DEPLOY_SERVICE,
  agent,
  { service: 'api', version: '1.2.0' },
  async (payload) => {
    // Deploy logic here
    return { deployed: true, id: 'svc-123' };
  }
);

// L2 action — pauses for human approval
const l2Result = await mc.execute(
  ActionType.DESTROY_RESOURCE,
  agent,
  { resourceId: 'r-123', force: true },
  async () => ({ destroyed: true })
);

if ('approvalPending' in l2Result) {
  console.log(`⏳ Awaiting authorization: ${l2Result.approvalId}`);
  // Human operator calls: mc.approveAction(l2Result.approvalId, 'approver-id')
}
```

---

## Action Reference

### L0 — Public Access (🔓)
| Action | Description |
|--------|-------------|
| `READ_PUBLIC` | Read public data |
| `QUERY_STATUS` | Query system status |
| `LIST_RESOURCES` | List available resources |

### L1 — Standard Operations (🔑)
| Action | Description |
|--------|-------------|
| `MODIFY_CONFIG` | Modify configurations |
| `DEPLOY_SERVICE` | Deploy services |
| `MANAGE_SECRETS` | Manage secrets |
| `EXECUTE_COMMAND` | Execute standard commands |

### L2 — Critical Actions (🔒)
| Action | Description |
|--------|-------------|
| `DESTROY_RESOURCE` | Destroy/delete resources |
| `MODIFY_PRODUCTION` | Modify production systems |
| `TRANSFER_FUNDS` | Transfer funds |
| `DELETE_AUDIT_LOG` | Delete audit entries |
| `ESCALATE_PRIVILEGES` | Escalate privileges |
| `EXECUTE_ARBITRARY` | Execute arbitrary code |

---

## Clearance Hierarchy

```
L2 (Critical) 🔒
  ├─ Can execute: L2, L1, L0
  ├─ Can approve L2 requests
  └─ Requires human authorization for L2 actions

L1 (Standard) 🔑
  ├─ Can execute: L1, L0
  └─ Cannot execute L2

L0 (Public) 🔓
  └─ Can execute: L0 only
```

---

## Approval Status Guide

| Status | Display | Operator Action |
|--------|---------|-----------------|
| `PENDING` | ⏳ **Awaiting Approval** | Review request in queue |
| `APPROVED` | ✅ **Authorized** | Action will execute immediately |
| `REJECTED` | ❌ **Denied** | Action blocked, review rejection reason |
| `EXPIRED` | ⏰ **Timed Out** | Approval window closed, resubmit if needed |
| `REVOKED` | 🚫 **Revoked** | Previously approved action was emergency-cancelled |

---

## Approval Workflows

### Single Authorization (Default)
```typescript
minApprovers: 1
requireUnanimous: false
```
**For:** Standard deployments, routine maintenance

### Dual Authorization
```typescript
minApprovers: 2
requireUnanimous: false
```
**For:** Production changes, sensitive operations

### Unanimous Consent
```typescript
minApprovers: 3
requireUnanimous: true
```
**For:** Destructive operations, policy changes

---

## Approval Actions

### Check Pending Authorizations
```typescript
const pending = mc.getPendingApprovals();
console.log(`${pending.length} actions awaiting approval`);
// Status: PENDING (⏳)
```

### Approve with Documentation
```typescript
const approval = await mc.approveAction(
  'approval-id',
  'security-lead',
  signature,
  'Approved per change request #1234'
);
console.log(`Status: ${approval.status}`); // APPROVED (✅)
```

### Reject with Reasoning
```typescript
await mc.rejectAction(
  'approval-id',
  'security-lead',
  'Rejected: Database migration conflicts with backup window'
);
// Status: REJECTED (❌)
```

### Emergency Stop (All Pending Canceled)
```typescript
await mc.emergencyStop('Security incident - all pending actions suspended');
// All pending approvals → REVOKED (🚫)
```

---

## Audit Trail

### Verify Chain Integrity
```typescript
const isValid = mc.verifyAuditIntegrity();
if (!isValid) {
  console.error('🚨 CRITICAL: Audit tampering detected');
}
```

### Export for Compliance
```typescript
const auditJSON = mc.exportAuditTrail();
// Exports: genesisHash, entryCount, chainValid, entries[]
```

### Query Activity
```typescript
const audit = mc.getAuditTrail();

// By action type
const destroys = audit.getEntriesByActionType(ActionType.DESTROY_RESOURCE);

// By agent
const agentActions = audit.getEntriesByAgent('deploy-bot');

// By time range
const recent = audit.getEntriesByTimeRange(
  new Date(Date.now() - 24 * 60 * 60 * 1000),
  new Date()
);
```

---

## Event Monitoring

```typescript
mc.onEvent(GovernanceEventType.ACTION_EXECUTED, (event) => {
  console.log(`✅ ${event.payload.actionId} completed`);
});

mc.onEvent(GovernanceEventType.ACTION_APPROVED, (event) => {
  console.log(`✅ ${event.payload.approvalId} authorized`);
});

mc.onEvent(GovernanceEventType.CLEARANCE_VIOLATION, (event) => {
  // Alert security team
});

mc.onEvent(GovernanceEventType.AUDIT_TAMPER_DETECTED, (event) => {
  // 🚨 Immediate escalation required
  emergencyShutdown();
});
```

**Severity Levels:**
- `info` ℹ️ — Routine operations (no paging)
- `warning` ⚠️ — Approval timeouts, recoverable failures (business hours)
- `critical` 🚨 — Audit tampering, security violations (immediately)

---

## Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `l2ApprovalTimeoutMs` | number | `300000` | Approval window (ms) |
| `requiredApprovers` | number | `1` | Default approvers required |
| `autoRejectOnTimeout` | boolean | `true` | Auto-cancel expired requests |
| `auditRetentionDays` | number | `365` | Audit retention period |
| `hashAlgorithm` | string | `'SHA-256'` | Chain hashing algorithm |
| `enableImmutableAudit` | boolean | `true` | Enable chain verification |

---

## Test & Build

```bash
# Run all tests
npm test

# Coverage report
npm run test:coverage

# Type check
npm run typecheck

# Lint
npm run lint
```

---

## Release v0.3.0: Governance Slice (PR #3)

### What's New
- ✅ L0/L1/L2 clearance enforcement hooks
- ✅ L2 human-in-the-loop approval system
- ✅ Immutable SHA-256 audit trail
- ✅ Mission Control orchestrator
- ✅ Comprehensive test suite (>80% coverage)
- ✅ CI/CD pipeline via GitHub Actions

### Status
- **Merged:** 2026-02-19
- **Stability:** Production-ready
- **Breaking Changes:** None (additive only)

### Known Limitations
- Notifications logged to console (email/Slack integration pending)
- MFA for approvers requires external integration
- Escalation timeout fixed at 5 minutes

---

## Documentation

- [Operator Guide](./docs/OPERATORS.md) — Human-readable operations reference
- [API Reference](./docs/API.md) — Complete API documentation
- [Deployment Checklist](./docs/DEPLOYMENT.md) — Production deployment guide
- [Changelog](./CHANGELOG.md) — Version history

---

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
│L0/L1/  │ │  Audit   │ │ Approval  │
│  L2    │ │  Trail   │ │ Workflow │
│Enforce-│ │(Immutable│ │ (Human-in-│
│  ment  │ │  Chain)  │ │ the-loop) │
│ Engine │ │          │ │           │
└────────┘ └──────────┘ └───────────┘
```

---

## License

MIT © Mission Control Team