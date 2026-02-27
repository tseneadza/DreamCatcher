import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated';
}

export function Card({ variant = 'default', className = '', children, ...props }: CardProps) {
  const baseStyles = 'bg-slate-800 rounded-xl';
  const variantStyles = variant === 'elevated' ? 'shadow-lg' : '';

  return (
    <View className={`${baseStyles} ${variantStyles} ${className}`} {...props}>
      {children}
    </View>
  );
}
