'use client';
import { useEffect, useState } from 'react';

interface Summary {
    total_incidents: string;
    avg_resolution_ms: string;
    avg_confidence: string;
    memory_recalls: string;
    avg_memory_ms: string;
    avg_synthesis_ms: string;
    total_tokens: string;
    cost_saved_usd: string;
}

interface ByClass {
    incident_class: string;
    count: string;
    avg_ms: string;
    avg_conf: string;
}

interface RecentIncident {
    id: string;
    title: string;
    severity: string;
    incident_class: string;
    confidence: number;
    resolution_ms: number;
    from_memory: boolean;
    agents_used: number;
    created_at: string;
}

const SEV_COLOR: Record<string, string> = {
    P0: '#ef4444', P1: '#f97316', P2: '#f59e0b', P3: '#3b82f6',
};

const card: React.CSSProperties = {
    background: '#060d1a', border: '1px solid #111827', borderRadius: 12, padding: 20,
};

const label: React.CSSProperties = {
    fontSize: 9, fontWeight: 800, color: '#334155', letterSpacing: 3,
    textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 6,
    display: 'block',
};

const RISK_COLOR: Record<string, string> = { low: '#10b981', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
const TREND_ICON: Record<string, string> = { stable: '→', rising: '↑', spiking: '⚠️' };

export default function Dashboard() {
    const [data, setData] = useState<{ summary: Summary; byClass: ByClass[]; recent: RecentIncident[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [risks, setRisks] = useState<any[]>([]);

    useEffect(() => {
        fetch('http://localhost:3000/analytics/summary')
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));

        const interval = setInterval(() => {
            fetch('http://localhost:3000/analytics/summary')
                .then(r => r.json()).then(setData).catch(() => { });
        }, 10_000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetch('http://localhost:3000/analytics/risk')
            .then(r => r.json()).then(setRisks).catch(() => { });
    }, []);

    const s = data?.summary;

    const totalMs = Number(s?.avg_resolution_ms ?? 0);
    const memoryMs = Number(s?.avg_memory_ms ?? 0);
    const speedup = totalMs > 0 && memoryMs > 0
        ? (Number(s?.avg_synthesis_ms ?? 0) / memoryMs).toFixed(1)
        : null;

    return (
        <div style={{
            minHeight: '100vh', background: '#040810', color: '#fff', padding: 24,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                <a href="/" style={{ color: '#334155', fontSize: 11, fontFamily: 'monospace', textDecoration: 'none' }}>
                    ← back
                </a>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ fontWeight: 900, letterSpacing: 6, fontSize: 13 }}>CHIMERA</span>
                <span style={{ color: '#334155', fontSize: 11 }}>analytics</span>
                {loading && <span style={{ fontSize: 10, color: '#334155', fontFamily: 'monospace' }}>loading...</span>}
            </div>

            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    {
                        label: 'Incidents Resolved',
                        value: s?.total_incidents ?? '—',
                        sub: 'total autonomous resolutions',
                        color: '#3b82f6',
                    },
                    {
                        label: 'Avg MTTR',
                        value: s?.avg_resolution_ms ? `${(Number(s.avg_resolution_ms) / 1000).toFixed(1)}s` : '—',
                        sub: `vs ~45min manual`,
                        color: '#10b981',
                    },
                    {
                        label: 'Memory Recall Rate',
                        value: s && Number(s.total_incidents) > 0
                            ? `${((Number(s.memory_recalls) / Number(s.total_incidents)) * 100).toFixed(0)}%`
                            : '—',
                        sub: speedup ? `${speedup}× faster than synthesis` : 'of incidents from memory',
                        color: '#a855f7',
                    },
                    {
                        label: 'Engineer Time Saved',
                        value: s?.cost_saved_usd ? `$${Number(s.cost_saved_usd).toFixed(0)}` : '—',
                        sub: `est. at $150/hr · 45min avg manual`,
                        color: '#f59e0b',
                    },
                ].map((kpi, i) => (
                    <div key={i} style={{ ...card, borderColor: `${kpi.color}22` }}>
                        <span style={label}>{kpi.label}</span>
                        <div style={{ fontSize: 28, fontWeight: 900, color: kpi.color, fontFamily: 'monospace', marginBottom: 4 }}>
                            {kpi.value}
                        </div>
                        <div style={{ fontSize: 10, color: '#334155' }}>{kpi.sub}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>
                {/* Incident class breakdown */}
                <div style={card}>
                    <span style={label}>Incident Class Distribution</span>
                    {(!data?.byClass?.length) && (
                        <p style={{ color: '#1e293b', fontSize: 11 }}>No data yet</p>
                    )}
                    {data?.byClass?.map((cls, i) => {
                        const maxCount = Math.max(...(data.byClass.map(c => Number(c.count))));
                        const pct = (Number(cls.count) / maxCount) * 100;
                        return (
                            <div key={i} style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>
                                        {cls.incident_class.replace(/_/g, ' ')}
                                    </span>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>
                                            {(Number(cls.avg_ms) / 1000).toFixed(1)}s avg
                                        </span>
                                        <span style={{ fontSize: 10, color: '#10b981', fontFamily: 'monospace' }}>
                                            ×{cls.count}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ height: 4, background: '#111827', borderRadius: 99 }}>
                                    <div style={{
                                        height: '100%', borderRadius: 99,
                                        width: `${pct}%`,
                                        background: `hsl(${210 + i * 30}, 80%, 55%)`,
                                        transition: 'width 0.8s ease',
                                    }} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Recent incidents */}
                <div style={card}>
                    <span style={label}>Recent Incidents</span>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #111827' }}>
                                {['Severity', 'Title', 'Class', 'MTTR', 'Conf', 'Source', ''].map(h => (
                                    <th key={h} style={{
                                        textAlign: 'left', padding: '4px 8px',
                                        fontSize: 8, color: '#334155', fontWeight: 700,
                                        letterSpacing: 2, fontFamily: 'monospace',
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(!data?.recent?.length) && (
                                <tr><td colSpan={7} style={{ color: '#1e293b', fontSize: 11, padding: 12 }}>No incidents yet</td></tr>
                            )}
                            {data?.recent?.map((inc) => (
                                <tr key={inc.id} style={{ borderBottom: '1px solid #0c1221' }}>
                                    <td style={{ padding: '6px 8px' }}>
                                        <span style={{
                                            fontSize: 9, fontWeight: 800, color: SEV_COLOR[inc.severity] ?? '#fff',
                                            fontFamily: 'monospace',
                                        }}>{inc.severity}</span>
                                    </td>
                                    <td style={{ padding: '6px 8px', fontSize: 10, color: '#64748b', maxWidth: 180 }}>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                            {inc.title}
                                        </span>
                                    </td>
                                    <td style={{ padding: '6px 8px', fontSize: 9, color: '#475569', fontFamily: 'monospace' }}>
                                        {inc.incident_class?.replace(/_/g, ' ') ?? '—'}
                                    </td>
                                    <td style={{ padding: '6px 8px', fontSize: 10, color: '#10b981', fontFamily: 'monospace' }}>
                                        {inc.resolution_ms ? `${(inc.resolution_ms / 1000).toFixed(1)}s` : '—'}
                                    </td>
                                    <td style={{ padding: '6px 8px', fontSize: 10, color: '#3b82f6', fontFamily: 'monospace' }}>
                                        {inc.confidence ? `${(inc.confidence * 100).toFixed(0)}%` : '—'}
                                    </td>
                                    <td style={{ padding: '6px 8px' }}>
                                        {inc.from_memory
                                            ? <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 4, background: '#3b0764', color: '#c084fc' }}>⚡ RECALL</span>
                                            : <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 4, background: '#0c1829', color: '#3b82f6' }}>SYNTH</span>}
                                    </td>
                                    <td style={{ padding: '6px 8px', display: 'flex', gap: 8 }}>
                                        <a
                                            href={`http://localhost:3000/analytics/postmortem/${inc.id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ fontSize: 9, color: '#334155', fontFamily: 'monospace', textDecoration: 'none' }}
                                        >
                                            report ↗
                                        </a>
                                        <button
                                            onClick={async () => {
                                                const res = await fetch(`http://localhost:3000/analytics/summary/${inc.id}`);
                                                const { summary } = await res.json();
                                                alert(summary);
                                            }}
                                            style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                        >
                                            exec ↗
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {s && Number(s.memory_recalls) > 0 && (
                <div style={{ ...card, marginTop: 12 }}>
                    <span style={label}>Memory vs Synthesis Speed</span>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>
                                First encounter (topology synthesis)
                            </div>
                            <div style={{ height: 8, background: '#111827', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ height: '100%', background: '#3b82f6', width: '100%', borderRadius: 99 }} />
                            </div>
                            <div style={{ fontSize: 11, color: '#3b82f6', fontFamily: 'monospace', marginTop: 4 }}>
                                {s.avg_synthesis_ms ? `${(Number(s.avg_synthesis_ms) / 1000).toFixed(1)}s` : '—'}
                            </div>
                        </div>
                        <div style={{ fontSize: 24, color: '#10b981', fontWeight: 900 }}>⚡</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>
                                Recalled from memory
                            </div>
                            <div style={{ height: 8, background: '#111827', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', background: '#10b981', borderRadius: 99,
                                    width: speedup ? `${(1 / Number(speedup)) * 100}%` : '20%',
                                }} />
                            </div>
                            <div style={{ fontSize: 11, color: '#10b981', fontFamily: 'monospace', marginTop: 4 }}>
                                {s.avg_memory_ms ? `${(Number(s.avg_memory_ms) / 1000).toFixed(1)}s` : '—'}
                                {speedup && ` (${speedup}× faster)`}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {risks.length > 0 && (
                <div style={{ ...card, marginTop: 12 }}>
                    <span style={label}>Incident Risk Velocity</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {risks.map((r, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{
                                    fontSize: 9, padding: '2px 8px', borderRadius: 20, fontFamily: 'monospace', fontWeight: 700,
                                    background: `${RISK_COLOR[r.riskLevel]}22`, color: RISK_COLOR[r.riskLevel],
                                    border: `1px solid ${RISK_COLOR[r.riskLevel]}44`, minWidth: 60, textAlign: 'center',
                                }}>
                                    {r.riskLevel.toUpperCase()}
                                </span>
                                <span style={{ fontSize: 11, color: '#64748b', flex: 1 }}>
                                    {r.incidentClass.replace(/_/g, ' ')}
                                </span>
                                <span style={{ fontSize: 10, color: '#475569' }}>
                                    {TREND_ICON[r.velocityTrend]} {r.count24h}× today
                                </span>
                                <div style={{ width: 80, height: 4, background: '#111827', borderRadius: 99 }}>
                                    <div style={{
                                        height: '100%', borderRadius: 99,
                                        width: `${r.riskScore}%`,
                                        background: RISK_COLOR[r.riskLevel],
                                        transition: 'width 0.8s ease',
                                    }} />
                                </div>
                                <span style={{ fontSize: 10, color: RISK_COLOR[r.riskLevel], fontFamily: 'monospace', width: 30 }}>
                                    {r.riskScore}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}