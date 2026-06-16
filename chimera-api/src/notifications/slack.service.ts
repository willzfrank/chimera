import { Injectable, Logger } from '@nestjs/common';
import { ConsensusResult, Incident } from '../agents/core/types';

@Injectable()
export class SlackService {
    private readonly logger = new Logger(SlackService.name);

    async notifyResolution(
        incident: Incident,
        result: ConsensusResult,
        resolutionMs: number,
        fromMemory: boolean,
    ): Promise<void> {
        const webhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (!webhookUrl) return; 

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
        } catch (err) {
            this.logger.warn(`Slack notification failed (non-fatal): ${err}`);
        }
    }
}