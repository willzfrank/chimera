"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SlackService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackService = void 0;
const common_1 = require("@nestjs/common");
let SlackService = SlackService_1 = class SlackService {
    logger = new common_1.Logger(SlackService_1.name);
    async notifyResolution(incident, result, resolutionMs, fromMemory) {
        const webhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (!webhookUrl)
            return;
        const color = incident.severity === 'P0' ? '#ef4444'
            : incident.severity === 'P1' ? '#f97316' : '#f59e0b';
        const payload = {
            attachments: [{
                    color,
                    blocks: [
                        {
                            type: 'header',
                            text: { type: 'plain_text', text: `⚡ CHIMERA Resolved: ${incident.title}` },
                        },
                        {
                            type: 'section',
                            fields: [
                                { type: 'mrkdwn', text: `*Severity:*\n${incident.severity}` },
                                { type: 'mrkdwn', text: `*Resolution Time:*\n${(resolutionMs / 1000).toFixed(1)}s${fromMemory ? ' ⚡ (memory recall)' : ''}` },
                                { type: 'mrkdwn', text: `*Confidence:*\n${(result.confidence * 100).toFixed(0)}%` },
                                { type: 'mrkdwn', text: `*Dissents:*\n${result.dissents.length} adversarial challenge(s)` },
                            ],
                        },
                        {
                            type: 'section',
                            text: { type: 'mrkdwn', text: `*Decision:*\n${result.decision}` },
                        },
                    ],
                }],
        };
        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            this.logger.log(`Slack notification sent for incident ${incident.id}`);
        }
        catch (err) {
            this.logger.warn(`Slack notification failed (non-fatal): ${err}`);
        }
    }
};
exports.SlackService = SlackService;
exports.SlackService = SlackService = SlackService_1 = __decorate([
    (0, common_1.Injectable)()
], SlackService);
//# sourceMappingURL=slack.service.js.map