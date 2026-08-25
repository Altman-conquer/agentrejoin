import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEnvelope } from '@slopus/happy-wire';

vi.mock('@/ui/logger', () => ({
    logger: { debug: vi.fn() },
}));

vi.mock('@/configuration', () => ({
    configuration: { happyHomeDir: '/home/test/.happy' },
}));

import {
    buildCodexThreadBackfillEnvelopes,
    codexThreadHistoryLocalId,
    prepareCodexThreadSync,
    replayCodexThreadHistory,
} from './threadImageBackfill';

const tempDirs: string[] = [];

async function makePngFile(name: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'happy-codex-backfill-'));
    tempDirs.push(dir);
    const filePath = join(dir, name);
    await writeFile(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]));
    return filePath;
}

afterEach(async () => {
    while (tempDirs.length > 0) {
        await rm(tempDirs.pop()!, { recursive: true, force: true });
    }
});

describe('buildCodexThreadBackfillEnvelopes', () => {
    it('reads a persisted thread and replays its envelopes into Happy', async () => {
        const readThread = vi.fn().mockResolvedValue({
            thread: {
                turns: [{
                    id: 'turn-1',
                    startedAt: 100,
                    completedAt: 101,
                    status: 'completed',
                    items: [
                        { id: 'user-1', type: 'userMessage', content: [{ type: 'text', text: 'previous request' }] },
                        { id: 'agent-1', type: 'agentMessage', text: 'previous response' },
                    ],
                }],
            },
        });
        const sendEnvelope = vi.fn();

        const result = await replayCodexThreadHistory({
            threadId: 'thread-1',
            readThread,
            sendEnvelope,
            uploadLocalImage: vi.fn(),
        });

        expect(readThread).toHaveBeenCalledWith({ threadId: 'thread-1', includeTurns: true });
        expect(result.envelopeCount).toBe(4);
        expect(sendEnvelope.mock.calls.map(([envelope]) => envelope.ev.t)).toEqual([
            'turn-start',
            'text',
            'text',
            'turn-end',
        ]);
        expect(sendEnvelope.mock.calls[1][0]).toMatchObject({
            role: 'user',
            codexItemId: 'user-1',
            ev: { t: 'text', text: 'previous request' },
        });
        expect(sendEnvelope.mock.calls[2][0]).toMatchObject({
            role: 'agent',
            codexItemId: 'agent-1',
            ev: { t: 'text', text: 'previous response' },
        });
    });

    it('inserts uploaded local image file envelopes before the matching user text', async () => {
        const imagePath = await makePngFile('input.png');
        const uploadLocalImage = vi.fn(async (_attachment, opts) => createEnvelope('user', {
            t: 'file',
            ref: 'uploaded-ref',
            name: 'codex-image-1.png',
            size: 9,
            mimeType: 'image/png',
        }, opts));

        const envelopes = await buildCodexThreadBackfillEnvelopes({
            thread: {
                turns: [{
                    id: 'turn-1',
                    startedAt: 100,
                    completedAt: 101,
                    status: 'completed',
                    items: [
                        {
                            id: 'user-1',
                            type: 'userMessage',
                            content: [
                                { type: 'text', text: 'inspect this' },
                                { type: 'localImage', path: imagePath },
                            ],
                        },
                        { id: 'agent-1', type: 'agentMessage', text: 'ok' },
                    ],
                }],
            },
            uploadLocalImage,
        });

        expect(envelopes.map((envelope) => envelope.ev.t)).toEqual([
            'turn-start',
            'file',
            'text',
            'text',
            'turn-end',
        ]);
        expect(envelopes[1]).toMatchObject({
            role: 'user',
            id: 'user-1:image:1',
            time: 100_000,
            codexItemId: 'user-1',
            ev: { t: 'file', ref: 'uploaded-ref' },
        });
        expect(envelopes[2]).toMatchObject({
            role: 'user',
            codexItemId: 'user-1',
            ev: { t: 'text', text: 'inspect this' },
        });
        expect(uploadLocalImage).toHaveBeenCalledWith(expect.objectContaining({
            mimeType: 'image/png',
            name: 'codex-image-1.png',
        }), {
            id: 'user-1:image:1',
            time: 100_000,
            codexItemId: 'user-1',
        });

        const userMessagesInCreatedAtOrder = envelopes
            .filter((envelope) => envelope.role === 'user')
            .sort((a, b) => a.time - b.time);
        expect(userMessagesInCreatedAtOrder.map((envelope) => envelope.ev.t)).toEqual([
            'file',
            'text',
        ]);
    });

    it('backfills image-only user messages without inventing empty text', async () => {
        const imagePath = await makePngFile('only-image.png');
        const uploadLocalImage = vi.fn(async (_attachment, opts) => createEnvelope('user', {
            t: 'file',
            ref: 'uploaded-ref',
            name: 'codex-image-1.png',
            size: 9,
            mimeType: 'image/png',
        }, opts));

        const envelopes = await buildCodexThreadBackfillEnvelopes({
            thread: {
                turns: [{
                    id: 'turn-1',
                    startedAt: 100,
                    items: [{
                        id: 'user-image-only',
                        type: 'userMessage',
                        content: [{ type: 'localImage', path: imagePath }],
                    }],
                }],
            },
            uploadLocalImage,
        });

        expect(envelopes.map((envelope) => envelope.ev.t)).toEqual([
            'turn-start',
            'file',
            'turn-end',
        ]);
    });

    it('skips missing local paths and URL images while preserving text', async () => {
        const uploadLocalImage = vi.fn();

        const envelopes = await buildCodexThreadBackfillEnvelopes({
            thread: {
                turns: [{
                    id: 'turn-1',
                    startedAt: 100,
                    items: [{
                        id: 'user-1',
                        type: 'userMessage',
                        content: [
                            { type: 'text', text: 'text survives' },
                            { type: 'localImage', path: '/path/that/does/not/exist.png' },
                            { type: 'image', url: 'https://example.test/image.png' },
                        ],
                    }],
                }],
            },
            uploadLocalImage,
        });

        expect(envelopes.map((envelope) => envelope.ev.t)).toEqual([
            'turn-start',
            'text',
            'turn-end',
        ]);
        expect(uploadLocalImage).not.toHaveBeenCalled();
    });

    it('keeps active collab-agent turns open during image backfill replay', async () => {
        const envelopes = await buildCodexThreadBackfillEnvelopes({
            thread: {
                turns: [{
                    id: 'turn-active',
                    startedAt: 100,
                    status: 'inProgress',
                    items: [{
                        id: 'collab-active',
                        type: 'collabAgentToolCall',
                        tool: 'spawnAgent',
                        status: 'inProgress',
                        receiverThreadIds: ['provider-child-thread'],
                        prompt: 'Inspect auth flow',
                    }],
                }],
            },
            uploadLocalImage: vi.fn(),
        });

        expect(envelopes.map((envelope) => envelope.ev.t)).toEqual([
            'turn-start',
            'tool-call-start',
            'start',
        ]);
    });
});

