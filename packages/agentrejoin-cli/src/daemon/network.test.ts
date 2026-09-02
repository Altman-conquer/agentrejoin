import { describe, expect, it } from 'vitest';

import { hasPublicIpv6 } from './network';

describe('hasPublicIpv6', () => {
  it('ignores loopback, link-local, and private IPv6 addresses', () => {
    const entry = (address: string) => ({ address, family: 'IPv6' as const }) as never;
    expect(hasPublicIpv6({ eth0: [entry('fd42::1'), entry('fe80::1')] })).toBe(false);
    expect(hasPublicIpv6({ eth0: [entry('2606:4700::1')] })).toBe(true);
  });
});
