import { afterAll } from 'vitest';
import {
    applyEnvironmentToProcess,
    createIntegrationEnvironment,
    destroyIntegrationEnvironment,
    type EnvironmentTemplate,
    type IntegrationEnvironment,
} from './integrationEnvironment';

type IntegrationEnvironmentProfile = {
    template: EnvironmentTemplate;
    up: boolean;
};

declare global {
    // eslint-disable-next-line no-var
    var __happyIntegrationEnv: IntegrationEnvironment | undefined;
}

export async function installIntegrationEnvironment(profile: IntegrationEnvironmentProfile) {
    const previousEnv = {
        AGENTREJOIN_SERVER_URL: process.env.AGENTREJOIN_SERVER_URL,
        AGENTREJOIN_WEBAPP_URL: process.env.AGENTREJOIN_WEBAPP_URL,
        AGENTREJOIN_HOME_DIR: process.env.AGENTREJOIN_HOME_DIR,
        AGENTREJOIN_PROJECT_DIR: process.env.AGENTREJOIN_PROJECT_DIR,
        AGENTREJOIN_VARIANT: process.env.AGENTREJOIN_VARIANT,
        DEBUG: process.env.DEBUG,
    };

    const env = await createIntegrationEnvironment(profile);
    applyEnvironmentToProcess(env);
    globalThis.__happyIntegrationEnv = env;

    afterAll(async () => {
        try {
            await destroyIntegrationEnvironment(env);
        } finally {
            for (const [key, value] of Object.entries(previousEnv)) {
                if (value === undefined) {
                    delete process.env[key];
                } else {
                    process.env[key] = value;
                }
            }

            if (globalThis.__happyIntegrationEnv?.name === env.name) {
                globalThis.__happyIntegrationEnv = undefined;
            }
        }
    });
}
