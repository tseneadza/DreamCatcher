import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Target, Trash2, X, Check, Moon, Loader2, Sparkles, Search } from 'lucide-react';
import { goalsApi, aiApi } from '../api';
import type { Dream, Goal, GoalCreate, GoalAlignmentResponse } from '../api/types';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [priorityMin, setPriorityMin] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(value), 300);
  }, []);

  useEffect(() => {
    loadGoals();
  }, [debouncedQuery, priorityMin, sortBy, sortOrder]);

  const loadGoals = async () => {
    try {
      const params: { q?: string; priority_min?: number; sort_by?: string; sort_order?: string } = {};
      if (debouncedQuery) params.q = debouncedQuery;
      if (priorityMin > 0) params.priority_min = priorityMin;
      if (sortBy) params.sort_by = sortBy;
      if (sortOrder) params.sort_order = sortOrder;
      const data = await goalsApi.getAll(params);
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

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input pl-10 w-full"
            placeholder="Search goals..."
          />
        </div>
        <select
          value={priorityMin}
          onChange={(e) => setPriorityMin(Number(e.target.value))}
          className="input w-44"
        >
          <option value={0}>All Priorities</option>
          <option value={1}>Priority 1+</option>
          <option value={2}>Priority 2+</option>
          <option value={3}>Priority 3+</option>
          <option value={4}>Priority 4+</option>
          <option value={5}>Priority 5</option>
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
          <option value="priority-desc">Priority (High to Low)</option>
          <option value="priority-asc">Priority (Low to High)</option>
          <option value="progress-desc">Progress (High to Low)</option>
          <option value="progress-asc">Progress (Low to High)</option>
        </select>
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

              <div className="flex items-center gap-4">
                {goal.target_date && (
                  <p className="text-white/40 text-sm">
                    Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}
                  </p>
                )}
                <span className="text-white/40 text-sm">
                  Priority: {'★'.repeat(goal.priority)}{'☆'.repeat(5 - goal.priority)}
                </span>
                {goal.dream_count > 0 && (
                  <span className="text-teal-300/60 text-sm flex items-center gap-1">
                    <Moon className="w-3 h-3" />
                    {goal.dream_count} dream{goal.dream_count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
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
  const [priority, setPriority] = useState(3);
  const [notes, setNotes] = useState('');
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
        priority,
        notes: notes || undefined,
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

      <div>
        <label className="label">Priority (1-5): {priority}</label>
        <input
          type="range"
          min="1"
          max="5"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
        <div className="flex justify-between text-white/40 text-xs mt-1">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input min-h-[80px] resize-y"
          placeholder="Additional notes..."
        />
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
  const [linkedDreams, setLinkedDreams] = useState<Dream[]>([]);
  const [loadingDreams, setLoadingDreams] = useState(false);
  const [alignment, setAlignment] = useState<GoalAlignmentResponse | null>(null);
  const [isLoadingAlignment, setIsLoadingAlignment] = useState(false);

  useEffect(() => {
    setLoadingDreams(true);
    goalsApi.getGoalDreams(goal.id)
      .then(setLinkedDreams)
      .catch(() => {})
      .finally(() => setLoadingDreams(false));
  }, [goal.id]);

  const handleDreamAlignment = async () => {
    setIsLoadingAlignment(true);
    try {
      const result = await aiApi.goalAlignment(goal.id);
      setAlignment(result);
    } catch (err) {
      console.error('Failed to get dream alignment:', err);
    } finally {
      setIsLoadingAlignment(false);
    }
  };

  const getAlignmentColor = (score: number) => {
    if (score >= 0.7) return 'text-green-400';
    if (score >= 0.4) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getAlignmentBarColor = (score: number) => {
    if (score >= 0.7) return 'bg-green-500';
    if (score >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

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

        <div className="flex items-center gap-4 mb-4">
          <span className="text-white/60 text-sm">Priority:</span>
          <span className="text-yellow-400">{'★'.repeat(goal.priority)}{'☆'.repeat(5 - goal.priority)}</span>
        </div>

        {goal.notes && (
          <div className="mb-4 p-3 bg-white/5 rounded-lg">
            <span className="text-white/50 text-xs block mb-1">Notes</span>
            <p className="text-white/80 text-sm whitespace-pre-wrap">{goal.notes}</p>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-300" />
            Linked Dreams ({linkedDreams.length})
          </h3>
          {loadingDreams ? (
            <p className="text-white/40 text-sm">Loading...</p>
          ) : linkedDreams.length === 0 ? (
            <p className="text-white/40 text-sm">No dreams linked to this goal yet.</p>
          ) : (
            <div className="space-y-2">
              {linkedDreams.map((dream) => (
                <div key={dream.id} className="p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{['😢', '😕', '😐', '🙂', '😊'][dream.mood - 1]}</span>
                    <span className="text-white font-medium text-sm">{dream.title}</span>
                    <span className="text-white/40 text-xs ml-auto">
                      {format(new Date(dream.dream_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="text-white/60 text-xs mt-1 line-clamp-1">{dream.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dream Alignment */}
        <div className="mb-6">
          {alignment ? (
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-indigo-300" />
                <span className="text-indigo-200 font-medium">Dream Alignment</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-2xl font-bold ${getAlignmentColor(alignment.alignment_score)}`}>
                  {Math.round(alignment.alignment_score * 100)}%
                </span>
                <div className="flex-1 bg-white/10 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getAlignmentBarColor(alignment.alignment_score)}`}
                    style={{ width: `${alignment.alignment_score * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-white/70 text-sm mb-3">{alignment.analysis}</p>
              {alignment.relevant_themes.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {alignment.relevant_themes.map((theme, i) => (
                    <span key={i} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded-full">
                      {theme}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleDreamAlignment}
              disabled={isLoadingAlignment}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              {isLoadingAlignment ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing alignment...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Dream Alignment
                </>
              )}
            </button>
          )}
        </div>

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
