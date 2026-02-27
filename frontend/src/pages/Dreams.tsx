import { useState, useEffect } from 'react';
import { Plus, Moon, Sparkles, Trash2, X, Loader2 } from 'lucide-react';
import { dreamsApi } from '../api';
import type { Dream, DreamCreate } from '../api/types';
import { format } from 'date-fns';

const moodEmojis = ['😢', '😕', '😐', '🙂', '😊'];

export default function Dreams() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);

  useEffect(() => {
    loadDreams();
  }, []);

  const loadDreams = async () => {
    try {
      const data = await dreamsApi.getAll();
      setDreams(data);
    } catch (err) {
      console.error('Failed to load dreams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (data: DreamCreate) => {
    const dream = await dreamsApi.create(data);
    setDreams([dream, ...dreams]);
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this dream?')) return;
    await dreamsApi.delete(id);
    setDreams(dreams.filter((d) => d.id !== id));
    setSelectedDream(null);
  };

  if (isLoading) {
    return <div className="text-white/60 text-center py-12">Loading dreams...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Moon className="w-6 h-6 text-indigo-300" />
            Dream Journal
          </h1>
          <p className="text-white/60 mt-1">Record and explore your dreams</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Dream
        </button>
      </div>

      {showForm && (
        <DreamForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {dreams.length === 0 ? (
        <div className="card text-center py-12">
          <Moon className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">No dreams recorded yet</p>
          <p className="text-white/40 text-sm mt-1">Start by adding your first dream</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dreams.map((dream) => (
            <div
              key={dream.id}
              onClick={() => setSelectedDream(dream)}
              className="card cursor-pointer hover:bg-white/15 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{moodEmojis[dream.mood - 1]}</span>
                    <h3 className="text-lg font-semibold text-white">{dream.title}</h3>
                  </div>
                  <p className="text-white/70 line-clamp-2">{dream.content}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-white/40 text-sm">
                      {format(new Date(dream.dream_date), 'MMM d, yyyy')}
                    </span>
                    {dream.tags.length > 0 && (
                      <div className="flex gap-2">
                        {dream.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {dream.ai_interpretation && (
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDream && (
        <DreamModal
          dream={selectedDream}
          onClose={() => setSelectedDream(null)}
          onDelete={() => handleDelete(selectedDream.id)}
          onUpdate={(updated) => {
            setDreams(dreams.map((d) => (d.id === updated.id ? updated : d)));
            setSelectedDream(updated);
          }}
        />
      )}
    </div>
  );
}

function DreamForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: DreamCreate) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(3);
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        content,
        mood,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
      <div>
        <label className="label">Dream Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          placeholder="What was your dream about?"
          required
        />
      </div>

      <div>
        <label className="label">Dream Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="input min-h-[150px] resize-y"
          placeholder="Describe your dream in detail..."
          required
        />
      </div>

      <div>
        <label className="label">Mood</label>
        <div className="flex gap-3">
          {moodEmojis.map((emoji, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setMood(index + 1)}
              className={`text-3xl p-2 rounded-lg transition-colors ${
                mood === index + 1 ? 'bg-indigo-500/30' : 'hover:bg-white/10'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Tags (comma separated)</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="input"
          placeholder="flying, water, family"
        />
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Saving...' : 'Save Dream'}
        </button>
      </div>
    </form>
  );
}

function DreamModal({
  dream,
  onClose,
  onDelete,
  onUpdate,
}: {
  dream: Dream;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (dream: Dream) => void;
}) {
  const [isInterpreting, setIsInterpreting] = useState(false);

  const handleInterpret = async () => {
    setIsInterpreting(true);
    try {
      const updated = await dreamsApi.interpret(dream.id);
      onUpdate(updated);
    } catch (err) {
      console.error('Failed to interpret dream:', err);
    } finally {
      setIsInterpreting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="card max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{moodEmojis[dream.mood - 1]}</span>
            <div>
              <h2 className="text-xl font-bold text-white">{dream.title}</h2>
              <p className="text-white/40 text-sm">
                {format(new Date(dream.dream_date), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="prose prose-invert max-w-none">
          <p className="text-white/80 whitespace-pre-wrap">{dream.content}</p>
        </div>

        {dream.tags.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {dream.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {dream.ai_interpretation ? (
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="font-medium text-yellow-300">AI Interpretation</span>
            </div>
            <p className="text-white/80 whitespace-pre-wrap">{dream.ai_interpretation}</p>
          </div>
        ) : (
          <button
            onClick={handleInterpret}
            disabled={isInterpreting}
            className="mt-6 btn-primary w-full flex items-center justify-center gap-2"
          >
            {isInterpreting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Interpreting...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Get AI Interpretation
              </>
            )}
          </button>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t border-white/10">
          <button
            onClick={onDelete}
            className="flex items-center gap-2 text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-4 h-4" />
            Delete Dream
          </button>
        </div>
      </div>
    </div>
  );
}
