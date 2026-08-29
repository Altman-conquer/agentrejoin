import * as React from "react";
import { AppState } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { Modal } from "@/modal";
import { getCurrentLanguage, t } from "@/text";
import { getHappyClientId } from "@/sync/apiSocket";
import { getServerUrl } from "@/sync/serverConfig";
import { openExternalUrl } from "@/utils/openExternalUrl";

type Announcement = {
    id: string;
    title: string;
    message: string;
    url: string | null;
    actionLabel: string | null;
};

export function AnnouncementPrompt() {
    const { credentials } = useAuth();
    const checking = React.useRef(false);
    const shown = React.useRef(new Set<string>());

    React.useEffect(() => {
        if (!credentials) return;
        let active = true;

        const acknowledge = async (announcement: Announcement, openUrl: boolean) => {
            try {
                const response = await fetch(
                    `${getServerUrl()}/v1/announcement/${encodeURIComponent(announcement.id)}/acknowledge`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${credentials.token}`,
                            "X-AgentRejoin-Client": getHappyClientId(),
                        },
                    },
                );
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
            } catch (error) {
                console.warn("Failed to acknowledge announcement:", error);
            } finally {
                if (openUrl && announcement.url) void openExternalUrl(announcement.url);
            }
        };

        const check = async () => {
            if (checking.current) return;
            checking.current = true;
            try {
                const locale = encodeURIComponent(getCurrentLanguage());
                const response = await fetch(`${getServerUrl()}/v1/announcement?locale=${locale}`, {
                    headers: {
                        Authorization: `Bearer ${credentials.token}`,
                        "X-AgentRejoin-Client": getHappyClientId(),
                    },
                });
                if (!response.ok) return;

                const { announcement } = await response.json() as { announcement: Announcement | null };
                if (!active || !announcement || shown.current.has(announcement.id)) return;
                shown.current.add(announcement.id);

                const buttons = [{
                    text: t("common.ok"),
                    onPress: () => void acknowledge(announcement, false),
                }];
                if (announcement.url && announcement.actionLabel) {
                    buttons.push({
                        text: announcement.actionLabel,
                        onPress: () => void acknowledge(announcement, true),
                    });
                }
                Modal.alert(announcement.title, announcement.message, buttons);
            } catch (error) {
                console.warn("Failed to load announcement:", error);
            } finally {
                checking.current = false;
            }
        };

        void check();
        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") void check();
        });
        return () => {
            active = false;
            subscription.remove();
        };
    }, [credentials]);

    return null;
}
