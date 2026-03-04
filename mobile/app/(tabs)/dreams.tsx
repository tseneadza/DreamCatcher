import { useState, useEffect, useCallback, useRef } from 'react';
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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { dreamsApi, aiApi, goalsApi, filtersApi, Dream, DreamCreate, Goal } from '@/api';
import type { DreamIdea, DreamExploreResponse, SavedFilter } from '@/api/types';

const MOOD_CONFIG = [
  { emoji: '😫', label: 'Terrible', color: 'bg-red-500' },
  { emoji: '😞', label: 'Bad', color: 'bg-orange-500' },
  { emoji: '😐', label: 'Okay', color: 'bg-yellow-500' },
  { emoji: '😊', label: 'Good', color: 'bg-lime-500' },
  { emoji: '🌟', label: 'Amazing', color: 'bg-emerald-500' },
];

const DREAM_TYPES = ['Normal', 'Nightmare', 'Lucid', 'Daydream'] as const;

const DREAM_TYPE_COLORS: Record<string, string> = {
  Normal: 'bg-slate-600',
  Nightmare: 'bg-red-700',
  Lucid: 'bg-purple-700',
  Daydream: 'bg-sky-700',
};

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
  goalName?: string;
}

function DreamCard({ dream, onPress, goalName }: DreamCardProps) {
  const moodIndex = Math.min(Math.max(dream.mood - 1, 0), 4);
  const moodConfig = MOOD_CONFIG[moodIndex];
  const typeBadgeColor = DREAM_TYPE_COLORS[dream.dream_type] || 'bg-slate-600';

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-slate-800 rounded-xl p-4 mb-3 mx-4"
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1 mr-2">
          <Text className="text-white text-lg font-semibold flex-1 mr-2" numberOfLines={1}>
            {dream.title}
          </Text>
          {dream.dream_type && dream.dream_type !== 'Normal' && (
            <View className={`px-2 py-0.5 rounded-md ${typeBadgeColor}`}>
              <Text className="text-white text-xs font-medium">{dream.dream_type}</Text>
            </View>
          )}
        </View>
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

      {goalName && (
        <View className="flex-row items-center mt-2 pt-2 border-t border-slate-700">
          <FontAwesome name="bullseye" size={12} color="#5eead4" />
          <Text className="text-teal-400 text-xs ml-1">{goalName}</Text>
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
  goals: Goal[];
}

function DreamFormModal({ visible, onClose, onSubmit, goals }: DreamFormModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(3);
  const [tagsInput, setTagsInput] = useState('');
  const [dreamDate, setDreamDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dreamType, setDreamType] = useState('Normal');
  const [lucidityLevel, setLucidityLevel] = useState(0);
  const [vividness, setVividness] = useState(3);
  const [emotionsInput, setEmotionsInput] = useState('');
  const [charactersInput, setCharactersInput] = useState('');
  const [locationsInput, setLocationsInput] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  const [goalId, setGoalId] = useState<number | null>(null);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setMood(3);
    setTagsInput('');
    setDreamDate(new Date());
    setShowDatePicker(false);
    setDreamType('Normal');
    setLucidityLevel(0);
    setVividness(3);
    setEmotionsInput('');
    setCharactersInput('');
    setLocationsInput('');
    setIsRecurring(false);
    setGoalId(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAutoTag = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please describe your dream first so AI can analyze it.');
      return;
    }
    setIsAutoTagging(true);
    try {
      const result = await aiApi.autoTag(content.trim(), mood);
      if (result.emotions?.length) setEmotionsInput(result.emotions.join(', '));
      if (result.characters?.length) setCharactersInput(result.characters.join(', '));
      if (result.locations?.length) setLocationsInput(result.locations.join(', '));
      if (result.dream_type) setDreamType(result.dream_type);
      if (result.lucidity_level != null) setLucidityLevel(result.lucidity_level);
    } catch {
      Alert.alert('Error', 'Auto-tagging failed. Please try again.');
    } finally {
      setIsAutoTagging(false);
    }
  };

  const parseCommaSeparated = (input: string): string[] =>
    input
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

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
      const tags = parseCommaSeparated(tagsInput).map((t) => t.toLowerCase());

      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        mood,
        tags,
        dream_date: dreamDate.toISOString().split('T')[0],
        dream_type: dreamType,
        lucidity_level: lucidityLevel,
        vividness,
        emotions: parseCommaSeparated(emotionsInput),
        characters: parseCommaSeparated(charactersInput),
        locations: parseCommaSeparated(locationsInput),
        is_recurring: isRecurring,
        goal_id: goalId,
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
              <Text className="text-slate-400 text-sm mb-2 font-medium">Dream Type</Text>
              <View className="flex-row bg-slate-800 rounded-xl p-1.5">
                {DREAM_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setDreamType(type)}
                    className={`flex-1 py-2.5 rounded-lg items-center ${
                      dreamType === type ? DREAM_TYPE_COLORS[type] : 'bg-transparent'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        dreamType === type ? 'text-white' : 'text-slate-400'
                      }`}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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

            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2 font-medium">
                Lucidity Level ({lucidityLevel}/5)
              </Text>
              <View className="bg-slate-800 rounded-xl px-4 py-3">
                <Slider
                  minimumValue={0}
                  maximumValue={5}
                  step={1}
                  value={lucidityLevel}
                  onValueChange={setLucidityLevel}
                  minimumTrackTintColor="#6366f1"
                  maximumTrackTintColor="#334155"
                  thumbTintColor="#818cf8"
                />
                <View className="flex-row justify-between mt-1">
                  <Text className="text-slate-500 text-xs">Not lucid</Text>
                  <Text className="text-slate-500 text-xs">Fully lucid</Text>
                </View>
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2 font-medium">
                Vividness ({vividness}/5)
              </Text>
              <View className="bg-slate-800 rounded-xl px-4 py-3">
                <Slider
                  minimumValue={1}
                  maximumValue={5}
                  step={1}
                  value={vividness}
                  onValueChange={setVividness}
                  minimumTrackTintColor="#6366f1"
                  maximumTrackTintColor="#334155"
                  thumbTintColor="#818cf8"
                />
                <View className="flex-row justify-between mt-1">
                  <Text className="text-slate-500 text-xs">Vague</Text>
                  <Text className="text-slate-500 text-xs">Crystal clear</Text>
                </View>
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2 font-medium">Emotions</Text>
              <TextInput
                value={emotionsInput}
                onChangeText={setEmotionsInput}
                placeholder="joy, fear, wonder (comma separated)"
                placeholderTextColor="#64748b"
                className="bg-slate-800 text-white px-4 py-3 rounded-xl text-base"
              />
            </View>

            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2 font-medium">Characters</Text>
              <TextInput
                value={charactersInput}
                onChangeText={setCharactersInput}
                placeholder="mom, stranger, dog (comma separated)"
                placeholderTextColor="#64748b"
                className="bg-slate-800 text-white px-4 py-3 rounded-xl text-base"
              />
            </View>

            <View className="mb-4">
              <Text className="text-slate-400 text-sm mb-2 font-medium">Locations</Text>
              <TextInput
                value={locationsInput}
                onChangeText={setLocationsInput}
                placeholder="beach, school, forest (comma separated)"
                placeholderTextColor="#64748b"
                className="bg-slate-800 text-white px-4 py-3 rounded-xl text-base"
              />
            </View>

            {goals.length > 0 && (
              <View className="mb-4">
                <Text className="text-slate-400 text-sm mb-2 font-medium">Link to Goal</Text>
                <View className="bg-slate-800 rounded-xl overflow-hidden">
                  <TouchableOpacity
                    onPress={() => setGoalId(null)}
                    className={`px-4 py-3 border-b border-slate-700 ${goalId === null ? 'bg-indigo-600/30' : ''}`}
                  >
                    <Text className={`text-base ${goalId === null ? 'text-indigo-300 font-medium' : 'text-slate-400'}`}>
                      No goal linked
                    </Text>
                  </TouchableOpacity>
                  {goals.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => setGoalId(g.id)}
                      className={`px-4 py-3 border-b border-slate-700 ${goalId === g.id ? 'bg-indigo-600/30' : ''}`}
                    >
                      <Text className={`text-base ${goalId === g.id ? 'text-indigo-300 font-medium' : 'text-white'}`}>
                        {g.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View className="mb-4">
              <View className="flex-row items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
                <Text className="text-slate-300 text-base">Recurring dream?</Text>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: '#334155', true: '#6366f1' }}
                  thumbColor={isRecurring ? '#818cf8' : '#94a3b8'}
                />
              </View>
            </View>

            <View className="mb-4">
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

            <TouchableOpacity
              onPress={handleAutoTag}
              disabled={isAutoTagging || !content.trim()}
              className={`mb-6 py-3 rounded-xl flex-row items-center justify-center ${
                content.trim() ? 'bg-purple-700' : 'bg-slate-700'
              }`}
            >
              {isAutoTagging ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <FontAwesome name="magic" size={16} color="white" />
                  <Text className="text-white font-semibold ml-2">Auto-tag with AI</Text>
                </>
              )}
            </TouchableOpacity>

            <View className="h-8" />
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
  const [showExplore, setShowExplore] = useState(false);
  const [exploreQuestion, setExploreQuestion] = useState('');
  const [exploreResponse, setExploreResponse] = useState<DreamExploreResponse | null>(null);
  const [isExploring, setIsExploring] = useState(false);
  const [ideas, setIdeas] = useState<DreamIdea[]>([]);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [showIdeas, setShowIdeas] = useState(false);

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

  const handleExplore = async () => {
    if (!exploreQuestion.trim()) return;
    setIsExploring(true);
    try {
      const result = await aiApi.exploreDream(dream.id, exploreQuestion.trim());
      setExploreResponse(result);
      setExploreQuestion('');
    } catch {
      Alert.alert('Error', 'Failed to explore dream. Please try again.');
    } finally {
      setIsExploring(false);
    }
  };

  const handleGenerateIdeas = async () => {
    setIsGeneratingIdeas(true);
    setShowIdeas(true);
    try {
      const result = await aiApi.dreamToIdeas(dream.id);
      setIdeas(result.ideas);
    } catch {
      Alert.alert('Error', 'Failed to generate ideas. Please try again.');
    } finally {
      setIsGeneratingIdeas(false);
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

        <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
          <View className="flex-row items-start justify-between mb-3">
            <Text className="text-white text-2xl font-bold flex-1 mr-3">{dream.title}</Text>
            <View className={`px-3 py-2 rounded-full ${moodConfig.color}`}>
              <Text className="text-lg">{moodConfig.emoji}</Text>
            </View>
          </View>

          <View className="flex-row items-center flex-wrap gap-2 mb-4">
            <View className="flex-row items-center">
              <FontAwesome name="calendar" size={14} color="#64748b" />
              <Text className="text-slate-400 text-sm ml-2">{formatDate(dream.dream_date)}</Text>
            </View>
            {dream.dream_type && (
              <View className={`px-2.5 py-1 rounded-md ${DREAM_TYPE_COLORS[dream.dream_type] || 'bg-slate-600'}`}>
                <Text className="text-white text-xs font-medium">{dream.dream_type}</Text>
              </View>
            )}
            {dream.is_recurring && (
              <View className="bg-amber-700 px-2.5 py-1 rounded-md">
                <Text className="text-white text-xs font-medium">Recurring</Text>
              </View>
            )}
          </View>

          {(dream.lucidity_level > 0 || dream.vividness > 0) && (
            <View className="flex-row gap-3 mb-4">
              {dream.lucidity_level > 0 && (
                <View className="flex-1 bg-slate-800 rounded-xl p-3">
                  <Text className="text-slate-400 text-xs mb-1">Lucidity</Text>
                  <View className="flex-row items-center">
                    <Text className="text-white text-lg font-bold">{dream.lucidity_level}</Text>
                    <Text className="text-slate-500 text-xs ml-0.5">/5</Text>
                  </View>
                </View>
              )}
              {dream.vividness > 0 && (
                <View className="flex-1 bg-slate-800 rounded-xl p-3">
                  <Text className="text-slate-400 text-xs mb-1">Vividness</Text>
                  <View className="flex-row items-center">
                    <Text className="text-white text-lg font-bold">{dream.vividness}</Text>
                    <Text className="text-slate-500 text-xs ml-0.5">/5</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {dream.emotions && dream.emotions.length > 0 && (
            <View className="mb-4">
              <Text className="text-slate-400 text-xs uppercase tracking-wider mb-2 font-medium">
                Emotions
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {dream.emotions.map((emotion, index) => (
                  <View key={index} className="bg-pink-900/40 px-3 py-1.5 rounded-lg">
                    <Text className="text-pink-400 text-sm">{emotion}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {dream.characters && dream.characters.length > 0 && (
            <View className="mb-4">
              <Text className="text-slate-400 text-xs uppercase tracking-wider mb-2 font-medium">
                Characters
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {dream.characters.map((character, index) => (
                  <View key={index} className="bg-cyan-900/40 px-3 py-1.5 rounded-lg">
                    <Text className="text-cyan-400 text-sm">{character}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {dream.locations && dream.locations.length > 0 && (
            <View className="mb-4">
              <Text className="text-slate-400 text-xs uppercase tracking-wider mb-2 font-medium">
                Locations
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {dream.locations.map((location, index) => (
                  <View key={index} className="bg-emerald-900/40 px-3 py-1.5 rounded-lg">
                    <Text className="text-emerald-400 text-sm">{location}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

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

          {/* AI Action Buttons */}
          <View className="flex-row gap-3 mb-4">
            <TouchableOpacity
              onPress={() => setShowExplore(!showExplore)}
              className={`flex-1 py-3 rounded-xl flex-row items-center justify-center ${
                showExplore ? 'bg-purple-700' : 'bg-slate-800 border border-slate-700'
              }`}
            >
              <FontAwesome name="comments" size={14} color={showExplore ? '#fff' : '#a78bfa'} />
              <Text className={`ml-2 font-semibold text-sm ${showExplore ? 'text-white' : 'text-purple-400'}`}>
                Explore
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleGenerateIdeas}
              disabled={isGeneratingIdeas}
              className="flex-1 bg-slate-800 border border-slate-700 py-3 rounded-xl flex-row items-center justify-center"
            >
              {isGeneratingIdeas ? (
                <ActivityIndicator size="small" color="#fbbf24" />
              ) : (
                <>
                  <FontAwesome name="lightbulb-o" size={14} color="#fbbf24" />
                  <Text className="text-yellow-400 ml-2 font-semibold text-sm">Generate Ideas</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Explore Chat Interface */}
          {showExplore && (
            <View className="bg-purple-900/30 border border-purple-800 rounded-xl p-4 mb-4">
              <View className="flex-row items-center mb-3">
                <FontAwesome name="comments" size={14} color="#c084fc" />
                <Text className="text-purple-300 font-semibold ml-2 text-sm">Explore Your Dream</Text>
              </View>

              {exploreResponse && (
                <View className="mb-3">
                  <Text className="text-slate-300 text-sm leading-5 mb-3">{exploreResponse.answer}</Text>
                  {exploreResponse.follow_up_questions.length > 0 && (
                    <View>
                      <Text className="text-slate-500 text-xs mb-1">Try asking:</Text>
                      {exploreResponse.follow_up_questions.map((q, i) => (
                        <TouchableOpacity
                          key={i}
                          onPress={() => setExploreQuestion(q)}
                          className="py-1.5 px-2 rounded-lg mb-1"
                        >
                          <Text className="text-purple-400 text-sm">{q}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View className="flex-row gap-2">
                <TextInput
                  value={exploreQuestion}
                  onChangeText={setExploreQuestion}
                  placeholder="Ask about your dream..."
                  placeholderTextColor="#64748b"
                  className="flex-1 bg-slate-800 text-white px-3 py-2.5 rounded-lg text-sm"
                  editable={!isExploring}
                  onSubmitEditing={handleExplore}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  onPress={handleExplore}
                  disabled={isExploring || !exploreQuestion.trim()}
                  className="bg-purple-600 px-4 rounded-lg items-center justify-center"
                >
                  {isExploring ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <FontAwesome name="send" size={14} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Generated Ideas */}
          {showIdeas && (
            <View className="bg-yellow-900/20 border border-yellow-800/50 rounded-xl p-4 mb-4">
              <View className="flex-row items-center mb-3">
                <FontAwesome name="lightbulb-o" size={14} color="#fbbf24" />
                <Text className="text-yellow-300 font-semibold ml-2 text-sm">Dream-Inspired Ideas</Text>
              </View>
              {isGeneratingIdeas ? (
                <View className="items-center py-4">
                  <ActivityIndicator size="small" color="#fbbf24" />
                  <Text className="text-slate-400 text-sm mt-2">Generating ideas...</Text>
                </View>
              ) : ideas.length > 0 ? (
                ideas.map((idea, i) => (
                  <View key={i} className="bg-slate-800/50 rounded-lg p-3 mb-2">
                    <View className="flex-row items-center mb-1">
                      <View className="bg-yellow-600/30 px-2 py-0.5 rounded">
                        <Text className="text-yellow-400 text-xs">{idea.category}</Text>
                      </View>
                    </View>
                    <Text className="text-white text-sm mb-1">{idea.content}</Text>
                    <Text className="text-slate-500 text-xs">{idea.reasoning}</Text>
                  </View>
                ))
              ) : (
                <Text className="text-slate-500 text-sm">No ideas generated.</Text>
              )}
            </View>
          )}

          <View className="h-20" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function DreamsScreen() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSortPicker, setShowSortPicker] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedQuery(text), 300);
  }, []);

  const fetchDreams = useCallback(async () => {
    try {
      setError(null);
      const params: { limit: number; q?: string; sort_by?: string; sort_order?: string } = { limit: 50 };
      if (debouncedQuery) params.q = debouncedQuery;
      params.sort_by = sortBy;
      params.sort_order = sortOrder;
      const data = await dreamsApi.getAll(params);
      setDreams(data);
    } catch (err) {
      setError('Failed to load dreams. Pull down to retry.');
      console.error('Failed to fetch dreams:', err);
    }
  }, [debouncedQuery, sortBy, sortOrder]);

  useEffect(() => {
    const loadDreams = async () => {
      setIsLoading(true);
      await fetchDreams();
      setIsLoading(false);
    };
    loadDreams();
  }, [fetchDreams]);

  useEffect(() => {
    goalsApi.getAll().then(setGoals).catch(() => {});
    filtersApi.getAll('dream').then(setSavedFilters).catch(() => {});
  }, []);

  const handleSaveFilter = () => {
    Alert.prompt('Save Filter', 'Name this filter:', async (name) => {
      if (!name) return;
      try {
        const filter = await filtersApi.create({
          name,
          entity_type: 'dream',
          filter_config: { q: searchQuery, sort_by: sortBy, sort_order: sortOrder },
        });
        setSavedFilters((prev) => [filter, ...prev]);
      } catch {
        Alert.alert('Error', 'Failed to save filter.');
      }
    });
  };

  const handleApplyFilter = (filter: SavedFilter) => {
    const cfg = filter.filter_config as Record<string, string>;
    setSearchQuery(cfg.q || '');
    setDebouncedQuery(cfg.q || '');
    setSortBy(cfg.sort_by || 'date');
    setSortOrder(cfg.sort_order || 'desc');
  };

  const handleDeleteFilter = async (id: number) => {
    await filtersApi.delete(id);
    setSavedFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const SORT_OPTIONS = [
    { label: 'Newest First', sort_by: 'date', sort_order: 'desc' },
    { label: 'Oldest First', sort_by: 'date', sort_order: 'asc' },
    { label: 'Mood (High to Low)', sort_by: 'mood', sort_order: 'desc' },
    { label: 'Mood (Low to High)', sort_by: 'mood', sort_order: 'asc' },
    { label: 'Vividness (High)', sort_by: 'vividness', sort_order: 'desc' },
    { label: 'Vividness (Low)', sort_by: 'vividness', sort_order: 'asc' },
  ];

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

        <View className="flex-row items-center gap-2 mt-3">
          <View className="flex-1 bg-slate-800 rounded-xl flex-row items-center px-3">
            <FontAwesome name="search" size={14} color="#64748b" />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder="Search dreams..."
              placeholderTextColor="#64748b"
              className="flex-1 text-white py-2.5 ml-2 text-sm"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setDebouncedQuery(''); }}>
                <FontAwesome name="times-circle" size={14} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setShowSortPicker(true)}
            className="bg-slate-800 p-2.5 rounded-xl"
          >
            <FontAwesome name="sort" size={16} color="#a5b4fc" />
          </TouchableOpacity>
        </View>

        {savedFilters.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
            {savedFilters.map((f) => (
              <TouchableOpacity
                key={f.id}
                onPress={() => handleApplyFilter(f)}
                onLongPress={() => handleDeleteFilter(f.id)}
                className="bg-indigo-600/30 px-3 py-1.5 rounded-full mr-2"
              >
                <Text className="text-indigo-300 text-xs">{f.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Sort Picker Modal */}
      <Modal visible={showSortPicker} transparent animationType="fade" onRequestClose={() => setShowSortPicker(false)}>
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center"
          activeOpacity={1}
          onPress={() => setShowSortPicker(false)}
        >
          <View className="bg-slate-800 rounded-2xl p-4 w-72">
            <Text className="text-white text-lg font-bold mb-4 text-center">Sort By</Text>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={`${opt.sort_by}-${opt.sort_order}`}
                onPress={() => {
                  setSortBy(opt.sort_by);
                  setSortOrder(opt.sort_order);
                  setShowSortPicker(false);
                }}
                className={`py-3 px-4 rounded-xl mb-2 ${
                  sortBy === opt.sort_by && sortOrder === opt.sort_order ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <Text className="text-white text-center">{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

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
          renderItem={({ item }) => (
            <DreamCard
              dream={item}
              onPress={() => handleDreamPress(item)}
              goalName={item.goal_id ? goals.find(g => g.id === item.goal_id)?.title : undefined}
            />
          )}
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
        goals={goals}
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
