import { networkInterfaces } from 'node:os';

export function hasPublicIpv6(networks = networkInterfaces()): boolean {
  return Object.values(networks).flat().some((entry) => (
    entry?.family === 'IPv6' && /^[23]/.test(entry.address)
  ));
}
