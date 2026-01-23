import { useState, useEffect, useCallback } from 'react';
import { Star, FileText, Layers, ClipboardList, Library, PenTool, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { listFavorites, removeFavorite } from '../services/api';
import type { Favorite } from '../types';

const TYPE_CONFIG: Record<string, { icon: typeof Star; label: string; color: string; darkColor: string; route?: string }> = {
  document: { icon: FileText, label: 'Document', color: 'bg-blue-100 text-blue-800', darkColor: 'dark:bg-blue-900/30 dark:text-blue-300', route: '/' },
  flashcard_deck: { icon: Layers, label: 'Flashcard Deck', color: 'bg-purple-100 text-purple-800', darkColor: 'dark:bg-purple-900/30 dark:text-purple-300', route: '/flashcards' },
  mock_test: { icon: ClipboardList, label: 'Mock Test', color: 'bg-green-100 text-green-800', darkColor: 'dark:bg-green-900/30 dark:text-green-300', route: '/tests' },
  glossary: { icon: Library, label: 'Glossary', color: 'bg-amber-100 text-amber-800', darkColor: 'dark:bg-amber-900/30 dark:text-amber-300', route: '/glossary' },
  key_term: { icon: Library, label: 'Key Term', color: 'bg-indigo-100 text-indigo-800', darkColor: 'dark:bg-indigo-900/30 dark:text-indigo-300', route: '/glossary' },
  practice_session: { icon: PenTool, label: 'Practice', color: 'bg-pink-100 text-pink-800', darkColor: 'dark:bg-pink-900/30 dark:text-pink-300', route: '/practice' },
  summary: { icon: FileText, label: 'Summary', color: 'bg-blue-100 text-blue-800', darkColor: 'dark:bg-blue-900/30 dark:text-blue-300', route: '/' },
};

export function FavoritesPage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const itemType = filter === 'all' ? undefined : filter;
      const favs = await listFavorites(itemType);
      setFavorites(favs);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleRemove = async (favoriteId: string) => {
    try {
      await removeFavorite(favoriteId);
      setFavorites(prev => prev.filter(f => f.id !== favoriteId));
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  const handleNavigate = (favorite: Favorite) => {
    const config = TYPE_CONFIG[favorite.item_type];
    if (config?.route) {
      navigate(config.route);
    }
  };

  const groupedFavorites = favorites.reduce((acc, fav) => {
    const type = fav.item_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(fav);
    return acc;
  }, {} as Record<string, Favorite[]>);

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Favorites</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Quick access to your bookmarked items
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Filter:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="summary">Summaries</option>
                <option value="flashcard_deck">Flashcard Decks</option>
                <option value="mock_test">Mock Tests</option>
                <option value="glossary">Glossaries</option>
                <option value="key_term">Key Terms</option>
                <option value="practice_session">Practice Sessions</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400">Loading favorites...</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Star className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Favorites Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Start adding items to your favorites for quick access. Look for the star icon on documents, flashcard decks, tests, and more.
            </p>
          </div>
        ) : filter === 'all' ? (
          <div className="space-y-8">
            {Object.entries(groupedFavorites).map(([type, items]) => {
              const config = TYPE_CONFIG[type];
              if (!config) return null;
              const Icon = config.icon;

              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{config.label}s</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">({items.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((favorite) => (
                      <FavoriteCard
                        key={favorite.id}
                        favorite={favorite}
                        onRemove={handleRemove}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((favorite) => (
              <FavoriteCard
                key={favorite.id}
                favorite={favorite}
                onRemove={handleRemove}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

interface FavoriteCardProps {
  favorite: Favorite;
  onRemove: (id: string) => void;
  onNavigate: (favorite: Favorite) => void;
}

function FavoriteCard({ favorite, onRemove, onNavigate }: FavoriteCardProps) {
  const config = TYPE_CONFIG[favorite.item_type];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.color} ${config.darkColor}`}>
            {config.label}
          </span>
        </div>
        <button
          onClick={() => onRemove(favorite.id)}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          title="Remove from favorites"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <h3 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">{favorite.item_name}</h3>

      {favorite.document_name && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          From: {favorite.document_name}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Added {new Date(favorite.created_at).toLocaleDateString()}
        </span>
        <button
          onClick={() => onNavigate(favorite)}
          className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          View
        </button>
      </div>
    </div>
  );
}
