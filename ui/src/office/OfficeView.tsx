/**
 * OfficeView Component - Main Container
 * 
 * The main Digital Office view showing all agents in their respective team zones.
 * Includes navigation, filtering, real-time updates, and agent detail modal.
 */

import React, { useState, useMemo } from 'react';
import { Agent, TeamId, ViewMode, FilterOptions } from './types';
import { useOfficeState } from './useOfficeState';
import { teams } from './office-data';
import CeoOffice from './CeoOffice';
import TeamZone from './TeamZone';
import StatusIndicator from './StatusIndicator';

interface OfficeViewProps {
  refreshInterval?: number;
}

interface AgentDetailModalProps {
  agent: Agent;
  onClose: () => void;
  onAssignTask: (agentId: string) => void;
}

const AgentDetailModal: React.FC<AgentDetailModalProps> = ({ agent, onClose, onAssignTask }) => {
  if (!agent) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-3xl">
              {agent.avatar}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{agent.name}</h2>
              <p className="text-sm text-gray-500">{agent.role}</p>
              <div className="mt-1">
                <StatusIndicator status={agent.status} size="sm" />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Team</p>
                <p className="font-medium">{teams[agent.team]?.name || agent.team}</p>
              </div>
              <div>
                <p className="text-gray-500">Clearance</p>
                <p className="font-medium">{agent.clearanceLevel}</p>
              </div>
              <div>
                <p className="text-gray-500">Tasks Today</p>
                <p className="font-medium">{agent.tasksToday || 0} completed</p>
              </div>
              <div>
                <p className="text-gray-500">Uptime</p>
                <p className="font-medium">{agent.uptime?.toFixed(1) || '99.0'}%</p>
              </div>
            </div>
          </div>

          {agent.currentTask && (
            <div>
              <p className="text-gray-500 text-sm mb-1">Current Task</p>
              <p className="font-medium">{agent.currentTask}</p>
              {agent.taskId && (
                <p className="text-sm text-gray-400">#{agent.taskId}</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onAssignTask(agent.id)}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Assign Task
            </button>
            <button
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const OfficeView: React.FC<OfficeViewProps> = ({ refreshInterval = 30000 }) => {
  const { state, selectedAgent, setSelectedAgent, refresh, isConnected, lastUpdate } = useOfficeState({
    refreshInterval,
  });

  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    team: 'all',
    search: '',
    showOffline: true,
  });
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);

  // Get CEO agent
  const ceoAgent = state.agents['ran'];

  // Filter agents
  const filteredAgents = useMemo(() => {
    return Object.values(state.agents).filter((agent) => {
      // Skip CEO in team lists
      if (agent.team === 'ceo') return false;

      // Status filter
      if (filters.status !== 'all' && agent.status !== filters.status) return false;

      // Team filter
      if (filters.team !== 'all' && agent.team !== filters.team) return false;

      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchName = agent.name.toLowerCase().includes(search);
        const matchRole = agent.role.toLowerCase().includes(search);
        if (!matchName && !matchRole) return false;
      }

      // Show offline toggle
      if (!filters.showOffline && agent.status === 'offline') return false;

      // Alerts only
      if (showAlertsOnly && agent.status !== 'alert') return false;

      return true;
    });
  }, [state.agents, filters, showAlertsOnly]);

  // Group agents by team
  const agentsByTeam = useMemo(() => {
    const grouped: Record<TeamId, Agent[]> = {
      worf: [],
      scotty: [],
      kirk: [],
      data: [],
      security: [],
    };

    filteredAgents.forEach((agent) => {
      if (grouped[agent.team]) {
        grouped[agent.team].push(agent);
      }
    });

    return grouped;
  }, [filteredAgents]);

  // Calculate team stats
  const teamStats = useMemo(() => {
    const all = Object.values(state.agents);
    return {
      totalAgents: all.length,
      activeAgents: all.filter(a => a.status === 'active' || a.status === 'working').length,
      offlineAgents: all.filter(a => a.status === 'offline').length,
      alertsCount: all.filter(a => a.status === 'alert').length,
    };
  }, [state.agents]);

  // Handle agent click
  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  // Handle assign task
  const handleAssignTask = (agentId: string) => {
    console.log(`Assigning task to ${agentId}`);
    setSelectedAgent(null);
  };

  // Unacknowledged alerts
  const activeAlerts = state.alerts.filter((a) => !a.acknowledged);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🏢 Digital Office</h1>
            <p className="text-gray-500">Real-time visibility into OpenClaw agent activity</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection status */}
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span className="text-gray-500">{isConnected ? 'Live' : 'Disconnected'}</span>
            </div>

            {/* Refresh button */}
            <button
              onClick={refresh}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              🔄
            </button>

            {/* Last update */}
            <span className="text-xs text-gray-400">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Navigation & Toolbar */}
        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
          {/* View Mode Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(['overview', 'teams', 'tasks', 'audit'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${viewMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="flex items-center gap-2">
            <span>🔍</span>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search agents..."
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters */}
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as any }))}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">🟢 Active</option>
            <option value="working">🟡 Working</option>
            <option value="idle">🔴 Idle</option>
            <option value="paused">⏸️ Paused</option>
            <option value="alert">⚠️ Alert</option>
            <option value="offline">⚫ Offline</option>
          </select>

          {/* Alerts Toggle */}
          <button
            onClick={() => setShowAlertsOnly(!showAlertsOnly)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${showAlertsOnly
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            🔔 {showAlertsOnly ? 'Alerts Only' : 'All'}
            {activeAlerts.length > 0 && (
              <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {activeAlerts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* CEO Office */}
      <CeoOffice
        agent={ceoAgent}
        onClick={handleAgentClick}
        teamStats={teamStats}
        className="mb-6"
      />

      {/* Team Layout - Two columns for Worf and Scotty */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TeamZone
          team={teams.worf}
          agents={agentsByTeam.worf}
          onAgentClick={handleAgentClick}
          selectedAgentId={selectedAgent?.id}
        />
        <TeamZone
          team={teams.scotty}
          agents={agentsByTeam.scotty}
          onAgentClick={handleAgentClick}
          selectedAgentId={selectedAgent?.id}
        />
      </div>

      {/* Kirk Team - Full width */}
      <TeamZone
        team={teams.kirk}
        agents={agentsByTeam.kirk}
        onAgentClick={handleAgentClick}
        selectedAgentId={selectedAgent?.id}
      />

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onAssignTask={handleAssignTask}
        />
      )}
    </div>
  );
};

export default OfficeView;