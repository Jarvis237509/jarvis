/**
 * Approval Workflow Tests
 */

import { ApprovalWorkflow } from './ApprovalWorkflow';
import {
  GovernanceConfig,
  ClearanceLevel,
  ActionType,
  ActionRequest,
  AgentIdentity,
  ApprovalStatus,
  GovernanceEventType,
} from '../types/governance';

const mockConfig: GovernanceConfig = {
  l2ApprovalTimeoutMs: 300000,
  requiredApprovers: 1,
  autoRejectOnTimeout: true,
  auditRetentionDays: 365,
  hashAlgorithm: 'SHA-256',
  enableImmutableAudit: true,
};

const createMockApprover = (id: string): any => ({
  id: `approver-${id}`,
  name: `Approver ${id}`,
  clearanceLevel: ClearanceLevel.L2,
  email: `approver${id}@test.com`,
});

const createMockRequester = (id: string): AgentIdentity => ({
  id: `agent-${id}`,
  name: `Agent ${id}`,
  clearanceLevel: ClearanceLevel.L2,
  sessionId: 'session-1',
});

const createMockActionRequest = (id: string): ActionRequest => ({
  id: `req-${id}`,
  actionType: ActionType.DESTROY_RESOURCE,
  agentId: 'agent-1',
  timestamp: new Date(),
  payload: { resourceId: 'r-123' },
});

