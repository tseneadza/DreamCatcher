import { TextInput, View, Text, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <View className="mb-4">
      {label && (
        <Text className="text-slate-300 mb-2 font-medium">{label}</Text>
      )}
      <TextInput
        className={`bg-slate-700 text-white px-4 py-3 rounded-lg text-base ${
          error ? 'border-2 border-red-500' : ''
        } ${className}`}
        placeholderTextColor="#94a3b8"
        {...props}
      />
      {error && (
        <Text className="text-red-400 text-sm mt-1">{error}</Text>
      )}
    </View>
  );
}
