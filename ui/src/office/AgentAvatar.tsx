/**
 * AgentAvatar Component
 * 
 * Animated avatar component with team color border and status indicator.
 * Supports multiple sizes and hover effects.
 */

import React from 'react';
import { Agent } from './types';
import { teamColors, statusConfig } from './office-data';
import StatusIndicator from './StatusIndicator';

interface AgentAvatarProps {
  agent: Agent;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  animate?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  sm: {
    container: 'w-10 h-10',
    avatar: 'text-lg',
    border: 'border-2',
  },
  md: {
    container: 'w-14 h-14',
    avatar: 'text-2xl',
    border: 'border-3',
  },
  lg: {
    container: 'w-20 h-20',
    avatar: 'text-4xl',
    border: 'border-4',
  },
  xl: {
    container: 'w-28 h-28',
    avatar: 'text-5xl',
    border: 'border-4',
  },
};

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  agent,
  size = 'md',
  showStatus = true,
  animate = true,
  className = '',
  onClick,
}) => {
  const teamColor = teamColors[agent.team]?.primary || '#9E9E9E';
  const statusAnim = statusConfig[agent.status];
  const sizes = sizeClasses[size];

  const containerStyle: React.CSSProperties = {
    borderColor: teamColor,
    boxShadow: agent.status === 'active' && animate
      ? `0 0 20px ${teamColor}40, inset 0 0 10px ${teamColor}20`
      : `0 2px 8px rgba(0,0,0,0.15)`,
    background: teamColors[agent.team]?.background || 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
  };

  return (
    <div
      className={`relative ${className}`}
      onClick={onClick}
    >
      <div
        className={`
          ${sizes.container}
          ${sizes.border}
          rounded-full
          flex
          items-center
          justify-center
          cursor-pointer
          transition-all
          duration-300
          hover:scale-110
          ${agent.status === 'offline' ? 'grayscale opacity-50' : ''}
          ${agent.status === 'alert' ? 'animate-shake' : ''}
        `}
        style={containerStyle}
      >
        <span className={`${sizes.avatar} select-none`} role="img" aria-label={agent.name}>
          {agent.avatar}
        </span>
        
        {/* Status glow effect for active agents */}
        {animate && agent.status === 'active' && (
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ backgroundColor: teamColor }}
          />
        )}
        
        {/* Typing indicator for working agents */}
        {animate && agent.status === 'working' && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
            <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
      
      {/* Status indicator dot */}
      {showStatus && (
        <div className="absolute -bottom-1 -right-1">
          <StatusIndicator status={agent.status} showLabel={false} size="sm" />
        </div>
      )}
    </div>
  );
};

export default AgentAvatar;

// Add custom animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-2px); }
    75% { transform: translateX(2px); }
  }
  
  .animate-shake {
    animation: shake 0.5s ease-in-out infinite;
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(style);
}