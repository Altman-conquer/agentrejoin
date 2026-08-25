import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sessionRPC } = vi.hoisted(() => ({
    sessionRPC: vi.fn(),
}));

vi.mock('./apiSocket', () => ({ apiSocket: { sessionRPC } }));
vi.mock('./sync', () => ({ sync: {} }));
vi.mock('./storage', () => ({
    storage: { getState: vi.fn(() => ({ sessions: {} })) },
}));

import { sessionSyncCodexThread } from './ops';

describe('sessionSyncCodexThread', () => {
    beforeEach(() => {
        sessionRPC.mockReset();
    });

    it('calls the session-scoped Codex sync RPC', async () => {
        sessionRPC.mockResolvedValue({
            type: 'success',
            addedEnvelopeCount: 4,
            addedTurnCount: 1,
        });

        await expect(sessionSyncCodexThread('session-1')).resolves.toEqual({
            type: 'success',
            addedEnvelopeCount: 4,
            addedTurnCount: 1,
        });
        expect(sessionRPC).toHaveBeenCalledWith('session-1', 'sync-codex-thread', {});
    });

    it('normalizes encrypted RPC handler errors', async () => {
        sessionRPC.mockResolvedValue({ error: 'No active Codex thread' });

        await expect(sessionSyncCodexThread('session-1')).resolves.toEqual({
            type: 'error',
            errorMessage: 'No active Codex thread',
        });
    });

    it('preserves session RPC routing errors', async () => {
        sessionRPC.mockRejectedValue(new Error('RPC method not available'));

        await expect(sessionSyncCodexThread('session-1')).resolves.toEqual({
            type: 'error',
            errorMessage: 'RPC method not available',
        });
    });
});
