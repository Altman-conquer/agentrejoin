import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { configuration } from '@/configuration';

const SERVICE_NAME = 'agentrejoin.service';

function quoteUnitValue(value: string): string {
  if (/\r|\n/.test(value)) throw new Error('Systemd unit values cannot contain newlines');
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/%/g, '%%')}"`;
}

export function buildSystemdUnit(options: {
  nodePath: string;
  scriptPath: string;
  homeDir: string;
  pathValue: string;
  agentRejoinHomeDir?: string;
}): string {
  const environment = [
    `Environment=${quoteUnitValue(`HOME=${options.homeDir}`)}`,
    `Environment=${quoteUnitValue(`PATH=${options.pathValue}`)}`,
    ...(options.agentRejoinHomeDir
      ? [`Environment=${quoteUnitValue(`AGENTREJOIN_HOME_DIR=${options.agentRejoinHomeDir}`)}`]
      : []),
  ];
  return [
    '[Unit]',
    'Description=AgentRejoin background session supervisor',
    'After=network-online.target',
    'Wants=network-online.target',
    '',
    '[Service]',
    'Type=simple',
    `ExecStart=${quoteUnitValue(options.nodePath)} ${quoteUnitValue(options.scriptPath)} daemon foreground`,
    `WorkingDirectory=${quoteUnitValue(options.homeDir)}`,
    ...environment,
    'Restart=on-failure',
    'RestartSec=5',
    'KillMode=process',
    'TimeoutStopSec=15',
    '',
    '[Install]',
    'WantedBy=default.target',
    '',
  ].join('\n');
}

export function isContainerEnvironment(): boolean {
  if (existsSync('/.dockerenv') || existsSync('/run/.containerenv')) return true;
  try {
    return /docker|containerd|kubepods|lxc/i.test(readFileSync('/proc/1/cgroup', 'utf8'));
  } catch {
    return false;
  }
}

export function isSystemdAvailable(): boolean {
  if (!existsSync('/run/systemd/system')) return false;
  try {
    const prefix = process.getuid?.() === 0 ? [] : ['--user'];
    execFileSync('systemctl', [...prefix, 'show-environment'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function serviceTarget(): { file: string; systemctlPrefix: string[] } {
  if (process.getuid?.() === 0) {
    return { file: `/etc/systemd/system/${SERVICE_NAME}`, systemctlPrefix: [] };
  }
  return {
    file: path.join(os.homedir(), '.config', 'systemd', 'user', SERVICE_NAME),
    systemctlPrefix: ['--user'],
  };
}

export async function installLinuxService(): Promise<string> {
  const target = serviceTarget();
  const unit = buildSystemdUnit({
    nodePath: process.execPath,
    scriptPath: process.argv[1],
    homeDir: os.homedir(),
    pathValue: process.env.PATH || path.dirname(process.execPath),
    agentRejoinHomeDir: process.env.AGENTREJOIN_HOME_DIR ? configuration.agentRejoinHomeDir : undefined,
  });
  await mkdir(path.dirname(target.file), { recursive: true });
  await writeFile(target.file, unit, { encoding: 'utf8', mode: 0o644 });
  execFileSync('systemctl', [...target.systemctlPrefix, 'daemon-reload'], { stdio: 'inherit' });
  execFileSync('systemctl', [...target.systemctlPrefix, 'enable', SERVICE_NAME], { stdio: 'inherit' });
  execFileSync('systemctl', [...target.systemctlPrefix, 'restart', SERVICE_NAME], { stdio: 'inherit' });
  return target.file;
}

export async function uninstallLinuxService(): Promise<string | null> {
  const target = serviceTarget();
  if (!existsSync(target.file)) return null;
  try {
    execFileSync('systemctl', [...target.systemctlPrefix, 'disable', '--now', SERVICE_NAME], { stdio: 'inherit' });
  } finally {
    await unlink(target.file);
    execFileSync('systemctl', [...target.systemctlPrefix, 'daemon-reload'], { stdio: 'inherit' });
  }
  return target.file;
}
