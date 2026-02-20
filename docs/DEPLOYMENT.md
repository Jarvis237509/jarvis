# Mission Control - Deployment & Validation Checklist

## Pre-Deployment Validation

### Environment Prerequisites
- [ ] Node.js >= 18.0.0 installed
- [ ] npm >= 8.0.0 available
- [ ] Git repository access configured
- [ ] GitHub Actions runner permissions verified

### Dependencies
```bash
# Verify all dependencies install cleanly
npm ci

# Expected: Clean install with no audit warnings
```

### Build Verification
- [ ] TypeScript compilation passes
  ```bash
  npm run typecheck
  ```
- [ ] Build completes without errors
  ```bash
  npm run build
  ```

---

## Test Execution Checklist

### Unit Tests (Required)
- [ ] All governance tests pass
  ```bash
  npm test
  ```
- [ ] Coverage threshold met (>80%)
  ```bash
  npm run test:coverage
  ```
- [ ] Linting passes
  ```bash
  npm run lint
  ```

### Integration Tests
- [ ] Mission Control orchestration tests pass
- [ ] Audit trail integrity tests pass
- [ ] Approval workflow tests pass
- [ ] Clearance enforcement tests pass

### Specific Test Scenarios
- [ ] L0 action executes without approval
- [ ] L1 action executes without approval (L1+ clearance)
- [ ] L1 agent cannot execute L2 action
- [ ] L2 action pauses for approval
- [ ] L2 approver can approve/reject
- [ ] Audit trail records all actions
- [ ] Chain verification detects tampering
- [ ] Emergency stop revokes pending approvals
- [ ] Approval timeout triggers auto-reject

---

## Production Deployment Steps

### 1. Pre-Deployment
- [ ] Tag release version in Git
  ```bash
  git tag -a v0.3.0 -m "Governance Slice release"
  git push origin v0.3.0
  ```
- [ ] CI pipeline passes on release tag
- [ ] Staging environment validated
- [ ] Rollback plan documented

### 2. Configuration
- [ ] Governance config reviewed:
  ```typescript
  {
    l2ApprovalTimeoutMs: 300000,      // 5 minutes
    requiredApprovers: 1,              // Adjust per environment
    autoRejectOnTimeout: true,
    auditRetentionDays: 365,           // Adjust per compliance needs
    hashAlgorithm: 'SHA-256',
    enableImmutableAudit: true,
  }
  ```
- [ ] L2 approvers registered with correct identities
- [ ] Emergency override key secured (if configured)

### 3. Deployment
- [ ] Deploy package to registry
  ```bash
  npm publish --access public
  ```
- [ ] Verify package installs correctly
  ```bash
  npm install @missioncontrol/jarvis@latest
  ```
- [ ] Health check endpoint responds

### 4. Post-Deployment Validation
- [ ] Smoke test: L0 action executes
- [ ] Smoke test: L1 action executes
- [ ] Smoke test: L2 action queues for approval
- [ ] Smoke test: Approval workflow completes
- [ ] Smoke test: Audit trail records entry
- [ ] Smoke test: Chain verification passes

---

## Operational Validation

### Monitoring
- [ ] Governance events emitting correctly
- [ ] Approval queue length monitored
- [ ] Audit chain integrity checks scheduled
- [ ] Error alerting configured

### Security
- [ ] L2 approver credentials secured
- [ ] Emergency stop accessible to security team
- [ ] Audit trail backups configured
- [ ] Log retention aligns with auditRetentionDays

### Performance
- [ ] Action execution latency < 100ms (L0/L1)
- [ ] Approval notification latency < 5s
- [ ] Audit export completes within timeout

---

## Rollback Checklist

If deployment issues detected:

1. [ ] Execute rollback to previous version
   ```bash
   npm install @missioncontrol/jarvis@0.2.0
   ```

2. [ ] Verify no active L2 approvals in flight
   ```typescript
   const pending = mc.getPendingApprovals();
   if (pending.length > 0) {
     await mc.emergencyStop('Rollback in progress');
   }
   ```

3. [ ] Export current audit trail before rollback
   ```typescript
   const audit = mc.exportAuditTrail();
   // Save to backup location
   ```

4. [ ] Verify rollback completes without errors
   ```bash
   npm test
   ```

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Release Engineer | _____________ | ______ | _________ |
| Security Review | _____________ | ______ | _________ |
| QA Validation | _____________ | ______ | _________ |
| Operations | _____________ | ______ | _________ |

---

## Notes

- This checklist covers PR #3 (Governance Slice) deployment
- For hotfix deployments, only run relevant test scenarios
- Audit trail export required before any rollback operation
- Emergency stop immediately available if unexpected behavior detected