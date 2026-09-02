import { logger } from '@/ui/logger';
import { uninstall as uninstallMac } from './mac/uninstall';
import { disableShellAutostart } from './shellAutostart';
import { uninstallLinuxService } from './linux/service';

export async function uninstall(): Promise<void> {
    if (process.platform === 'linux') {
        const service = await uninstallLinuxService();
        const profiles = await disableShellAutostart();
        logger.info(service || profiles.length
            ? `Removed daemon startup configuration${service ? ` from ${service}` : ''}`
            : 'No daemon startup configuration found.');
        return;
    }

    if (process.platform !== 'darwin') {
        const profiles = await disableShellAutostart();
        logger.info(profiles.length ? 'Removed daemon shell startup configuration.' : 'No daemon startup configuration found.');
        return;
    }
    
    if (process.getuid && process.getuid() !== 0) {
        throw new Error('Daemon uninstallation requires sudo privileges. Please run with sudo.');
    }
    
    logger.info('Uninstalling AgentRejoin CLI daemon for macOS...');
    await uninstallMac();
}
