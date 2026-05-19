import { forwardRef } from 'react';
import { TextInput, type TextInputProps, View, Text } from 'react-native';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ label, error, className, ...props }, ref) => (
    <View className="gap-1.5">
      {label && (
        <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {label}
        </Text>
      )}
      <TextInput
        ref={ref}
        placeholderTextColor="#9ca3af"
        className="h-12 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
        {...props}
      />
      {error && <Text className="text-xs text-red-500">{error}</Text>}
    </View>
  ),
);
TextField.displayName = 'TextField';
