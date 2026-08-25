import { authAccountApprove } from '@/auth/authAccountApprove';
import { generateAuthKeyPair, authQRStart } from '@/auth/authQRStart';
import { WEB_PAIRING_TTL_MS, encodeWebPairingKeyPair } from '@/auth/webPairing';
import { useAuth } from '@/auth/AuthContext';
import { RoundButton } from '@/components/RoundButton';
import { QRCode } from '@/components/qr/QRCode';
import { Typography } from '@/constants/Typography';
import { decodeBase64 } from '@/encryption/base64';
import { encryptBox } from '@/encryption/libsodium';
import { getServerUrl } from '@/sync/serverConfig';
import { getCurrentLanguage, t } from '@/text';
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
        paddingVertical: 32,
    },
    title: { fontSize: 24, color: theme.colors.text, textAlign: 'center', ...Typography.default('semiBold') },
    description: {
        maxWidth: 520,
        marginTop: 12,
        color: theme.colors.textSecondary,
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        ...Typography.default(),
    },
    qr: { marginVertical: 28, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 8 },
    status: { minHeight: 304, alignItems: 'center', justifyContent: 'center' },
    note: { marginTop: 18, color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', ...Typography.default() },
    button: { width: '100%', maxWidth: 280, marginTop: 24 },
}));

function copy() {
    return getCurrentLanguage().startsWith('zh') ? {
        title: '用手机加入当前账号',
        description: '请使用手机系统自带的相机或扫码功能扫描。无需安装 AgentRejoin App，扫码后会直接在手机浏览器中打开。',
        note: '二维码 5 分钟后过期，并且只能使用一次。',
        error: '无法生成配对二维码，请重试。',
        expired: '二维码已过期，请生成一个新的二维码。',
        regenerate: '生成新二维码',
    } : {
        title: 'Join this account on your phone',
        description: "Scan with your phone's built-in Camera or QR scanner. No AgentRejoin app is required; the link opens directly in your mobile browser.",
        note: 'This QR code expires in 5 minutes and can only be used once.',
        error: 'Could not create a pairing QR code. Please try again.',
        expired: 'This QR code has expired. Generate a new one.',
        regenerate: 'Generate new QR code',
    };
}

export default function WebPairingQr() {
    const auth = useAuth();
    const { theme } = useUnistyles();
    const text = copy();
    const [generation, setGeneration] = React.useState(0);
    const [pairUrl, setPairUrl] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [expired, setExpired] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        let expiryTimer: ReturnType<typeof setTimeout> | undefined;

        const createPairing = async () => {
            setPairUrl(null);
            setError(null);
            setExpired(false);

            if (Platform.OS !== 'web' || !auth.credentials) {
                setError(text.error);
                return;
            }

            try {
                const keypair = generateAuthKeyPair();
                if (!await authQRStart(keypair)) {
                    throw new Error('Failed to create pairing request');
                }

                const encryptedSecret = encryptBox(
                    decodeBase64(auth.credentials.secret, 'base64url'),
                    keypair.publicKey,
                );
                await authAccountApprove(auth.credentials.token, keypair.publicKey, encryptedSecret);

                if (!cancelled) {
                    const relay = encodeURIComponent(getServerUrl());
                    setPairUrl(`${window.location.origin}/pair?relay=${relay}#${encodeWebPairingKeyPair(keypair)}`);
                    expiryTimer = setTimeout(() => setExpired(true), WEB_PAIRING_TTL_MS);
                }
            } catch (cause) {
                console.error('Failed to create Web pairing invitation:', cause);
                if (!cancelled) setError(text.error);
            }
        };

        void createPairing();
        return () => {
            cancelled = true;
            if (expiryTimer) clearTimeout(expiryTimer);
        };
    }, [auth.credentials, generation, text.error]);

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <Text style={styles.title}>{text.title}</Text>
            <Text style={styles.description}>{text.description}</Text>

            {!pairUrl && !error && <View style={styles.status}><ActivityIndicator color={theme.colors.text} /></View>}
            {pairUrl && !expired && <View style={styles.qr}><QRCode data={pairUrl} size={280} /></View>}
            {(error || expired) && (
                <View style={styles.status}>
                    <Text style={styles.description}>{error || text.expired}</Text>
                    <View style={styles.button}>
                        <RoundButton title={text.regenerate} onPress={() => setGeneration(value => value + 1)} />
                    </View>
                </View>
            )}

            {pairUrl && !expired && <Text style={styles.note}>{text.note}</Text>}
        </ScrollView>
    );
}
