import { describe, expect, it } from 'vitest';
import { resolveRpcCallTimeoutMs } from './rpcHandler';

describe('resolveRpcCallTimeoutMs', () => {
    it('allows resumed sessions a full startup window without slowing other RPCs', () => {
        expect(resolveRpcCallTimeoutMs('machine:resume-agentrejoin-session')).toBe(75_000);
        expect(resolveRpcCallTimeoutMs('machine:spawn-session')).toBe(30_000);
    });
});
