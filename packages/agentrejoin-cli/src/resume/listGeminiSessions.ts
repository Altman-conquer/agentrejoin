import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';

export type GeminiSessionSummary = {
    id: string;
    preview: string;
    cwd: string;
    cwdExists: boolean;
    updatedAt: number;
};

async function readJson(path: string): Promise<unknown> {
    try {
        return JSON.parse(await readFile(path, 'utf8'));
    } catch {
        return null;
    }
}

async function isDirectory(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isDirectory();
    } catch {
        return false;
    }
}

function record(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function textContent(value: unknown): string {
    if (typeof value === 'string') return value;
    if (!Array.isArray(value)) return '';
    return value.map((part) => {
        if (typeof part === 'string') return part;
        const item = record(part);
        return typeof item?.text === 'string' ? item.text : '';
    }).join('');
}

function isResumableMessage(message: Record<string, unknown>): boolean {
    const content = textContent(message.content).trim();
    if (message.type === 'gemini') return content.length > 0;
    return message.type === 'user'
        && content.length > 0
        && !content.startsWith('/')
        && !content.startsWith('?')
        && !content.startsWith('<session_context>')
        && !content.startsWith('<hook_context>');
}

async function projectPaths(geminiDir: string): Promise<Map<string, string>> {
    const paths = new Map<string, string>();
    const registry = record(await readJson(join(geminiDir, 'projects.json')));
    const projects = record(registry?.projects);
    for (const [cwd, slug] of Object.entries(projects ?? {})) {
        if (typeof slug !== 'string') continue;
        paths.set(slug, cwd);
        paths.set(createHash('sha256').update(cwd).digest('hex'), cwd);
    }

    const tempDir = join(geminiDir, 'tmp');
    for (const entry of await readdir(tempDir, { withFileTypes: true }).catch(() => [])) {
        if (!entry.isDirectory()) continue;
        try {
            const cwd = (await readFile(join(tempDir, entry.name, '.project_root'), 'utf8')).trim();
            if (cwd) paths.set(entry.name, cwd);
        } catch {
            // Older Gemini directories are resolved through projects.json.
        }
    }
    return paths;
}

async function readSummary(path: string, cwd: string): Promise<GeminiSessionSummary | null> {
    let raw: string;
    try {
        raw = await readFile(path, 'utf8');
    } catch {
        return null;
    }

    let metadata: Record<string, unknown> = {};
    const messages = new Map<string, Record<string, unknown>>();
    const addMessages = (items: unknown) => {
        if (!Array.isArray(items)) return;
        messages.clear();
        for (const item of items) {
            const message = record(item);
            if (typeof message?.id === 'string') messages.set(message.id, message);
        }
    };
    const apply = (value: unknown) => {
        const item = record(value);
        if (!item) return;
        if (typeof item.$rewindTo === 'string') {
            let remove = false;
            for (const id of messages.keys()) {
                if (id === item.$rewindTo) remove = true;
                if (remove) messages.delete(id);
            }
            return;
        }
        const update = record(item.$set);
        if (update) {
            metadata = { ...metadata, ...update };
            if ('messages' in update) addMessages(update.messages);
            return;
        }
        if (typeof item.id === 'string') {
            messages.set(item.id, item);
            return;
        }
        if (typeof item.sessionId === 'string') {
            metadata = { ...metadata, ...item };
            addMessages(item.messages);
        }
    };

    try {
        apply(JSON.parse(raw));
    } catch {
        for (const line of raw.split('\n')) {
            if (!line.trim()) continue;
            try { apply(JSON.parse(line)); } catch { /* ignore incomplete records */ }
        }
    }

    if (typeof metadata.sessionId !== 'string' || metadata.kind === 'subagent') return null;
    const visible = [...messages.values()].filter(isResumableMessage);
    if (visible.length === 0) return null;
    const firstUser = visible.find((message) => message.type === 'user');
    const preview = (typeof metadata.summary === 'string' ? metadata.summary : textContent(firstUser?.content))
        .trim().replace(/\s+/g, ' ');
    const fileStat = await stat(path).catch(() => null);
    const parsedUpdatedAt = typeof metadata.lastUpdated === 'string'
        ? Date.parse(metadata.lastUpdated)
        : NaN;

    return {
        id: metadata.sessionId,
        preview: preview || metadata.sessionId,
        cwd,
        cwdExists: await isDirectory(cwd),
        updatedAt: Number.isFinite(parsedUpdatedAt) ? parsedUpdatedAt : fileStat?.mtimeMs ?? 0,
    };
}

export async function listGeminiSessions(homeDir: string = os.homedir()): Promise<GeminiSessionSummary[]> {
    const geminiDir = join(homeDir, '.gemini');
    const paths = await projectPaths(geminiDir);
    const sessions: GeminiSessionSummary[] = [];
    for (const [projectId, cwd] of paths) {
        const chatsDir = join(geminiDir, 'tmp', projectId, 'chats');
        for (const entry of await readdir(chatsDir, { withFileTypes: true }).catch(() => [])) {
            if (!entry.isFile() || !/^session-.*\.jsonl?$/.test(entry.name)) continue;
            const summary = await readSummary(join(chatsDir, entry.name), cwd);
            if (summary) sessions.push(summary);
        }
    }
    return [...new Map(sessions.sort((a, b) => b.updatedAt - a.updatedAt).map((item) => [item.id, item])).values()];
}
