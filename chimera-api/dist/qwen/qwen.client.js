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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QwenClient = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = __importDefault(require("openai"));
let QwenClient = class QwenClient {
    client;
    constructor() {
        this.client = new openai_1.default({
            apiKey: process.env.QWEN_API_KEY,
            baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
        });
    }
    async complete(req) {
        const tools = req.tools?.map((t) => ({
            type: 'function',
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
            },
        }));
        const response = await this.client.chat.completions.create({
            model: req.model ?? 'qwen-plus',
            temperature: req.temperature ?? 0.3,
            messages: [
                { role: 'system', content: req.systemPrompt },
                ...req.messages,
            ],
            ...(tools?.length ? { tools } : {}),
        });
        const choice = response.choices[0];
        const toolCalls = (choice.message.tool_calls ?? [])
            .filter((tc) => tc.type === 'function')
            .map((tc) => ({
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
        }));
        return {
            content: choice.message.content ?? '',
            toolCalls,
            usage: {
                promptTokens: response.usage?.prompt_tokens ?? 0,
                completionTokens: response.usage?.completion_tokens ?? 0,
            },
        };
    }
};
exports.QwenClient = QwenClient;
exports.QwenClient = QwenClient = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], QwenClient);
//# sourceMappingURL=qwen.client.js.map