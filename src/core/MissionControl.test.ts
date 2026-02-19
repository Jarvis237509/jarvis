/**
 * Mission Control Integration Tests
 */

import { MissionControl, MissionControlError } from './MissionControl';
import {
  ClearanceLevel,
  ActionType,
  GovernanceEventType,
} from '../types/governance';

describe('MissionControl', () => {
  let mc: MissionControl;

  beforeEach(() => {
    mc = new MissionControl({
      l2ApprovalTimeoutMs: 5000, // Short timeout for tests
      requiredApprovers: 1,
      autoRejectOnTimeout: true,
      auditRetentionDays: 30,
      hashAlgorithm: 'SHA-256',
      enableImmutableAudit: true,
    });
  });

  describe('L0 Actions', () => {
    it('should execute L0 action immediately', async () => {
      const agent = {
        id: 'agent-l0',
        name: 'L0 Agent',
        clearanceLevel: ClearanceLevel.L0,
        sessionId: 'session-1',
      };

      const executor = jest.fn().mockResolvedValue({ data: 'result' });

      const result = await mc.execute(
        ActionType.READ_PUBLIC,
        agent,
        { query: 'test' },
        executor
      );

      if ('result' in result) {
        expect(result.result).toEqual({ data: 'result' });
        expect(result.auditEntry).toBeDefined();
        expect(result.auditEntry.actionResult.success).toBe(true);
      }
      expect(executor).toHaveBeenCalled();
    });

    it('should allow L1 agent to execute L0 action', async () => {
      const agent = {
        id: 'agent-l1',
        name: 'L1 Agent',
        clearanceLevel: ClearanceLevel.L1,
        sessionId: 'session-1',
      };

      const executor = jest.fn().mockResolvedValue({ status: 'ok' });

      const result = await mc.execute(
        ActionType.QUERY_STATUS,
        agent,
        {},
        executor
      );

      if ('result' in result) {
        expect(result.result).toEqual({ status: 'ok' });
      }
    });
  });

  describe('L1 Actions', () => {
    it('should reject L0 agent from L1 action', async () => {
      const agent = {
        id: 'agent-l0',
        name: 'L0 Agent',
        clearanceLevel: ClearanceLevel.L0,
        sessionId: 'session-1',
      };

      const executor = jest.fn();

      await expect(
        mc.execute(ActionType.MODIFY_CONFIG, agent, {}, executor)
      ).rejects.toThrow(MissionControlError);

      expect(executor).not.toHaveBeenCalled();
    });

    it('should allow L1 agent to execute L1 action', async () => {
      const agent = {
        id: 'agent-l1',
        name: 'L1 Agent',
        clearanceLevel: ClearanceLevel.L1,
        sessionId: 'session-1',
      };

      const executor = jest.fn().mockResolvedValue({ updated: true });

      const result = await mc.execute(
        ActionType.MODIFY_CONFIG,
        agent,
        { key: 'value' },
        executor
      );

      if ('result' in result) {
        expect(result.result).toEqual({ updated: true });
        expect(result.auditEntry.actionRequest.actionType).toBe(ActionType.MODIFY_CONFIG);
      }
    });

    it('should allow L2 agent to execute L1 action', async () => {
      const agent = {
        id: 'agent-l2',
        name: 'L2 Agent',
        clearanceLevel: ClearanceLevel.L2,
        sessionId: 'session-1',
      };

      const executor = jest.fn().mockResolvedValue({ deployed: true });

      const result = await mc.execute(
        ActionType.DEPLOY_SERVICE,
        agent,
        { service: 'api' },
        executor
      );

      if ('result' in result) {
        expect(result.result).toEqual({ deployed: true });
      }
    });
  });

  describe('L2 Actions', () => {
    it('should require approval for L2 action', async () => {
      const agent = {
        id: 'agent-l2',
        name: 'L2 Agent',
        clearanceLevel: ClearanceLevel.L2,
        sessionId: 'session-1',
      };

      // Register an approver
      mc.registerApprover({
        id: 'approver-1',
        name: 'Test Approver',
        clearanceLevel: ClearanceLevel.L2,
        email: 'approver@test.com',
      });

      const executor = jest.fn().mockResolvedValue({ destroyed: true });

      const result = await mc.execute(
        ActionType.DESTROY_RESOURCE,
        agent,
        { resourceId: 'r-123' },
        executor
      );

      // Should be pending approval
      if ('approvalPending' in result) {
        expect(result.approvalPending).toBe(true);
        expect(result.approvalId).toBeDefined();
      }

      expect(executor).not.toHaveBeenCalled();
    });

    it('should execute L2 action after approval', async () => {
      const agent = {
        id: 'agent-l2',
        name: 'L2 Agent',
        clearanceLevel: ClearanceLevel.L2,
        sessionId: 'session-1',
      };

      const approver = {
        id: 'approver-1',
        name: 'Test Approver',
        clearanceLevel: ClearanceLevel.L2,
        email: 'approver@test.com',
      };

      mc.registerApprover(approver);

      const executor = jest.fn().mockResolvedValue({ destroyed: true });

      // Submit for execution
      const submitResult = await mc.execute(
        ActionType.DESTROY_RESOURCE,
        agent,
        { resourceId: 'r-123' },
        executor
      );

      if ('approvalPending' in submitResult) {
        // Approve the action
        await mc.approveAction(submitResult.approvalId, approver.id);

        // Now execute again - should proceed
        const execResult = await mc.execute(
          ActionType.DESTROY_RESOURCE,
          agent,
          { resourceId: 'r-123' },
          executor
        );

        if ('result' in execResult) {
          expect(execResult.result).toEqual({ destroyed: true });
        }
      }
    });

    it('should not execute rejected L2 action', async () => {
      const agent = {
        id: 'agent-l2',
        name: 'L2 Agent',
        clearanceLevel: ClearanceLevel.L2,
        sessionId: 'session-1',
      };

      const approver = {
        id: 'approver-1',
        name: 'Test Approver',
        clearanceLevel: ClearanceLevel.L2,
        email: 'approver@test.com',
      };

      mc.registerApprover(approver);

      const executor = jest.fn().mockResolvedValue({ destroyed: true });

      // Submit for execution
      const submitResult = await mc.execute(
        ActionType.DESTROY_RESOURCE,
        agent,
        { resourceId: 'r-123' },
        executor
      );

      if ('approvalPending' in submitResult) {
        // Reject the action
        await mc.rejectAction(submitResult.approvalId, approver.id, 'Too risky');

        // Try to execute again - should fail
        await expect(
          mc.execute(ActionType.DESTROY_RESOURCE, agent, { resourceId: 'r-123' }, executor)
        ).rejects.toThrow(MissionControlError);
      }
    });
  });

  describe('Audit Trail', () => {
    it('should record all actions to audit trail', async () => {
      const agent = {
        id: 'agent-l1',
        name: 'L1 Agent',
        clearanceLevel: ClearanceLevel.L1,
        sessionId: 'session-1',
      };

      const executor = jest.fn().mockResolvedValue({});

      await mc.execute(ActionType.READ_PUBLIC, agent, {}, executor);
      await mc.execute(ActionType.QUERY_STATUS, agent, {}, executor);

      const auditTrail = mc.getAuditTrail();
      const entries = auditTrail.getAllEntries();

      expect(entries.length).toBe(2);
    });

    it('should verify audit chain integrity', async () => {
      const agent = {
        id: 'agent-l1',
        name: 'L1 Agent',
        clearanceLevel: ClearanceLevel.L1,
        sessionId: 'session-1',
      };

      const executor = jest.fn().mockResolvedValue({});

      await mc.execute(ActionType.READ_PUBLIC, agent, {}, executor);

      expect(mc.verifyAuditIntegrity()).toBe(true);
    });

    it('should export audit trail', async () => {
      const agent = {
        id: 'agent-l1',
        name: 'L1 Agent',
        clearanceLevel: ClearanceLevel.L1,
        sessionId: 'session-1',
      };

      const executor = jest.fn().mockResolvedValue({});

      await mc.execute(ActionType.READ_PUBLIC, agent, {}, executor);

      const exported = mc.exportAuditTrail();
      const parsed = JSON.parse(exported);

      expect(parsed.genesisHash).toBeDefined();
      expect(parsed.entryCount).toBe(1);
      expect(parsed.chainValid).toBe(true);
    });
  });

  describe('Events', () => {
    it('should emit governance events', async () => {
      const events: any[] = [];
      mc.onEvent(GovernanceEventType.ACTION_EXECUTED, (e) => {
        events.push(e);
      });

      const agent = {
        id: 'agent-l1',
        name: 'L1 Agent',
        clearanceLevel: ClearanceLevel.L1,
        sessionId: 'session-1',
      };

      const executor = jest.fn().mockResolvedValue({});

      await mc.execute(ActionType.READ_PUBLIC, agent, {}, executor);

      expect(events.length).toBe(1);
      expect(events[0].type).toBe(GovernanceEventType.ACTION_EXECUTED);
    });

    it('should emit clearance violation events', async () => {
      const events: any[] = [];
      mc.onEvent(GovernanceEventType.CLEARANCE_VIOLATION, (e) => {
        events.push(e);
      });

      const agent = {
        id: 'agent-l0',
        name: 'L0 Agent',
        clearanceLevel: ClearanceLevel.L0,
        sessionId: 'session-1',
      };

      const executor = jest.fn();

      await expect(
        mc.execute(ActionType.MODIFY_CONFIG, agent, {}, executor)
      ).rejects.toThrow();

      expect(events.length).toBe(1);
      expect(events[0].type).toBe(GovernanceEventType.CLEARANCE_VIOLATION);
      expect(events[0].severity).toBe('critical');
    });

    it('should support event unsubscription', async () => {
      const events: any[] = [];
      const unsubscribe = mc.onEvent(GovernanceEventType.ACTION_EXECUTED, (e) => {
        events.push(e);
      });

      unsubscribe();

      const agent = {
        id: 'agent-l1',
        name: 'L1 Agent',
        clearanceLevel: ClearanceLevel.L1,
        sessionId: 'session-1',
      };

      const executor = jest.fn().mockResolvedValue({});

      await mc.execute(ActionType.READ_PUBLIC, agent, {}, executor);

      expect(events.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should include audit entry in MissionControlError', async () => {
      const agent = {
        id: 'agent-l0',
        name: 'L0 Agent',
        clearanceLevel: ClearanceLevel.L0,
        sessionId: 'session-1',
      };

      const executor = jest.fn();

      try {
        await mc.execute(ActionType.DESTROY_RESOURCE, agent, {}, executor);
        fail('Should have thrown');
      } catch (error) {
        if (error instanceof MissionControlError) {
          expect(error.code).toBe('ENFORCEMENT_REJECTED');
          expect(error.auditEntry).toBeDefined();
        }
      }
    });

    it('should handle executor errors', async () => {
      const agent = {
        id: 'agent-l1',
        name: 'L1 Agent',
        clearanceLevel: ClearanceLevel.L1,
        sessionId: 'session-1',
      };

      const executor = jest.fn().mockRejectedValue(new Error('Execution failed'));

      await expect(
        mc.execute(ActionType.EXECUTE_COMMAND, agent, { cmd: 'test' }, executor)
      ).rejects.toThrow('Execution failed');
    });
  });

  describe('Emergency Stop', () => {
    it('should revoke all pending approvals', async () => {
      const agent = {
        id: 'agent-l2',
        name: 'L2 Agent',
        clearanceLevel: ClearanceLevel.L2,
        sessionId: 'session-1',
      };

      const approver = {
        id: 'approver-1',
        name: 'Test Approver',
        clearanceLevel: ClearanceLevel.L2,
        email: 'approver@test.com',
      };

      mc.registerApprover(approver);

      const executor = jest.fn().mockResolvedValue({});

      // Create multiple pending approvals
      await mc.execute(ActionType.DESTROY_RESOURCE, agent, { id: 1 }, executor);
      await mc.execute(ActionType.TRANSFER_FUNDS, agent, { amount: 100 }, executor);

      const pendingBefore = mc.getPendingApprovals();
      expect(pendingBefore.length).toBe(2);

      // Emergency stop
      await mc.emergencyStop('Security breach detected');

      const pendingAfter = mc.getPendingApprovals();
      expect(pendingAfter.length).toBe(0);
    });

    it('should emit critical event on emergency stop', async () => {
      const events: any[] = [];
      mc.onEvent(GovernanceEventType.ACTION_REJECTED, (e) => {
        events.push(e);
      });

      const agent = {
        id: 'agent-l2',
        name: 'L2 Agent',
        clearanceLevel: ClearanceLevel.L2,
        sessionId: 'session-1',
      };

      const approver = {
        id: 'approver-1',
        name: 'Test Approver',
        clearanceLevel: ClearanceLevel.L2,
        email: 'approver@test.com',
      };

      mc.registerApprover(approver);

      const executor = jest.fn().mockResolvedValue({});
      await mc.execute(ActionType.DESTROY_RESOURCE, agent, {}, executor);

      await mc.emergencyStop('Breach');

      expect(events.length).toBeGreaterThan(0);
      expect(events[events.length - 1].severity).toBe('critical');
    });
  });

  describe('getActiveContexts', () => {
    it('should track active executions', async () => {
      const agent = {
        id: 'agent-l1',
        name: 'L1 Agent',
        clearanceLevel: ClearanceLevel.L1,
        sessionId: 'session-1',
      };

      let resolveExecution: (value: any) => void;
      const executor = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveExecution = resolve;
        });
      });

      const executionPromise = mc.execute(
        ActionType.EXECUTE_COMMAND,
        agent,
        { cmd: 'long-running' },
        executor
      );

      // Should have active context during execution
      await new Promise((resolve) => setTimeout(resolve, 10));
      const activeContexts = mc.getActiveContexts();
      expect(activeContexts.length).toBe(1);
      expect(activeContexts[0].agentId).toBe(agent.id);

      // Complete execution
      resolveExecution({ done: true });
      await executionPromise;

      // Should have no active contexts after completion
      expect(mc.getActiveContexts().length).toBe(0);
    });
  });
});