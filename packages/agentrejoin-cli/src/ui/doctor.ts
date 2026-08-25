/**
 * Doctor command implementation
 * 
 * Provides comprehensive diagnostics and troubleshooting information
 * for agentrejoin CLI including configuration, daemon status, logs, and links
 */

import chalk from 'chalk'
import { configuration } from '@/configuration'
import { readSettings, readCredentials } from '@/persistence'
import { checkIfDaemonRunningAndCleanupStaleState } from '@/daemon/controlClient'
import { findAllHappyProcesses } from '@/daemon/doctor'
import { readDaemonState } from '@/persistence'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { projectPath } from '@/projectPath'
import packageJson from '../../package.json'

/**
 * Get relevant environment information for debugging
 */
export function getEnvironmentInfo(): Record<string, any> {
    return {
        PWD: process.env.PWD,
        AGENTREJOIN_HOME_DIR: process.env.AGENTREJOIN_HOME_DIR,
        AGENTREJOIN_VARIANT: process.env.AGENTREJOIN_VARIANT,
        AGENTREJOIN_SERVER_URL: process.env.AGENTREJOIN_SERVER_URL,
        AGENTREJOIN_PROJECT_ROOT: process.env.AGENTREJOIN_PROJECT_ROOT,
        DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING: process.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING,
        NODE_ENV: process.env.NODE_ENV,
        DEBUG: process.env.DEBUG,
        workingDirectory: process.cwd(),
        processArgv: process.argv,
        happyDir: configuration?.agentRejoinHomeDir,
        serverUrl: configuration?.serverUrl,
        logsDir: configuration?.logsDir,
        processPid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        user: process.env.USER,
        home: process.env.HOME,
        shell: process.env.SHELL,
        terminal: process.env.TERM,
    };
}

function getLogFiles(logDir: string): { file: string, path: string, modified: Date }[] {
    if (!existsSync(logDir)) {
        return [];
    }

    try {
        return readdirSync(logDir)
            .filter(file => file.endsWith('.log'))
            .map(file => {
                const path = join(logDir, file);
                const stats = statSync(path);
                return { file, path, modified: stats.mtime };
            })
            .sort((a, b) => b.modified.getTime() - a.modified.getTime());
    } catch {
        return [];
    }
}

/**
 * Slim daemon status output for `agentrejoin daemon status`
 */
export async function runDoctorDaemon(): Promise<void> {
    console.log(chalk.bold('\n🤖 Daemon Status'));
    try {
        const isRunning = await checkIfDaemonRunningAndCleanupStaleState();
        const state = await readDaemonState();

        if (isRunning && state) {
            console.log(chalk.green('✓ Daemon is running'));
            console.log(`  PID:     ${state.pid}`);
            console.log(`  Port:    ${state.httpPort}`);
            console.log(`  Started: ${new Date(state.startTime).toLocaleString()}`);
            console.log(`  Version: ${state.startedWithCliVersion}`);
        } else if (state && !isRunning) {
            console.log(chalk.yellow('⚠️  Daemon state exists but process not running (stale)'));
        } else {
            console.log(chalk.red('❌ Daemon is not running'));
        }

        if (state) {
            console.log(chalk.bold('\n📄 Daemon State:'));
            console.log(chalk.blue(`Location: ${configuration.daemonStateFile}`));
            console.log(chalk.gray(JSON.stringify(state, null, 2)));
        }
    } catch (error) {
        console.log(chalk.red('❌ Error checking daemon status'));
    }

    console.log(chalk.gray('\nRun `agentrejoin doctor` for full diagnostics.\n'));
}

/**
 * Full doctor diagnostics — verbose sections first, concise useful info last
 */
