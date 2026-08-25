import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

import type { CreateEnvelopeOptions, SessionEnvelope } from 'agentrejoin-wire';
import { createEnvelope } from 'agentrejoin-wire';

import { logger } from '@/ui/logger';

import type { Thread, ThreadItem } from '../codexAppServerTypes';
import { detectSupportedImageType } from './imageInput';
import {
    completedTimestampMs,
    isCodexTurnInProgress,
    mapCodexThreadItemToSessionEnvelopes,
    turnStatus,
    turnTimestampMs,
} from './sessionProtocolMapper';

type LocalImageUpload = (
    attachment: { data: Uint8Array; mimeType: string; name: string },
    opts: Pick<CreateEnvelopeOptions, 'id' | 'time' | 'codexItemId'> & { codexItemId: string },
) => Promise<SessionEnvelope>;

function localImagePaths(item: ThreadItem): string[] {
    if (item.type !== 'userMessage' || !Array.isArray(item.content)) {
        return [];
    }

    return item.content
        .filter((part): part is { type: 'localImage'; path: string } => (
            Boolean(part)
            && typeof part === 'object'
            && (part as { type?: unknown }).type === 'localImage'
            && typeof (part as { path?: unknown }).path === 'string'
            && (part as { path: string }).path.length > 0
        ))
        .map((part) => part.path);
}

async function localImagePathToAttachment(
    path: string,
    index: number,
): Promise<{ data: Uint8Array; mimeType: string; name: string } | null> {
    try {
        const data = new Uint8Array(await readFile(path));
        const detected = detectSupportedImageType(data);
        if (!detected) {
            logger.debug('[Codex image backfill] Skipping unsupported local image input');
            return null;
        }
        return {
            data,
            mimeType: detected.mimeType,
            name: `codex-image-${index}.${detected.extension}`,
        };
    } catch (error) {
        logger.debug('[Codex image backfill] Skipping unavailable local image input', {
            errorName: error instanceof Error ? error.name : typeof error,
        });
        return null;
    }
}

export async function buildCodexThreadBackfillEnvelopes(opts: {
    thread: Pick<Thread, 'turns'>;
    uploadLocalImage: LocalImageUpload;
}): Promise<SessionEnvelope[]> {
    const envelopes: SessionEnvelope[] = [];
    const providerSubagentToSessionSubagent = new Map<string, string>();
    const subagentTitles = new Map<string, string>();
    const collabReceiverThreadIdsByCall = new Map<string, string[]>();
    const collabToolByCall = new Map<string, string>();

    for (const turn of opts.thread.turns ?? []) {
        const startedAt = turnTimestampMs(turn);
        const completedAt = completedTimestampMs(turn);
        const state = {
            currentTurnId: turn.id,
            startedSubagents: new Set<string>(),
            activeSubagents: new Set<string>(),
            providerSubagentToSessionSubagent,
            subagentTitles,
            collabReceiverThreadIdsByCall,
            collabToolByCall,
        };
        envelopes.push(createEnvelope('agent', { t: 'turn-start' }, {
            id: `${turn.id}:start`,
            turn: turn.id,
            time: startedAt,
        }));

        for (const item of turn.items ?? []) {
            const paths = localImagePaths(item);
            for (let index = 0; index < paths.length; index += 1) {
                const attachment = await localImagePathToAttachment(paths[index], index + 1);
                if (!attachment) continue;
                try {
                    envelopes.push(await opts.uploadLocalImage(attachment, {
                        id: `${item.id}:image:${index + 1}`,
                        time: startedAt,
                        codexItemId: item.id,
                    }));
                } catch (error) {
                    logger.debug('[Codex image backfill] Failed to upload local image input', {
                        errorName: error instanceof Error ? error.name : typeof error,
                    });
                }
            }
            envelopes.push(...mapCodexThreadItemToSessionEnvelopes(turn, item, {
                startedAt,
                completedAt,
            }, state));
        }

        if (!isCodexTurnInProgress(turn)) {
            for (const subagent of state.activeSubagents) {
                envelopes.push(createEnvelope('agent', { t: 'stop' }, {
                    turn: turn.id,
                    subagent,
                    time: completedAt,
                }));
            }
            state.activeSubagents.clear();
            state.startedSubagents.clear();
            envelopes.push(createEnvelope('agent', { t: 'turn-end', status: turnStatus(turn) }, {
                id: `${turn.id}:end`,
                turn: turn.id,
                time: completedAt,
            }));
        }
    }

    return envelopes;
}

