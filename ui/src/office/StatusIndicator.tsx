/**
 * StatusIndicator Component
 * 
 * Displays agent status with colored dot and optional label.
 * Supports pulse animation for active states.
 */

import React from 'react';
import { AgentStatus } from './types';
import { statusConfig } from './office-data';

interface StatusIndicatorProps {
  status: AgentStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: {
    dot: 'w-2 h-2',
    emoji: 'text-xs',
    text: 'text-xs',
  },
  md: {
    dot: 'w-3 h-3',
    emoji: 'text-sm',
    text: 'text-sm',
  },
  lg: {
    dot: 'w-4 h-4',
    emoji: 'text-base',
    text: 'text-base',
  },
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  showLabel = true,
  size = 'md',
  pulse = true,
  className = '',
}) => {
  const config = statusConfig[status];
  const sizes = sizeClasses[size];

  const dotStyle: React.CSSProperties = {
    backgroundColor: config.color,
    boxShadow: status === 'active' && pulse 
      ? `0 0 8px ${config.color}, 0 0 16px ${config.color}`
      : `0 0 4px ${config.color}`,
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`${sizes.dot} rounded-full ${pulse && (status === 'active' || status === 'working') ? 'animate-pulse' : ''}`}
        style={dotStyle}
        title={config.description}
      />
      <span className={sizes.emoji} role="img" aria-label={config.label}>
        {config.emoji}
      </span>
      {showLabel && (
        <span className={`${sizes.text} font-medium`} style={{ color: config.color }}>
          {config.label}
        </span>
      )}
    </div>
  );
};

export default StatusIndicator;