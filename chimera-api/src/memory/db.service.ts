import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DbService.name);
    readonly pool: Pool;

    constructor() {
        this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    }

    async onModuleInit() {
        await this.pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS topology_memories (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        incident_class  TEXT NOT NULL,
        description     TEXT NOT NULL,
        embedding       vector(1024),
        topology_spec   JSONB NOT NULL,
        confidence      FLOAT NOT NULL,
        resolution_ms   INTEGER,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        await this.pool.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id              UUID PRIMARY KEY,
        title           TEXT NOT NULL,
        severity        TEXT NOT NULL,
        service         TEXT NOT NULL,
        incident_class  TEXT,
        from_memory     BOOLEAN DEFAULT FALSE,
        agents_used     INTEGER,
        confidence      FLOAT,
        resolution_ms   INTEGER,
        decision        TEXT,
        dissents        INTEGER DEFAULT 0,
        tokens_used     INTEGER DEFAULT 0,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        resolved_at     TIMESTAMPTZ
      )
    `);
        await this.pool.query(`
      CREATE INDEX IF NOT EXISTS topology_memories_vec_idx
      ON topology_memories USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
        this.logger.log('pgvector ready');
    }

    async onModuleDestroy() {
        await this.pool.end();
    }
}