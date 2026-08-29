import fastify from "fastify";
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Fastify } from "../types";

const { acknowledgements, dbMock } = vi.hoisted(() => {
    const acknowledgements = new Set<string>();
    const dbMock = {
        userKVStore: {
            findUnique: vi.fn(async ({ where }: any) => {
                const { accountId, key } = where.accountId_key;
                return acknowledgements.has(`${accountId}:${key}`) ? { value: Buffer.from("1") } : null;
            }),
            upsert: vi.fn(async ({ where }: any) => {
                const { accountId, key } = where.accountId_key;
                acknowledgements.add(`${accountId}:${key}`);
                return { accountId, key };
            }),
        },
    };
    return { acknowledgements, dbMock };
});

vi.mock("@/storage/db", () => ({ db: dbMock }));
vi.mock("@/utils/log", () => ({ log: vi.fn() }));

import { announcementRoutes } from "./announcementRoutes";

async function createApp(): Promise<Fastify> {
    const app = fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    const typed = app.withTypeProvider<ZodTypeProvider>() as unknown as Fastify;
    typed.decorate("authenticate", async (request: any) => {
        request.userId = request.headers["x-user-id"] ?? "user-1";
    });
    announcementRoutes(typed);
    await typed.ready();
    return typed;
}

describe("announcementRoutes", () => {
    let app: Fastify;

    beforeEach(async () => {
        acknowledgements.clear();
        process.env.AGENTREJOIN_ANNOUNCEMENT = JSON.stringify({
            id: "release-7",
            title: { en: "Update available", "zh-Hans": "发现新版本" },
            message: { en: "Open the release page.", "zh-Hans": "请打开发布页面。" },
            url: "https://example.com/releases/7",
            actionLabel: { en: "View update", "zh-Hans": "查看更新" },
        });
        app = await createApp();
    });

    afterEach(async () => {
        delete process.env.AGENTREJOIN_ANNOUNCEMENT;
        await app.close();
        vi.clearAllMocks();
    });

    it("localizes an announcement and hides it account-wide after acknowledgement", async () => {
        const first = await app.inject({
            method: "GET",
            url: "/v1/announcement?locale=zh-Hans",
            headers: { "x-user-id": "user-1" },
        });
        expect(first.json().announcement).toMatchObject({ id: "release-7", title: "发现新版本" });

        const acknowledged = await app.inject({
            method: "POST",
            url: "/v1/announcement/release-7/acknowledge",
            headers: { "x-user-id": "user-1" },
        });
        expect(acknowledged.json()).toEqual({ success: true });

        const sameAccount = await app.inject({
            method: "GET",
            url: "/v1/announcement?locale=en",
            headers: { "x-user-id": "user-1" },
        });
        expect(sameAccount.json()).toEqual({ announcement: null });

        const otherAccount = await app.inject({
            method: "GET",
            url: "/v1/announcement?locale=en",
            headers: { "x-user-id": "user-2" },
        });
        expect(otherAccount.json().announcement.title).toBe("Update available");
    });
});
