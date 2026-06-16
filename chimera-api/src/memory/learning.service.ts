import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { DbService } from './db.service';

@Injectable()
export class LearningService {
    private readonly logger = new Logger(LearningService.name);
    private readonly openai: OpenAI;

    constructor(private readonly db: DbService) {
        this.openai = new OpenAI({
            apiKey: process.env.QWEN_API_KEY,
            baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
        });
    }

    /**
     * After a successful resolution: extract reusable diagnostic patterns.
     * These are injected into future topology synthesis for the same incident class.
     */
    async extractAndStore(
        incidentClass: string,
        incidentDescription: string,
        specialistFindings: string[],
        decision: string,
        confidence: number,
    ): Promise<void> {
        if (confidence < 0.75) return; // only learn from high-confidence resolutions

        try {
            const response = await this.openai.chat.completions.create({
                model: 'qwen-plus',
                temperature: 0.2,
                messages: [
                    {
                        role: 'system',
                        content: `You are a systems reliability expert extracting reusable diagnostic patterns from resolved incidents.
Extract 3-5 concise, generalizable patterns that would help future agents diagnose similar incidents faster.
Each pattern must be a single sentence starting with a signal word ("High", "When", "If", "Presence of").
Respond ONLY with a JSON array of strings. No markdown, no preamble.`,
                    },
                    {
                        role: 'user',
                        content: `INCIDENT CLASS: ${incidentClass}
INCIDENT: ${incidentDescription}

SPECIALIST FINDINGS:
${specialistFindings.map((f, i) => `[${i + 1}] ${f.slice(0, 400)}`).join('\n')}

RESOLUTION: ${decision}

Extract the diagnostic patterns.`,
                    },
                ],
            });

            let patterns: string[] = [];
            try {
                patterns = JSON.parse(response.choices[0].message.content?.replace(/```json|```/g, '').trim() ?? '[]');
            } catch {
                this.logger.warn('Learning extraction parse failed');
                return;
            }

            for (const pattern of patterns.filter(p => typeof p === 'string' && p.length > 10)) {
                await this.db.pool.query(
                    `INSERT INTO agent_learnings (incident_class, pattern, evidence, confidence)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (incident_class, pattern)
           DO UPDATE SET usage_count = agent_learnings.usage_count + 1,
                         confidence  = (agent_learnings.confidence + EXCLUDED.confidence) / 2`,
                    [incidentClass, pattern.slice(0, 500), decision.slice(0, 200), confidence],
                );
            }

            this.logger.log(`Extracted ${patterns.length} patterns for class: ${incidentClass}`);
        } catch (err) {
            this.logger.warn(`Learning extraction failed (non-fatal): ${err}`);
        }
    }

    /**
     * Retrieve top patterns for a given incident class to inject into synthesis.
     */
    async getPatterns(incidentClass: string, limit = 5): Promise<string[]> {
        try {
            const { rows } = await this.db.pool.query<{ pattern: string }>(
                `SELECT pattern FROM agent_learnings
         WHERE incident_class = $1
         ORDER BY confidence DESC, usage_count DESC
         LIMIT $2`,
                [incidentClass, limit],
            );
            return rows.map(r => r.pattern);
        } catch {
            return [];
        }
    }

    async getAllLearnings(): Promise<any[]> {
        const { rows } = await this.db.pool.query(
            `SELECT incident_class, pattern, confidence, usage_count, created_at
       FROM agent_learnings
       ORDER BY incident_class, confidence DESC`,
        );
        return rows;
    }
}