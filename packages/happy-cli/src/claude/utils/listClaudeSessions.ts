import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { createInterface } from 'node:readline';

const UUID_FILE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/i;

export type ClaudeSessionSummary = {
    id: string;
    preview: string;
    cwd: string;
    cwdExists: boolean;
    updatedAt: number;
};

function userText(value: unknown): string | null {
    if (typeof value === 'string') {
        return value.trim() || null;
    }
    if (!Array.isArray(value)) {
        return null;
    }
    const text = value
        .filter((item): item is { type: 'text'; text: string } => (
            !!item && typeof item === 'object' && item.type === 'text' && typeof item.text === 'string'
        ))
        .map((item) => item.text)
        .join('\n')
        .trim();
    return text || null;
}

export function claudeSessionEntryPreview(entry: any): string | null {
    if (entry?.type !== 'user' || entry.isMeta === true || entry.isSidechain === true) {
        return null;
    }
    const preview = userText(entry.message?.content);
    return preview ? preview.replace(/\s+/g, ' ').slice(0, 240) : null;
}

async function summarizeSession(path: string): Promise<ClaudeSessionSummary | null> {
    let cwd: string | null = null;
    let preview: string | null = null;
    const lines = createInterface({ input: createReadStream(path), crlfDelay: Infinity });

    try {
        for await (const line of lines) {
            let entry: any;
            try {
                entry = JSON.parse(line);
            } catch {
                continue;
            }
            if (!cwd && typeof entry.cwd === 'string' && entry.cwd.length > 0) {
                cwd = entry.cwd;
            }
            if (!preview) preview = claudeSessionEntryPreview(entry);
            if (cwd && preview) {
                break;
            }
        }
    } finally {
        lines.close();
    }

    if (!cwd || !preview) {
        return null;
    }
    const [file, directory] = await Promise.all([
        stat(path),
        stat(cwd).catch(() => null),
    ]);
    return {
        id: basename(path, '.jsonl'),
        preview,
        cwd,
        cwdExists: directory?.isDirectory() ?? false,
        updatedAt: file.mtimeMs,
    };
}

export async function listClaudeSessions(
    claudeConfigDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'),
): Promise<ClaudeSessionSummary[]> {
    const projectsDir = join(claudeConfigDir, 'projects');
    const projects = await readdir(projectsDir, { withFileTypes: true }).catch(() => []);
    const sessions: ClaudeSessionSummary[] = [];

    // ponytail: sequential scanning limits open files; add bounded concurrency only if large histories are measurably slow.
    for (const project of projects) {
        if (!project.isDirectory()) continue;
        const projectDir = join(projectsDir, project.name);
        const files = await readdir(projectDir, { withFileTypes: true }).catch(() => []);
        for (const file of files) {
            if (!file.isFile() || !UUID_FILE_RE.test(file.name)) continue;
            const summary = await summarizeSession(join(projectDir, file.name));
            if (summary) sessions.push(summary);
        }
    }

    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}
