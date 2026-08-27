import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authAndSetupMachineIfNeeded: vi.fn(),
  ensureDaemonRunning: vi.fn(),
  readCredentials: vi.fn(),
  readSettings: vi.fn(),
}));

vi.mock('@/ui/auth', () => ({ authAndSetupMachineIfNeeded: mocks.authAndSetupMachineIfNeeded }));
vi.mock('@/daemon/ensureDaemonRunning', () => ({ ensureDaemonRunning: mocks.ensureDaemonRunning }));
vi.mock('@/persistence', () => ({
  readCredentials: mocks.readCredentials,
  readSettings: mocks.readSettings,
  clearCredentials: vi.fn(),
  clearMachineId: vi.fn(),
}));
vi.mock('@/daemon/controlClient', () => ({
  stopDaemon: vi.fn(),
  checkIfDaemonRunningAndCleanupStaleState: vi.fn(),
}));
vi.mock('@/ui/logger', () => ({ logger: { debug: vi.fn() } }));

import { handleAuthCommand } from './auth';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  mocks.readCredentials.mockResolvedValue(null);
  mocks.readSettings.mockResolvedValue(null);
  mocks.authAndSetupMachineIfNeeded.mockResolvedValue({ credentials: {}, machineId: 'machine-1' });
});

afterEach(() => vi.restoreAllMocks());

it('starts the daemon after web authentication so the machine is registered', async () => {
  await handleAuthCommand(['login']);

  expect(mocks.ensureDaemonRunning).toHaveBeenCalledOnce();
});
