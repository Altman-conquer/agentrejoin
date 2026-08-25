import type { Thread } from '../codexAppServerTypes';

const PROVISIONAL_TITLE_MAX_LENGTH = 96;

function nonEmptyTitle(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }
    const title = value.trim();
    return title.length > 0 ? title : null;
}

/** The exact title shown by Codex when it has generated one. */
export function codexThreadName(thread: Pick<Thread, 'name'>): string | null {
    return nonEmptyTitle(thread.name);
}

/** The same name-first fallback used by the Resume conversation picker. */
export function codexThreadDisplayTitle(thread: Pick<Thread, 'name' | 'preview'>): string | null {
    const name = codexThreadName(thread);
    if (name) {
        return name;
    }
    return nonEmptyTitle(thread.preview)?.replace(/\s+/g, ' ') ?? null;
}

/** A readable temporary title until Codex has generated its own thread name. */
export function provisionalCodexThreadTitle(prompt: string): string | null {
    const title = prompt.trim().replace(/\s+/g, ' ');
    if (!title) {
        return null;
    }
    return title.length <= PROVISIONAL_TITLE_MAX_LENGTH
        ? title
        : `${title.slice(0, PROVISIONAL_TITLE_MAX_LENGTH - 3)}...`;
}
