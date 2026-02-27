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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { sleepApi, dreamsApi, SleepLog, SleepLogCreate, Dream } from '@/api';
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

export default function SleepScreen() {
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [sleepDate, setSleepDate] = useState(new Date());
  const [sleepTime, setSleepTime] = useState(new Date(new Date().setHours(22, 0, 0, 0)));
  const [wakeTime, setWakeTime] = useState(new Date(new Date().setHours(6, 0, 0, 0)));
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState('');
  const [selectedDreamId, setSelectedDreamId] = useState<number | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSleepTimePicker, setShowSleepTimePicker] = useState(false);
  const [showWakeTimePicker, setShowWakeTimePicker] = useState(false);
  const [showDreamPicker, setShowDreamPicker] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [logsData, dreamsData] = await Promise.all([
        sleepApi.getAll(),
        dreamsApi.getAll({ limit: 20 }),
      ]);
      setSleepLogs(logsData.sort((a, b) => 
        new Date(b.sleep_time).getTime() - new Date(a.sleep_time).getTime()
      ));
      setDreams(dreamsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const calculateStats = () => {
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

  const stats = calculateStats();
  const avgHours = Math.floor(stats.avgDuration / 60);
  const avgMinutes = Math.round(stats.avgDuration % 60);

  const resetForm = () => {
    setSleepDate(new Date());
    setSleepTime(new Date(new Date().setHours(22, 0, 0, 0)));
    setWakeTime(new Date(new Date().setHours(6, 0, 0, 0)));
    setQuality(3);
    setNotes('');
    setSelectedDreamId(null);
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

      const logData: SleepLogCreate = {
        sleep_time: sleepDateTime.toISOString(),
        wake_time: wakeDateTime.toISOString(),
        quality,
        notes: notes.trim() || undefined,
        dream_id: selectedDreamId || undefined,
      };

      const created = await sleepApi.create(logData);
      setSleepLogs((prev) => [created, ...prev]);
      setModalVisible(false);
      resetForm();
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
          {sleepLogs.length > 0 ? `${avgHours}h ${avgMinutes}m` : '--'}
        </Text>
      </View>

      <View className="flex-1 bg-slate-800 rounded-xl p-4">
        <View className="flex-row items-center mb-2">
          <FontAwesome name="star" size={16} color="#fbbf24" />
          <Text className="text-slate-400 text-sm ml-2">Avg. Quality</Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-white text-2xl font-bold mr-2">
            {sleepLogs.length > 0 ? stats.avgQuality.toFixed(1) : '--'}
          </Text>
          {sleepLogs.length > 0 && (
            <QualityStars quality={Math.round(stats.avgQuality)} />
          )}
        </View>
      </View>
    </View>
  );

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
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-2xl font-bold">🌙 Sleep</Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="bg-indigo-600 px-4 py-2 rounded-xl flex-row items-center"
          >
            <FontAwesome name="plus" size={14} color="white" />
            <Text className="text-white font-semibold ml-2">Log Sleep</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderStats()}

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
