import { useState, useEffect } from 'react';
import { Plus, Target, Trash2, X, Check } from 'lucide-react';
import { goalsApi } from '../api';
import type { Goal, GoalCreate } from '../api/types';
import { format } from 'date-fns';

const categoryColors: Record<string, string> = {
  personal: 'bg-purple-500/20 text-purple-300',
  career: 'bg-blue-500/20 text-blue-300',
  health: 'bg-green-500/20 text-green-300',
  learning: 'bg-yellow-500/20 text-yellow-300',
  financial: 'bg-emerald-500/20 text-emerald-300',
  other: 'bg-gray-500/20 text-gray-300',
};

const statusLabels: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  paused: 'Paused',
  cancelled: 'Cancelled',
};

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await goalsApi.getAll();
      setGoals(data);
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (data: GoalCreate) => {
    const goal = await goalsApi.create(data);
    setGoals([goal, ...goals]);
    setShowForm(false);
  };

  const handleUpdateProgress = async (id: number, progress: number) => {
    const updated = await goalsApi.update(id, { 
      progress,
      status: progress === 100 ? 'completed' : 'in_progress'
    });
    setGoals(goals.map((g) => (g.id === id ? updated : g)));
    if (selectedGoal?.id === id) setSelectedGoal(updated);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this goal?')) return;
    await goalsApi.delete(id);
    setGoals(goals.filter((g) => g.id !== id));
    setSelectedGoal(null);
  };

  if (isLoading) {
    return <div className="text-white/60 text-center py-12">Loading goals...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-300" />
            Goal Tracker
          </h1>
          <p className="text-white/60 mt-1">Set and achieve your aspirations</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Goal
        </button>
      </div>

      {showForm && (
        <GoalForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {goals.length === 0 ? (
        <div className="card text-center py-12">
          <Target className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">No goals set yet</p>
          <p className="text-white/40 text-sm mt-1">Create your first goal to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div
              key={goal.id}
              onClick={() => setSelectedGoal(goal)}
              className="card cursor-pointer hover:bg-white/15 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{goal.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs ${categoryColors[goal.category]}`}>
                      {goal.category}
                    </span>
                    <span className="text-white/40 text-sm">{statusLabels[goal.status]}</span>
                  </div>
                </div>
                <span className="text-2xl font-bold text-indigo-300">{goal.progress}%</span>
              </div>
              
              <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>

              {goal.target_date && (
                <p className="text-white/40 text-sm">
                  Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedGoal && (
        <GoalModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onDelete={() => handleDelete(selectedGoal.id)}
          onUpdateProgress={(p) => handleUpdateProgress(selectedGoal.id, p)}
        />
      )}
    </div>
  );
}

function GoalForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: GoalCreate) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('personal');
  const [targetDate, setTargetDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        description: description || undefined,
        category,
        target_date: targetDate ? new Date(targetDate).toISOString() : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
      <div>
        <label className="label">Goal Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          placeholder="What do you want to achieve?"
          required
        />
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input min-h-[100px] resize-y"
          placeholder="Describe your goal in detail..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input"
          >
            <option value="personal">Personal</option>
            <option value="career">Career</option>
            <option value="health">Health</option>
            <option value="learning">Learning</option>
            <option value="financial">Financial</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="label">Target Date</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Saving...' : 'Save Goal'}
        </button>
      </div>
    </form>
  );
}

function GoalModal({
  goal,
  onClose,
  onDelete,
  onUpdateProgress,
}: {
  goal: Goal;
  onClose: () => void;
  onDelete: () => void;
  onUpdateProgress: (progress: number) => void;
}) {
  const [progress, setProgress] = useState(goal.progress);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="card max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{goal.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs ${categoryColors[goal.category]}`}>
                {goal.category}
              </span>
              <span className="text-white/40 text-sm">{statusLabels[goal.status]}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {goal.description && (
          <p className="text-white/80 mb-4">{goal.description}</p>
        )}

        <div className="mb-6">
          <label className="label">Progress: {progress}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full"
          />
          <button
            onClick={() => onUpdateProgress(progress)}
            className="btn-primary mt-2"
          >
            Update Progress
          </button>
        </div>

        {goal.milestones.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white font-medium mb-2">Milestones</h3>
            <div className="space-y-2">
              {goal.milestones.map((milestone, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 p-2 rounded ${
                    milestone.completed ? 'bg-green-500/10' : 'bg-white/5'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    milestone.completed ? 'bg-green-500' : 'border border-white/30'
                  }`}>
                    {milestone.completed && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={milestone.completed ? 'text-white/60 line-through' : 'text-white'}>
                    {milestone.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {goal.target_date && (
          <p className="text-white/60 mb-4">
            Target: {format(new Date(goal.target_date), 'MMMM d, yyyy')}
          </p>
        )}

        <div className="flex justify-end pt-4 border-t border-white/10">
          <button
            onClick={onDelete}
            className="flex items-center gap-2 text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-4 h-4" />
            Delete Goal
          </button>
        </div>
      </div>
    </div>
  );
}
