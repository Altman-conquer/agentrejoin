import { mkdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { claudeSessionEntryPreview, listClaudeSessions } from './listClaudeSessions';

describe('listClaudeSessions', () => {
    const roots: string[] = [];

    afterEach(async () => {
        await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
    });

    it('uses the first visible user message as the conversation title', () => {
        expect(claudeSessionEntryPreview({
            type: 'user',
            message: { content: [{ type: 'text', text: '  Resume\nthis conversation  ' }] },
        })).toBe('Resume this conversation');
        expect(claudeSessionEntryPreview({
            type: 'user', isMeta: true, message: { content: 'hidden setup' },
        })).toBeNull();
    });

    it('finds user conversations across projects and sorts them by recency', async () => {
        const root = join(tmpdir(), `happy-claude-sessions-${Date.now()}-${Math.random()}`);
        roots.push(root);
        const cwd = join(root, 'workspace');
        const project = join(root, 'projects', '-workspace');
        await mkdir(cwd, { recursive: true });
        await mkdir(project, { recursive: true });

        const oldPath = join(project, '11111111-1111-1111-1111-111111111111.jsonl');
        const newPath = join(project, '22222222-2222-2222-2222-222222222222.jsonl');
        await writeFile(oldPath, `${JSON.stringify({
            type: 'user', cwd, uuid: 'u1', message: { content: 'older prompt' },
        })}\n`);
        await writeFile(newPath, [
            JSON.stringify({ type: 'user', cwd, isMeta: true, message: { content: 'hidden setup' } }),
            JSON.stringify({
                type: 'user', cwd, uuid: 'u2', message: { content: [{ type: 'text', text: 'newer prompt' }] },
            }),
        ].join('\n'));
        await writeFile(join(project, 'agent-internal.jsonl'), '{}\n');
        await utimes(oldPath, new Date(1_000), new Date(1_000));
        await utimes(newPath, new Date(2_000), new Date(2_000));

        await expect(listClaudeSessions(root)).resolves.toEqual([
            expect.objectContaining({ id: '22222222-2222-2222-2222-222222222222', preview: 'newer prompt', cwd, cwdExists: true }),
            expect.objectContaining({ id: '11111111-1111-1111-1111-111111111111', preview: 'older prompt', cwd, cwdExists: true }),
        ]);
    });
});
