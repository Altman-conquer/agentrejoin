import React from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Typography } from '@/constants/Typography';
import { useNavigateToSession } from '@/hooks/useNavigateToSession';
import { Modal } from '@/modal';
import { sync } from '@/sync/sync';
import { useAllMachines } from '@/sync/storage';
import type { Machine } from '@/sync/storageTypes';
import {
    listClaudeSessions,
    listCodexThreads,
    listGeminiSessions,
    machineSpawnNewSession,
    type ClaudeSessionSummary,
    type CodexThreadSummary,
    type GeminiSessionSummary,
} from '@/sync/ops';
import { t } from '@/text';
import { isMachineOnline } from '@/utils/machineUtils';
import { formatLastSeen, formatPathRelativeToHome } from '@/utils/sessionUtils';

type Provider = 'codex' | 'claude' | 'gemini';

type Conversation = {
    id: string;
    provider: Provider;
    title: string;
    cwd: string;
    cwdExists: boolean;
    updatedAt: number;
    archived?: boolean;
};

const PROVIDERS: Array<{ id: Provider; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { id: 'codex', label: 'Codex', icon: 'code-slash-outline' },
    { id: 'claude', label: 'Claude Code', icon: 'sparkles-outline' },
    { id: 'gemini', label: 'Gemini', icon: 'diamond-outline' },
];

function machineName(machine: Machine): string {
    return machine.metadata?.displayName || machine.metadata?.host || machine.id.slice(0, 8);
}

function codexConversation(thread: CodexThreadSummary): Conversation {
    return {
        id: thread.id,
        provider: 'codex',
        title: thread.name?.trim() || thread.preview.trim().replace(/\s+/g, ' ') || thread.id,
        cwd: thread.cwd,
        cwdExists: thread.cwdExists,
        updatedAt: thread.updatedAt,
        archived: thread.archived,
    };
}

function claudeConversation(session: ClaudeSessionSummary): Conversation {
    return {
        id: session.id,
        provider: 'claude',
        title: session.preview.trim().replace(/\s+/g, ' ') || session.id,
        cwd: session.cwd,
        cwdExists: session.cwdExists,
        updatedAt: session.updatedAt,
    };
}

function geminiConversation(session: GeminiSessionSummary): Conversation {
    return {
        id: session.id,
        provider: 'gemini',
        title: session.preview.trim().replace(/\s+/g, ' ') || session.id,
        cwd: session.cwd,
        cwdExists: session.cwdExists,
        updatedAt: session.updatedAt,
    };
}

