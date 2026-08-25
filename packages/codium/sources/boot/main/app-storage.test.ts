import { describe, expect, it } from 'vitest'
import { agentRejoinHomeDir, happyHomeName } from './app-storage'

describe('Happy app storage paths', () => {
    it('uses capital Happy on macOS and Windows', () => {
        expect(happyHomeName('darwin')).toBe('Happy')
        expect(happyHomeName('win32')).toBe('Happy')
        expect(agentRejoinHomeDir('darwin', '/Users/alice')).toBe('/Users/alice/Happy')
        expect(agentRejoinHomeDir('win32', '/Users/alice')).toBe('/Users/alice/Happy')
    })

    it('uses lowercase happy on Linux', () => {
        expect(happyHomeName('linux')).toBe('happy')
        expect(agentRejoinHomeDir('linux', '/home/alice')).toBe('/home/alice/happy')
    })
})
