'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Node, Edge } from 'reactflow';
import { getSocket } from '../lib/socket';
import { AgentRole, AgentStatus, ChimeraEvent, ConsensusResult, IncidentFormData, TopologyInfo } from '../lib/types';

export type IncidentStatus = 'idle' | 'synthesizing' | 'running' | 'consensus' | 'awaiting_human' | 'resolved';

interface AgentLayoutEntry {
    x: number; y: number; role: AgentRole; adversarialPairName?: string;
}

function buildGraphFromAgents(agents: { name: string; role: AgentRole; adversarialPairName?: string }[]): {
    nodes: Node[]; edges: Edge[]; layoutMap: Map<string, AgentLayoutEntry>;
} {
    const W = 800;
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const layoutMap = new Map<string, AgentLayoutEntry>();

    const specialists = agents.filter(a => a.role === 'specialist');
    const adversarials = agents.filter(a => a.role === 'adversarial');

    // Orchestrator
    layoutMap.set('MetaOrchestrator', { x: W / 2 - 80, y: 30, role: 'meta-orchestrator' });
    nodes.push({
        id: 'MetaOrchestrator', type: 'agentNode',
        position: { x: W / 2 - 80, y: 30 },
        data: { name: 'MetaOrchestrator', role: 'meta-orchestrator', status: 'idle' },
    });

    // Specialists
    specialists.forEach((agent, i) => {
        const x = (W / (specialists.length + 1)) * (i + 1) - 80;
        layoutMap.set(agent.name, { x, y: 210, role: 'specialist' });
        nodes.push({
            id: agent.name, type: 'agentNode',
            position: { x, y: 210 },
            data: { name: agent.name, role: 'specialist', status: 'spawning' },
        });
        edges.push({
            id: `MetaOrchestrator-${agent.name}`,
            source: 'MetaOrchestrator', target: agent.name,
            animated: false, type: 'smoothstep',
            style: { stroke: '#3b82f6', strokeWidth: 2 },
        });
    });

    // Adversarials
    adversarials.forEach((agent) => {
        const pairedIdx = specialists.findIndex(s => s.name === agent.adversarialPairName);
        const x = pairedIdx >= 0 ? (W / (specialists.length + 1)) * (pairedIdx + 1) - 60 : W / 2 - 60;
        layoutMap.set(agent.name, { x, y: 400, role: 'adversarial', adversarialPairName: agent.adversarialPairName });
        nodes.push({
            id: agent.name, type: 'agentNode',
            position: { x, y: 400 },
            data: { name: agent.name, role: 'adversarial', status: 'spawning' },
        });
        if (agent.adversarialPairName) {
            edges.push({
                id: `${agent.name}-${agent.adversarialPairName}`,
                source: agent.name, target: agent.adversarialPairName,
                animated: false, type: 'smoothstep',
                style: { stroke: '#f43f5e', strokeWidth: 2, strokeDasharray: '5 3' },
                label: '⚔ challenges',
                labelStyle: { fill: '#f43f5e', fontSize: 10, fontFamily: 'monospace' },
                labelBgStyle: { fill: '#0a0f1e' },
            });
        }
    });

    return { nodes, edges, layoutMap };
}

export function useChimera() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [events, setEvents] = useState<ChimeraEvent[]>([]);
    const [status, setStatus] = useState<IncidentStatus>('idle');
    const [topology, setTopology] = useState<TopologyInfo | null>(null);
    const [consensus, setConsensus] = useState<ConsensusResult | null>(null);
    const [incidentTitle, setIncidentTitle] = useState('');

    const idToName = useRef<Map<string, string>>(new Map());

    const updateNode = useCallback((name: string, patch: Record<string, any>) => {
        setNodes(prev => prev.map(n =>
            n.id === name ? { ...n, data: { ...n.data, ...patch } } : n,
        ));
    }, []);

    const flashEdge = useCallback((edgeId: string) => {
        setEdges(prev => prev.map(e => e.id === edgeId ? { ...e, animated: true } : e));
        setTimeout(() => {
            setEdges(prev => prev.map(e => e.id === edgeId ? { ...e, animated: false } : e));
        }, 1500);
    }, []);

    const handleEvent = useCallback((event: ChimeraEvent) => {
        setEvents(prev => [event, ...prev].slice(0, 150));
        const { type, payload } = event;

        switch (type) {
            case 'topology_built': {
                const agents = (payload.agents ?? []) as TopologyInfo['agents'];
                setTopology({ incidentClass: payload.incidentClass, rationale: payload.rationale, fromMemory: payload.fromMemory, agents });
                setStatus('synthesizing');
                const { nodes: n, edges: e } = buildGraphFromAgents(agents);
                setNodes(n);
                setEdges(e);
                break;
            }
            case 'agent_spawned': {
                const { agentId, name } = payload;
                idToName.current.set(agentId as string, name as string);
                updateNode(name as string, { agentId, status: 'idle' });
                setStatus('running');
                break;
            }
            case 'agent_thinking': {
                const name = idToName.current.get(payload.agentId as string);
                if (name) updateNode(name, { status: 'thinking' });
                break;
            }
            case 'tool_executed': {
                const name = idToName.current.get(payload.agentId as string);
                if (name) setNodes(prev => prev.map(n =>
                    n.id === name
                        ? { ...n, data: { ...n.data, toolsUsed: [...new Set([...(n.data.toolsUsed ?? []), payload.tool])] } }
                        : n,
                ));
                break;
            }
            case 'agent_message': {
                const fromName = idToName.current.get(payload.from as string);
                const toName = idToName.current.get(payload.to as string);
                if (fromName && toName) {
                    flashEdge(`${fromName}-${toName}`);
                    flashEdge(`${toName}-${fromName}`);
                    flashEdge(`MetaOrchestrator-${toName}`);
                    flashEdge(`MetaOrchestrator-${fromName}`);
                }
                break;
            }
            case 'agent_terminated': {
                const name = idToName.current.get(payload.agentId as string);
                if (name) updateNode(name, { status: 'terminated' });
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
            case 'human_checkpoint': setStatus('awaiting_human'); break;
            case 'incident_resolved': setStatus('resolved'); break;
        }
    }, [updateNode, flashEdge]);

    useEffect(() => {
        const socket = getSocket();
        socket.on('chimera:event', handleEvent);
        return () => { socket.off('chimera:event', handleEvent); };
    }, [handleEvent]);

    const submitIncident = useCallback(async (data: IncidentFormData) => {
        setNodes([]); setEdges([]); setEvents([]);
        setTopology(null); setConsensus(null);
        setStatus('synthesizing');
        setIncidentTitle(data.title);
        idToName.current.clear();

        await fetch('http://localhost:3000/incidents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).catch(console.error);
    }, []);

    return { nodes, edges, events, status, topology, consensus, incidentTitle, submitIncident };
}