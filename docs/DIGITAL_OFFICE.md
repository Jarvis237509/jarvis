# 🏢 Digital Office View

**Real-time visual office showing all OpenClaw agents at their workstations.**

The Digital Office is a fun but functional visualization that gives Ran (and the team) real-time visibility into agent activity across the OpenClaw system.

![Office Layout](./office-screenshot.png) *(screenshot placeholder)*

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Office Layout](#office-layout)
- [Agent States](#agent-states)
- [Integration](#integration)
- [API Reference](#api-reference)
- [Task Board Integration](#task-board-integration)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Install Dependencies

```bash
npm install
# Required: React 18+, Tailwind CSS (recommended)
```

### Basic Usage

```tsx
import { OfficeView } from './office';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <OfficeView refreshInterval={30000} />
    </div>
  );
}
```

### Import Styles

```tsx
import './office/office-styles.css';
```

---

## ✨ Features

### Visual Office Layout
- **CEO Office** — Ran's executive view with team-wide stats
- **Team Worf** — Operations Center (security, governance, audit bots)
- **Team Scotty** — Tech Lab (engineering, DevOps, systems bots)
- **Team Kirk** — Strategy Room (research, strategy, risk analysis bots)

### Real-Time Updates
- **Live agent status** — Active, Working, Idle, Paused, Alert, Offline
- **Heartbeat monitoring** — 30-second heartbeats, 2-minute offline threshold
- **Task tracking** — Current task, task ID, time on task
- **Team statistics** — Active counts, alert monitoring

### Interactive Features
- Click any agent for detailed information
- Search agents by name or role
- Filter by status, team, or alerts
- Navigation tabs: Overview, Teams, Tasks, Audit

### Visual States

| Status | Emoji | Visual | Description |
|--------|-------|--------|-------------|
| **Active** | 🟢 | Screen glowing | Currently working on task |
| **Working** | 🟡 | Typing animation | Processing, executing |
| **Idle** | 🔴 | Screen dim | Waiting, no current task |
| **Paused** | ⏸️ | Coffee cup icon | Break, standby |
| **Alert** | ⚠️ | Red flash | Error, needs attention |
| **Offline** | ⚫ | Grayed out | Agent not running |

---

## 🏗️ Office Layout

```
┌─────────────────────────────────────────────────────────┐
│  CEO OFFICE (Ran)                                       │
│  ┌─────┐                                               │
│  │ 👤  │  Status: Reviewing Team Performance           │
│  └─────┘                                               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  TEAM WORF — Operations Center     TEAM SCOTTY — Tech Lab│
│  ┌─────────┬─────────┐             ┌─────────┬─────────┐│
│  │ 👤Worf  │ 🤖Sec   │             │ 👤Scotty│ 🤖Dev   ││
│  │  COO    │  Bot    │             │  CTO    │  OpsBot ││
│  │ 🟢Active│ 🟡Watch │             │ 🟢Active│ 🟢Active││
│  └─────────┴─────────┘             └─────────┴─────────┘│
│  ┌─────────┬─────────┐             ┌─────────┬─────────┐│
│  │ 🤖Gov   │ 🤖Audit │             │ 🤖Sys   │ 🤖Data  ││
│  │  Bot    │  Bot    │             │  Bot    │  Bot    ││
│  │ 🟢Active│ 🟢Active│             │ 🔴Idle  │ 🟢Active││
│  └─────────┴─────────┘             └─────────┴─────────┘│
├─────────────────────────────────────────────────────────┤
│  TEAM KIRK — Strategy Room                              │
│  ┌─────────┬─────────┬─────────┬─────────┐             │
│  │ 👤Kirk  │ 🤖Res   │ 🤖Strat │ 🤖Risk  │             │
│  │  CSO    │  Bot    │  egBot  │  Bot    │             │
│  │ 🟢Active│ 🟢Active│ 🟡Review│ 🟢Active│             │
│  └─────────┴─────────┴─────────┴─────────┘             │
│                                                         │
│  NAVIGATION BAR: [Overview] [Teams] [Tasks] [Audit]     │
└─────────────────────────────────────────────────────────┘
```

---

## 🎭 Agent States

### State Transitions

```
Idle (🔴) → Active (🟢): Agent claims task
Active (🟢) → Working (🟡): Agent processing
Working (🟡) → Idle (🔴): Task completed
Any → Paused (⏸️): L2 approval pending
Any → Alert (⚠️): Error encountered
Any → Offline (⚫): Heartbeat missed (>2 min)
```

### From Tasks Board

| Task Event | Status Change |
|------------|---------------|
| Agent claims task | → 🟡 Working |
| Agent completes task | → 🔴 Idle |
| Agent blocked | → ⚠️ Alert |

### From Mission Control

| Mission Control Event | Status Change |
|-----------------------|---------------|
| L2 action pending | → ⏸️ Paused |
| L2 approved | → 🟢 Active |
| L2 rejected | → 🔴 Idle |

---

## 🔌 Integration

### Real-Time Events

```typescript
// Event types
interface OfficeState {
  agents: Record<string, Agent>;
  teams: Record<TeamId, TeamZone>;
  alerts: Alert[];
}

interface AgentStatus {
  id: string;
  name: string;
  role: string;
  team: string;
  avatar: string;
  status: 'active' | 'working' | 'idle' | 'paused' | 'alert' | 'offline';
  currentTask?: string;
  taskId?: string;
  timeOnTask: number;
  lastHeartbeat: Date;
  clearanceLevel: 'L0' | 'L1' | 'L2';
}
```

### WebSocket Integration

```typescript
// Connect to real-time updates
const { updateAgentStatus, state } = useOfficeState({
  refreshInterval: 30000,
  enableSimulatedEvents: false, // Use real events
});

// Listen for WebSocket events
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'agent:status-changed':
      updateAgentStatus(data.agentId, data.status, data.task);
      break;
    case 'task:claimed':
      updateAgentStatus(data.agentId, 'working', data.taskId);
      break;
    case 'task:completed':
      updateAgentStatus(data.agentId, 'idle');
      break;
    case 'heartbeat:missed':
      updateAgentStatus(data.agentId, 'offline');
      break;
    case 'alert:generated':
      // Alert handled automatically
      break;
  }
};
```

### EventSource (Server-Sent Events)

```typescript
const eventSource = new EventSource('/api/office/stream');

eventSource.addEventListener('agent:status-changed', (e) => {
  const data = JSON.parse(e.data);
  updateAgentStatus(data.agentId, data.status);
});

eventSource.addEventListener('heartbeat:missed', (e) => {
  const data = JSON.parse(e.data);
  updateAgentStatus(data.agentId, 'offline');
});
```

---

## 📖 API Reference

### Components

#### `OfficeView`

Main container component for the entire office view.

```typescript
interface OfficeViewProps {
  refreshInterval?: number;  // Default: 30000ms (30s)
  onAgentSelect?: (agent: Agent) => void;
  filterStatus?: AgentStatus | 'all';
  searchQuery?: string;
}

<OfficeView refreshInterval={30000} />
```

#### `Workstation`

Individual agent workstation card.

```typescript
interface WorkstationProps {
  agent: Agent;
  onClick?: (agent: Agent) => void;
  isSelected?: boolean;
}

<Workstation agent={agent} onClick={handleClick} />
```

#### `TeamZone`

Team grouping component.

```typescript
interface TeamZoneProps {
  team: TeamZone;
  agents: Agent[];
  onAgentClick?: (agent: Agent) => void;
  selectedAgentId?: string | null;
}
```

#### `StatusIndicator`

Status dot + label component.

```typescript
interface StatusIndicatorProps {
  status: AgentStatus;
  showLabel?: boolean;  // Default: true
  size?: 'sm' | 'md' | 'lg';  // Default: 'md'
  pulse?: boolean;  // Default: true
}

<StatusIndicator status="active" showLabel={true} />
```

### Hooks

#### `useOfficeState`

Custom hook for managing office state.

```typescript
const {
  state,              // Current office state
  selectedAgent,      // Currently selected agent
  setSelectedAgent,   // Set selected agent
  refresh,            // Manual refresh
  updateAgentStatus,  // Update specific agent status
  acknowledgeAlert,   // Acknowledge an alert
  isConnected,        // Connection status
  lastUpdate,         // Last update timestamp
} = useOfficeState({
  refreshInterval: 30000,
  heartbeatTimeout: 120000,
  enableSimulatedEvents: true,  // For demo/testing
});
```

### Event Emitter

For manual event triggering:

```typescript
import { eventEmitter } from './useOfficeState';

// Emit custom events
eventEmitter.emit({
  type: 'agent:status-changed',
  payload: {
    agentId: 'worf',
    newStatus: 'working',
    taskId: 'TASK-001',
    timestamp: new Date(),
  },
});
```

---

## 🔗 Task Board Integration

### Connecting to Tasks Board

The Digital Office can integrate with the Tasks Board for real-time task status:

```typescript
// When agent claims task
fetch('/api/tasks/claim', {
  method: 'POST',
  body: JSON.stringify({
    taskId: 'TASK-001',
    agentId: 'worf',
  }),
})
.then(() => {
  // Update office view
  updateAgentStatus('worf', 'working', 'TASK-001');
});

// When agent completes task
fetch('/api/tasks/complete', {
  method: 'POST',
  body: JSON.stringify({
    taskId: 'TASK-001',
    agentId: 'worf',
  }),
})
.then(() => {
  // Update office view
  updateAgentStatus('worf', 'idle');
});
```

### Task Board → Office Events

| Tasks Board Event | Office Action | API Endpoint |
|-------------------|---------------|--------------|
| Task claimed | Set agent to working | `POST /api/office/event` |
| Task completed | Set agent to idle | `POST /api/office/event` |
| Task blocked | Set agent to alert | `POST /api/office/event` |

---

## 🎨 Customization

### Team Colors

Edit `office-data.ts` to customize team colors:

```typescript
export const teamColors = {
  worf: {
    primary: '#E53935',
    secondary: '#B71C1C',
    background: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)',
  },
  // ...
};
```

### Status Config

Add custom states or modify existing:

```typescript
export const statusConfig = {
  active: {
    label: 'Active',
    color: '#4CAF50',
    emoji: '🟢',
    description: 'Currently working on task',
  },
  // ...
};
```

### Avatar Images

Replace emoji avatars with custom images:

```typescript
// In office-data.ts
const AVATARS = {
  ran: '/office/avatars/ran.png',
  worf: '/office/avatars/worf.png',
  // ...
};
```

---

## 🐛 Troubleshooting

### Agent shows as offline

- Check if agent heartbeat is being sent (every 30 seconds)
- Verify `heartbeatTimeout` is appropriate (default: 2 minutes)
- Check agent's `lastHeartbeat` timestamp

### Status not updating

- Ensure `useOfficeState` is being called
- Verify event type matches expected format
- Check browser console for errors

### Layout issues

- Ensure Tailwind CSS is properly configured
- Check for CSS conflicts with parent components
- Import `office-styles.css` for animations

### Performance issues

- Increase `refreshInterval` (e.g., 60000ms)
- Use `React.memo` for Workstation components if needed
- Filter agent list to reduce render count

---

## 📁 File Structure

```
src/office/
├── index.ts              # Barrel exports
├── types.ts              # TypeScript interfaces
├── office-data.ts        # Initial data & configs
├── useOfficeState.ts     # State management hook
├── OfficeView.tsx        # Main container
├── Workstation.tsx       # Individual station
├── TeamZone.tsx          # Team grouping
├── CeoOffice.tsx         # CEO special view
├── AgentAvatar.tsx       # Avatar component
├── StatusIndicator.tsx   # Status dot/label
└── office-styles.css     # Animations & styles
```

---

## 📝 Changelog

### v1.0.0 (Initial Release)
- ✅ Office layout with 3 team zones
- ✅ Real-time status updates
- ✅ 6 agent states with animations
- ✅ Agent detail modal
- ✅ Search and filter functionality
- ✅ Toolbar with navigation tabs
- ✅ WebSocket/EventSource ready

---

## 🤝 Contributing

1. Create a new branch: `feat/digital-office-update`
2. Make changes following existing patterns
3. Add/update tests as needed
4. Submit PR to `main`

---

**Created by Sulu** — OpenClaw Agent Orchestration Team