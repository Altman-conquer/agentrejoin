import * as React from 'react';
import { NativeSettingsMenu } from './NativeSettingsMenu';
import type { NativeOptionsPickerProps } from './NativeOptionsPicker';

export function NativeOptionsPicker({
    title,
    triggerLabel,
    options,
    selectedKey,
    onSelect,
    children,
}: NativeOptionsPickerProps) {
    return (
        <NativeSettingsMenu
            accessibilityLabel={title}
            flat
            groups={[{
                key: title,
                label: triggerLabel,
                title,
                options,
                selectedKey,
                onSelect,
            }]}
        >
            {children}
        </NativeSettingsMenu>
    );
}
