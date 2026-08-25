import fastify from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Fastify } from '../types';

const { requests, dbMock, createTokenMock } = vi.hoisted(() => {
    type RequestRow = {
        id: string;
        publicKey: string;
        response: string | null;
        responseAccountId: string | null;
        createdAt: Date;
        updatedAt: Date;
    };

    const requests = new Map<string, RequestRow>();
    const dbMock = {
        accountAuthRequest: {
            upsert: vi.fn(async ({ where, create }: any) => {
                const existing = requests.get(where.publicKey);
                if (existing) return { ...existing };

                const now = new Date();
                const row: RequestRow = {
                    id: `request-${requests.size + 1}`,
                    publicKey: create.publicKey,
                    response: null,
                    responseAccountId: null,
                    createdAt: now,
                    updatedAt: now,
                };
                requests.set(row.publicKey, row);
                return { ...row };
            }),
            findUnique: vi.fn(async ({ where }: any) => {
                const row = requests.get(where.publicKey);
                return row ? { ...row } : null;
            }),
            updateMany: vi.fn(async ({ where, data }: any) => {
                const row = [...requests.values()].find(candidate => candidate.id === where.id);
                if (!row) return { count: 0 };
                if (where.response?.not === null && row.response === null) return { count: 0 };
                if (where.responseAccountId === null && row.responseAccountId !== null) return { count: 0 };

                Object.assign(row, data, { updatedAt: new Date() });
                return { count: 1 };
            }),
        },
    };
    const createTokenMock = vi.fn(async (accountId: string) => `token-${accountId}`);
    return { requests, dbMock, createTokenMock };
});

vi.mock('@/storage/db', () => ({ db: dbMock }));
vi.mock('@/app/auth/auth', () => ({ auth: { createToken: createTokenMock } }));
vi.mock('@/utils/log', () => ({ log: vi.fn() }));

import { authRoutes } from './authRoutes';

async function createApp(): Promise<Fastify> {
    const app = fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    const typed = app.withTypeProvider<ZodTypeProvider>() as unknown as Fastify;
    typed.decorate('authenticate', async (request: any) => {
        request.userId = request.headers['x-user-id'];
    });
    authRoutes(typed);
    await typed.ready();
    return typed;
}

function publicKey(seed: number): string {
    return Buffer.from(new Uint8Array(32).fill(seed)).toString('base64');
}

describe('account Web pairing', () => {
    let app: Fastify;

    afterEach(async () => {
        await app?.close();
        requests.clear();
        vi.clearAllMocks();
    });

    it('allows one claim within five minutes and rejects replacement, reuse, and expiry', async () => {
        app = await createApp();
        const key = publicKey(1);

        expect((await app.inject({ method: 'POST', url: '/v1/auth/account/request', payload: { publicKey: key } })).json())
            .toEqual({ state: 'requested' });
        expect((await app.inject({
            method: 'POST',
            url: '/v1/auth/account/response',
            headers: { 'x-user-id': 'account-1' },
            payload: { publicKey: key, response: 'encrypted-secret' },
        })).statusCode).toBe(200);
        expect((await app.inject({
            method: 'POST',
            url: '/v1/auth/account/response',
            headers: { 'x-user-id': 'account-2' },
            payload: { publicKey: key, response: 'replacement' },
        })).statusCode).toBe(409);

        expect((await app.inject({ method: 'POST', url: '/v1/auth/account/request', payload: { publicKey: key } })).json())
            .toEqual({ state: 'authorized', token: 'token-account-1', response: 'encrypted-secret' });
        expect((await app.inject({ method: 'POST', url: '/v1/auth/account/request', payload: { publicKey: key } })).statusCode)
            .toBe(410);

        const expiredKey = publicKey(2);
        await app.inject({ method: 'POST', url: '/v1/auth/account/request', payload: { publicKey: expiredKey } });
        requests.get(Buffer.from(new Uint8Array(32).fill(2)).toString('hex'))!.createdAt = new Date(Date.now() - 5 * 60 * 1000);
        expect((await app.inject({
            method: 'POST',
            url: '/v1/auth/account/response',
            headers: { 'x-user-id': 'account-1' },
            payload: { publicKey: expiredKey, response: 'too-late' },
        })).statusCode).toBe(410);
    });
});