export async function runDoctorCommand(): Promise<void> {
    console.log(chalk.bold.cyan('\n🩺 AgentRejoin CLI Doctor\n'));

    // ── Verbose sections first (scroll off the top) ──

    // All AgentRejoin processes
    try {
        const allProcesses = await findAllHappyProcesses();
        if (allProcesses.length > 0) {
            console.log(chalk.bold('🔍 All AgentRejoin CLI Processes'));

            const grouped = allProcesses.reduce((groups, process) => {
                if (!groups[process.type]) groups[process.type] = [];
                groups[process.type].push(process);
                return groups;
            }, {} as Record<string, typeof allProcesses>);

            Object.entries(grouped).forEach(([type, processes]) => {
                const typeLabels: Record<string, string> = {
                    'current': '📍 Current Process',
                    'daemon': '🤖 Daemon',
                    'daemon-version-check': '🔍 Daemon Version Check (stuck)',
                    'daemon-spawned-session': '🔗 Daemon-Spawned Sessions',
                    'user-session': '👤 User Sessions',
                    'dev-daemon': '🛠️  Dev Daemon',
                    'dev-daemon-version-check': '🛠️  Dev Daemon Version Check (stuck)',
                    'dev-session': '🛠️  Dev Sessions',
                    'dev-doctor': '🛠️  Dev Doctor',
                    'dev-related': '🛠️  Dev Related',
                    'doctor': '🩺 Doctor',
                    'unknown': '❓ Unknown'
                };

                console.log(chalk.blue(`\n${typeLabels[type] || type}:`));
                processes.forEach(({ pid, command }) => {
                    const color = type === 'current' ? chalk.green :
                        type.startsWith('dev') ? chalk.cyan :
                            type.includes('daemon') ? chalk.blue : chalk.gray;
                    console.log(`  ${color(`PID ${pid}`)}: ${chalk.gray(command)}`);
                });
            });

            if (allProcesses.length > 1) {
                console.log(chalk.bold('\n💡 Process Management'));
                console.log(chalk.gray('To clean up runaway processes: agentrejoin doctor clean'));
            }
        } else {
            console.log(chalk.red('❌ No agentrejoin processes found'));
        }
    } catch (error) {
        console.log(chalk.red('❌ Error listing processes'));
    }

    // Log files
    console.log(chalk.bold('\n📝 Log Files'));
    const allLogs = getLogFiles(configuration.logsDir);
    if (allLogs.length > 0) {
        const daemonLogs = allLogs.filter(({ file }) => file.includes('daemon'));
        const regularLogs = allLogs.filter(({ file }) => !file.includes('daemon'));

        if (regularLogs.length > 0) {
            console.log(chalk.blue('\nRecent Logs:'));
            const logsToShow = regularLogs.slice(0, 10);
            logsToShow.forEach(({ file, path, modified }) => {
                console.log(`  ${chalk.green(file)} - ${modified.toLocaleString()}`);
                console.log(chalk.gray(`    ${path}`));
            });
            if (regularLogs.length > 10) {
                console.log(chalk.gray(`  ... and ${regularLogs.length - 10} more log files`));
            }
        }

        if (daemonLogs.length > 0) {
            console.log(chalk.blue('\nDaemon Logs:'));
            const daemonLogsToShow = daemonLogs.slice(0, 5);
            daemonLogsToShow.forEach(({ file, path, modified }) => {
                console.log(`  ${chalk.green(file)} - ${modified.toLocaleString()}`);
                console.log(chalk.gray(`    ${path}`));
            });
            if (daemonLogs.length > 5) {
                console.log(chalk.gray(`  ... and ${daemonLogs.length - 5} more daemon log files`));
            }
        } else {
            console.log(chalk.yellow('\nNo daemon log files found'));
        }
    } else {
        console.log(chalk.yellow('No log files found'));
    }

    // Daemon spawn diagnostics
    console.log(chalk.bold('\n🔧 Daemon Spawn Diagnostics'));
    const projectRoot = projectPath();
    const wrapperPath = join(projectRoot, 'bin', 'agentrejoin.mjs');
    const cliEntrypoint = join(projectRoot, 'dist', 'index.mjs');
    console.log(`Project Root: ${chalk.blue(projectRoot)}`);
    console.log(`Wrapper Script: ${chalk.blue(wrapperPath)}`);
    console.log(`CLI Entrypoint: ${chalk.blue(cliEntrypoint)}`);
    console.log(`Wrapper Exists: ${existsSync(wrapperPath) ? chalk.green('✓ Yes') : chalk.red('❌ No')}`);
    console.log(`CLI Exists: ${existsSync(cliEntrypoint) ? chalk.green('✓ Yes') : chalk.red('❌ No')}`);

    // Environment variables
    console.log(chalk.bold('\n🌍 Environment Variables'));
    const env = getEnvironmentInfo();
    console.log(`AGENTREJOIN_HOME_DIR: ${env.AGENTREJOIN_HOME_DIR ? chalk.green(env.AGENTREJOIN_HOME_DIR) : chalk.gray('not set')}`);
    console.log(`AGENTREJOIN_SERVER_URL: ${env.AGENTREJOIN_SERVER_URL ? chalk.green(env.AGENTREJOIN_SERVER_URL) : chalk.gray('not set')}`);
    console.log(`DANGEROUSLY_LOG_TO_SERVER: ${env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING ? chalk.yellow('ENABLED') : chalk.gray('not set')}`);
    console.log(`DEBUG: ${env.DEBUG ? chalk.green(env.DEBUG) : chalk.gray('not set')}`);
    console.log(`NODE_ENV: ${env.NODE_ENV ? chalk.green(env.NODE_ENV) : chalk.gray('not set')}`);

    // Settings
    try {
        const settings = await readSettings();
        console.log(chalk.bold('\n📄 Settings (settings.json):'));
        console.log(chalk.gray(JSON.stringify(settings, null, 2)));
    } catch (error) {
        console.log(chalk.bold('\n📄 Settings:'));
        console.log(chalk.red('❌ Failed to read settings'));
    }

    // Support and bug reports
    console.log(chalk.bold('\n🐛 Support & Bug Reports'));
    console.log(`Report issues: ${chalk.blue('https://github.com/Altman-conquer/agentrejoin/issues')}`);
    console.log(`Website: ${chalk.blue('https://agentrejoin.zhandj.com/')}`);

    // ── Concise useful info last (visible without scrolling) ──

    // Basic info
    console.log(chalk.bold('\n📋 Basic Information'));
    console.log(`AgentRejoin CLI Version: ${chalk.green(packageJson.version)}`);
    console.log(`Platform: ${chalk.green(process.platform)} ${process.arch}`);
    console.log(`Node.js Version: ${chalk.green(process.version)}`);

    // Configuration
    console.log(chalk.bold('\n⚙️  Configuration'));
    console.log(`AgentRejoin Home: ${chalk.blue(configuration.agentRejoinHomeDir)}`);
    console.log(`Server URL: ${chalk.blue(configuration.serverUrl)}`);
    console.log(`Logs Dir: ${chalk.blue(configuration.logsDir)}`);

    // Authentication
    console.log(chalk.bold('\n🔐 Authentication'));
    try {
        const credentials = await readCredentials();
        if (credentials) {
            console.log(chalk.green('✓ Authenticated (credentials found)'));
        } else {
            console.log(chalk.yellow('⚠️  Not authenticated (no credentials)'));
        }
    } catch (error) {
        console.log(chalk.red('❌ Error reading credentials'));
    }

    // Daemon status
    console.log(chalk.bold('\n🤖 Daemon Status'));
    try {
        const isRunning = await checkIfDaemonRunningAndCleanupStaleState();
        const state = await readDaemonState();

        if (isRunning && state) {
            console.log(chalk.green('✓ Daemon is running'));
            console.log(`  PID:     ${state.pid}`);
            console.log(`  Port:    ${state.httpPort}`);
            console.log(`  Started: ${new Date(state.startTime).toLocaleString()}`);
            console.log(`  Version: ${state.startedWithCliVersion}`);
        } else if (state && !isRunning) {
            console.log(chalk.yellow('⚠️  Daemon state exists but process not running (stale)'));
        } else {
            console.log(chalk.red('❌ Daemon is not running'));
        }

        if (state) {
            console.log(chalk.bold('\n📄 Daemon State:'));
            console.log(chalk.blue(`Location: ${configuration.daemonStateFile}`));
            console.log(chalk.gray(JSON.stringify(state, null, 2)));
        }
    } catch (error) {
        console.log(chalk.red('❌ Error checking daemon status'));
    }

    console.log(chalk.green('\n✅ Doctor diagnosis complete!\n'));
}
