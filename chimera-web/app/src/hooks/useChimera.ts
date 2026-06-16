'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Node, Edge } from 'reactflow';
import { getSocket } from '../lib/socket';
import {
    AgentRole, AgentStatus, ChimeraEvent,
    ConsensusResult, HumanCheckpoint, IncidentFormData, TopologyInfo,
} from '../lib/types';

export type IncidentStatus =
    | 'idle' | 'synthesizing' | 'running'
    | 'consensus' | 'awaiting_human' | 'resolved';

function splitCamel(name: string): string {
    return name.replace(/([a-z])([A-Z])/g, '$1 $2');
}

interface AgentInfo { name: string; role: AgentRole; adversarialPairName?: string }

function buildGraph(agents: AgentInfo[]): { nodes: Node[]; edges: Edge[] } {
    const W = 820;
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const specialists = agents.filter(a => a.role === 'specialist');
    const adversarials = agents.filter(a => a.role === 'adversarial');

    // Orchestrator
    nodes.push({
        id: 'MetaOrchestrator', type: 'agentNode',
        position: { x: W / 2 - 90, y: 20 },
        data: { name: 'MetaOrchestrator', role: 'meta-orchestrator', status: 'idle' },
    });

    specialists.forEach((agent, i) => {
        const x = (W / (specialists.length + 1)) * (i + 1) - 90;
        nodes.push({
            id: agent.name, type: 'agentNode',
            position: { x, y: 200 },
            data: { name: agent.name, role: 'specialist', status: 'spawning' },
        });
        edges.push({
            id: `orch-${agent.name}`,
            source: 'MetaOrchestrator', target: agent.name,
            type: 'smoothstep', animated: false,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
        });
    });

    adversarials.forEach((agent) => {
        const pairIdx = specialists.findIndex(s => s.name === agent.adversarialPairName);
        const x = pairIdx >= 0
            ? (W / (specialists.length + 1)) * (pairIdx + 1) - 70
            : W / 2 - 70;
        nodes.push({
            id: agent.name, type: 'agentNode',
            position: { x, y: 410 },
            data: { name: agent.name, role: 'adversarial', status: 'spawning' },
        });
        if (agent.adversarialPairName) {
            edges.push({
                id: `adv-${agent.name}`,
                source: agent.name, target: agent.adversarialPairName,
                type: 'smoothstep', animated: false,
                style: { stroke: '#f43f5e', strokeWidth: 1.5, strokeDasharray: '6 3' },
                label: '⚔ challenges',
                labelStyle: { fill: '#f43f5e', fontSize: 10, fontFamily: 'monospace' },
                labelBgStyle: { fill: '#08020a', fillOpacity: 0.9 },
                labelBgPadding: [4, 2] as [number, number],
            });
        }
    });

    return { nodes, edges };
}

