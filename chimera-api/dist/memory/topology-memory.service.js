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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var TopologyMemoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopologyMemoryService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = __importDefault(require("openai"));
const db_service_1 = require("./db.service");
const SIMILARITY_THRESHOLD = 0.88;
let TopologyMemoryService = TopologyMemoryService_1 = class TopologyMemoryService {
    db;
    logger = new common_1.Logger(TopologyMemoryService_1.name);
    openai;
    constructor(db) {
        this.db = db;
        this.openai = new openai_1.default({
            apiKey: process.env.QWEN_API_KEY,
            baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
        });
    }
    async recall(description) {
        try {
            const embedding = await this.embed(description);
            const { rows } = await this.db.pool.query(`SELECT incident_class, topology_spec,
                1 - (embedding <=> $1::vector) AS similarity
         FROM topology_memories
         WHERE 1 - (embedding <=> $1::vector) > $2
         ORDER BY embedding <=> $1::vector
         LIMIT 1`, [JSON.stringify(embedding), SIMILARITY_THRESHOLD]);
            if (!rows.length)
                return null;
            this.logger.log(`Memory HIT: class=${rows[0].incident_class} similarity=${rows[0].similarity.toFixed(3)}`);
            return rows[0].topology_spec;
        }
        catch (err) {
            this.logger.warn(`Memory recall failed (non-fatal): ${err}`);
            return null;
        }
    }
    async store(description, topology, confidence, resolutionMs) {
        try {
            const embedding = await this.embed(description);
            await this.db.pool.query(`INSERT INTO topology_memories
           (incident_class, description, embedding, topology_spec, confidence, resolution_ms)
         VALUES ($1, $2, $3::vector, $4, $5, $6)`, [topology.incidentClass, description, JSON.stringify(embedding), JSON.stringify(topology), confidence, resolutionMs]);
            this.logger.log(`Stored memory: ${topology.incidentClass}`);
        }
        catch (err) {
            this.logger.warn(`Memory store failed (non-fatal): ${err}`);
        }
    }
    async embed(text) {
        const res = await this.openai.embeddings.create({
            model: 'text-embedding-v3',
            input: text.slice(0, 2000),
            dimensions: 1024,
        });
        return res.data[0].embedding;
    }
};
exports.TopologyMemoryService = TopologyMemoryService;
exports.TopologyMemoryService = TopologyMemoryService = TopologyMemoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_service_1.DbService])
], TopologyMemoryService);
//# sourceMappingURL=topology-memory.service.js.map