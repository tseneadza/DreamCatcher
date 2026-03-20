import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Slider from '@react-native-community/slider';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { goalsApi, aiApi, Goal, GoalCreate, Dream } from '@/api';
import type { GoalAlignmentResponse } from '@/api/types';

type GoalStatus = 'active' | 'completed' | 'paused';
type GoalCategory = 'Personal' | 'Career' | 'Health' | 'Learning' | 'Financial';

interface Milestone {
  title: string;
  completed: boolean;
}

interface GroupedGoals {
  status: GoalStatus;
  data: Goal[];
}

const CATEGORIES: GoalCategory[] = ['Personal', 'Career', 'Health', 'Learning', 'Financial'];
const STATUSES: GoalStatus[] = ['active', 'completed', 'paused'];

const CATEGORY_COLORS: Record<GoalCategory, string> = {
  Personal: 'bg-purple-600',
  Career: 'bg-blue-600',
  Health: 'bg-green-600',
  Learning: 'bg-amber-600',
  Financial: 'bg-emerald-600',
};

const STATUS_COLORS: Record<GoalStatus, string> = {
  active: 'text-green-400',
  completed: 'text-blue-400',
  paused: 'text-yellow-400',
};

const getProgressColor = (progress: number): string => {
  if (progress >= 70) return '#22c55e';
  if (progress >= 40) return '#eab308';
  return '#ef4444';
};

