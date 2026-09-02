import { logger } from '@/ui/logger';
import { install as installMac } from './mac/install';
import { stopDaemon } from './controlClient';
import { ensureDaemonRunning } from './ensureDaemonRunning';
import { enableShellAutostart } from './shellAutostart';
import { installLinuxService, isContainerEnvironment, isSystemdAvailable } from './linux/service';

export async function install(): Promise<void> {
    if (process.platform === 'linux') {
        if (isSystemdAvailable()) {
            await stopDaemon();
            const file = await installLinuxService();
            logger.info(`Daemon systemd service installed and started: ${file}`);
            return;
        }
        if (isContainerEnvironment()) {
            const profile = await enableShellAutostart();
            await stopDaemon();
            await ensureDaemonRunning();
            logger.info(profile
                ? `Container daemon supervisor started; shell startup was added to ${profile}.`
                : 'Container daemon supervisor started. Run `agentrejoin daemon start` after a full container restart because no shell startup file is available.');
            return;
        }
        const profile = await enableShellAutostart();
        if (!profile) {
            throw new Error('systemd is unavailable and no bash/zsh profile was found. Run `agentrejoin daemon foreground` under your process supervisor.');
        }
        await stopDaemon();
        await ensureDaemonRunning();
        logger.info(`Daemon supervisor started; shell startup was added to ${profile}`);
        return;
    }

    if (process.platform !== 'darwin') {
        const profile = await enableShellAutostart();
        if (!profile) throw new Error('Use `agentrejoin daemon foreground` under your platform process supervisor.');
        logger.info(`Daemon startup was added to ${profile}`);
        return;
    }
    
    if (process.getuid && process.getuid() !== 0) {
        throw new Error('Daemon installation requires sudo privileges. Please run with sudo.');
    }
    
    logger.info('Installing AgentRejoin CLI daemon for macOS...');
    await installMac();
}
