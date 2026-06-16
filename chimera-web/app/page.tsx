'use client';
import { useState } from 'react';
import { AgentGraph } from './src/components/AgentGraph';
import { EventFeed } from './src/components/EventFeed';
import { useChimera } from './src/hooks/useChimera';
import { IncidentFormData } from './src/lib/types';

const DEMOS: IncidentFormData[] = [
  { title: 'API connection pool exhausted — chimera-api', description: 'HikariCP at max 100 connections. 47 threads waiting. 503s since deploy v2.14.1 at 14:20 UTC.', severity: 'P0', service: 'chimera-api' },
  { title: 'Payment service p99 latency spike', description: 'Payment processing latency jumped from 200ms to 8900ms at p99. Error rate 12%. No recent deployments. Spike started after traffic doubled.', severity: 'P1', service: 'payment-service' },
  { title: 'Redis cache hit rate collapsed to 4%', description: 'Cache hit rate dropped from 94% to 4% after maintenance window. Memory usage normal. Possible key eviction or misconfigured TTL.', severity: 'P1', service: 'cache-layer' },
];

const SEV_COLOR: Record<string, string> = { P0: '#ef4444', P1: '#f97316', P2: '#f59e0b', P3: '#3b82f6' };

export default function Home() {
  const { nodes, edges, events, status, topology, consensus, incidentTitle, submitIncident } = useChimera();
  const [form, setForm] = useState<IncidentFormData>({ title: '', description: '', severity: 'P1', service: '' });
  const busy = status !== 'idle' && status !== 'resolved';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#040810', color: '#fff', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid #0f172a', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }} />
          <span style={{ fontWeight: 800, letterSpacing: 6, fontSize: 13 }}>CHIMERA</span>
          <span style={{ color: '#334155', fontSize: 11 }}>autonomous incident response</span>
        </div>
        {incidentTitle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: '#64748b', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{incidentTitle}</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: `1px solid ${busy ? '#3b82f6' : status === 'resolved' ? '#10b981' : '#f59e0b'}`, color: busy ? '#3b82f6' : status === 'resolved' ? '#10b981' : '#f59e0b', fontFamily: 'monospace', fontWeight: 700 }}>
              {status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        )}
        <span style={{ fontSize: 10, color: '#1e293b', fontFamily: 'monospace' }}>qwen cloud · alibaba cloud</span>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: 12, padding: 12, overflow: 'hidden' }}>

        {/* Left panel */}
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>

          {/* Form */}
          <div style={{ background: '#070c18', border: '1px solid #1e293b', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 3, marginBottom: 10 }}>SUBMIT INCIDENT</div>

            {DEMOS.map((d, i) => (
              <button key={i} onClick={() => { setForm(d); submitIncident(d); }} disabled={busy}
                style={{ width: '100%', textAlign: 'left', padding: '6px 8px', marginBottom: 4, borderRadius: 6, border: '1px solid #1e293b', background: 'transparent', color: busy ? '#1e293b' : '#94a3b8', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 10, transition: 'all 0.2s' }}>
                <span style={{ color: SEV_COLOR[d.severity], fontWeight: 700, marginRight: 6, fontFamily: 'monospace' }}>{d.severity}</span>
                {d.title.slice(0, 32)}…
              </button>
            ))}

            <div style={{ borderTop: '1px solid #0f172a', marginTop: 10, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Incident title"
                style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: '6px 8px', fontSize: 11, color: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" rows={3}
                style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: '6px 8px', fontSize: 11, color: '#fff', outline: 'none', resize: 'none', width: '100%', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value as any }))}
                  style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: '6px 8px', fontSize: 11, color: '#fff', outline: 'none' }}>
                  {['P0', 'P1', 'P2', 'P3'].map(s => <option key={s}>{s}</option>)}
                </select>
                <input value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))} placeholder="service"
                  style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: '6px 8px', fontSize: 11, color: '#fff', outline: 'none' }} />
              </div>
              <button onClick={() => submitIncident(form)} disabled={busy || !form.title || !form.service}
                style={{ padding: '8px', borderRadius: 8, border: 'none', background: busy ? '#1e293b' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: busy ? '#334155' : '#fff', fontSize: 11, fontWeight: 700, letterSpacing: 2, cursor: busy ? 'not-allowed' : 'pointer' }}>
                {busy ? 'RUNNING…' : 'DISPATCH CHIMERA'}
              </button>
            </div>
          </div>

          {/* Event feed */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <EventFeed events={events} />
          </div>
        </div>

        {/* Graph */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <AgentGraph nodes={nodes} edges={edges} status={status} topology={topology} consensus={consensus} />
        </div>
      </div>
    </div>
  );
}