/**
 * Read a persisted Codex thread and replay its historical items into a new
 * AgentRejoin session. Keeping this separate from the live event mapper lets both
 * normal resume and forked sessions render their existing conversation.
 */
export async function replayCodexThreadHistory(opts: {
    threadId: string;
    readThread: (params: { threadId: string; includeTurns: boolean }) => Promise<{
        thread: Pick<Thread, 'turns' | 'name' | 'preview'>;
    }>;
    sendEnvelope: (envelope: SessionEnvelope) => void;
    uploadLocalImage: LocalImageUpload;
}): Promise<{ envelopeCount: number; thread: Pick<Thread, 'turns' | 'name' | 'preview'> }> {
    const { thread } = await opts.readThread({
        threadId: opts.threadId,
        includeTurns: true,
    });
    const envelopes = await buildCodexThreadBackfillEnvelopes({
        thread,
        uploadLocalImage: opts.uploadLocalImage,
    });
    for (const envelope of envelopes) {
        opts.sendEnvelope(envelope);
    }
    return { envelopeCount: envelopes.length, thread };
}

export type PreparedCodexThreadSync = {
    envelopes: Array<{ envelope: SessionEnvelope; localId: string }>;
    completedTurnIds: string[];
    latestTurnId?: string;
    remoteInProgress: boolean;
    threadUpdatedAt?: number;
};

export function codexThreadHistoryLocalId(
    threadId: string,
    envelope: SessionEnvelope,
): string {
    const stableEvent = envelope.ev.t === 'file'
        ? {
            t: envelope.ev.t,
            name: envelope.ev.name,
            size: envelope.ev.size,
            mimeType: envelope.ev.mimeType,
        }
        : envelope.ev;
    const digest = createHash('sha256')
        .update(JSON.stringify({
            role: envelope.role,
            turn: envelope.turn,
            subagent: envelope.subagent,
            codexItemId: envelope.codexItemId,
            ev: stableEvent,
        }))
        .digest('hex');
    return `codex-thread:${encodeURIComponent(threadId)}:${digest}`;
}

/**
 * Read a persisted thread and prepare only completed turns that this AgentRejoin
 * process has not already emitted. The caller owns the final context refresh
 * and message flush so it can keep those operations serialized with live turns.
 */
export async function prepareCodexThreadSync(opts: {
    threadId: string;
    knownCompletedTurnIds: ReadonlySet<string>;
    readThread: (params: { threadId: string; includeTurns: boolean }) => Promise<{
        thread: Pick<Thread, 'turns' | 'updatedAt'>;
    }>;
    uploadLocalImage: LocalImageUpload;
}): Promise<PreparedCodexThreadSync> {
    const { thread } = await opts.readThread({
        threadId: opts.threadId,
        includeTurns: true,
    });
    const turns = thread.turns ?? [];
    const remoteInProgress = turns.some(isCodexTurnInProgress);
    const completedTurns = turns.filter((turn) => !isCodexTurnInProgress(turn));
    const latestTurnId = completedTurns[completedTurns.length - 1]?.id;

    // Do not resume or partially import a thread while another Codex client is
    // still writing its current turn.
    if (remoteInProgress) {
        return {
            envelopes: [],
            completedTurnIds: [],
            ...(latestTurnId ? { latestTurnId } : {}),
            remoteInProgress: true,
            ...(typeof thread.updatedAt === 'number' ? { threadUpdatedAt: thread.updatedAt } : {}),
        };
    }

    const newTurns = completedTurns.filter((turn) => !opts.knownCompletedTurnIds.has(turn.id));
    const rawEnvelopes = await buildCodexThreadBackfillEnvelopes({
        thread: { turns: newTurns },
        uploadLocalImage: opts.uploadLocalImage,
    });
    const envelopes = rawEnvelopes.map((envelope) => {
        return {
            envelope,
            localId: codexThreadHistoryLocalId(opts.threadId, envelope),
        };
    });

    return {
        envelopes,
        completedTurnIds: newTurns.map((turn) => turn.id),
        ...(latestTurnId ? { latestTurnId } : {}),
        remoteInProgress: false,
        ...(typeof thread.updatedAt === 'number' ? { threadUpdatedAt: thread.updatedAt } : {}),
    };
}