const getProgressBgColor = (progress: number): string => {
  if (progress >= 70) return 'bg-green-500';
  if (progress >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
};

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const [filterCategory, setFilterCategory] = useState<GoalCategory | null>(null);
  const [filterStatus, setFilterStatus] = useState<GoalStatus | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [priorityMin, setPriorityMin] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedQuery(text), 300);
  }, []);

  const [newGoal, setNewGoal] = useState<GoalCreate>({
    title: '',
    description: '',
    category: 'Personal',
    target_date: undefined,
    milestones: [],
    priority: 3,
    notes: '',
  });
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [linkedDreams, setLinkedDreams] = useState<Dream[]>([]);
  const [loadingDreams, setLoadingDreams] = useState(false);
  const [alignment, setAlignment] = useState<GoalAlignmentResponse | null>(null);
  const [loadingAlignment, setLoadingAlignment] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      setError(null);
      const params: { status?: string; category?: string; q?: string; priority_min?: number } = {};
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      if (debouncedQuery) params.q = debouncedQuery;
      if (priorityMin > 0) params.priority_min = priorityMin;
      
      const data = await goalsApi.getAll(params);
      setGoals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStatus, filterCategory, debouncedQuery, priorityMin]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  useEffect(() => {
    if (selectedGoal && showDetailModal) {
      setLoadingDreams(true);
      goalsApi.getGoalDreams(selectedGoal.id)
        .then(setLinkedDreams)
        .catch(() => setLinkedDreams([]))
        .finally(() => setLoadingDreams(false));
    } else {
      setLinkedDreams([]);
      setAlignment(null);
    }
  }, [selectedGoal?.id, showDetailModal]);

  const handleDreamAlignment = async (goalId: number) => {
    setLoadingAlignment(true);
    try {
      const result = await aiApi.goalAlignment(goalId);
      setAlignment(result);
    } catch {
      Alert.alert('Error', 'Failed to analyze dream alignment.');
    } finally {
      setLoadingAlignment(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGoals();
  }, [fetchGoals]);

  const groupedGoals: GroupedGoals[] = STATUSES.map((status) => ({
    status,
    data: goals.filter((g) => g.status === status),
  })).filter((group) => group.data.length > 0);

  const resetNewGoal = () => {
    setNewGoal({
      title: '',
      description: '',
      category: 'Personal',
      target_date: undefined,
      milestones: [],
      priority: 3,
      notes: '',
    });
    setNewMilestoneTitle('');
    setSelectedDate(new Date());
  };

  const handleCreateGoal = async () => {
    if (!newGoal.title.trim()) {
      Alert.alert('Error', 'Please enter a title for your goal');
      return;
    }

    setCreating(true);
    try {
      await goalsApi.create(newGoal);
      setShowCreateModal(false);
      resetNewGoal();
      fetchGoals();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create goal');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateProgress = async (goalId: number, progress: number) => {
    setUpdating(true);
    try {
      await goalsApi.update(goalId, { progress: Math.round(progress) });
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, progress: Math.round(progress) } : g))
      );
      if (selectedGoal?.id === goalId) {
        setSelectedGoal((prev) => (prev ? { ...prev, progress: Math.round(progress) } : null));
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update progress');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (goalId: number, status: GoalStatus) => {
    setUpdating(true);
    try {
      await goalsApi.update(goalId, { status });
      setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, status } : g)));
      if (selectedGoal?.id === goalId) {
        setSelectedGoal((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteGoal = async (goalId: number) => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await goalsApi.delete(goalId);
            setShowDetailModal(false);
            setSelectedGoal(null);
            fetchGoals();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete goal');
          }
        },
      },
    ]);
  };

  const handleGetAISuggestions = async (goalId: number) => {
    setUpdating(true);
    try {
      const updatedGoal = await goalsApi.suggest(goalId);
      setGoals((prev) => prev.map((g) => (g.id === goalId ? updatedGoal : g)));
      setSelectedGoal(updatedGoal);
      Alert.alert('AI Suggestions', updatedGoal.ai_suggestions || 'No suggestions available');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to get AI suggestions');
    } finally {
      setUpdating(false);
    }
  };

  const addMilestone = () => {
    if (!newMilestoneTitle.trim()) return;
    setNewGoal((prev) => ({
      ...prev,
      milestones: [...(prev.milestones || []), { title: newMilestoneTitle.trim(), completed: false }],
    }));
    setNewMilestoneTitle('');
  };

  const removeMilestone = (index: number) => {
    setNewGoal((prev) => ({
      ...prev,
      milestones: prev.milestones?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      setNewGoal((prev) => ({
        ...prev,
        target_date: date.toISOString().split('T')[0],
      }));
    }
  };

  const renderGoalCard = ({ item }: { item: Goal }) => (
    <TouchableOpacity
      className="bg-slate-800 rounded-xl p-4 mb-3 border border-slate-700"
      onPress={() => {
        setSelectedGoal(item);
        setShowDetailModal(true);
      }}
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-white text-lg font-semibold flex-1 mr-2" numberOfLines={1}>
          {item.title}
        </Text>
        <View className={`px-2 py-1 rounded-full ${CATEGORY_COLORS[item.category as GoalCategory] || 'bg-gray-600'}`}>
          <Text className="text-white text-xs font-medium">{item.category}</Text>
        </View>
      </View>

      <View className="mb-3">
        <View className="flex-row justify-between mb-1">
          <Text className="text-slate-400 text-sm">Progress</Text>
          <Text className="text-white text-sm font-medium">{item.progress}%</Text>
        </View>
        <View className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <View
            className={`h-full rounded-full ${getProgressBgColor(item.progress)}`}
            style={{ width: `${item.progress}%` }}
          />
        </View>
      </View>

      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center">
          <FontAwesome name="calendar" size={12} color="#94a3b8" />
          <Text className="text-slate-400 text-xs ml-1">
            {item.target_date
              ? new Date(item.target_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'No target date'}
          </Text>
        </View>
        <View className="flex-row items-center">
          <View className={`w-2 h-2 rounded-full mr-1 ${
            item.status === 'active' ? 'bg-green-500' :
            item.status === 'completed' ? 'bg-blue-500' : 'bg-yellow-500'
          }`} />
          <Text className={`text-xs capitalize ${STATUS_COLORS[item.status as GoalStatus] || 'text-gray-400'}`}>
            {item.status}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mt-2">
        <Text className="text-yellow-400 text-xs">
          {'★'.repeat(item.priority || 3)}{'☆'.repeat(5 - (item.priority || 3))}
        </Text>
        {item.dream_count > 0 && (
          <View className="flex-row items-center">
            <FontAwesome name="cloud" size={10} color="#5eead4" />
            <Text className="text-teal-400 text-xs ml-1">
              {item.dream_count} dream{item.dream_count !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = (status: GoalStatus, count: number) => (
    <View className="flex-row items-center mb-3 mt-4">
      <Text className={`text-lg font-bold capitalize ${STATUS_COLORS[status]}`}>{status}</Text>
      <View className="bg-slate-700 rounded-full px-2 py-0.5 ml-2">
        <Text className="text-white text-xs">{count}</Text>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
      <Text className="text-white font-semibold mb-3">Filters</Text>
      
      <Text className="text-slate-400 text-sm mb-2">Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        <TouchableOpacity
          className={`px-3 py-1.5 rounded-full mr-2 ${!filterCategory ? 'bg-indigo-600' : 'bg-slate-700'}`}
          onPress={() => setFilterCategory(null)}
        >
          <Text className="text-white text-sm">All</Text>
        </TouchableOpacity>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            className={`px-3 py-1.5 rounded-full mr-2 ${filterCategory === cat ? 'bg-indigo-600' : 'bg-slate-700'}`}
            onPress={() => setFilterCategory(cat)}
          >
            <Text className="text-white text-sm">{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text className="text-slate-400 text-sm mb-2">Status</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          className={`px-3 py-1.5 rounded-full mr-2 ${!filterStatus ? 'bg-indigo-600' : 'bg-slate-700'}`}
          onPress={() => setFilterStatus(null)}
        >
          <Text className="text-white text-sm">All</Text>
        </TouchableOpacity>
        {STATUSES.map((status) => (
          <TouchableOpacity
            key={status}
            className={`px-3 py-1.5 rounded-full mr-2 ${filterStatus === status ? 'bg-indigo-600' : 'bg-slate-700'}`}
            onPress={() => setFilterStatus(status)}
          >
            <Text className="text-white text-sm capitalize">{status}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        setShowCreateModal(false);
        resetNewGoal();
      }}
    >
      <SafeAreaView className="flex-1 bg-slate-900">
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-slate-800">
          <TouchableOpacity onPress={() => { setShowCreateModal(false); resetNewGoal(); }}>
            <Text className="text-slate-400 text-base">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold">New Goal</Text>
          <TouchableOpacity onPress={handleCreateGoal} disabled={creating}>
            {creating ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <Text className="text-indigo-500 text-base font-semibold">Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 py-4">
          <Text className="text-slate-400 text-sm mb-1">Title *</Text>
          <TextInput
            className="bg-slate-800 text-white rounded-lg px-4 py-3 mb-4 text-base border border-slate-700"
            placeholder="Enter goal title"
            placeholderTextColor="#64748b"
            value={newGoal.title}
            onChangeText={(text) => setNewGoal((prev) => ({ ...prev, title: text }))}
          />

          <Text className="text-slate-400 text-sm mb-1">Description</Text>
          <TextInput
            className="bg-slate-800 text-white rounded-lg px-4 py-3 mb-4 text-base border border-slate-700 min-h-[100px]"
            placeholder="Describe your goal"
            placeholderTextColor="#64748b"
            value={newGoal.description}
            onChangeText={(text) => setNewGoal((prev) => ({ ...prev, description: text }))}
            multiline
            textAlignVertical="top"
          />

          <Text className="text-slate-400 text-sm mb-2">Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                className={`px-4 py-2 rounded-full mr-2 ${
                  newGoal.category === cat ? CATEGORY_COLORS[cat] : 'bg-slate-700'
                }`}
                onPress={() => setNewGoal((prev) => ({ ...prev, category: cat }))}
              >
                <Text className="text-white text-sm">{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text className="text-slate-400 text-sm mb-2">Target Date</Text>
          <TouchableOpacity
            className="bg-slate-800 rounded-lg px-4 py-3 mb-4 border border-slate-700 flex-row items-center"
            onPress={() => setShowDatePicker(true)}
          >
            <FontAwesome name="calendar" size={16} color="#94a3b8" />
            <Text className="text-white ml-3">
              {newGoal.target_date
                ? new Date(newGoal.target_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Select target date'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <View className="bg-slate-800 rounded-lg mb-4 overflow-hidden">
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
                textColor="#fff"
                themeVariant="dark"
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  className="bg-indigo-600 py-2 mx-4 mb-4 rounded-lg"
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text className="text-white text-center font-medium">Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text className="text-slate-400 text-sm mb-2">Priority ({newGoal.priority || 3}/5)</Text>
          <View className="bg-slate-800 rounded-lg px-4 py-3 mb-4 border border-slate-700">
            <Slider
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={newGoal.priority || 3}
              onValueChange={(value) => setNewGoal((prev) => ({ ...prev, priority: value }))}
              minimumTrackTintColor="#6366f1"
              maximumTrackTintColor="#334155"
              thumbTintColor="#818cf8"
            />
            <View className="flex-row justify-between mt-1">
              <Text className="text-slate-500 text-xs">Low</Text>
              <Text className="text-yellow-400 text-xs">
                {'★'.repeat(newGoal.priority || 3)}{'☆'.repeat(5 - (newGoal.priority || 3))}
              </Text>
              <Text className="text-slate-500 text-xs">High</Text>
            </View>
          </View>

          <Text className="text-slate-400 text-sm mb-1">Notes</Text>
          <TextInput
            className="bg-slate-800 text-white rounded-lg px-4 py-3 mb-4 text-base border border-slate-700 min-h-[80px]"
            placeholder="Additional notes..."
            placeholderTextColor="#64748b"
            value={newGoal.notes}
            onChangeText={(text) => setNewGoal((prev) => ({ ...prev, notes: text }))}
            multiline
            textAlignVertical="top"
          />

          <Text className="text-slate-400 text-sm mb-2">Milestones</Text>
          <View className="flex-row mb-3">
            <TextInput
              className="flex-1 bg-slate-800 text-white rounded-lg px-4 py-3 mr-2 text-base border border-slate-700"
              placeholder="Add a milestone"
              placeholderTextColor="#64748b"
              value={newMilestoneTitle}
              onChangeText={setNewMilestoneTitle}
              onSubmitEditing={addMilestone}
            />
            <TouchableOpacity
              className="bg-indigo-600 rounded-lg px-4 justify-center"
              onPress={addMilestone}
            >
              <FontAwesome name="plus" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {newGoal.milestones && newGoal.milestones.length > 0 && (
            <View className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              {newGoal.milestones.map((milestone, index) => (
                <View
                  key={index}
                  className={`flex-row justify-between items-center py-2 ${
                    index < newGoal.milestones!.length - 1 ? 'border-b border-slate-700' : ''
                  }`}
                >
                  <View className="flex-row items-center flex-1">
                    <View className="w-2 h-2 rounded-full bg-slate-500 mr-3" />
                    <Text className="text-white flex-1">{milestone.title}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeMilestone(index)} className="p-1">
                    <FontAwesome name="times" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View className="h-20" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderDetailModal = () => {
    if (!selectedGoal) return null;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowDetailModal(false);
          setSelectedGoal(null);
        }}
      >
        <SafeAreaView className="flex-1 bg-slate-900">
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-slate-800">
            <TouchableOpacity onPress={() => { setShowDetailModal(false); setSelectedGoal(null); }}>
              <FontAwesome name="arrow-left" size={20} color="#94a3b8" />
            </TouchableOpacity>
            <Text className="text-white text-lg font-semibold">Goal Details</Text>
            <TouchableOpacity onPress={() => handleDeleteGoal(selectedGoal.id)}>
              <FontAwesome name="trash" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-4">
            <View className="flex-row items-start justify-between mb-4">
              <Text className="text-white text-2xl font-bold flex-1 mr-2">{selectedGoal.title}</Text>
              <View className={`px-3 py-1 rounded-full ${CATEGORY_COLORS[selectedGoal.category as GoalCategory] || 'bg-gray-600'}`}>
                <Text className="text-white text-sm font-medium">{selectedGoal.category}</Text>
              </View>
            </View>

            {selectedGoal.description && (
              <Text className="text-slate-400 text-base mb-6">{selectedGoal.description}</Text>
            )}

            <View className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
              <Text className="text-white font-semibold mb-3">Progress</Text>
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-400">Current progress</Text>
                <Text className="text-white font-bold text-lg">{selectedGoal.progress}%</Text>
              </View>
              <View className="h-3 bg-slate-700 rounded-full overflow-hidden mb-4">
                <View
                  className={`h-full rounded-full ${getProgressBgColor(selectedGoal.progress)}`}
                  style={{ width: `${selectedGoal.progress}%` }}
                />
              </View>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0}
                maximumValue={100}
                step={1}
                value={selectedGoal.progress}
                onSlidingComplete={(value) => handleUpdateProgress(selectedGoal.id, value)}
                minimumTrackTintColor={getProgressColor(selectedGoal.progress)}
                maximumTrackTintColor="#334155"
                thumbTintColor="#fff"
              />
            </View>

            <View className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
              <Text className="text-white font-semibold mb-3">Status</Text>
              <View className="flex-row">
                {STATUSES.map((status) => (
                  <TouchableOpacity
                    key={status}
                    className={`flex-1 py-2 rounded-lg mx-1 ${
                      selectedGoal.status === status ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                    onPress={() => handleUpdateStatus(selectedGoal.id, status)}
                    disabled={updating}
                  >
                    <Text className="text-white text-center text-sm capitalize">{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
              <View className="flex-row items-center">
                <FontAwesome name="calendar" size={16} color="#94a3b8" />
                <Text className="text-slate-400 ml-2">Target Date</Text>
              </View>
              <Text className="text-white text-lg mt-2">
                {selectedGoal.target_date
                  ? new Date(selectedGoal.target_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'No target date set'}
              </Text>
            </View>

            {selectedGoal.milestones && selectedGoal.milestones.length > 0 && (
              <View className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
                <Text className="text-white font-semibold mb-3">Milestones</Text>
                {selectedGoal.milestones.map((milestone, index) => (
                  <View
                    key={index}
                    className={`flex-row items-center py-2 ${
                      index < selectedGoal.milestones.length - 1 ? 'border-b border-slate-700' : ''
                    }`}
                  >
                    <View
                      className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                        milestone.completed ? 'bg-green-500 border-green-500' : 'border-slate-500'
                      }`}
                    >
                      {milestone.completed && <FontAwesome name="check" size={10} color="#fff" />}
                    </View>
                    <Text className={`flex-1 ${milestone.completed ? 'text-slate-500 line-through' : 'text-white'}`}>
                      {milestone.title}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
              <Text className="text-white font-semibold mb-2">Priority</Text>
              <Text className="text-yellow-400 text-lg">
                {'★'.repeat(selectedGoal.priority || 3)}{'☆'.repeat(5 - (selectedGoal.priority || 3))}
              </Text>
            </View>

            {selectedGoal.notes && (
              <View className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
                <Text className="text-white font-semibold mb-2">Notes</Text>
                <Text className="text-slate-300">{selectedGoal.notes}</Text>
              </View>
            )}

            <View className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
              <View className="flex-row items-center mb-3">
                <FontAwesome name="cloud" size={16} color="#5eead4" />
                <Text className="text-white font-semibold ml-2">
                  Linked Dreams ({linkedDreams.length})
                </Text>
              </View>
              {loadingDreams ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : linkedDreams.length === 0 ? (
                <Text className="text-slate-500 text-sm">No dreams linked to this goal yet.</Text>
              ) : (
                linkedDreams.map((dream) => (
                  <View key={dream.id} className="bg-slate-700/50 rounded-lg p-3 mb-2">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1 mr-2">
                        <Text className="text-lg mr-2">
                          {['😫', '😞', '😐', '😊', '🌟'][Math.min(Math.max(dream.mood - 1, 0), 4)]}
                        </Text>
                        <Text className="text-white font-medium text-sm flex-1" numberOfLines={1}>
                          {dream.title}
                        </Text>
                      </View>
                      <Text className="text-slate-400 text-xs">
                        {new Date(dream.dream_date).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric',
                        })}
                      </Text>
                    </View>
                    <Text className="text-slate-400 text-xs mt-1" numberOfLines={1}>
                      {dream.content}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Dream Alignment */}
            {alignment ? (
              <View className="bg-indigo-900/40 rounded-xl p-4 mb-4 border border-indigo-700">
                <View className="flex-row items-center mb-3">
                  <FontAwesome name="star" size={16} color="#a5b4fc" />
                  <Text className="text-indigo-300 font-semibold ml-2">Dream Alignment</Text>
                </View>
                <View className="flex-row items-center mb-3">
                  <Text className={`text-2xl font-bold ${
                    alignment.alignment_score >= 0.7 ? 'text-green-400' :
                    alignment.alignment_score >= 0.4 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {Math.round(alignment.alignment_score * 100)}%
                  </Text>
                  <View className="flex-1 ml-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <View
                      className={`h-full rounded-full ${
                        alignment.alignment_score >= 0.7 ? 'bg-green-500' :
                        alignment.alignment_score >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${alignment.alignment_score * 100}%` }}
                    />
                  </View>
                </View>
                <Text className="text-slate-300 text-sm leading-5 mb-2">{alignment.analysis}</Text>
                {alignment.relevant_themes.length > 0 && (
                  <View className="flex-row flex-wrap gap-1 mt-1">
                    {alignment.relevant_themes.map((theme, i) => (
                      <View key={i} className="bg-indigo-600/30 px-2 py-1 rounded">
                        <Text className="text-indigo-400 text-xs">{theme}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity
                className="bg-slate-800 border border-slate-700 rounded-xl py-4 mb-4 flex-row items-center justify-center"
                onPress={() => handleDreamAlignment(selectedGoal.id)}
                disabled={loadingAlignment}
              >
                {loadingAlignment ? (
                  <ActivityIndicator size="small" color="#a5b4fc" />
                ) : (
                  <>
                    <FontAwesome name="star" size={16} color="#a5b4fc" />
                    <Text className="text-indigo-300 font-semibold ml-2">Dream Alignment</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="bg-indigo-600 rounded-xl py-4 mb-4 flex-row items-center justify-center"
              onPress={() => handleGetAISuggestions(selectedGoal.id)}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <FontAwesome name="magic" size={18} color="#fff" />
                  <Text className="text-white font-semibold ml-2">Get AI Suggestions</Text>
                </>
              )}
            </TouchableOpacity>

            {selectedGoal.ai_suggestions && (
              <View className="bg-indigo-900/50 rounded-xl p-4 mb-4 border border-indigo-700">
                <View className="flex-row items-center mb-2">
                  <FontAwesome name="lightbulb-o" size={16} color="#a5b4fc" />
                  <Text className="text-indigo-300 font-semibold ml-2">AI Suggestions</Text>
                </View>
                <Text className="text-slate-300">{selectedGoal.ai_suggestions}</Text>
              </View>
            )}

            <View className="h-20" />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="text-slate-400 mt-4">Loading goals...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900" edges={['top']}>
      <View className="px-4 py-3 border-b border-slate-800">
        <View className="flex-row justify-between items-center">
          <Text className="text-white text-2xl font-bold">Goals</Text>
          <TouchableOpacity
            className={`p-2 rounded-lg ${showFilters ? 'bg-indigo-600' : 'bg-slate-800'}`}
            onPress={() => setShowFilters(!showFilters)}
          >
            <FontAwesome name="filter" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center gap-2 mt-3">
          <View className="flex-1 bg-slate-800 rounded-xl flex-row items-center px-3">
            <FontAwesome name="search" size={14} color="#64748b" />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder="Search goals..."
              placeholderTextColor="#64748b"
              className="flex-1 text-white py-2.5 ml-2 text-sm"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setDebouncedQuery(''); }}>
                <FontAwesome name="times-circle" size={14} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {showFilters && (
          <View className="mt-3">
            <Text className="text-slate-400 text-sm mb-2">Min Priority</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[0, 1, 2, 3, 4, 5].map((p) => (
                <TouchableOpacity
                  key={p}
                  className={`px-3 py-1.5 rounded-full mr-2 ${priorityMin === p ? 'bg-indigo-600' : 'bg-slate-700'}`}
                  onPress={() => setPriorityMin(p)}
                >
                  <Text className="text-white text-sm">{p === 0 ? 'All' : `${p}+`}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <FlatList
        data={groupedGoals}
        keyExtractor={(item) => item.status}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
        ListHeaderComponent={
          <>
            {showFilters && renderFilters()}
            {error && (
              <View className="bg-red-900/50 rounded-xl p-4 mb-4 border border-red-700">
                <Text className="text-red-300">{error}</Text>
                <TouchableOpacity
                  className="mt-2 bg-red-600 rounded-lg py-2 px-4 self-start"
                  onPress={fetchGoals}
                >
                  <Text className="text-white">Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
        renderItem={({ item: group }) => (
          <View>
            {renderSectionHeader(group.status, group.data.length)}
            {group.data.map((goal) => (
              <View key={goal.id}>{renderGoalCard({ item: goal })}</View>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <FontAwesome name="flag-o" size={64} color="#475569" />
            <Text className="text-slate-400 text-lg mt-4 text-center">No goals yet</Text>
            <Text className="text-slate-500 text-center mt-1">
              Tap the + button to create your first goal
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-full items-center justify-center shadow-lg"
        style={{
          shadowColor: '#6366f1',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.8}
      >
        <FontAwesome name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {renderCreateModal()}
      {renderDetailModal()}
    </SafeAreaView>
  );
}
