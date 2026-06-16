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
var QwenClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QwenClient = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = __importDefault(require("openai"));
const CB_FAILURE_THRESHOLD = 5;
const CB_RESET_MS = 30_000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1_000;
let QwenClient = QwenClient_1 = class QwenClient {
    logger = new common_1.Logger(QwenClient_1.name);
    client;
    cb = { failures: 0, lastFailure: 0, state: 'closed' };
    totalUsage = { promptTokens: 0, completionTokens: 0, requests: 0 };
    onCircuitOpen;
    constructor() {
        this.client = new openai_1.default({
            apiKey: process.env.QWEN_API_KEY,
            baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
            timeout: 30_000,
        });
    }
    setCircuitOpenCallback(fn) {
        this.onCircuitOpen = fn;
    }
    async complete(req) {
        this.assertCircuitClosed();
        return this.withRetry(() => this.doComplete(req));
    }
    async doComplete(req) {
        const tools = req.tools?.map((t) => ({
            type: 'function',
            function: { name: t.name, description: t.description, parameters: t.parameters },
        }));
        try {
            const response = await this.client.chat.completions.create({
                model: req.model ?? 'qwen-plus',
                temperature: req.temperature ?? 0.3,
                max_tokens: req.maxTokens ?? 4_096,
                messages: [{ role: 'system', content: req.systemPrompt }, ...req.messages],
                ...(tools?.length ? { tools } : {}),
            });
            const choice = response.choices[0];
            const toolCalls = (choice.message.tool_calls ?? [])
                .filter((tc) => tc.type === 'function')
                .map((tc) => ({
                id: tc.id,
                name: tc.function.name,
                arguments: JSON.parse(tc.function.arguments),
            }));
            const rawAssistantMessage = {
                role: 'assistant',
                content: choice.message.content ?? null,
                ...(choice.message.tool_calls?.length ? { tool_calls: choice.message.tool_calls } : {}),
            };
            const usage = {
                promptTokens: response.usage?.prompt_tokens ?? 0,
                completionTokens: response.usage?.completion_tokens ?? 0,
            };
            this.totalUsage.promptTokens += usage.promptTokens;
            this.totalUsage.completionTokens += usage.completionTokens;
            this.totalUsage.requests++;
            this.onSuccess();
            this.logger.debug(`[${req.model ?? 'qwen-plus'}] ${usage.promptTokens}p+${usage.completionTokens}c tokens | total=${this.totalUsage.promptTokens + this.totalUsage.completionTokens}`);
            return {
                content: choice.message.content ?? '',
                toolCalls,
                rawAssistantMessage: rawAssistantMessage,
                usage: { promptTokens: response.usage?.prompt_tokens ?? 0, completionTokens: response.usage?.completion_tokens ?? 0 },
                model: response.model,
            };
        }
        catch (err) {
            this.onFailure();
            throw err;
        }
    }
    assertCircuitClosed() {
        if (this.cb.state !== 'open')
            return;
        const elapsed = Date.now() - this.cb.lastFailure;
        if (elapsed > CB_RESET_MS) {
            this.cb.state = 'half-open';
            this.logger.warn('Circuit breaker → half-open, probing');
            return;
        }
        const retryIn = Math.ceil((CB_RESET_MS - elapsed) / 1_000);
        throw new Error(`Circuit breaker OPEN — retry in ${retryIn}s`);
    }
    onSuccess() {
        if (this.cb.state === 'half-open') {
            this.cb = { failures: 0, lastFailure: 0, state: 'closed' };
            this.logger.log('Circuit breaker → closed');
        }
        if (this.cb.state === 'closed')
            this.cb.failures = 0;
    }
    onFailure() {
        this.cb.failures++;
        this.cb.lastFailure = Date.now();
        if (this.cb.failures >= CB_FAILURE_THRESHOLD) {
            this.cb.state = 'open';
            this.logger.error(`Circuit breaker OPEN after ${this.cb.failures} failures`);
            this.onCircuitOpen?.();
        }
    }
    async withRetry(fn) {
        let lastErr;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                return await fn();
            }
            catch (err) {
                lastErr = err;
                const retryable = err.status === 429 || err.status >= 500;
                if (!retryable)
                    throw err;
                const delay = Math.min(BASE_RETRY_DELAY_MS * 2 ** attempt + Math.random() * 500, 10_000);
                this.logger.warn(`Qwen ${err.status} — retrying in ${delay.toFixed(0)}ms (${attempt + 1}/${MAX_RETRIES})`);
                await this.sleep(delay);
            }
        }
        throw lastErr;
    }
    getMetrics() {
        return { ...this.totalUsage, circuitBreaker: { ...this.cb } };
    }
    sleep = (ms) => new Promise((r) => setTimeout(r, ms));
};
exports.QwenClient = QwenClient;
exports.QwenClient = QwenClient = QwenClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], QwenClient);
//# sourceMappingURL=qwen.client.js.map