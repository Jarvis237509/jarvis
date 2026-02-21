/**
 * Digital Office View - Agent Data & Configuration
 * 
 * Initial data for all OpenClaw agents and team configurations.
 */

import { Agent, TeamZone, OfficeState } from './types';

// C-Suite Avatars (emoji-based for now, can be replaced with images)
const AVATARS = {
  ran: '👤',
  worf: '🛡️',
  scotty: '🔧',
  kirk: '⭐',
  spock: '🖖',
  data: '🤖',
  jarvis: '🎯',
  security: '🔒',
  developer: '👨‍💻',
  auditor: '📋',
  governance: '⚖️',
  researcher: '🔍',
  strategist: '📊',
  risk: '⚠️',
  systems: '🖥️',
  database: '💾',
};

// Initial agent data
export const initialAgents: Record<string, Agent> = {
  // CEO
  'ran': {
    id: 'ran',
    name: 'Ran',
    role: 'CEO',
    team: 'ceo',
    avatar: AVATARS.ran,
    status: 'active',
    currentTask: 'Reviewing Team Performance',
    taskId: 'TASK-001',
    timeOnTask: 45,
    lastHeartbeat: new Date(),
    clearanceLevel: 'L2',
    tasksToday: 12,
    uptime: 99.9,
  },

  // Team Worf - Operations Center
  'worf': {
    id: 'worf',
    name: 'Worf',
    role: 'COO',
    team: 'worf',
    avatar: AVATARS.worf,
    status: 'active',
    currentTask: 'Reviewing PR #45',
    taskId: 'PR-45',
    timeOnTask: 12,
    lastHeartbeat: new Date(),
    clearanceLevel: 'L2',
    tasksToday: 8,
    uptime: 99.7,
  },
  'sec-bot': {
    id: 'sec-bot',
    name: 'SecBot',
    role: 'Security Bot',
    team: 'worf',
    avatar: AVATARS.security,
    status: 'working',
    currentTask: 'Monitoring Security Alerts',
    taskId: 'SEC-001',
    timeOnTask: 120,
    lastHeartbeat: new Date(),
    clearanceLevel: 'L2',
    tasksToday: 24,
    uptime: 99.8,
  },
  'gov-bot': {
    id: 'gov-bot',
    name: 'GovBot',
    role: 'Governance Bot',
    team: 'worf',
    avatar: AVATARS.governance,
    status: 'active',
    currentTask: 'Enforcing L2 Policies',
    taskId: 'GOV-003',
    timeOnTask: 35,
    lastHeartbeat: new Date(),
    clearanceLevel: 'L2',
    tasksToday: 15,
    uptime: 99.5,
  },
  'audit-bot': {
    id: 'audit-bot',
    name: 'AuditBot',
    role: 'Audit Bot',
    team: 'worf',
    avatar: AVATARS.auditor,
    status: 'active',
    currentTask: 'Verifying Audit Chain',
    taskId: 'AUDIT-007',
    timeOnTask: 18,
    lastHeartbeat: new Date(),
    clearanceLevel: 'L2',
    tasksToday: 6,
    uptime: 99.9,
  },

  // Team Scotty - Tech Lab
  'scotty': {
    id: 'scotty',
    name: 'Scotty',
    role: 'CTO',
    team: 'scotty',
    avatar: AVATARS.scotty,
    status: 'active',
    currentTask: 'Optimizing Deployment Pipeline',
    taskId: 'DEV-012',
    timeOnTask: 28,
    lastHeartbeat: new Date(),
    clearanceLevel: 'L2',
    tasksToday: 9,
    uptime: 99.6,
  },
  'dev-ops-bot': {
    id: 'dev-ops-bot',
    name: 'DevOpsBot',
    role: 'DevOps Bot',
    team: 'scotty',
    avatar: AVATARS.developer,
    status: 'active',
    currentTask: 'Deploying Services',
    taskId: 'DEPLOY-003',
    timeOnTask: 8,
    lastHeartbeat: new Date(),
    clearanceLevel: 'L1',
    tasksToday: 22,
    uptime: 99.4,
  },
  'sys-bot': {
    id: 'sys-bot',
    name: 'SysBot',
    role: 'Systems Bot',
    team: 'scotty',
    avatar: AVATARS.systems,
    status: 'idle',
    currentTask: 'Waiting for tasks...',
    taskId: undefined,
    timeOnTask: 0,
    lastHeartbeat: new Date(Date.now() - 5 * 60 * 1000), // Idle for 5 min
    clearanceLevel: 'L1',
    tasksToday: 14,
    uptime: 98.9,
  },
  'data-bot': {
    id: 'data-bot',
    name: 'DataBot',
    role: 'Data Bot',
    team: 'scotty',
    avatar: AVATARS.database,
    status: 'active',
    currentTask: 'Processing Analytics',
    taskId: 'DATA-034',
    timeOnTask: 55,
    lastHeartbeat: new Date(),
    clearanceLevel: 'L1',
    tasksToday: 18,
    uptime: 99.2,
  },

  // Team Kirk - Strategy Room
  'kirk': {
    id: 'kirk',
    name: 'Kirk',
    role: 'CSO',
    team: 'kirk',
    avatar: AVATARS.kirk,
    status: 'active',
    currentTask: 'Strategic Planning Session',
    taskId: 'STRAT-008',
    timeOnTask: 90,
    lastHeartbeat: new Date(),
    clearanceLevel: 'L2',
    tasksToday: 5,
    uptime: 99.8,
  },
  'research-bot': {
    id: 'research-bot',
    name: 'ResearchBot',
    role: 'Research Bot',
    team: 'kirk',
    avatar: AVATARS.researcher,
    status: 'active',
    currentTask: 'Competitive Analysis',
    taskId: 'RES-021',
    timeOnTask: 42,
    lastHeartbeat: new Date(),
    clearanceLevel: 'L0',
    tasksToday: 11,
    uptime: 99.3,
  },
  'strat-bot': {
    id: 'strat-bot',
    name: 'StratBot',
    role: 'Strategy Bot',
    team: 'kirk',
    avatar: AVATARS.strategist,
    status: 'working',
    currentTask: 'Reviewing Quarterly OKRs',
    taskId: 'OKR-004',
    timeOnTask: 65,
    lastHeartbeat: new Date(),
    clearanceLevel: 'L1',
    tasksToday: 7,
    uptime: 99.1,
  },
  'risk-bot': {
    id: 'risk-bot',
    name: 'RiskBot',
    role: 'Risk Assessment Bot',
    team: 'kirk',
    avatar: AVATARS.risk,
    status: 'active',
    currentTask: 'Risk Analysis: PR #42',
    taskId: 'RISK-011',
    timeOnTask: 22,
    lastHeartbeat: new Date(),
    clearanceLevel: 'L1',
    tasksToday: 13,
    uptime: 99.6,
  },
};

