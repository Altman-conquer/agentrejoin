import { beforeEach, describe, expect, it, vi } from 'vitest';

const { emitWithAck, request, encryptRaw, getState } = vi.hoisted(() => ({
    emitWithAck: vi.fn(),
    request: vi.fn(),
    encryptRaw: vi.fn(),
    getState: vi.fn(),
}));

vi.mock('./apiSocket', () => ({ apiSocket: { emitWithAck, request } }));
vi.mock('./sync', () => ({
    sync: { encryption: { getSessionEncryption: () => ({ encryptRaw, decryptRaw: vi.fn() }) } },
}));
vi.mock('./storage', () => ({ storage: { getState } }));

describe('sessionArchive', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getState.mockReturnValue({
            sessions: { offline: { metadata: { lifecycleState: 'paused', path: '/repo' }, metadataVersion: 4 } },
        });
        encryptRaw.mockResolvedValue('encrypted-archive');
        emitWithAck.mockResolvedValue({ result: 'success' });
        request.mockResolvedValue({ ok: true });
    });

    it('marks an offline session as explicitly archived before deactivating it', async () => {
        const { sessionArchive } = await import('./ops');
        await sessionArchive('offline');

        expect(encryptRaw).toHaveBeenCalledWith(expect.objectContaining({
            lifecycleState: 'archived',
            archivedBy: 'app',
            archiveReason: 'User archived',
            path: '/repo',
        }));
        expect(emitWithAck).toHaveBeenCalledWith('update-metadata', {
            sid: 'offline',
            metadata: 'encrypted-archive',
            expectedVersion: 4,
        });
        expect(request).toHaveBeenCalledWith('/v1/sessions/offline/archive', { method: 'POST' });
        expect(emitWithAck.mock.invocationCallOrder[0]).toBeLessThan(request.mock.invocationCallOrder[0]);
    });
});
