'use client';
import { useState } from 'react';
import { useChimera } from './src/hooks/useChimera';
import { AgentGraph } from './src/components/AgentGraph';
import { EventFeed } from './src/components/EventFeed';
import { IncidentFormData } from './src/lib/types';

const DEMOS: IncidentFormData[] = [
  {
    title: 'API connection pool exhausted — chimera-api',
    description: 'HikariCP at max 100 connections. 47 threads waiting. 503s since deploy v2.14.1 at 14:20 UTC.',
    severity: 'P0', service: 'chimera-api',
  },
  {
    title: 'Payment service p99 latency spike',
    description: 'Payment processing latency jumped from 200ms to 8900ms at p99. Error rate 12%. No recent deployments. Spike started after traffic doubled.',
    severity: 'P1', service: 'payment-service',
  },
  {
    title: 'Redis cache hit rate collapsed to 4%',
    description: 'Cache hit rate dropped from 94% to 4% after maintenance window. Memory usage normal. Possible key eviction or misconfigured TTL.',
    severity: 'P1', service: 'cache-layer',
  },
];

const SEV: Record<string, string> = { P0: '#ef4444', P1: '#f97316', P2: '#f59e0b', P3: '#3b82f6' };
const STATUS_COLOR: Record<string, string> = {
  idle: '#334155', synthesizing: '#f59e0b', running: '#3b82f6',
  consensus: '#8b5cf6', awaiting_human: '#f59e0b', resolved: '#10b981',
};

export default function Home() {
  const {
    nodes, edges, events, status, topology, consensus,
    checkpoint, incidentTitle, resolutionMs, fitTrigger, totalCostUsd,
    autoMode, toggleAutoMode,
    submitIncident, resolveCheckpoint,
  } = useChimera();

  const [form, setForm] = useState<IncidentFormData>({
    title: '', description: '', severity: 'P1', service: '',
  });

  const busy = status !== 'idle' && status !== 'resolved';

  const inp: React.CSSProperties = {
    background: '#0c1221', border: '1px solid #1e293b', borderRadius: 7,
    padding: '7px 10px', fontSize: 11, color: '#e2e8f0', outline: 'none',
    width: '100%', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#040810', color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px', borderBottom: '1px solid #0c1221', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
            boxShadow: '0 0 8px #ef4444',
            animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
          }} />
          <span style={{ fontWeight: 900, letterSpacing: 8, fontSize: 13, color: '#f1f5f9' }}>
            CHIMERA
          </span>
          <span style={{ color: '#1e293b', fontSize: 11 }}>autonomous incident response</span>
        </div>

        {incidentTitle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 400 }}>
            <span style={{
              fontSize: 11, color: '#475569',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {incidentTitle}
            </span>
            <span style={{
              fontSize: 9, padding: '3px 10px', borderRadius: 20,
              border: `1px solid ${STATUS_COLOR[status]}`,
              color: STATUS_COLOR[status], fontFamily: 'monospace', fontWeight: 800,
              letterSpacing: 1.5, flexShrink: 0,
            }}>
              {status.replace(/_/g, ' ').toUpperCase()}
            </span>
            {totalCostUsd > 0 && (
              <span style={{ fontSize: 10, color: '#334155', fontFamily: 'monospace' }}>
                ${totalCostUsd.toFixed(4)} · saving ~${(150 * 0.75).toFixed(0)} eng cost
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/dashboard" style={{
            fontSize: 10, color: '#334155', fontFamily: 'monospace',
            textDecoration: 'none', padding: '3px 8px', borderRadius: 6,
            border: '1px solid #1e293b',
          }}>
            analytics ↗
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: '#334155', fontFamily: 'monospace' }}>AUTO DETECT</span>
            <div
              onClick={() => toggleAutoMode(!autoMode)}
              style={{
                width: 36, height: 20, borderRadius: 99, cursor: 'pointer',
                background: autoMode ? '#10b981' : '#1e293b',
                border: `1px solid ${autoMode ? '#10b981' : '#334155'}`,
                position: 'relative', transition: 'all 0.3s',
              }}
            >
              <div style={{
                position: 'absolute', top: 2,
                left: autoMode ? 18 : 2,
                width: 14, height: 14, borderRadius: '50%',
                background: autoMode ? '#fff' : '#475569',
                transition: 'left 0.3s',
              }} />
            </div>
            <span style={{
              fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
              color: autoMode ? '#10b981' : '#334155',
            }}>
              {autoMode ? 'ON' : 'OFF'}
            </span>
          </div>
          <span style={{ fontSize: 10, color: '#1e293b', fontFamily: 'monospace' }}>
            qwen cloud · alibaba cloud
          </span>
        </div>
      </header>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, gap: 10, padding: 10, overflow: 'hidden' }}>

        {/* Left panel */}
        <div style={{ width: 264, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>

          {/* Incident form */}
          <div style={{
            background: '#060d1a', border: '1px solid #111827',
            borderRadius: 12, padding: 14, flexShrink: 0,
          }}>
            <div style={{ fontSize: 8, fontWeight: 800, color: '#334155', letterSpacing: 3, marginBottom: 10 }}>
              SUBMIT INCIDENT
            </div>

            {/* Demo buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {DEMOS.map((d, i) => (
                <button key={i}
                  onClick={() => { setForm(d); submitIncident(d); }}
                  disabled={busy}
                  style={{
                    textAlign: 'left', padding: '7px 10px', borderRadius: 7,
                    border: '1px solid #111827', background: 'transparent',
                    color: busy ? '#1e293b' : '#64748b',
                    cursor: busy ? 'not-allowed' : 'pointer', fontSize: 10,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!busy) (e.target as HTMLElement).style.borderColor = '#334155'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#111827'; }}
                >
                  <span style={{ color: SEV[d.severity], fontWeight: 800, fontFamily: 'monospace', marginRight: 6 }}>
                    {d.severity}
                  </span>
                  {d.title.slice(0, 30)}…
                </button>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #0c1221', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input style={inp} placeholder="Incident title"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <textarea style={{ ...inp, resize: 'none' } as React.CSSProperties}
                placeholder="Description" rows={3}
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <div style={{ display: 'flex', gap: 6 }}>
                <select style={{ ...inp, width: 'auto' } as React.CSSProperties}
                  value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value as any }))}>
                  {(['P0', 'P1', 'P2', 'P3'] as const).map(s => <option key={s}>{s}</option>)}
                </select>
                <input style={inp} placeholder="service-name"
                  value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))} />
              </div>
              <button
                onClick={() => submitIncident(form)}
                disabled={busy || !form.title || !form.service}
                style={{
                  padding: '9px', borderRadius: 8, border: 'none',
                  background: busy
                    ? '#0c1221'
                    : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  color: busy ? '#334155' : '#fff',
                  fontSize: 11, fontWeight: 800, letterSpacing: 2,
                  cursor: busy || !form.title || !form.service ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                }}
              >
                {busy ? 'INVESTIGATING…' : 'DISPATCH CHIMERA'}
              </button>
            </div>
          </div>

          {/* Event feed */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <EventFeed events={events} />
          </div>
        </div>

        {/* Main graph */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <AgentGraph
            nodes={nodes} edges={edges} status={status}
            topology={topology} consensus={consensus}
            checkpoint={checkpoint} resolutionMs={resolutionMs}
            fitTrigger={fitTrigger}
            onCheckpointResolve={resolveCheckpoint}
          />
        </div>
      </div>
    </div>
  );
}