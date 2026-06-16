'use client';
import ReactFlow, {
    Background, Controls, MiniMap,
    BackgroundVariant, Node, Edge,
    ReactFlowProvider, useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useEffect } from 'react';
import AgentNode from './nodes/AgentNode';
import { IncidentStatus } from '../hooks/useChimera';
import { ConsensusResult, HumanCheckpoint, TopologyInfo } from '../lib/types';

const nodeTypes = { agentNode: AgentNode };

const STATUS_LABEL: Record<IncidentStatus, string> = {
    idle: 'Waiting for incident',
    synthesizing: '🧬  Synthesizing agent topology...',
    running: '⚡  Agent society investigating...',
    consensus: '⚖️  Reaching consensus...',
    awaiting_human: '👤  Awaiting human approval',
    resolved: '✅  Incident resolved',
};

interface Props {
    nodes: Node[];
    edges: Edge[];
    status: IncidentStatus;
    topology: TopologyInfo | null;
    consensus: ConsensusResult | null;
    checkpoint: HumanCheckpoint | null;
    resolutionMs: number | null;
    fitTrigger: number;
    onSelect?: (name: string) => void;
    onCheckpointResolve: (approved: boolean) => void;
}

// Inner component — has access to useReactFlow()
function GraphCanvas({ nodes, edges, fitTrigger }: Pick<Props, 'nodes' | 'edges' | 'fitTrigger'>) {
    const { fitView } = useReactFlow();

    useEffect(() => {
        if (fitTrigger > 0 && nodes.length > 0) {
            setTimeout(() => fitView({ padding: 0.28, duration: 600 }), 250);
        }
    }, [fitTrigger, nodes.length, fitView]);

    return (
        <ReactFlow
            nodes={nodes} edges={edges}
            nodeTypes={nodeTypes}
            fitView fitViewOptions={{ padding: 0.28 }}
            proOptions={{ hideAttribution: true }}
            minZoom={0.3} maxZoom={1.5}
        >
            <Background color="#111827" variant={BackgroundVariant.Dots} gap={22} size={1} />
            <Controls style={{ background: '#0c1221', border: '1px solid #1e293b', borderRadius: 8 }} />
            <MiniMap
                nodeColor={n => ({
                    'meta-orchestrator': '#3b82f6',
                    specialist: '#10b981',
                    adversarial: '#f43f5e',
                }[n.data?.role as string] ?? '#334155')}
                style={{ background: '#0c1221', border: '1px solid #1e293b', borderRadius: 8 }}
            />
        </ReactFlow>
    );
}