describe('ApprovalWorkflow', () => {
  let workflow: ApprovalWorkflow;

  beforeEach(() => {
    workflow = new ApprovalWorkflow(mockConfig);
  });

  describe('registerApprover', () => {
    it('should register an L2 approver', () => {
      const approver = createMockApprover('1');
      
      workflow.registerApprover(approver);

      const approvers = workflow.getApprovers();
      expect(approvers).toHaveLength(1);
      expect(approvers[0].id).toBe(approver.id);
    });

    it('should reject non-L2 approver', () => {
      const invalidApprover = {
        ...createMockApprover('1'),
        clearanceLevel: ClearanceLevel.L1,
      };

      expect(() => workflow.registerApprover(invalidApprover)).toThrow(
        'Approver must have L2 clearance'
      );
    });

    it('should unregister approver', () => {
      const approver = createMockApprover('1');
      workflow.registerApprover(approver);

      workflow.unregisterApprover(approver.id);

      expect(workflow.getApprovers()).toHaveLength(0);
    });
  });

  describe('submitForApproval', () => {
    it('should create pending approval request', async () => {
      const approver = createMockApprover('1');
      workflow.registerApprover(approver);

      const requester = createMockRequester('1');
      const actionRequest = createMockActionRequest('1');

      const approval = await workflow.submitForApproval(actionRequest, requester);

      expect(approval.status).toBe(ApprovalStatus.PENDING);
      expect(approval.actionRequestId).toBe(actionRequest.id);
      expect(approval.requestedBy.id).toBe(requester.id);
      expect(approval.evidenceHash).toBeDefined();
      expect(approval.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw if no approvers registered', async () => {
      const requester = createMockRequester('1');
      const actionRequest = createMockActionRequest('1');

      await expect(workflow.submitForApproval(actionRequest, requester)).rejects.toThrow(
        'No L2 approvers registered'
      );
    });

    it('should emit ACTION_REQUESTED event', async () => {
      const events: any[] = [];
      workflow.onEvent(GovernanceEventType.ACTION_REQUESTED, (e) => {
        events.push(e);
      });

      const approver = createMockApprover('1');
      workflow.registerApprover(approver);

      const requester = createMockRequester('1');
      const actionRequest = createMockActionRequest('1');

      await workflow.submitForApproval(actionRequest, requester);

      expect(events.length).toBe(1);
      expect(events[0].type).toBe(GovernanceEventType.ACTION_REQUESTED);
    });
  });

  describe('approve', () => {
    it('should approve pending request', async () => {
      const approver = createMockApprover('1');
      workflow.registerApprover(approver);

      const requester = createMockRequester('1');
      const actionRequest = createMockActionRequest('1');

      const approval = await workflow.submitForApproval(actionRequest, requester);
      const approved = await workflow.approve(approval.id, approver.id, 'signature-123');

      expect(approved.status).toBe(ApprovalStatus.APPROVED);
      expect(approved.approvedBy).toBe(approver.id);
      expect(approved.approvedAt).toBeInstanceOf(Date);
    });

    it('should throw if approval not found', async () => {
      await expect(workflow.approve('invalid-id', 'approver-1')).rejects.toThrow(
        'Approval request invalid-id not found'
      );
    });

    it('should throw if not pending', async () => {
      const approver = createMockApprover('1');
      workflow.registerApprover(approver);

      const requester = createMockRequester('1');
      const actionRequest = createMockActionRequest('1');

      const approval = await workflow.submitForApproval(actionRequest, requester);
      await workflow.approve(approval.id, approver.id);

      await expect(workflow.approve(approval.id, approver.id)).rejects.toThrow(
        'not pending'
      );
    });

    it('should throw if approver not authorized', async () => {
      const approver1 = createMockApprover('1');
      const approver2 = createMockApprover('2');
      workflow.registerApprover(approver1);
      // Note: approver2 not registered

      const requester = createMockRequester('1');
      const actionRequest = createMockActionRequest('1');

      const approval = await workflow.submitForApproval(actionRequest, requester);

      await expect(workflow.approve(approval.id, approver2.id)).rejects.toThrow(
        'Approver approver-2 is not registered'
      );
    });

    it('should emit ACTION_APPROVED event', async () => {
      const events: any[] = [];
      workflow.onEvent(GovernanceEventType.ACTION_APPROVED, (e) => {
        events.push(e);
      });

      const approver = createMockApprover('1');
      workflow.registerApprover(approver);

      const requester = createMockRequester('1');
      const actionRequest = createMockActionRequest('1');

      const approval = await workflow.submitForApproval(actionRequest, requester);
      await workflow.approve(approval.id, approver.id);

      expect(events.length).toBe(1);
      expect(events[0].type).toBe(GovernanceEventType.ACTION_APPROVED);
    });
  });

  describe('reject', () => {
    it('should reject pending request', async () => {
      const approver = createMockApprover('1');
      workflow.registerApprover(approver);

      const requester = createMockRequester('1');
      const actionRequest = createMockActionRequest('1');

      const approval = await workflow.submitForApproval(actionRequest, requester);
      const rejected = await workflow.reject(approval.id, approver.id, 'Security concern');

      expect(rejected.status).toBe(ApprovalStatus.REJECTED);
      expect(rejected.rejectedBy).toBe(approver.id);
      expect(rejected.rejectionReason).toBe('Security concern');
    });

    it('should emit ACTION_REJECTED event', async () => {
      const events: any[] = [];
      workflow.onEvent(GovernanceEventType.ACTION_REJECTED, (e) => {
        events.push(e);
      });

      const approver = createMockApprover('1');
      workflow.registerApprover(approver);

      const requester = createMockRequester('1');
      const actionRequest = createMockActionRequest('1');

      const approval = await workflow.submitForApproval(actionRequest, requester);
      await workflow.reject(approval.id, approver.id, 'Rejected');

      expect(events.length).toBe(1);
      expect(events[0].type).toBe(GovernanceEventType.ACTION_REJECTED);
      expect(events[0].severity).toBe('warning');
    });
  });

  describe('revoke', () => {
    it('should revoke approved request', async () => {
      const approver = createMockApprover('1');
      workflow.registerApprover(approver);

      const requester = createMockRequester('1');
      const actionRequest = createMockActionRequest('1');

      const approval = await workflow.submitForApproval(actionRequest, requester);
      await workflow.approve(approval.id, approver.id);

      const revoked = await workflow.revoke(approval.id, 'EMERGENCY', 'Security breach detected');

      expect(revoked.status).toBe(ApprovalStatus.REVOKED);
    });

    it('should throw if not approved', async () => {
      const approver = createMockApprover('1');
      workflow.registerApprover(approver);

      const requester = createMockRequester('1');
      const actionRequest = createMockActionRequest('1');

      const approval = await workflow.submitForApproval(actionRequest, requester);

      await expect(workflow.revoke(approval.id, 'user', 'reason')).rejects.toThrow(
        'Cannot revoke request with status PENDING'
      );
    });

    it('should emit critical event on revoke', async () => {
      const events: any[] = [];
      workflow.onEvent(GovernanceEventType.ACTION_REJECTED, (e) => {
        events.push(e);
      });

      const approver = createMockApprover('1');
      workflow.registerApprover(approver);

      const requester = createMockRequester('1');
      const actionRequest = createMockActionRequest('1');

      const approval = await workflow.submitForApproval(actionRequest, requester);
      await workflow.approve(approval.id, approver.id);
      await workflow.revoke(approval.id, 'EMERGENCY', 'Breach');

      expect(events[events.length - 1].severity).toBe('critical');
    });
  });

  describe('getApproval', () => {
    it('should return approval by ID', async () => {
      const approver = createMockApprover('1');
      workflow.registerApprover(approver);

      const requester = createMockRequester('1');
      const actionRequest = createMockActionRequest('1');

      const approval = await workflow.submitForApproval(actionRequest, requester);
      const retrieved = workflow.getApproval(approval.id);

      expect(retrieved).toEqual(approval);
    });

    it('should return undefined for unknown ID', () => {
      expect(workflow.getApproval('unknown')).toBeUndefined();
    });
  });

  describe('getPendingApprovals', () => {
    it('should return only pending approvals', async () => {
      const approver = createMockApprover('1');
      workflow.registerApprover(approver);

      const requester = createMockRequester('1');
      
      const approval1 = await workflow.submitForApproval(createMockActionRequest('1'), requester);
      const approval2 = await workflow.submitForApproval(createMockActionRequest('2'), requester);
      
      await workflow.approve(approval1.id, approver.id);

      const pending = workflow.getPendingApprovals();
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe(approval2.id);
    });
  });

  describe('getDecisions', () => {
    it('should return all decisions for an approval', async () => {
      const approver1 = createMockApprover('1');
      const approver2 = createMockApprover('2');
      workflow.registerApprover(approver1);
      workflow.registerApprover(approver2);

      const requester = createMockRequester('1');
      const actionRequest = createMockActionRequest('1');

      const approval = await workflow.submitForApproval(actionRequest, requester);
      await workflow.approve(approval.id, approver1.id);

      const decisions = workflow.getDecisions(approval.id);
      expect(decisions.length).toBe(1);
      expect(decisions[0].approverId).toBe(approver1.id);
    });
  });

  describe('dual approval', () => {
    it('should require multiple approvals when configured', async () => {
      const dualWorkflow = new ApprovalWorkflow(mockConfig, {
        minApprovers: 2,
        requireUnanimous: true,
      });

      const approver1 = createMockApprover('1');
      const approver2 = createMockApprover('2');
      dualWorkflow.registerApprover(approver1);
      dualWorkflow.registerApprover(approver2);

      const requester = createMockRequester('1');
      const actionRequest = createMockActionRequest('1');

      const approval = await dualWorkflow.submitForApproval(actionRequest, requester);
      
      // First approval should not complete
      const partial = await dualWorkflow.approve(approval.id, approver1.id);
      expect(partial.status).toBe(ApprovalStatus.PENDING);

      // Second approval should complete
      const complete = await dualWorkflow.approve(approval.id, approver2.id);
      expect(complete.status).toBe(ApprovalStatus.APPROVED);
    });
  });
});