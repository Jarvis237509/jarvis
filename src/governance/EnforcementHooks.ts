/**
 * L0/L1/L2 Enforcement Hooks
 * Implements clearance-based action enforcement and validation
 */

import {
  ClearanceLevel,
  ActionType,
  ActionRequest,
  AgentIdentity,
  ApprovalRequest,
  ApprovalStatus,
  ACTION_CLEARANCE_MAP,
  GovernanceEventType,
  GovernanceEvent,
  GovernanceConfig,
} from '../types/governance';

/** Enforcement Result */
export interface EnforcementResult {
  allowed: boolean;
  requiredClearance: ClearanceLevel;
  agentClearance: ClearanceLevel;
  requiresApproval: boolean;
  approvalRequest?: ApprovalRequest;
  reason?: string;
}

/** Pre-execution Hook Result */
export interface PreExecutionResult {
  proceed: boolean;
  enforcementResult: EnforcementResult;
  intercepted?: boolean;
  modifiedPayload?: unknown;
}

/** Post-execution Hook Result */
export interface PostExecutionResult {
  logged: boolean;
  cleanupNeeded: boolean;
  cleanupActions?: string[];
}

/** Enforcement Hook Interface */
export interface EnforcementHook {
  /**
   * Pre-execution hook - validates and potentially intercepts actions
   */
  preExecute(
    actionRequest: ActionRequest,
    agentIdentity: AgentIdentity
  ): Promise<PreExecutionResult>;

  /**
   * Post-execution hook - handles logging and cleanup
   */
  postExecute(
    actionRequest: ActionRequest,
    result: unknown,
    error: Error | null,
    enforcementResult: EnforcementResult
  ): Promise<PostExecutionResult>;
}

/** L0/L1/L2 Enforcement Engine */
export class EnforcementEngine {
  private config: GovernanceConfig;
  private eventListeners: Map<GovernanceEventType, Set<(event: GovernanceEvent) => void>> = new Map();
  private approvalQueue: Map<string, ApprovalRequest> = new Map();
  private executedActions: Set<string> = new Set();

  constructor(config: GovernanceConfig) {
    this.config = config;
  }

  /**
   * Validate if an agent can execute an action
   * Returns enforcement result with approval requirements
   */
  async validateAction(
    actionRequest: ActionRequest,
    agentIdentity: AgentIdentity
  ): Promise<EnforcementResult> {
    const requiredClearance = ACTION_CLEARANCE_MAP[actionRequest.actionType];
    const agentClearance = agentIdentity.clearanceLevel;

    // Check clearance hierarchy
    if (!this.hasSufficientClearance(agentClearance, requiredClearance)) {
      this.emitEvent({
        type: GovernanceEventType.CLEARANCE_VIOLATION,
        timestamp: new Date(),
        payload: {
          actionId: actionRequest.id,
          actionType: actionRequest.actionType,
          agentId: agentIdentity.id,
          required: requiredClearance,
          actual: agentClearance,
        },
        severity: 'critical',
      });

      return {
        allowed: false,
        requiredClearance,
        agentClearance,
        requiresApproval: false,
        reason: `Insufficient clearance: requires ${requiredClearance}, agent has ${agentClearance}`,
      };
    }

    // Determine if approval is required (L2 actions)
    const requiresApproval = requiredClearance === ClearanceLevel.L2;

    if (requiresApproval) {
      const approvalRequest = await this.createApprovalRequest(
        actionRequest,
        agentIdentity
      );

      return {
        allowed: true, // Allowed pending approval
        requiredClearance,
        agentClearance,
        requiresApproval: true,
        approvalRequest,
        reason: 'L2 action requires human approval',
      };
    }

    // L0 and L1 actions proceed immediately
    return {
      allowed: true,
      requiredClearance,
      agentClearance,
      requiresApproval: false,
    };
  }

  /**
   * Pre-execution hook with full enforcement
   */
  async preExecute(
    actionRequest: ActionRequest,
    agentIdentity: AgentIdentity
  ): Promise<PreExecutionResult> {
    // Validate action
    const enforcementResult = await this.validateAction(
      actionRequest,
      agentIdentity
    );

    if (!enforcementResult.allowed) {
      return {
        proceed: false,
        enforcementResult,
        intercepted: true,
        reason: enforcementResult.reason,
      };
    }

    // Check for duplicate execution
    if (this.executedActions.has(actionRequest.id)) {
      return {
        proceed: false,
        enforcementResult,
        intercepted: true,
        reason: 'Action already executed (idempotency check)',
      };
    }

    // Handle approval requirement
    if (enforcementResult.requiresApproval && enforcementResult.approvalRequest) {
      const approval = enforcementResult.approvalRequest;

      if (approval.status === ApprovalStatus.PENDING) {
        return {
          proceed: false,
          enforcementResult,
          intercepted: true,
          reason: 'Waiting for L2 approval',
        };
      }

      if (approval.status === ApprovalStatus.REJECTED) {
        return {
          proceed: false,
          enforcementResult,
          intercepted: true,
          reason: `Approval rejected: ${approval.rejectionReason}`,
        };
      }

      if (approval.status === ApprovalStatus.EXPIRED) {
        return {
          proceed: false,
          enforcementResult,
          intercepted: true,
          reason: 'Approval request expired',
        };
      }

      // APPROVED status continues
    }

    // Payload validation and sanitization
    const sanitizedPayload = this.sanitizePayload(
      actionRequest.payload,
      actionRequest.actionType
    );

    return {
      proceed: true,
      enforcementResult,
      modifiedPayload: sanitizedPayload,
    };
  }

