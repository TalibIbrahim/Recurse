import { useState, useEffect, useCallback } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  isDemoModeActive,
  demoStore,
  DEMO_USER_ID,
} from '../lib/supabase';
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

  const effectiveUserId = currentUserId || DEMO_USER_ID;
  const isDemo = isDemoModeActive() || !isSupabaseConfigured;

  const loadDemoComments = useCallback(() => {
    try {
      const data = demoStore.getComments(attemptId);
      setComments(data);
      setLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load comments';
      setError(msg);
      setLoading(false);
    }
  }, [attemptId]);

  const loadSupabaseComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('problem_comments')
        .select(`
          *,
          author:profiles(*)
        `)
        .order('created_at', { ascending: true });

      if (attemptId) {
        query = query.eq('attempt_id', attemptId);
      }

      const { data, error: commErr } = await query;
      if (commErr) throw commErr;

      setComments((data as ProblemComment[]) || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching comments';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  const refreshComments = useCallback(async () => {
    if (isDemo) {
      loadDemoComments();
    } else {
      await loadSupabaseComments();
    }
  }, [isDemo, loadDemoComments, loadSupabaseComments]);

  useEffect(() => {
    if (isDemo) {
      loadDemoComments();
      const unsub = demoStore.subscribe('comments', loadDemoComments);
      return unsub;
    } else {
      loadSupabaseComments();

      const channel = supabase
        .channel(`comments-${attemptId || 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'problem_comments',
            ...(attemptId ? { filter: `attempt_id=eq.${attemptId}` } : {}),
          },
          () => {
            loadSupabaseComments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isDemo, loadDemoComments, loadSupabaseComments, attemptId]);

  const addComment = async (
    body: string,
    targetAttemptId?: string
  ): Promise<{ success: boolean; comment?: ProblemComment; error?: string }> => {
    const activeAttemptId = targetAttemptId || attemptId;
    if (!activeAttemptId) {
      return { success: false, error: 'No attempt ID specified for comment' };
    }
    if (!body.trim()) {
      return { success: false, error: 'Comment body cannot be empty' };
    }

    if (isDemo) {
      const newComment = demoStore.addComment(activeAttemptId, effectiveUserId, body);
      return { success: true, comment: newComment };
    }

    try {
      const { data, error: insertErr } = await supabase
        .from('problem_comments')
        .insert({
          attempt_id: activeAttemptId,
          author_id: effectiveUserId,
          body: body.trim(),
        })
        .select(`
          *,
          author:profiles(*)
        `)
        .single();

      if (insertErr) throw insertErr;

      await refreshComments();
      return { success: true, comment: data as ProblemComment };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to post comment';
      return { success: false, error: msg };
    }
  };

  const deleteComment = async (commentId: string): Promise<{ success: boolean; error?: string }> => {
    if (isDemo) {
      demoStore.deleteComment(commentId);
      return { success: true };
    }

    try {
      const { error: delErr } = await supabase
        .from('problem_comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', effectiveUserId);

      if (delErr) throw delErr;

      await refreshComments();
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
    refreshComments,
  };
}
