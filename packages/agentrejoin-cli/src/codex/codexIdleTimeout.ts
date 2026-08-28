export const DEFAULT_CODEX_IDLE_TIMEOUT_MS = 10 * 60 * 1000;

export function resolveCodexIdleTimeoutMs(value = process.env.AGENTREJOIN_CODEX_IDLE_TIMEOUT_MS): number {
    if (value === undefined || value.trim() === '') return DEFAULT_CODEX_IDLE_TIMEOUT_MS;

    const timeout = Number(value);
    return Number.isInteger(timeout) && timeout >= 0 && timeout <= 2_147_483_647
        ? timeout
        : DEFAULT_CODEX_IDLE_TIMEOUT_MS;
}
