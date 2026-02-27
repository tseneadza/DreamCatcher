import { useState, useEffect } from 'react';
import { Plus, Lightbulb, Trash2, X, Star } from 'lucide-react';
import { ideasApi } from '../api';
import type { Idea, IdeaCreate } from '../api/types';
import { format } from 'date-fns';

const priorityLabels = ['Low', 'Medium', 'High'];
const priorityColors = [
  'bg-gray-500/20 text-gray-300',
  'bg-yellow-500/20 text-yellow-300',
  'bg-red-500/20 text-red-300',
];

export default function Ideas() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    try {
      const data = await ideasApi.getAll();
      setIdeas(data);
    } catch (err) {
      console.error('Failed to load ideas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (data: IdeaCreate) => {
    const idea = await ideasApi.create(data);
    setIdeas([idea, ...ideas]);
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this idea?')) return;
    await ideasApi.delete(id);
    setIdeas(ideas.filter((i) => i.id !== id));
  };

  const handleUpdatePriority = async (id: number, priority: number) => {
    const updated = await ideasApi.update(id, { priority });
    setIdeas(ideas.map((i) => (i.id === id ? updated : i)));
  };

  if (isLoading) {
    return <div className="text-white/60 text-center py-12">Loading ideas...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-yellow-300" />
            Idea Capture
          </h1>
          <p className="text-white/60 mt-1">Capture and organize your thoughts</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Idea
        </button>
      </div>

      {showForm && (
        <IdeaForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {ideas.length === 0 ? (
        <div className="card text-center py-12">
          <Lightbulb className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">No ideas captured yet</p>
          <p className="text-white/40 text-sm mt-1">Start by adding your first idea</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ideas.map((idea) => (
            <div key={idea.id} className="card group">
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2 py-0.5 rounded text-xs ${priorityColors[idea.priority - 1]}`}>
                  {priorityLabels[idea.priority - 1]}
                </span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex">
                    {[1, 2, 3].map((p) => (
                      <button
                        key={p}
                        onClick={() => handleUpdatePriority(idea.id, p)}
                        className={`p-1 ${idea.priority >= p ? 'text-yellow-400' : 'text-white/20'}`}
                      >
                        <Star className="w-4 h-4" fill={idea.priority >= p ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleDelete(idea.id)}
                    className="text-red-400/60 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-white/90 mb-3">{idea.content}</p>

              <div className="flex items-center justify-between">
                {idea.category && (
                  <span className="text-white/40 text-sm">{idea.category}</span>
                )}
                <span className="text-white/30 text-xs">
                  {format(new Date(idea.created_at), 'MMM d')}
                </span>
              </div>

              {idea.tags.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {idea.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IdeaForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: IdeaCreate) => Promise<void>;
  onCancel: () => void;
}) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [priority, setPriority] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        content,
        category: category || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        priority,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
      <div>
        <label className="label">Your Idea</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="input min-h-[100px] resize-y"
          placeholder="What's on your mind?"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input"
            placeholder="e.g., Project, Business, Personal"
          />
        </div>

        <div>
          <label className="label">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="input"
          >
            <option value={1}>Low</option>
            <option value={2}>Medium</option>
            <option value={3}>High</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Tags (comma separated)</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="input"
          placeholder="app, feature, improvement"
        />
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Saving...' : 'Save Idea'}
        </button>
      </div>
    </form>
  );
}
