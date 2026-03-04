import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { sleepApi, dreamsApi, SleepLog, SleepLogCreate, Dream, SleepStats, SleepCorrelation } from '@/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
};

const calculateDuration = (sleepTime: string, wakeTime: string) => {
  const sleep = new Date(sleepTime);
  const wake = new Date(wakeTime);
  let diff = wake.getTime() - sleep.getTime();
  if (diff < 0) diff += 24 * 60 * 60 * 1000;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes, totalMinutes: hours * 60 + minutes };
};

const QualityStars = ({ quality }: { quality: number }) => (
  <View className="flex-row">
    {[1, 2, 3, 4, 5].map((star) => (
      <FontAwesome
        key={star}
        name={star <= quality ? 'star' : 'star-o'}
        size={14}
        color={star <= quality ? '#fbbf24' : '#475569'}
        style={{ marginRight: 2 }}
      />
    ))}
  </View>
);

const positionOptions = ['Back', 'Side (Left)', 'Side (Right)', 'Stomach', 'Mixed'];
const stressLabels = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];

export default function SleepScreen() {
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [stats, setStats] = useState<SleepStats | null>(null);
  const [correlations, setCorrelations] = useState<SleepCorrelation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [qualityMin, setQualityMin] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showSortPicker, setShowSortPicker] = useState(false);

  const [sleepDate, setSleepDate] = useState(new Date());
  const [sleepTime, setSleepTime] = useState(new Date(new Date().setHours(22, 0, 0, 0)));
  const [wakeTime, setWakeTime] = useState(new Date(new Date().setHours(6, 0, 0, 0)));
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState('');
  const [selectedDreamId, setSelectedDreamId] = useState<number | null>(null);
  const [sleepPosition, setSleepPosition] = useState('');
  const [preSleepActivity, setPreSleepActivity] = useState('');
  const [caffeineIntake, setCaffeineIntake] = useState(false);
  const [exerciseToday, setExerciseToday] = useState(false);
  const [stressLevel, setStressLevel] = useState(0);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSleepTimePicker, setShowSleepTimePicker] = useState(false);
  const [showWakeTimePicker, setShowWakeTimePicker] = useState(false);
  const [showDreamPicker, setShowDreamPicker] = useState(false);
  const [showPositionPicker, setShowPositionPicker] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const sleepParams: { quality_min?: number; sort_by?: string; sort_order?: string } = {};
      if (qualityMin > 0) sleepParams.quality_min = qualityMin;
      sleepParams.sort_by = sortBy;
      sleepParams.sort_order = sortOrder;

      const [logsData, dreamsData, statsData, corrData] = await Promise.all([
        sleepApi.getAll(sleepParams),
        dreamsApi.getAll({ limit: 20 }),
        sleepApi.getStats().catch(() => null),
        sleepApi.getCorrelations().catch(() => null),
      ]);
      setSleepLogs(logsData);
      setDreams(dreamsData);
      setStats(statsData);
      setCorrelations(corrData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [qualityMin, sortBy, sortOrder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const calculateLocalStats = () => {
    if (sleepLogs.length === 0) {
      return { avgDuration: 0, avgQuality: 0 };
    }

    let totalMinutes = 0;
    let totalQuality = 0;

    sleepLogs.forEach((log) => {
      const { totalMinutes: duration } = calculateDuration(log.sleep_time, log.wake_time);
      totalMinutes += duration;
      totalQuality += log.quality;
    });

    return {
      avgDuration: totalMinutes / sleepLogs.length,
      avgQuality: totalQuality / sleepLogs.length,
    };
  };

  const localStats = calculateLocalStats();
  const avgHours = Math.floor(localStats.avgDuration / 60);
  const avgMinutes = Math.round(localStats.avgDuration % 60);

  const resetForm = () => {
    setSleepDate(new Date());
    setSleepTime(new Date(new Date().setHours(22, 0, 0, 0)));
    setWakeTime(new Date(new Date().setHours(6, 0, 0, 0)));
    setQuality(3);
    setNotes('');
    setSelectedDreamId(null);
    setSleepPosition('');
    setPreSleepActivity('');
    setCaffeineIntake(false);
    setExerciseToday(false);
    setStressLevel(0);
  };

  const handleLogSleep = async () => {
    try {
      const sleepDateTime = new Date(sleepDate);
      sleepDateTime.setHours(sleepTime.getHours(), sleepTime.getMinutes(), 0, 0);
      
      const wakeDateTime = new Date(sleepDate);
      wakeDateTime.setHours(wakeTime.getHours(), wakeTime.getMinutes(), 0, 0);
      
      if (wakeDateTime <= sleepDateTime) {
        wakeDateTime.setDate(wakeDateTime.getDate() + 1);
      }

      const { totalMinutes } = calculateDuration(
        sleepDateTime.toISOString(),
        wakeDateTime.toISOString()
      );

      const logData: SleepLogCreate = {
        sleep_time: sleepDateTime.toISOString(),
        wake_time: wakeDateTime.toISOString(),
        quality,
        notes: notes.trim() || undefined,
        dream_id: selectedDreamId || undefined,
        sleep_duration_minutes: totalMinutes > 0 ? totalMinutes : undefined,
        sleep_position: sleepPosition || undefined,
        pre_sleep_activity: preSleepActivity.trim() || undefined,
        caffeine_intake: caffeineIntake,
        exercise_today: exerciseToday,
        stress_level: stressLevel > 0 ? stressLevel : undefined,
      };

      const created = await sleepApi.create(logData);
      setSleepLogs((prev) => [created, ...prev]);
      setModalVisible(false);
      resetForm();
      sleepApi.getStats().then(setStats).catch(() => {});
      sleepApi.getCorrelations().then(setCorrelations).catch(() => {});
    } catch (error) {
      Alert.alert('Error', 'Failed to log sleep');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Sleep Log', 'Are you sure you want to delete this log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await sleepApi.delete(id);
            setSleepLogs((prev) => prev.filter((l) => l.id !== id));
            sleepApi.getStats().then(setStats).catch(() => {});
          } catch (error) {
            Alert.alert('Error', 'Failed to delete sleep log');
          }
        },
      },
    ]);
  };

  const renderSleepLog = ({ item }: { item: SleepLog }) => {
    const { hours, minutes } = calculateDuration(item.sleep_time, item.wake_time);
    const linkedDream = dreams.find((d) => d.id === item.dream_id);

    return (
      <TouchableOpacity
        onLongPress={() => handleDelete(item.id)}
        className="bg-slate-800 rounded-xl p-4 mb-3 mx-4"
        activeOpacity={0.7}
      >
        <View className="flex-row justify-between items-start mb-3">
          <View>
            <Text className="text-white text-lg font-semibold">
              {formatDate(item.sleep_time)}
            </Text>
            <View className="flex-row items-center mt-1">
              <FontAwesome name="moon-o" size={12} color="#94a3b8" />
              <Text className="text-slate-400 text-sm ml-2">
                {formatTime(item.sleep_time)}
              </Text>
              <Text className="text-slate-500 mx-2">→</Text>
              <FontAwesome name="sun-o" size={12} color="#fbbf24" />
              <Text className="text-slate-400 text-sm ml-2">
                {formatTime(item.wake_time)}
              </Text>
            </View>
          </View>
          <QualityStars quality={item.quality} />
        </View>

        <View className="flex-row items-center justify-between">
          <View className="bg-indigo-600/30 px-3 py-2 rounded-lg flex-row items-center">
            <FontAwesome name="clock-o" size={14} color="#a5b4fc" />
            <Text className="text-indigo-300 font-semibold ml-2">
              {hours}h {minutes}m
            </Text>
          </View>

          {linkedDream && (
            <View className="bg-purple-600/30 px-3 py-2 rounded-lg flex-row items-center max-w-[50%]">
              <FontAwesome name="cloud" size={12} color="#c4b5fd" />
              <Text
                className="text-purple-300 text-sm ml-2"
                numberOfLines={1}
              >
                {linkedDream.title}
              </Text>
            </View>
          )}
        </View>

        {(item.caffeine_intake || item.exercise_today || item.stress_level || item.sleep_position) && (
          <View className="flex-row flex-wrap gap-2 mt-3">
            {item.caffeine_intake && (
              <View className="bg-amber-600/20 px-2 py-1 rounded-full flex-row items-center">
                <FontAwesome name="coffee" size={10} color="#fbbf24" />
                <Text className="text-amber-300 text-xs ml-1">Caffeine</Text>
              </View>
            )}
            {item.exercise_today && (
              <View className="bg-green-600/20 px-2 py-1 rounded-full flex-row items-center">
                <FontAwesome name="heartbeat" size={10} color="#34d399" />
                <Text className="text-green-300 text-xs ml-1">Exercise</Text>
              </View>
            )}
            {item.stress_level && (
              <View className="bg-red-600/20 px-2 py-1 rounded-full flex-row items-center">
                <FontAwesome name="bolt" size={10} color="#f87171" />
                <Text className="text-red-300 text-xs ml-1">Stress {item.stress_level}/5</Text>
              </View>
            )}
            {item.sleep_position && (
              <View className="bg-slate-700 px-2 py-1 rounded-full">
                <Text className="text-slate-400 text-xs">{item.sleep_position}</Text>
              </View>
            )}
          </View>
        )}

        {item.notes && (
          <View className="mt-3 pt-3 border-t border-slate-700">
            <Text className="text-slate-400 text-sm">{item.notes}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderStats = () => (
    <View className="flex-row gap-3 px-4 mb-4">
      <View className="flex-1 bg-slate-800 rounded-xl p-4">
        <View className="flex-row items-center mb-2">
          <FontAwesome name="clock-o" size={16} color="#6366f1" />
          <Text className="text-slate-400 text-sm ml-2">Avg. Duration</Text>
        </View>
        <Text className="text-white text-2xl font-bold">
          {stats?.avg_duration != null
            ? `${Math.floor(stats.avg_duration / 60)}h ${Math.round(stats.avg_duration % 60)}m`
            : sleepLogs.length > 0
              ? `${avgHours}h ${avgMinutes}m`
              : '--'}
        </Text>
      </View>

      <View className="flex-1 bg-slate-800 rounded-xl p-4">
        <View className="flex-row items-center mb-2">
          <FontAwesome name="star" size={16} color="#fbbf24" />
          <Text className="text-slate-400 text-sm ml-2">Avg. Quality</Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-white text-2xl font-bold mr-2">
            {stats ? stats.avg_quality.toFixed(1) : sleepLogs.length > 0 ? localStats.avgQuality.toFixed(1) : '--'}
          </Text>
          {(stats || sleepLogs.length > 0) && (
            <QualityStars quality={Math.round(stats?.avg_quality ?? localStats.avgQuality)} />
          )}
        </View>
      </View>
    </View>
  );

  const renderAnalytics = () => {
    if (!showAnalytics) return null;

    return (
      <View className="px-4 mb-4">
        {stats && stats.quality_trend.length > 0 && (
          <View className="bg-slate-800 rounded-xl p-4 mb-3">
            <Text className="text-white font-semibold mb-3">Quality Trend</Text>
            <View className="flex-row items-end h-16 gap-1">
              {stats.quality_trend.slice(-10).map((point, i) => (
                <View key={i} className="flex-1 items-center">
                  <View
                    className="w-full bg-indigo-500 rounded-t"
                    style={{ height: `${point.quality * 20}%` }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {correlations && correlations.mood_vs_quality.length > 0 && (
          <View className="bg-slate-800 rounded-xl p-4 mb-3">
            <Text className="text-white font-semibold mb-3">Mood vs Sleep Quality</Text>
            {correlations.mood_vs_quality.slice(-5).map((point, i) => (
              <View key={i} className="flex-row items-center justify-between py-2 border-b border-slate-700">
                <Text className="text-slate-400 text-sm">
                  {new Date(point.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </Text>
                <View className="flex-row items-center gap-4">
                  <Text className="text-purple-300 text-sm">Mood {point.mood}</Text>
                  <Text className="text-indigo-300 text-sm">Quality {point.quality}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {correlations && correlations.duration_vs_vividness.length > 0 && (
          <View className="bg-slate-800 rounded-xl p-4 mb-3">
            <Text className="text-white font-semibold mb-3">Duration vs Vividness</Text>
            {correlations.duration_vs_vividness.slice(-5).map((point, i) => (
              <View key={i} className="flex-row items-center justify-between py-2 border-b border-slate-700">
                <Text className="text-slate-400 text-sm">
                  {new Date(point.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </Text>
                <View className="flex-row items-center gap-4">
                  <Text className="text-blue-300 text-sm">
                    {Math.floor(point.duration_minutes / 60)}h{point.duration_minutes % 60}m
                  </Text>
                  <Text className="text-yellow-300 text-sm">Vivid {point.vividness}/5</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {(!correlations || (correlations.mood_vs_quality.length === 0 && correlations.duration_vs_vividness.length === 0)) &&
          (!stats || stats.quality_trend.length === 0) && (
          <View className="bg-slate-800 rounded-xl p-6 items-center">
            <FontAwesome name="bar-chart" size={32} color="#475569" />
            <Text className="text-slate-500 mt-3 text-center">
              Log more sleep with linked dreams to see analytics
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderModal = () => (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-slate-900 rounded-t-3xl max-h-[90%]">
          <ScrollView className="p-6" bounces={false}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-xl font-bold">Log Sleep</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <FontAwesome name="times" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-400 text-sm mb-2">Sleep Date</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="bg-slate-800 p-4 rounded-xl mb-4 flex-row items-center"
            >
              <FontAwesome name="calendar" size={18} color="#6366f1" />
              <Text className="text-white text-base ml-3">
                {sleepDate.toLocaleDateString([], {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={sleepDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setSleepDate(date);
                }}
                themeVariant="dark"
              />
            )}

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-slate-400 text-sm mb-2">Sleep Time</Text>
                <TouchableOpacity
                  onPress={() => setShowSleepTimePicker(true)}
                  className="bg-slate-800 p-4 rounded-xl flex-row items-center"
                >
                  <FontAwesome name="moon-o" size={18} color="#94a3b8" />
                  <Text className="text-white text-base ml-3">
                    {sleepTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
                {showSleepTimePicker && (
                  <DateTimePicker
                    value={sleepTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, time) => {
                      setShowSleepTimePicker(Platform.OS === 'ios');
                      if (time) setSleepTime(time);
                    }}
                    themeVariant="dark"
                  />
                )}
              </View>

              <View className="flex-1">
                <Text className="text-slate-400 text-sm mb-2">Wake Time</Text>
                <TouchableOpacity
                  onPress={() => setShowWakeTimePicker(true)}
                  className="bg-slate-800 p-4 rounded-xl flex-row items-center"
                >
                  <FontAwesome name="sun-o" size={18} color="#fbbf24" />
                  <Text className="text-white text-base ml-3">
                    {wakeTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
                {showWakeTimePicker && (
                  <DateTimePicker
                    value={wakeTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, time) => {
                      setShowWakeTimePicker(Platform.OS === 'ios');
                      if (time) setWakeTime(time);
                    }}
                    themeVariant="dark"
                  />
                )}
              </View>
            </View>

            <View className="bg-slate-800/50 p-3 rounded-xl mb-4">
              <View className="flex-row justify-center items-center">
                <FontAwesome name="clock-o" size={16} color="#a5b4fc" />
                <Text className="text-indigo-300 font-semibold ml-2">
                  Duration: {(() => {
                    const sleepDateTime = new Date(sleepDate);
                    sleepDateTime.setHours(sleepTime.getHours(), sleepTime.getMinutes());
                    const wakeDateTime = new Date(sleepDate);
                    wakeDateTime.setHours(wakeTime.getHours(), wakeTime.getMinutes());
                    if (wakeDateTime <= sleepDateTime) {
                      wakeDateTime.setDate(wakeDateTime.getDate() + 1);
                    }
                    const { hours, minutes } = calculateDuration(
                      sleepDateTime.toISOString(),
                      wakeDateTime.toISOString()
                    );
                    return `${hours}h ${minutes}m`;
                  })()}
                </Text>
              </View>
            </View>

            <Text className="text-slate-400 text-sm mb-2">
              Sleep Quality: {quality}/5
            </Text>
            <View className="bg-slate-800 rounded-xl p-4 mb-4">
              <View className="flex-row justify-center mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FontAwesome
                    key={star}
                    name={star <= quality ? 'star' : 'star-o'}
                    size={24}
                    color={star <= quality ? '#fbbf24' : '#475569'}
                    style={{ marginHorizontal: 4 }}
                  />
                ))}
              </View>
              <Slider
                value={quality}
                onValueChange={(val) => setQuality(Math.round(val))}
                minimumValue={1}
                maximumValue={5}
                step={1}
                minimumTrackTintColor="#6366f1"
                maximumTrackTintColor="#334155"
                thumbTintColor="#6366f1"
              />
              <View className="flex-row justify-between mt-1">
                <Text className="text-slate-500 text-xs">Poor</Text>
                <Text className="text-slate-500 text-xs">Excellent</Text>
              </View>
            </View>

            {/* Sleep Position */}
            <Text className="text-slate-400 text-sm mb-2">Sleep Position</Text>
            <TouchableOpacity
              onPress={() => setShowPositionPicker(true)}
              className="bg-slate-800 p-4 rounded-xl mb-4 flex-row items-center justify-between"
            >
              <Text className={sleepPosition ? 'text-white' : 'text-slate-500'}>
                {sleepPosition || 'Select position'}
              </Text>
              <FontAwesome name="chevron-down" size={14} color="#64748b" />
            </TouchableOpacity>

            {/* Stress Level */}
            <Text className="text-slate-400 text-sm mb-2">
              Stress Level: {stressLevel > 0 ? `${stressLevel}/5 - ${stressLabels[stressLevel - 1]}` : 'None'}
            </Text>
            <View className="bg-slate-800 rounded-xl p-4 mb-4">
              <Slider
                value={stressLevel}
                onValueChange={(val) => setStressLevel(Math.round(val))}
                minimumValue={0}
                maximumValue={5}
                step={1}
                minimumTrackTintColor="#ef4444"
                maximumTrackTintColor="#334155"
                thumbTintColor="#ef4444"
              />
              <View className="flex-row justify-between mt-1">
                <Text className="text-slate-500 text-xs">None</Text>
                <Text className="text-slate-500 text-xs">Very High</Text>
              </View>
            </View>

            {/* Pre-Sleep Activity */}
            <Text className="text-slate-400 text-sm mb-2">Pre-Sleep Activity (optional)</Text>
            <TextInput
              value={preSleepActivity}
              onChangeText={setPreSleepActivity}
              placeholder="Reading, meditating, scrolling..."
              placeholderTextColor="#64748b"
              className="bg-slate-800 text-white p-4 rounded-xl mb-4"
            />

            {/* Toggles */}
            <View className="flex-row justify-between items-center bg-slate-800 p-4 rounded-xl mb-3">
              <View className="flex-row items-center">
                <FontAwesome name="coffee" size={16} color="#fbbf24" />
                <Text className="text-white ml-3">Caffeine today</Text>
              </View>
              <Switch
                value={caffeineIntake}
                onValueChange={setCaffeineIntake}
                trackColor={{ false: '#334155', true: '#6366f1' }}
                thumbColor={caffeineIntake ? '#a5b4fc' : '#94a3b8'}
              />
            </View>

            <View className="flex-row justify-between items-center bg-slate-800 p-4 rounded-xl mb-4">
              <View className="flex-row items-center">
                <FontAwesome name="heartbeat" size={16} color="#34d399" />
                <Text className="text-white ml-3">Exercise today</Text>
              </View>
              <Switch
                value={exerciseToday}
                onValueChange={setExerciseToday}
                trackColor={{ false: '#334155', true: '#6366f1' }}
                thumbColor={exerciseToday ? '#a5b4fc' : '#94a3b8'}
              />
            </View>

            <Text className="text-slate-400 text-sm mb-2">Notes (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="How did you feel? Any interruptions?"
              placeholderTextColor="#64748b"
              multiline
              className="bg-slate-800 text-white p-4 rounded-xl mb-4"
              style={{ minHeight: 80 }}
            />

            <Text className="text-slate-400 text-sm mb-2">Link Dream (optional)</Text>
            <TouchableOpacity
              onPress={() => setShowDreamPicker(true)}
              className="bg-slate-800 p-4 rounded-xl mb-6 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1">
                <FontAwesome name="cloud" size={18} color="#c4b5fd" />
                <Text
                  className={`ml-3 ${
                    selectedDreamId ? 'text-white' : 'text-slate-500'
                  }`}
                  numberOfLines={1}
                >
                  {selectedDreamId
                    ? dreams.find((d) => d.id === selectedDreamId)?.title ||
                      'Select dream'
                    : 'Select dream'}
                </Text>
              </View>
              <FontAwesome name="chevron-down" size={14} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogSleep}
              className="bg-indigo-600 py-4 rounded-xl mb-8"
            >
              <Text className="text-white text-center font-bold text-lg">
                Save Sleep Log
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Position Picker Modal */}
      <Modal
        visible={showPositionPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPositionPicker(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center"
          activeOpacity={1}
          onPress={() => setShowPositionPicker(false)}
        >
          <View className="bg-slate-800 rounded-2xl p-4 w-80">
            <Text className="text-white text-lg font-bold mb-4 text-center">
              Sleep Position
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSleepPosition('');
                setShowPositionPicker(false);
              }}
              className={`py-3 px-4 rounded-xl mb-2 ${!sleepPosition ? 'bg-indigo-600' : 'bg-slate-700'}`}
            >
              <Text className="text-white">Not specified</Text>
            </TouchableOpacity>
            {positionOptions.map((pos) => (
              <TouchableOpacity
                key={pos}
                onPress={() => {
                  setSleepPosition(pos);
                  setShowPositionPicker(false);
                }}
                className={`py-3 px-4 rounded-xl mb-2 ${
                  sleepPosition === pos ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <Text className="text-white">{pos}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Dream Picker Modal */}
      <Modal
        visible={showDreamPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDreamPicker(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center"
          activeOpacity={1}
          onPress={() => setShowDreamPicker(false)}
        >
          <View className="bg-slate-800 rounded-2xl p-4 w-80 max-h-96">
            <Text className="text-white text-lg font-bold mb-4 text-center">
              Link a Dream
            </Text>
            <ScrollView>
              <TouchableOpacity
                onPress={() => {
                  setSelectedDreamId(null);
                  setShowDreamPicker(false);
                }}
                className={`py-3 px-4 rounded-xl mb-2 ${
                  !selectedDreamId ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <Text className="text-white">No dream</Text>
              </TouchableOpacity>
              {dreams.map((dream) => (
                <TouchableOpacity
                  key={dream.id}
                  onPress={() => {
                    setSelectedDreamId(dream.id);
                    setShowDreamPicker(false);
                  }}
                  className={`py-3 px-4 rounded-xl mb-2 ${
                    selectedDreamId === dream.id ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <Text className="text-white font-semibold" numberOfLines={1}>
                    {dream.title}
                  </Text>
                  <Text className="text-slate-400 text-xs mt-1">
                    {new Date(dream.dream_date).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-white text-2xl font-bold">🌙 Sleep</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setShowAnalytics(!showAnalytics)}
              className="bg-slate-800 px-4 py-2 rounded-xl flex-row items-center"
            >
              <FontAwesome name="bar-chart" size={14} color="#a5b4fc" />
              <Text className="text-indigo-300 font-semibold ml-2">Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className="bg-indigo-600 px-4 py-2 rounded-xl flex-row items-center"
            >
              <FontAwesome name="plus" size={14} color="white" />
              <Text className="text-white font-semibold ml-2">Log Sleep</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row items-center gap-2 mb-2">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
            <Text className="text-slate-400 text-xs mr-2 self-center">Quality:</Text>
            {[0, 1, 2, 3, 4, 5].map((q) => (
              <TouchableOpacity
                key={q}
                className={`px-3 py-1.5 rounded-full mr-2 ${qualityMin === q ? 'bg-indigo-600' : 'bg-slate-800'}`}
                onPress={() => setQualityMin(q)}
              >
                <Text className="text-white text-xs">{q === 0 ? 'All' : `${q}+`}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            onPress={() => setShowSortPicker(true)}
            className="bg-slate-800 p-2.5 rounded-xl"
          >
            <FontAwesome name="sort" size={16} color="#a5b4fc" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showSortPicker} transparent animationType="fade" onRequestClose={() => setShowSortPicker(false)}>
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center"
          activeOpacity={1}
          onPress={() => setShowSortPicker(false)}
        >
          <View className="bg-slate-800 rounded-2xl p-4 w-72">
            <Text className="text-white text-lg font-bold mb-4 text-center">Sort By</Text>
            {[
              { label: 'Newest First', sb: 'date', so: 'desc' },
              { label: 'Oldest First', sb: 'date', so: 'asc' },
              { label: 'Quality (High)', sb: 'quality', so: 'desc' },
              { label: 'Quality (Low)', sb: 'quality', so: 'asc' },
              { label: 'Duration (Longest)', sb: 'duration', so: 'desc' },
              { label: 'Duration (Shortest)', sb: 'duration', so: 'asc' },
            ].map((opt) => (
              <TouchableOpacity
                key={`${opt.sb}-${opt.so}`}
                onPress={() => { setSortBy(opt.sb); setSortOrder(opt.so); setShowSortPicker(false); }}
                className={`py-3 px-4 rounded-xl mb-2 ${
                  sortBy === opt.sb && sortOrder === opt.so ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <Text className="text-white text-center">{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {renderStats()}
      {renderAnalytics()}

      <FlatList
        data={sleepLogs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderSleepLog}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-20">
              <FontAwesome name="moon-o" size={48} color="#475569" />
              <Text className="text-slate-500 text-lg mt-4">No sleep logs yet</Text>
              <Text className="text-slate-600 text-sm mt-1">
                Tap "Log Sleep" to track your sleep
              </Text>
            </View>
          ) : null
        }
      />

      {renderModal()}
    </SafeAreaView>
  );
}
