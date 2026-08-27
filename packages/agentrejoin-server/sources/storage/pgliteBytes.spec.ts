import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPGlite } from 'pglite-prisma-adapter';
import { afterEach, expect, it } from 'vitest';
import { runMigrations } from '../standalone';
import { createPGlite } from './pgliteLoader';

let dataDir: string | undefined;

afterEach(async () => {
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
});

it('round-trips machine encryption keys through the embedded database', async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'agentrejoin-pglite-'));
    await runMigrations({
        pgliteDir: dataDir,
        migrationsDir: resolve('prisma/migrations'),
    });

    const pg = createPGlite(dataDir);
    const db = new PrismaClient({ adapter: new PrismaPGlite(pg) } as any);
    const key = new Uint8Array([0, 1, 2, 254, 255]);

    try {
        const account = await db.account.create({ data: { publicKey: 'test-public-key' } });
        await db.machine.create({
            data: { id: 'test-machine', accountId: account.id, metadata: 'encrypted', dataEncryptionKey: key },
        });

        const machine = await db.machine.findUniqueOrThrow({ where: { id: 'test-machine' } });
        expect(Array.from(machine.dataEncryptionKey!)).toEqual(Array.from(key));
    } finally {
        await db.$disconnect();
        await pg.close();
    }
});
