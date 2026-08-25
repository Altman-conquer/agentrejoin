import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from './config';

describe('config', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        delete process.env.AGENTREJOIN_SERVER_URL;
        delete process.env.AGENTREJOIN_HOME_DIR;
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    describe('defaults', () => {
        it('uses default server URL', () => {
            const config = loadConfig();
            expect(config.serverUrl).toBe('https://agentrejoin.zhandj.com');
        });

        it('uses default home directory', () => {
            const config = loadConfig();
            expect(config.homeDir).toBe(join(homedir(), '.agentrejoin'));
        });

        it('derives credential path from home directory', () => {
            const config = loadConfig();
            expect(config.credentialPath).toBe(join(homedir(), '.agentrejoin', 'agent.key'));
        });
    });

    describe('env var overrides', () => {
        it('overrides server URL with AGENTREJOIN_SERVER_URL', () => {
            process.env.AGENTREJOIN_SERVER_URL = 'https://custom-server.example.com';
            const config = loadConfig();
            expect(config.serverUrl).toBe('https://custom-server.example.com');
        });

        it('overrides home directory with AGENTREJOIN_HOME_DIR', () => {
            process.env.AGENTREJOIN_HOME_DIR = '/tmp/custom-agentrejoin';
            const config = loadConfig();
            expect(config.homeDir).toBe('/tmp/custom-agentrejoin');
        });

        it('derives credential path from overridden home directory', () => {
            process.env.AGENTREJOIN_HOME_DIR = '/tmp/custom-agentrejoin';
            const config = loadConfig();
            expect(config.credentialPath).toBe('/tmp/custom-agentrejoin/agent.key');
        });

        it('allows both overrides simultaneously', () => {
            process.env.AGENTREJOIN_SERVER_URL = 'https://other.example.com';
            process.env.AGENTREJOIN_HOME_DIR = '/opt/agentrejoin';
            const config = loadConfig();
            expect(config.serverUrl).toBe('https://other.example.com');
            expect(config.homeDir).toBe('/opt/agentrejoin');
            expect(config.credentialPath).toBe('/opt/agentrejoin/agent.key');
        });
    });
});
