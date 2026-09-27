import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ProblemComment } from '../data/types';

export interface UseCommentsReturn {
  readonly comments: readonly ProblemComment[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly addComment: (
    body: string,
    targetAttemptId?: string
  ) => Promise<{ success: boolean; comment?: ProblemComment; error?: string }>;
  readonly deleteComment: (commentId: string) => Promise<{ success: boolean; error?: string }>;
  readonly refreshComments: () => Promise<void>;
}

export function useComments(attemptId?: string, currentUserId?: string): UseCommentsReturn {
  const [comments, setComments] = useState<readonly ProblemComment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSupabaseComments = useCallback(async () => {
    if (!attemptId) {
      setComments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: commErr } = await supabase
        .from('problem_comments')
        .select(`
          *,
          author:profiles(*)
        `)
        .eq('attempt_id', attemptId)
        .order('created_at', { ascending: true });

      if (commErr) throw commErr;
      setComments((data as ProblemComment[]) || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching comments';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    loadSupabaseComments();

    if (attemptId) {
      const channel = supabase
        .channel(`comments-${attemptId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'problem_comments', filter: `attempt_id=eq.${attemptId}` },
          () => {
            loadSupabaseComments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [attemptId, loadSupabaseComments]);

  const addComment = async (
    body: string,
    targetAttemptId?: string
  ): Promise<{ success: boolean; comment?: ProblemComment; error?: string }> => {
    const activeAttemptId = targetAttemptId || attemptId;
    if (!activeAttemptId) {
      return { success: false, error: 'No attempt selected' };
    }
    if (!currentUserId) {
      return { success: false, error: 'User is not logged in' };
    }
    if (!body.trim()) {
      return { success: false, error: 'Comment body cannot be empty' };
    }

    try {
      const { data, error: insertErr } = await supabase
        .from('problem_comments')
        .insert({
          attempt_id: activeAttemptId,
          user_id: currentUserId,
          body: body.trim(),
        })
        .select(`
          *,
          author:profiles(*)
        `)
        .single();

      if (insertErr) throw insertErr;

      await loadSupabaseComments();
      return { success: true, comment: data as ProblemComment };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to post comment';
      return { success: false, error: msg };
    }
  };

  const deleteComment = async (
    commentId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: delErr } = await supabase
        .from('problem_comments')
        .delete()
        .eq('id', commentId);

      if (delErr) throw delErr;
      await loadSupabaseComments();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete comment';
      return { success: false, error: msg };
    }
  };

  return {
    comments,
    loading,
    error,
    addComment,
    deleteComment,
    refreshComments: loadSupabaseComments,
  };
}

export default useComments;
