import type { Metadata } from '@/api/types';
import type { PersistedSession } from '@/persistence';

export type SessionRecoveryAction = 'adopt' | 'resume' | 'wait' | 'ignore';

export function resolvePersistedDesiredState(session: PersistedSession): 'running' | 'stopped' {
  if (session.desiredState) return session.desiredState;
  return (session.metadata.startedFromDaemon === true || session.metadata.startedBy === 'daemon')
    && session.metadata.lifecycleState === 'running'
    ? 'running'
    : 'stopped';
}

export function resolveSessionRecoveryAction(options: {
  desiredState: 'running' | 'stopped';
  metadata: Metadata;
  serverActive: boolean;
  serverActiveAt: number;
  liveAgentPids: ReadonlySet<number>;
  now?: number;
}): SessionRecoveryAction {
  const { desiredState, metadata, serverActive, serverActiveAt, liveAgentPids } = options;
  const daemonManaged = metadata.startedFromDaemon === true || metadata.startedBy === 'daemon';
  const resumable = Boolean(metadata.claudeSessionId || metadata.codexThreadId);
  if (desiredState !== 'running' || metadata.lifecycleState !== 'running' || !daemonManaged || !resumable) {
    return 'ignore';
  }

  if (metadata.hostPid && liveAgentPids.has(metadata.hostPid)) {
    return 'adopt';
  }

  const now = options.now ?? Date.now();
  if (!metadata.hostPid && serverActive && now - serverActiveAt < 15_000) {
    return 'wait';
  }

  return 'resume';
}
