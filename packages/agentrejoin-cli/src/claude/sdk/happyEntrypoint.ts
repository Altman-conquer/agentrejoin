/**
 * Resolves the CLAUDE_CODE_ENTRYPOINT value AgentRejoin should use when launching
 * Claude Code via the agent SDK.
 *
 * Why this exists
 * ---------------
 * `@anthropic-ai/claude-agent-sdk` defaults to setting CLAUDE_CODE_ENTRYPOINT
 * to "sdk-ts" inside the spawned Claude process when nothing is preset. The
 * `claude --resume` picker filters out any session whose recorded entrypoint
 * is in the SDK set ({"sdk-cli", "sdk-ts", "sdk-py"}) when the current run is
 * NOT itself an SDK entrypoint. The result is that every AgentRejoin-driven session
 * disappears from a plain `claude --resume` picker — which is exactly the
 * symptom reported in slopus/agentrejoin#1202 ("No conversations found to resume").
 *
 * Mitigation
 * ----------
 * Pre-set the env to a Claude-recognised entrypoint that is NOT in the SDK
 * filter set. "remote_mobile" matches AgentRejoin's role as a remote-mobile control
 * surface for Claude Code, is part of Claude Code's own allowlist, and keeps
 * AgentRejoin-touched sessions visible in `claude --resume`.
 *
 * If the caller already exported CLAUDE_CODE_ENTRYPOINT to something specific,
 * we respect that — the user/operator wins.
 */

export const AGENTREJOIN_DEFAULT_ENTRYPOINT = 'remote_mobile' as const

export function resolveHappyEntrypoint(currentValue: string | undefined): string {
    if (currentValue && currentValue.length > 0) {
        return currentValue
    }
    return AGENTREJOIN_DEFAULT_ENTRYPOINT
}
