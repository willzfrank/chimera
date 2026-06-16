'use client';
import { memo } from 'react';
import { Handle, Position } from 'reactflow';

const ROLE = {
    'meta-orchestrator': { color: '#3b82f6', bg: '#0c1829', label: 'ORCHESTRATOR', icon: '⚡' },
    'topology-synthesizer': { color: '#a855f7', bg: '#160b29', label: 'SYNTHESIZER', icon: '🧬' },
    'specialist': { color: '#10b981', bg: '#071a12', label: 'SPECIALIST', icon: '🔬' },
    'adversarial': { color: '#f43f5e', bg: '#1a0508', label: 'ADVERSARIAL', icon: '⚔️' },
    'consensus': { color: '#f59e0b', bg: '#1a1000', label: 'CONSENSUS', icon: '⚖️' },
} as const;

const STATUS_DOT: Record<string, string> = {
    spawning: '#475569',
    idle: '#475569',
    thinking: 'currentColor',
    done: '#10b981',
    terminated: '#1e293b',
};

export default memo(function AgentNode({ data }: { data: any }) {
    const cfg = ROLE[data.role as keyof typeof ROLE] ?? ROLE['specialist'];
    const isThinking = data.status === 'thinking';
    const isDone = data.status === 'done';
    const isTerminated = data.status === 'terminated';

    // "DbConnectionAnalyst" → "Db Connection Analyst"
    const displayName = data.name.replace(/([a-z])([A-Z])/g, '$1 $2');

    const containerStyle: React.CSSProperties = {
        background: cfg.bg,
        border: `1.5px solid ${isTerminated ? '#1e293b' : cfg.color}`,
        borderRadius: 14,
        padding: '10px 14px',
        minWidth: 150,
        maxWidth: 190,
        transition: 'all 0.4s ease',
        opacity: isTerminated ? 0.35 : 1,
        filter: isTerminated ? 'grayscale(0.8)' : 'none',
        boxShadow: isThinking
            ? `0 0 0 3px ${cfg.color}55, 0 0 24px ${cfg.color}44`
            : isDone
                ? `0 0 12px ${cfg.color}33`
                : `0 0 6px ${cfg.color}11`,
        animation: 'fadeSlideIn 0.35s ease forwards',
    };

    return (
        <div style={containerStyle}>
            <Handle type="target" position={Position.Top}
                style={{ background: cfg.color, border: 'none', width: 8, height: 8, top: -4 }} />

            {/* Role badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                <span style={{ fontSize: 13 }}>{cfg.icon}</span>
                <span style={{
                    color: cfg.color, fontSize: 8, fontWeight: 800,
                    letterSpacing: 2, fontFamily: 'monospace', textTransform: 'uppercase',
                }}>
                    {cfg.label}
                </span>

                {/* Done checkmark */}
                {isDone && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#10b981' }}>✓</span>
                )}
            </div>

            {/* Agent name */}
            <div style={{
                color: isTerminated ? '#334155' : '#e2e8f0',
                fontSize: 11, fontWeight: 700,
                lineHeight: 1.35, marginBottom: 7,
                wordBreak: 'break-word',
            }}>
                {displayName}
            </div>

            {/* Confidence bar (shown when done) */}
            {isDone && data.confidence !== undefined && (
                <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 8, color: '#64748b', fontFamily: 'monospace' }}>CONFIDENCE</span>
                        <span style={{ fontSize: 9, color: cfg.color, fontFamily: 'monospace', fontWeight: 700 }}>
                            {(data.confidence * 100).toFixed(0)}%
                        </span>
                    </div>
                    <div style={{ height: 3, background: '#1e293b', borderRadius: 99 }}>
                        <div style={{
                            height: '100%', borderRadius: 99,
                            width: `${data.confidence * 100}%`,
                            background: data.confidence > 0.7 ? '#10b981' : '#f59e0b',
                            transition: 'width 0.6s ease',
                        }} />
                    </div>
                </div>
            )}

            {/* Status row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: STATUS_DOT[data.status] ?? '#475569',
                    color: cfg.color,
                    flexShrink: 0,
                    animation: isThinking ? 'ping 1s cubic-bezier(0,0,0.2,1) infinite' : 'none',
                }} />
                <span style={{
                    fontSize: 8, color: '#475569',
                    fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1,
                }}>
                    {data.status}
                </span>
            </div>

            {/* Tools used */}
            {data.toolsUsed?.length > 0 && !isTerminated && (
                <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {[...new Set<string>(data.toolsUsed)].map((t: string) => (
                        <span key={t} style={{
                            fontSize: 7.5, padding: '2px 5px', borderRadius: 4,
                            background: `${cfg.color}18`, color: cfg.color,
                            fontFamily: 'monospace', letterSpacing: 0.5,
                        }}>
                            {t.replace(/_/g, ' ')}
                        </span>
                    ))}
                </div>
            )}

            <Handle type="source" position={Position.Bottom}
                style={{ background: cfg.color, border: 'none', width: 8, height: 8, bottom: -4 }} />
        </div>
    );
});