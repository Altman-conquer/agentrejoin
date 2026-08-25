#!/usr/bin/env node

/**
 * Install this workspace as the global `agentrejoin` binary for local development.
 *
 * Steps:
 *   1. build
 *   2. stop any running daemon (ignores failure)
 *   3. npm link (replaces the globally-installed `agentrejoin` with a symlink to this workspace)
 *   4. start the daemon again
 *   5. verify by running `agentrejoin --version`
 *
 * Reuses ~/.agentrejoin/ — no separate dev home dir. Auth and sessions carry over.
 * To undo: `npm unlink -g agentrejoin && npm i -g agentrejoin@latest`.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const PACKAGE_DIR = path.resolve(__dirname, '..');
const IS_WINDOWS = process.platform === 'win32';

function run(cmd, args, { allowFailure = false } = {}) {
    const label = [cmd, ...args].join(' ');
    console.log(`\n▶ ${label}`);
    const result = spawnSync(cmd, args, {
        cwd: PACKAGE_DIR,
        stdio: 'inherit',
        // shell: true resolves `.cmd` shims on Windows so `pnpm` / `npm` / `agentrejoin` are found.
        shell: IS_WINDOWS,
    });
    if (result.error) {
        console.error(`Failed to spawn: ${label}`, result.error.message);
        if (!allowFailure) process.exit(1);
        return 1;
    }
    const status = result.status ?? 1;
    if (status !== 0 && !allowFailure) {
        console.error(`\nExit ${status}: ${label}`);
        process.exit(status);
    }
    return status;
}

run('pnpm', ['run', 'build']);
run('agentrejoin', ['daemon', 'stop'], { allowFailure: true });
run('npm', ['link']);
run('agentrejoin', ['daemon', 'start']);
run('agentrejoin', ['--version']);

console.log(`\n✓ Installed from ${PACKAGE_DIR}`);
console.log('  To undo: npm unlink -g agentrejoin && npm i -g agentrejoin@latest');
