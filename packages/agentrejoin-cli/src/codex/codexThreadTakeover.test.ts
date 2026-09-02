import { mkdir, mkdtemp, stat, symlink, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it, vi } from 'vitest';

import { findCodexThreadWriter, takeoverCodexThread } from './codexThreadTakeover';

const THREAD_ID = '01a05b71-cfe3-7762-b503-a381cf5a8059';

async function fakeProc() {
    const root = await mkdtemp(join(tmpdir(), 'agentrejoin-takeover-'));
    const lockPath = join(root, 'codex-home', 'thread-writer-locks', `${THREAD_ID}.lock`);
    const processDir = join(root, '321');
    const fdPath = join(processDir, 'fd', '7');
    await mkdir(dirname(lockPath), { recursive: true });
    await mkdir(join(processDir, 'fd'), { recursive: true });
    await writeFile(lockPath, '');
    await symlink('/opt/codex', join(processDir, 'exe'));
    await symlink(lockPath, fdPath);
    await writeFile(join(processDir, 'stat'), '321 (codex worker) S ' + Array(18).fill('0').join(' ') + ' 98765 0');
    const inode = (await stat(fdPath)).ino;
    await writeFile(join(root, 'locks'), `1: FLOCK ADVISORY WRITE 321 00:01:${inode} 0 EOF\n`);
    return { root, locksPath: join(root, 'locks') };
}

describe('Codex thread takeover', () => {
    it('finds the Codex process holding the exact thread writer lock', async () => {
        const fixture = await fakeProc();

        await expect(findCodexThreadWriter(THREAD_ID, fixture.root)).resolves.toEqual({
            pid: 321,
            startTime: '98765',
        });
    });

    it('stops the writer and escalates only while the same process still owns the lock', async () => {
        const fixture = await fakeProc();
        const signalProcess = vi.fn((pid: number, signal: NodeJS.Signals) => {
            expect(pid).toBe(321);
            if (signal === 'SIGKILL') writeFileSync(fixture.locksPath, '');
        });

        await expect(takeoverCodexThread(THREAD_ID, {
            procRoot: fixture.root,
            gracefulWaitMs: 0,
            forceWaitMs: 0,
            signalProcess,
        })).resolves.toEqual({ terminated: true });
        expect(signalProcess.mock.calls).toEqual([[321, 'SIGTERM'], [321, 'SIGKILL']]);
    });

    it('does nothing when the thread no longer has an active writer', async () => {
        const fixture = await fakeProc();
        await writeFile(fixture.locksPath, '');
        const signalProcess = vi.fn();

        await expect(takeoverCodexThread(THREAD_ID, {
            procRoot: fixture.root,
            signalProcess,
        })).resolves.toEqual({ terminated: false });
        expect(signalProcess).not.toHaveBeenCalled();
    });

    it('does not escalate after the writer identity changes', async () => {
        const fixture = await fakeProc();
        const signalProcess = vi.fn();

        await expect(takeoverCodexThread(THREAD_ID, {
            procRoot: fixture.root,
            gracefulWaitMs: 100,
            signalProcess,
            sleep: async () => {
                await writeFile(join(fixture.root, '321', 'stat'), '321 (codex worker) S ' + Array(18).fill('0').join(' ') + ' 12345 0');
            },
        })).rejects.toThrow('Another Codex process acquired this conversation');
        expect(signalProcess.mock.calls).toEqual([[321, 'SIGTERM']]);
    });
});
