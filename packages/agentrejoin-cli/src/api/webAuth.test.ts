import { describe, expect, it, vi } from 'vitest';

vi.mock('@/configuration', () => ({
    configuration: { webappUrl: 'https://agentrejoin.zhandj.com/app' },
}));

import { generateWebAuthUrl } from './webAuth';

describe('generateWebAuthUrl', () => {
    it('builds the connection route from the web app origin', () => {
        expect(generateWebAuthUrl(Uint8Array.from([1, 2, 3])))
            .toBe('https://agentrejoin.zhandj.com/terminal/connect#key=AQID');
    });
});
