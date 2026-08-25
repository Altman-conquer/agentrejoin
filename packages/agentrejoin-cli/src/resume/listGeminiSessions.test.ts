import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { listGeminiSessions } from './listGeminiSessions';

const roots: string[] = [];

afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('listGeminiSessions', () => {
    it('reads Gemini JSONL sessions without starting the CLI', async () => {
        const root = await mkdtemp(join(os.tmpdir(), 'agentrejoin-gemini-sessions-'));
        roots.push(root);
        const project = join(root, 'project');
        const chats = join(root, '.gemini', 'tmp', 'project', 'chats');
        await mkdir(project);
        await mkdir(chats, { recursive: true });
        await writeFile(join(root, '.gemini', 'projects.json'), JSON.stringify({ projects: { [project]: 'project' } }));
        await writeFile(join(chats, 'session-test.jsonl'), [
            JSON.stringify({ sessionId: 'gemini-1', lastUpdated: '2026-08-25T00:00:00.000Z' }),
            JSON.stringify({ id: 'u1', type: 'user', content: [{ text: 'Fix the login flow' }] }),
            JSON.stringify({ id: 'a1', type: 'gemini', content: 'Done' }),
        ].join('\n'));
        await writeFile(join(chats, 'session-internal.jsonl'), [
            JSON.stringify({ sessionId: 'gemini-internal', lastUpdated: '2026-08-25T01:00:00.000Z' }),
            JSON.stringify({ id: 'context', type: 'user', content: [{ text: '<session_context>internal</session_context>' }] }),
        ].join('\n'));

        await expect(listGeminiSessions(root)).resolves.toEqual([
            expect.objectContaining({ id: 'gemini-1', preview: 'Fix the login flow', cwd: project, cwdExists: true }),
        ]);
    });
});
