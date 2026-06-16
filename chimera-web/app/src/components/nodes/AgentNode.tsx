'use client';
import { memo } from 'react';
import { Handle, Position } from 'reactflow';

const ROLE = {
    'meta-orchestrator': { color: '#3b82f6', bg: '#0d1f3c', label: 'ORCHESTRATOR', icon: '⚡' },
    'topology-synthesizer': { color: '#a855f7', bg: '#1a0d30', label: 'SYNTHESIZER', icon: '🧬' },
    'specialist': { color: '#10b981', bg: '#0a2218', label: 'SPECIALIST', icon: '🔬' },
    'adversarial': { color: '#f43f5e', bg: '#2a0a10', label: 'ADVERSARIAL', icon: '⚔' },
    'consensus': { color: '#f59e0b', bg: '#2a1a00', label: 'CONSENSUS', icon: '⚖' },
} as const;

export default memo(function AgentNode({ data }: { data: any }) {
    const cfg = ROLE[data.role as keyof typeof ROLE] ?? ROLE['specialist'];
    const thinking = data.status === 'thinking';
    const terminated = data.status === 'terminated';
    const shortName = data.name
        .replace(/(Agent|Specialist|Validator|Analyst|Challenger|Skeptic|Investigator)$/, '')
        .replace(/([A-Z])/g, ' $1').trim();

    return (
        <div
            style={{
                background: cfg.bg,
                borderColor: cfg.color,
                boxShadow: thinking ? `0 0 24px ${cfg.color}88` : `0 0 8px ${cfg.color}22`,
                opacity: terminated ? 0.3 : 1,
                filter: terminated ? 'grayscale(1)' : 'none',
                transition: 'all 0.3s ease',
                border: `1.5px solid`,
                borderRadius: '12px',
                padding: '10px 12px',
                minWidth: '140px',
                maxWidth: '175px',
            }}
        >
            <Handle type="target" position={Position.Top} style={{ background: cfg.color, border: 'none', width: 8, height: 8 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                <span style={{ color: cfg.color, fontSize: 9, fontWeight: 700, letterSpacing: 2, fontFamily: 'monospace' }}>
                    {cfg.label}
                </span>
            </div>

            <div style={{ color: '#fff', fontSize: 11, fontWeight: 600, marginBottom: 6, lineHeight: 1.3 }}>
                {shortName.length > 18 ? shortName.slice(0, 18) + '…' : shortName}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: cfg.color,
                    animation: thinking ? 'ping 1s cubic-bezier(0,0,0.2,1) infinite' : 'none',
                }} />
                <span style={{ color: '#64748b', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {data.status}
                </span>
                {data.confidence !== undefined && (
                    <span style={{ marginLeft: 'auto', color: cfg.color, fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>
                        {(data.confidence * 100).toFixed(0)}%
                    </span>
                )}
            </div>

            {data.toolsUsed?.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {[...new Set<string>(data.toolsUsed)].map((t: string) => (
                        <span key={t} style={{
                            fontSize: 8, padding: '2px 5px', borderRadius: 4,
                            background: `${cfg.color}22`, color: cfg.color, fontFamily: 'monospace',
                        }}>
                            {t.replace(/_/g, ' ')}
                        </span>
                    ))}
                </div>
            )}

            <Handle type="source" position={Position.Bottom} style={{ background: cfg.color, border: 'none', width: 8, height: 8 }} />
        </div>
    );
});