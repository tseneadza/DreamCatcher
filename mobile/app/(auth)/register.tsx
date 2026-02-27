import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async () => {
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await register(email.trim(), password, name.trim() || undefined);
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Registration failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-900"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-12">
          <View className="mb-8">
            <Text className="text-4xl font-bold text-white text-center mb-2">
              DreamCatcher
            </Text>
            <Text className="text-slate-400 text-center text-lg">
              Start your dream journal today
            </Text>
          </View>

          <View className="bg-slate-800 rounded-2xl p-6 shadow-lg">
            <Text className="text-2xl font-semibold text-white mb-6">
              Create Account
            </Text>

            {error && (
              <View className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
                <Text className="text-red-400 text-center">{error}</Text>
              </View>
            )}

            <View className="mb-4">
              <Text className="text-slate-300 mb-2 font-medium">Name (optional)</Text>
              <TextInput
                className="bg-slate-700 text-white px-4 py-3 rounded-lg text-base"
                placeholder="Enter your name"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                editable={!loading}
              />
            </View>

            <View className="mb-4">
              <Text className="text-slate-300 mb-2 font-medium">Email</Text>
              <TextInput
                className="bg-slate-700 text-white px-4 py-3 rounded-lg text-base"
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />
            </View>

            <View className="mb-4">
              <Text className="text-slate-300 mb-2 font-medium">Password</Text>
              <TextInput
                className="bg-slate-700 text-white px-4 py-3 rounded-lg text-base"
                placeholder="Create a password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!loading}
              />
            </View>

            <View className="mb-6">
              <Text className="text-slate-300 mb-2 font-medium">Confirm Password</Text>
              <TextInput
                className="bg-slate-700 text-white px-4 py-3 rounded-lg text-base"
                placeholder="Confirm your password"
                placeholderTextColor="#94a3b8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              className={`py-4 rounded-lg ${loading ? 'bg-indigo-400' : 'bg-indigo-600'}`}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white text-center font-semibold text-lg">
                  Create Account
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="mt-8 flex-row justify-center">
            <Text className="text-slate-400">Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity disabled={loading}>
                <Text className="text-indigo-400 font-semibold">Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
