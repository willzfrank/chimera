'use client';

interface Props {
    agentName: string | null;
    reasoning: string | null;
    onClose: () => void;
}

export function ReasoningPanel({ agentName, reasoning, onClose }: Props) {
    if (!agentName) return null;

    return (
        <div style={{
            position: 'fixed', right: 16, top: 80, width: 380, zIndex: 50,
            background: '#060d1a', border: '1px solid #1e293b', borderRadius: 14,
            boxShadow: '0 0 40px #00000088',
            animation: 'fadeSlideIn 0.25s ease',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderBottom: '1px solid #111827',
            }}>
                <div>
                    <div style={{ fontSize: 9, color: '#334155', fontFamily: 'monospace', letterSpacing: 2, marginBottom: 2 }}>
                        AGENT REASONING
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>
                        {agentName.replace(/([a-z])([A-Z])/g, '$1 $2')}
                    </div>
                </div>
                <button onClick={onClose} style={{
                    background: 'none', border: 'none', color: '#334155',
                    fontSize: 16, cursor: 'pointer', padding: 4,
                }}>×</button>
            </div>

            {/* Content */}
            <div style={{ padding: 16 }}>
                {reasoning ? (
                    <p style={{
                        fontSize: 11, color: '#94a3b8', lineHeight: 1.75,
                        margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                        {reasoning}
                    </p>
                ) : (
                    <p style={{ fontSize: 11, color: '#334155', fontStyle: 'italic' }}>
                        Agent has not yet reported findings.
                    </p>
                )}
            </div>

            <div style={{
                padding: '8px 16px', borderTop: '1px solid #111827',
                fontSize: 9, color: '#1e293b', fontFamily: 'monospace',
            }}>
                click any agent node to inspect · close to dismiss
            </div>
        </div>
    );
}