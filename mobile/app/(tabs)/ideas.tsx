import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ideasApi, Idea, IdeaCreate } from '@/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const CATEGORIES = ['General', 'Project', 'Creative', 'Business', 'Personal', 'Learning'];
const PRIORITY_COLORS = ['#6b7280', '#22c55e', '#eab308', '#f97316', '#ef4444'];
const PRIORITY_LABELS = ['Low', 'Low', 'Medium', 'High', 'Urgent'];

export default function IdeasScreen() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newIdea, setNewIdea] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<string>('General');
  const [editPriority, setEditPriority] = useState(1);
  const [editTags, setEditTags] = useState('');
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [priorityPickerVisible, setPriorityPickerVisible] = useState(false);
  const [quickCategory, setQuickCategory] = useState<string>('General');
  const [quickPriority, setQuickPriority] = useState(1);

  const fetchIdeas = useCallback(async () => {
    try {
      const data = await ideasApi.getAll();
      setIdeas(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error) {
      console.error('Failed to fetch ideas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchIdeas();
    setRefreshing(false);
  }, [fetchIdeas]);

  const handleQuickCapture = async () => {
    if (!newIdea.trim()) return;

    try {
      const ideaData: IdeaCreate = {
        content: newIdea.trim(),
        category: quickCategory,
        priority: quickPriority,
        tags: [],
      };
      const created = await ideasApi.create(ideaData);
      setIdeas((prev) => [created, ...prev]);
      setNewIdea('');
      setQuickCategory('General');
      setQuickPriority(1);
    } catch (error) {
      Alert.alert('Error', 'Failed to save idea');
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Delete Idea', 'Are you sure you want to delete this idea?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await ideasApi.delete(id);
            setIdeas((prev) => prev.filter((i) => i.id !== id));
          } catch (error) {
            Alert.alert('Error', 'Failed to delete idea');
          }
        },
      },
    ]);
  };

  const openEditModal = (idea: Idea) => {
    setEditingIdea(idea);
    setEditContent(idea.content);
    setEditCategory(idea.category || 'General');
    setEditPriority(idea.priority);
    setEditTags(idea.tags?.join(', ') || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingIdea) return;

    try {
      const updated = await ideasApi.update(editingIdea.id, {
        content: editContent,
        category: editCategory,
        priority: editPriority,
        tags: editTags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      setIdeas((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setEditModalVisible(false);
      setEditingIdea(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to update idea');
    }
  };

  const renderIdea = ({ item }: { item: Idea }) => {
    const isExpanded = expandedId === item.id;
    const priorityColor = PRIORITY_COLORS[item.priority - 1] || PRIORITY_COLORS[0];

    return (
      <TouchableOpacity
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        onLongPress={() => handleDelete(item.id)}
        className="bg-slate-800 rounded-xl p-4 mb-3 mx-4"
        activeOpacity={0.7}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <Text
              className="text-white text-base"
              numberOfLines={isExpanded ? undefined : 2}
            >
              {item.content}
            </Text>
          </View>
          <View
            className="px-2 py-1 rounded-full"
            style={{ backgroundColor: priorityColor }}
          >
            <Text className="text-white text-xs font-semibold">
              {PRIORITY_LABELS[item.priority - 1]}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center mt-3 flex-wrap gap-2">
          {item.category && (
            <View className="bg-indigo-600/30 px-2 py-1 rounded-lg">
              <Text className="text-indigo-300 text-xs">{item.category}</Text>
            </View>
          )}
          {item.tags?.map((tag, index) => (
            <View key={index} className="bg-slate-700 px-2 py-1 rounded-lg">
              <Text className="text-slate-300 text-xs">#{tag}</Text>
            </View>
          ))}
        </View>

        {isExpanded && (
          <View className="mt-3 pt-3 border-t border-slate-700">
            <Text className="text-slate-400 text-xs">
              Created: {new Date(item.created_at).toLocaleDateString()}
            </Text>
            <View className="flex-row gap-2 mt-2">
              <TouchableOpacity
                onPress={() => openEditModal(item)}
                className="flex-1 bg-indigo-600 py-2 rounded-lg"
              >
                <Text className="text-white text-center font-semibold">Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                className="bg-red-600 py-2 px-4 rounded-lg"
              >
                <FontAwesome name="trash" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCategoryPicker = () => (
    <Modal
      visible={categoryPickerVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setCategoryPickerVisible(false)}
    >
      <Pressable
        className="flex-1 bg-black/50 justify-center items-center"
        onPress={() => setCategoryPickerVisible(false)}
      >
        <View className="bg-slate-800 rounded-2xl p-4 w-72">
          <Text className="text-white text-lg font-bold mb-4 text-center">
            Select Category
          </Text>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => {
                setQuickCategory(cat);
                setCategoryPickerVisible(false);
              }}
              className={`py-3 px-4 rounded-xl mb-2 ${
                quickCategory === cat ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <Text className="text-white text-center">{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );

  const renderPriorityPicker = () => (
    <Modal
      visible={priorityPickerVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setPriorityPickerVisible(false)}
    >
      <Pressable
        className="flex-1 bg-black/50 justify-center items-center"
        onPress={() => setPriorityPickerVisible(false)}
      >
        <View className="bg-slate-800 rounded-2xl p-4 w-72">
          <Text className="text-white text-lg font-bold mb-4 text-center">
            Select Priority
          </Text>
          {[1, 2, 3, 4, 5].map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => {
                setQuickPriority(p);
                setPriorityPickerVisible(false);
              }}
              className="py-3 px-4 rounded-xl mb-2 flex-row items-center justify-between"
              style={{
                backgroundColor:
                  quickPriority === p ? PRIORITY_COLORS[p - 1] : '#334155',
              }}
            >
              <Text className="text-white">{PRIORITY_LABELS[p - 1]}</Text>
              <View className="flex-row">
                {Array.from({ length: p }).map((_, i) => (
                  <FontAwesome
                    key={i}
                    name="star"
                    size={14}
                    color="#fbbf24"
                    style={{ marginLeft: 2 }}
                  />
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal
      visible={editModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setEditModalVisible(false)}
    >
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-slate-900 rounded-t-3xl p-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-xl font-bold">Edit Idea</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <FontAwesome name="times" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text className="text-slate-400 text-sm mb-2">Content</Text>
          <TextInput
            value={editContent}
            onChangeText={setEditContent}
            multiline
            className="bg-slate-800 text-white p-4 rounded-xl text-base mb-4"
            style={{ minHeight: 100 }}
            placeholderTextColor="#64748b"
          />

          <Text className="text-slate-400 text-sm mb-2">Category</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setEditCategory(cat)}
                className={`px-3 py-2 rounded-lg ${
                  editCategory === cat ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <Text className="text-white text-sm">{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-slate-400 text-sm mb-2">Priority</Text>
          <View className="flex-row gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setEditPriority(p)}
                className="flex-1 py-3 rounded-lg items-center"
                style={{
                  backgroundColor:
                    editPriority === p ? PRIORITY_COLORS[p - 1] : '#334155',
                }}
              >
                <Text className="text-white font-bold">{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-slate-400 text-sm mb-2">Tags (comma-separated)</Text>
          <TextInput
            value={editTags}
            onChangeText={setEditTags}
            placeholder="work, important, idea"
            className="bg-slate-800 text-white p-4 rounded-xl mb-6"
            placeholderTextColor="#64748b"
          />

          <TouchableOpacity
            onPress={handleSaveEdit}
            className="bg-indigo-600 py-4 rounded-xl"
          >
            <Text className="text-white text-center font-bold text-lg">
              Save Changes
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-white text-2xl font-bold mb-4">💡 Ideas</Text>

        <View className="bg-slate-800 rounded-xl p-4 mb-4">
          <TextInput
            value={newIdea}
            onChangeText={setNewIdea}
            placeholder="Capture your idea..."
            placeholderTextColor="#64748b"
            multiline
            className="text-white text-base mb-3"
            style={{ minHeight: 60 }}
          />

          <View className="flex-row items-center justify-between">
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setCategoryPickerVisible(true)}
                className="bg-slate-700 px-3 py-2 rounded-lg flex-row items-center"
              >
                <FontAwesome name="folder" size={14} color="#94a3b8" />
                <Text className="text-slate-300 text-sm ml-2">{quickCategory}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPriorityPickerVisible(true)}
                className="px-3 py-2 rounded-lg flex-row items-center"
                style={{ backgroundColor: PRIORITY_COLORS[quickPriority - 1] }}
              >
                <FontAwesome name="flag" size={14} color="white" />
                <Text className="text-white text-sm ml-2">P{quickPriority}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleQuickCapture}
              disabled={!newIdea.trim()}
              className={`px-6 py-2 rounded-lg ${
                newIdea.trim() ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <Text
                className={`font-bold ${
                  newIdea.trim() ? 'text-white' : 'text-slate-500'
                }`}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        data={ideas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderIdea}
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
              <FontAwesome name="lightbulb-o" size={48} color="#475569" />
              <Text className="text-slate-500 text-lg mt-4">No ideas yet</Text>
              <Text className="text-slate-600 text-sm mt-1">
                Capture your first idea above
              </Text>
            </View>
          ) : null
        }
      />

      {renderCategoryPicker()}
      {renderPriorityPicker()}
      {renderEditModal()}
    </SafeAreaView>
  );
}
