import { spawnHappyCLI } from '@/utils/spawnHappyCLI';

import { sanitizeSessionEnvironment } from './sessionEnvironment';

const RESTART_DELAY_MS = 5_000;

export async function runDaemonSupervisor(): Promise<void> {
  let stopping = false;
  let child: ReturnType<typeof spawnHappyCLI> | null = null;

  const stop = () => {
    stopping = true;
    child?.kill('SIGTERM');
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  try {
    while (!stopping) {
      child = spawnHappyCLI(['daemon', 'start-sync'], {
        stdio: 'inherit',
        env: {
          ...sanitizeSessionEnvironment(process.env),
          AGENTREJOIN_DAEMON_SUPERVISED: '1',
        },
      });

      const code = await new Promise<number>((resolve) => {
        let settled = false;
        const finish = (exitCode: number) => {
          if (settled) return;
          settled = true;
          resolve(exitCode);
        };
        child!.once('exit', (exitCode) => finish(exitCode ?? 1));
        child!.once('error', () => finish(1));
      });
      child = null;

      if (stopping || code === 0) return;
      await new Promise(resolve => setTimeout(resolve, RESTART_DELAY_MS));
    }
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  }
}
