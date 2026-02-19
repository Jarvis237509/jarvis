/**
 * Immutable Audit Trail
 * Implements tamper-evident logging with cryptographic chain verification
 */

import { v4 as uuidv4 } from 'v4';
import CryptoJS from 'crypto-js';
import {
  AuditEntry,
  ActionRequest,
  ActionResult,
  AgentIdentity,
  ApprovalRequest,
  GovernanceConfig,
  GovernanceEventType,
  GovernanceEvent,
} from '../types/governance';

/** Audit Entry with chain metadata */
interface ChainEntry extends AuditEntry {
  chainIndex: number;
}

/** Immutable Audit Trail Implementation */
export class AuditTrail {
  private entries: ChainEntry[] = [];
  private config: GovernanceConfig;
  private eventListeners: Map<GovernanceEventType, Set<(event: GovernanceEvent) => void>> = new Map();
  private sequenceCounter = 0;
  private genesisHash: string;

  constructor(config: GovernanceConfig) {
    this.config = config;
    this.genesisHash = this.computeGenesisHash();
  }

  /**
   * Record an action execution to the immutable audit trail
   * Creates cryptographically linked entry
   */
  async record(
    actionRequest: ActionRequest,
    actionResult: ActionResult,
    agentIdentity: AgentIdentity,
    approvalRequest?: ApprovalRequest
  ): Promise<AuditEntry> {
    const sequenceNumber = ++this.sequenceCounter;
    const previousEntry = this.entries[this.entries.length - 1];
    const previousHash = previousEntry ? previousEntry.entryHash : this.genesisHash;

    const entry: ChainEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      sequenceNumber,
      actionRequest,
      actionResult,
      agentIdentity,
      approvalRequest,
      previousHash,
      entryHash: '', // Computed below
      immutableProof: '', // Computed below
      chainIndex: this.entries.length,
    };

    // Compute cryptographic hash of entry
    entry.entryHash = this.computeEntryHash(entry);
    
    // Compute immutable proof (includes previous hash for chain)
    entry.immutableProof = this.computeImmutableProof(entry);

    // Store entry
    this.entries.push(entry);

    // Emit event
    this.emitEvent({
      type: actionResult.success ? GovernanceEventType.ACTION_EXECUTED : GovernanceEventType.ACTION_FAILED,
      timestamp: new Date(),
      payload: { entryId: entry.id, actionType: actionRequest.actionType },
      severity: actionResult.success ? 'info' : 'warning',
    });

    return entry;
  }

  /**
   * Verify the integrity of the entire audit chain
   * Returns true if chain is valid, false if tampering detected
   */
  verifyChain(): boolean {
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const expectedPreviousHash = i === 0 ? this.genesisHash : this.entries[i - 1].entryHash;
      
      // Check previous hash linkage
      if (entry.previousHash !== expectedPreviousHash) {
        this.emitEvent({
          type: GovernanceEventType.AUDIT_TAMPER_DETECTED,
          timestamp: new Date(),
          payload: { 
            entryId: entry.id, 
            sequenceNumber: entry.sequenceNumber,
            reason: 'PREVIOUS_HASH_MISMATCH'
          },
          severity: 'critical',
        });
        return false;
      }

      // Verify entry hash
      const computedHash = this.computeEntryHash(entry);
      if (entry.entryHash !== computedHash) {
        this.emitEvent({
          type: GovernanceEventType.AUDIT_TAMPER_DETECTED,
          timestamp: new Date(),
          payload: { 
            entryId: entry.id, 
            sequenceNumber: entry.sequenceNumber,
            reason: 'ENTRY_HASH_MISMATCH'
          },
          severity: 'critical',
        });
        return false;
      }

      // Verify immutable proof
      const computedProof = this.computeImmutableProof(entry);
      if (entry.immutableProof !== computedProof) {
        this.emitEvent({
          type: GovernanceEventType.AUDIT_TAMPER_DETECTED,
          timestamp: new Date(),
          payload: { 
            entryId: entry.id, 
            sequenceNumber: entry.sequenceNumber,
            reason: 'PROOF_MISMATCH'
          },
          severity: 'critical',
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Get an entry by ID
   */
  getEntry(id: string): AuditEntry | undefined {
    return this.entries.find(e => e.id === id);
  }

  /**
   * Get all entries (immutable copy)
   */
  getAllEntries(): ReadonlyArray<AuditEntry> {
    return Object.freeze([...this.entries]);
  }

  /**
   * Get entries by action type
   */
  getEntriesByActionType(actionType: string): ReadonlyArray<AuditEntry> {
    return Object.freeze(
      this.entries.filter(e => e.actionRequest.actionType === actionType)
    );
  }

  /**
   * Get entries by agent ID
   */
  getEntriesByAgent(agentId: string): ReadonlyArray<AuditEntry> {
    return Object.freeze(
      this.entries.filter(e => e.agentIdentity.id === agentId)
    );
  }

  /**
   * Get entries within time range
   */
  getEntriesByTimeRange(start: Date, end: Date): ReadonlyArray<AuditEntry> {
    return Object.freeze(
      this.entries.filter(
        e => e.timestamp >= start && e.timestamp <= end
      )
    );
  }

  /**
   * Export audit trail to JSON (for backup/analysis)
   */
  exportToJSON(): string {
    return JSON.stringify({
      genesisHash: this.genesisHash,
      entryCount: this.entries.length,
      config: this.config,
      entries: this.entries,
      chainValid: this.verifyChain(),
    }, null, 2);
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

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(type)?.delete(handler);
    };
  }

  /**
   * Get the latest sequence number
   */
  getCurrentSequence(): number {
    return this.sequenceCounter;
  }

  /**
   * Get the last entry hash (for external anchoring)
   */
  getLatestAnchor(): string {
    const lastEntry = this.entries[this.entries.length - 1];
    return lastEntry ? lastEntry.entryHash : this.genesisHash;
  }

  /** Compute genesis hash from config */
  private computeGenesisHash(): string {
    const configString = JSON.stringify({
      algorithm: this.config.hashAlgorithm,
      retention: this.config.auditRetentionDays,
      created: Date.now(),
    });
    return this.hash(configString);
  }

  /** Compute hash for an entry */
  private computeEntryHash(entry: Omit<ChainEntry, 'entryHash' | 'immutableProof'>): string {
    const hashData = {
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      sequenceNumber: entry.sequenceNumber,
      actionRequestId: entry.actionRequest.id,
      actionResultSuccess: entry.actionResult.success,
      agentId: entry.agentIdentity.id,
      previousHash: entry.previousHash,
    };
    return this.hash(JSON.stringify(hashData));
  }

  /** Compute immutable proof (includes entry hash and chain linkage) */
  private computeImmutableProof(entry: ChainEntry): string {
    const proofData = {
      entryHash: entry.entryHash,
      previousHash: entry.previousHash,
      sequenceNumber: entry.sequenceNumber,
      timestamp: entry.timestamp.toISOString(),
    };
    return this.hash(JSON.stringify(proofData));
  }

  /** Hash function using configured algorithm */
  private hash(data: string): string {
    switch (this.config.hashAlgorithm) {
      case 'SHA-256':
        return CryptoJS.SHA256(data).toString();
      case 'SHA-384':
        return CryptoJS.SHA384(data).toString();
      case 'SHA-512':
        return CryptoJS.SHA512(data).toString();
      default:
        return CryptoJS.SHA256(data).toString();
    }
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