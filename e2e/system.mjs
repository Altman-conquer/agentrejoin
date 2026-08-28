import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://server:3005';
const stateDir = process.env.STATE_DIR ?? '/state';
const artifactsDir = process.env.ARTIFACTS_DIR ?? '/artifacts';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(label, check, timeoutMs = 60_000) {
    const deadline = Date.now() + timeoutMs;
    let lastError;
    while (Date.now() < deadline) {
        try {
            const value = await check();
            if (value) return value;
        } catch (error) {
            lastError = error;
        }
        await delay(500);
    }
    throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
}

async function api(path, token, init = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...init.headers,
        },
    });
    if (!response.ok) {
        throw new Error(`${init.method ?? 'GET'} ${path} returned ${response.status}: ${await response.text()}`);
    }
    return response.json();
}

function configureContext(context, machineId, agentType = 'codex') {
    return context.addInitScript(({ machineId, agentType }) => {
        localStorage.setItem('agentrejoin-site-locale', 'en');
        localStorage.setItem('mmkv.default\\new-session-draft-v1', JSON.stringify({
            input: '',
            selectedMachineId: machineId,
            selectedPath: '/repo',
            agentType,
            permissionMode: 'default',
            modelMode: 'default',
            effortLevel: 'medium',
            sessionType: 'simple',
            worktreeKey: null,
            updatedAt: Date.now(),
        }));
    }, { machineId, agentType });
}

