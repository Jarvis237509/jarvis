/**
 * L2 Approval Workflow
 * Human-in-the-loop approval system for critical (L2) actions
 */

import {
  ApprovalRequest,
  ApprovalStatus,
  AgentIdentity,
  ActionRequest,
  GovernanceConfig,
  GovernanceEvent,
  GovernanceEventType,
  ClearanceLevel,
} from '../types/governance';

/** Approver Identity */
export interface ApproverIdentity {
  id: string;
  name: string;
  clearanceLevel: ClearanceLevel;
  email?: string;
  publicKey?: string;
}

/** Approval Decision */
export interface ApprovalDecision {
  approverId: string;
  approved: boolean;
  timestamp: Date;
  signature?: string;
  reason?: string;
}

/** Approval Workflow Configuration */
export interface ApprovalWorkflowConfig {
  minApprovers: number;
  maxApprovers: number;
  requireUnanimous: boolean;
  escalationTimeoutMs: number;
  notifyChannels: string[];
  requireMFA: boolean;
}

/** L2 Approval Workflow Engine */
export class ApprovalWorkflow {
  private config: GovernanceConfig;
  private workflowConfig: ApprovalWorkflowConfig;
  private approvedApprovers: Map<string, ApproverIdentity> = new Map();
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private approvalDecisions: Map<string, ApprovalDecision[]> = new Map();
  private eventListeners: Map<GovernanceEventType, Set<(event: GovernanceEvent) => void>> = new Map();

  constructor(
    config: GovernanceConfig,
    workflowConfig?: Partial<ApprovalWorkflowConfig>
  ) {
    this.config = config;
    this.workflowConfig = {
      minApprovers: 1,
      maxApprovers: 3,
      requireUnanimous: false,
      escalationTimeoutMs: 300000, // 5 minutes
      notifyChannels: ['email', 'slack'],
      requireMFA: true,
      ...workflowConfig,
    };
  }

  /**
   * Register an approved approver
   */
  registerApprover(approver: ApproverIdentity): void {
    if (approver.clearanceLevel !== ClearanceLevel.L2) {
      throw new Error(`Approver must have L2 clearance, has ${approver.clearanceLevel}`);
    }
    this.approvedApprovers.set(approver.id, approver);
  }

  /**
   * Unregister an approver
   */
  unregisterApprover(approverId: string): void {
    this.approvedApprovers.delete(approverId);
  }

  /**
   * Submit an action for L2 approval
   */
  async submitForApproval(
    actionRequest: ActionRequest,
    requester: AgentIdentity
  ): Promise<ApprovalRequest> {
    const approvalId = this.generateApprovalId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.l2ApprovalTimeoutMs);

    // Select approvers
    const selectedApprovers = this.selectApprovers(actionRequest);

    const approvalRequest: ApprovalRequest = {
      id: approvalId,
      actionRequestId: actionRequest.id,
      status: ApprovalStatus.PENDING,
      requestedBy: requester,
      requestedAt: now,
      approvers: selectedApprovers.map(a => a.id),
      expiresAt,
      evidenceHash: this.generateEvidenceHash(actionRequest, requester),
    };

    this.pendingApprovals.set(approvalId, approvalRequest);
    this.approvalDecisions.set(approvalId, []);

    // Notify approvers
    await this.notifyApprovers(approvalRequest, selectedApprovers);

    // Schedule escalation if not resolved
    this.scheduleEscalation(approvalId);

    this.emitEvent({
      type: GovernanceEventType.ACTION_REQUESTED,
      timestamp: new Date(),
      payload: {
        approvalId,
        actionId: actionRequest.id,
        actionType: actionRequest.actionType,
        requesterId: requester.id,
        approvers: selectedApprovers.map(a => a.id),
        expiresAt,
      },
      severity: 'info',
    });

