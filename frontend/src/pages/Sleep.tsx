import { useState, useEffect } from 'react';
import { Plus, BedDouble, Trash2, Moon, Clock } from 'lucide-react';
import { sleepApi, dreamsApi } from '../api';
import type { SleepLog, SleepLogCreate, Dream } from '../api/types';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';

const qualityEmojis = ['😫', '😕', '😐', '😊', '😴'];

export default function Sleep() {
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sleepData, dreamData] = await Promise.all([
        sleepApi.getAll(),
        dreamsApi.getAll(),
      ]);
      setSleepLogs(sleepData);
      setDreams(dreamData);
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
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this sleep log?')) return;
    await sleepApi.delete(id);
    setSleepLogs(sleepLogs.filter((s) => s.id !== id));
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
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Log Sleep
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-white/60 text-sm">Total Logs</p>
          <p className="text-2xl font-bold text-white">{sleepLogs.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-white/60 text-sm">Avg Quality</p>
          <p className="text-2xl font-bold text-white">{avgQuality}/5</p>
        </div>
        <div className="card text-center">
          <p className="text-white/60 text-sm">Dreams Linked</p>
          <p className="text-2xl font-bold text-white">
            {sleepLogs.filter((s) => s.dream_id).length}
          </p>
        </div>
      </div>

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        sleep_time: new Date(sleepTime).toISOString(),
        wake_time: new Date(wakeTime).toISOString(),
        quality,
        notes: notes || undefined,
        dream_id: dreamId ? Number(dreamId) : undefined,
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
