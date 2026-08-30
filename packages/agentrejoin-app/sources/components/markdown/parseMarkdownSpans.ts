import type { MarkdownSpan } from "./parseMarkdown";

// Code comes first so dollar signs inside backticks remain literal.
const pattern = /(`(.*?)(?:`|$))|(\\\((.+?)\\\))|(\$(?!\s)(.*?\S)\$)|(\*\*(.*?)(?:\*\*|$))|(\*(.*?)(?:\*|$))|(\[([^\]]+)\](?:\(([^)]+)\))?)/g;

function pushTextWithAutoLinks(spans: MarkdownSpan[], text: string, styles: MarkdownSpan['styles']) {
    const urlPattern = /https?:\/\/[^\s<]+/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = urlPattern.exec(text)) !== null) {
        const plainText = text.slice(lastIndex, match.index);
        if (plainText) {
            spans.push({ styles, text: plainText, url: null });
        }

        let url = match[0];
        let trailing = '';
        while (/[),.;:!?]$/.test(url)) {
            trailing = url.slice(-1) + trailing;
            url = url.slice(0, -1);
        }

        if (url) {
            spans.push({ styles, text: url, url });
        }
        if (trailing) {
            spans.push({ styles, text: trailing, url: null });
        }

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        spans.push({ styles, text: text.slice(lastIndex), url: null });
    }
}

export function parseMarkdownSpans(markdown: string, header: boolean) {
    const spans: MarkdownSpan[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    pattern.lastIndex = 0;

    while ((match = pattern.exec(markdown)) !== null) {
        // Capture the text between the end of the last match and the start of this match as plain text
        const plainText = markdown.slice(lastIndex, match.index);
        if (plainText) {
            pushTextWithAutoLinks(spans, plainText, []);
        }

        if (match[1]) {
            // Inline code
            spans.push({ styles: ['code'], text: match[2], url: null });
        } else if (match[3] || match[5]) {
            // Inline math: \(...\) or $...$
            spans.push({ styles: [], text: match[4] || match[6], url: null, math: true });
        } else if (match[7]) {
            // Bold
            if (header) {
                pushTextWithAutoLinks(spans, match[8], []);
            } else {
                pushTextWithAutoLinks(spans, match[8], ['bold']);
            }
        } else if (match[9]) {
            // Italic
            if (header) {
                pushTextWithAutoLinks(spans, match[10], []);
            } else {
                pushTextWithAutoLinks(spans, match[10], ['italic']);
            }
        } else if (match[11]) {
            // Link - handle incomplete links (no URL part)
            if (match[13]) {
                spans.push({ styles: [], text: match[12], url: match[13] });
            } else {
                // If no URL part, treat as plain text with brackets
                pushTextWithAutoLinks(spans, `[${match[12]}]`, []);
            }
        }

        lastIndex = pattern.lastIndex;
    }

    // If there's any text remaining after the last match, treat it as plain
    if (lastIndex < markdown.length) {
        pushTextWithAutoLinks(spans, markdown.slice(lastIndex), []);
    }

    return spans;
}
