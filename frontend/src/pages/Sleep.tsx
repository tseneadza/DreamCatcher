import { useState, useEffect } from 'react';
import { Plus, BedDouble, Trash2, Moon, Clock, BarChart3, Coffee, Dumbbell, Brain } from 'lucide-react';
import { sleepApi, dreamsApi } from '../api';
import type { SleepLog, SleepLogCreate, Dream, SleepStats, SleepCorrelation } from '../api/types';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';

const qualityEmojis = ['😫', '😕', '😐', '😊', '😴'];
const stressLabels = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
const positionOptions = ['Back', 'Side (Left)', 'Side (Right)', 'Stomach', 'Mixed'];

export default function Sleep() {
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [stats, setStats] = useState<SleepStats | null>(null);
  const [correlations, setCorrelations] = useState<SleepCorrelation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [qualityMin, setQualityMin] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    loadData();
  }, [qualityMin, sortBy, sortOrder]);

  const loadData = async () => {
    try {
      const sleepParams: { quality_min?: number; sort_by?: string; sort_order?: string } = {};
      if (qualityMin > 0) sleepParams.quality_min = qualityMin;
      if (sortBy) sleepParams.sort_by = sortBy;
      if (sortOrder) sleepParams.sort_order = sortOrder;

      const [sleepData, dreamData, statsData, corrData] = await Promise.all([
        sleepApi.getAll(sleepParams),
        dreamsApi.getAll(),
        sleepApi.getStats().catch(() => null),
        sleepApi.getCorrelations().catch(() => null),
      ]);
      setSleepLogs(sleepData);
      setDreams(dreamData);
      setStats(statsData);
      setCorrelations(corrData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (data: SleepLogCreate) => {
    const sleepLog = await sleepApi.create(data);
    setSleepLogs([sleepLog, ...sleepLogs]);
    setShowForm(false);
    sleepApi.getStats().then(setStats).catch(() => {});
    sleepApi.getCorrelations().then(setCorrelations).catch(() => {});
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this sleep log?')) return;
    await sleepApi.delete(id);
    setSleepLogs(sleepLogs.filter((s) => s.id !== id));
    sleepApi.getStats().then(setStats).catch(() => {});
  };

  const formatDuration = (sleepTime: string, wakeTime: string) => {
    const sleep = new Date(sleepTime);
    const wake = new Date(wakeTime);
    const hours = differenceInHours(wake, sleep);
    const minutes = differenceInMinutes(wake, sleep) % 60;
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return <div className="text-white/60 text-center py-12">Loading sleep logs...</div>;
  }

  const avgQuality = sleepLogs.length > 0
    ? (sleepLogs.reduce((sum, s) => sum + s.quality, 0) / sleepLogs.length).toFixed(1)
    : '0';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BedDouble className="w-6 h-6 text-indigo-300" />
            Sleep Tracker
          </h1>
          <p className="text-white/60 mt-1">Monitor your sleep patterns</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="btn-secondary flex items-center gap-2"
          >
            <BarChart3 className="w-5 h-5" />
            Analytics
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Log Sleep
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-white/60 text-sm">Total Logs</p>
          <p className="text-2xl font-bold text-white">{stats?.total_logs ?? sleepLogs.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-white/60 text-sm">Avg Quality</p>
          <p className="text-2xl font-bold text-white">{stats ? stats.avg_quality.toFixed(1) : avgQuality}/5</p>
        </div>
        <div className="card text-center">
          <p className="text-white/60 text-sm">Avg Duration</p>
          <p className="text-2xl font-bold text-white">
            {stats?.avg_duration
              ? `${Math.floor(stats.avg_duration / 60)}h ${Math.round(stats.avg_duration % 60)}m`
              : '--'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          value={qualityMin}
          onChange={(e) => setQualityMin(Number(e.target.value))}
          className="input w-44"
        >
          <option value={0}>All Quality</option>
          <option value={1}>Quality 1+</option>
          <option value={2}>Quality 2+</option>
          <option value={3}>Quality 3+</option>
          <option value={4}>Quality 4+</option>
          <option value={5}>Quality 5</option>
        </select>
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [sb, so] = e.target.value.split('-');
            setSortBy(sb);
            setSortOrder(so);
          }}
          className="input w-48"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="quality-desc">Quality (High to Low)</option>
          <option value="quality-asc">Quality (Low to High)</option>
          <option value="duration-desc">Duration (Longest)</option>
          <option value="duration-asc">Duration (Shortest)</option>
        </select>
      </div>

      {/* Analytics Section */}
      {showAnalytics && (
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-300" />
            Sleep-Dream Analytics
          </h2>

          {/* Quality Trend */}
          {stats && stats.quality_trend.length > 0 && (
            <div className="card">
              <h3 className="text-white/80 text-sm font-medium mb-3">Quality Trend</h3>
              <div className="flex items-end gap-1 h-24">
                {stats.quality_trend.slice(-14).map((point, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-indigo-500 rounded-t transition-all"
                      style={{ height: `${point.quality * 20}%` }}
                    />
                    <span className="text-white/30 text-[10px]">
                      {format(new Date(point.date), 'd')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Correlations */}
          {correlations && (
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <h3 className="text-white/80 text-sm font-medium mb-3">Mood vs Sleep Quality</h3>
                {correlations.mood_vs_quality.length > 0 ? (
                  <div className="space-y-2">
                    {correlations.mood_vs_quality.slice(-7).map((point, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-white/40 w-12">
                          {format(new Date(point.date), 'MMM d')}
                        </span>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-purple-300">Mood {point.mood}</span>
                          <div className="flex-1 h-px bg-white/10" />
                          <span className="text-indigo-300">Quality {point.quality}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/30 text-sm">Link dreams to sleep logs to see correlations</p>
                )}
              </div>

              <div className="card">
                <h3 className="text-white/80 text-sm font-medium mb-3">Duration vs Vividness</h3>
                {correlations.duration_vs_vividness.length > 0 ? (
                  <div className="space-y-2">
                    {correlations.duration_vs_vividness.slice(-7).map((point, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-white/40 w-12">
                          {format(new Date(point.date), 'MMM d')}
                        </span>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-blue-300">
                            {Math.floor(point.duration_minutes / 60)}h{point.duration_minutes % 60}m
                          </span>
                          <div className="flex-1 h-px bg-white/10" />
                          <span className="text-yellow-300">Vivid {point.vividness}/5</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/30 text-sm">Add duration data to see correlations</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <SleepForm
          dreams={dreams}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {sleepLogs.length === 0 ? (
        <div className="card text-center py-12">
          <BedDouble className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">No sleep logs yet</p>
          <p className="text-white/40 text-sm mt-1">Start tracking your sleep</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sleepLogs.map((log) => {
            const linkedDream = dreams.find((d) => d.id === log.dream_id);
            return (
              <div key={log.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{qualityEmojis[log.quality - 1]}</span>
                    <div>
                      <p className="text-white font-medium">
                        {format(new Date(log.sleep_time), 'MMM d, yyyy')}
                      </p>
                      <div className="flex items-center gap-4 text-white/60 text-sm mt-1">
                        <span className="flex items-center gap-1">
                          <BedDouble className="w-4 h-4" />
                          {format(new Date(log.sleep_time), 'h:mm a')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(log.wake_time), 'h:mm a')}
                        </span>
                        <span className="text-indigo-300 font-medium">
                          {formatDuration(log.sleep_time, log.wake_time)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="text-red-400/60 hover:text-red-400"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Extra metadata badges */}
                {(log.caffeine_intake || log.exercise_today || log.stress_level || log.sleep_position) && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {log.caffeine_intake && (
                      <span className="flex items-center gap-1 text-xs bg-amber-500/15 text-amber-300 px-2 py-1 rounded-full">
                        <Coffee className="w-3 h-3" /> Caffeine
                      </span>
                    )}
                    {log.exercise_today && (
                      <span className="flex items-center gap-1 text-xs bg-green-500/15 text-green-300 px-2 py-1 rounded-full">
                        <Dumbbell className="w-3 h-3" /> Exercise
                      </span>
                    )}
                    {log.stress_level && (
                      <span className="flex items-center gap-1 text-xs bg-red-500/15 text-red-300 px-2 py-1 rounded-full">
                        <Brain className="w-3 h-3" /> Stress {log.stress_level}/5
                      </span>
                    )}
                    {log.sleep_position && (
                      <span className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded-full">
                        {log.sleep_position}
                      </span>
                    )}
                  </div>
                )}

                {log.notes && (
                  <p className="text-white/70 mt-3 text-sm">{log.notes}</p>
                )}

                {linkedDream && (
                  <div className="mt-3 p-3 bg-indigo-500/10 rounded-lg flex items-center gap-2">
                    <Moon className="w-4 h-4 text-indigo-300" />
                    <span className="text-indigo-200 text-sm">
                      Dream: {linkedDream.title}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SleepForm({
  dreams,
  onSubmit,
  onCancel,
}: {
  dreams: Dream[];
  onSubmit: (data: SleepLogCreate) => Promise<void>;
  onCancel: () => void;
}) {
  const [sleepTime, setSleepTime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState('');
  const [dreamId, setDreamId] = useState<number | ''>('');
  const [sleepPosition, setSleepPosition] = useState('');
  const [preSleepActivity, setPreSleepActivity] = useState('');
  const [caffeineIntake, setCaffeineIntake] = useState(false);
  const [exerciseToday, setExerciseToday] = useState(false);
  const [stressLevel, setStressLevel] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const sleepDt = new Date(sleepTime);
      const wakeDt = new Date(wakeTime);
      const durationMinutes = Math.round((wakeDt.getTime() - sleepDt.getTime()) / 60000);

      await onSubmit({
        sleep_time: sleepDt.toISOString(),
        wake_time: wakeDt.toISOString(),
        quality,
        notes: notes || undefined,
        dream_id: dreamId ? Number(dreamId) : undefined,
        sleep_duration_minutes: durationMinutes > 0 ? durationMinutes : undefined,
        sleep_position: sleepPosition || undefined,
        pre_sleep_activity: preSleepActivity || undefined,
        caffeine_intake: caffeineIntake,
        exercise_today: exerciseToday,
        stress_level: stressLevel ? Number(stressLevel) : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Sleep Time</label>
          <input
            type="datetime-local"
            value={sleepTime}
            onChange={(e) => setSleepTime(e.target.value)}
            className="input"
            required
          />
        </div>

        <div>
          <label className="label">Wake Time</label>
          <input
            type="datetime-local"
            value={wakeTime}
            onChange={(e) => setWakeTime(e.target.value)}
            className="input"
            required
          />
        </div>
      </div>

      <div>
        <label className="label">Sleep Quality</label>
        <div className="flex gap-3">
          {qualityEmojis.map((emoji, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setQuality(index + 1)}
              className={`text-3xl p-2 rounded-lg transition-colors ${
                quality === index + 1 ? 'bg-indigo-500/30' : 'hover:bg-white/10'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Sleep Position</label>
          <select
            value={sleepPosition}
            onChange={(e) => setSleepPosition(e.target.value)}
            className="input"
          >
            <option value="">Select position</option>
            {positionOptions.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Stress Level</label>
          <select
            value={stressLevel}
            onChange={(e) => setStressLevel(e.target.value ? Number(e.target.value) : '')}
            className="input"
          >
            <option value="">Select level</option>
            {stressLabels.map((label, i) => (
              <option key={i} value={i + 1}>{i + 1} - {label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Pre-Sleep Activity</label>
        <input
          type="text"
          value={preSleepActivity}
          onChange={(e) => setPreSleepActivity(e.target.value)}
          className="input"
          placeholder="Reading, meditating, scrolling..."
        />
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={caffeineIntake}
            onChange={(e) => setCaffeineIntake(e.target.checked)}
            className="w-4 h-4 rounded bg-white/10 border-white/20 text-indigo-500 focus:ring-indigo-500"
          />
          <span className="text-white/80 flex items-center gap-1">
            <Coffee className="w-4 h-4 text-amber-400" /> Caffeine today
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={exerciseToday}
            onChange={(e) => setExerciseToday(e.target.checked)}
            className="w-4 h-4 rounded bg-white/10 border-white/20 text-indigo-500 focus:ring-indigo-500"
          />
          <span className="text-white/80 flex items-center gap-1">
            <Dumbbell className="w-4 h-4 text-green-400" /> Exercise today
          </span>
        </label>
      </div>

      <div>
        <label className="label">Link to Dream (optional)</label>
        <select
          value={dreamId}
          onChange={(e) => setDreamId(e.target.value ? Number(e.target.value) : '')}
          className="input"
        >
          <option value="">No dream</option>
          {dreams.map((dream) => (
            <option key={dream.id} value={dream.id}>
              {dream.title} ({format(new Date(dream.dream_date), 'MMM d')})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input min-h-[80px] resize-y"
          placeholder="Any notes about your sleep..."
        />
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Saving...' : 'Log Sleep'}
        </button>
      </div>
    </form>
  );
}
