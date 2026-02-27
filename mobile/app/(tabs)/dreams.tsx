import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { dreamsApi, Dream, DreamCreate } from '@/api';

const MOOD_CONFIG = [
  { emoji: '😫', label: 'Terrible', color: 'bg-red-500' },
  { emoji: '😞', label: 'Bad', color: 'bg-orange-500' },
  { emoji: '😐', label: 'Okay', color: 'bg-yellow-500' },
  { emoji: '😊', label: 'Good', color: 'bg-lime-500' },
  { emoji: '🌟', label: 'Amazing', color: 'bg-emerald-500' },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function truncateContent(content: string, maxLength = 100): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + '...';
}

interface DreamCardProps {
  dream: Dream;
  onPress: () => void;
}

function DreamCard({ dream, onPress }: DreamCardProps) {
  const moodIndex = Math.min(Math.max(dream.mood - 1, 0), 4);
  const moodConfig = MOOD_CONFIG[moodIndex];

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-slate-800 rounded-xl p-4 mb-3 mx-4"
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-white text-lg font-semibold flex-1 mr-2" numberOfLines={1}>
          {dream.title}
        </Text>
        <View className={`px-2 py-1 rounded-full ${moodConfig.color}`}>
          <Text className="text-sm">{moodConfig.emoji}</Text>
        </View>
      </View>

      <Text className="text-slate-400 text-xs mb-2">{formatDate(dream.dream_date)}</Text>

      <Text className="text-slate-300 text-sm mb-3" numberOfLines={2}>
        {truncateContent(dream.content)}
      </Text>

      {dream.tags && dream.tags.length > 0 && (
        <View className="flex-row flex-wrap gap-1">
          {dream.tags.slice(0, 4).map((tag, index) => (
            <View key={index} className="bg-slate-700 px-2 py-1 rounded-md">
              <Text className="text-indigo-400 text-xs">#{tag}</Text>
            </View>
          ))}
          {dream.tags.length > 4 && (
            <View className="bg-slate-700 px-2 py-1 rounded-md">
              <Text className="text-slate-400 text-xs">+{dream.tags.length - 4}</Text>
            </View>
          )}
        </View>
      )}

      {dream.ai_interpretation && (
        <View className="flex-row items-center mt-2 pt-2 border-t border-slate-700">
          <FontAwesome name="magic" size={12} color="#818cf8" />
          <Text className="text-indigo-400 text-xs ml-1">AI Interpreted</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function EmptyState({ onAddDream }: { onAddDream: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="bg-slate-800 rounded-full p-6 mb-4">
        <FontAwesome name="cloud" size={48} color="#6366f1" />
      </View>
      <Text className="text-white text-xl font-semibold mb-2">No Dreams Yet</Text>
      <Text className="text-slate-400 text-center mb-6">
        Start recording your dreams to unlock insights and patterns from your subconscious mind.
      </Text>
      <TouchableOpacity
        onPress={onAddDream}
        className="bg-indigo-600 px-6 py-3 rounded-xl flex-row items-center"
      >
        <FontAwesome name="plus" size={16} color="white" />
        <Text className="text-white font-semibold ml-2">Record First Dream</Text>
      </TouchableOpacity>
    </View>
  );
}

interface DreamFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: DreamCreate) => Promise<void>;
}

function DreamFormModal({ visible, onClose, onSubmit }: DreamFormModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(3);
  const [tagsInput, setTagsInput] = useState('');
  const [dreamDate, setDreamDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setMood(3);
    setTagsInput('');
    setDreamDate(new Date());
    setShowDatePicker(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your dream');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Error', 'Please describe your dream');
      return;
    }

    setIsSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        mood,
        tags,
        dream_date: dreamDate.toISOString().split('T')[0],
      });
      handleClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save dream. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (_: unknown, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDreamDate(selectedDate);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-slate-900"
      >
        <SafeAreaView className="flex-1" edges={['top']}>
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-800">
            <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
              <Text className="text-slate-400 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-white text-lg font-semibold">New Dream</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <Text className="text-indigo-400 text-base font-semibold">Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2 font-medium">Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Give your dream a title..."
                placeholderTextColor="#64748b"
                className="bg-slate-800 text-white px-4 py-3 rounded-xl text-base"
              />
            </View>

            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2 font-medium">Date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="bg-slate-800 px-4 py-3 rounded-xl flex-row items-center justify-between"
              >
                <Text className="text-white text-base">{formatDate(dreamDate.toISOString())}</Text>
                <FontAwesome name="calendar" size={16} color="#94a3b8" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dreamDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  themeVariant="dark"
                />
              )}
            </View>

            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2 font-medium">How did you feel?</Text>
              <View className="flex-row justify-between bg-slate-800 rounded-xl p-3">
                {MOOD_CONFIG.map((config, index) => {
                  const moodValue = index + 1;
                  const isSelected = mood === moodValue;
                  return (
                    <TouchableOpacity
                      key={moodValue}
                      onPress={() => setMood(moodValue)}
                      className={`items-center px-3 py-2 rounded-lg ${
                        isSelected ? config.color : 'bg-transparent'
                      }`}
                    >
                      <Text className="text-2xl mb-1">{config.emoji}</Text>
                      <Text
                        className={`text-xs ${isSelected ? 'text-white font-medium' : 'text-slate-400'}`}
                      >
                        {config.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2 font-medium">Dream Description</Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="Describe your dream in detail..."
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                className="bg-slate-800 text-white px-4 py-3 rounded-xl text-base min-h-[150px]"
              />
            </View>

            <View className="mb-6">
              <Text className="text-slate-400 text-sm mb-2 font-medium">Tags</Text>
              <TextInput
                value={tagsInput}
                onChangeText={setTagsInput}
                placeholder="flying, water, family (comma separated)"
                placeholderTextColor="#64748b"
                className="bg-slate-800 text-white px-4 py-3 rounded-xl text-base"
              />
              {tagsInput.length > 0 && (
                <View className="flex-row flex-wrap gap-1 mt-2">
                  {tagsInput
                    .split(',')
                    .map((t) => t.trim())
                    .filter((t) => t.length > 0)
                    .map((tag, index) => (
                      <View key={index} className="bg-indigo-600/30 px-2 py-1 rounded-md">
                        <Text className="text-indigo-400 text-xs">#{tag.toLowerCase()}</Text>
                      </View>
                    ))}
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface DreamDetailModalProps {
  dream: Dream | null;
  visible: boolean;
  onClose: () => void;
  onInterpret: (dream: Dream) => Promise<void>;
  onDelete: (dream: Dream) => Promise<void>;
}

function DreamDetailModal({ dream, visible, onClose, onInterpret, onDelete }: DreamDetailModalProps) {
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!dream) return null;

  const moodIndex = Math.min(Math.max(dream.mood - 1, 0), 4);
  const moodConfig = MOOD_CONFIG[moodIndex];

  const handleInterpret = async () => {
    setIsInterpreting(true);
    try {
      await onInterpret(dream);
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Dream', 'Are you sure you want to delete this dream? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await onDelete(dream);
            onClose();
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-slate-900" edges={['top']}>
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-800">
          <TouchableOpacity onPress={onClose}>
            <FontAwesome name="chevron-left" size={20} color="#94a3b8" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold">Dream Details</Text>
          <TouchableOpacity onPress={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <FontAwesome name="trash" size={20} color="#ef4444" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 py-4">
          <View className="flex-row items-start justify-between mb-3">
            <Text className="text-white text-2xl font-bold flex-1 mr-3">{dream.title}</Text>
            <View className={`px-3 py-2 rounded-full ${moodConfig.color}`}>
              <Text className="text-lg">{moodConfig.emoji}</Text>
            </View>
          </View>

          <View className="flex-row items-center mb-4">
            <FontAwesome name="calendar" size={14} color="#64748b" />
            <Text className="text-slate-400 text-sm ml-2">{formatDate(dream.dream_date)}</Text>
          </View>

          {dream.tags && dream.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mb-4">
              {dream.tags.map((tag, index) => (
                <View key={index} className="bg-indigo-600/30 px-3 py-1.5 rounded-lg">
                  <Text className="text-indigo-400 text-sm">#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <View className="bg-slate-800 rounded-xl p-4 mb-4">
            <Text className="text-slate-400 text-xs uppercase tracking-wider mb-2 font-medium">
              Dream Content
            </Text>
            <Text className="text-white text-base leading-6">{dream.content}</Text>
          </View>

          <View className="bg-slate-800 rounded-xl p-4 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <FontAwesome name="magic" size={16} color="#818cf8" />
                <Text className="text-white text-base font-semibold ml-2">AI Interpretation</Text>
              </View>
              {!dream.ai_interpretation && (
                <TouchableOpacity
                  onPress={handleInterpret}
                  disabled={isInterpreting}
                  className="bg-indigo-600 px-4 py-2 rounded-lg flex-row items-center"
                >
                  {isInterpreting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <FontAwesome name="bolt" size={12} color="white" />
                      <Text className="text-white text-sm font-medium ml-1">Interpret</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {dream.ai_interpretation ? (
              <Text className="text-slate-300 text-base leading-6">{dream.ai_interpretation}</Text>
            ) : (
              <Text className="text-slate-500 text-sm italic">
                Tap "Interpret" to get AI-powered insights about your dream's meaning and symbolism.
              </Text>
            )}
          </View>

          <View className="h-20" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function DreamsScreen() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchDreams = useCallback(async () => {
    try {
      setError(null);
      const data = await dreamsApi.getAll({ limit: 50 });
      const sorted = data.sort(
        (a, b) => new Date(b.dream_date).getTime() - new Date(a.dream_date).getTime()
      );
      setDreams(sorted);
    } catch (err) {
      setError('Failed to load dreams. Pull down to retry.');
      console.error('Failed to fetch dreams:', err);
    }
  }, []);

  useEffect(() => {
    const loadDreams = async () => {
      setIsLoading(true);
      await fetchDreams();
      setIsLoading(false);
    };
    loadDreams();
  }, [fetchDreams]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDreams();
    setIsRefreshing(false);
  };

  const handleCreateDream = async (data: DreamCreate) => {
    const newDream = await dreamsApi.create(data);
    setDreams((prev) =>
      [newDream, ...prev].sort(
        (a, b) => new Date(b.dream_date).getTime() - new Date(a.dream_date).getTime()
      )
    );
  };

  const handleInterpretDream = async (dream: Dream) => {
    try {
      const updated = await dreamsApi.interpret(dream.id);
      setDreams((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setSelectedDream(updated);
    } catch (err) {
      Alert.alert('Error', 'Failed to get AI interpretation. Please try again.');
      console.error('Failed to interpret dream:', err);
    }
  };

  const handleDeleteDream = async (dream: Dream) => {
    try {
      await dreamsApi.delete(dream.id);
      setDreams((prev) => prev.filter((d) => d.id !== dream.id));
    } catch (err) {
      Alert.alert('Error', 'Failed to delete dream. Please try again.');
      console.error('Failed to delete dream:', err);
    }
  };

  const handleDreamPress = (dream: Dream) => {
    setSelectedDream(dream);
    setShowDetailModal(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="text-slate-400 mt-4">Loading dreams...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900" edges={['top']}>
      <View className="px-4 py-3 border-b border-slate-800">
        <Text className="text-white text-2xl font-bold">Dreams</Text>
        <Text className="text-slate-400 text-sm mt-1">
          {dreams.length > 0 ? `${dreams.length} dream${dreams.length !== 1 ? 's' : ''} recorded` : 'Record your dreams'}
        </Text>
      </View>

      {error && (
        <View className="mx-4 mt-3 bg-red-900/30 border border-red-800 rounded-xl p-3">
          <Text className="text-red-400 text-sm">{error}</Text>
        </View>
      )}

      {dreams.length === 0 && !error ? (
        <EmptyState onAddDream={() => setShowFormModal(true)} />
      ) : (
        <FlatList
          data={dreams}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <DreamCard dream={item} onPress={() => handleDreamPress(item)} />}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#6366f1"
              colors={['#6366f1']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        onPress={() => setShowFormModal(true)}
        className="absolute bottom-6 right-6 bg-indigo-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        style={{
          shadowColor: '#6366f1',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
        activeOpacity={0.8}
      >
        <FontAwesome name="plus" size={24} color="white" />
      </TouchableOpacity>

      <DreamFormModal
        visible={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleCreateDream}
      />

      <DreamDetailModal
        dream={selectedDream}
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onInterpret={handleInterpretDream}
        onDelete={handleDeleteDream}
      />
    </SafeAreaView>
  );
}
