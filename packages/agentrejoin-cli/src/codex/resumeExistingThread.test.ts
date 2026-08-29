import { describe, expect, it, vi } from 'vitest';

import { resumeExistingThread } from './resumeExistingThread';

describe('resumeExistingThread', () => {
    it('resumes the thread and updates session metadata', async () => {
        const client = {
            resumeThread: vi.fn().mockResolvedValue({
                threadId: '019ccca2-1a77-7481-9873-de72f3464372',
                model: 'gpt-5.4',
                thread: {
                    id: '019ccca2-1a77-7481-9873-de72f3464372',
                    path: '/tmp/rollout.jsonl',
                    turns: [],
                },
            }),
        };
        const metadataHandlers: Array<(metadata: any) => any> = [];
        const session = {
            updateMetadata: vi.fn((handler) => { metadataHandlers.push(handler); }),
            sendSessionEvent: vi.fn(),
        };
        const messageBuffer = {
            addMessage: vi.fn(),
        };

        const result = await resumeExistingThread({
            client,
            session,
            messageBuffer,
            threadId: '019ccca2-1a77-7481-9873-de72f3464372',
            cwd: '/tmp/project',
            mcpServers: { agentrejoin: { command: 'agentrejoin-mcp' } },
        });

        expect(result).toEqual({
            threadId: '019ccca2-1a77-7481-9873-de72f3464372',
            model: 'gpt-5.4',
            thread: {
                id: '019ccca2-1a77-7481-9873-de72f3464372',
                path: '/tmp/rollout.jsonl',
                turns: [],
            },
        });
        expect(client.resumeThread).toHaveBeenCalledWith({
            threadId: '019ccca2-1a77-7481-9873-de72f3464372',
            cwd: '/tmp/project',
            mcpServers: { agentrejoin: { command: 'agentrejoin-mcp' } },
        });
        expect(metadataHandlers).toHaveLength(1);
        expect(metadataHandlers[0]({ existing: true, resumeStatus: 'loading' })).toEqual({
            existing: true,
            resumeStatus: 'loading',
            codexThreadId: '019ccca2-1a77-7481-9873-de72f3464372',
        });
        expect(messageBuffer.addMessage).toHaveBeenCalledWith(expect.stringContaining('Resumed thread'), 'status');
        expect(session.sendSessionEvent).toHaveBeenCalledWith({
            type: 'message',
            message: 'Resumed Codex thread 019ccca2-1a77-7481-9873-de72f3464372',
        });
    });

    it('wraps backend resume errors with the thread ID', async () => {
        const client = {
            resumeThread: vi.fn().mockRejectedValue(new Error('thread already has an active writer')),
        };
        const metadataHandlers: Array<(metadata: any) => any> = [];
        const session = {
            updateMetadata: vi.fn((handler) => { metadataHandlers.push(handler); }),
            sendSessionEvent: vi.fn(),
        };
        const messageBuffer = {
            addMessage: vi.fn(),
        };

        await expect(
            resumeExistingThread({
                client,
                session,
                messageBuffer,
                threadId: 'thread-404',
                cwd: '/tmp/project',
                mcpServers: {},
            }),
        ).rejects.toThrow('Failed to resume Codex thread thread-404: thread already has an active writer');
        expect(metadataHandlers).toHaveLength(1);
        expect(metadataHandlers[0]({ resumeStatus: 'loading' })).toEqual({
            resumeCodexThreadId: 'thread-404',
            resumeStatus: 'active-writer',
        });
    });
});
