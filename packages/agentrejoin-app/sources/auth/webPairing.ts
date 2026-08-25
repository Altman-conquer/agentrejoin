import { decodeBase64, encodeBase64 } from '@/encryption/base64';
import type { QRAuthKeyPair } from './authQRStart';

export const WEB_PAIRING_TTL_MS = 5 * 60 * 1000;

const KEY_BYTES = 32;
const VERSION = 'v1.';

export function encodeWebPairingKeyPair(keypair: QRAuthKeyPair): string {
    if (keypair.publicKey.length !== KEY_BYTES || keypair.secretKey.length !== KEY_BYTES) {
        throw new Error('Invalid pairing key length');
    }

    const packed = new Uint8Array(KEY_BYTES * 2);
    packed.set(keypair.publicKey);
    packed.set(keypair.secretKey, KEY_BYTES);
    return VERSION + encodeBase64(packed, 'base64url');
}

export function decodeWebPairingKeyPair(value: string): QRAuthKeyPair {
    if (!value.startsWith(VERSION)) {
        throw new Error('Unsupported pairing link');
    }

    const packed = decodeBase64(value.slice(VERSION.length), 'base64url');
    if (packed.length !== KEY_BYTES * 2) {
        throw new Error('Invalid pairing link');
    }

    return {
        publicKey: packed.slice(0, KEY_BYTES),
        secretKey: packed.slice(KEY_BYTES),
    };
}
