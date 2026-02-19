/**
 * Governance Types Tests
 */

import {
  ClearanceLevel,
  ActionType,
  ApprovalStatus,
  GovernanceEventType,
  ACTION_CLEARANCE_MAP,
} from './governance';

describe('Governance Types', () => {
  describe('ACTION_CLEARANCE_MAP', () => {
    it('should map all L0 actions correctly', () => {
      expect(ACTION_CLEARANCE_MAP[ActionType.READ_PUBLIC]).toBe(ClearanceLevel.L0);
      expect(ACTION_CLEARANCE_MAP[ActionType.QUERY_STATUS]).toBe(ClearanceLevel.L0);
      expect(ACTION_CLEARANCE_MAP[ActionType.LIST_RESOURCES]).toBe(ClearanceLevel.L0);
    });

    it('should map all L1 actions correctly', () => {
      expect(ACTION_CLEARANCE_MAP[ActionType.MODIFY_CONFIG]).toBe(ClearanceLevel.L1);
      expect(ACTION_CLEARANCE_MAP[ActionType.DEPLOY_SERVICE]).toBe(ClearanceLevel.L1);
      expect(ACTION_CLEARANCE_MAP[ActionType.MANAGE_SECRETS]).toBe(ClearanceLevel.L1);
      expect(ACTION_CLEARANCE_MAP[ActionType.EXECUTE_COMMAND]).toBe(ClearanceLevel.L1);
    });

    it('should map all L2 actions correctly', () => {
      expect(ACTION_CLEARANCE_MAP[ActionType.DESTROY_RESOURCE]).toBe(ClearanceLevel.L2);
      expect(ACTION_CLEARANCE_MAP[ActionType.MODIFY_PRODUCTION]).toBe(ClearanceLevel.L2);
      expect(ACTION_CLEARANCE_MAP[ActionType.TRANSFER_FUNDS]).toBe(ClearanceLevel.L2);
      expect(ACTION_CLEARANCE_MAP[ActionType.DELETE_AUDIT_LOG]).toBe(ClearanceLevel.L2);
      expect(ACTION_CLEARANCE_MAP[ActionType.ESCALATE_PRIVILEGES]).toBe(ClearanceLevel.L2);
      expect(ACTION_CLEARANCE_MAP[ActionType.EXECUTE_ARBITRARY]).toBe(ClearanceLevel.L2);
    });
  });

  describe('Enums', () => {
    it('should have correct ClearanceLevel values', () => {
      expect(ClearanceLevel.L0).toBe('L0');
      expect(ClearanceLevel.L1).toBe('L1');
      expect(ClearanceLevel.L2).toBe('L2');
    });

    it('should have correct ApprovalStatus values', () => {
      expect(ApprovalStatus.PENDING).toBe('PENDING');
      expect(ApprovalStatus.APPROVED).toBe('APPROVED');
      expect(ApprovalStatus.REJECTED).toBe('REJECTED');
      expect(ApprovalStatus.EXPIRED).toBe('EXPIRED');
      expect(ApprovalStatus.REVOKED).toBe('REVOKED');
    });

    it('should have correct GovernanceEventType values', () => {
      expect(GovernanceEventType.ACTION_REQUESTED).toBe('ACTION_REQUESTED');
      expect(GovernanceEventType.ACTION_APPROVED).toBe('ACTION_APPROVED');
      expect(GovernanceEventType.ACTION_REJECTED).toBe('ACTION_REJECTED');
      expect(GovernanceEventType.ACTION_EXECUTED).toBe('ACTION_EXECUTED');
      expect(GovernanceEventType.ACTION_FAILED).toBe('ACTION_FAILED');
      expect(GovernanceEventType.CLEARANCE_VIOLATION).toBe('CLEARANCE_VIOLATION');
      expect(GovernanceEventType.APPROVAL_TIMEOUT).toBe('APPROVAL_TIMEOUT');
      expect(GovernanceEventType.AUDIT_TAMPER_DETECTED).toBe('AUDIT_TAMPER_DETECTED');
    });
  });
});