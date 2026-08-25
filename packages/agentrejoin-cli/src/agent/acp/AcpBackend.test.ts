import { describe, expect, it } from 'vitest';

import { AcpBackend } from './AcpBackend';

describe('AcpBackend history replay', () => {
  it('emits loaded user and agent chunks as history messages', () => {
    const backend = new AcpBackend({
      agentName: 'gemini',
      cwd: '/tmp',
      command: 'gemini',
      resumeSessionId: 'session-1',
    });
    const messages: unknown[] = [];
    backend.onMessage((message) => messages.push(message));

    const internal = backend as unknown as {
      loadingExistingSession: boolean;
      handleSessionUpdate(params: unknown): void;
    };
    internal.loadingExistingSession = true;
    internal.handleSessionUpdate({
      sessionId: 'session-1',
      update: { sessionUpdate: 'user_message_chunk', content: { type: 'text', text: 'Hello' } },
    });
    internal.handleSessionUpdate({
      sessionId: 'session-1',
      update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'Hi' } },
    });

    expect(messages).toEqual([
      { type: 'event', name: 'history-message', payload: { role: 'user', text: 'Hello' } },
      { type: 'event', name: 'history-message', payload: { role: 'agent', text: 'Hi' } },
    ]);
  });
});
