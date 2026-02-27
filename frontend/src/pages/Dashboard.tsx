import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Target, Lightbulb, BedDouble, TrendingUp, Sparkles, Brain, RefreshCw } from 'lucide-react';
import { dreamsApi, goalsApi, ideasApi, sleepApi, aiApi } from '../api';
import type { Dream, Goal, Idea, SleepLog } from '../api/types';
import type { InsightsResponse } from '../api/ai';
import { useAuth } from '../context/AuthContext';
import { format, subDays } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dreamsData, goalsData, ideasData, sleepData] = await Promise.all([
        dreamsApi.getAll({ limit: 5 }),
        goalsApi.getAll({ limit: 5 }),
        ideasApi.getAll({ limit: 5 }),
        sleepApi.getAll({ limit: 7 }),
      ]);
      setDreams(dreamsData);
      setGoals(goalsData);
      setIdeas(ideasData);
      setSleepLogs(sleepData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInsights = async () => {
    setLoadingInsights(true);
    try {
      const data = await aiApi.getInsights();
      setInsights(data);
    } catch (err) {
      console.error('Failed to load insights:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const activeGoals = goals.filter((g) => g.status === 'in_progress').length;
  const completedGoals = goals.filter((g) => g.status === 'completed').length;
  const avgSleepQuality = sleepLogs.length > 0
    ? (sleepLogs.reduce((sum, s) => sum + s.quality, 0) / sleepLogs.length).toFixed(1)
    : '0';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {user?.name || 'Dreamer'}
        </h1>
        <p className="text-white/60 mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Moon}
          label="Dreams"
          value={dreams.length}
          color="indigo"
          to="/dreams"
        />
        <StatCard
          icon={Target}
          label="Active Goals"
          value={activeGoals}
          subValue={`${completedGoals} completed`}
          color="purple"
          to="/goals"
        />
        <StatCard
          icon={Lightbulb}
          label="Ideas"
          value={ideas.length}
          color="yellow"
          to="/ideas"
        />
        <StatCard
          icon={BedDouble}
          label="Avg Sleep"
          value={`${avgSleepQuality}/5`}
          subValue={`${sleepLogs.length} nights`}
          color="blue"
          to="/sleep"
        />
      </div>

      {/* AI Insights Section */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-300" />
            AI Insights
          </h2>
          <button
            onClick={loadInsights}
            disabled={loadingInsights}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loadingInsights ? 'animate-spin' : ''}`} />
            {loadingInsights ? 'Analyzing...' : 'Get Insights'}
          </button>
        </div>
        
        {insights ? (
          <div className="space-y-4">
            <p className="text-white/80">{insights.overall_insights}</p>
            
            {insights.dream_insights && (
              <div className="p-3 bg-indigo-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Moon className="w-4 h-4 text-indigo-300" />
                  <span className="text-indigo-200 font-medium text-sm">Dream Patterns</span>
                </div>
                <p className="text-white/70 text-sm">{insights.dream_insights}</p>
              </div>
            )}
            
            {insights.goal_insights && (
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-purple-300" />
                  <span className="text-purple-200 font-medium text-sm">Goal Progress</span>
                </div>
                <p className="text-white/70 text-sm">{insights.goal_insights}</p>
              </div>
            )}
            
            {insights.sleep_insights && (
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <BedDouble className="w-4 h-4 text-blue-300" />
                  <span className="text-blue-200 font-medium text-sm">Sleep Analysis</span>
                </div>
                <p className="text-white/70 text-sm whitespace-pre-wrap">{insights.sleep_insights}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-white/40 text-sm">Click "Get Insights" to analyze your data with AI</p>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Dreams */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-300" />
              Recent Dreams
            </h2>
            <Link to="/dreams" className="text-indigo-300 text-sm hover:text-indigo-200">
              View all
            </Link>
          </div>
          {dreams.length === 0 ? (
            <p className="text-white/40 text-sm">No dreams recorded yet</p>
          ) : (
            <div className="space-y-3">
              {dreams.slice(0, 3).map((dream) => (
                <div key={dream.id} className="p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{dream.title}</span>
                    {dream.ai_interpretation && (
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  <p className="text-white/50 text-sm mt-1 line-clamp-1">
                    {dream.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goals Progress */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-300" />
              Goals Progress
            </h2>
            <Link to="/goals" className="text-indigo-300 text-sm hover:text-indigo-200">
              View all
            </Link>
          </div>
          {goals.length === 0 ? (
            <p className="text-white/40 text-sm">No goals set yet</p>
          ) : (
            <div className="space-y-3">
              {goals.slice(0, 3).map((goal) => (
                <div key={goal.id} className="p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{goal.title}</span>
                    <span className="text-indigo-300 text-sm">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Ideas */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-300" />
              Recent Ideas
            </h2>
            <Link to="/ideas" className="text-indigo-300 text-sm hover:text-indigo-200">
              View all
            </Link>
          </div>
          {ideas.length === 0 ? (
            <p className="text-white/40 text-sm">No ideas captured yet</p>
          ) : (
            <div className="space-y-3">
              {ideas.slice(0, 3).map((idea) => (
                <div key={idea.id} className="p-3 bg-white/5 rounded-lg">
                  <p className="text-white line-clamp-2">{idea.content}</p>
                  <span className="text-white/40 text-xs">
                    {format(new Date(idea.created_at), 'MMM d')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sleep Quality */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-300" />
              Sleep Quality (Last 7 Days)
            </h2>
            <Link to="/sleep" className="text-indigo-300 text-sm hover:text-indigo-200">
              View all
            </Link>
          </div>
          {sleepLogs.length === 0 ? (
            <p className="text-white/40 text-sm">No sleep logs yet</p>
          ) : (
            <div className="flex items-end justify-between h-24 gap-2">
              {Array.from({ length: 7 }).map((_, index) => {
                const date = subDays(new Date(), 6 - index);
                const log = sleepLogs.find(
                  (s) =>
                    format(new Date(s.sleep_time), 'yyyy-MM-dd') ===
                    format(date, 'yyyy-MM-dd')
                );
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t transition-all ${
                        log ? 'bg-indigo-500' : 'bg-white/10'
                      }`}
                      style={{ height: `${log ? log.quality * 20 : 10}%` }}
                    />
                    <span className="text-white/40 text-xs">
                      {format(date, 'EEE')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
  to,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color: 'indigo' | 'purple' | 'yellow' | 'blue';
  to: string;
}) {
  const colorClasses = {
    indigo: 'bg-indigo-500/20 text-indigo-300',
    purple: 'bg-purple-500/20 text-purple-300',
    yellow: 'bg-yellow-500/20 text-yellow-300',
    blue: 'bg-blue-500/20 text-blue-300',
  };

  return (
    <Link to={to} className="card hover:bg-white/15 transition-colors">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-white/60 text-sm">{label}</p>
      {subValue && <p className="text-white/40 text-xs mt-1">{subValue}</p>}
    </Link>
  );
}
