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

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Login failed. Please try again.';
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
          <View className="mb-10">
            <Text className="text-4xl font-bold text-white text-center mb-2">
              DreamCatcher
            </Text>
            <Text className="text-slate-400 text-center text-lg">
              Capture your dreams, unlock insights
            </Text>
          </View>

          <View className="bg-slate-800 rounded-2xl p-6 shadow-lg">
            <Text className="text-2xl font-semibold text-white mb-6">
              Welcome back
            </Text>

            {error && (
              <View className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
                <Text className="text-red-400 text-center">{error}</Text>
              </View>
            )}

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

            <View className="mb-6">
              <Text className="text-slate-300 mb-2 font-medium">Password</Text>
              <TextInput
                className="bg-slate-700 text-white px-4 py-3 rounded-lg text-base"
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              className={`py-4 rounded-lg ${loading ? 'bg-indigo-400' : 'bg-indigo-600'}`}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white text-center font-semibold text-lg">
                  Sign In
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="mt-8 flex-row justify-center">
            <Text className="text-slate-400">Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity disabled={loading}>
                <Text className="text-indigo-400 font-semibold">Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
