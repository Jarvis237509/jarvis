/**
 * Mission Control - Central Governance Orchestrator
 * Coordinates L0/L1/L2 enforcement, audit trail, and approval workflows
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ClearanceLevel,
  ActionType,
  ActionRequest,
  ActionResult,
  AgentIdentity,
  ApprovalRequest,
  ApprovalStatus,
  GovernanceConfig,
  GovernanceEvent,
  GovernanceEventType,
  AuditEntry,
} from '../types/governance';
import { AuditTrail } from '../audit/AuditTrail';
import { EnforcementEngine, EnforcementResult, PreExecutionResult } from '../governance/EnforcementHooks';
import { ApprovalWorkflow, ApproverIdentity } from '../governance/ApprovalWorkflow';

/** Default governance configuration */
export const DEFAULT_GOVERNANCE_CONFIG: GovernanceConfig = {
  l2ApprovalTimeoutMs: 300000, // 5 minutes
  requiredApprovers: 1,
  autoRejectOnTimeout: true,
  auditRetentionDays: 365,
  hashAlgorithm: 'SHA-256',
  enableImmutableAudit: true,
};

/** Execution Context */
export interface ExecutionContext {
  actionId: string;
  agentId: string;
  startedAt: Date;
  clearanceLevel: ClearanceLevel;
  approvalId?: string;
}

/** Mission Control - Main Entry Point */
export class MissionControl {
  private config: GovernanceConfig;
  private auditTrail: AuditTrail;
  private enforcementEngine: EnforcementEngine;
  private approvalWorkflow: ApprovalWorkflow;
  private eventListeners: Map<GovernanceEventType, Set<(event: GovernanceEvent) => void>> = new Map();
  private activeContexts: Map<string, ExecutionContext> = new Map();

  constructor(config: Partial<GovernanceConfig> = {}) {
    this.config = { ...DEFAULT_GOVERNANCE_CONFIG, ...config };
    this.auditTrail = new AuditTrail(this.config);
    this.enforcementEngine = new EnforcementEngine(this.config);
    this.approvalWorkflow = new ApprovalWorkflow(this.config);

    // Wire up events
    this.wireEvents();
  }

  /**
   * Register an L2 approver
   */
  registerApprover(approver: ApproverIdentity): void {
    this.approvalWorkflow.registerApprover(approver);
  }

  /**
   * Execute an action with full governance
   */
  async execute<T = unknown>(
    actionType: ActionType,
    agentIdentity: AgentIdentity,
    payload: unknown,
    executor: (payload: unknown) => Promise<T>
  ): Promise<{ result: T; auditEntry: AuditEntry } | { approvalPending: true; approvalId: string }> {
    // Create action request
    const actionRequest: ActionRequest = {
      id: uuidv4(),
      actionType,
      agentId: agentIdentity.id,
      timestamp: new Date(),
      payload,
      correlationId: uuidv4(),
    };

    // Pre-execution enforcement
    const preResult = await this.enforcementEngine.preExecute(
      actionRequest,
      agentIdentity
    );

    if (!preResult.proceed) {
      // Handle L2 approval pending
      if (preResult.enforcementResult.requiresApproval && 
          preResult.enforcementResult.approvalRequest?.status === ApprovalStatus.PENDING) {
        // Submit to approval workflow
        const approval = await this.approvalWorkflow.submitForApproval(
          actionRequest,
          agentIdentity
        );

        return {
          approvalPending: true,
          approvalId: approval.id,
        };
      }

      // Rejected - record failure
      const actionResult: ActionResult = {
        success: false,
        requestId: actionRequest.id,
        timestamp: new Date(),
        error: preResult.enforcementResult.reason || 'Enforcement rejected',
      };

      const auditEntry = await this.auditTrail.record(
        actionRequest,
        actionResult,
        agentIdentity,
        preResult.enforcementResult.approvalRequest
      );

      throw new MissionControlError(
        preResult.enforcementResult.reason || 'Action rejected by governance',
        'ENFORCEMENT_REJECTED',
        auditEntry
      );
    }

    // Execute action
    const context: ExecutionContext = {
      actionId: actionRequest.id,
      agentId: agentIdentity.id,
      startedAt: new Date(),
      clearanceLevel: preResult.enforcementResult.requiredClearance,
      approvalId: preResult.enforcementResult.approvalRequest?.id,
    };

    this.activeContexts.set(actionRequest.id, context);

    let executionResult: T;
    let executionError: Error | null = null;

    try {
      executionResult = await executor(preResult.modifiedPayload || payload);
    } catch (err) {
      executionError = err instanceof Error ? err : new Error(String(err));
      throw executionError;
    } finally {
      this.activeContexts.delete(actionRequest.id);

      // Post-execution
      const actionResult: ActionResult = {
        success: executionError === null,
        requestId: actionRequest.id,
        timestamp: new Date(),
        output: executionError ? undefined : executionResult,
        error: executionError?.message,
        executedBy: agentIdentity.id,
      };

      const postResult = await this.enforcementEngine.postExecute(
        actionRequest,
        executionResult,
        executionError
      );

      // Record to audit trail
      const auditEntry = await this.auditTrail.record(
        actionRequest,
        actionResult,
        agentIdentity,
        preResult.enforcementResult.approvalRequest
      );

      if (executionError) {
        throw new MissionControlError(
          executionError.message,
          'EXECUTION_FAILED',
          auditEntry
        );
      }

      return { result: executionResult, auditEntry };
    }
  }

