import { homedir } from 'node:os';
import { join } from 'node:path';

export type Config = {
    serverUrl: string;
    homeDir: string;
    credentialPath: string;
};

export function loadConfig(): Config {
    const serverUrl = (process.env.AGENTREJOIN_SERVER_URL ?? 'https://agentrejoin.zhandj.com').replace(/\/+$/, '');
    const homeDir = process.env.AGENTREJOIN_HOME_DIR ?? join(homedir(), '.agentrejoin');
    const credentialPath = join(homeDir, 'agent.key');
    return { serverUrl, homeDir, credentialPath };
}
