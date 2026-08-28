import { describe, expect, it } from 'vitest';
import { DEFAULT_CODEX_IDLE_TIMEOUT_MS, resolveCodexIdleTimeoutMs } from './codexIdleTimeout';

describe('resolveCodexIdleTimeoutMs', () => {
    it('uses ten minutes by default, accepts overrides, and rejects invalid values', () => {
        expect(resolveCodexIdleTimeoutMs(undefined)).toBe(DEFAULT_CODEX_IDLE_TIMEOUT_MS);
        expect(resolveCodexIdleTimeoutMs('5000')).toBe(5000);
        expect(resolveCodexIdleTimeoutMs('0')).toBe(0);
        expect(resolveCodexIdleTimeoutMs('-1')).toBe(DEFAULT_CODEX_IDLE_TIMEOUT_MS);
        expect(resolveCodexIdleTimeoutMs('invalid')).toBe(DEFAULT_CODEX_IDLE_TIMEOUT_MS);
    });
});
