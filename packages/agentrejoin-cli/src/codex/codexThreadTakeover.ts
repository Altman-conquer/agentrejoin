import { readdir, readFile, readlink, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { delay } from '@/utils/time';

const CODEX_THREAD_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WRITER_LOCK_DIR = 'thread-writer-locks';
const POLL_INTERVAL_MS = 100;

type WriterOwner = {
    pid: number;
    startTime: string;
};

type TakeoverOptions = {
    platform?: NodeJS.Platform;
    procRoot?: string;
    gracefulWaitMs?: number;
    forceWaitMs?: number;
    signalProcess?: (pid: number, signal: NodeJS.Signals) => void;
    sleep?: (ms: number) => Promise<unknown>;
};

function parseWriterLocks(contents: string): Array<{ pid: number; inode: string }> {
    return contents.split('\n').flatMap((line) => {
        const fields = line.trim().split(/\s+/);
        if (fields[1] !== 'FLOCK' || fields[3] !== 'WRITE') return [];

        const pid = Number(fields[4]);
        const inode = fields[5]?.split(':').at(-1);
        return Number.isSafeInteger(pid) && pid > 0 && inode ? [{ pid, inode }] : [];
    });
}

async function processStartTime(procRoot: string, pid: number): Promise<string | null> {
    try {
        const contents = await readFile(join(procRoot, String(pid), 'stat'), 'utf8');
        const closingParen = contents.lastIndexOf(')');
        return closingParen >= 0 ? contents.slice(closingParen + 2).trim().split(/\s+/)[19] ?? null : null;
    } catch {
        return null;
    }
}

export async function findCodexThreadWriter(
    threadId: string,
    procRoot: string = '/proc',
): Promise<WriterOwner | null> {
    if (!CODEX_THREAD_ID_RE.test(threadId)) {
        throw new Error('codexThreadId must be a valid UUID');
    }

    let locks: Array<{ pid: number; inode: string }>;
    try {
        locks = parseWriterLocks(await readFile(join(procRoot, 'locks'), 'utf8'));
    } catch {
        throw new Error('This environment does not expose Linux process locks, so AgentRejoin cannot safely take over this conversation');
    }

    const expectedSuffix = `/${WRITER_LOCK_DIR}/${threadId}.lock`;
    for (const lock of locks) {
        const processDir = join(procRoot, String(lock.pid));
        try {
            if (basename(await readlink(join(processDir, 'exe'))) !== 'codex') continue;

            for (const fd of await readdir(join(processDir, 'fd'))) {
                const fdPath = join(processDir, 'fd', fd);
                const target = (await readlink(fdPath)).replace(/ \(deleted\)$/, '');
                if (!target.endsWith(expectedSuffix)) continue;
                if (String((await stat(fdPath)).ino) !== lock.inode) continue;

                const startTime = await processStartTime(procRoot, lock.pid);
                if (startTime) return { pid: lock.pid, startTime };
            }
        } catch {
            // Processes and file descriptors can disappear while /proc is scanned.
        }
    }

    return null;
}

async function waitForRelease(
    threadId: string,
    owner: WriterOwner,
    timeoutMs: number,
    procRoot: string,
    sleep: (ms: number) => Promise<unknown>,
): Promise<boolean> {
    let remainingMs = timeoutMs;
    while (true) {
        const current = await findCodexThreadWriter(threadId, procRoot);
        if (!current) return true;
        if (current.pid !== owner.pid || current.startTime !== owner.startTime) {
            throw new Error('Another Codex process acquired this conversation while AgentRejoin was taking it over');
        }
        if (remainingMs <= 0) return false;

        const waitMs = Math.min(POLL_INTERVAL_MS, remainingMs);
        await sleep(waitMs);
        remainingMs -= waitMs;
    }
}

export async function takeoverCodexThread(
    threadId: string,
    options: TakeoverOptions = {},
): Promise<{ terminated: boolean }> {
    if ((options.platform ?? process.platform) !== 'linux') {
        throw new Error('Stopping an existing Codex writer is currently supported only on Linux');
    }

    const procRoot = options.procRoot ?? '/proc';
    const owner = await findCodexThreadWriter(threadId, procRoot);
    if (!owner) return { terminated: false };

    const signalProcess = options.signalProcess ?? process.kill;
    const sleep = options.sleep ?? delay;
    const sendSignal = (signal: NodeJS.Signals) => {
        try {
            signalProcess(owner.pid, signal);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
        }
    };

    sendSignal('SIGTERM');
    if (await waitForRelease(threadId, owner, options.gracefulWaitMs ?? 3_000, procRoot, sleep)) {
        return { terminated: true };
    }

    // The confirmation explicitly authorizes a forced stop. Revalidate the
    // writer identity before escalating so a recycled PID is never targeted.
    sendSignal('SIGKILL');
    if (await waitForRelease(threadId, owner, options.forceWaitMs ?? 3_000, procRoot, sleep)) {
        return { terminated: true };
    }

    throw new Error('The existing Codex process did not release this conversation');
}
