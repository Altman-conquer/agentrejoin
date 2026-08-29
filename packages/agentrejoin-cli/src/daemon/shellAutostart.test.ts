import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { disableShellAutostart, enableShellAutostart } from './shellAutostart';

let tempDir: string | undefined;

afterEach(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

it('adds one managed shell block and removes it without touching user config', async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'agentrejoin-autostart-'));
  const bashrc = path.join(tempDir, '.bashrc');
  await writeFile(bashrc, 'export KEEP_ME=1\n', 'utf8');

  await enableShellAutostart(tempDir, '/bin/bash');
  await enableShellAutostart(tempDir, '/bin/bash');

  const enabled = await readFile(bashrc, 'utf8');
  expect(enabled.match(/AgentRejoin daemon autostart/g)).toHaveLength(2);
  expect(enabled).toContain('command agentrejoin daemon start');

  expect(await disableShellAutostart(tempDir)).toEqual([bashrc]);
  expect(await readFile(bashrc, 'utf8')).toBe('export KEEP_ME=1\n');
});