  /**
   * Post-execution hook
   */
  async postExecute(
    actionRequest: ActionRequest,
    result: unknown,
    error: Error | null
  ): Promise<PostExecutionResult> {
    // Mark as executed
    this.executedActions.add(actionRequest.id);

    // Determine if cleanup is needed
    const cleanupNeeded = error !== null;
    const cleanupActions: string[] = [];

    if (cleanupNeeded) {
      cleanupActions.push('ROLLBACK_PENDING_CHANGES');
      cleanupActions.push('RELEASE_RESOURCES');
    }

    // Emit appropriate event
    if (error) {
      this.emitEvent({
        type: GovernanceEventType.ACTION_FAILED,
        timestamp: new Date(),
        payload: {
          actionId: actionRequest.id,
          error: error.message,
        },
        severity: 'warning',
      });
    } else {
      this.emitEvent({
        type: GovernanceEventType.ACTION_EXECUTED,
        timestamp: new Date(),
        payload: {
          actionId: actionRequest.id,
          actionType: actionRequest.actionType,
        },
        severity: 'info',
      });
    }

    return {
      logged: true,
      cleanupNeeded,
      cleanupActions: cleanupNeeded ? cleanupActions : undefined,
    };
  }

  /**
   * Check if agent has sufficient clearance
   */
  private hasSufficientClearance(
    agentLevel: ClearanceLevel,
    requiredLevel: ClearanceLevel
  ): boolean {
    const levels = [ClearanceLevel.L0, ClearanceLevel.L1, ClearanceLevel.L2];
    const agentIndex = levels.indexOf(agentLevel);
    const requiredIndex = levels.indexOf(requiredLevel);

    return agentIndex >= requiredIndex;
  }

  /**
   * Create approval request for L2 actions
   */
  private async createApprovalRequest(
    actionRequest: ActionRequest,
    agentIdentity: AgentIdentity
  ): Promise<ApprovalRequest> {
    const approvalId = `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.l2ApprovalTimeoutMs);

    // Generate evidence hash for audit
    const evidenceData = JSON.stringify({
      actionId: actionRequest.id,
      actionType: actionRequest.actionType,
      agentId: agentIdentity.id,
      timestamp: now.toISOString(),
      payloadHash: this.computePayloadHash(actionRequest.payload),
    });

    const approvalRequest: ApprovalRequest = {
      id: approvalId,
      actionRequestId: actionRequest.id,
      status: ApprovalStatus.PENDING,
      requestedBy: agentIdentity,
      requestedAt: now,
      approvers: [], // Will be populated by approval workflow
      expiresAt,
      evidenceHash: this.hash(evidenceData),
    };

    this.approvalQueue.set(approvalId, approvalRequest);

    // Schedule timeout check
    this.scheduleApprovalTimeout(approvalId);

    this.emitEvent({
      type: GovernanceEventType.ACTION_REQUESTED,
      timestamp: new Date(),
      payload: {
        approvalId,
        actionId: actionRequest.id,
        actionType: actionRequest.actionType,
        expiresAt,
      },
      severity: 'info',
    });

    return approvalRequest;
  }

  /**
   * Schedule automatic rejection on timeout
   */
  private scheduleApprovalTimeout(approvalId: string): void {
    setTimeout(() => {
      const approval = this.approvalQueue.get(approvalId);
      if (approval && approval.status === ApprovalStatus.PENDING) {
        approval.status = ApprovalStatus.EXPIRED;
        
        this.emitEvent({
          type: GovernanceEventType.APPROVAL_TIMEOUT,
          timestamp: new Date(),
          payload: {
            approvalId,
            actionId: approval.actionRequestId,
          },
          severity: 'warning',
        });
      }
    }, this.config.l2ApprovalTimeoutMs);
  }

  /**
   * Sanitize payload based on action type
   */
  private sanitizePayload(payload: unknown, actionType: ActionType): unknown {
    // Basic sanitization - remove potentially dangerous fields
    if (typeof payload !== 'object' || payload === null) {
      return payload;
    }

    const sanitized = { ...payload as object };
    const dangerousFields = ['__proto__', 'constructor', 'prototype'];

    for (const field of dangerousFields) {
      delete (sanitized as Record<string, unknown>)[field];
    }

    return sanitized;
  }

  /**
   * Compute hash of payload for evidence
   */
  private computePayloadHash(payload: unknown): string {
    return this.hash(JSON.stringify(payload));
  }

  /**
   * Simple hash function
   */
  private hash(data: string): string {
    // Using simple hash for evidence - in production use crypto
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Register event listener
   */
  onEvent(
    type: GovernanceEventType,
    handler: (event: GovernanceEvent) => void
  ): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(handler);

    return () => {
      this.eventListeners.get(type)?.delete(handler);
    };
  }

  /**
   * Get pending approval by action ID
   */
  getPendingApproval(actionRequestId: string): ApprovalRequest | undefined {
    return Array.from(this.approvalQueue.values()).find(
      a => a.actionRequestId === actionRequestId && a.status === ApprovalStatus.PENDING
    );
  }

  /**
   * Get all pending approvals
   */
  getAllPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.approvalQueue.values()).filter(
      a => a.status === ApprovalStatus.PENDING
    );
  }

  /** Emit governance event */
  private emitEvent(event: GovernanceEvent): void {
    const handlers = this.eventListeners.get(event.type);
    if (handlers) {
      handlers.forEach(h => {
        try {
          h(event);
        } catch (err) {
          console.error('Event handler error:', err);
        }
      });
    }
  }
}