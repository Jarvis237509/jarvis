/**
 * Digital Office View - Real-time State Management Hook
 * 
 * Custom hook for managing agent status, heartbeats, and real-time updates.
 * Simulates WebSocket/EventSource for live office state.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Agent, TeamZone, OfficeState, OfficeEvent, OfficeEventType, Alert } from './types';
import { initialOfficeState } from './office-data';

interface UseOfficeStateOptions {
  refreshInterval?: number; // ms, default 30000
  heartbeatTimeout?: number; // ms, default 120000 (2 minutes)
  enableSimulatedEvents?: boolean; // default true for demo
}

interface UseOfficeStateReturn {
  state: OfficeState;
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;
  refresh: () => void;
  updateAgentStatus: (agentId: string, status: Agent['status'], task?: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  isConnected: boolean;
  lastUpdate: Date;
}

// Simulated event emitter for demo purposes
class OfficeEventEmitter {
  private listeners: Map<OfficeEventType, Set<(event: OfficeEvent) => void>> = new Map();
  private interval: NodeJS.Timeout | null = null;

  on(event: OfficeEventType, handler: (event: OfficeEvent) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: OfficeEventType, handler: (event: OfficeEvent) => void) {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: OfficeEvent) {
    this.listeners.get(event.type)?.forEach(handler => handler(event));
  }

  startSimulation() {
    if (this.interval) return;
    
    const eventTypes: OfficeEventType[] = [
      'agent:status-changed',
      'task:claimed',
      'task:completed',
      'heartbeat:received',
    ];

    this.interval = setInterval(() => {
      const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const agentIds = ['worf', 'scotty', 'kirk', 'dev-ops-bot', 'sec-bot', 'data-bot'];
      const randomAgent = agentIds[Math.floor(Math.random() * agentIds.length)];
      
      const event: OfficeEvent = {
        type: randomEvent,
        payload: {
          agentId: randomAgent,
          timestamp: new Date(),
          previousStatus: 'idle',
          newStatus: 'working',
          message: `Simulated ${randomEvent}`,
        },
      };

      this.emit(event);
    }, 15000); // Every 15 seconds
  }

  stopSimulation() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

const eventEmitter = new OfficeEventEmitter();

export function useOfficeState(options: UseOfficeStateOptions = {}): UseOfficeStateReturn {
  const {
    refreshInterval = 30000,
    heartbeatTimeout = 120000,
    enableSimulatedEvents = true,
  } = options;

  const [state, setState] = useState<OfficeState>(initialOfficeState);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  const stateRef = useRef(state);
  stateRef.current = state;

  // Update agent heartbeat and check offline status
  const checkHeartbeats = useCallback(() => {
    const now = new Date();
    const updatedAgents = { ...stateRef.current.agents };
    let hasChanges = false;

    Object.values(updatedAgents).forEach((agent) => {
      const timeSinceHeartbeat = now.getTime() - new Date(agent.lastHeartbeat).getTime();
      
      // If no heartbeat for 2 minutes, mark as offline
      if (timeSinceHeartbeat > heartbeatTimeout && agent.status !== 'offline') {
        updatedAgents[agent.id] = {
          ...agent,
          status: 'offline',
        };
        hasChanges = true;
        
        // Generate alert for agent going offline
        const alert: Alert = {
          id: `offline-${agent.id}-${now.getTime()}`,
          agentId: agent.id,
          type: 'warning',
          message: `${agent.name} went offline`,
          timestamp: now,
        };
        
        setState(prev => ({
          ...prev,
          alerts: [alert, ...prev.alerts].slice(0, 50), // Keep last 50
        }));
      }
      
      // Update time on task
      if (agent.status === 'active' || agent.status === 'working') {
        updatedAgents[agent.id] = {
          ...agent,
          timeOnTask: agent.timeOnTask + 0.5, // Approximate
        };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setState(prev => ({ ...prev, agents: updatedAgents }));
    }
    
    setLastUpdate(now);
  }, [heartbeatTimeout]);

  // Manual refresh
  const refresh = useCallback(() => {
    checkHeartbeats();
    setLastUpdate(new Date());
  }, [checkHeartbeats]);

  // Update specific agent status
  const updateAgentStatus = useCallback((agentId: string, status: Agent['status'], task?: string) => {
    setState(prev => {
      const agent = prev.agents[agentId];
      if (!agent) return prev;

      const updatedAgent: Agent = {
        ...agent,
        status,
        currentTask: task || agent.currentTask,
        lastHeartbeat: new Date(),
      };

      return {
        ...prev,
        agents: { ...prev.agents, [agentId]: updatedAgent },
      };
    });
  }, []);

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.map(a => 
        a.id === alertId ? { ...a, acknowledged: true } : a
      ),
    }));
  }, []);

  // Handle events
  useEffect(() => {
    const handleStatusChange = (event: OfficeEvent) => {
      if (event.payload.agentId && event.payload.newStatus) {
        updateAgentStatus(
          event.payload.agentId,
          event.payload.newStatus,
          event.payload.taskId
        );
      }
    };

    const handleTaskClaimed = (event: OfficeEvent) => {
      if (event.payload.agentId) {
        updateAgentStatus(event.payload.agentId, 'working', event.payload.taskId);
      }
    };

    const handleTaskCompleted = (event: OfficeEvent) => {
      if (event.payload.agentId) {
        updateAgentStatus(event.payload.agentId, 'idle');
      }
    };

    const handleHeartbeat = (event: OfficeEvent) => {
      if (event.payload.agentId) {
        setState(prev => {
          const agent = prev.agents[event.payload.agentId!];
          if (!agent) return prev;
          
          return {
            ...prev,
            agents: {
              ...prev.agents,
              [event.payload.agentId!]: {
                ...agent,
                lastHeartbeat: new Date(),
                status: agent.status === 'offline' ? 'idle' : agent.status,
              },
            },
          };
        });
      }
    };

    eventEmitter.on('agent:status-changed', handleStatusChange);
    eventEmitter.on('task:claimed', handleTaskClaimed);
    eventEmitter.on('task:completed', handleTaskCompleted);
    eventEmitter.on('heartbeat:received', handleHeartbeat);

    return () => {
      eventEmitter.off('agent:status-changed', handleStatusChange);
      eventEmitter.off('task:claimed', handleTaskClaimed);
      eventEmitter.off('task:completed', handleTaskCompleted);
      eventEmitter.off('heartbeat:received', handleHeartbeat);
    };
  }, [updateAgentStatus]);

  // Heartbeat check interval
  useEffect(() => {
    const interval = setInterval(checkHeartbeats, refreshInterval);
    return () => clearInterval(interval);
  }, [checkHeartbeats, refreshInterval]);

  // Start simulated events for demo
  useEffect(() => {
    if (enableSimulatedEvents) {
      eventEmitter.startSimulation();
      return () => eventEmitter.stopSimulation();
    }
  }, [enableSimulatedEvents]);

  // Simulate connection status
  useEffect(() => {
    setIsConnected(true);
  }, []);

  return {
    state,
    selectedAgent,
    setSelectedAgent,
    refresh,
    updateAgentStatus,
    acknowledgeAlert,
    isConnected,
    lastUpdate,
  };
}

// Export event emitter for manual event triggering
export { eventEmitter };