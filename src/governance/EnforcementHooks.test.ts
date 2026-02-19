/**
 * Enforcement Hooks Tests
 */

import { EnforcementEngine } from './EnforcementHooks';
import {
  GovernanceConfig,
  ClearanceLevel,
  ActionType,
  ActionRequest,
  AgentIdentity,
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

const createMockAgent = (clearance: ClearanceLevel): AgentIdentity => ({
  id: `agent-${clearance}`,
  name: `Test Agent ${clearance}`,
  clearanceLevel: clearance,
  sessionId: 'session-1',
});

const createMockRequest = (actionType: ActionType): ActionRequest => ({
  id: `req-${actionType}`,
  actionType,
  agentId: 'agent-1',
  timestamp: new Date(),
  payload: { test: true },
});

describe('EnforcementEngine', () => {
  let engine: EnforcementEngine;

  beforeEach(() => {
    engine = new EnforcementEngine(mockConfig);
  });

  describe('validateAction', () => {
    describe('L0 Actions', () => {
      it('should allow L0 agent to execute L0 action', async () => {
        const agent = createMockAgent(ClearanceLevel.L0);
        const request = createMockRequest(ActionType.READ_PUBLIC);

        const result = await engine.validateAction(request, agent);

        expect(result.allowed).toBe(true);
        expect(result.requiresApproval).toBe(false);
        expect(result.requiredClearance).toBe(ClearanceLevel.L0);
      });

      it('should allow L1 agent to execute L0 action', async () => {
        const agent = createMockAgent(ClearanceLevel.L1);
        const request = createMockRequest(ActionType.READ_PUBLIC);

        const result = await engine.validateAction(request, agent);

        expect(result.allowed).toBe(true);
        expect(result.requiresApproval).toBe(false);
      });

      it('should allow L2 agent to execute L0 action', async () => {
        const agent = createMockAgent(ClearanceLevel.L2);
        const request = createMockRequest(ActionType.READ_PUBLIC);

        const result = await engine.validateAction(request, agent);

        expect(result.allowed).toBe(true);
        expect(result.requiresApproval).toBe(false);
      });
    });

    describe('L1 Actions', () => {
      it('should reject L0 agent from L1 action', async () => {
        const agent = createMockAgent(ClearanceLevel.L0);
        const request = createMockRequest(ActionType.MODIFY_CONFIG);

        const result = await engine.validateAction(request, agent);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Insufficient clearance');
      });

      it('should allow L1 agent to execute L1 action', async () => {
        const agent = createMockAgent(ClearanceLevel.L1);
        const request = createMockRequest(ActionType.MODIFY_CONFIG);

        const result = await engine.validateAction(request, agent);

        expect(result.allowed).toBe(true);
        expect(result.requiresApproval).toBe(false);
        expect(result.requiredClearance).toBe(ClearanceLevel.L1);
      });

      it('should allow L2 agent to execute L1 action', async () => {
        const agent = createMockAgent(ClearanceLevel.L2);
        const request = createMockRequest(ActionType.DEPLOY_SERVICE);

        const result = await engine.validateAction(request, agent);

        expect(result.allowed).toBe(true);
        expect(result.requiresApproval).toBe(false);
      });
    });

    describe('L2 Actions', () => {
      it('should reject L0 agent from L2 action', async () => {
        const agent = createMockAgent(ClearanceLevel.L0);
        const request = createMockRequest(ActionType.DESTROY_RESOURCE);

        const result = await engine.validateAction(request, agent);

        expect(result.allowed).toBe(false);
      });

      it('should reject L1 agent from L2 action', async () => {
        const agent = createMockAgent(ClearanceLevel.L1);
        const request = createMockRequest(ActionType.DESTROY_RESOURCE);

        const result = await engine.validateAction(request, agent);

        expect(result.allowed).toBe(false);
      });

      it('should require approval for L2 agent executing L2 action', async () => {
        const agent = createMockAgent(ClearanceLevel.L2);
        const request = createMockRequest(ActionType.DESTROY_RESOURCE);

        const result = await engine.validateAction(request, agent);

        expect(result.allowed).toBe(true);
        expect(result.requiresApproval).toBe(true);
        expect(result.approvalRequest).toBeDefined();
        expect(result.requiredClearance).toBe(ClearanceLevel.L2);
      });
    });

    describe('Clearance Violation Events', () => {
      it('should emit CLEARANCE_VIOLATION event', async () => {
        const events: any[] = [];
        engine.onEvent(GovernanceEventType.CLEARANCE_VIOLATION, (e) => {
          events.push(e);
        });

        const agent = createMockAgent(ClearanceLevel.L0);
        const request = createMockRequest(ActionType.DESTROY_RESOURCE);

        await engine.validateAction(request, agent);

        expect(events.length).toBe(1);
        expect(events[0].type).toBe(GovernanceEventType.CLEARANCE_VIOLATION);
        expect(events[0].severity).toBe('critical');
      });
    });
  });

  describe('preExecute', () => {
    it('should proceed for allowed action', async () => {
      const agent = createMockAgent(ClearanceLevel.L1);
      const request = createMockRequest(ActionType.READ_PUBLIC);

      const result = await engine.preExecute(request, agent);

      expect(result.proceed).toBe(true);
      expect(result.enforcementResult.allowed).toBe(true);
    });

    it('should not proceed for denied action', async () => {
      const agent = createMockAgent(ClearanceLevel.L0);
      const request = createMockRequest(ActionType.MODIFY_CONFIG);

      const result = await engine.preExecute(request, agent);

      expect(result.proceed).toBe(false);
      expect(result.intercepted).toBe(true);
    });

    it('should not proceed for duplicate execution', async () => {
      const agent = createMockAgent(ClearanceLevel.L1);
      const request = createMockRequest(ActionType.READ_PUBLIC);

      // First execution
      await engine.preExecute(request, agent);
      
      // Second execution should be blocked
      const result = await engine.preExecute(request, agent);

      expect(result.proceed).toBe(false);
      expect(result.enforcementResult.reason).toContain('already executed');
    });

    it('should wait for approval when L2 action pending', async () => {
      const agent = createMockAgent(ClearanceLevel.L2);
      const request = createMockRequest(ActionType.DESTROY_RESOURCE);

      const result = await engine.preExecute(request, agent);

      expect(result.proceed).toBe(false);
      expect(result.enforcementResult.requiresApproval).toBe(true);
      expect(result.enforcementResult.reason).toContain('Waiting for L2 approval');
    });
  });

  describe('postExecute', () => {
    it('should handle successful execution', async () => {
      const agent = createMockAgent(ClearanceLevel.L1);
      const request = createMockRequest(ActionType.READ_PUBLIC);

      const result = await engine.postExecute(request, { data: 'test' }, null);

      expect(result.logged).toBe(true);
      expect(result.cleanupNeeded).toBe(false);
    });

    it('should handle failed execution', async () => {
      const agent = createMockAgent(ClearanceLevel.L1);
      const request = createMockRequest(ActionType.READ_PUBLIC);
      const error = new Error('Execution failed');

      const result = await engine.postExecute(request, null, error);

      expect(result.logged).toBe(true);
      expect(result.cleanupNeeded).toBe(true);
      expect(result.cleanupActions).toContain('ROLLBACK_PENDING_CHANGES');
    });

    it('should emit ACTION_EXECUTED event', async () => {
      const events: any[] = [];
      engine.onEvent(GovernanceEventType.ACTION_EXECUTED, (e) => {
        events.push(e);
      });

      const request = createMockRequest(ActionType.READ_PUBLIC);
      await engine.postExecute(request, { data: 'test' }, null);

      expect(events.length).toBe(1);
      expect(events[0].type).toBe(GovernanceEventType.ACTION_EXECUTED);
    });

    it('should emit ACTION_FAILED event', async () => {
      const events: any[] = [];
      engine.onEvent(GovernanceEventType.ACTION_FAILED, (e) => {
        events.push(e);
      });

      const request = createMockRequest(ActionType.READ_PUBLIC);
      await engine.postExecute(request, null, new Error('fail'));

      expect(events.length).toBe(1);
      expect(events[0].type).toBe(GovernanceEventType.ACTION_FAILED);
    });
  });

  describe('getPendingApproval', () => {
    it('should return pending approval by action ID', async () => {
      const agent = createMockAgent(ClearanceLevel.L2);
      const request = createMockRequest(ActionType.DESTROY_RESOURCE);

      const validation = await engine.validateAction(request, agent);
      
      const pending = engine.getPendingApproval(request.id);
      expect(pending).toBeDefined();
      expect(pending?.id).toBe(validation.approvalRequest?.id);
    });

    it('should return undefined for non-pending action', async () => {
      const agent = createMockAgent(ClearanceLevel.L1);
      const request = createMockRequest(ActionType.READ_PUBLIC);

      await engine.validateAction(request, agent);

      const pending = engine.getPendingApproval(request.id);
      expect(pending).toBeUndefined();
    });
  });

  describe('getAllPendingApprovals', () => {
    it('should return all pending approvals', async () => {
      const agent = createMockAgent(ClearanceLevel.L2);
      
      await engine.validateAction(createMockRequest(ActionType.DESTROY_RESOURCE), agent);
      await engine.validateAction(createMockRequest(ActionType.TRANSFER_FUNDS), agent);

      const pending = engine.getAllPendingApprovals();
      expect(pending.length).toBe(2);
    });
  });

  describe('payload sanitization', () => {
    it('should sanitize dangerous payload fields', async () => {
      const agent = createMockAgent(ClearanceLevel.L1);
      const request: ActionRequest = {
        ...createMockRequest(ActionType.MODIFY_CONFIG),
        payload: {
          valid: 'data',
          __proto__: { polluted: true },
          constructor: { evil: true },
        },
      };

      const result = await engine.preExecute(request, agent);

      expect(result.proceed).toBe(true);
      // Modified payload should have dangerous fields removed
      const modified = result.modifiedPayload as any;
      expect(modified.valid).toBe('data');
      expect(modified.__proto__).toBeUndefined();
    });
  });

  describe('event unsubscribe', () => {
    it('should support event unsubscription', async () => {
      const events: any[] = [];
      const unsubscribe = engine.onEvent(GovernanceEventType.ACTION_EXECUTED, (e) => {
        events.push(e);
      });

      unsubscribe();

      const request = createMockRequest(ActionType.READ_PUBLIC);
      await engine.postExecute(request, { data: 'test' }, null);

      expect(events.length).toBe(0);
    });
  });
});