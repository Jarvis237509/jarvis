# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-02-19

### Added - Mission Control PR #3: Governance Slice

- **L0/L1/L2 Enforcement Hooks**
  - Clearance-based action enforcement system
  - Pre-execution validation with payload sanitization
  - Post-execution logging and cleanup
  - Idempotency checks to prevent duplicate execution

- **L2 Approval Workflow**
  - Human-in-the-loop approval system for critical actions
  - Configurable approval thresholds (single, multiple, unanimous)
  - Approval timeout with automatic rejection
  - Emergency stop capability for security incidents
  - Evidence hash generation for audit trail

- **Immutable Audit Trail**
  - Cryptographically chained audit entries using SHA-256
  - Tamper-evident logging with automatic integrity verification
  - Chain verification with tamper detection events
  - Exportable JSON format for compliance
  - Query by action type, agent, or time range

- **Mission Control Orchestrator**
  - Central coordination of governance components
  - Event-driven architecture with governance event types
  - Error handling with audit context preservation
  - Active execution context tracking

- **Comprehensive Test Suite**
  - Unit tests for all governance components
  - Integration tests for Mission Control orchestration
  - Coverage thresholds (80%+) enforced in CI
  - Test coverage for clearance violations, approval flows, and audit integrity

- **CI/CD Pipeline**
  - GitHub Actions workflow for testing on Node 18.x and 20.x
  - TypeScript type checking
  - ESLint code quality checks
  - Coverage reporting via Codecov

### Governance Model

| Level | Actions | Approval Required |
|-------|---------|-------------------|
| L0 | READ_PUBLIC, QUERY_STATUS, LIST_RESOURCES | No |
| L1 | MODIFY_CONFIG, DEPLOY_SERVICE, EXECUTE_COMMAND | No (L1+ clearance) |
| L2 | DESTROY_RESOURCE, MODIFY_PRODUCTION, TRANSFER_FUNDS | Yes (human approval) |

[0.3.0]: https://github.com/Jarvis237509/jarvis/releases/tag/v0.3.0