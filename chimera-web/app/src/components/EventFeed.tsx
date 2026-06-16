'use client';
import { ChimeraEvent } from '../lib/types';

const CFG: Record<string, { color: string; icon: string }> = {
    agent_spawned: { color: '#10b981', icon: '→' },
    agent_thinking: { color: '#3b82f6', icon: '◌' },
    tool_executed: { color: '#a855f7', icon: '⚙' },
    agent_message: { color: '#f59e0b', icon: '↗' },
    agent_terminated: { color: '#475569', icon: '×' },
    topology_built: { color: '#8b5cf6', icon: '🧬' },
    consensus_reached: { color: '#10b981', icon: '⚖' },
    human_checkpoint: { color: '#f59e0b', icon: '👤' },
    incident_resolved: { color: '#10b981', icon: '✓' },
};

function summary(type: string, p: any): string {
    switch (type) {
        case 'agent_spawned': return `${p.name} (${p.role})`;
        case 'tool_executed': return `${String(p.tool).replace(/_/g, ' ')}`;
        case 'topology_built': return `${p.incidentClass} — ${p.agentCount} agents${p.fromMemory ? ' ⚡RECALLED' : ''}`;
        case 'consensus_reached': return `${(p.confidence * 100).toFixed(0)}% conf · ${p.dissents} dissent(s)`;
        case 'incident_resolved': return `done in ${p.resolutionMs}ms`;
        default: return '';
    }
}

export function EventFeed({ events }: { events: ChimeraEvent[] }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#070c18', borderRadius: 12, border: '1px solid #1e293b', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: 2 }}>EVENT STREAM</span>
                <span style={{ fontSize: 10, color: '#334155', fontFamily: 'monospace' }}>{events.length}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                {events.length === 0 && <p style={{ color: '#1e293b', fontSize: 11, textAlign: 'center', marginTop: 16 }}>no events</p>}
                {events.map((e, i) => {
                    const c = CFG[e.type] ?? { color: '#475569', icon: '·' };
                    return (
                        <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 6px', borderRadius: 6, marginBottom: 2 }}>
                            <span style={{ color: c.color, fontSize: 11, flexShrink: 0, width: 14, textAlign: 'center', marginTop: 1 }}>{c.icon}</span>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span style={{ color: c.color, fontSize: 9, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>
                                        {e.type.replace(/_/g, ' ').toUpperCase()}
                                    </span>
                                    <span style={{ color: '#334155', fontSize: 9, fontFamily: 'monospace' }}>
                                        {new Date(e.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <p style={{ color: '#64748b', fontSize: 10, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {summary(e.type, e.payload)}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}