import { db } from "@/storage/db";
import { log } from "@/utils/log";
import { z } from "zod";
import { Fastify } from "../types";

const localizedTextSchema = z.object({
    en: z.string().min(1).max(4000),
    "zh-Hans": z.string().min(1).max(4000).optional(),
    "zh-Hant": z.string().min(1).max(4000).optional(),
}).catchall(z.string().min(1).max(4000));

const announcementSchema = z.object({
    id: z.string().min(1).max(100).regex(/^[A-Za-z0-9._-]+$/),
    title: localizedTextSchema,
    message: localizedTextSchema,
    url: z.string().url().refine((value) => /^https?:\/\//.test(value)).optional(),
    actionLabel: localizedTextSchema.optional(),
}).strict().refine((value) => !value.url || value.actionLabel, {
    message: "actionLabel is required when url is set",
});

type LocalizedText = z.infer<typeof localizedTextSchema>;
type AnnouncementConfig = z.infer<typeof announcementSchema>;

const acknowledgementKey = (id: string) => `__server_announcement__:${id}`;

function getAnnouncement(): AnnouncementConfig | null {
    const raw = process.env.AGENTREJOIN_ANNOUNCEMENT;
    if (!raw) return null;

    try {
        const parsed = announcementSchema.safeParse(JSON.parse(raw));
        if (parsed.success) return parsed.data;
        log({ module: "announcements", level: "error" }, `Invalid AGENTREJOIN_ANNOUNCEMENT: ${parsed.error.message}`);
    } catch (error) {
        log({ module: "announcements", level: "error" }, `Invalid AGENTREJOIN_ANNOUNCEMENT JSON: ${error}`);
    }
    return null;
}

function localize(value: LocalizedText, locale: string): string {
    return value[locale]
        ?? value[locale.split("-")[0]]
        ?? (locale.startsWith("zh") ? value["zh-Hans"] : undefined)
        ?? value.en;
}

export function announcementRoutes(app: Fastify) {
    app.get("/v1/announcement", {
        preHandler: app.authenticate,
        schema: {
            querystring: z.object({ locale: z.string().max(20).default("en") }),
            response: {
                200: z.object({
                    announcement: z.object({
                        id: z.string(),
                        title: z.string(),
                        message: z.string(),
                        url: z.string().nullable(),
                        actionLabel: z.string().nullable(),
                    }).nullable(),
                }),
            },
        },
    }, async (request, reply) => {
        const announcement = getAnnouncement();
        if (!announcement) return reply.send({ announcement: null });

        const acknowledgement = await db.userKVStore.findUnique({
            where: {
                accountId_key: {
                    accountId: request.userId,
                    key: acknowledgementKey(announcement.id),
                },
            },
            select: { value: true },
        });
        if (acknowledgement?.value) return reply.send({ announcement: null });

        return reply.send({
            announcement: {
                id: announcement.id,
                title: localize(announcement.title, request.query.locale),
                message: localize(announcement.message, request.query.locale),
                url: announcement.url ?? null,
                actionLabel: announcement.actionLabel
                    ? localize(announcement.actionLabel, request.query.locale)
                    : null,
            },
        });
    });

    app.post("/v1/announcement/:id/acknowledge", {
        preHandler: app.authenticate,
        schema: {
            params: z.object({ id: z.string().min(1).max(100) }),
            response: {
                200: z.object({ success: z.literal(true) }),
                404: z.object({ error: z.literal("Announcement not found") }),
            },
        },
    }, async (request, reply) => {
        const announcement = getAnnouncement();
        if (!announcement || announcement.id !== request.params.id) {
            return reply.code(404).send({ error: "Announcement not found" });
        }

        const key = acknowledgementKey(announcement.id);
        await db.userKVStore.upsert({
            where: { accountId_key: { accountId: request.userId, key } },
            create: { accountId: request.userId, key, value: Buffer.from("1") },
            update: { value: Buffer.from("1") },
        });
        return reply.send({ success: true });
    });
}
