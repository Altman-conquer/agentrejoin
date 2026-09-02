import { describe, expect, it, vi } from 'vitest';

import { createOfflineSessionStub } from './offlineSessionStub';

describe('createOfflineSessionStub', () => {
    it('accepts Codex file handlers while the server is offline', () => {
        const session = createOfflineSessionStub('offline-test');
        expect(() => session.onFileEvent(vi.fn())).not.toThrow();
    });
});
