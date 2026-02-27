import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary: 'bg-indigo-600 active:bg-indigo-700',
  secondary: 'bg-slate-700 active:bg-slate-600',
  danger: 'bg-red-600 active:bg-red-700',
  ghost: 'bg-transparent active:bg-slate-800',
};

const sizes = {
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-6 py-4',
};

const textSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      className={`rounded-lg ${variants[variant]} ${sizes[size]} ${
        isDisabled ? 'opacity-50' : ''
      } ${className}`}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Text className={`text-white text-center font-semibold ${textSizes[size]}`}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
