import { describe, expect, it } from 'vitest';

import { codexThreadDisplayTitle, codexThreadName, provisionalCodexThreadTitle } from './threadTitle';

describe('Codex thread titles', () => {
    it('uses the Codex-generated name ahead of the preview', () => {
        expect(codexThreadDisplayTitle({ name: '  Fix resume history  ', preview: 'old preview' })).toBe('Fix resume history');
    });

    it('uses a compact preview when Codex has not generated a name', () => {
        expect(codexThreadDisplayTitle({ name: null, preview: ' inspect\n  the logs ' })).toBe('inspect the logs');
        expect(codexThreadName({ name: null })).toBeNull();
    });

    it('builds a bounded temporary title from the first user message', () => {
        expect(provisionalCodexThreadTitle('  Investigate\nthis issue  ')).toBe('Investigate this issue');
        expect(provisionalCodexThreadTitle('')).toBeNull();
        expect(provisionalCodexThreadTitle('x'.repeat(100))).toHaveLength(96);
    });
});
