import { delimiter } from 'node:path';

function isPackageBinPath(entry: string): boolean {
    const unquoted = entry.length >= 2 && entry.startsWith('"') && entry.endsWith('"')
        ? entry.slice(1, -1)
        : entry;
    const normalized = unquoted.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
    return normalized === 'node_modules/.bin' || normalized.endsWith('/node_modules/.bin');
}

export function withoutPackageBinEntries(pathValue: string, pathDelimiter: string = delimiter): string {
    return pathValue
        .split(pathDelimiter)
        .filter((entry) => !isPackageBinPath(entry))
        .join(pathDelimiter);
}

/**
 * Keep workspace package binaries from shadowing the user's global Codex CLI.
 */
export function createGlobalCodexEnvironment(source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
    const env = { ...source };
    const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
    const pathValue = env[pathKey];

    if (typeof pathValue === 'string') {
        env[pathKey] = withoutPackageBinEntries(pathValue);
    }

    return env;
}
