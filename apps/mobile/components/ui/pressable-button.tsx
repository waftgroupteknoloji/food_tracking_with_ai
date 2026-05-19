import { Pressable, Text, ActivityIndicator, type PressableProps } from 'react-native';
import { cn } from '@/lib/cn';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: 'primary' | 'outline' | 'accent';
  loading?: boolean;
  className?: string;
}

export function PressableButton({
  title,
  variant = 'primary',
  loading,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  const variantClasses = {
    primary: 'bg-primary-600 active:bg-primary-700',
    accent: 'bg-accent-500 active:bg-accent-600',
    outline:
      'border border-neutral-300 dark:border-neutral-700 bg-transparent active:bg-neutral-100 dark:active:bg-neutral-800',
  } as const;

  const textClasses = {
    primary: 'text-white',
    accent: 'text-white',
    outline: 'text-neutral-900 dark:text-neutral-100',
  } as const;

  return (
    <Pressable
      disabled={disabled || loading}
      className={cn(
        'h-12 rounded-xl items-center justify-center flex-row gap-2',
        variantClasses[variant],
        (disabled || loading) && 'opacity-60',
        className,
      )}
      {...rest}
    >
      {loading && <ActivityIndicator size="small" color="white" />}
      <Text className={cn('font-semibold', textClasses[variant])}>{title}</Text>
    </Pressable>
  );
}
