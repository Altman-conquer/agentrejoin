import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';

const spawnHappyCLI = vi.hoisted(() => vi.fn());

vi.mock('@/utils/spawnHappyCLI', () => ({ spawnHappyCLI }));

import { runDaemonSupervisor } from './supervisor';

describe('runDaemonSupervisor', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('restarts failed daemon workers and stops after a clean exit', async () => {
    vi.useFakeTimers();
    const first = new EventEmitter();
    const second = new EventEmitter();
    spawnHappyCLI.mockReturnValueOnce(first).mockReturnValueOnce(second);

    const running = runDaemonSupervisor();
    first.emit('exit', 1);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(spawnHappyCLI).toHaveBeenCalledTimes(2);
    second.emit('exit', 0);
    await running;
  });
});
