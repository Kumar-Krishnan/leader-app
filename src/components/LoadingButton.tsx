import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

type Variant = 'primary' | 'secondary' | 'destructive';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const VARIANT_STYLES: Record<Variant, { bg: string; bgDisabled: string; text: string; spinner: string }> = {
  primary: { bg: '#3B82F6', bgDisabled: '#334155', text: '#fff', spinner: '#fff' },
  secondary: { bg: '#1E293B', bgDisabled: '#1E293B', text: '#3B82F6', spinner: '#3B82F6' },
  destructive: { bg: 'rgba(239, 68, 68, 0.15)', bgDisabled: '#334155', text: '#EF4444', spinner: '#EF4444' },
};

export default function LoadingButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
}: Props) {
  const v = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: isDisabled ? v.bgDisabled : v.bg },
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.spinner} />
      ) : (
        <Text style={[styles.text, { color: isDisabled ? '#64748B' : v.text }, textStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 70,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
