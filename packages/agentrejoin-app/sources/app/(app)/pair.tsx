import { useAuth } from '@/auth/AuthContext';
import { authQRWait } from '@/auth/authQRWait';
import { decodeWebPairingKeyPair } from '@/auth/webPairing';
import { RoundButton } from '@/components/RoundButton';
import { Typography } from '@/constants/Typography';
import { encodeBase64 } from '@/encryption/base64';
import { getCurrentLanguage } from '@/text';
import { setServerUrl, validateServerUrl } from '@/sync/serverConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

const styles = StyleSheet.create((theme) => ({
    scroll: { flex: 1, backgroundColor: theme.colors.surface },
    content: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    icon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.groupped.background,
        marginBottom: 20,
    },
    title: { fontSize: 24, color: theme.colors.text, textAlign: 'center', ...Typography.default('semiBold') },
    description: {
        width: '100%',
        maxWidth: 440,
        marginTop: 12,
        color: theme.colors.textSecondary,
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        ...Typography.default(),
    },
    button: { width: '100%', maxWidth: 280, marginTop: 28 },
}));

function copy() {
    return getCurrentLanguage().startsWith('zh') ? {
        title: '正在关联这台手机',
        loading: '正在安全地加入您的 AgentRejoin 账号…',
        errorTitle: '无法加入账号',
        error: '该二维码无效、已过期或已经使用。请在电脑上生成新的二维码。',
        alreadyTitle: '此浏览器已经登录',
        already: '您已经可以在这台手机上查看当前账号的会话。',
        continue: '进入 AgentRejoin',
    } : {
        title: 'Linking this phone',
        loading: 'Securely joining your AgentRejoin account…',
        errorTitle: 'Could not join the account',
        error: 'This QR code is invalid, expired, or already used. Generate a new code on your computer.',
        alreadyTitle: 'This browser is already signed in',
        already: 'You can already view this account’s sessions on this phone.',
        continue: 'Open AgentRejoin',
    };
}

export default function AcceptWebPairing() {
    const auth = useAuth();
    const router = useRouter();
    const { theme } = useUnistyles();
    const text = copy();
    const [state, setState] = React.useState<'loading' | 'error' | 'already'>('loading');

    React.useEffect(() => {
        let cancelled = false;
        let timeout: ReturnType<typeof setTimeout> | undefined;

        const acceptPairing = async () => {
            if (Platform.OS !== 'web' || typeof window === 'undefined') {
                setState('error');
                return;
            }

            const fragment = window.location.hash.slice(1);
            const relay = new URLSearchParams(window.location.search).get('relay');
            const clearFragment = () => window.history.replaceState(
                window.history.state,
                document.title,
                window.location.pathname + window.location.search,
            );
            clearFragment();

            if (auth.isAuthenticated) {
                setState('already');
                return;
            }

            try {
                const keypair = decodeWebPairingKeyPair(fragment);
                if (!relay || !validateServerUrl(relay).valid) {
                    throw new Error('Invalid Relay URL');
                }
                setServerUrl(relay);
                timeout = setTimeout(() => {
                    if (!cancelled) setState('error');
                    cancelled = true;
                }, 15_000);

                const credentials = await authQRWait(keypair, undefined, () => cancelled);
                if (!credentials || cancelled) throw new Error('Pairing request was not authorized');

                await auth.login(credentials.token, encodeBase64(credentials.secret, 'base64url'));
                if (!cancelled) router.replace('/app');
            } catch (cause) {
                console.log('Web pairing invitation was rejected:', cause);
                if (!cancelled) setState('error');
            } finally {
                if (timeout) clearTimeout(timeout);
                clearFragment();
            }
        };

        void acceptPairing();
        return () => {
            cancelled = true;
            if (timeout) clearTimeout(timeout);
        };
    }, [auth, router]);

    const isError = state === 'error';
    const isAlready = state === 'already';

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <View style={styles.icon}>
                {state === 'loading'
                    ? <ActivityIndicator color={theme.colors.text} />
                    : <Ionicons name={isError ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={28} color={theme.colors.text} />}
            </View>
            <Text style={styles.title}>{isError ? text.errorTitle : isAlready ? text.alreadyTitle : text.title}</Text>
            <Text style={styles.description}>{isError ? text.error : isAlready ? text.already : text.loading}</Text>
            {(isError || isAlready) && (
                <View style={styles.button}>
                    <RoundButton title={text.continue} onPress={() => router.replace('/app')} />
                </View>
            )}
        </ScrollView>
    );
}
