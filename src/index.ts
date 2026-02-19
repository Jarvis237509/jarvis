/**
 * Mission Control - Agent Governance System
 * 
 * L0/L1/L2 Clearance-based action enforcement
 * Immutable audit trail with cryptographic verification
 * Human-in-the-loop L2 approval workflow
 * 
 * @module @missioncontrol/jarvis
 */

// Types
export {
  ClearanceLevel,
  ActionType,
  ApprovalStatus,
  GovernanceEventType,
  ACTION_CLEARANCE_MAP,
  type ActionRequest,
  type ActionResult,
  type AgentIdentity,
  type ApprovalRequest,
  type AuditEntry,
  type GovernanceConfig,
  type GovernanceEvent,
} from './types/governance';

// Core
export {
  MissionControl,
  MissionControlError,
  DEFAULT_GOVERNANCE_CONFIG,
  type ExecutionContext,
} from './core/MissionControl';

// Audit
export { AuditTrail } from './audit/AuditTrail';

// Governance
export {
  EnforcementEngine,
  type EnforcementResult,
  type PreExecutionResult,
  type PostExecutionResult,
} from './governance/EnforcementHooks';

export {
  ApprovalWorkflow,
  type ApproverIdentity,
  type ApprovalDecision,
  type ApprovalWorkflowConfig,
} from './governance/ApprovalWorkflow';