function watchPage(page) {
    page.on('console', (message) => console.log(`[browser:${message.type()}] ${message.text()}`));
    page.on('pageerror', (error) => console.error(`[browser:error] ${error.message}`));
    page.on('requestfailed', (request) => console.error(`[browser:requestfailed] ${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
}

async function assertFitsViewport(page) {
    const sizes = await page.evaluate(() => ({
        viewport: window.innerWidth,
        content: document.documentElement.scrollWidth,
    }));
    assert.ok(sizes.content <= sizes.viewport + 1, `page overflows horizontally: ${JSON.stringify(sizes)}`);
}

async function createConversation(browser, credentials, storageState, machineId, agentType, prompt) {
    const existingIds = new Set((await api('/v1/sessions', credentials.token)).sessions.map((session) => session.id));
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        storageState,
    });
    await configureContext(context, machineId, agentType);
    const page = await context.newPage();
    watchPage(page);
    await page.goto(`${baseUrl}/app`);
    await page.getByText('Type a message ...', { exact: true }).click();
    await page.getByPlaceholder('Type a message ...').fill(prompt);
    await page.getByRole('dialog').getByRole('button', { name: 'Send' }).click();

    const session = await waitFor(`new ${agentType} conversation`, async () => {
        const { sessions } = await api('/v1/sessions', credentials.token);
        return sessions.find((candidate) => !existingIds.has(candidate.id));
    }, 90_000);
    await page.getByText(prompt, { exact: true }).first().waitFor({ timeout: 60_000 });
    await page.goto(`${baseUrl}/session/${session.id}/info`);
    await page.getByText(agentType === 'claude' ? 'Claude' : 'codex', { exact: true }).last().waitFor({ timeout: 60_000 });
    await page.screenshot({ path: join(artifactsDir, `${agentType}.png`), fullPage: true });
    return { context, page, session };
}

await waitFor('server health', async () => (await fetch(`${baseUrl}/health`)).ok);
await mkdir(artifactsDir, { recursive: true });

const browser = await chromium.launch();
let currentPage;
try {
    const accountContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await accountContext.addInitScript(() => localStorage.setItem('agentrejoin-site-locale', 'en'));
    const accountPage = await accountContext.newPage();
    currentPage = accountPage;
    watchPage(accountPage);
    await accountPage.goto(`${baseUrl}/app`);
    await accountPage.getByText('Create account', { exact: true }).click();
    const credentials = await accountPage.waitForFunction(() => {
        const stored = localStorage.getItem('auth_credentials');
        return stored ? JSON.parse(stored) : null;
    }).then((handle) => handle.jsonValue());
    assert.ok(credentials?.token && credentials?.secret, 'account creation did not persist credentials');
    await accountPage.getByText('No sessions found', { exact: true }).waitFor({ timeout: 60_000 });

    const pairingUrl = await waitFor('machine Web pairing URL', async () => {
        const log = await readFile(join(stateDir, 'auth.log'), 'utf8');
        return log.match(/https?:\/\/\S+\/terminal\/connect#key=[A-Za-z0-9_-]+/)?.[0];
    }, 90_000);
    const pairingPath = new URL(pairingUrl);
    await accountPage.goto(`${baseUrl}${pairingPath.pathname}${pairingPath.search}${pairingPath.hash}`);
    await accountPage.getByText('Accept Connection', { exact: true }).click();
    const successButton = accountPage.getByRole('button', { name: 'OK' });
    if (await successButton.isVisible().catch(() => false)) await successButton.click();

    const machine = await waitFor('paired machine', async () => {
        const machines = await api('/v1/machines', credentials.token);
        return machines.find((candidate) => candidate.active);
    }, 90_000);
    await accountPage.goto(`${baseUrl}/app`);
    await accountPage.screenshot({ path: join(artifactsDir, 'desktop.png'), fullPage: true });
    const storageState = await accountContext.storageState();
    await accountContext.close();

    const codexPrompt = 'AgentRejoin Codex container end-to-end test';
    const codex = await createConversation(browser, credentials, storageState, machine.id, 'codex', codexPrompt);
    currentPage = codex.page;
    await codex.page.getByText('Archive Session', { exact: true }).click();
    await waitFor('Codex conversation to archive', async () => {
        const { sessions } = await api('/v1/sessions', credentials.token);
        return sessions.find((candidate) => candidate.id === codex.session.id)?.active === false;
    });
    await codex.context.close();

    const claudePrompt = 'AgentRejoin Claude container end-to-end test';
    const claude = await createConversation(browser, credentials, storageState, machine.id, 'claude', claudePrompt);
    currentPage = claude.page;
    await claude.page.getByText('Archive Session', { exact: true }).click();
    await waitFor('Claude conversation to archive', async () => {
        const { sessions } = await api('/v1/sessions', credentials.token);
        return sessions.find((candidate) => candidate.id === claude.session.id)?.active === false;
    });
    await claude.context.close();

    const mobile = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        storageState,
    });
    await configureContext(mobile, machine.id);
    const mobilePage = await mobile.newPage();
    currentPage = mobilePage;
    watchPage(mobilePage);
    await mobilePage.goto(`${baseUrl}/app`);
    await mobilePage.getByText('Settings', { exact: true }).last().waitFor({ timeout: 60_000 });
    await assertFitsViewport(mobilePage);
    await mobilePage.screenshot({ path: join(artifactsDir, 'mobile.png'), fullPage: true });

    for (const [sessionId, prompt] of [[codex.session.id, codexPrompt], [claude.session.id, claudePrompt]]) {
        await mobilePage.goto(`${baseUrl}/session/${sessionId}`);
        await mobilePage.getByText(prompt, { exact: true }).filter({ visible: true }).waitFor({ timeout: 60_000 });
    }

    await mobilePage.goto(`${baseUrl}/machine/${machine.id}`);
    const deleteMachine = mobilePage.getByText('Delete Machine', { exact: true });
    await deleteMachine.waitFor({ timeout: 60_000 });
    await deleteMachine.scrollIntoViewIfNeeded();
    await deleteMachine.click();
    await mobilePage.getByText('Delete', { exact: true }).last().click();
    await waitFor('machine deletion', async () => (await api('/v1/machines', credentials.token)).length === 0);
    await mobile.close();

    console.log('E2E passed: account creation, Web pairing, Codex, Claude, desktop/mobile history, and machine deletion');
} catch (error) {
    if (currentPage && !currentPage.isClosed()) {
        await currentPage.screenshot({ path: join(artifactsDir, 'failure.png'), fullPage: true });
    }
    throw error;
} finally {
    await browser.close();
}