  /**
   * Approve a pending L2 action
   */
  async approveAction(
    approvalId: string,
    approverId: string,
    signature?: string,
    reason?: string
  ): Promise<ApprovalRequest> {
    return await this.approvalWorkflow.approve(approvalId, approverId, signature, reason);
  }

  /**
   * Reject a pending L2 action
   */
  async rejectAction(
    approvalId: string,
    approverId: string,
    rejectionReason: string,
    signature?: string
  ): Promise<ApprovalRequest> {
    return await this.approvalWorkflow.reject(approvalId, approverId, rejectionReason, signature);
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals(): ApprovalRequest[] {
    return this.approvalWorkflow.getPendingApprovals();
  }

  /**
   * Get audit trail
   */
  getAuditTrail(): AuditTrail {
    return this.auditTrail;
  }

  /**
   * Verify audit chain integrity
   */
  verifyAuditIntegrity(): boolean {
    return this.auditTrail.verifyChain();
  }

  /**
   * Export full audit trail
   */
  exportAuditTrail(): string {
    return this.auditTrail.exportToJSON();
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

    // Also subscribe to sub-components
    const unsubAudit = this.auditTrail.onEvent(type, handler);
    const unsubEnforcement = this.enforcementEngine.onEvent(type, handler);
    const unsubApproval = this.approvalWorkflow.onEvent(type, handler);

    return () => {
      this.eventListeners.get(type)?.delete(handler);
      unsubAudit();
      unsubEnforcement();
      unsubApproval();
    };
  }

  /**
   * Get active execution contexts
   */
  getActiveContexts(): ExecutionContext[] {
    return Array.from(this.activeContexts.values());
  }

  /**
   * Emergency stop - reject all pending approvals
   */
  async emergencyStop(reason: string): Promise<void> {
    const pending = this.approvalWorkflow.getPendingApprovals();
    
    for (const approval of pending) {
      await this.approvalWorkflow.revoke(approval.id, 'EMERGENCY_STOP', reason);
    }

    this.emitEvent({
      type: GovernanceEventType.ACTION_REJECTED,
      timestamp: new Date(),
      payload: {
        reason,
        revokedApprovals: pending.length,
      },
      severity: 'critical',
    });
  }

  /** Wire up event propagation */
  private wireEvents(): void {
    // Events are propagated through the onEvent registration
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

/** Mission Control Error */
export class MissionControlError extends Error {
  public readonly code: string;
  public readonly auditEntry?: AuditEntry;

  constructor(message: string, code: string, auditEntry?: AuditEntry) {
    super(message);
    this.name = 'MissionControlError';
    this.code = code;
    this.auditEntry = auditEntry;
  }
}