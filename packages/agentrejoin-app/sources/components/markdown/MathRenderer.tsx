import * as React from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import katex from 'katex';
import { useUnistyles } from 'react-native-unistyles';
import type { MarkdownSpan } from './parseMarkdown';
import { isHttpMarkdownLink } from './linkUtils';
import { openExternalUrl } from '@/utils/openExternalUrl';

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function renderFormula(formula: string, displayMode: boolean): string {
    return katex.renderToString(formula, {
        displayMode,
        output: 'mathml',
        strict: 'ignore',
        throwOnError: false,
        trust: false,
    });
}

function spansToHtml(spans: MarkdownSpan[]): string {
    return spans.map((span) => {
        if (span.math) {
            return renderFormula(span.text, false);
        }

        let content = escapeHtml(span.text);
        if (span.styles.includes('code')) content = `<code>${content}</code>`;
        if (span.styles.includes('italic')) content = `<em>${content}</em>`;
        if (span.styles.includes('bold') || span.styles.includes('semibold')) content = `<strong>${content}</strong>`;
        if (span.url && isHttpMarkdownLink(span.url)) {
            content = `<a href="${escapeHtml(span.url)}" target="_blank" rel="noopener noreferrer">${content}</a>`;
        }
        return content;
    }).join('');
}

export const MathRenderer = React.memo((props: {
    formula?: string;
    spans?: MarkdownSpan[];
    displayMode?: boolean;
    fontSize?: number;
    lineHeight?: number;
    fontWeight?: string;
    containerStyle?: StyleProp<ViewStyle>;
}) => {
    const { theme } = useUnistyles();
    const [height, setHeight] = React.useState(props.displayMode ? 52 : (props.lineHeight ?? 25) + 4);
    const content = React.useMemo(
        () => props.formula !== undefined
            ? renderFormula(props.formula, props.displayMode ?? true)
            : spansToHtml(props.spans ?? []),
        [props.displayMode, props.formula, props.spans],
    );
    const fontSize = props.fontSize ?? 16;
    const lineHeight = props.lineHeight ?? 25;
    const fontWeight = props.fontWeight ?? '400';

    if (Platform.OS === 'web') {
        return (
            <View style={props.containerStyle}>
                <div
                    style={{
                        color: theme.colors.text,
                        fontFamily: 'system-ui, sans-serif',
                        fontSize,
                        lineHeight: `${lineHeight}px`,
                        fontWeight,
                        overflowX: props.displayMode ? 'auto' : 'visible',
                        whiteSpace: 'pre-wrap',
                    }}
                    dangerouslySetInnerHTML={{ __html: content }}
                />
            </View>
        );
    }

    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>
html,body{margin:0;padding:0;background:transparent;color:${theme.colors.text};font-family:system-ui,sans-serif;font-size:${fontSize}px;line-height:${lineHeight}px;font-weight:${fontWeight};overflow-x:${props.displayMode ? 'auto' : 'hidden'};white-space:pre-wrap}body{min-height:1px}math[display="block"]{margin:8px 0}code{font-family:monospace}a{color:inherit;text-decoration:underline}
</style></head><body>${content}<script>function h(){window.ReactNativeWebView.postMessage(String(Math.ceil(document.documentElement.scrollHeight)))}requestAnimationFrame(h);setTimeout(h,100)</script></body></html>`;

    return (
        <View style={[{ width: '100%', height }, props.containerStyle]}>
            <WebView
                originWhitelist={['about:blank']}
                source={{ html }}
                style={{ flex: 1, backgroundColor: 'transparent' }}
                scrollEnabled={Boolean(props.displayMode)}
                showsHorizontalScrollIndicator={Boolean(props.displayMode)}
                onMessage={(event) => {
                    const nextHeight = Number(event.nativeEvent.data);
                    if (Number.isFinite(nextHeight) && nextHeight > 0) setHeight(nextHeight);
                }}
                onShouldStartLoadWithRequest={(request) => {
                    if (request.url === 'about:blank') return true;
                    if (isHttpMarkdownLink(request.url)) void openExternalUrl(request.url);
                    return false;
                }}
            />
        </View>
    );
});
