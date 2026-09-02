import { beforeEach, describe, expect, it, vi } from 'vitest';

const { codexClientMethods, takeoverCodexThread } = vi.hoisted(() => ({
    codexClientMethods: {
        connect: vi.fn(),
        disconnect: vi.fn(),
        forkThread: vi.fn(),
        listThreads: vi.fn(),
        readThread: vi.fn(),
        rollbackThread: vi.fn(),
        injectItems: vi.fn(),
    },
    takeoverCodexThread: vi.fn(),
}));

vi.mock('@/codex/codexAppServerClient', () => ({
    CodexAppServerClient: vi.fn().mockImplementation(() => codexClientMethods),
}));

vi.mock('@/codex/codexThreadTakeover', () => ({ takeoverCodexThread }));

function machineClient() {
    return {
        id: 'machine-1',
        encryptionKey: new Uint8Array(32),
        encryptionVariant: 'legacy',
    } as any;
}

function handlersFrom(client: any): Map<string, (params: any) => Promise<any>> {
    return client.rpcHandlerManager.handlers;
}

describe('ApiMachineClient Codex fork RPCs', () => {
    beforeEach(() => {
        for (const method of Object.values(codexClientMethods)) {
            method.mockReset();
        }
        codexClientMethods.connect.mockResolvedValue(undefined);
        codexClientMethods.disconnect.mockResolvedValue(undefined);
        takeoverCodexThread.mockReset();
    });

    it('registers a full Codex thread fork RPC', async () => {
        codexClientMethods.forkThread.mockResolvedValue({
            threadId: 'thread-forked',
            thread: { id: 'thread-forked', turns: [] },
        });

        const { ApiMachineClient } = await import('./apiMachine');
        const client = new ApiMachineClient('token', machineClient());
        client.setRPCHandlers({
            spawnSession: vi.fn(),
            stopSession: vi.fn(),
            requestShutdown: vi.fn(),
        });

        const result = await handlersFrom(client).get('machine-1:codex-fork-thread')?.({
            directory: '/tmp/project',
            codexThreadId: 'thread-source',
        });

        expect(result).toEqual({ type: 'success', newCodexThreadId: 'thread-forked' });
        expect(codexClientMethods.connect).toHaveBeenCalledOnce();
        expect(codexClientMethods.forkThread).toHaveBeenCalledWith({
            threadId: 'thread-source',
            cwd: '/tmp/project',
        });
        expect(codexClientMethods.disconnect).toHaveBeenCalledOnce();
    });

    it('forwards resumeCodexThreadId through the spawn RPC', async () => {
        const spawnSession = vi.fn().mockResolvedValue({ type: 'success', sessionId: 'agentrejoin-forked' });

        const { ApiMachineClient } = await import('./apiMachine');
        const client = new ApiMachineClient('token', machineClient());
        client.setRPCHandlers({
            spawnSession,
            stopSession: vi.fn(),
            requestShutdown: vi.fn(),
        });

        const result = await handlersFrom(client).get('machine-1:spawn-agentrejoin-session')?.({
            directory: '/tmp/project',
            agent: 'codex',
            resumeCodexThreadId: 'thread-forked',
            parentSessionId: 'agentrejoin-source',
        });

        expect(result).toEqual({ type: 'success', sessionId: 'agentrejoin-forked' });
        expect(spawnSession).toHaveBeenCalledWith(expect.objectContaining({
            directory: '/tmp/project',
            agent: 'codex',
            resumeCodexThreadId: 'thread-forked',
            parentSessionId: 'agentrejoin-source',
        }));
    });

    it('lists Codex rewind points from thread/read', async () => {
        codexClientMethods.readThread.mockResolvedValue({
            thread: {
                id: 'thread-source',
                turns: [{
                    id: 'turn-1',
                    startedAt: 10,
                    items: [
                        { id: 'user-1', type: 'userMessage', content: [{ type: 'text', text: 'hello' }] },
                    ],
                }],
            },
        });

        const { ApiMachineClient } = await import('./apiMachine');
        const client = new ApiMachineClient('token', machineClient());
        client.setRPCHandlers({
            spawnSession: vi.fn(),
            stopSession: vi.fn(),
            requestShutdown: vi.fn(),
        });

        const result = await handlersFrom(client).get('machine-1:codex-list-rewind-points')?.({
            directory: '/tmp/project',
            codexThreadId: 'thread-source',
        });

        expect(result).toEqual({
            type: 'success',
            points: [{ itemId: 'user-1', text: 'hello', timestamp: 10_000 }],
        });
        expect(codexClientMethods.readThread).toHaveBeenCalledWith({
            threadId: 'thread-source',
            includeTurns: true,
        });
    });

    it('lists the latest top-level Codex threads without filtering by working directory', async () => {
        codexClientMethods.listThreads.mockImplementation(async ({ archived, cursor }: { archived: boolean; cursor: string | null }) => ({
            data: archived ? [{
                id: 'thread-archived',
                cwd: '/tmp',
                name: 'Archived thread',
                preview: 'old work',
                updatedAt: 10,
                parentThreadId: null,
                ephemeral: false,
            }] : cursor === 'next' ? [{
                id: 'thread-older',
                cwd: '/tmp',
                name: null,
                preview: 'older work',
                updatedAt: 5,
                parentThreadId: null,
                ephemeral: false,
            }] : [{
                id: 'thread-active',
                cwd: '/path/that/no/longer/exists',
                name: null,
                preview: 'current work',
                updatedAt: 20,
                parentThreadId: null,
                ephemeral: false,
            }, {
                id: 'thread-subagent',
                cwd: '/tmp',
                preview: 'internal work',
                updatedAt: 30,
                parentThreadId: 'thread-active',
                ephemeral: false,
            }],
            nextCursor: !archived && cursor === null ? 'next' : null,
        }));

        const { ApiMachineClient } = await import('./apiMachine');
        const client = new ApiMachineClient('token', machineClient());
        client.setRPCHandlers({
            spawnSession: vi.fn(),
            stopSession: vi.fn(),
            requestShutdown: vi.fn(),
        });

        const handler = handlersFrom(client).get('machine-1:codex-list-threads')!;
        const result = await handler({});

        expect(result).toEqual({
            threads: [{
                id: 'thread-active',
                name: null,
                preview: 'current work',
                cwd: '/path/that/no/longer/exists',
                cwdExists: false,
                updatedAt: 20_000,
                archived: false,
            }, {
                id: 'thread-archived',
                name: 'Archived thread',
                preview: 'old work',
                cwd: '/tmp',
                cwdExists: true,
                updatedAt: 10_000,
                archived: true,
            }],
            hasMore: true,
        });
        expect(codexClientMethods.listThreads).toHaveBeenCalledWith(expect.objectContaining({ archived: false }));
        expect(codexClientMethods.listThreads).toHaveBeenCalledWith(expect.objectContaining({ archived: true }));
        expect(codexClientMethods.listThreads).toHaveBeenCalledWith(expect.objectContaining({
            cursor: null,
            limit: 20,
            sourceKinds: [],
        }));

        const fullResult = await handler({ all: true });
        expect(fullResult).toEqual({
            threads: [
                expect.objectContaining({ id: 'thread-active' }),
                expect.objectContaining({ id: 'thread-archived' }),
                expect.objectContaining({ id: 'thread-older' }),
            ],
            hasMore: false,
        });
        expect(codexClientMethods.listThreads).toHaveBeenCalledWith(expect.objectContaining({
            cursor: 'next',
            limit: 100,
        }));

        const callsAfterFullLoad = codexClientMethods.listThreads.mock.calls.length;
        await handler({ all: true });
        expect(codexClientMethods.listThreads).toHaveBeenCalledTimes(callsAfterFullLoad);
    });

    it('duplicates a Codex thread by rolling back turns after the selected item', async () => {
        codexClientMethods.forkThread.mockResolvedValue({
            threadId: 'thread-forked',
            thread: {
                id: 'thread-forked',
                turns: [
                    { id: 'turn-1', items: [{ id: 'user-1', type: 'userMessage', content: [{ type: 'text', text: 'one' }] }] },
                    { id: 'turn-2', items: [{ id: 'user-2', type: 'userMessage', content: [{ type: 'text', text: 'two' }] }] },
                ],
            },
        });
        codexClientMethods.rollbackThread.mockResolvedValue({ thread: { id: 'thread-forked', turns: [] } });
        codexClientMethods.injectItems.mockResolvedValue({});

        const { ApiMachineClient } = await import('./apiMachine');
        const client = new ApiMachineClient('token', machineClient());
        client.setRPCHandlers({
            spawnSession: vi.fn(),
            stopSession: vi.fn(),
            requestShutdown: vi.fn(),
        });

        const result = await handlersFrom(client).get('machine-1:codex-duplicate-thread')?.({
            directory: '/tmp/project',
            codexThreadId: 'thread-source',
            cutAfterItemId: 'user-1',
        });

        expect(result).toEqual({ type: 'success', newCodexThreadId: 'thread-forked' });
        expect(codexClientMethods.rollbackThread).toHaveBeenCalledWith({
            threadId: 'thread-forked',
            numTurns: 2,
        });
        expect(codexClientMethods.injectItems).toHaveBeenCalledWith({
            threadId: 'thread-forked',
            items: [{
                type: 'message',
                role: 'user',
                content: [{ type: 'input_text', text: 'one' }],
            }],
        });
    });

    it('terminates the active Codex writer before takeover', async () => {
        takeoverCodexThread.mockResolvedValue({ terminated: true });

        const { ApiMachineClient } = await import('./apiMachine');
        const client = new ApiMachineClient('token', machineClient());
        client.setRPCHandlers({
            spawnSession: vi.fn(),
            stopSession: vi.fn(),
            requestShutdown: vi.fn(),
        });

        const handler = handlersFrom(client).get('machine-1:codex-takeover-thread')!;
        await expect(handler({
            codexThreadId: '01a05b71-cfe3-7762-b503-a381cf5a8059',
        })).rejects.toThrow('Codex takeover requires explicit confirmation');
        await expect(handler({
            codexThreadId: '01a05b71-cfe3-7762-b503-a381cf5a8059',
            confirmed: true,
        })).resolves.toEqual({ terminated: true });
        expect(takeoverCodexThread).toHaveBeenCalledWith('01a05b71-cfe3-7762-b503-a381cf5a8059');
    });
});