describe('prepareCodexThreadSync', () => {
    it('keeps the local ID stable when an attachment gets a new blob reference', () => {
        const envelopeOptions = {
            id: 'user-image:image:1',
            turn: 'turn-image',
            codexItemId: 'user-image',
        };
        const first = createEnvelope('user', {
            t: 'file',
            ref: 'first-upload-ref',
            name: 'codex-image-1.png',
            size: 9,
            mimeType: 'image/png',
        }, envelopeOptions);
        const second = createEnvelope('user', {
            t: 'file',
            ref: 'second-upload-ref',
            name: 'codex-image-1.png',
            size: 9,
            mimeType: 'image/png',
        }, envelopeOptions);

        expect(codexThreadHistoryLocalId('thread-1', first)).toBe(
            codexThreadHistoryLocalId('thread-1', second),
        );
    });

    it('prepares only completed turns not emitted by the current process', async () => {
        const readThread = vi.fn().mockResolvedValue({
            thread: {
                updatedAt: 123,
                turns: [
                    {
                        id: 'turn-known',
                        status: 'completed',
                        startedAt: 10,
                        completedAt: 11,
                        items: [{ id: 'known-agent', type: 'agentMessage', text: 'known' }],
                    },
                    {
                        id: 'turn-new',
                        status: 'completed',
                        startedAt: 20,
                        completedAt: 21,
                        items: [
                            { id: 'new-user', type: 'userMessage', content: [{ type: 'text', text: 'remote prompt' }] },
                            { id: 'new-agent', type: 'agentMessage', text: 'remote response' },
                        ],
                    },
                ],
            },
        });

        const result = await prepareCodexThreadSync({
            threadId: 'thread/1',
            knownCompletedTurnIds: new Set(['turn-known']),
            readThread,
            uploadLocalImage: vi.fn(),
        });

        expect(readThread).toHaveBeenCalledWith({ threadId: 'thread/1', includeTurns: true });
        expect(result).toMatchObject({
            completedTurnIds: ['turn-new'],
            latestTurnId: 'turn-new',
            remoteInProgress: false,
            threadUpdatedAt: 123,
        });
        expect(result.envelopes.map(({ envelope }) => envelope.ev.t)).toEqual([
            'turn-start',
            'text',
            'text',
            'turn-end',
        ]);
        const localIds = result.envelopes.map(({ localId }) => localId);
        expect(localIds.every((localId) => localId.startsWith('codex-thread:thread%2F1:'))).toBe(true);
        expect(new Set(localIds).size).toBe(4);
    });

    it('does not import or upload anything while the remote thread has an active turn', async () => {
        const uploadLocalImage = vi.fn();
        const result = await prepareCodexThreadSync({
            threadId: 'thread-active',
            knownCompletedTurnIds: new Set(),
            readThread: vi.fn().mockResolvedValue({
                thread: {
                    turns: [
                        {
                            id: 'turn-complete',
                            status: 'completed',
                            items: [{ id: 'agent-complete', type: 'agentMessage', text: 'done' }],
                        },
                        {
                            id: 'turn-active',
                            status: 'inProgress',
                            items: [{ id: 'agent-active', type: 'agentMessage', text: 'working' }],
                        },
                    ],
                },
            }),
            uploadLocalImage,
        });

        expect(result.remoteInProgress).toBe(true);
        expect(result.envelopes).toEqual([]);
        expect(result.completedTurnIds).toEqual([]);
        expect(uploadLocalImage).not.toHaveBeenCalled();
    });
});
