import React, { useState, useEffect, useCallback } from 'react';
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
import { goalsApi, Goal, GoalCreate } from '@/api';

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

  const [newGoal, setNewGoal] = useState<GoalCreate>({
    title: '',
    description: '',
    category: 'Personal',
    target_date: undefined,
    milestones: [],
  });
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      setError(null);
      const params: { status?: string; category?: string } = {};
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      
      const data = await goalsApi.getAll(params);
      setGoals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStatus, filterCategory]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

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
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-slate-800">
        <Text className="text-white text-2xl font-bold">Goals</Text>
        <TouchableOpacity
          className={`p-2 rounded-lg ${showFilters ? 'bg-indigo-600' : 'bg-slate-800'}`}
          onPress={() => setShowFilters(!showFilters)}
        >
          <FontAwesome name="filter" size={18} color="#fff" />
        </TouchableOpacity>
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
