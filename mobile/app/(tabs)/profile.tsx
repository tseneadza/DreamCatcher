import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { authApi, researchApi, User, UserUpdate } from '@/api';
import type { ConsentTerms, ConsentResponse } from '@/api/types';
import { api } from '@/api/client';
import { useRouter } from 'expo-router';

const AGE_BRACKETS = ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'] as const;
const GENDER_CATEGORIES = ['Male', 'Female', 'Non-binary', 'Prefer not to say'] as const;

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-slate-400 text-xs uppercase tracking-wider mb-3 mt-6 font-medium">
      {title}
    </Text>
  );
}

function FieldRow({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View className="mb-3">
      <Text className="text-slate-400 text-sm mb-1.5 font-medium">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`bg-slate-800 text-white px-4 py-3 rounded-xl text-base ${multiline ? 'min-h-[80px]' : ''}`}
      />
    </View>
  );
}

function PickerRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View className="mb-3">
      <Text className="text-slate-400 text-sm mb-1.5 font-medium">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => onSelect(option)}
            className={`px-3 py-2 rounded-lg ${
              selected === option ? 'bg-indigo-600' : 'bg-slate-800'
            }`}
          >
            <Text
              className={`text-sm ${
                selected === option ? 'text-white font-medium' : 'text-slate-400'
              }`}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [timezone, setTimezone] = useState('');
  const [ageBracket, setAgeBracket] = useState('');
  const [genderCategory, setGenderCategory] = useState('');
  const [region, setRegion] = useState('');
  const [dreamReminder, setDreamReminder] = useState('');
  const [sleepReminder, setSleepReminder] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [consentStatus, setConsentStatus] = useState<ConsentResponse | null>(null);
  const [consentTerms, setConsentTerms] = useState<ConsentTerms | null>(null);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentActing, setConsentActing] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const fetchConsent = useCallback(async () => {
    setConsentLoading(true);
    try {
      const [terms, status] = await Promise.allSettled([
        researchApi.getTerms(),
        researchApi.getStatus(),
      ]);
      if (terms.status === 'fulfilled') setConsentTerms(terms.value);
      if (status.status === 'fulfilled') setConsentStatus(status.value);
      else setConsentStatus(null);
    } catch {
      // no consent yet
    } finally {
      setConsentLoading(false);
    }
  }, []);

  const handleGrantConsent = async () => {
    if (!consentTerms) return;
    setConsentActing(true);
    try {
      const result = await researchApi.grantConsent({
        consent_version: consentTerms.version,
        data_categories: consentTerms.data_categories,
      });
      setConsentStatus(result);
      setShowConsentModal(false);
      Alert.alert('Success', 'You are now participating in research.');
    } catch {
      Alert.alert('Error', 'Failed to grant consent.');
    } finally {
      setConsentActing(false);
    }
  };

  const handleRevokeConsent = () => {
    Alert.alert(
      'Opt Out of Research',
      'This will permanently delete all research data derived from your dreams. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Opt Out',
          style: 'destructive',
          onPress: async () => {
            setConsentActing(true);
            try {
              const result = await researchApi.revokeConsent();
              setConsentStatus(result);
              Alert.alert('Done', 'Research participation revoked.');
            } catch {
              Alert.alert('Error', 'Failed to revoke consent.');
            } finally {
              setConsentActing(false);
            }
          },
        },
      ],
    );
  };

  const populateFields = (u: User) => {
    setName(u.name || '');
    setBio(u.bio || '');
    setTimezone(u.timezone || '');
    setAgeBracket(u.age_bracket || '');
    setGenderCategory(u.gender_category || '');
    setRegion(u.region || '');
    setDreamReminder(u.dream_reminder_time || '');
    setSleepReminder(u.sleep_reminder_time || '');
  };

  const fetchProfile = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
      populateFields(me);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchProfile(), fetchConsent()]);
      setIsLoading(false);
    };
    load();
  }, [fetchProfile, fetchConsent]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchProfile();
    setIsRefreshing(false);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const data: UserUpdate = {
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        timezone: timezone.trim() || undefined,
        age_bracket: ageBracket || undefined,
        gender_category: genderCategory || undefined,
        region: region.trim() || undefined,
        dream_reminder_time: dreamReminder.trim() || undefined,
        sleep_reminder_time: sleepReminder.trim() || undefined,
      };
      const updated = await authApi.updateProfile(data);
      setUser(updated);
      populateFields(updated);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in both password fields.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully.');
    } catch (err) {
      Alert.alert('Error', 'Failed to change password. Check your current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await authApi.exportData();
      const json = JSON.stringify(data, null, 2);
      await Share.share({ message: json, title: 'DreamCatcher Data Export' });
    } catch (err) {
      Alert.alert('Error', 'Failed to export data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.prompt(
      'Delete Account',
      'This action is permanent and cannot be undone. Enter your password to confirm.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async (password) => {
            if (!password) return;
            try {
              await authApi.deleteAccount(password);
              await api.setToken(null);
              router.replace('/');
            } catch (err) {
              Alert.alert('Error', 'Failed to delete account. Check your password.');
            }
          },
        },
      ],
      'secure-text',
    );
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await authApi.logout();
          router.replace('/');
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="text-slate-400 mt-4">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900" edges={['top']}>
      <View className="px-4 py-3 border-b border-slate-800">
        <Text className="text-white text-2xl font-bold">Profile</Text>
        <Text className="text-slate-400 text-sm mt-1">{user?.email}</Text>
      </View>

      <ScrollView
        className="flex-1 px-4"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
      >
        <SectionHeader title="Profile" />
        <FieldRow label="Name" value={name} onChangeText={setName} placeholder="Your name" />
        <FieldRow
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us about yourself..."
          multiline
        />
        <FieldRow
          label="Timezone"
          value={timezone}
          onChangeText={setTimezone}
          placeholder="e.g. America/New_York"
        />

        <SectionHeader title="Demographics (Optional)" />
        <PickerRow
          label="Age Bracket"
          options={AGE_BRACKETS}
          selected={ageBracket}
          onSelect={setAgeBracket}
        />
        <PickerRow
          label="Gender"
          options={GENDER_CATEGORIES}
          selected={genderCategory}
          onSelect={setGenderCategory}
        />
        <FieldRow
          label="Region"
          value={region}
          onChangeText={setRegion}
          placeholder="e.g. North America"
        />

        <SectionHeader title="Reminders" />
        <FieldRow
          label="Dream Reminder"
          value={dreamReminder}
          onChangeText={setDreamReminder}
          placeholder="e.g. 08:00"
        />
        <FieldRow
          label="Sleep Reminder"
          value={sleepReminder}
          onChangeText={setSleepReminder}
          placeholder="e.g. 22:00"
        />

        <TouchableOpacity
          onPress={handleSaveProfile}
          disabled={isSaving}
          className="bg-indigo-600 py-3 rounded-xl items-center mt-4"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">Save Profile</Text>
          )}
        </TouchableOpacity>

        <SectionHeader title="Security" />
        <View className="bg-slate-800 rounded-xl p-4 mb-3">
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current password"
            placeholderTextColor="#64748b"
            secureTextEntry
            className="text-white text-base mb-3 pb-3 border-b border-slate-700"
          />
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password"
            placeholderTextColor="#64748b"
            secureTextEntry
            className="text-white text-base mb-3 pb-3 border-b border-slate-700"
          />
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor="#64748b"
            secureTextEntry
            className="text-white text-base"
          />
        </View>
        <TouchableOpacity
          onPress={handleChangePassword}
          disabled={isChangingPassword}
          className="bg-slate-700 py-3 rounded-xl items-center"
        >
          {isChangingPassword ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">Change Password</Text>
          )}
        </TouchableOpacity>

        <SectionHeader title="Research Participation" />
        {consentLoading ? (
          <View className="bg-slate-800 rounded-xl p-4 items-center mb-3">
            <ActivityIndicator size="small" color="#6366f1" />
            <Text className="text-slate-400 text-sm mt-2">Loading consent status...</Text>
          </View>
        ) : (
          <View className="bg-slate-800 rounded-xl p-4 mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-1 mr-3">
                <Text className="text-white font-medium text-base">
                  Status:{' '}
                  <Text className={consentStatus?.status === 'active' ? 'text-emerald-400' : 'text-slate-400'}>
                    {consentStatus?.status === 'active' ? 'Opted In' : 'Not Participating'}
                  </Text>
                </Text>
                <Text className="text-slate-400 text-sm mt-1">
                  Contribute anonymized dream data to research
                </Text>
                {consentStatus?.status === 'active' && consentStatus.consented_at && (
                  <Text className="text-slate-500 text-xs mt-1">
                    Since {new Date(consentStatus.consented_at).toLocaleDateString()} (v{consentStatus.consent_version})
                  </Text>
                )}
              </View>
            </View>

            {consentStatus?.status === 'active' ? (
              <TouchableOpacity
                onPress={handleRevokeConsent}
                disabled={consentActing}
                className="bg-red-900/30 border border-red-800 py-2.5 rounded-lg items-center mt-2"
              >
                {consentActing ? (
                  <ActivityIndicator size="small" color="#f87171" />
                ) : (
                  <Text className="text-red-400 font-semibold text-sm">Opt Out</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setShowConsentModal(true)}
                disabled={consentActing}
                className="bg-indigo-600 py-2.5 rounded-lg items-center mt-2"
              >
                {consentActing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-semibold text-sm">Opt In to Research</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        <Modal
          visible={showConsentModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowConsentModal(false)}
        >
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-slate-800 rounded-t-3xl p-6 max-h-[80%]">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-white text-lg font-bold">Research Consent</Text>
                <TouchableOpacity onPress={() => setShowConsentModal(false)}>
                  <FontAwesome name="close" size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView className="mb-4" style={{ maxHeight: 300 }}>
                {consentTerms && (
                  <>
                    <Text className="text-slate-300 text-sm leading-5 mb-3">
                      {consentTerms.text}
                    </Text>
                    <Text className="text-slate-400 text-sm font-medium mb-2">
                      Data categories collected:
                    </Text>
                    {consentTerms.data_categories.map((cat) => (
                      <Text key={cat} className="text-slate-400 text-sm ml-3 mb-1">
                        • {cat.replace(/_/g, ' ')}
                      </Text>
                    ))}
                    <Text className="text-slate-500 text-xs mt-3">
                      Version {consentTerms.version}
                    </Text>
                  </>
                )}
              </ScrollView>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowConsentModal(false)}
                  className="flex-1 bg-slate-700 py-3 rounded-xl items-center"
                >
                  <Text className="text-slate-300 font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleGrantConsent}
                  disabled={consentActing}
                  className="flex-1 bg-indigo-600 py-3 rounded-xl items-center"
                >
                  {consentActing ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-semibold">I Agree & Opt In</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <SectionHeader title="Data" />
        <TouchableOpacity
          onPress={handleExportData}
          disabled={isExporting}
          className="bg-slate-800 py-3 rounded-xl flex-row items-center justify-center mb-3"
        >
          {isExporting ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <>
              <FontAwesome name="download" size={16} color="#6366f1" />
              <Text className="text-indigo-400 font-semibold text-base ml-2">Export My Data</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDeleteAccount}
          className="bg-red-900/30 border border-red-800 py-3 rounded-xl items-center mb-3"
        >
          <Text className="text-red-400 font-semibold text-base">Delete Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          className="bg-slate-800 py-3 rounded-xl items-center mb-8"
        >
          <Text className="text-slate-300 font-semibold text-base">Log Out</Text>
        </TouchableOpacity>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
