import { describe, expect, it } from 'vitest';
import { decodeWebPairingKeyPair, encodeWebPairingKeyPair } from './webPairing';

describe('Web pairing payload', () => {
    it('round-trips the ephemeral keypair and rejects malformed links', () => {
        const keypair = {
            publicKey: new Uint8Array(32).fill(1),
            secretKey: new Uint8Array(32).fill(2),
        };

        expect(decodeWebPairingKeyPair(encodeWebPairingKeyPair(keypair))).toEqual(keypair);
        expect(() => decodeWebPairingKeyPair('v1.bad')).toThrow('Invalid pairing link');
    });
});
