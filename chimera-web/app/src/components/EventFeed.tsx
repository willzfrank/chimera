'use client';
import { ChimeraEvent } from '../lib/types';

const CFG: Record<string, { color: string; icon: string; label: string }> = {
    agent_spawned: { color: '#10b981', icon: '→', label: 'SPAWNED' },
    agent_thinking: { color: '#3b82f6', icon: '◌', label: 'THINKING' },
    agent_done: { color: '#10b981', icon: '✓', label: 'DONE' },
    tool_executed: { color: '#a855f7', icon: '⚙', label: 'TOOL' },
    agent_message: { color: '#f59e0b', icon: '↗', label: 'MESSAGE' },
    agent_terminated: { color: '#334155', icon: '×', label: 'TERMINATED' },
    topology_built: { color: '#8b5cf6', icon: '🧬', label: 'TOPOLOGY' },
    consensus_reached: { color: '#10b981', icon: '⚖', label: 'CONSENSUS' },
    human_checkpoint: { color: '#f59e0b', icon: '👤', label: 'HUMAN' },
    incident_resolved: { color: '#10b981', icon: '✓', label: 'RESOLVED' },
};

function describe(type: string, p: Record<string, any>): string {
    switch (type) {
        case 'agent_spawned': return `${p.name} · ${p.role}`;
        case 'agent_thinking': return p.agentName ?? p.agentId?.toString().slice(0, 8);
        case 'agent_done': return `${p.agentName} · ${p.confidence != null ? `${(p.confidence * 100).toFixed(0)}% conf` : ''}`;
        case 'tool_executed': return `${String(p.tool).replace(/_/g, ' ')} · ${p.agentId?.toString().slice(0, 8)}`;
        case 'topology_built': return `${p.incidentClass} · ${p.agentCount} agents${p.fromMemory ? ' · ⚡RECALLED' : ''}`;
        case 'consensus_reached': return `${(p.confidence * 100).toFixed(0)}% confidence · ${p.dissents} dissent(s)`;
        case 'agent_terminated': return p.agentName ?? '';
        case 'incident_resolved': return `done in ${p.resolutionMs ? (p.resolutionMs / 1000).toFixed(1) + 's' : '?'}`;
        default: return '';
    }
}

export function EventFeed({ events }: { events: ChimeraEvent[] }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            background: '#060d1a', borderRadius: 12,
            border: '1px solid #111827', overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '8px 14px', borderBottom: '1px solid #111827',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
            }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#334155', letterSpacing: 3 }}>
                    EVENT STREAM
                </span>
                <span style={{ fontSize: 10, color: '#1e293b', fontFamily: 'monospace' }}>{events.length}</span>
            </div>

            {/* Events */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                {events.length === 0 && (
                    <p style={{ color: '#1e293b', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
                        no events
                    </p>
                )}
                {events.map((e, i) => {
                    const c = CFG[e.type] ?? { color: '#334155', icon: '·', label: e.type };
                    const desc = describe(e.type, e.payload);
                    return (
                        <div key={i} style={{
                            display: 'flex', gap: 8, padding: '4px 6px',
                            borderRadius: 6, marginBottom: 1,
                            animation: i === 0 ? 'fadeSlideIn 0.2s ease' : 'none',
                        }}>
                            <span style={{
                                color: c.color, fontSize: 11, width: 14, textAlign: 'center',
                                flexShrink: 0, marginTop: 1,
                            }}>
                                {c.icon}
                            </span>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                                    <span style={{
                                        color: c.color, fontSize: 8, fontFamily: 'monospace',
                                        fontWeight: 800, letterSpacing: 1.5,
                                    }}>
                                        {c.label}
                                    </span>
                                    <span style={{ color: '#1e293b', fontSize: 9, fontFamily: 'monospace' }}>
                                        {new Date(e.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                {desc && (
                                    <p style={{
                                        color: '#475569', fontSize: 10, margin: 0,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {desc}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}