function ExistingConversationsScreen() {
    const { theme } = useUnistyles();
    const router = useRouter();
    const navigateToSession = useNavigateToSession();
    const machines = useAllMachines({ includeOffline: true });
    const [selectedMachineId, setSelectedMachineId] = React.useState<string | null>(null);
    const [provider, setProvider] = React.useState<Provider>('codex');
    const [conversations, setConversations] = React.useState<Conversation[]>([]);
    const [search, setSearch] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [loadingMore, setLoadingMore] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [reloadToken, setReloadToken] = React.useState(0);
    const [resumingId, setResumingId] = React.useState<string | null>(null);
    const refreshRequestedRef = React.useRef(false);
    const listScopeRef = React.useRef('');
    const fullLoadRequestedRef = React.useRef('');

    const sortedMachines = React.useMemo(() => [...machines].sort((a, b) => (
        Number(isMachineOnline(b)) - Number(isMachineOnline(a))
    )), [machines]);

    React.useEffect(() => {
        if (selectedMachineId && sortedMachines.some((machine) => machine.id === selectedMachineId)) return;
        setSelectedMachineId(sortedMachines[0]?.id ?? null);
    }, [selectedMachineId, sortedMachines]);

    const selectedMachine = React.useMemo(
        () => sortedMachines.find((machine) => machine.id === selectedMachineId) ?? null,
        [selectedMachineId, sortedMachines],
    );
    const selectedMachineOnline = !!selectedMachine && isMachineOnline(selectedMachine);

    React.useEffect(() => {
        const availability = selectedMachine?.metadata?.cliAvailability;
        if (!availability || availability[provider]) return;
        const available = PROVIDERS.find((item) => availability[item.id]);
        if (available) setProvider(available.id);
    }, [provider, selectedMachine]);

    React.useEffect(() => {
        let cancelled = false;
        const scope = `${selectedMachine?.id ?? ''}:${provider}:${reloadToken}`;
        const refresh = refreshRequestedRef.current;
        refreshRequestedRef.current = false;
        listScopeRef.current = scope;
        fullLoadRequestedRef.current = '';
        setSearch('');
        setConversations([]);
        setError(null);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);

        if (!selectedMachineOnline || !selectedMachine) return;
        setLoading(true);
        void (provider === 'codex'
            ? listCodexThreads(selectedMachine.id, { refresh }).then((result) => ({
                items: result.threads.map(codexConversation),
                hasMore: result.hasMore,
            }))
            : (provider === 'claude' ? listClaudeSessions(selectedMachine.id) : listGeminiSessions(selectedMachine.id)).then((items) => ({
                items: provider === 'claude'
                    ? (items as ClaudeSessionSummary[]).map(claudeConversation)
                    : (items as GeminiSessionSummary[]).map(geminiConversation),
                hasMore: false,
            }))
        ).then((result) => {
            if (!cancelled) {
                setConversations(result.items);
                setHasMore(result.hasMore);
            }
        }).catch((loadError) => {
            if (!cancelled) {
                setError(loadError instanceof Error ? loadError.message : t('errors.operationFailed'));
            }
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });

        return () => { cancelled = true; };
    }, [provider, reloadToken, selectedMachine?.id, selectedMachineOnline]);

    const refreshList = React.useCallback(() => {
        refreshRequestedRef.current = true;
        setReloadToken((value) => value + 1);
    }, []);

    const loadAllCodexThreads = React.useCallback(async () => {
        if (provider !== 'codex' || !selectedMachineOnline || !selectedMachine || loading || loadingMore || !hasMore) {
            return;
        }

        const scope = listScopeRef.current;
        setLoadingMore(true);
        try {
            const result = await listCodexThreads(selectedMachine.id, { all: true });
            if (listScopeRef.current !== scope) return;
            setConversations(result.threads.map(codexConversation));
            setHasMore(result.hasMore);
        } catch (loadError) {
            if (listScopeRef.current === scope) {
                Modal.alert(
                    t('common.error'),
                    loadError instanceof Error ? loadError.message : t('errors.operationFailed'),
                );
            }
        } finally {
            if (listScopeRef.current === scope) setLoadingMore(false);
        }
    }, [hasMore, loading, loadingMore, provider, selectedMachine, selectedMachineOnline]);

    React.useEffect(() => {
        if (!search.trim() || provider !== 'codex' || !hasMore || loading || loadingMore) return;
        const scope = listScopeRef.current;
        if (fullLoadRequestedRef.current === scope) return;
        fullLoadRequestedRef.current = scope;
        void loadAllCodexThreads();
    }, [hasMore, loadAllCodexThreads, loading, loadingMore, provider, search]);

    const filteredConversations = React.useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return conversations;
        return conversations.filter((conversation) => (
            conversation.title.toLowerCase().includes(query)
            || conversation.cwd.toLowerCase().includes(query)
        ));
    }, [conversations, search]);

    const resume = React.useCallback(async (conversation: Conversation) => {
        if (!selectedMachine || !isMachineOnline(selectedMachine) || resumingId) return;

        const directory = conversation.cwdExists
            ? conversation.cwd
            : selectedMachine.metadata?.homeDir ?? conversation.cwd;
        setResumingId(conversation.id);
        try {
            const result = await machineSpawnNewSession({
                machineId: selectedMachine.id,
                directory,
                agent: conversation.provider,
                ...(conversation.provider === 'codex'
                    ? { resumeCodexThreadId: conversation.id }
                    : conversation.provider === 'claude'
                        ? { resumeClaudeSessionId: conversation.id }
                        : { resumeGeminiSessionId: conversation.id }),
            });
            if (result.type === 'success') {
                await sync.refreshSessions();
                router.back();
                navigateToSession(result.sessionId);
                return;
            }
            Modal.alert(
                t('common.error'),
                result.type === 'error' ? result.errorMessage : t('errors.fileNotFound'),
            );
        } catch (resumeError) {
            Modal.alert(
                t('common.error'),
                resumeError instanceof Error ? resumeError.message : t('errors.operationFailed'),
            );
        } finally {
            setResumingId(null);
        }
    }, [navigateToSession, resumingId, router, selectedMachine]);

    const providerAvailability = selectedMachine?.metadata?.cliAvailability;
    const listHeader = (
        <View style={styles.headerContent}>
            <Text style={styles.sectionLabel}>{t('settings.machines')}</Text>
            <View style={styles.machineList}>
                {sortedMachines.map((machine) => {
                    const online = isMachineOnline(machine);
                    const selected = machine.id === selectedMachineId;
                    return (
                        <Pressable
                            key={machine.id}
                            onPress={() => setSelectedMachineId(machine.id)}
                            style={({ pressed }) => [
                                styles.machineButton,
                                selected && styles.machineButtonSelected,
                                pressed && styles.pressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{ selected, disabled: !online }}
                        >
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: online ? theme.colors.status.connected : theme.colors.status.disconnected },
                            ]} />
                            <Text
                                numberOfLines={1}
                                style={[styles.machineText, !online && styles.mutedText]}
                            >
                                {machineName(machine)}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <View style={styles.providerControl}>
                {PROVIDERS.map((item) => {
                    const selected = provider === item.id;
                    const available = providerAvailability?.[item.id] !== false;
                    return (
                        <Pressable
                            key={item.id}
                            disabled={!available}
                            onPress={() => setProvider(item.id)}
                            style={({ pressed }) => [
                                styles.providerButton,
                                selected && styles.providerButtonSelected,
                                !available && styles.disabled,
                                pressed && styles.pressed,
                            ]}
                            accessibilityRole="tab"
                            accessibilityState={{ selected, disabled: !available }}
                        >
                            <Ionicons
                                name={item.icon}
                                size={17}
                                color={selected ? theme.colors.text : theme.colors.textSecondary}
                            />
                            <Text style={[styles.providerText, selected && styles.providerTextSelected]}>
                                {item.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder={t('tools.names.search')}
                    placeholderTextColor={theme.colors.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.searchInput}
                />
                <Pressable
                    onPress={refreshList}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.retry')}
                >
                    <Ionicons name="refresh" size={19} color={theme.colors.textSecondary} />
                </Pressable>
            </View>
        </View>
    );

    if (sortedMachines.length === 0) {
        return (
            <View style={styles.centered}>
                <Ionicons name="server-outline" size={44} color={theme.colors.textSecondary} />
                <Text style={styles.emptyText}>{t('agentInput.noMachinesAvailable')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={filteredConversations}
                keyExtractor={(item) => `${item.provider}:${item.id}`}
                ListHeaderComponent={listHeader}
                ListEmptyComponent={(
                    <View style={styles.centeredList}>
                        {loading || loadingMore ? (
                            <ActivityIndicator color={theme.colors.textSecondary} />
                        ) : error ? (
                            <>
                                <Ionicons name="warning-outline" size={30} color={theme.colors.status.error} />
                                <Text style={styles.errorText}>{error}</Text>
                                <Pressable onPress={refreshList}>
                                    <Text style={styles.retryText}>{t('common.retry')}</Text>
                                </Pressable>
                            </>
                        ) : !selectedMachineOnline ? (
                            <Text style={styles.emptyText}>{t('status.offline')}</Text>
                        ) : (
                            <Text style={styles.emptyText}>{t('sessionHistory.empty')}</Text>
                        )}
                    </View>
                )}
                ListFooterComponent={filteredConversations.length > 0 && provider === 'codex' && (hasMore || loadingMore) ? (
                    <View style={styles.listFooter}>
                        {loadingMore ? (
                            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                        ) : (
                            <Pressable
                                onPress={() => {
                                    fullLoadRequestedRef.current = listScopeRef.current;
                                    void loadAllCodexThreads();
                                }}
                                style={({ pressed }) => [styles.loadMoreButton, pressed && styles.pressed]}
                                accessibilityRole="button"
                            >
                                <Text style={styles.loadMoreText}>{t('sessionHistory.viewAll')}</Text>
                            </Pressable>
                        )}
                    </View>
                ) : null}
                renderItem={({ item }) => {
                    const active = resumingId === item.id;
                    return (
                        <Pressable
                            onPress={() => { void resume(item); }}
                            disabled={!!resumingId}
                            style={({ pressed }) => [styles.conversationRow, pressed && styles.rowPressed]}
                            accessibilityRole="button"
                        >
                            <View style={styles.providerIcon}>
                                <Ionicons
                                    name={PROVIDERS.find((providerItem) => providerItem.id === item.provider)?.icon ?? 'chatbubble-outline'}
                                    size={19}
                                    color={theme.colors.textSecondary}
                                />
                            </View>
                            <View style={styles.conversationBody}>
                                <Text style={styles.conversationTitle} numberOfLines={2}>{item.title}</Text>
                                <View style={styles.conversationMeta}>
                                    <Text style={styles.metaText} numberOfLines={1}>
                                        {formatPathRelativeToHome(item.cwd, selectedMachine?.metadata?.homeDir)}
                                    </Text>
                                    <Text style={styles.metaText}>·</Text>
                                    <Text style={styles.metaText}>{formatLastSeen(item.updatedAt)}</Text>
                                    {!item.cwdExists && (
                                        <Ionicons name="folder-open-outline" size={13} color={theme.colors.status.error} />
                                    )}
                                    {item.archived && (
                                        <Ionicons name="archive-outline" size={13} color={theme.colors.textSecondary} />
                                    )}
                                </View>
                            </View>
                            {active ? (
                                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                            ) : (
                                <Ionicons name="chevron-forward" size={18} color={theme.colors.groupped.chevron} />
                            )}
                        </Pressable>
                    );
                }}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
            />
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    listContent: {
        width: '100%',
        maxWidth: 820,
        alignSelf: 'center',
        paddingHorizontal: Platform.OS === 'web' ? 24 : 16,
        paddingTop: 18,
        paddingBottom: 48,
    },
    headerContent: {
        gap: 14,
        paddingBottom: 14,
    },
    sectionLabel: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        ...Typography.default('semiBold'),
    },
    machineList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    machineButton: {
        maxWidth: 220,
        minHeight: 38,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
    },
    machineButtonSelected: {
        borderColor: theme.colors.textSecondary,
        backgroundColor: theme.colors.surfaceHigh,
    },
    machineText: {
        flexShrink: 1,
        color: theme.colors.text,
        fontSize: 14,
        ...Typography.default('semiBold'),
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    providerControl: {
        minHeight: 44,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignSelf: 'flex-start',
        padding: 3,
        gap: 2,
        borderRadius: 8,
        backgroundColor: theme.colors.surfaceHigh,
    },
    providerButton: {
        minHeight: 38,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingHorizontal: 14,
        borderRadius: 6,
    },
    providerButtonSelected: {
        backgroundColor: theme.colors.surface,
        ...Platform.select({ web: { boxShadow: '0 1px 3px rgba(0,0,0,0.12)' } as any, default: {} }),
    },
    providerText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        ...Typography.default('semiBold'),
    },
    providerTextSelected: {
        color: theme.colors.text,
    },
    searchBox: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 13,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
    },
    searchInput: {
        flex: 1,
        minWidth: 0,
        paddingVertical: 0,
        color: theme.colors.text,
        fontSize: 15,
        ...Typography.default(),
        outlineStyle: 'none',
    } as any,
    conversationRow: {
        minHeight: 78,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        paddingHorizontal: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
    },
    rowPressed: {
        backgroundColor: theme.colors.surfacePressed,
    },
    providerIcon: {
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 7,
        backgroundColor: theme.colors.surfaceHigh,
    },
    conversationBody: {
        flex: 1,
        minWidth: 0,
        gap: 6,
    },
    conversationTitle: {
        color: theme.colors.text,
        fontSize: 15,
        lineHeight: 20,
        ...Typography.default('semiBold'),
    },
    conversationMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        minWidth: 0,
    },
    metaText: {
        flexShrink: 1,
        color: theme.colors.textSecondary,
        fontSize: 12,
        ...Typography.default(),
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 24,
        backgroundColor: theme.colors.groupped.background,
    },
    centeredList: {
        minHeight: 240,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
    },
    listFooter: {
        minHeight: 64,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 16,
    },
    loadMoreButton: {
        minHeight: 40,
        justifyContent: 'center',
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
    },
    loadMoreText: {
        color: theme.colors.text,
        fontSize: 14,
        ...Typography.default('semiBold'),
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontSize: 15,
        textAlign: 'center',
        ...Typography.default(),
    },
    errorText: {
        maxWidth: 520,
        color: theme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        ...Typography.default(),
    },
    retryText: {
        color: theme.colors.button.primary.background,
        fontSize: 14,
        ...Typography.default('semiBold'),
    },
    mutedText: {
        color: theme.colors.textSecondary,
    },
    disabled: {
        opacity: 0.4,
    },
    pressed: {
        opacity: 0.7,
    },
}));

export default React.memo(ExistingConversationsScreen);
