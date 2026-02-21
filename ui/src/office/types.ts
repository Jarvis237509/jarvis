/**
 * Digital Office View - Type Definitions
 * 
 * TypeScript interfaces for the OpenClaw agent office visualization system.
 */

export type AgentStatus = 'active' | 'working' | 'idle' | 'paused' | 'alert' | 'offline';
export type ClearanceLevel = 'L0' | 'L1' | 'L2';

export interface Agent {
  id: string;
  name: string;
  role: string;
  team: TeamId;
  avatar: string;
  status: AgentStatus;
  currentTask?: string;
  taskId?: string;
  timeOnTask: number; // minutes
  lastHeartbeat: Date;
  clearanceLevel: ClearanceLevel;
  tasksToday?: number;
  uptime?: number; // percentage
}

export type TeamId = 'ceo' | 'worf' | 'scotty' | 'kirk' | 'data' | 'security';

export interface TeamZone {
  id: TeamId;
  name: string;
  description: string;
  color: string;
  agents: string[]; // Agent IDs
}

export interface Alert {
  id: string;
  agentId: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  acknowledged?: boolean;
}

export interface OfficeState {
  agents: Record<string, Agent>;
  teams: Record<TeamId, TeamZone>;
  alerts: Alert[];
}

export interface WorkstationProps {
  agent: Agent;
  onClick?: (agent: Agent) => void;
  isSelected?: boolean;
}

export interface TeamZoneProps {
  team: TeamZone;
  agents: Agent[];
  onAgentClick?: (agent: Agent) => void;
  selectedAgentId?: string | null;
}

export interface AgentAvatarProps {
  agent: Agent;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  animate?: boolean;
}

export interface StatusIndicatorProps {
  status: AgentStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export interface CeoOfficeProps {
  agent?: Agent;
  onClick?: (agent: Agent) => void;
}

export interface OfficeViewProps {
  refreshInterval?: number; // ms, default 30000
  onAgentSelect?: (agent: Agent) => void;
  filterStatus?: AgentStatus | 'all';
  searchQuery?: string;
}

// Event types for real-time updates
export type OfficeEventType = 
  | 'agent:status-changed'
  | 'task:claimed'
  | 'task:completed'
  | 'heartbeat:received'
  | 'heartbeat:missed'
  | 'alert:generated'
  | 'task:assigned';

export interface OfficeEvent {
  type: OfficeEventType;
  payload: {
    agentId?: string;
    taskId?: string;
    previousStatus?: AgentStatus;
    newStatus?: AgentStatus;
    timestamp: Date;
    message?: string;
  };
}

// Navigation view modes
export type ViewMode = 'overview' | 'teams' | 'tasks' | 'audit';

// Filter options
export interface FilterOptions {
  status: AgentStatus | 'all';
  team: TeamId | 'all';
  search: string;
  showOffline: boolean;
}