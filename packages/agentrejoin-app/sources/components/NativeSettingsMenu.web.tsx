import * as React from 'react';
import { createPortal } from 'react-dom';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Typography } from '@/constants/Typography';
import { FloatingOverlay } from './FloatingOverlay';
import type { NativeSettingsMenuProps } from './NativeSettingsMenu';

const styles = StyleSheet.create((theme) => ({
    container: {
        position: 'relative',
    },
    title: {
        color: theme.colors.text,
        fontSize: 15,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 8,
        ...Typography.default('semiBold'),
    },
    groupTitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 4,
        ...Typography.default('semiBold'),
    },
    option: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 9,
    },
    optionPressed: {
        backgroundColor: theme.colors.surfacePressed,
    },
    optionDisabled: {
        opacity: 0.45,
    },
    radio: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.radio.dot,
    },
    optionText: {
        flex: 1,
        color: theme.colors.text,
        fontSize: 14,
        ...Typography.default(),
    },
}));

const portalStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 2147483647,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
};

const panelStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 380,
};

export function NativeSettingsMenu({
    accessibilityLabel,
    children,
    flat = false,
    groups,
    style,
}: NativeSettingsMenuProps) {
    const { theme } = useUnistyles();
    const [open, setOpen] = React.useState(false);
    const title = accessibilityLabel ?? groups[0]?.title ?? 'Options';

    return (
        <View style={[styles.container, style]}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityState={{ expanded: open }}
                onPress={() => setOpen(true)}
            >
                {children}
            </Pressable>
            {open && typeof document !== 'undefined' && createPortal(
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                    style={portalStyle}
                    onClick={(event) => {
                        if (event.target === event.currentTarget) setOpen(false);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') setOpen(false);
                    }}
                >
                    <div style={panelStyle}>
                        <FloatingOverlay maxHeight={420} keyboardShouldPersistTaps="always">
                            <Text style={styles.title}>{title}</Text>
                            {groups.map((group) => (
                                <View key={group.key}>
                                    {!flat && groups.length > 1 && (
                                        <Text style={styles.groupTitle}>{group.title ?? group.label}</Text>
                                    )}
                                    {group.options.map((option) => {
                                        const selected = option.key === group.selectedKey;
                                        return (
                                            <Pressable
                                                key={option.key}
                                                disabled={option.disabled}
                                                accessibilityRole="radio"
                                                accessibilityState={{ checked: selected, disabled: option.disabled }}
                                                onPress={() => {
                                                    group.onSelect(option.key);
                                                    setOpen(false);
                                                }}
                                                style={({ pressed }) => [
                                                    styles.option,
                                                    pressed && styles.optionPressed,
                                                    option.disabled && styles.optionDisabled,
                                                ]}
                                            >
                                                <View style={[
                                                    styles.radio,
                                                    { borderColor: selected ? theme.colors.radio.active : theme.colors.radio.inactive },
                                                ]}>
                                                    {selected && <View style={styles.dot} />}
                                                </View>
                                                <Text style={styles.optionText}>{option.label}</Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            ))}
                        </FloatingOverlay>
                    </div>
                </div>,
                document.body,
            )}
        </View>
    );
}
