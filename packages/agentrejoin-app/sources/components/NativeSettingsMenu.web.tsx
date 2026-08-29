import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeSettingsMenuProps } from './NativeSettingsMenu';

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
});

const selectStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
};

export function NativeSettingsMenu({
    accessibilityLabel,
    children,
    flat = false,
    groups,
    style,
}: NativeSettingsMenuProps) {
    const option = (groupIndex: number, optionIndex: number) => {
        const group = groups[groupIndex];
        const item = group.options[optionIndex];
        return (
            <option
                key={`${group.key}:${item.key}`}
                value={`${groupIndex}:${optionIndex}`}
                disabled={item.disabled}
            >
                {item.label}{item.key === group.selectedKey ? ' (selected)' : ''}
            </option>
        );
    };

    return (
        <View style={[styles.container, style]}>
            <View pointerEvents="none">{children}</View>
            <select
                aria-label={accessibilityLabel}
                defaultValue=""
                style={selectStyle}
                onChange={(event) => {
                    const [groupIndex, optionIndex] = event.currentTarget.value.split(':').map(Number);
                    const selected = groups[groupIndex]?.options[optionIndex];
                    if (selected && !selected.disabled) groups[groupIndex].onSelect(selected.key);
                    event.currentTarget.value = '';
                }}
            >
                <option value="" disabled hidden>
                    {accessibilityLabel ?? groups[0]?.title ?? 'Options'}
                </option>
                {flat
                    ? groups.map((group, groupIndex) => (
                        <React.Fragment key={group.key}>
                            {group.options.map((_, optionIndex) => option(groupIndex, optionIndex))}
                        </React.Fragment>
                    ))
                    : groups.map((group, groupIndex) => (
                        <optgroup key={group.key} label={group.title ?? group.label}>
                            {group.options.map((_, optionIndex) => option(groupIndex, optionIndex))}
                        </optgroup>
                    ))}
            </select>
        </View>
    );
}
