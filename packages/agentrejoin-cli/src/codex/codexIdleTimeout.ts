export const DEFAULT_CODEX_IDLE_TIMEOUT_MS = 0;

export function resolveCodexIdleTimeoutMs(value = process.env.AGENTREJOIN_CODEX_IDLE_TIMEOUT_MS): number {
    if (value === undefined || value.trim() === '') return DEFAULT_CODEX_IDLE_TIMEOUT_MS;

    const timeout = Number(value);
    return Number.isInteger(timeout) && timeout >= 0 && timeout <= 2_147_483_647
        ? timeout
        : DEFAULT_CODEX_IDLE_TIMEOUT_MS;
}

export function remainingCodexIdleTimeoutMs(timeoutMs: number, lastActivityAt: number, now = Date.now()): number {
    return Math.max(0, timeoutMs - Math.max(0, now - lastActivityAt));
}
