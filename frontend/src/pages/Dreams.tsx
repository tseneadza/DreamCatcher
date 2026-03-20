import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Moon, Sparkles, Trash2, X, Loader2, Wand2, RefreshCw, Eye, MapPin, Users, Heart, Target, MessageCircle, Lightbulb, Send, Search, Bookmark } from 'lucide-react';
import { dreamsApi, aiApi, goalsApi, filtersApi } from '../api';
import type { Dream, DreamCreate, Goal, DreamIdea, DreamExploreResponse, SavedFilter } from '../api/types';
import { format } from 'date-fns';

const moodEmojis = ['😢', '😕', '😐', '🙂', '😊'];
const dreamTypes = ['Normal', 'Nightmare', 'Lucid', 'Daydream'];

export default function Dreams() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(value), 300);
  }, []);

  useEffect(() => {
    goalsApi.getAll().then(setGoals).catch(() => {});
    filtersApi.getAll('dream').then(setSavedFilters).catch(() => {});
  }, []);

  useEffect(() => {
    loadDreams();
  }, [filterType, debouncedQuery, sortBy, sortOrder]);

  const loadDreams = async () => {
    try {
      const params: { dream_type?: string; q?: string; sort_by?: string; sort_order?: string } = {};
      if (filterType) params.dream_type = filterType;
      if (debouncedQuery) params.q = debouncedQuery;
      if (sortBy) params.sort_by = sortBy;
      if (sortOrder) params.sort_order = sortOrder;
      const data = await dreamsApi.getAll(params);
      setDreams(data);
    } catch (err) {
      console.error('Failed to load dreams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFilter = async () => {
    const name = prompt('Name this filter:');
    if (!name) return;
    try {
      const filter = await filtersApi.create({
        name,
        entity_type: 'dream',
        filter_config: { dream_type: filterType, q: searchQuery, sort_by: sortBy, sort_order: sortOrder },
      });
      setSavedFilters([filter, ...savedFilters]);
    } catch (err) {
      console.error('Failed to save filter:', err);
    }
  };

  const handleApplyFilter = (filter: SavedFilter) => {
    const cfg = filter.filter_config as Record<string, string>;
    setFilterType(cfg.dream_type || '');
    setSearchQuery(cfg.q || '');
    setDebouncedQuery(cfg.q || '');
    setSortBy(cfg.sort_by || 'date');
    setSortOrder(cfg.sort_order || 'desc');
  };

  const handleDeleteFilter = async (id: number) => {
    await filtersApi.delete(id);
    setSavedFilters(savedFilters.filter((f) => f.id !== id));
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

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input pl-10 w-full"
              placeholder="Search dreams..."
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input w-40"
          >
            <option value="">All Types</option>
            {dreamTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
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
            <option value="mood-desc">Mood (High to Low)</option>
            <option value="mood-asc">Mood (Low to High)</option>
            <option value="vividness-desc">Vividness (High to Low)</option>
            <option value="vividness-asc">Vividness (Low to High)</option>
          </select>
          <button onClick={handleSaveFilter} className="btn-secondary flex items-center gap-1 text-sm" title="Save current filter">
            <Bookmark className="w-4 h-4" />
            Save
          </button>
        </div>
        {savedFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white/40 text-xs">Saved:</span>
            {savedFilters.map((f) => (
              <button
                key={f.id}
                onClick={() => handleApplyFilter(f)}
                className="group px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full hover:bg-indigo-500/30 flex items-center gap-1"
              >
                {f.name}
                <X
                  className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-red-400"
                  onClick={(e) => { e.stopPropagation(); handleDeleteFilter(f.id); }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <DreamForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} goals={goals} />
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
                    {dream.dream_type && dream.dream_type !== 'Normal' && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                        {dream.dream_type}
                      </span>
                    )}
                    {dream.is_recurring && (
                      <RefreshCw className="w-4 h-4 text-amber-400" />
                    )}
                    {dream.goal_id && (() => {
                      const linkedGoal = goals.find(g => g.id === dream.goal_id);
                      return linkedGoal ? (
                        <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 text-xs rounded flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {linkedGoal.title}
                        </span>
                      ) : null;
                    })()}
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
  goals,
}: {
  onSubmit: (data: DreamCreate) => Promise<void>;
  onCancel: () => void;
  goals: Goal[];
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(3);
  const [tags, setTags] = useState('');
  const [dreamType, setDreamType] = useState('Normal');
  const [lucidity, setLucidity] = useState(0);
  const [vividness, setVividness] = useState(3);
  const [emotions, setEmotions] = useState('');
  const [characters, setCharacters] = useState('');
  const [locations, setLocations] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  const [goalId, setGoalId] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        content,
        mood,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        dream_type: dreamType,
        lucidity_level: lucidity,
        vividness,
        emotions: emotions.split(',').map((e) => e.trim()).filter(Boolean),
        characters: characters.split(',').map((c) => c.trim()).filter(Boolean),
        locations: locations.split(',').map((l) => l.trim()).filter(Boolean),
        is_recurring: isRecurring,
        goal_id: goalId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoTag = async () => {
    if (!content.trim()) return;
    setIsAutoTagging(true);
    try {
      const result = await aiApi.autoTag(content, mood);
      if (result.tags?.length) setTags(result.tags.join(', '));
      if (result.emotions?.length) setEmotions(result.emotions.join(', '));
      if (result.characters?.length) setCharacters(result.characters.join(', '));
      if (result.locations?.length) setLocations(result.locations.join(', '));
      if (result.dream_type) setDreamType(result.dream_type);
    } catch (err) {
      console.error('Auto-tag failed:', err);
    } finally {
      setIsAutoTagging(false);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Dream Type</label>
          <select
            value={dreamType}
            onChange={(e) => setDreamType(e.target.value)}
            className="input"
          >
            {dreamTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Lucidity (0-5)</label>
          <input
            type="range"
            min="0"
            max="5"
            value={lucidity}
            onChange={(e) => setLucidity(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-white/40 text-xs mt-1">
            <span>Not lucid</span>
            <span className="text-white/70 font-medium">{lucidity}</span>
            <span>Fully lucid</span>
          </div>
        </div>

        <div>
          <label className="label">Vividness (1-5)</label>
          <input
            type="range"
            min="1"
            max="5"
            value={vividness}
            onChange={(e) => setVividness(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-white/40 text-xs mt-1">
            <span>Faint</span>
            <span className="text-white/70 font-medium">{vividness}</span>
            <span>Crystal clear</span>
          </div>
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

      <div>
        <label className="label">Emotions (comma separated)</label>
        <input
          type="text"
          value={emotions}
          onChange={(e) => setEmotions(e.target.value)}
          className="input"
          placeholder="joy, fear, wonder"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Characters (comma separated)</label>
          <input
            type="text"
            value={characters}
            onChange={(e) => setCharacters(e.target.value)}
            className="input"
            placeholder="mom, friend, stranger"
          />
        </div>

        <div>
          <label className="label">Locations (comma separated)</label>
          <input
            type="text"
            value={locations}
            onChange={(e) => setLocations(e.target.value)}
            className="input"
            placeholder="beach, school, forest"
          />
        </div>
      </div>

      {goals.length > 0 && (
        <div>
          <label className="label">Link to Goal</label>
          <select
            value={goalId ?? ''}
            onChange={(e) => setGoalId(e.target.value ? Number(e.target.value) : null)}
            className="input"
          >
            <option value="">No goal linked</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsRecurring(!isRecurring)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            isRecurring ? 'bg-indigo-500' : 'bg-white/20'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              isRecurring ? 'translate-x-6' : ''
            }`}
          />
        </button>
        <span className="text-white/70 text-sm">Recurring dream</span>
      </div>

      <div className="flex gap-3 justify-between">
        <button
          type="button"
          onClick={handleAutoTag}
          disabled={isAutoTagging || !content.trim()}
          className="btn-secondary flex items-center gap-2"
        >
          {isAutoTagging ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Auto-tag with AI
            </>
          )}
        </button>

        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving...' : 'Save Dream'}
          </button>
        </div>
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
  const [showExplore, setShowExplore] = useState(false);
  const [exploreQuestion, setExploreQuestion] = useState('');
  const [exploreResponse, setExploreResponse] = useState<DreamExploreResponse | null>(null);
  const [isExploring, setIsExploring] = useState(false);
  const [ideas, setIdeas] = useState<DreamIdea[]>([]);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [showIdeas, setShowIdeas] = useState(false);

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

  const handleExplore = async () => {
    if (!exploreQuestion.trim()) return;
    setIsExploring(true);
    try {
      const result = await aiApi.exploreDream(dream.id, exploreQuestion.trim());
      setExploreResponse(result);
      setExploreQuestion('');
    } catch (err) {
      console.error('Failed to explore dream:', err);
    } finally {
      setIsExploring(false);
    }
  };

  const handleGenerateIdeas = async () => {
    setIsGeneratingIdeas(true);
    setShowIdeas(true);
    try {
      const result = await aiApi.dreamToIdeas(dream.id);
      setIdeas(result.ideas);
    } catch (err) {
      console.error('Failed to generate ideas:', err);
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="card max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{moodEmojis[dream.mood - 1]}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{dream.title}</h2>
                {dream.dream_type && dream.dream_type !== 'Normal' && (
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                    {dream.dream_type}
                  </span>
                )}
              </div>
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

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Eye className="w-4 h-4" />
            <span>Lucidity: {dream.lucidity_level}/5</span>
          </div>
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Vividness: {dream.vividness}/5</span>
          </div>
          {dream.is_recurring && (
            <div className="flex items-center gap-2 text-amber-400 text-sm col-span-2">
              <RefreshCw className="w-4 h-4" />
              <span>Recurring{dream.recurring_theme ? `: ${dream.recurring_theme}` : ''}</span>
            </div>
          )}
        </div>

        {dream.emotions.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-2">
              <Heart className="w-3 h-3" />
              <span>Emotions</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {dream.emotions.map((e) => (
                <span key={e} className="px-2 py-0.5 bg-pink-500/20 text-pink-300 text-xs rounded-full">
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}

        {dream.characters.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-2">
              <Users className="w-3 h-3" />
              <span>Characters</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {dream.characters.map((c) => (
                <span key={c} className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-xs rounded-full">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {dream.locations.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-2">
              <MapPin className="w-3 h-3" />
              <span>Locations</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {dream.locations.map((l) => (
                <span key={l} className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs rounded-full">
                  {l}
                </span>
              ))}
            </div>
          </div>
        )}

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

        {/* AI Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setShowExplore(!showExplore)}
            className={`flex-1 btn-secondary flex items-center justify-center gap-2 ${showExplore ? 'bg-purple-500/20 border-purple-500/30' : ''}`}
          >
            <MessageCircle className="w-4 h-4" />
            Explore
          </button>
          <button
            onClick={handleGenerateIdeas}
            disabled={isGeneratingIdeas}
            className="flex-1 btn-secondary flex items-center justify-center gap-2"
          >
            {isGeneratingIdeas ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lightbulb className="w-4 h-4" />
            )}
            Generate Ideas
          </button>
        </div>

        {/* Explore Chat Interface */}
        {showExplore && (
          <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-purple-300" />
              <span className="text-purple-200 font-medium text-sm">Explore Your Dream</span>
            </div>

            {exploreResponse && (
              <div className="mb-3 space-y-3">
                <p className="text-white/80 text-sm whitespace-pre-wrap">{exploreResponse.answer}</p>
                {exploreResponse.follow_up_questions.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-white/40 text-xs">Try asking:</span>
                    {exploreResponse.follow_up_questions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => setExploreQuestion(q)}
                        className="block w-full text-left text-sm text-purple-300 hover:text-purple-200 py-1 px-2 rounded hover:bg-white/5"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={exploreQuestion}
                onChange={(e) => setExploreQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExplore()}
                placeholder="Ask about your dream..."
                className="input flex-1 text-sm"
                disabled={isExploring}
              />
              <button
                onClick={handleExplore}
                disabled={isExploring || !exploreQuestion.trim()}
                className="btn-primary px-3"
              >
                {isExploring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Generated Ideas */}
        {showIdeas && (
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-yellow-300" />
              <span className="text-yellow-200 font-medium text-sm">Dream-Inspired Ideas</span>
            </div>
            {isGeneratingIdeas ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-yellow-300" />
                <span className="text-white/60 text-sm ml-2">Generating ideas...</span>
              </div>
            ) : ideas.length > 0 ? (
              <div className="space-y-3">
                {ideas.map((idea, i) => (
                  <div key={i} className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-xs rounded">
                        {idea.category}
                      </span>
                    </div>
                    <p className="text-white/80 text-sm">{idea.content}</p>
                    <p className="text-white/40 text-xs mt-1">{idea.reasoning}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/40 text-sm">No ideas generated.</p>
            )}
          </div>
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
