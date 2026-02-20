# Mission Control - Operator Documentation

## Overview

Mission Control provides L0/L1/L2 governance for AI agent operations with human-in-the-loop approval workflows and cryptographically-verified audit trails.

**Current Release:** v0.3.0 (Governance Slice - PR #3)
**Status:** ✅ Merged & Production Ready

---

## Quick Status Reference

| Component | Status | Version |
|-----------|--------|---------|
| L0/L1/L2 Enforcement | ✅ Stable | 0.3.0 |
| Approval Workflow | ✅ Stable | 0.3.0 |
| Immutable Audit Trail | ✅ Stable | 0.3.0 |
| Mission Control Core | ✅ Stable | 0.3.0 |
| Test Coverage | ✅ >80% | 0.3.0 |
| CI/CD Pipeline | ✅ Active | 0.3.0 |

---

## Operator Language Guide

### Clearance Levels

| Level | Name | Icon | Description |
|-------|------|------|-------------|
| L0 | **Public** | 🔓 | Read-only operations, no restrictions |
| L1 | **Standard** | 🔑 | Config changes, service deployment - requires L1+ clearance |
| L2 | **Critical** | 🔒 | Resource destruction, production changes - requires human approval |

### Action Status States

| State | Display | Meaning for Operators |
|-------|---------|----------------------|
| `PENDING` | ⏳ **Awaiting Approval** | Action is in queue, waiting for L2 authorization |
| `APPROVED` | ✅ **Authorized** | Approved by authorized operator, ready to execute |
| `REJECTED` | ❌ **Denied** | Rejected by operator - review required |
| `EXPIRED` | ⏰ **Timed Out** | Approval window closed, action cancelled |
| `REVOKED` | 🚫 **Revoked** | Previously approved action was emergency-cancelled |

### Approval Workflow Summary

```
Agent Request → Clearance Check → [L2?] → Approval Queue → Human Review → Execute
                             ↓
                         [L0/L1] → Immediate Execution → Audit
```

---

## Approval Threshold Patterns

### Single Approver (Default)
```typescript
minApprovers: 1
requireUnanimous: false
```
**Use for:** Standard deployments, routine maintenance

### Dual Authorization
```typescript
minApprovers: 2
requireUnanimous: false
```
**Use for:** Production changes, sensitive config modifications

### Unanimous Consent
```typescript
minApprovers: 3
requireUnanimous: true
```
**Use for:** Destructive operations, security policy changes

---

## Event Severity Guide

| Severity | Icon | When to Page |
|----------|------|--------------|
| `info` | ℹ️ | Never - routine operations |
| `warning` | ⚠️ | During business hours - approval timeouts, recoverable failures |
| `critical` | 🚨 | Immediately - audit tampering detected, unauthorized access attempts |

---

## Common Operator Actions

### Check Pending Approvals
```typescript
const pending = mc.getPendingApprovals();
console.log(`${pending.length} actions awaiting approval`);
```

### Approve a Critical Action
```typescript
const result = await mc.approveAction(
  'approval-id-here',
  'approver-id',
  signature,      // Optional cryptographic signature
  'Approved per change request #1234'  // Reason for audit trail
);
console.log(`Status: ${result.status}`); // APPROVED
```

### Reject with Documentation
```typescript
await mc.rejectAction(
  'approval-id-here',
  'approver-id',
  'Rejected: Database migration conflicts with scheduled backup window',
  signature
);
```

### Emergency Stop
```typescript
await mc.emergencyStop('Security incident #INC-2025-001 - all approvals suspended');
// All pending PENDING approvals move to REVOKED
```

---

## Audit Trail Operations

### Verify Chain Integrity
```typescript
const isValid = mc.verifyAuditIntegrity();
if (!isValid) {
  // Immediate escalation required
  console.error('AUDIT TAMPERING DETECTED');
}
```

### Export for Compliance
```typescript
const auditJSON = mc.exportAuditTrail();
// Saves to file: audit-YYYY-MM-DD.json
```

### Query Recent Activity
```typescript
const recent = mc.getAuditTrail()
  .getEntriesByTimeRange(
    new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
    new Date()
  );
```

---

## PR #3: Governance Slice Summary

### What Changed
- **Added** L0/L1/L2 clearance enforcement hooks
- **Added** L2 approval workflow with human-in-the-loop
- **Added** Immutable audit trail with SHA-256 cryptographic chain
- **Added** Mission Control orchestrator
- **Added** Comprehensive test suite (80%+ coverage)
- **Added** CI/CD pipeline via GitHub Actions

### Migration Notes
No breaking changes from v0.2.x. All new features are additive.

### Known Limitations
- Approval notifications currently logged to console (email/Slack integration pending)
- MFA for approvers requires external integration
- Escalation timeouts fixed at 5 minutes (configurable in next release)

---

## Links

- [Main README](../README.md)
- [Deployment Checklist](./DEPLOYMENT.md)
- [API Reference](./API.md)
- [Changelog](../CHANGELOG.md)