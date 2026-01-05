import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  categoryColor: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  videoId: string;
  videoUrl: string;
}

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          description,
          tags,
          created_at,
          updated_at,
          url,
          categories (
            name,
            color
          )
        `)
        .not('description', 'is', null)
        .neq('description', '')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching notes:', error);
        setError(error.message);
        return;
      }

      const transformedNotes: Note[] = (data || []).map(video => ({
        id: video.id,
        title: video.title,
        content: video.description || '',
        category: video.categories?.name || 'Uncategorized',
        categoryColor: video.categories?.color || 'blue-ocean',
        createdAt: video.created_at,
        updatedAt: video.updated_at,
        tags: video.tags || [],
        videoId: video.id,
        videoUrl: video.url
      }));

      setNotes(transformedNotes);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  return { notes, loading, error, refetch: fetchNotes };
};