import React from 'react';
import { ActivityIndicator, Pressable, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/constants/Typography';
import { Session } from '@/sync/storageTypes';
import { useSessionStatus, formatPathRelativeToHome } from '@/utils/sessionUtils';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { t } from '@/text';
import { codexTakeoverThread, machineSpawnNewSession } from '@/sync/ops';
import { sync } from '@/sync/sync';
import { Modal } from '@/modal';
import { useNavigateToSession } from '@/hooks/useNavigateToSession';

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 48,
    },
    iconContainer: {
        marginBottom: 12,
    },
    hostText: {
        fontSize: 18,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 4,
        ...Typography.default('semiBold'),
    },
    pathText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 40,
        ...Typography.default('regular'),
    },
    noMessagesText: {
        fontSize: 20,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 8,
        ...Typography.default('regular'),
    },
    createdText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        ...Typography.default(),
    },
    retryButton: {
        minHeight: 44,
        marginTop: 24,
        paddingHorizontal: 20,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.button.primary.background,
    },
    retryButtonText: {
        color: theme.colors.button.primary.tint,
        fontSize: 15,
        ...Typography.default('semiBold'),
    },
}));

interface EmptyMessagesProps {
    session: Session;
}

function getOSIcon(os?: string): keyof typeof Ionicons.glyphMap {
    if (!os) return 'hardware-chip-outline';
    
    const osLower = os.toLowerCase();
    if (osLower.includes('darwin') || osLower.includes('mac')) {
        return 'laptop-outline';
    } else if (osLower.includes('win')) {
        return 'desktop-outline';
    } else if (osLower.includes('linux')) {
        return 'terminal-outline';
    }
    return 'hardware-chip-outline';
}

function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 1) {
        return t('time.justNow');
    } else if (diffMinutes < 60) {
        return t('time.minutesAgo', { count: diffMinutes });
    } else if (diffHours < 24) {
        return t('time.hoursAgo', { count: diffHours });
    } else {
        return t('sessionHistory.daysAgo', { count: diffDays });
    }
}

export function EmptyMessages({ session }: EmptyMessagesProps) {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const osIcon = getOSIcon(session.metadata?.os);
    const sessionStatus = useSessionStatus(session);
    const startedTime = formatRelativeTime(session.createdAt);
    const resumeStatus = session.metadata?.resumeStatus;
    const resumeFailed = resumeStatus === 'active-writer' || resumeStatus === 'failed';
    const resumeThreadId = session.metadata?.resumeCodexThreadId ?? session.metadata?.codexThreadId;
    const navigateToSession = useNavigateToSession();
    const [retrying, setRetrying] = React.useState(false);

    const resumeConversation = React.useCallback(async (takeover: boolean) => {
        const machineId = session.metadata?.machineId;
        const directory = session.metadata?.path;
        if (!machineId || !directory || !resumeThreadId || retrying) return;

        if (takeover) {
            const confirmed = await Modal.confirm(
                t('session.resumeTakeover'),
                t('session.resumeTakeoverConfirm'),
                { confirmText: t('session.resumeTakeover'), destructive: true },
            );
            if (!confirmed) return;
        }

        setRetrying(true);
        try {
            if (takeover) await codexTakeoverThread(machineId, resumeThreadId);
            const result = await machineSpawnNewSession({
                machineId,
                directory,
                agent: 'codex',
                resumeCodexThreadId: resumeThreadId,
            });
            if (result.type === 'success') {
                await sync.refreshSessions();
                navigateToSession(result.sessionId);
                return;
            }
            Modal.alert(
                t('common.error'),
                result.type === 'error' ? result.errorMessage : t('errors.fileNotFound'),
            );
        } catch (error) {
            Modal.alert(
                t('common.error'),
                error instanceof Error ? error.message : t('errors.operationFailed'),
            );
        } finally {
            setRetrying(false);
        }
    }, [navigateToSession, resumeThreadId, retrying, session.metadata?.machineId, session.metadata?.path]);
    
    return (
        <View style={styles.container}>
            {resumeStatus === 'loading' ? (
                <ActivityIndicator
                    size="large"
                    color={theme.colors.textSecondary}
                    style={styles.iconContainer}
                />
            ) : (
                <Ionicons
                    name={resumeFailed ? 'alert-circle-outline' : osIcon}
                    size={72}
                    color={resumeFailed ? theme.colors.status.error : theme.colors.textSecondary}
                    style={styles.iconContainer}
                />
            )}
            
            {session.metadata?.host && (
                <Text style={styles.hostText}>
                    {session.metadata.host}
                </Text>
            )}
            
            {session.metadata?.path && (
                <Text style={styles.pathText}>
                    {formatPathRelativeToHome(session.metadata.path, session.metadata.homeDir)}
                </Text>
            )}
            
            <Text style={styles.noMessagesText}>
                {resumeStatus === 'loading'
                    ? t('session.resumeLoading')
                    : resumeFailed
                        ? t('session.resumeFailed')
                        : 'No messages yet'}
            </Text>

            <Text style={styles.createdText}>
                {resumeStatus === 'loading'
                    ? t('session.resumeLoadingDescription')
                    : resumeStatus === 'active-writer'
                        ? t('session.resumeActiveWriter')
                        : resumeStatus === 'failed'
                            ? t('session.resumeFailedDescription')
                            : `Created ${startedTime}`}
            </Text>

            {resumeFailed && resumeThreadId && session.metadata?.machineId && (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={resumeStatus === 'active-writer'
                        ? t('session.resumeTakeover')
                        : t('session.resumeRetry')}
                    accessibilityState={{ disabled: retrying, busy: retrying }}
                    disabled={retrying}
                    onPress={() => resumeConversation(resumeStatus === 'active-writer')}
                    style={({ pressed }) => [
                        styles.retryButton,
                        resumeStatus === 'active-writer' && { backgroundColor: theme.colors.status.error },
                        { opacity: retrying ? 0.6 : pressed ? 0.8 : 1 },
                    ]}
                >
                    {retrying ? (
                        <ActivityIndicator size="small" color={theme.colors.button.primary.tint} />
                    ) : (
                        <Ionicons
                            name={resumeStatus === 'active-writer' ? 'stop-circle-outline' : 'refresh-outline'}
                            size={18}
                            color={theme.colors.button.primary.tint}
                        />
                    )}
                    <Text style={styles.retryButtonText}>
                        {resumeStatus === 'active-writer'
                            ? t('session.resumeTakeover')
                            : t('session.resumeRetry')}
                    </Text>
                </Pressable>
            )}
        </View>
    );
}
