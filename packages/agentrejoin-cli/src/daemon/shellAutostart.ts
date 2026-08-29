import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const START_MARKER = '# >>> AgentRejoin daemon autostart >>>';
const END_MARKER = '# <<< AgentRejoin daemon autostart <<<';
const AUTOSTART_BLOCK = `${START_MARKER}
if [[ $- == *i* ]] && [[ -z "\${AGENTREJOIN_DAEMON_CHECKED:-}" ]]; then
  export AGENTREJOIN_DAEMON_CHECKED=1
  command agentrejoin daemon start >/dev/null 2>&1 &
fi
${END_MARKER}`;

function profilePath(homeDir: string, shell?: string): string | null {
  const name = path.basename(shell || '');
  if (name === 'bash') return path.join(homeDir, '.bashrc');
  if (name === 'zsh') return path.join(homeDir, '.zshrc');
  return null;
}

async function readOptional(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function enableShellAutostart(
  homeDir = os.homedir(),
  shell = process.env.SHELL,
): Promise<string | null> {
  const file = profilePath(homeDir, shell);
  if (!file) return null;

  const existing = await readOptional(file) ?? '';
  if (existing.includes(START_MARKER) && existing.includes(END_MARKER)) return file;
  if (existing.includes(START_MARKER) || existing.includes(END_MARKER)) {
    throw new Error(`Incomplete AgentRejoin autostart block in ${file}`);
  }

  await mkdir(path.dirname(file), { recursive: true });
  const separator = existing && !existing.endsWith('\n') ? '\n' : '';
  await appendFile(file, `${separator}${AUTOSTART_BLOCK}\n`, 'utf8');
  return file;
}

export async function disableShellAutostart(homeDir = os.homedir()): Promise<string[]> {
  const changed: string[] = [];

  for (const name of ['.bashrc', '.zshrc']) {
    const file = path.join(homeDir, name);
    const existing = await readOptional(file);
    if (existing === null) continue;

    const start = existing.indexOf(START_MARKER);
    if (start === -1) continue;
    const end = existing.indexOf(END_MARKER, start);
    if (end === -1) throw new Error(`Incomplete AgentRejoin autostart block in ${file}`);

    const nextLine = existing.indexOf('\n', end + END_MARKER.length);
    const updated = existing.slice(0, start) + existing.slice(nextLine === -1 ? existing.length : nextLine + 1);
    await writeFile(file, updated, 'utf8');
    changed.push(file);
  }

  return changed;
}
