import { describe, expect, it } from 'vitest';
import {
    buildSessionChildEnvironment,
    sanitizeSessionEnvironment,
    SESSION_SCOPED_ENV_KEYS,
    sessionEnvironmentKeysToUnset,
    wrapTmuxCommandWithSessionEnvironmentSanitizer,
} from './sessionEnvironment';

function contaminatedEnvironment(): NodeJS.ProcessEnv {
    return {
        KEEP_ME: 'safe',
        ...Object.fromEntries(SESSION_SCOPED_ENV_KEYS.map((key) => [key, `stale-${key}`])),
    };
}

describe('sessionEnvironment', () => {
    it('removes all inherited session-scoped values without mutating the source', () => {
        const source = contaminatedEnvironment();

        const sanitized = sanitizeSessionEnvironment(source);

        expect(sanitized).toMatchObject({ KEEP_ME: 'safe' });
        for (const key of SESSION_SCOPED_ENV_KEYS) {
            expect(sanitized).not.toHaveProperty(key);
            expect(source[key]).toBe(`stale-${key}`);
        }
    });

    it('keeps explicit fork values after removing stale ambient values', () => {
        const childEnv = buildSessionChildEnvironment(contaminatedEnvironment(), {
            AGENTREJOIN_FORKED_FROM_SESSION_ID: 'new-parent-session',
            AGENTREJOIN_FORKED_FROM_MESSAGE_ID: 'new-parent-message',
            AGENTREJOIN_FORK_CODEX_THREAD_ID: 'new-codex-thread',
            AGENTREJOIN_SIDE_CHAT: '1',
        });

        expect(childEnv).toMatchObject({
            KEEP_ME: 'safe',
            AGENTREJOIN_FORKED_FROM_SESSION_ID: 'new-parent-session',
            AGENTREJOIN_FORKED_FROM_MESSAGE_ID: 'new-parent-message',
            AGENTREJOIN_FORK_CODEX_THREAD_ID: 'new-codex-thread',
            AGENTREJOIN_SIDE_CHAT: '1',
        });
        expect(childEnv).not.toHaveProperty('CODEX_THREAD_ID');
        expect(childEnv).not.toHaveProperty('AGENTREJOIN_RECONNECT_SESSION_ID');
    });

    it('replaces stale reconnect state with the values for the resumed session', () => {
        const childEnv = buildSessionChildEnvironment(contaminatedEnvironment(), {
            AGENTREJOIN_RECONNECT_SESSION_ID: 'new-session',
            AGENTREJOIN_RECONNECT_ENCRYPTION_KEY: 'new-key',
            AGENTREJOIN_RECONNECT_ENCRYPTION_VARIANT: 'dataKey',
            AGENTREJOIN_RECONNECT_SEQ: '12',
            AGENTREJOIN_RECONNECT_METADATA_VERSION: '13',
            AGENTREJOIN_RECONNECT_AGENT_STATE_VERSION: '14',
        });

        expect(childEnv).toMatchObject({
            AGENTREJOIN_RECONNECT_SESSION_ID: 'new-session',
            AGENTREJOIN_RECONNECT_ENCRYPTION_KEY: 'new-key',
            AGENTREJOIN_RECONNECT_ENCRYPTION_VARIANT: 'dataKey',
            AGENTREJOIN_RECONNECT_SEQ: '12',
            AGENTREJOIN_RECONNECT_METADATA_VERSION: '13',
            AGENTREJOIN_RECONNECT_AGENT_STATE_VERSION: '14',
        });
        expect(childEnv).not.toHaveProperty('AGENTREJOIN_FORK_CODEX_THREAD_ID');
        expect(childEnv).not.toHaveProperty('CODEX_THREAD_ID');
    });

    it('unsets inherited tmux values without removing an explicit fork value', () => {
        const explicitEnv = { AGENTREJOIN_FORK_CODEX_THREAD_ID: 'new-codex-thread' };
        const keysToUnset = sessionEnvironmentKeysToUnset(explicitEnv);
        const command = wrapTmuxCommandWithSessionEnvironmentSanitizer('node agentrejoin.mjs codex', explicitEnv);

        expect(keysToUnset).not.toContain('AGENTREJOIN_FORK_CODEX_THREAD_ID');
        expect(keysToUnset).toContain('CODEX_THREAD_ID');
        expect(command).toMatch(/^unset /);
        expect(command).toContain('CODEX_THREAD_ID');
        expect(command).not.toContain('unset AGENTREJOIN_FORK_CODEX_THREAD_ID');
        expect(command).toMatch(/node agentrejoin\.mjs codex$/);
    });
});