    return approvalRequest;
  }

  /**
   * Submit an approval decision
   */
  async approve(
    approvalId: string,
    approverId: string,
    signature?: string,
    reason?: string
  ): Promise<ApprovalRequest> {
    const approval = this.pendingApprovals.get(approvalId);
    if (!approval) {
      throw new Error(`Approval request ${approvalId} not found`);
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new Error(`Approval request ${approvalId} is not pending (${approval.status})`);
    }

    if (!approval.approvers.includes(approverId)) {
      throw new Error(`Approver ${approverId} is not authorized for this request`);
    }

    const approver = this.approvedApprovers.get(approverId);
    if (!approver) {
      throw new Error(`Approver ${approverId} is not registered`);
    }

    // Record decision
    const decisions = this.approvalDecisions.get(approvalId) || [];
    const existingDecision = decisions.find(d => d.approverId === approverId);
    
    if (existingDecision) {
      throw new Error(`Approver ${approverId} has already submitted a decision`);
    }

    const decision: ApprovalDecision = {
      approverId,
      approved: true,
      timestamp: new Date(),
      signature,
      reason,
    };

    decisions.push(decision);
    this.approvalDecisions.set(approvalId, decisions);

    // Check if approval threshold met
    if (this.checkApprovalThreshold(approvalId)) {
      approval.status = ApprovalStatus.APPROVED;
      approval.approvedBy = approverId;
      approval.approvedAt = new Date();
      
      this.emitEvent({
        type: GovernanceEventType.ACTION_APPROVED,
        timestamp: new Date(),
        payload: {
          approvalId,
          actionId: approval.actionRequestId,
          approvedBy: approverId,
          decisionCount: decisions.length,
        },
        severity: 'info',
      });
    }

    return approval;
  }

  /**
   * Reject an approval request
   */
  async reject(
    approvalId: string,
    approverId: string,
    rejectionReason: string,
    signature?: string
  ): Promise<ApprovalRequest> {
    const approval = this.pendingApprovals.get(approvalId);
    if (!approval) {
      throw new Error(`Approval request ${approvalId} not found`);
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new Error(`Approval request ${approvalId} is not pending`);
    }

    const approver = this.approvedApprovers.get(approverId);
    if (!approver) {
      throw new Error(`Approver ${approverId} is not registered`);
    }

    approval.status = ApprovalStatus.REJECTED;
    approval.rejectedBy = approverId;
    approval.rejectedAt = new Date();
    approval.rejectionReason = rejectionReason;

    this.emitEvent({
      type: GovernanceEventType.ACTION_REJECTED,
      timestamp: new Date(),
      payload: {
        approvalId,
        actionId: approval.actionRequestId,
        rejectedBy: approverId,
        reason: rejectionReason,
      },
      severity: 'warning',
    });

    return approval;
  }

  /**
   * Revoke a previously approved request (emergency)
   */
  async revoke(
    approvalId: string,
    revokedBy: string,
    reason: string
  ): Promise<ApprovalRequest> {
    const approval = this.pendingApprovals.get(approvalId);
    if (!approval) {
      throw new Error(`Approval request ${approvalId} not found`);
    }

    if (approval.status !== ApprovalStatus.APPROVED) {
      throw new Error(`Cannot revoke request with status ${approval.status}`);
    }

    approval.status = ApprovalStatus.REVOKED;
    
    this.emitEvent({
      type: GovernanceEventType.ACTION_REJECTED,
      timestamp: new Date(),
      payload: {
        approvalId,
        actionId: approval.actionRequestId,
        revokedBy,
        reason,
      },
      severity: 'critical',
    });

    return approval;
  }

  /**
   * Get approval request by ID
   */
  getApproval(approvalId: string): ApprovalRequest | undefined {
    return this.pendingApprovals.get(approvalId);
  }

  /**
   * Get all pending approvals
   */
  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values()).filter(
      a => a.status === ApprovalStatus.PENDING
    );
  }

  /**
   * Get decisions for an approval
   */
  getDecisions(approvalId: string): ApprovalDecision[] {
    return this.approvalDecisions.get(approvalId) || [];
  }

  /**
   * Get approved approvers list
   */
  getApprovers(): ApproverIdentity[] {
    return Array.from(this.approvedApprovers.values());
  }

  /**
   * Select approvers for an action
   */
  private selectApprovers(actionRequest: ActionRequest): ApproverIdentity[] {
    const allApprovers = Array.from(this.approvedApprovers.values());
    
    if (allApprovers.length === 0) {
      throw new Error('No L2 approvers registered');
    }

    // For critical actions, select more approvers
    const count = Math.min(
      this.workflowConfig.minApprovers,
      allApprovers.length
    );

    // Random selection with weighting could be added here
    // For now, just take the first N
    return allApprovers.slice(0, count);
  }

  /**
   * Check if approval threshold is met
   */
  private checkApprovalThreshold(approvalId: string): boolean {
    const decisions = this.approvalDecisions.get(approvalId) || [];
    const approvals = decisions.filter(d => d.approved);

    if (this.workflowConfig.requireUnanimous) {
      const approval = this.pendingApprovals.get(approvalId)!;
      return approvals.length === approval.approvers.length;
    }

    return approvals.length >= this.workflowConfig.minApprovers;
  }

  /**
   * Generate unique approval ID
   */
  private generateApprovalId(): string {
    return `L2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate evidence hash for audit trail
   */
  private generateEvidenceHash(
    actionRequest: ActionRequest,
    requester: AgentIdentity
  ): string {
    const evidence = JSON.stringify({
      actionId: actionRequest.id,
      actionType: actionRequest.actionType,
      agentId: requester.id,
      timestamp: Date.now(),
      payloadSnapshot: this.hashPayload(actionRequest.payload),
    });
    return this.hash(evidence);
  }

  /**
   * Hash payload for evidence
   */
  private hashPayload(payload: unknown): string {
    return this.hash(JSON.stringify(payload));
  }

  /**
   * Simple hash function
   */
  private hash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  /**
   * Notify approvers of pending approval
   */
  private async notifyApprovers(
    approvalRequest: ApprovalRequest,
    approvers: ApproverIdentity[]
  ): Promise<void> {
    // Implementation would integrate with email/Slack/webhook
    console.log(`[Approval Workflow] Notifying ${approvers.length} approvers for ${approvalRequest.id}`);
    
    for (const approver of approvers) {
      console.log(`  - Notifying ${approver.name} (${approver.email || 'no email'})`);
    }
  }

  /**
   * Schedule escalation if approval not resolved
   */
  private scheduleEscalation(approvalId: string): void {
    setTimeout(() => {
      const approval = this.pendingApprovals.get(approvalId);
      if (approval && approval.status === ApprovalStatus.PENDING) {
        this.emitEvent({
          type: GovernanceEventType.APPROVAL_TIMEOUT,
          timestamp: new Date(),
          payload: {
            approvalId,
            actionId: approval.actionRequestId,
            message: 'Approval escalation - no response within timeout',
          },
          severity: 'warning',
        });
      }
    }, this.workflowConfig.escalationTimeoutMs);
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