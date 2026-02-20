# Mission Control Documentation

**Version:** v0.3.0 (Governance Slice — PR #3)  
**Last Updated:** 2026-02-20

---

## Quick Navigation

| Document | Purpose | Audience |
|----------|---------|----------|
| [README](../README.md) | Getting started, quick start | Developers |
| [API Reference](./API.md) | Complete API documentation | Developers |
| [Operator Guide](./OPERATORS.md) | Human-readable operations | Operators, DevOps |
| [Deployment Guide](./DEPLOYMENT.md) | Production deployment | DevOps, Release Engineers |
| [Changelog](../CHANGELOG.md) | Version history | All |

---

## Document Purposes

### 📘 API Reference (`API.md`)
Complete TypeScript API documentation:
- Class methods and parameters
- TypeScript interfaces and enums
- Error codes and handling
- Configuration options

### 👷 Operator Guide (`OPERATORS.md`)
Day-to-day operations documentation:
- Status state meanings with visual indicators
- Clearance level explanations
- Approval threshold patterns
- Common operator actions
- Event severity guide

### 🚀 Deployment Guide (`DEPLOYMENT.md`)
Production deployment procedures:
- Pre-deployment validation
- Test execution checklist
- Deployment steps
- Operational validation
- Rollback procedures

---

## PR #3 Summary

**PR #3: Governance Slice** adds the following to Mission Control v0.3.0:

### Added
- L0/L1/L2 clearance enforcement hooks
- L2 approval workflow with human-in-the-loop
- Immutable audit trail with SHA-256 cryptographic chain
- Mission Control orchestrator
- Comprehensive test suite (80%+ coverage)
- CI/CD pipeline via GitHub Actions

### Documentation Status
All PR #3 features are documented across these files:
- ✅ README updated with current status
- ✅ Operator Guide with polished language
- ✅ API Reference with TypeScript definitions
- ✅ Deployment Checklist for validation

---

## Icon Reference

| Icon | Meaning |
|------|---------|
| 🔓 | L0 Public access |
| 🔑 | L1 Standard clearance |
| 🔒 | L2 Critical clearance |
| ⏳ | Awaiting approval (PENDING) |
| ✅ | Authorized (APPROVED) |
| ❌ | Denied (REJECTED) |
| ⏰ | Timed out (EXPIRED) |
| 🚫 | Revoked (REVOKED) |
| ℹ️ | Info severity |
| ⚠️ | Warning severity |
| 🚨 | Critical severity |

---

## Contributing to Documentation

When updating documentation:
1. Keep status indicators consistent
2. Align with actual PR/feature status
3. Include operator-friendly language
4. Add visual aids where helpful
5. Update this index when adding new documents