export function useChimera() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [events, setEvents] = useState<ChimeraEvent[]>([]);
    const [status, setStatus] = useState<IncidentStatus>('idle');
    const [topology, setTopology] = useState<TopologyInfo | null>(null);
    const [consensus, setConsensus] = useState<ConsensusResult | null>(null);
    const [checkpoint, setCheckpoint] = useState<HumanCheckpoint | null>(null);
    const [incidentTitle, setIncidentTitle] = useState('');
    const [resolutionMs, setResolutionMs] = useState<number | null>(null);
    const [fitTrigger, setFitTrigger] = useState(0);
    const [agentReasonings, setAgentReasonings] = useState<Map<string, string>>(new Map());
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
    const [totalCostUsd, setTotalCostUsd] = useState(0);
    const [autoMode, setAutoMode] = useState(false);

    const idToName = useRef<Map<string, string>>(new Map());

    const patchNode = useCallback((name: string, patch: Record<string, any>) => {
        setNodes(prev =>
            prev.map(n => n.id === name ? { ...n, data: { ...n.data, ...patch } } : n),
        );
    }, []);

    const flashEdge = useCallback((id: string) => {
        setEdges(prev => prev.map(e => e.id === id ? { ...e, animated: true } : e));
        setTimeout(() => setEdges(prev => prev.map(e => e.id === id ? { ...e, animated: false } : e)), 1800);
    }, []);

    const handleEvent = useCallback((event: ChimeraEvent) => {
        setEvents(prev => [event, ...prev].slice(0, 200));
        const { type, payload } = event;

        switch (type) {
            case 'auto_incident_detected': {
                setIncidentTitle(`🤖 AUTO: ${payload.title}`);
                setStatus('synthesizing');
                break;
            }

            case 'topology_built': {
                const agents = (payload.agents ?? []) as AgentInfo[];
                setTopology({
                    incidentClass: payload.incidentClass,
                    rationale: payload.rationale,
                    fromMemory: payload.fromMemory,
                    agents,
                });
                setConsensus(null);
                setCheckpoint(null);
                setResolutionMs(null);
                setStatus('synthesizing');
                const { nodes: n, edges: e } = buildGraph(agents);
                setNodes(n);
                setEdges(e);
                setFitTrigger(t => t + 1);
                break;
            }

            case 'agent_spawned': {
                const { agentId, name } = payload;
                idToName.current.set(agentId as string, name as string);
                patchNode(name as string, { agentId, status: 'idle' });
                setStatus('running');
                break;
            }

            case 'agent_thinking': {
                const name = idToName.current.get(payload.agentId as string) ?? payload.agentName as string;
                if (name) patchNode(name, { status: 'thinking' });
                break;
            }

            case 'tool_executed': {
                const name = idToName.current.get(payload.agentId as string);
                if (name) {
                    setNodes(prev => prev.map(n =>
                        n.id === name
                            ? { ...n, data: { ...n.data, toolsUsed: [...new Set([...(n.data.toolsUsed ?? []), payload.tool])] } }
                            : n,
                    ));
                }
                break;
            }

            case 'agent_done': {
                const name = idToName.current.get(payload.agentId as string) ?? payload.agentName as string;
                if (name) patchNode(name, { status: 'done', confidence: payload.confidence });
                break;
            }

            case 'agent_reasoning': {
                const name = idToName.current.get(payload.agentId as string) ?? payload.agentName as string;
                if (name) {
                    setAgentReasonings(prev => new Map(prev).set(name, payload.reasoning as string));
                }
                break;
            }

            case 'agent_message': {
                const fromName = idToName.current.get(payload.from as string);
                const toName = idToName.current.get(payload.to as string);
                if (fromName && toName) {
                    flashEdge(`orch-${toName}`);
                    flashEdge(`orch-${fromName}`);
                    flashEdge(`adv-${fromName}`);
                }
                break;
            }

            case 'agent_terminated': {
                const name = idToName.current.get(payload.agentId as string) ?? payload.agentName as string;
                if (name) patchNode(name, { status: 'terminated' });
                break;
            }

            case 'consensus_reached': {
                setStatus('consensus');
                setConsensus({
                    agreed: payload.agreed as boolean,
                    decision: payload.decision as string,
                    confidence: payload.confidence as number,
                    dissents: [],
                    requiresHumanCheckpoint: payload.requiresHuman as boolean,
                });
                break;
            }

            case 'human_checkpoint': {
                setStatus('awaiting_human');
                setCheckpoint({
                    id: payload.id as string,
                    summary: payload.summary as string,
                    proposedAction: payload.proposedAction as string,
                    agentConsensus: payload.agentConsensus as ConsensusResult,
                    createdAt: payload.createdAt as number,
                });
                break;
            }

            case 'incident_resolved': {
                setStatus('resolved');
                setResolutionMs(payload.resolutionMs as number);
                break;
            }

            case 'tokens_consumed': {
                setTotalCostUsd(prev => prev + (payload.costUsd as number));
                break;
            }

            case 'watcher_toggled':
                setAutoMode(payload.enabled as boolean);
                break;
        }
    }, [patchNode, flashEdge]);

    useEffect(() => {
        const socket = getSocket();

        const onConnect = () => {
            socket.emit('get_history', { fromId: '0-0' }, (history: ChimeraEvent[]) => {
                if (!history?.length) return;

                const oneHourAgo = Date.now() - 3_600_000;
                const recent = history
                    .filter(e => e.timestamp > oneHourAgo)
                    .sort((a, b) => a.timestamp - b.timestamp);

                recent.forEach(handleEvent);
            });
        };

        socket.on('connect', onConnect);
        socket.on('chimera:event', handleEvent);

        if (socket.connected) onConnect();

        return () => {
            socket.off('connect', onConnect);
            socket.off('chimera:event', handleEvent);
        };
    }, [handleEvent]);

    const submitIncident = useCallback(async (data: IncidentFormData) => {
        setNodes([]); setEdges([]); setEvents([]);
        setTopology(null); setConsensus(null); setCheckpoint(null);
        setResolutionMs(null); setStatus('synthesizing');
        setIncidentTitle(data.title);
        setAgentReasonings(new Map());
        setSelectedAgent(null);
        setTotalCostUsd(0);
        idToName.current.clear();

        await fetch('http://localhost:3000/incidents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).catch(console.error);
    }, []);

    const resolveCheckpoint = useCallback(async (approved: boolean) => {
        if (!checkpoint) return;
        await fetch(`http://localhost:3000/incidents/checkpoints/${checkpoint.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ approved }),
        }).catch(console.error);
        setCheckpoint(null);
        setStatus(approved ? 'resolved' : 'idle');
    }, [checkpoint]);

    const toggleAutoMode = useCallback(async (on: boolean) => {
        await fetch('http://localhost:3000/monitoring/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: on }),
        });
        setAutoMode(on);
    }, []);

    return {
        nodes, edges, events, status, topology, consensus,
        checkpoint, incidentTitle, resolutionMs, fitTrigger,
        agentReasonings, selectedAgent, setSelectedAgent, totalCostUsd,
        autoMode, toggleAutoMode,
        submitIncident, resolveCheckpoint,
    };
}