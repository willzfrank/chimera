"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopologySynthesizerAgent = void 0;
const base_agent_1 = require("../core/base.agent");
const incident_tools_service_1 = require("../../tools/incident-tools.service");
const SYSTEM_PROMPT = `You are CHIMERA's Topology Synthesizer — the most critical agent in the system.

Given an incident, design the OPTIMAL multi-agent collaboration network to resolve it.

RULES:
1. Generate 2-5 specialist agents based on incident complexity
2. EVERY specialist MUST have exactly one adversarial counterpart
3. Include one "consensus" role agent only if complexity warrants it
4. System prompts MUST be hyper-specific — reference actual service names, timestamps, metrics from the incident
5. Tools must precisely match agent expertise (DB agent gets run_db_query, not check_service_health)
6. Adversarial agents challenge their paired specialist — give them the right context to do so

AVAILABLE TOOLS: ${Object.keys(incident_tools_service_1.ALL_TOOLS).join(', ')}

Respond ONLY with valid JSON (no markdown, no preamble):
{
  "incidentClass": "snake_case_type (e.g. db_connection_pool_exhaustion)",
  "rationale": "why this topology for this specific incident",
  "agents": [
    {
      "role": "specialist" | "adversarial",
      "name": "PascalCaseName",
      "systemPrompt": "hyper-specific prompt referencing incident details",
      "tools": ["tool_name"],
      "adversarialTargetName": "NameOfSpecialistThisAgentChallenges (adversarial only)"
    }
  ]
}`;
class TopologySynthesizerAgent extends base_agent_1.BaseAgent {
    constructor(qwen, bus, correlationId) {
        super({ role: 'topology-synthesizer', name: 'TopologySynthesizer', systemPrompt: SYSTEM_PROMPT, tools: [] }, qwen, bus, correlationId);
    }
    async synthesize(incident) {
        this.logger.log(`Synthesizing topology for: ${incident.title}`);
        let lastError = '';
        for (let attempt = 1; attempt <= 3; attempt++) {
            const prompt = attempt === 1
                ? `Design the optimal agent topology for this incident:\n\n${JSON.stringify(incident, null, 2)}`
                : `Previous attempt returned invalid JSON: ${lastError}\n\nTry again. Return ONLY valid JSON, no text outside the object.\n\nIncident:\n${JSON.stringify(incident, null, 2)}`;
            const response = await this.think(prompt);
            try {
                const raw = JSON.parse(response.content.replace(/```json|```/g, '').trim());
                if (!Array.isArray(raw.agents) || raw.agents.length === 0) {
                    lastError = 'agents array is empty or missing';
                    this.logger.warn(`Attempt ${attempt}: invalid topology — ${lastError}`);
                    continue;
                }
                const spec = this.buildTopologySpec(raw);
                this.logger.log(`Topology ready (attempt ${attempt}): class=${spec.incidentClass}, agents=${spec.agents.length}`);
                return spec;
            }
            catch (err) {
                lastError = err.message;
                this.logger.warn(`Attempt ${attempt}: JSON parse failed — ${lastError}`);
            }
        }
        throw new Error(`TopologySynthesizer failed after 3 attempts. Last error: ${lastError}`);
    }
    buildTopologySpec(raw) {
        const agents = raw.agents.map((a) => ({
            role: a.role,
            name: a.name,
            systemPrompt: a.systemPrompt,
            tools: this.resolveTools(a.tools ?? []),
            adversarialPairName: a.adversarialTargetName ?? undefined,
        }));
        const communicationGraph = {};
        const specialists = agents.filter((a) => a.role === 'specialist');
        const adversarials = agents.filter((a) => a.role === 'adversarial');
        for (const s of specialists) {
            communicationGraph[s.name] = ['orchestrator'];
        }
        for (const a of adversarials) {
            communicationGraph[a.name] = ['orchestrator'];
        }
        return {
            incidentClass: raw.incidentClass ?? 'unknown',
            rationale: raw.rationale ?? '',
            agents,
            communicationGraph,
        };
    }
    resolveTools(names) {
        return names.map((n) => incident_tools_service_1.ALL_TOOLS[n]).filter(Boolean);
    }
    async handleMessage(_msg) {
    }
}
exports.TopologySynthesizerAgent = TopologySynthesizerAgent;
//# sourceMappingURL=topology-synthesizer.agent.js.map