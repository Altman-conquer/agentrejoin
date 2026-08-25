import { describe, it, expect, afterEach } from 'vitest';
import { resolveAgyBin } from './constants';

describe('resolveAgyBin', () => {
  const orig = process.env.AGENTREJOIN_AGY_PATH;
  afterEach(() => {
    if (orig === undefined) {
      delete process.env.AGENTREJOIN_AGY_PATH;
    } else {
      process.env.AGENTREJOIN_AGY_PATH = orig;
    }
  });

  it('uses AGENTREJOIN_AGY_PATH when it points at an existing file', () => {
    // node's own binary is guaranteed to exist on every platform
    process.env.AGENTREJOIN_AGY_PATH = process.execPath;
    expect(resolveAgyBin()).toBe(process.execPath);
  });

  it('ignores AGENTREJOIN_AGY_PATH when the target does not exist', () => {
    process.env.AGENTREJOIN_AGY_PATH = '/nonexistent/path/to/agy-should-not-resolve';
    expect(resolveAgyBin()).not.toBe('/nonexistent/path/to/agy-should-not-resolve');
  });
});
