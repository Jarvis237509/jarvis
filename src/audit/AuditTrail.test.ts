/**
 * Audit Trail Tests
 */

import { AuditTrail } from './AuditTrail';
import {
  GovernanceConfig,
  ActionRequest,
  ActionResult,
  AgentIdentity,
  ClearanceLevel,
  ActionType,
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

const mockAgent: AgentIdentity = {
  id: 'agent-1',
  name: 'Test Agent',
  clearanceLevel: ClearanceLevel.L1,
  sessionId: 'session-1',
};

const createMockActionRequest = (id: string): ActionRequest => ({
  id,
  actionType: ActionType.READ_PUBLIC,
  agentId: mockAgent.id,
  timestamp: new Date(),
  payload: { test: true },
});

const createMockActionResult = (requestId: string, success = true): ActionResult => ({
  success,
  requestId,
  timestamp: new Date(),
  output: success ? { result: 'ok' } : undefined,
  error: success ? undefined : 'error',
});

describe('AuditTrail', () => {
  let auditTrail: AuditTrail;

  beforeEach(() => {
    auditTrail = new AuditTrail(mockConfig);
  });

  describe('record', () => {
    it('should record an entry with sequence number', async () => {
      const request = createMockActionRequest('req-1');
      const result = createMockActionResult('req-1');

      const entry = await auditTrail.record(request, result, mockAgent);

      expect(entry.sequenceNumber).toBe(1);
      expect(entry.actionRequest).toEqual(request);
      expect(entry.actionResult).toEqual(result);
      expect(entry.agentIdentity).toEqual(mockAgent);
      expect(entry.entryHash).toBeDefined();
      expect(entry.immutableProof).toBeDefined();
    });

    it('should increment sequence numbers', async () => {
      const request1 = createMockActionRequest('req-1');
      const request2 = createMockActionRequest('req-2');
      const result1 = createMockActionResult('req-1');
      const result2 = createMockActionResult('req-2');

      const entry1 = await auditTrail.record(request1, result1, mockAgent);
      const entry2 = await auditTrail.record(request2, result2, mockAgent);

      expect(entry1.sequenceNumber).toBe(1);
      expect(entry2.sequenceNumber).toBe(2);
    });

    it('should chain entries with previous hash', async () => {
      const request1 = createMockActionRequest('req-1');
      const request2 = createMockActionRequest('req-2');
      const result1 = createMockActionResult('req-1');
      const result2 = createMockActionResult('req-2');

      const entry1 = await auditTrail.record(request1, result1, mockAgent);
      const entry2 = await auditTrail.record(request2, result2, mockAgent);

      expect(entry2.previousHash).toBe(entry1.entryHash);
    });
  });

  describe('verifyChain', () => {
    it('should return true for valid chain', async () => {
      const request = createMockActionRequest('req-1');
      const result = createMockActionResult('req-1');

      await auditTrail.record(request, result, mockAgent);

      expect(auditTrail.verifyChain()).toBe(true);
    });

    it('should return true for empty chain', () => {
      expect(auditTrail.verifyChain()).toBe(true);
    });

    it('should detect tampering', async () => {
      const request = createMockActionRequest('req-1');
      const result = createMockActionResult('req-1');

      await auditTrail.record(request, result, mockAgent);

      // Tamper with the internal state
      const entries = (auditTrail as any).entries;
      entries[0].entryHash = 'tampered-hash';

      let tamperDetected = false;
      auditTrail.onEvent(GovernanceEventType.AUDIT_TAMPER_DETECTED, () => {
        tamperDetected = true;
      });

      expect(auditTrail.verifyChain()).toBe(false);
      expect(tamperDetected).toBe(true);
    });
  });

  describe('getEntry', () => {
    it('should retrieve entry by ID', async () => {
      const request = createMockActionRequest('req-1');
      const result = createMockActionResult('req-1');

      const entry = await auditTrail.record(request, result, mockAgent);
      const retrieved = auditTrail.getEntry(entry.id);

      expect(retrieved).toEqual(entry);
    });

    it('should return undefined for unknown ID', () => {
      expect(auditTrail.getEntry('unknown')).toBeUndefined();
    });
  });

  describe('getAllEntries', () => {
    it('should return all entries', async () => {
      const request1 = createMockActionRequest('req-1');
      const request2 = createMockActionRequest('req-2');
      const result1 = createMockActionResult('req-1');
      const result2 = createMockActionResult('req-2');

      await auditTrail.record(request1, result1, mockAgent);
      await auditTrail.record(request2, result2, mockAgent);

      const entries = auditTrail.getAllEntries();
      expect(entries.length).toBe(2);
    });

    it('should return immutable array', async () => {
      const request = createMockActionRequest('req-1');
      const result = createMockActionResult('req-1');

      await auditTrail.record(request, result, mockAgent);

      const entries = auditTrail.getAllEntries();
      expect(Object.isFrozen(entries)).toBe(true);
    });
  });

  describe('getEntriesByActionType', () => {
    it('should filter entries by action type', async () => {
      const request1: ActionRequest = {
        ...createMockActionRequest('req-1'),
        actionType: ActionType.READ_PUBLIC,
      };
      const request2: ActionRequest = {
        ...createMockActionRequest('req-2'),
        actionType: ActionType.MODIFY_CONFIG,
      };
      const result1 = createMockActionResult('req-1');
      const result2 = createMockActionResult('req-2');

      await auditTrail.record(request1, result1, mockAgent);
      await auditTrail.record(request2, result2, mockAgent);

      const readEntries = auditTrail.getEntriesByActionType(ActionType.READ_PUBLIC);
      expect(readEntries.length).toBe(1);
      expect(readEntries[0].actionRequest.actionType).toBe(ActionType.READ_PUBLIC);
    });
  });

  describe('getEntriesByAgent', () => {
    it('should filter entries by agent ID', async () => {
      const request = createMockActionRequest('req-1');
      const result = createMockActionResult('req-1');

      await auditTrail.record(request, result, mockAgent);

      const entries = auditTrail.getEntriesByAgent(mockAgent.id);
      expect(entries.length).toBe(1);
    });
  });

  describe('exportToJSON', () => {
    it('should export valid JSON', async () => {
      const request = createMockActionRequest('req-1');
      const result = createMockActionResult('req-1');

      await auditTrail.record(request, result, mockAgent);

      const json = auditTrail.exportToJSON();
      const parsed = JSON.parse(json);

      expect(parsed.genesisHash).toBeDefined();
      expect(parsed.entryCount).toBe(1);
      expect(parsed.chainValid).toBe(true);
      expect(parsed.entries).toHaveLength(1);
    });
  });

  describe('events', () => {
    it('should emit ACTION_EXECUTED event', async () => {
      const events: any[] = [];
      auditTrail.onEvent(GovernanceEventType.ACTION_EXECUTED, (e) => {
        events.push(e);
      });

      const request = createMockActionRequest('req-1');
      const result = createMockActionResult('req-1', true);

      await auditTrail.record(request, result, mockAgent);

      expect(events.length).toBe(1);
      expect(events[0].type).toBe(GovernanceEventType.ACTION_EXECUTED);
    });

    it('should emit ACTION_FAILED event', async () => {
      const events: any[] = [];
      auditTrail.onEvent(GovernanceEventType.ACTION_FAILED, (e) => {
        events.push(e);
      });

      const request = createMockActionRequest('req-1');
      const result = createMockActionResult('req-1', false);

      await auditTrail.record(request, result, mockAgent);

      expect(events.length).toBe(1);
      expect(events[0].type).toBe(GovernanceEventType.ACTION_FAILED);
    });

    it('should support unsubscribe', async () => {
      const events: any[] = [];
      const unsubscribe = auditTrail.onEvent(GovernanceEventType.ACTION_EXECUTED, (e) => {
        events.push(e);
      });

      unsubscribe();

      const request = createMockActionRequest('req-1');
      const result = createMockActionResult('req-1');

      await auditTrail.record(request, result, mockAgent);

      expect(events.length).toBe(0);
    });
  });

  describe('getCurrentSequence', () => {
    it('should return current sequence number', async () => {
      expect(auditTrail.getCurrentSequence()).toBe(0);

      const request = createMockActionRequest('req-1');
      const result = createMockActionResult('req-1');

      await auditTrail.record(request, result, mockAgent);

      expect(auditTrail.getCurrentSequence()).toBe(1);
    });
  });

  describe('getLatestAnchor', () => {
    it('should return genesis hash for empty trail', () => {
      const anchor = auditTrail.getLatestAnchor();
      expect(anchor).toBeDefined();
      expect(typeof anchor).toBe('string');
    });

    it('should return last entry hash', async () => {
      const request = createMockActionRequest('req-1');
      const result = createMockActionResult('req-1');

      const entry = await auditTrail.record(request, result, mockAgent);

      expect(auditTrail.getLatestAnchor()).toBe(entry.entryHash);
    });
  });
});