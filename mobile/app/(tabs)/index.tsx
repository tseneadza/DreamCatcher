import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/context/AuthContext';
import { dreamsApi, goalsApi, ideasApi, sleepApi, aiApi } from '@/api';
import type { InsightsResponse, SleepStats, PatternAnalysis } from '@/api/types';

interface DashboardStats {
  totalDreams: number;
  activeGoals: number;
  ideasCaptured: number;
  avgSleepQuality: number | null;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}

function StatCard({ title, value, icon, iconColor }: StatCardProps) {
  return (
    <View className="bg-slate-800 rounded-2xl p-4 flex-1 min-w-[45%] m-1">
      <View className="flex-row items-center justify-between mb-2">
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text className="text-white text-2xl font-bold">{value}</Text>
      <Text className="text-slate-400 text-sm mt-1">{title}</Text>
    </View>
  );
}

interface InsightCardProps {
  title: string;
  content: string | null;
  icon: keyof typeof Ionicons.glyphMap;
}

function InsightCard({ title, content, icon }: InsightCardProps) {
  if (!content) return null;
  
  return (
    <View className="bg-slate-800 rounded-2xl p-4 mb-3">
      <View className="flex-row items-center mb-2">
        <Ionicons name={icon} size={20} color="#818cf8" />
        <Text className="text-indigo-400 font-semibold ml-2">{title}</Text>
      </View>
      <Text className="text-slate-300 text-sm leading-5">{content}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalDreams: 0,
    activeGoals: 0,
    ideasCaptured: 0,
    avgSleepQuality: null,
  });
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [patterns, setPatterns] = useState<PatternAnalysis | null>(null);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [sleepStats, setSleepStats] = useState<SleepStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const [dreams, goals, ideas, sleepLogs, sStats] = await Promise.all([
        dreamsApi.getAll(),
        goalsApi.getAll(),
        ideasApi.getAll(),
        sleepApi.getAll(),
        sleepApi.getStats().catch(() => null),
      ]);
      setSleepStats(sStats);

      const activeGoals = goals.filter(
        (g) => g.status === 'active' || g.status === 'in_progress'
      ).length;

      let avgQuality: number | null = null;
      if (sleepLogs.length > 0) {
        const totalQuality = sleepLogs.reduce((sum, log) => sum + log.quality, 0);
        avgQuality = Math.round((totalQuality / sleepLogs.length) * 10) / 10;
      }

      setStats({
        totalDreams: dreams.length,
        activeGoals,
        ideasCaptured: ideas.length,
        avgSleepQuality: avgQuality,
      });
      setError(null);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError('Failed to load dashboard stats');
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const data = await aiApi.getInsights();
      setInsights(data);
    } catch (err) {
      console.error('Failed to fetch insights:', err);
      setInsightsError('Failed to load AI insights');
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  const fetchPatterns = useCallback(async () => {
    setPatternsLoading(true);
    try {
      const data = await aiApi.getPatterns(30);
      setPatterns(data);
    } catch (err) {
      console.error('Failed to fetch patterns:', err);
    } finally {
      setPatternsLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchInsights()]);
    setLoading(false);
  }, [fetchStats, fetchInsights]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchInsights()]);
    setRefreshing(false);
  }, [fetchStats, fetchInsights]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'Dreamer';
  const greeting = getGreeting();

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
          <Text className="text-slate-400 mt-4">Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-2 pb-4 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-slate-400 text-sm">{greeting}</Text>
            <Text className="text-white text-2xl font-bold mt-1">
              {displayName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-slate-800 p-3 rounded-full"
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={22} color="#f87171" />
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {error && (
          <View className="mx-5 mb-4 bg-red-900/50 rounded-xl p-3 flex-row items-center">
            <Ionicons name="alert-circle" size={20} color="#f87171" />
            <Text className="text-red-300 ml-2 flex-1">{error}</Text>
            <TouchableOpacity onPress={fetchStats}>
              <Text className="text-indigo-400 font-semibold">Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Section */}
        <View className="px-4 mb-6">
          <Text className="text-white text-lg font-semibold mb-3 px-1">
            Your Stats
          </Text>
          <View className="flex-row flex-wrap">
            <StatCard
              title="Dreams Logged"
              value={stats.totalDreams}
              icon="moon"
              iconColor="#a78bfa"
            />
            <StatCard
              title="Active Goals"
              value={stats.activeGoals}
              icon="flag"
              iconColor="#34d399"
            />
            <StatCard
              title="Ideas Captured"
              value={stats.ideasCaptured}
              icon="bulb"
              iconColor="#fbbf24"
            />
            <StatCard
              title="Avg Sleep Quality"
              value={stats.avgSleepQuality !== null ? `${stats.avgSleepQuality}/5` : '—'}
              icon="bed"
              iconColor="#60a5fa"
            />
          </View>
        </View>

        {/* Sleep Trends Card */}
        {sleepStats && sleepStats.total_logs > 0 && (
          <View className="px-5 mb-6">
            <Text className="text-white text-lg font-semibold mb-3">
              Sleep Trends
            </Text>
            <View className="bg-slate-800 rounded-2xl p-4">
              <View className="flex-row justify-between mb-3">
                <View>
                  <Text className="text-slate-400 text-xs">Avg Quality</Text>
                  <Text className="text-white text-xl font-bold">
                    {sleepStats.avg_quality.toFixed(1)}/5
                  </Text>
                </View>
                <View>
                  <Text className="text-slate-400 text-xs">Total Logs</Text>
                  <Text className="text-white text-xl font-bold">
                    {sleepStats.total_logs}
                  </Text>
                </View>
                {sleepStats.avg_duration != null && (
                  <View>
                    <Text className="text-slate-400 text-xs">Avg Duration</Text>
                    <Text className="text-white text-xl font-bold">
                      {Math.floor(sleepStats.avg_duration / 60)}h{Math.round(sleepStats.avg_duration % 60)}m
                    </Text>
                  </View>
                )}
              </View>
              {sleepStats.quality_trend.length > 0 && (
                <View className="flex-row items-end h-12 gap-1">
                  {sleepStats.quality_trend.slice(-7).map((point, i) => (
                    <View key={i} className="flex-1 items-center">
                      <View
                        className="w-full bg-indigo-500 rounded-t"
                        style={{ height: `${point.quality * 20}%` }}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Dream Patterns Card */}
        <View className="px-5 mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="eye" size={20} color="#818cf8" />
              <Text className="text-white text-lg font-semibold ml-2">
                Dream Patterns
              </Text>
            </View>
            <TouchableOpacity
              onPress={fetchPatterns}
              disabled={patternsLoading}
              className="bg-slate-800 px-3 py-1.5 rounded-lg flex-row items-center"
            >
              {patternsLoading ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <>
                  <Ionicons name="refresh" size={14} color="#818cf8" />
                  <Text className="text-indigo-400 text-sm ml-1 font-medium">Analyze</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {patterns ? (
            <View className="bg-slate-800 rounded-2xl p-4">
              <Text className="text-slate-300 text-sm leading-5 mb-3">{patterns.summary}</Text>

              {patterns.recurring_symbols.length > 0 && (
                <View className="mb-3">
                  <Text className="text-slate-500 text-xs mb-2">Recurring Symbols</Text>
                  <View className="flex-row flex-wrap gap-1">
                    {patterns.recurring_symbols.map((symbol, i) => (
                      <View key={i} className="bg-purple-900/40 px-2 py-1 rounded-lg">
                        <Text className="text-purple-400 text-xs">{symbol}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {patterns.emotional_trends.length > 0 && (
                <View className="mb-3">
                  <Text className="text-slate-500 text-xs mb-2">Emotional Trends</Text>
                  {patterns.emotional_trends.map((trend, i) => (
                    <View key={i} className="flex-row items-center mb-1">
                      <Ionicons name="trending-up" size={12} color="#f472b6" />
                      <Text className="text-slate-300 text-sm ml-2">{trend}</Text>
                    </View>
                  ))}
                </View>
              )}

              {patterns.temporal_patterns.length > 0 && (
                <View>
                  <Text className="text-slate-500 text-xs mb-2">Temporal Patterns</Text>
                  {patterns.temporal_patterns.map((pattern, i) => (
                    <View key={i} className="flex-row items-center mb-1">
                      <Ionicons name="moon" size={12} color="#818cf8" />
                      <Text className="text-slate-300 text-sm ml-2">{pattern}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View className="bg-slate-800 rounded-2xl p-6 items-center">
              <Ionicons name="eye-outline" size={32} color="#64748b" />
              <Text className="text-slate-400 mt-3 text-center text-sm">
                Tap "Analyze" to discover recurring themes in your dreams
              </Text>
            </View>
          )}
        </View>

        {/* AI Insights Section */}
        <View className="px-5">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="sparkles" size={20} color="#818cf8" />
              <Text className="text-white text-lg font-semibold ml-2">
                AI Insights
              </Text>
            </View>
            {insightsLoading && (
              <ActivityIndicator size="small" color="#6366f1" />
            )}
          </View>

          {insightsError && (
            <View className="bg-slate-800 rounded-2xl p-4 mb-3 flex-row items-center">
              <Ionicons name="cloud-offline" size={20} color="#f87171" />
              <Text className="text-slate-400 ml-2 flex-1">{insightsError}</Text>
              <TouchableOpacity onPress={fetchInsights}>
                <Text className="text-indigo-400 font-semibold">Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!insightsLoading && !insightsError && insights && (
            <>
              <InsightCard
                title="Overall"
                content={insights.overall_insights}
                icon="analytics"
              />
              <InsightCard
                title="Dreams"
                content={insights.dream_insights}
                icon="moon"
              />
              <InsightCard
                title="Goals"
                content={insights.goal_insights}
                icon="flag"
              />
              <InsightCard
                title="Sleep"
                content={insights.sleep_insights}
                icon="bed"
              />
            </>
          )}

          {!insightsLoading && !insightsError && !insights && (
            <View className="bg-slate-800 rounded-2xl p-6 items-center">
              <Ionicons name="sparkles-outline" size={32} color="#64748b" />
              <Text className="text-slate-400 mt-3 text-center">
                Log more dreams and activities to unlock AI insights
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  if (hour < 21) return 'Good evening,';
  return 'Good night,';
}
