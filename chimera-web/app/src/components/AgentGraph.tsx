'use client';
import ReactFlow, { Background, Controls, MiniMap, BackgroundVariant, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import AgentNode from './nodes/AgentNode';
import { IncidentStatus } from '../hooks/useChimera';
import { ConsensusResult, TopologyInfo } from '../lib/types';

const nodeTypes = { agentNode: AgentNode };

const STATUS_LABEL: Record<IncidentStatus, string> = {
    idle: 'Waiting for incident',
    synthesizing: '🧬 Synthesizing agent topology...',
    running: '⚡ Agent society investigating...',
    consensus: '⚖ Reaching consensus...',
    awaiting_human: '👤 Awaiting human approval',
    resolved: '✅ Incident resolved',
};

export function AgentGraph({ nodes, edges, status, topology, consensus }: {
    nodes: Node[]; edges: Edge[];
    status: IncidentStatus;
    topology: TopologyInfo | null;
    consensus: ConsensusResult | null;
}) {
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#070c18', borderRadius: 16, overflow: 'hidden', border: '1px solid #1e293b' }}>

            {/* Status bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#07091488', borderBottom: '1px solid #1e293b', backdropFilter: 'blur(8px)' }}>
                <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{STATUS_LABEL[status]}</span>
                {topology && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {topology.fromMemory && (
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: '#3b0764', color: '#c084fc', border: '1px solid #7c3aed', fontFamily: 'monospace' }}>
                                ⚡ MEMORY RECALL
                            </span>
                        )}
                        <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{topology.incidentClass}</span>
                    </div>
                )}
            </div>

            <div style={{ paddingTop: 40, height: '100%' }}>
                <ReactFlow
                    nodes={nodes} edges={edges}
                    nodeTypes={nodeTypes}
                    fitView fitViewOptions={{ padding: 0.25 }}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background color="#1a2236" variant={BackgroundVariant.Dots} gap={24} size={1} />
                    <Controls style={{ background: '#0f172a', border: '1px solid #334155' }} />
                    <MiniMap
                        nodeColor={n => ({ 'meta-orchestrator': '#3b82f6', specialist: '#10b981', adversarial: '#f43f5e' }[n.data?.role as string] ?? '#64748b')}
                        style={{ background: '#0f172a', border: '1px solid #334155' }}
                    />
                </ReactFlow>
            </div>

            {/* Consensus panel */}
            {consensus && (
                <div style={{
                    position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 10,
                    padding: 16, borderRadius: 12, background: '#07091af0',
                    border: `1px solid ${consensus.confidence > 0.7 ? '#10b981' : '#f59e0b'}`,
                    backdropFilter: 'blur(8px)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 2 }}>CONSENSUS</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: consensus.confidence > 0.7 ? '#10b981' : '#f59e0b' }}>
                                {(consensus.confidence * 100).toFixed(0)}% confidence
                            </span>
                            {consensus.requiresHumanCheckpoint && (
                                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#451a0380', color: '#fbbf24', border: '1px solid #78350f' }}>
                                    HUMAN REQUIRED
                                </span>
                            )}
                        </div>
                    </div>
                    <p style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>{consensus.decision}</p>
                    {consensus.dissents.length > 0 && (
                        <p style={{ fontSize: 10, color: '#fb7185', marginTop: 6 }}>
                            ⚔ {consensus.dissents.length} adversarial challenge(s) raised
                        </p>
                    )}
                </div>
            )}

            {nodes.length === 0 && status === 'idle' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
                        <p style={{ color: '#334155', fontSize: 13 }}>Submit an incident to watch CHIMERA respond</p>
                    </div>
                </div>
            )}
        </div>
    );
}