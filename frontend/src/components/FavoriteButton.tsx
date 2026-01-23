import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { checkFavorite, addFavorite, removeFavoriteByItem } from '../services/api';

interface FavoriteButtonProps {
  itemType: 'flashcard_deck' | 'summary' | 'mock_test' | 'glossary' | 'key_term' | 'practice_session';
  itemId: string;
  itemName: string;
  documentName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FavoriteButton({
  itemType,
  itemId,
  itemName,
  documentName,
  size = 'md',
  className = '',
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkFavoriteStatus();
  }, [itemType, itemId]);

  const checkFavoriteStatus = async () => {
    try {
      const result = await checkFavorite(itemType, itemId);
      setIsFavorite(result.is_favorite);
    } catch (err) {
      console.error('Failed to check favorite status:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);

    try {
      if (isFavorite) {
        await removeFavoriteByItem(itemType, itemId);
        setIsFavorite(false);
      } else {
        await addFavorite({
          item_type: itemType,
          item_id: itemId,
          item_name: itemName,
          document_name: documentName,
        });
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const buttonSizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`${buttonSizeClasses[size]} rounded-full transition-colors ${
        isFavorite
          ? 'text-yellow-500 hover:text-yellow-600'
          : 'text-gray-400 hover:text-yellow-500'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        className={sizeClasses[size]}
        fill={isFavorite ? 'currentColor' : 'none'}
      />
    </button>
  );
}
