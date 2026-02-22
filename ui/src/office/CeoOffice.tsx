/**
 * CeoOffice Component
 * 
 * Special component for the CEO's private office (Ran).
 * Larger display with executive styling and overview stats.
 */

import React from 'react';
import { Agent } from './types';
import { teamColors, statusConfig, clearanceConfig } from './office-data';
import AgentAvatar from './AgentAvatar';
import StatusIndicator from './StatusIndicator';

interface CeoOfficeProps {
  agent?: Agent;
  onClick?: (agent: Agent) => void;
  teamStats?: {
    totalAgents: number;
    activeAgents: number;
    offlineAgents: number;
    alertsCount: number;
  };
  className?: string;
}

export const CeoOffice: React.FC<CeoOfficeProps> = ({
  agent,
  onClick,
  teamStats,
  className = '',
}) => {
  if (!agent) {
    return (
      <div className={`bg-gray-100 rounded-2xl p-8 text-center ${className}`}>
        <p className="text-gray-500 text-lg">👤 CEO not available</p>
      </div>
    );
  }

  const teamColor = teamColors.ceo;

  const handleClick = () => {
    onClick?.(agent);
  };

  return (
    <div
      className={`
        relative
        bg-gradient-to-br
        from-yellow-50
        to-amber-50
        rounded-2xl
        border-2
        border-yellow-400
        p-8
        overflow-hidden
        ${className}
      `}
      onClick={handleClick}
    >
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="80" cy="20" r="40" fill="currentColor" className="text-yellow-600" />
        </svg>
      </div>

      <div className="relative z-10 flex items-start gap-8">
        {/* CEO Avatar - Large */}
        <div className="flex-shrink-0">
          <AgentAvatar
            agent={agent}
            size="xl"
            showStatus={true}
            animate={true}
          />
        </div>

        {/* CEO Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {agent.name}
            </h1>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold">
              {agent.role}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <StatusIndicator status={agent.status} size="md" />
            <span className="text-gray-400">|</span>
            <span className="flex items-center gap-1 text-sm text-gray-600">
              <span>{clearanceConfig[agent.clearanceLevel].icon}</span>
              <span>{clearanceConfig[agent.clearanceLevel].label} Clearance</span>
            </span>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">
              Current Focus
            </p>
            <p className="text-lg text-gray-800 font-medium">
              {agent.currentTask || 'Reviewing strategic initiatives'}
            </p>
            {agent.taskId && (
              <p className="text-sm text-gray-500 mt-1">
                Task ID: {agent.taskId}
              </p>
            )}
          </div>

          {/* Team Overview Stats */}
          {teamStats && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{teamStats.totalAgents}</p>
                <p className="text-xs text-gray-600 uppercase tracking-wider">Total Agents</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{teamStats.activeAgents}</p>
                <p className="text-xs text-gray-600 uppercase tracking-wider">Active</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{teamStats.alertsCount}</p>
                <p className="text-xs text-gray-600 uppercase tracking-wider">Alerts</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-500">{teamStats.offlineAgents}</p>
                <p className="text-xs text-gray-600 uppercase tracking-wider">Offline</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CEO Label */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-yellow-700">CEO Office</span>
      </div>
    </div>
  );
};

export default CeoOffice;