import { describe, expect, it } from 'vitest';

import type { Metadata } from '@/api/types';
import type { PersistedSession } from '@/persistence';

import { resolvePersistedDesiredState, resolveSessionRecoveryAction } from './sessionRecovery';

const metadata = (patch: Partial<Metadata> = {}): Metadata => ({
  path: '/repo',
  host: 'host',
  homeDir: '/home/user',
  agentRejoinHomeDir: '/home/user/.agentrejoin',
  agentRejoinLibDir: '/lib',
  agentRejoinToolsDir: '/tools',
  startedFromDaemon: true,
  startedBy: 'daemon',
  lifecycleState: 'running',
  flavor: 'codex',
  codexThreadId: 'thread-1',
  ...patch,
});

const persisted = (meta: Metadata, desiredState?: 'running' | 'stopped'): PersistedSession => ({
  encryptionKey: 'key',
  encryptionVariant: 'dataKey',
  seq: 0,
  metadataVersion: 0,
  agentStateVersion: 0,
  metadata: meta,
  savedAt: 0,
  desiredState,
});

describe('session recovery', () => {
  it('migrates old daemon-managed running records without reviving terminal sessions', () => {
    expect(resolvePersistedDesiredState(persisted(metadata()))).toBe('running');
    expect(resolvePersistedDesiredState(persisted(metadata({ startedFromDaemon: undefined, startedBy: 'daemon' })))).toBe('running');
    expect(resolvePersistedDesiredState(persisted(metadata({ startedFromDaemon: false, startedBy: 'terminal' })))).toBe('stopped');
    expect(resolvePersistedDesiredState(persisted(metadata(), 'stopped'))).toBe('stopped');
  });

  it('adopts a live wrapper and resumes a dead wrapper', () => {
    const base = {
      desiredState: 'running' as const,
      serverActive: true,
      serverActiveAt: 99_000,
      now: 100_000,
    };
    expect(resolveSessionRecoveryAction({ ...base, metadata: metadata({ hostPid: 42 }), liveAgentPids: new Set([42]) })).toBe('adopt');
    expect(resolveSessionRecoveryAction({ ...base, metadata: metadata({ hostPid: 42 }), liveAgentPids: new Set() })).toBe('resume');
  });

  it('waits for an untracked but recently active wrapper and ignores stopped sessions', () => {
    const base = {
      metadata: metadata({ hostPid: undefined }),
      serverActive: true,
      serverActiveAt: 99_000,
      liveAgentPids: new Set<number>(),
      now: 100_000,
    };
    expect(resolveSessionRecoveryAction({ ...base, desiredState: 'running' })).toBe('wait');
    expect(resolveSessionRecoveryAction({ ...base, desiredState: 'stopped' })).toBe('ignore');
    expect(resolveSessionRecoveryAction({ ...base, desiredState: 'running', metadata: metadata({ lifecycleState: 'archived' }) })).toBe('ignore');
  });
});
