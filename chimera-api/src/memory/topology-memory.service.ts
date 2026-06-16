import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { DbService } from './db.service';
import { TopologySpec } from '../agents/core/types';

const SIMILARITY_THRESHOLD = 0.88;

@Injectable()
export class TopologyMemoryService {
    private readonly logger = new Logger(TopologyMemoryService.name);
    private readonly openai: OpenAI;

    constructor(private readonly db: DbService) {
        this.openai = new OpenAI({
            apiKey: process.env.QWEN_API_KEY,
            baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
        });
    }

    async recall(description: string): Promise<TopologySpec | null> {
        try {
            const embedding = await this.embed(description);
            const { rows } = await this.db.pool.query<{
                incident_class: string;
                topology_spec: TopologySpec;
                similarity: number;
            }>(
                `SELECT incident_class, topology_spec,
                1 - (embedding <=> $1::vector) AS similarity
         FROM topology_memories
         WHERE 1 - (embedding <=> $1::vector) > $2
         ORDER BY embedding <=> $1::vector
         LIMIT 1`,
                [JSON.stringify(embedding), SIMILARITY_THRESHOLD],
            );

            if (!rows.length) return null;

            this.logger.log(
                `Memory HIT: class=${rows[0].incident_class} similarity=${rows[0].similarity.toFixed(3)}`,
            );
            return rows[0].topology_spec;
        } catch (err) {
            this.logger.warn(`Memory recall failed (non-fatal): ${err}`);
            return null;
        }
    }

    async store(
        description: string,
        topology: TopologySpec,
        confidence: number,
        resolutionMs: number,
    ): Promise<void> {
        try {
            const embedding = await this.embed(description);
            await this.db.pool.query(
                `INSERT INTO topology_memories
           (incident_class, description, embedding, topology_spec, confidence, resolution_ms)
         VALUES ($1, $2, $3::vector, $4, $5, $6)`,
                [topology.incidentClass, description, JSON.stringify(embedding), JSON.stringify(topology), confidence, resolutionMs],
            );
            this.logger.log(`Stored memory: ${topology.incidentClass}`);
        } catch (err) {
            this.logger.warn(`Memory store failed (non-fatal): ${err}`);
        }
    }

    private async embed(text: string): Promise<number[]> {
        const res = await this.openai.embeddings.create({
            model: 'text-embedding-v3',
            input: text.slice(0, 2000),
            dimensions: 1024,
        } as any);
        return res.data[0].embedding;
    }
}