"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DbService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let DbService = DbService_1 = class DbService {
    logger = new common_1.Logger(DbService_1.name);
    pool;
    constructor() {
        this.pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
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
};
exports.DbService = DbService;
exports.DbService = DbService = DbService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DbService);
//# sourceMappingURL=db.service.js.map