// Team zone configurations
export const teams: Record<string, TeamZone> = {
  'ceo': {
    id: 'ceo',
    name: 'CEO Office',
    description: 'Executive Command Center',
    color: '#FFD700',
    agents: ['ran'],
  },
  'worf': {
    id: 'worf',
    name: 'Team Worf',
    description: 'Operations Center',
    color: '#E53935',
    agents: ['worf', 'sec-bot', 'gov-bot', 'audit-bot'],
  },
  'scotty': {
    id: 'scotty',
    name: 'Team Scotty',
    description: 'Tech Lab',
    color: '#1976D2',
    agents: ['scotty', 'dev-ops-bot', 'sys-bot', 'data-bot'],
  },
  'kirk': {
    id: 'kirk',
    name: 'Team Kirk',
    description: 'Strategy Room',
    color: '#7B1FA2',
    agents: ['kirk', 'research-bot', 'strat-bot', 'risk-bot'],
  },
};

// Initial office state
export const initialOfficeState: OfficeState = {
  agents: initialAgents,
  teams: teams,
  alerts: [],
};

// Status configuration for UI display
export const statusConfig = {
  active: {
    label: 'Active',
    color: '#4CAF50',
    bgColor: 'rgba(76, 175, 80, 0.1)',
    emoji: '🟢',
    description: 'Currently working on task',
  },
  working: {
    label: 'Working',
    color: '#FFC107',
    bgColor: 'rgba(255, 193, 7, 0.1)',
    emoji: '🟡',
    description: 'Processing, executing',
  },
  idle: {
    label: 'Idle',
    color: '#F44336',
    bgColor: 'rgba(244, 67, 54, 0.1)',
    emoji: '🔴',
    description: 'Waiting, no current task',
  },
  paused: {
    label: 'Paused',
    color: '#9E9E9E',
    bgColor: 'rgba(158, 158, 158, 0.1)',
    emoji: '⏸️',
    description: 'Break, standby',
  },
  alert: {
    label: 'Alert',
    color: '#FF5722',
    bgColor: 'rgba(255, 87, 34, 0.1)',
    emoji: '⚠️',
    description: 'Error, needs attention',
  },
  offline: {
    label: 'Offline',
    color: '#424242',
    bgColor: 'rgba(66, 66, 66, 0.1)',
    emoji: '⚫',
    description: 'Agent not running',
  },
};

// Team color schemes
export const teamColors = {
  ceo: {
    primary: '#FFD700',
    secondary: '#FFA000',
    background: 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)',
  },
  worf: {
    primary: '#E53935',
    secondary: '#B71C1C',
    background: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)',
  },
  scotty: {
    primary: '#1976D2',
    secondary: '#0D47A1',
    background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
  },
  kirk: {
    primary: '#7B1FA2',
    secondary: '#4A148C',
    background: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)',
  },
};

// Clearance level display
export const clearanceConfig = {
  L0: { label: 'Public', color: '#4CAF50', icon: '🔓' },
  L1: { label: 'Standard', color: '#2196F3', icon: '🔑' },
  L2: { label: 'Critical', color: '#F44336', icon: '🔒' },
};