/**
 * TeamZone Component
 * 
 * Team grouping component showing all agents in a team's area.
 * Supports multiple layouts (grid, list) and team color themes.
 */

import React from 'react';
import { Agent, TeamZone as TeamZoneType } from './types';
import { teamColors } from './office-data';
import Workstation from './Workstation';

interface TeamZoneProps {
  team: TeamZoneType;
  agents: Agent[];
  onAgentClick?: (agent: Agent) => void;
  selectedAgentId?: string | null;
  layout?: 'grid' | 'list';
  className?: string;
}

export const TeamZone: React.FC<TeamZoneProps> = ({
  team,
  agents,
  onAgentClick,
  selectedAgentId,
  layout = 'grid',
  className = '',
}) => {
  const teamColor = teamColors[team.id];
  const activeCount = agents.filter(a => a.status === 'active' || a.status === 'working').length;
  const offlineCount = agents.filter(a => a.status === 'offline').length;
  const alertCount = agents.filter(a => a.status === 'alert').length;

  return (
    <div
      className={`
        rounded-2xl
        border-2
        overflow-hidden
        ${className}
      `}
      style={{
        borderColor: teamColor?.primary || '#e0e0e0',
        background: teamColor?.background || '#f5f5f5',
      }}
    >
      {/* Team Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{
          background: `linear-gradient(90deg, ${teamColor?.primary}20 0%, transparent 100%)`,
          borderBottom: `2px solid ${teamColor?.primary}30`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: teamColor?.primary }}
          />
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {team.name}
            </h2>
            <p className="text-sm text-gray-600">
              {team.description}
            </p>
          </div>
        </div>

        {/* Team Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-green-500">🟢</span>
            <span className="font-medium">{activeCount}</span>
          </div>
          {alertCount > 0 && (
            <div className="flex items-center gap-1 animate-pulse">
              <span className="text-orange-500">⚠️</span>
              <span className="font-medium text-orange-600">{alertCount}</span>
            </div>
          )}
          {offlineCount > 0 && (
            <div className="flex items-center gap-1">
              <span>⚫</span>
              <span className="text-gray-500">{offlineCount}</span>
            </div>
          )}
          <div className="text-gray-400">
            | {agents.length} agents
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div
        className={`
          p-6
          ${layout === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
            : 'flex flex-col gap-3'
          }
        `}
      >
        {agents.map((agent) => (
          <Workstation
            key={agent.id}
            agent={agent}
            onClick={onAgentClick}
            isSelected={selectedAgentId === agent.id}
          />
        ))}
      </div>

      {/* Empty State */}
      {agents.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <p className="text-lg">👻 No agents in this team</p>
          <p className="text-sm mt-1">Agents will appear here when they come online</p>
        </div>
      )}
    </div>
  );
};

export default TeamZone;