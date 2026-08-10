import { delimiter, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createGlobalCodexEnvironment, withoutPackageBinEntries } from './globalCodexEnvironment';

describe('global Codex environment', () => {
    it('removes package bin directories while preserving global PATH entries', () => {
        const packageBin = join('/workspace', 'node_modules', '.bin');
        const nestedPackageBin = join('/workspace', 'packages', 'app', 'node_modules', '.bin');
        const globalBin = join('/home', 'user', '.local', 'bin');
        const systemBin = join('/usr', 'bin');

        expect(withoutPackageBinEntries(
            [packageBin, globalBin, nestedPackageBin, systemBin].join(delimiter),
        )).toBe([globalBin, systemBin].join(delimiter));
    });

    it('recognizes Windows package bin entries', () => {
        expect(withoutPackageBinEntries(
            'C:\\repo\\node_modules\\.bin;C:\\Users\\me\\AppData\\Roaming\\npm;C:\\Windows',
            ';',
        )).toBe('C:\\Users\\me\\AppData\\Roaming\\npm;C:\\Windows');
    });

    it('returns a copy without changing the source environment', () => {
        const packageBin = join('/workspace', 'node_modules', '.bin');
        const globalBin = join('/global', 'bin');
        const source = {
            PATH: [packageBin, globalBin].join(delimiter),
            CODEX_HOME: '/custom/codex',
        };

        const result = createGlobalCodexEnvironment(source);

        expect(result).toEqual({
            PATH: globalBin,
            CODEX_HOME: '/custom/codex',
        });
        expect(source.PATH).toBe([packageBin, globalBin].join(delimiter));
    });
});
