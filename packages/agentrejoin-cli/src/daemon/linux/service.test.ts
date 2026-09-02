import { describe, expect, it } from 'vitest';

import { buildSystemdUnit } from './service';

describe('buildSystemdUnit', () => {
  it('runs the daemon in foreground and leaves child sessions outside daemon shutdown', () => {
    const unit = buildSystemdUnit({
      nodePath: '/opt/node with space/bin/node',
      scriptPath: '/opt/agentrejoin/bin/agentrejoin.mjs',
      homeDir: '/home/user',
      pathValue: '/opt/node/bin:/usr/bin',
      agentRejoinHomeDir: '/data/agentrejoin',
    });

    expect(unit).toContain('ExecStart="/opt/node with space/bin/node" "/opt/agentrejoin/bin/agentrejoin.mjs" daemon foreground');
    expect(unit).toContain('Restart=on-failure');
    expect(unit).toContain('KillMode=process');
    expect(unit).toContain('Environment="AGENTREJOIN_HOME_DIR=/data/agentrejoin"');
  });
});
