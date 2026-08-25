import { createHash, createHmac } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import tweetnacl from 'tweetnacl';
import { z } from 'zod';

import { decodeBase64 } from '@/api/encryption';
import { configuration } from '@/configuration';

const AgentCredentialsSchema = z.object({
    token: z.string().min(1),
    secret: z.string().min(1),
});

export type LocalHappyAgentCredentials = {
    token: string;
    secret: Uint8Array;
    contentKeyPair: {
        publicKey: Uint8Array;
        secretKey: Uint8Array;
    };
};

export type ResumeSupport = {
    rpcAvailable: boolean;
    requiresSameMachine: true;
    requiresAgentRejoinAgentAuth: true;
    agentRejoinAgentAuthenticated: boolean;
    detectedAt: number;
};

function hmacSha512(key: Uint8Array, data: Uint8Array): Uint8Array {
    const hmac = createHmac('sha512', key);
    hmac.update(data);
    return new Uint8Array(hmac.digest());
}

function deriveKey(master: Uint8Array, usage: string, path: string[]): Uint8Array {
    const root = hmacSha512(new TextEncoder().encode(`${usage} Master Seed`), master);
    let state = {
        key: root.slice(0, 32),
        chainCode: root.slice(32),
    };

    for (const index of path) {
        const data = new Uint8Array([0x00, ...new TextEncoder().encode(index)]);
        const derived = hmacSha512(state.chainCode, data);
        state = {
            key: derived.slice(0, 32),
            chainCode: derived.slice(32),
        };
    }

    return state.key;
}

function deriveContentKeyPair(secret: Uint8Array): { publicKey: Uint8Array; secretKey: Uint8Array } {
    const seed = deriveKey(secret, 'AgentRejoin EnCoder', ['content']);
    const hashedSeed = new Uint8Array(createHash('sha512').update(seed).digest());
    const secretKey = hashedSeed.slice(0, 32);
    const keyPair = tweetnacl.box.keyPair.fromSecretKey(secretKey);
    return {
        publicKey: keyPair.publicKey,
        secretKey: keyPair.secretKey,
    };
}

export function getLocalHappyAgentCredentialPath(agentRejoinHomeDir: string = configuration.agentRejoinHomeDir): string {
    return join(agentRejoinHomeDir, 'agent.key');
}

export function readLocalHappyAgentCredentials(
    agentRejoinHomeDir: string = configuration.agentRejoinHomeDir,
): LocalHappyAgentCredentials | null {
    const credentialPath = getLocalHappyAgentCredentialPath(agentRejoinHomeDir);
    if (!existsSync(credentialPath)) {
        return null;
    }

    try {
        const parsed = AgentCredentialsSchema.parse(JSON.parse(readFileSync(credentialPath, 'utf8')));
        const secret = decodeBase64(parsed.secret);
        return {
            token: parsed.token,
            secret,
            contentKeyPair: deriveContentKeyPair(secret),
        };
    } catch {
        return null;
    }
}

export function hasLocalHappyAgentAuth(agentRejoinHomeDir: string = configuration.agentRejoinHomeDir): boolean {
    return readLocalHappyAgentCredentials(agentRejoinHomeDir) !== null;
}

export function detectResumeSupport(agentRejoinHomeDir: string = configuration.agentRejoinHomeDir): ResumeSupport {
    const agentRejoinAgentAuthenticated = hasLocalHappyAgentAuth(agentRejoinHomeDir);
    return {
        rpcAvailable: agentRejoinAgentAuthenticated,
        requiresSameMachine: true,
        requiresAgentRejoinAgentAuth: true,
        agentRejoinAgentAuthenticated,
        detectedAt: Date.now(),
    };
}
