/**
 * Workstation Component
 * 
 * Individual agent workstation card showing avatar, status, current task,
 * and time on task. Supports click for details and hover animations.
 */

import React from 'react';
import { Agent } from './types';
import { teamColors, statusConfig, clearanceConfig } from './office-data';
import AgentAvatar from './AgentAvatar';
import StatusIndicator from './StatusIndicator';

interface WorkstationProps {
  agent: Agent;
  onClick?: (agent: Agent) => void;
  isSelected?: boolean;
  className?: string;
}

export const Workstation: React.FC<WorkstationProps> = ({
  agent,
  onClick,
  isSelected = false,
  className = '',
}) => {
  const teamColor = teamColors[agent.team]?.primary || '#9E9E9E';
  const status = statusConfig[agent.status];
  const clearance = clearanceConfig[agent.clearanceLevel];

  const handleClick = () => {
    onClick?.(agent);
  };

  // Format time on task
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div
      className={`
        relative
        bg-white
        rounded-xl
        border-2
        p-4
        min-w-[200px]
        cursor-pointer
        transition-all
        duration-300
        hover:shadow-lg
        hover:-translate-y-1
        ${isSelected ? 'ring-2 ring-offset-2' : ''}
        ${agent.status === 'offline' ? 'opacity-60' : ''}
        ${className}
      `}
      style={{
        borderColor: isSelected ? teamColor : agent.status === 'alert' ? '#FF5722' : '#e0e0e0',
        boxShadow: agent.status === 'active'
          ? `0 0 20px ${status.color}20, 0 4px 12px rgba(0,0,0,0.1)`
          : '0 2px 8px rgba(0,0,0,0.08)',
      }}
      onClick={handleClick}
    >
      {/* Screen glow effect for active agents */}
      {agent.status === 'active' && (
        <div
          className="absolute inset-0 rounded-xl opacity-20 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${status.color}40 0%, transparent 70%)`,
          }}
        />
      )}

      <div className="flex flex-col items-center relative z-10">
        {/* Avatar */}
        <AgentAvatar
          agent={agent}
          size="md"
          showStatus={false}
          animate={true}
        />

        {/* Name & Role */}
        <div className="mt-3 text-center">
          <h3 className="font-bold text-gray-900 text-lg leading-tight">
            {agent.name}
          </h3>
          <p className="text-sm text-gray-500 font-medium">
            {agent.role}
          </p>
        </div>

        {/* Status */}
        <div className="mt-2">
          <StatusIndicator status={agent.status} showLabel={true} size="sm" />
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gray-200 my-3" />

        {/* Current Task */}
        <div className="w-full">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
            Current Task
          </p>
          <p className="text-sm text-gray-800 font-medium truncate">
            {agent.currentTask || 'No active task'}
          </p>
          {agent.taskId && (
            <p className="text-xs text-gray-400 mt-0.5">
              #{agent.taskId}
            </p>
          )}
        </div>

        {/* Time on Task */}
        {(agent.status === 'active' || agent.status === 'working') && agent.timeOnTask > 0 && (
          <div className="mt-2 flex items-center gap-1 text-sm text-gray-600">
            <span>⏱️</span>
            <span>{formatTime(agent.timeOnTask)}</span>
          </div>
        )}

        {/* Clearance Badge */}
        <div className="mt-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs"
          style={{ backgroundColor: `${clearance.color}15` }}
        >
          <span>{clearance.icon}</span>
          <span style={{ color: clearance.color }} className="font-semibold">
            {clearance.label}
          </span>
        </div>

        {/* Alert indicator */}
        {agent.status === 'alert' && (
          <div className="absolute top-2 right-2 animate-pulse">
            <span className="text-lg">⚠️</span>
          </div>
        )}

        {/* Offline indicator */}
        {agent.status === 'offline' && (
          <div className="absolute top-2 right-2">
            <span className="text-lg">⚫</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Workstation;