export function AgentGraph({
    nodes, edges, status, topology, consensus,
    checkpoint, resolutionMs, fitTrigger, onSelect, onCheckpointResolve,
}: Props) {
    const confColor = (c: number) => c >= 0.8 ? '#10b981' : c >= 0.6 ? '#f59e0b' : '#f43f5e';
    const graphNodes = nodes.map(n => ({
        ...n,
        data: { ...n.data, onSelect: (name: string) => onSelect?.(name) },
    }));

    return (
        <div style={{
            position: 'relative', width: '100%', height: '100%',
            background: '#060d1a', borderRadius: 16, overflow: 'hidden',
            border: '1px solid #111827',
        }}>
            {/* Top bar */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 16px', background: '#06080f99',
                borderBottom: '1px solid #111827', backdropFilter: 'blur(8px)',
            }}>
                <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                    {STATUS_LABEL[status]}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {topology?.fromMemory && (
                        <span className="memory-badge" style={{
                            fontSize: 10, padding: '2px 10px', borderRadius: 20,
                            color: '#e9d5ff', fontFamily: 'monospace', fontWeight: 700,
                        }}>
                            ⚡ MEMORY RECALL
                        </span>
                    )}
                    {resolutionMs && (
                        <span style={{ fontSize: 10, color: '#10b981', fontFamily: 'monospace' }}>
                            resolved in {(resolutionMs / 1000).toFixed(1)}s
                        </span>
                    )}
                    {topology && (
                        <span style={{ fontSize: 10, color: '#334155', fontFamily: 'monospace' }}>
                            {topology.incidentClass}
                        </span>
                    )}
                </div>
            </div>

            {/* Graph */}
            <div style={{ paddingTop: 40, height: '100%' }}>
                <ReactFlowProvider>
                    <GraphCanvas nodes={graphNodes} edges={edges} fitTrigger={fitTrigger} />
                </ReactFlowProvider>
            </div>

            {/* Consensus panel */}
            {consensus && !checkpoint && (
                <div style={{
                    position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 10,
                    padding: '14px 16px', borderRadius: 12,
                    background: '#06080ff0', backdropFilter: 'blur(12px)',
                    border: `1px solid ${confColor(consensus.confidence)}44`,
                    animation: 'fadeSlideIn 0.4s ease',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, color: '#94a3b8' }}>CONSENSUS</span>
                            <span style={{
                                fontSize: 9, padding: '1px 6px', borderRadius: 4,
                                background: consensus.agreed ? '#10b98122' : '#f43f5e22',
                                color: consensus.agreed ? '#10b981' : '#f43f5e',
                                fontFamily: 'monospace', fontWeight: 700,
                            }}>
                                {consensus.agreed ? 'AGREED' : 'CONTESTED'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {consensus.dissents.length > 0 && (
                                <span style={{ fontSize: 10, color: '#f43f5e' }}>
                                    ⚔ {consensus.dissents.length} dissent(s)
                                </span>
                            )}
                            <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: confColor(consensus.confidence) }}>
                                {(consensus.confidence * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>

                    {/* Confidence bar */}
                    <div style={{ height: 3, background: '#1e293b', borderRadius: 99, marginBottom: 10 }}>
                        <div style={{
                            height: '100%', borderRadius: 99,
                            width: `${consensus.confidence * 100}%`,
                            background: confColor(consensus.confidence),
                            transition: 'width 0.8s ease',
                        }} />
                    </div>

                    <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>
                        {consensus.decision}
                    </p>
                </div>
            )}

            {/* Human checkpoint modal */}
            {checkpoint && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 20,
                    background: '#00000088', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeSlideIn 0.3s ease',
                }}>
                    <div style={{
                        background: '#0c1221', border: '1px solid #f59e0b',
                        borderRadius: 16, padding: 28, maxWidth: 480, width: '90%',
                        boxShadow: '0 0 60px #f59e0b22',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <span style={{ fontSize: 18 }}>👤</span>
                            <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: 3, color: '#f59e0b' }}>
                                HUMAN CHECKPOINT REQUIRED
                            </span>
                        </div>

                        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                            Agents reached consensus but confidence is below auto-approval threshold.
                        </p>

                        <div style={{
                            background: '#060d1a', border: '1px solid #1e293b',
                            borderRadius: 10, padding: 14, marginBottom: 16,
                        }}>
                            <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', marginBottom: 6 }}>
                                PROPOSED ACTION
                            </div>
                            <p style={{ fontSize: 12, color: '#e2e8f0', margin: 0, lineHeight: 1.6 }}>
                                {checkpoint.proposedAction}
                            </p>
                            <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                                <span style={{ fontSize: 10, color: '#64748b' }}>
                                    Confidence: <span style={{ color: '#f59e0b', fontFamily: 'monospace' }}>
                                        {checkpoint.agentConsensus?.confidence
                                            ? `${(checkpoint.agentConsensus.confidence * 100).toFixed(0)}%`
                                            : 'N/A'}
                                    </span>
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={() => onCheckpointResolve(true)}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: 8,
                                    background: '#10b98122', border: '1px solid #10b981',
                                    color: '#10b981', fontWeight: 700, fontSize: 12,
                                    cursor: 'pointer', letterSpacing: 1,
                                }}
                            >
                                ✓ APPROVE
                            </button>
                            <button
                                onClick={() => onCheckpointResolve(false)}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: 8,
                                    background: '#f43f5e22', border: '1px solid #f43f5e',
                                    color: '#f43f5e', fontWeight: 700, fontSize: 12,
                                    cursor: 'pointer', letterSpacing: 1,
                                }}
                            >
                                ✗ REJECT
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {nodes.length === 0 && status === 'idle' && (
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>⚡</div>
                        <p style={{ color: '#1e293b', fontSize: 13, margin: 0 }}>
                            Submit an incident to watch CHIMERA respond
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}