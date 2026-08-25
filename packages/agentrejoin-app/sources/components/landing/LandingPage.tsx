import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { usePathname, useRouter } from 'expo-router';
import * as React from 'react';
import {
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';

type Locale = 'en' | 'zh';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const GITHUB_URL = 'https://github.com/Altman-conquer/agentrejoin';

const copy = {
    en: {
        nav: ['Features', 'How it works', 'Security'],
        openApp: 'Open app',
        eyebrow: 'CLAUDE CODE · CODEX · GEMINI · OPENCLAW · ACP',
        product: 'AgentRejoin',
        headline: 'Rejoin your coding-agent sessions from anywhere.',
        subheadline: 'Find conversations already running on your servers, resume their original context, and keep working from web or mobile.',
        primary: 'Open AgentRejoin',
        github: 'View on GitHub',
        proof: ['Open source', 'End-to-end encrypted', 'Self-hostable'],
        resumeEyebrow: 'RESUME, DON\'T RESTART',
        resumeTitle: 'Your agent already knows the codebase. Keep that context.',
        resumeBody: 'AgentRejoin discovers existing conversations on connected servers and brings the same history, working directory, and agent state to the device in your hand.',
        features: [
            ['Search what already exists', 'Browse recent Claude Code and Codex conversations across every connected machine.'],
            ['Restore the original session', 'Resume the real agent thread instead of copying messages into a blank chat.'],
            ['Continue from any screen', 'Read progress, reply, and handle tool approvals from desktop or phone.'],
        ],
        mobileEyebrow: 'BUILT FOR THE HANDOFF',
        mobileTitle: 'Leave the desk. Keep the agent moving.',
        mobileBody: 'Check a long-running refactor on your phone, answer a question, approve the next step, and return to the same session on your computer later.',
        mobilePoints: ['Conversation-first mobile UI', 'Live status and permission requests', 'One account across your devices'],
        workflowEyebrow: 'THREE STEPS',
        workflowTitle: 'Your existing agents, connected.',
        workflow: [
            ['01', 'Connect a server', 'Run the AgentRejoin daemon on the machine where Claude Code or Codex stores its sessions.'],
            ['02', 'Find a conversation', 'The daemon indexes supported local sessions and makes the encrypted list available to your account.'],
            ['03', 'Rejoin and continue', 'Open any conversation from web or mobile and resume it with its original context.'],
        ],
        agentsTitle: 'Made for the agents you already use.',
        agentsBody: 'Resume existing Claude Code and Codex sessions, or start and control Gemini, OpenClaw, Antigravity, and other ACP-compatible agents.',
        securityEyebrow: 'PRIVATE BY DESIGN',
        securityTitle: 'The relay moves encrypted data. It cannot read your work.',
        securityBody: 'Your account key stays on your devices. Messages are encrypted before synchronization, and the server daemon only exposes sessions linked to your account.',
        securityItems: [
            ['End-to-end encryption', 'Conversation content is encrypted before it reaches the relay.'],
            ['Device-bound access', 'New devices join through an explicit account pairing flow.'],
            ['Self-hosted option', 'Run the relay and web app on infrastructure you control.'],
        ],
        openEyebrow: 'OPEN SOURCE',
        openTitle: 'Use the hosted service or run the whole stack yourself.',
        openBody: 'The web app, mobile client, server daemon, relay, and protocol live in one public repository.',
        finalTitle: 'The session is still there.',
        finalBody: 'Rejoin it from wherever you are.',
        footer: 'Open-source remote continuity for coding agents.',
        preview: {
            sessions: 'Sessions',
            allMachines: 'All machines',
            active: 'Active now',
            resume: 'Rejoined',
            agent: 'Codex · api-server',
            path: '~/projects/api-server',
            user: 'Continue the authentication refactor and run the focused tests.',
            agentReply: 'I restored the original thread and working directory. The refresh-token race is fixed; I am running the focused tests now.',
            result: '12 tests passed',
            input: 'Reply to Codex…',
        },
    },
    zh: {
        nav: ['产品能力', '工作方式', '安全'],
        openApp: '打开应用',
        eyebrow: 'CLAUDE CODE · CODEX · GEMINI · OPENCLAW · ACP',
        product: 'AgentRejoin',
        headline: '随时回到服务器上的 Agent 对话。',
        subheadline: '自动发现服务器上已有的对话，恢复原始上下文，再从网页或手机继续和 Agent 协作。',
        primary: '打开 AgentRejoin',
        github: '在 GitHub 查看',
        proof: ['开源', '端到端加密', '支持自托管'],
        resumeEyebrow: '恢复，而不是重来',
        resumeTitle: 'Agent 已经理解了代码库，不要丢掉这些上下文。',
        resumeBody: 'AgentRejoin 会发现已连接服务器上的现有对话，并把同一份历史记录、工作目录和 Agent 状态带到你手边的设备。',
        features: [
            ['搜索已有对话', '统一浏览每台已连接服务器上的 Claude Code 与 Codex 历史会话。'],
            ['恢复原始会话', '真正恢复原 Agent 线程，而不是把旧消息复制进一个空白聊天。'],
            ['在任意设备继续', '用电脑或手机查看进度、回复消息，并处理工具授权请求。'],
        ],
        mobileEyebrow: '为跨设备接力而设计',
        mobileTitle: '离开电脑，Agent 仍然继续。',
        mobileBody: '在手机上检查长时间运行的重构任务，回答问题、批准下一步，之后回到电脑仍是同一个会话。',
        mobilePoints: ['以对话为核心的手机界面', '实时状态与授权请求', '一个账号连接所有设备'],
        workflowEyebrow: '只需三步',
        workflowTitle: '连接你已经在使用的 Agent。',
        workflow: [
            ['01', '连接服务器', '在保存 Claude Code 或 Codex 会话的服务器上运行 AgentRejoin daemon。'],
            ['02', '找到已有对话', 'daemon 索引受支持的本地会话，并向你的账号提供加密后的会话列表。'],
            ['03', '恢复并继续', '从网页或手机打开任意对话，带着原始上下文继续工作。'],
        ],
        agentsTitle: '为你已经在用的 Agent 而生。',
        agentsBody: '恢复已有的 Claude Code 与 Codex 会话，也可以启动并控制 Gemini、OpenClaw、Antigravity 和其他兼容 ACP 的 Agent。',
        securityEyebrow: '隐私优先',
        securityTitle: 'Relay 只转发加密数据，无法读取你的工作内容。',
        securityBody: '账号密钥只保存在你的设备上。消息会在同步前完成加密，服务器 daemon 也只暴露已绑定到你账号的会话。',
        securityItems: [
            ['端到端加密', '对话内容在到达 Relay 之前就已完成加密。'],
            ['设备绑定访问', '新设备必须通过明确的账号配对流程加入。'],
            ['支持自托管', '可以在你控制的基础设施上运行 Relay 和 Web 应用。'],
        ],
        openEyebrow: '完全开源',
        openTitle: '使用托管服务，或者自行运行完整服务栈。',
        openBody: 'Web、移动客户端、服务器 daemon、Relay 和协议代码都位于同一个公开仓库。',
        finalTitle: '那个会话还在那里。',
        finalBody: '现在，从任何地方回到它。',
        footer: '为 Coding Agent 提供开源的跨设备会话连续性。',
        preview: {
            sessions: '对话',
            allMachines: '所有服务器',
            active: '正在运行',
            resume: '已恢复',
            agent: 'Codex · api-server',
            path: '~/projects/api-server',
            user: '继续完成鉴权重构，并运行相关测试。',
            agentReply: '已恢复原始线程和工作目录。刷新令牌的竞态问题已经修复，我正在运行相关测试。',
            result: '12 项测试通过',
            input: '回复 Codex…',
        },
    },
} as const;

function initialLocale(): Locale {
    if (typeof window === 'undefined') return 'en';
    const saved = window.localStorage.getItem('agentrejoin-site-locale');
    if (saved === 'en' || saved === 'zh') return saved;
    return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function LandingPage() {
    const router = useRouter();
    const pathname = usePathname();
    const { width, height } = useWindowDimensions();
    const mobile = width < 720;
    const compact = width < 980;
    const shortViewport = height < 800;
    const previewHeight = Math.max(170, Math.min(400, height - 547));
    const [locale, setLocale] = React.useState<Locale>(initialLocale);
    const text = copy[locale];

    React.useEffect(() => {
        window.localStorage.setItem('agentrejoin-site-locale', locale);
        if (pathname !== '/') {
            document.title = 'AgentRejoin';
            return;
        }
        document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
        const title = locale === 'zh'
            ? 'AgentRejoin - 从网页或手机恢复 Coding Agent 对话'
            : 'AgentRejoin - Resume coding-agent sessions from anywhere';
        const description = locale === 'zh'
            ? '发现并恢复服务器上的 Claude Code 与 Codex 对话，也可以从网页或手机控制 Gemini、OpenClaw、Antigravity 和兼容 ACP 的 Agent。'
            : 'Resume Claude Code and Codex conversations on your servers, and control Gemini, OpenClaw, Antigravity, and ACP-compatible agents from web or mobile.';
        document.title = title;
        document.querySelector('meta[name="description"]')?.setAttribute('content', description);
        document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
        document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
        return () => {
            document.title = 'AgentRejoin';
        };
    }, [locale, pathname]);

    const openApp = React.useCallback(() => router.push('/app'), [router]);
    const scrollTo = React.useCallback((id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.page}
            showsVerticalScrollIndicator
            stickyHeaderIndices={[0]}
        >
            <View style={styles.navShell}>
                <View style={[styles.nav, mobile && styles.navMobile]}>
                    <Image
                        source={require('@/assets/images/logotype-dark.png')}
                        contentFit="contain"
                        style={[styles.logotype, mobile && styles.logotypeMobile]}
                        accessibilityLabel="AgentRejoin"
                    />
                    {!compact && (
                        <View style={styles.navLinks}>
                            {[
                                ['features', text.nav[0]],
                                ['workflow', text.nav[1]],
                                ['security', text.nav[2]],
                            ].map(([id, label]) => (
                                <Pressable key={id} onPress={() => scrollTo(id)} hitSlop={8}>
                                    <Text style={styles.navLink}>{label}</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                    <View style={styles.navActions}>
                        <View style={styles.languageToggle} accessibilityRole="radiogroup">
                            {(['en', 'zh'] as const).map((item) => (
                                <Pressable
                                    key={item}
                                    onPress={() => setLocale(item)}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: locale === item }}
                                    style={[styles.languageOption, locale === item && styles.languageOptionActive]}
                                >
                                    <Text style={[styles.languageText, locale === item && styles.languageTextActive]}>
                                        {item === 'en' ? 'EN' : '中'}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        <Pressable
                            onPress={openApp}
                            accessibilityRole="button"
                            accessibilityLabel={text.openApp}
                            style={({ pressed }) => [styles.navButton, pressed && styles.buttonPressed]}
                        >
                            {!mobile && <Text style={styles.navButtonText}>{text.openApp}</Text>}
                            <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                        </Pressable>
                    </View>
                </View>
            </View>

            <View style={styles.hero}>
                <View style={styles.container}>
                    <View style={styles.heroCopy}>
                        <Text style={styles.eyebrow}>{text.eyebrow}</Text>
                        <Text accessibilityRole="header" style={[styles.productName, mobile && styles.productNameMobile]}>
                            {text.product}
                        </Text>
                        <Text style={[styles.headline, mobile && styles.headlineMobile]}>{text.headline}</Text>
                        <Text style={[styles.heroBody, mobile && styles.heroBodyMobile]}>{text.subheadline}</Text>
                        <View style={[styles.heroActions, mobile && styles.heroActionsMobile]}>
                            <Pressable
                                onPress={openApp}
                                style={({ pressed }) => [styles.primaryButton, mobile && styles.fullButton, pressed && styles.buttonPressed]}
                            >
                                <Text style={styles.primaryButtonText}>{text.primary}</Text>
                                <Ionicons name="arrow-forward" size={19} color="#111318" />
                            </Pressable>
                            <Pressable
                                onPress={() => Linking.openURL(GITHUB_URL)}
                                style={({ pressed }) => [styles.secondaryButton, mobile && styles.fullButton, pressed && styles.secondaryButtonPressed]}
                            >
                                <Ionicons name="logo-github" size={19} color="#111318" />
                                <Text style={styles.secondaryButtonText}>{text.github}</Text>
                            </Pressable>
                        </View>
                        <View style={[styles.proofRow, mobile && styles.proofRowMobile]}>
                            {text.proof.map((item) => (
                                <View key={item} style={styles.proofItem}>
                                    <Ionicons name="checkmark-circle" size={17} color="#168A4C" />
                                    <Text style={styles.proofText}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                    <ProductPreview mobile={compact} short={shortViewport} previewHeight={previewHeight} text={text.preview} />
                </View>
            </View>

            <View nativeID="features" style={styles.darkSection}>
                <View style={styles.container}>
                    <Text style={styles.eyebrowGreen}>{text.resumeEyebrow}</Text>
                    <Text accessibilityRole="header" style={[styles.darkTitle, mobile && styles.sectionTitleMobile]}>{text.resumeTitle}</Text>
                    <Text style={styles.darkBody}>{text.resumeBody}</Text>
                    <View style={[styles.featureGrid, compact && styles.stack]}>
                        {text.features.map((feature, index) => (
                            <View key={feature[0]} style={[styles.feature, compact && styles.featureStacked]}>
                                <View style={styles.featureIcon}>
                                    <Ionicons name={(['search', 'refresh', 'phone-portrait-outline'] as IconName[])[index]} size={22} color="#4ADE80" />
                                </View>
                                <Text style={styles.featureTitle}>{feature[0]}</Text>
                                <Text style={styles.featureBody}>{feature[1]}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            <View style={styles.mobileSection}>
                <View style={[styles.split, compact && styles.stack]}>
                    <View style={styles.splitCopy}>
                        <Text style={styles.eyebrow}>{text.mobileEyebrow}</Text>
                        <Text accessibilityRole="header" style={[styles.sectionTitle, mobile && styles.sectionTitleMobile]}>{text.mobileTitle}</Text>
                        <Text style={styles.sectionBody}>{text.mobileBody}</Text>
                        <View style={styles.checkList}>
                            {text.mobilePoints.map((item) => (
                                <View key={item} style={styles.checkRow}>
                                    <Ionicons name="checkmark" size={18} color="#168A4C" />
                                    <Text style={styles.checkText}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                    <View style={styles.phoneStage}>
                        <PhonePreview text={text.preview} />
                    </View>
                </View>
            </View>

            <View nativeID="workflow" style={styles.workflowSection}>
                <View style={styles.container}>
                    <Text style={styles.eyebrow}>{text.workflowEyebrow}</Text>
                    <Text accessibilityRole="header" style={[styles.sectionTitle, mobile && styles.sectionTitleMobile]}>{text.workflowTitle}</Text>
                    <View style={styles.workflowList}>
                        {text.workflow.map((step, index) => (
                            <View key={step[0]} style={[styles.workflowRow, compact && styles.workflowRowStacked]}>
                                <Text style={styles.workflowNumber}>{step[0]}</Text>
                                <View style={styles.workflowIcon}>
                                    <Ionicons name={(['server-outline', 'search-outline', 'chatbubbles-outline'] as IconName[])[index]} size={22} color="#111318" />
                                </View>
                                <Text style={styles.workflowName}>{step[1]}</Text>
                                <Text style={styles.workflowBody}>{step[2]}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            <View style={styles.agentsSection}>
                <View style={[styles.agentsInner, compact && styles.stack]}>
                    <View style={styles.agentLogos}>
                        <View style={styles.agentLogoBox}>
                            <Image source={require('@/assets/images/icon-claude.png')} contentFit="contain" style={styles.agentLogo} />
                        </View>
                        <View style={styles.connector} />
                        <View style={styles.brandLogoBox}>
                            <Image source={require('@/assets/images/logo-black.png')} contentFit="contain" style={styles.brandLogo} />
                        </View>
                        <View style={styles.connector} />
                        <View style={styles.agentLogoBox}>
                            <Image source={require('@/assets/images/icon-gpt.png')} contentFit="contain" style={styles.agentLogo} />
                        </View>
                    </View>
                    <View style={styles.agentsCopy}>
                        <Text accessibilityRole="header" style={styles.agentsTitle}>{text.agentsTitle}</Text>
                        <Text style={styles.agentsBody}>{text.agentsBody}</Text>
                    </View>
                </View>
            </View>

            <View nativeID="security" style={styles.securitySection}>
                <View style={styles.container}>
                    <Text style={styles.eyebrowGreen}>{text.securityEyebrow}</Text>
                    <Text accessibilityRole="header" style={[styles.darkTitle, mobile && styles.sectionTitleMobile]}>{text.securityTitle}</Text>
                    <Text style={styles.darkBody}>{text.securityBody}</Text>
                    <View style={[styles.securityFlow, compact && styles.securityFlowStacked]}>
                        <FlowNode icon="phone-portrait-outline" label={locale === 'zh' ? '你的设备' : 'Your device'} />
                        <FlowLine compact={compact} />
                        <FlowNode icon="swap-horizontal-outline" label="Encrypted relay" accent />
                        <FlowLine compact={compact} />
                        <FlowNode icon="server-outline" label={locale === 'zh' ? '服务器 daemon' : 'Server daemon'} />
                        <FlowLine compact={compact} />
                        <FlowNode icon="terminal-outline" label={locale === 'zh' ? 'Coding Agent CLI' : 'Coding agent CLI'} />
                    </View>
                    <View style={[styles.securityGrid, compact && styles.stack]}>
                        {text.securityItems.map((item, index) => (
                            <View key={item[0]} style={styles.securityItem}>
                                <Ionicons name={(['lock-closed-outline', 'key-outline', 'cloud-outline'] as IconName[])[index]} size={23} color="#4ADE80" />
                                <Text style={styles.securityItemTitle}>{item[0]}</Text>
                                <Text style={styles.securityItemBody}>{item[1]}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            <View style={styles.openSection}>
                <View style={[styles.openInner, compact && styles.stack]}>
                    <View style={styles.openCopy}>
                        <Text style={styles.eyebrow}>{text.openEyebrow}</Text>
                        <Text accessibilityRole="header" style={[styles.sectionTitle, mobile && styles.sectionTitleMobile]}>{text.openTitle}</Text>
                        <Text style={styles.sectionBody}>{text.openBody}</Text>
                    </View>
                    <Pressable
                        onPress={() => Linking.openURL(GITHUB_URL)}
                        style={({ pressed }) => [styles.repoButton, pressed && styles.buttonPressed]}
                    >
                        <Ionicons name="logo-github" size={25} color="#FFFFFF" />
                        <View>
                            <Text style={styles.repoLabel}>Altman-conquer / agentrejoin</Text>
                            <Text style={styles.repoSubLabel}>{locale === 'zh' ? '查看源代码' : 'Explore the source'}</Text>
                        </View>
                        <Ionicons name="arrow-forward" size={19} color="#4ADE80" />
                    </Pressable>
                </View>
            </View>

            <View style={styles.finalSection}>
                <View style={styles.finalInner}>
                    <Image source={require('@/assets/images/logo-black.png')} contentFit="contain" style={styles.finalLogo} />
                    <Text accessibilityRole="header" style={[styles.finalTitle, mobile && styles.finalTitleMobile]}>{text.finalTitle}</Text>
                    <Text style={styles.finalBody}>{text.finalBody}</Text>
                    <Pressable
                        onPress={openApp}
                        style={({ pressed }) => [styles.finalButton, pressed && styles.buttonPressed]}
                    >
                        <Text style={styles.finalButtonText}>{text.primary}</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </Pressable>
                </View>
            </View>

            <View style={[styles.footer, mobile && styles.footerMobile]}>
                <Image source={require('@/assets/images/logotype-light.png')} contentFit="contain" style={styles.footerLogo} />
                <Text style={styles.footerText}>{text.footer}</Text>
                <Pressable onPress={() => Linking.openURL(GITHUB_URL)} hitSlop={10} accessibilityLabel="GitHub">
                    <Ionicons name="logo-github" size={22} color="#A8ADB7" />
                </Pressable>
            </View>
        </ScrollView>
    );
}

function ProductPreview({ mobile, short, previewHeight, text }: { mobile: boolean; short: boolean; previewHeight: number; text: typeof copy.en.preview | typeof copy.zh.preview }) {
    if (mobile) {
        return <View style={[styles.heroPhone, short && styles.heroPhoneShort]}><PhonePreview text={text} /></View>;
    }

    const sessions = [
        ['Authentication refactor', 'Codex', '#4ADE80'],
        ['Billing webhook review', 'Claude Code', '#F59E0B'],
        ['Dashboard accessibility', 'Codex', '#60A5FA'],
        ['API migration plan', 'Claude Code', '#A78BFA'],
    ];

    return (
        <View style={[styles.previewFrame, { height: previewHeight }]} accessibilityLabel="AgentRejoin session interface">
            <View style={styles.previewCanvas}>
            <View style={styles.previewTopbar}>
                <View style={styles.previewBrand}>
                    <Image source={require('@/assets/images/logo-white.png')} contentFit="contain" style={styles.previewBrandIcon} />
                    <Text style={styles.previewBrandText}>AgentRejoin</Text>
                </View>
                <View style={styles.onlineBadge}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>{text.active}</Text>
                </View>
            </View>
            <View style={styles.previewBody}>
                <View style={styles.previewSidebar}>
                    <View style={styles.sidebarHeadingRow}>
                        <Text style={styles.sidebarHeading}>{text.sessions}</Text>
                        <Ionicons name="search-outline" size={16} color="#727784" />
                    </View>
                    <View style={styles.machineRow}>
                        <Ionicons name="server-outline" size={14} color="#4ADE80" />
                        <Text style={styles.machineText}>{text.allMachines}</Text>
                    </View>
                    {sessions.map((session, index) => (
                        <View key={session[0]} style={[styles.sessionRow, index === 0 && styles.sessionRowActive]}>
                            <View style={[styles.sessionAvatar, { backgroundColor: session[2] }]}>
                                <Text style={styles.sessionAvatarText}>{session[1].slice(0, 1)}</Text>
                            </View>
                            <View style={styles.sessionCopy}>
                                <Text numberOfLines={1} style={[styles.sessionName, index === 0 && styles.sessionNameActive]}>{session[0]}</Text>
                                <Text style={styles.sessionMeta}>{session[1]} · {index === 0 ? 'now' : `${index + 2}h`}</Text>
                            </View>
                        </View>
                    ))}
                </View>
                <View style={styles.previewChat}>
                    <View style={styles.chatHeader}>
                        <View>
                            <Text style={styles.chatTitle}>{text.agent}</Text>
                            <Text style={styles.chatPath}>{text.path}</Text>
                        </View>
                        <View style={styles.rejoinedBadge}>
                            <Ionicons name="return-down-back" size={13} color="#168A4C" />
                            <Text style={styles.rejoinedText}>{text.resume}</Text>
                        </View>
                    </View>
                    <View style={styles.chatMessages}>
                        <View style={styles.userBubble}>
                            <Text style={styles.userBubbleText}>{text.user}</Text>
                        </View>
                        <View style={styles.agentMessage}>
                            <View style={styles.codexMark}><Text style={styles.codexMarkText}>C</Text></View>
                            <View style={styles.agentMessageCopy}>
                                <Text style={styles.agentMessageText}>{text.agentReply}</Text>
                                <View style={styles.codeResult}>
                                    <Text style={styles.codeLineMuted}>auth/refreshToken.ts</Text>
                                    <Text style={styles.codeLine}>+ await refreshLock.run(userId, rotateToken)</Text>
                                    <View style={styles.testResult}>
                                        <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
                                        <Text style={styles.testResultText}>{text.result}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                    <View style={styles.composer}>
                        <Text style={styles.composerText}>{text.input}</Text>
                        <View style={styles.sendButton}><Ionicons name="arrow-up" size={15} color="#111318" /></View>
                    </View>
                </View>
            </View>
            </View>
        </View>
    );
}

function PhonePreview({ text }: { text: typeof copy.en.preview | typeof copy.zh.preview }) {
    return (
        <View style={styles.phone} accessibilityLabel="AgentRejoin mobile conversation">
            <View style={styles.phoneSpeaker} />
            <View style={styles.phoneHeader}>
                <Ionicons name="chevron-back" size={18} color="#111318" />
                <View style={styles.phoneHeaderCopy}>
                    <Text style={styles.phoneTitle}>Authentication refactor</Text>
                    <Text style={styles.phoneStatus}>Codex · {text.resume}</Text>
                </View>
                <Ionicons name="ellipsis-horizontal" size={18} color="#111318" />
            </View>
            <View style={styles.phoneMessages}>
                <View style={styles.phoneUserBubble}><Text style={styles.phoneUserText}>{text.user}</Text></View>
                <View style={styles.phoneAgentRow}>
                    <View style={styles.phoneAgentMark}><Text style={styles.phoneAgentMarkText}>C</Text></View>
                    <Text style={styles.phoneAgentText}>{text.agentReply}</Text>
                </View>
                <View style={styles.phoneResult}>
                    <Ionicons name="checkmark-circle" size={15} color="#168A4C" />
                    <Text style={styles.phoneResultText}>{text.result}</Text>
                </View>
            </View>
            <View style={styles.phoneComposer}>
                <Text style={styles.phoneComposerText}>{text.input}</Text>
                <View style={styles.phoneSend}><Ionicons name="arrow-up" size={14} color="#111318" /></View>
            </View>
        </View>
    );
}

function FlowNode({ icon, label, accent }: { icon: IconName; label: string; accent?: boolean }) {
    return (
        <View style={[styles.flowNode, accent && styles.flowNodeAccent]}>
            <Ionicons name={icon} size={21} color={accent ? '#111318' : '#FFFFFF'} />
            <Text style={[styles.flowNodeText, accent && styles.flowNodeTextAccent]}>{label}</Text>
        </View>
    );
}

function FlowLine({ compact }: { compact: boolean }) {
    return (
        <View style={[styles.flowLine, compact && styles.flowLineVertical]}>
            <View style={[styles.flowLineRule, compact && styles.flowLineRuleVertical]} />
            <Ionicons name="lock-closed" size={13} color="#4ADE80" />
        </View>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: '#F7F8F5' },
    page: { flexGrow: 1, backgroundColor: '#F7F8F5' },
    container: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 24, boxSizing: 'border-box' },
    navShell: { backgroundColor: 'rgba(247,248,245,0.96)', borderBottomWidth: 1, borderBottomColor: '#E2E4DF', zIndex: 20 },
    nav: { width: '100%', maxWidth: 1228, height: 72, alignSelf: 'center', paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' },
    navMobile: { height: 64, paddingHorizontal: 16 },
    logotype: { width: 164, height: 44 },
    logotypeMobile: { width: 138, height: 38 },
    navLinks: { flexDirection: 'row', alignItems: 'center', gap: 30 },
    navLink: { color: '#4E535D', fontSize: 14, fontFamily: 'IBMPlexSans-SemiBold' },
    navActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    languageToggle: { height: 34, padding: 3, flexDirection: 'row', backgroundColor: '#E8EAE5', borderRadius: 6 },
    languageOption: { minWidth: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
    languageOptionActive: { backgroundColor: '#FFFFFF' },
    languageText: { color: '#727784', fontSize: 12, fontFamily: 'IBMPlexSans-SemiBold' },
    languageTextActive: { color: '#111318' },
    navButton: { height: 38, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 6, backgroundColor: '#111318' },
    navButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'IBMPlexSans-SemiBold' },
    hero: { paddingTop: 46, paddingBottom: 8, backgroundColor: '#F7F8F5' },
    heroCopy: { alignItems: 'center', maxWidth: 900, alignSelf: 'center' },
    eyebrow: { color: '#168A4C', fontSize: 12, lineHeight: 18, fontFamily: 'IBMPlexMono-SemiBold' },
    eyebrowGreen: { color: '#4ADE80', fontSize: 12, lineHeight: 18, fontFamily: 'IBMPlexMono-SemiBold' },
    productName: { marginTop: 15, color: '#111318', fontSize: 76, lineHeight: 80, textAlign: 'center', fontFamily: 'BricolageGrotesque-Bold' },
    productNameMobile: { fontSize: 50, lineHeight: 56 },
    headline: { marginTop: 5, color: '#111318', fontSize: 37, lineHeight: 46, textAlign: 'center', fontFamily: 'IBMPlexSans-SemiBold' },
    headlineMobile: { fontSize: 27, lineHeight: 35 },
    heroBody: { marginTop: 19, maxWidth: 720, color: '#5D626C', fontSize: 19, lineHeight: 29, textAlign: 'center', fontFamily: 'IBMPlexSans-Regular' },
    heroBodyMobile: { fontSize: 17, lineHeight: 26 },
    heroActions: { marginTop: 30, flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroActionsMobile: { width: '100%', flexDirection: 'column' },
    primaryButton: { height: 50, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 6, backgroundColor: '#4ADE80' },
    primaryButtonText: { color: '#111318', fontSize: 16, fontFamily: 'IBMPlexSans-SemiBold' },
    secondaryButton: { height: 50, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 6, borderWidth: 1, borderColor: '#C9CDC6', backgroundColor: '#FFFFFF' },
    secondaryButtonPressed: { backgroundColor: '#ECEEE9' },
    secondaryButtonText: { color: '#111318', fontSize: 16, fontFamily: 'IBMPlexSans-SemiBold' },
    fullButton: { width: '100%' },
    buttonPressed: { opacity: 0.78 },
    proofRow: { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
    proofRowMobile: { flexWrap: 'wrap', rowGap: 9 },
    proofItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    proofText: { color: '#5D626C', fontSize: 13, fontFamily: 'IBMPlexSans-Regular' },
    previewFrame: { marginTop: 36, borderRadius: 8, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#22252D', shadowColor: '#111318', shadowOpacity: 0.2, shadowRadius: 30, shadowOffset: { width: 0, height: 20 } },
    previewCanvas: { height: 400, backgroundColor: '#FFFFFF' },
    previewTopbar: { height: 54, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111318' },
    previewBrand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    previewBrandIcon: { width: 23, height: 23 },
    previewBrandText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'IBMPlexSans-SemiBold' },
    onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
    onlineText: { color: '#B9BEC7', fontSize: 12, fontFamily: 'IBMPlexSans-Regular' },
    previewBody: { flex: 1, flexDirection: 'row' },
    previewSidebar: { width: 320, padding: 16, backgroundColor: '#F1F2EF', borderRightWidth: 1, borderRightColor: '#DEE1DC' },
    sidebarHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sidebarHeading: { color: '#111318', fontSize: 13, fontFamily: 'IBMPlexSans-SemiBold' },
    machineRow: { height: 31, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 4, backgroundColor: '#E5E8E2', marginBottom: 9 },
    machineText: { color: '#484D57', fontSize: 12, fontFamily: 'IBMPlexSans-SemiBold' },
    sessionRow: { minHeight: 52, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 5, marginBottom: 4 },
    sessionRowActive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D8DCD5' },
    sessionAvatar: { width: 31, height: 31, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
    sessionAvatarText: { color: '#111318', fontSize: 13, fontFamily: 'IBMPlexMono-SemiBold' },
    sessionCopy: { flex: 1, minWidth: 0 },
    sessionName: { color: '#5A5F69', fontSize: 12, fontFamily: 'IBMPlexSans-Regular' },
    sessionNameActive: { color: '#111318', fontFamily: 'IBMPlexSans-SemiBold' },
    sessionMeta: { marginTop: 3, color: '#8B9099', fontSize: 10, fontFamily: 'IBMPlexSans-Regular' },
    previewChat: { flex: 1, backgroundColor: '#FFFFFF' },
    chatHeader: { minHeight: 66, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E5E7E2' },
    chatTitle: { color: '#111318', fontSize: 14, fontFamily: 'IBMPlexSans-SemiBold' },
    chatPath: { marginTop: 3, color: '#858A93', fontSize: 11, fontFamily: 'IBMPlexMono-Regular' },
    rejoinedBadge: { paddingVertical: 5, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 4, backgroundColor: '#E3F8E9' },
    rejoinedText: { color: '#168A4C', fontSize: 10, fontFamily: 'IBMPlexSans-SemiBold' },
    chatMessages: { flex: 1, paddingHorizontal: 25, paddingTop: 22 },
    userBubble: { maxWidth: '74%', alignSelf: 'flex-end', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#E9EBE7' },
    userBubbleText: { color: '#22252D', fontSize: 12, lineHeight: 18, fontFamily: 'IBMPlexSans-Regular' },
    agentMessage: { marginTop: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    codexMark: { width: 27, height: 27, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111318' },
    codexMarkText: { color: '#4ADE80', fontSize: 12, fontFamily: 'IBMPlexMono-SemiBold' },
    agentMessageCopy: { flex: 1, maxWidth: 640 },
    agentMessageText: { color: '#343842', fontSize: 12, lineHeight: 18, fontFamily: 'IBMPlexSans-Regular' },
    codeResult: { marginTop: 12, padding: 12, borderRadius: 5, backgroundColor: '#171A20' },
    codeLineMuted: { color: '#777E8A', fontSize: 10, lineHeight: 16, fontFamily: 'IBMPlexMono-Regular' },
    codeLine: { color: '#A7F3C0', fontSize: 10, lineHeight: 18, fontFamily: 'IBMPlexMono-Regular' },
    testResult: { marginTop: 7, paddingTop: 7, flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: '#2F343D' },
    testResultText: { color: '#CFD3DA', fontSize: 10, fontFamily: 'IBMPlexSans-SemiBold' },
    composer: { height: 48, marginHorizontal: 22, marginBottom: 10, paddingLeft: 15, paddingRight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#D7DAD4', borderRadius: 6 },
    composerText: { color: '#A2A6AD', fontSize: 12, fontFamily: 'IBMPlexSans-Regular' },
    sendButton: { width: 31, height: 31, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4ADE80' },
    heroPhone: { height: 190, marginTop: 44, alignItems: 'center', overflow: 'hidden' },
    heroPhoneShort: { height: 130 },
    darkSection: { paddingVertical: 104, backgroundColor: '#111318' },
    darkTitle: { marginTop: 15, maxWidth: 880, color: '#FFFFFF', fontSize: 45, lineHeight: 55, fontFamily: 'BricolageGrotesque-Bold' },
    darkBody: { marginTop: 20, maxWidth: 760, color: '#A8ADB7', fontSize: 18, lineHeight: 28, fontFamily: 'IBMPlexSans-Regular' },
    featureGrid: { marginTop: 58, flexDirection: 'row', gap: 36 },
    feature: { flex: 1, minHeight: 215, paddingTop: 22, borderTopWidth: 1, borderTopColor: '#383D46' },
    featureStacked: { width: '100%', minHeight: 0, paddingBottom: 18 },
    featureIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: '#20242B' },
    featureTitle: { marginTop: 20, color: '#FFFFFF', fontSize: 19, fontFamily: 'IBMPlexSans-SemiBold' },
    featureBody: { marginTop: 10, color: '#A8ADB7', fontSize: 15, lineHeight: 23, fontFamily: 'IBMPlexSans-Regular' },
    stack: { flexDirection: 'column' },
    mobileSection: { paddingVertical: 100, backgroundColor: '#E9F7ED' },
    split: { width: '100%', maxWidth: 1080, alignSelf: 'center', paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 86, boxSizing: 'border-box' },
    splitCopy: { flex: 1 },
    sectionTitle: { marginTop: 14, maxWidth: 720, color: '#111318', fontSize: 43, lineHeight: 52, fontFamily: 'BricolageGrotesque-Bold' },
    sectionTitleMobile: { fontSize: 31, lineHeight: 39 },
    sectionBody: { marginTop: 18, maxWidth: 670, color: '#5D626C', fontSize: 17, lineHeight: 27, fontFamily: 'IBMPlexSans-Regular' },
    checkList: { marginTop: 26, gap: 12 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    checkText: { flex: 1, color: '#343842', fontSize: 15, fontFamily: 'IBMPlexSans-SemiBold' },
    phoneStage: { flex: 1, minHeight: 600, alignItems: 'center', justifyContent: 'center' },
    phone: { width: 310, height: 590, paddingTop: 19, overflow: 'hidden', borderRadius: 36, borderWidth: 8, borderColor: '#111318', backgroundColor: '#FFFFFF', shadowColor: '#111318', shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 18 } },
    phoneSpeaker: { position: 'absolute', top: 8, alignSelf: 'center', width: 70, height: 5, borderRadius: 3, backgroundColor: '#292C33', zIndex: 2 },
    phoneHeader: { height: 64, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E6E8E3' },
    phoneHeaderCopy: { flex: 1, alignItems: 'center', paddingHorizontal: 7 },
    phoneTitle: { color: '#111318', fontSize: 12, fontFamily: 'IBMPlexSans-SemiBold' },
    phoneStatus: { marginTop: 3, color: '#168A4C', fontSize: 9, fontFamily: 'IBMPlexSans-Regular' },
    phoneMessages: { flex: 1, padding: 14 },
    phoneUserBubble: { alignSelf: 'flex-end', maxWidth: '86%', paddingVertical: 10, paddingHorizontal: 11, borderRadius: 6, backgroundColor: '#E9EBE7' },
    phoneUserText: { color: '#343842', fontSize: 11, lineHeight: 16, fontFamily: 'IBMPlexSans-Regular' },
    phoneAgentRow: { marginTop: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    phoneAgentMark: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 5, backgroundColor: '#111318' },
    phoneAgentMarkText: { color: '#4ADE80', fontSize: 10, fontFamily: 'IBMPlexMono-SemiBold' },
    phoneAgentText: { flex: 1, color: '#343842', fontSize: 11, lineHeight: 17, fontFamily: 'IBMPlexSans-Regular' },
    phoneResult: { marginTop: 15, marginLeft: 32, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 5, backgroundColor: '#E3F8E9' },
    phoneResultText: { color: '#168A4C', fontSize: 10, fontFamily: 'IBMPlexSans-SemiBold' },
    phoneComposer: { height: 50, margin: 12, paddingLeft: 12, paddingRight: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#D7DAD4', borderRadius: 7 },
    phoneComposerText: { color: '#999DA6', fontSize: 10, fontFamily: 'IBMPlexSans-Regular' },
    phoneSend: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 5, backgroundColor: '#4ADE80' },
    workflowSection: { paddingVertical: 104, backgroundColor: '#F7F8F5' },
    workflowList: { marginTop: 48, borderTopWidth: 1, borderTopColor: '#C9CDC6' },
    workflowRow: { minHeight: 132, paddingVertical: 25, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#C9CDC6', gap: 22 },
    workflowRowStacked: { alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 },
    workflowNumber: { width: 40, color: '#168A4C', fontSize: 13, fontFamily: 'IBMPlexMono-SemiBold' },
    workflowIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: '#E3E6E0' },
    workflowName: { width: 230, color: '#111318', fontSize: 21, fontFamily: 'IBMPlexSans-SemiBold' },
    workflowBody: { flex: 1, minWidth: 220, color: '#5D626C', fontSize: 16, lineHeight: 25, fontFamily: 'IBMPlexSans-Regular' },
    agentsSection: { paddingVertical: 72, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E1E4DE' },
    agentsInner: { width: '100%', maxWidth: 1080, alignSelf: 'center', paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 70, boxSizing: 'border-box' },
    agentLogos: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    agentLogoBox: { width: 74, height: 74, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D9DDD6', backgroundColor: '#F7F8F5' },
    agentLogo: { width: 42, height: 42 },
    brandLogoBox: { width: 86, height: 86, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111318' },
    brandLogo: { width: 52, height: 52 },
    connector: { flex: 1, maxWidth: 60, height: 1, backgroundColor: '#BCC1B9' },
    agentsCopy: { flex: 1 },
    agentsTitle: { color: '#111318', fontSize: 28, lineHeight: 35, fontFamily: 'BricolageGrotesque-Bold' },
    agentsBody: { marginTop: 10, color: '#5D626C', fontSize: 16, lineHeight: 25, fontFamily: 'IBMPlexSans-Regular' },
    securitySection: { paddingVertical: 104, backgroundColor: '#111318' },
    securityFlow: { marginTop: 48, paddingVertical: 28, paddingHorizontal: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#343943' },
    securityFlowStacked: { flexDirection: 'column', paddingVertical: 24 },
    flowNode: { minWidth: 155, height: 66, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 6, borderWidth: 1, borderColor: '#3C424D', backgroundColor: '#1C2027' },
    flowNodeAccent: { borderColor: '#4ADE80', backgroundColor: '#4ADE80' },
    flowNodeText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'IBMPlexSans-SemiBold' },
    flowNodeTextAccent: { color: '#111318' },
    flowLine: { flex: 1, minWidth: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    flowLineVertical: { flex: 0, width: 30, height: 52, flexDirection: 'column' },
    flowLineRule: { flex: 1, height: 1, backgroundColor: '#4C525D' },
    flowLineRuleVertical: { width: 1, height: 36, flex: 1 },
    securityGrid: { marginTop: 45, flexDirection: 'row', gap: 36 },
    securityItem: { flex: 1, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#343943' },
    securityItemTitle: { marginTop: 14, color: '#FFFFFF', fontSize: 17, fontFamily: 'IBMPlexSans-SemiBold' },
    securityItemBody: { marginTop: 8, color: '#A8ADB7', fontSize: 14, lineHeight: 22, fontFamily: 'IBMPlexSans-Regular' },
    openSection: { paddingVertical: 92, backgroundColor: '#FFFFFF' },
    openInner: { width: '100%', maxWidth: 1080, alignSelf: 'center', paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 70, boxSizing: 'border-box' },
    openCopy: { flex: 1 },
    repoButton: { width: 345, maxWidth: '100%', minHeight: 78, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 7, backgroundColor: '#111318', boxSizing: 'border-box' },
    repoLabel: { color: '#FFFFFF', fontSize: 15, fontFamily: 'IBMPlexSans-SemiBold' },
    repoSubLabel: { marginTop: 4, color: '#9EA4AE', fontSize: 12, fontFamily: 'IBMPlexSans-Regular' },
    finalSection: { paddingVertical: 100, backgroundColor: '#4ADE80' },
    finalInner: { width: '100%', maxWidth: 800, alignSelf: 'center', paddingHorizontal: 24, alignItems: 'center', boxSizing: 'border-box' },
    finalLogo: { width: 64, height: 64 },
    finalTitle: { marginTop: 24, color: '#111318', fontSize: 53, lineHeight: 61, textAlign: 'center', fontFamily: 'BricolageGrotesque-Bold' },
    finalTitleMobile: { fontSize: 37, lineHeight: 44 },
    finalBody: { marginTop: 10, color: '#244630', fontSize: 20, textAlign: 'center', fontFamily: 'IBMPlexSans-Regular' },
    finalButton: { height: 52, marginTop: 30, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 6, backgroundColor: '#111318' },
    finalButtonText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'IBMPlexSans-SemiBold' },
    footer: { minHeight: 96, paddingHorizontal: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 24, backgroundColor: '#111318' },
    footerMobile: { paddingVertical: 26, flexDirection: 'column' },
    footerLogo: { width: 145, height: 38 },
    footerText: { flex: 1, color: '#A8ADB7', fontSize: 13, textAlign: 'center', fontFamily: 'IBMPlexSans-Regular' },
});
