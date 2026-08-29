import * as React from 'react';
// @ts-expect-error react-test-renderer has no declarations in this workspace.
import { act, create } from 'react-test-renderer';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', async () => {
    const ReactModule = await import('react');
    return {
        StyleSheet: { create: (styles: unknown) => styles },
        View: (props: any) => ReactModule.createElement('View', props, props.children),
    };
});

import { NativeSettingsMenu } from './NativeSettingsMenu.web';

const originalConsoleError = console.error;

beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.spyOn(console, 'error').mockImplementation((message?: unknown, ...args: unknown[]) => {
        if (typeof message === 'string' && message.startsWith('react-test-renderer is deprecated')) return;
        originalConsoleError(message, ...args);
    });
});

afterAll(() => vi.restoreAllMocks());

describe('NativeSettingsMenu web', () => {
    it('opens grouped options and forwards the selected value', () => {
        const selectAgent = vi.fn();
        const selectPermission = vi.fn();
        let renderer: any;
        act(() => {
            renderer = create(React.createElement(NativeSettingsMenu, {
                accessibilityLabel: 'Settings',
                groups: [
                    {
                        key: 'agent',
                        label: 'Codex',
                        title: 'Agent',
                        options: [{ key: 'codex', label: 'Codex' }],
                        selectedKey: 'codex',
                        onSelect: selectAgent,
                    },
                    {
                        key: 'permission',
                        label: 'Default',
                        title: 'Permission',
                        options: [{ key: 'full', label: 'Full access' }],
                        selectedKey: 'default',
                        onSelect: selectPermission,
                    },
                ],
                children: React.createElement('Gear'),
            }));
        });

        const select = renderer.root.findByType('select');
        const currentTarget = { value: '1:0' };
        act(() => select.props.onChange({ currentTarget }));

        expect(selectAgent).not.toHaveBeenCalled();
        expect(selectPermission).toHaveBeenCalledWith('full');
        expect(currentTarget.value).toBe('');
        expect(renderer.root.findAllByType('optgroup')).toHaveLength(2);
    });
});
