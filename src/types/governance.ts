/**
 * Mission Control Governance Types
 * Defines the L0/L1/L2 clearance system and related types
 */

/** Clearance Levels */
export enum ClearanceLevel {
  L0 = 'L0', // Public/Unrestricted
  L1 = 'L1', // Standard/Restricted
  L2 = 'L2', // Critical/Elevated
}

/** Action Types by Risk Category */
export enum ActionType {
  // L0 Actions - Public, no approval needed
  READ_PUBLIC = 'READ_PUBLIC',
  QUERY_STATUS = 'QUERY_STATUS',
  LIST_RESOURCES = 'LIST_RESOURCES',

  // L1 Actions - Standard, agent-scoped approval
  MODIFY_CONFIG = 'MODIFY_CONFIG',
  DEPLOY_SERVICE = 'DEPLOY_SERVICE',
  MANAGE_SECRETS = 'MANAGE_SECRETS',
  EXECUTE_COMMAND = 'EXECUTE_COMMAND',

  // L2 Actions - Critical, human approval required
  DESTROY_RESOURCE = 'DESTROY_RESOURCE',
  MODIFY_PRODUCTION = 'MODIFY_PRODUCTION',
  TRANSFER_FUNDS = 'TRANSFER_FUNDS',
  DELETE_AUDIT_LOG = 'DELETE_AUDIT_LOG',
  ESCALATE_PRIVILEGES = 'ESCALATE_PRIVILEGES',
  EXECUTE_ARBITRARY = 'EXECUTE_ARBITRARY',
}

/** Action Classification Map */
export const ACTION_CLEARANCE_MAP: Record<ActionType, ClearanceLevel> = {
  [ActionType.READ_PUBLIC]: ClearanceLevel.L0,
  [ActionType.QUERY_STATUS]: ClearanceLevel.L0,
  [ActionType.LIST_RESOURCES]: ClearanceLevel.L0,
  [ActionType.MODIFY_CONFIG]: ClearanceLevel.L1,
  [ActionType.DEPLOY_SERVICE]: ClearanceLevel.L1,
  [ActionType.MANAGE_SECRETS]: ClearanceLevel.L1,
  [ActionType.EXECUTE_COMMAND]: ClearanceLevel.L1,
  [ActionType.DESTROY_RESOURCE]: ClearanceLevel.L2,
  [ActionType.MODIFY_PRODUCTION]: ClearanceLevel.L2,
  [ActionType.TRANSFER_FUNDS]: ClearanceLevel.L2,
  [ActionType.DELETE_AUDIT_LOG]: ClearanceLevel.L2,
  [ActionType.ESCALATE_PRIVILEGES]: ClearanceLevel.L2,
  [ActionType.EXECUTE_ARBITRARY]: ClearanceLevel.L2,
};

/** Agent Identity */
export interface AgentIdentity {
  id: string;
  name: string;
  clearanceLevel: ClearanceLevel;
  sessionId: string;
  publicKey?: string;
}

/** Action Request */
export interface ActionRequest {
  id: string;
  actionType: ActionType;
  agentId: string;
  timestamp: Date;
  payload: unknown;
  signature?: string;
  correlationId?: string;
}

/** Action Result */
export interface ActionResult {
  success: boolean;
  requestId: string;
  timestamp: Date;
  output?: unknown;
  error?: string;
  executedBy?: string;
}

/** Approval Status */
export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

/** Approval Request (for L2) */
export interface ApprovalRequest {
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

/** Audit Entry - Immutable record */
export interface AuditEntry {
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

/** Governance Configuration */
export interface GovernanceConfig {
  l2ApprovalTimeoutMs: number;
  requiredApprovers: number;
  autoRejectOnTimeout: boolean;
  auditRetentionDays: number;
  hashAlgorithm: 'SHA-256' | 'SHA-384' | 'SHA-512';
  enableImmutableAudit: boolean;
  emergencyOverrideKey?: string;
}

/** Governance Event Types */
export enum GovernanceEventType {
  ACTION_REQUESTED = 'ACTION_REQUESTED',
  ACTION_APPROVED = 'ACTION_APPROVED',
  ACTION_REJECTED = 'ACTION_REJECTED',
  ACTION_EXECUTED = 'ACTION_EXECUTED',
  ACTION_FAILED = 'ACTION_FAILED',
  CLEARANCE_VIOLATION = 'CLEARANCE_VIOLATION',
  APPROVAL_TIMEOUT = 'APPROVAL_TIMEOUT',
  AUDIT_TAMPER_DETECTED = 'AUDIT_TAMPER_DETECTED',
}

/** Governance Event */
export interface GovernanceEvent {
  type: GovernanceEventType;
  timestamp: Date;
  payload: unknown;
  severity: 'info' | 'warning' | 'critical';
}