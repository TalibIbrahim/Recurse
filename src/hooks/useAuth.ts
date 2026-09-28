import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { AuthUser, Profile } from '../data/types';
import type { Session, User } from '@supabase/supabase-js';

export interface UseAuthReturn {
  readonly user: AuthUser | null;
  readonly profile: Profile | null;
  readonly session: Session | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  readonly signUpWithEmail: (
    email: string,
    password: string,
    username: string,
    fullName?: string
  ) => Promise<{ success: boolean; error?: string }>;
  readonly signInWithOAuth: (provider: 'github' | 'google') => Promise<{ success: boolean; error?: string }>;
  readonly resetPasswordForEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  readonly updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  readonly signOut: () => Promise<void>;
  readonly updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
}

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Supabase user profile
  const fetchSupabaseProfile = useCallback(async (sbUser: User) => {
    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sbUser.id)
        .maybeSingle();

      if (data) {
        const fullProfile: Profile = data as Profile;
        setProfile(fullProfile);
        setUser({
          id: sbUser.id,
          email: sbUser.email || '',
          profile: fullProfile,
        });
      } else {
        // Fallback profile if row is not created yet
        const fallbackProfile: Profile = {
          id: sbUser.id,
          username: sbUser.user_metadata?.username || sbUser.email?.split('@')[0] || 'coder',
          full_name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'Coder',
          avatar_url: sbUser.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          bio: '',
          leetcode_username: '',
          identity_label: undefined,
          is_online: true,
          last_seen_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await supabase.from('profiles').upsert(fallbackProfile);
        setProfile(fallbackProfile);
        setUser({
          id: sbUser.id,
          email: sbUser.email || '',
          profile: fallbackProfile,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch user profile';
      console.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const {
          data: { session: initialSession },
          error: sessError,
        } = await supabase.auth.getSession();

        if (sessError) throw sessError;

        if (mounted) {
          setSession(initialSession);
          if (initialSession?.user) {
            await fetchSupabaseProfile(initialSession.user);
          } else {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : 'Auth initialization failed';
          setError(msg);
          setLoading(false);
        }
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession?.user) {
        await fetchSupabaseProfile(newSession.user);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchSupabaseProfile]);

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    try {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInErr) throw signInErr;
      if (signInData.user) {
        await fetchSupabaseProfile(signInData.user);
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    username: string,
    fullName?: string
  ) => {
    setError(null);
    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName || username,
          },
        },
      });
      if (signUpErr) throw signUpErr;

      const newUserId = signUpData.user?.id;
      if (newUserId) {
        // Initialize profile row immediately
        const newProfile: Profile = {
          id: newUserId,
          username,
          full_name: fullName || username,
          avatar_url: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`,
          bio: '',
          leetcode_username: '',
          identity_label: undefined,
          is_online: true,
          last_seen_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await supabase.from('profiles').upsert(newProfile);
        setProfile(newProfile);
        setUser({ id: newUserId, email, profile: newProfile });

        // Initialize streak row
        await supabase.from('streaks').upsert({
          user_id: newUserId,
          current_streak: 0,
          longest_streak: 0,
          freezes_available: 2,
          freezes_used: 0,
          is_at_risk: false,
          last_active_date: null,
          updated_at: new Date().toISOString(),
        });

        // Initialize daily goal row
        await supabase.from('daily_goals').upsert({
          user_id: newUserId,
          date: new Date().toISOString().split('T')[0],
          easy_target: 1,
          medium_target: 1,
          hard_target: 0,
          cadence: 'both',
          weekly_target: 10,
          preset: 'standard',
          updated_at: new Date().toISOString(),
        });
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signInWithOAuth = async (provider: 'github' | 'google') => {
    setError(null);
    try {
      const { error: oAuthErr } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/today`,
        },
      });
      if (oAuthErr) throw oAuthErr;
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `OAuth with ${provider} failed`;
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const resetPasswordForEmail = async (email: string) => {
    setError(null);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetErr) throw resetErr;
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password reset request failed';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const updatePassword = async (password: string) => {
    setError(null);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password update failed';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (err: unknown) {
      console.error('Sign out error:', err);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    setError(null);
    if (!user) {
      return { success: false, error: 'User is not logged in' };
    }

    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateErr) throw updateErr;

      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Profile update failed';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  return {
    user,
    profile,
    session,
    loading,
    error,
    signInWithEmail,
    signUpWithEmail,
    signInWithOAuth,
    resetPasswordForEmail,
    updatePassword,
    signOut,
    updateProfile,
  };
}
