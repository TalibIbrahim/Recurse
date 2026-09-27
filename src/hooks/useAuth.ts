import { useState, useEffect, useCallback } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  isDemoModeActive,
  setDemoModeActive,
  demoStore,
  DEMO_USER_ID,
} from '../lib/supabase';
import { AuthUser, Profile } from '../data/types';
import type { Session, User } from '@supabase/supabase-js';

export interface UseAuthReturn {
  readonly user: AuthUser | null;
  readonly profile: Profile | null;
  readonly session: Session | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly isDemo: boolean;
  readonly signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  readonly signUpWithEmail: (
    email: string,
    password: string,
    username: string,
    fullName?: string
  ) => Promise<{ success: boolean; error?: string }>;
  readonly signInWithOAuth: (provider: 'github' | 'google') => Promise<{ success: boolean; error?: string }>;
  readonly signInAsDemoUser: () => void;
  readonly enterDemoMode: () => void;
  readonly exitDemoMode: () => void;
  readonly signOut: () => Promise<void>;
  readonly updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
}

export function useAuth(): UseAuthReturn {
  const [isDemo, setIsDemo] = useState<boolean>(isDemoModeActive());
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync demo user state
  const syncDemoUser = useCallback(() => {
    const p = demoStore.getCurrentProfile();
    const demoUser: AuthUser = {
      id: p.id,
      email: `${p.username}@recurse.app`,
      profile: p,
    };
    setUser(demoUser);
    setProfile(p);
    setSession(null);
    setLoading(false);
  }, []);

  // Fetch Supabase user profile
  const fetchSupabaseProfile = useCallback(async (sbUser: User) => {
    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sbUser.id)
        .single();

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
          avatar_url: sbUser.user_metadata?.avatar_url || '',
          bio: '',
          leetcode_username: '',
          identity_label: undefined,
          is_online: true,
          last_seen_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
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

  // Listen to external demo mode events
  useEffect(() => {
    const handleDemoChange = (e: Event) => {
      const active = (e as CustomEvent<boolean>).detail;
      setIsDemo(active);
      if (active) {
        syncDemoUser();
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    window.addEventListener('recurse_demo_mode_changed', handleDemoChange);
    return () => {
      window.removeEventListener('recurse_demo_mode_changed', handleDemoChange);
    };
  }, [syncDemoUser]);

  useEffect(() => {
    const demoActive = isDemoModeActive();
    setIsDemo(demoActive);

    if (demoActive) {
      syncDemoUser();
      const unsub = demoStore.subscribe('auth', () => {
        syncDemoUser();
      });
      return unsub;
    }

    if (!isSupabaseConfigured) {
      // Supabase is not configured and demo is not active: logged out visitor
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    // Supabase Live Auth Flow
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
  }, [fetchSupabaseProfile, syncDemoUser]);

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    if (isDemo) {
      syncDemoUser();
      return { success: true };
    }

    if (!isSupabaseConfigured) {
      // Local fallback
      syncDemoUser();
      return { success: true };
    }

    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInErr) throw signInErr;
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
    if (isDemo) {
      demoStore.updateProfile(DEMO_USER_ID, {
        username,
        full_name: fullName || username,
      });
      syncDemoUser();
      return { success: true };
    }

    if (!isSupabaseConfigured) {
      demoStore.updateProfile(DEMO_USER_ID, {
        username,
        full_name: fullName || username,
      });
      syncDemoUser();
      return { success: true };
    }

    try {
      const { error: signUpErr } = await supabase.auth.signUp({
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
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signInWithOAuth = async (provider: 'github' | 'google') => {
    setError(null);
    if (isDemo || !isSupabaseConfigured) {
      syncDemoUser();
      return { success: true };
    }

    try {
      const { error: oAuthErr } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
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

  const enterDemoMode = useCallback(() => {
    setDemoModeActive(true);
    setIsDemo(true);
    syncDemoUser();
  }, [syncDemoUser]);

  const exitDemoMode = useCallback(() => {
    setDemoModeActive(false);
    setIsDemo(false);
    setUser(null);
    setProfile(null);
    setSession(null);
    setLoading(false);
  }, []);

  const signInAsDemoUser = () => {
    enterDemoMode();
  };

  const signOut = async () => {
    if (isDemo) {
      exitDemoMode();
      return;
    }

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
    if (isDemo || !isSupabaseConfigured) {
      const currentId = user?.id || DEMO_USER_ID;
      const updated = demoStore.updateProfile(currentId, updates);
      setProfile(updated);
      return { success: true };
    }

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
    isDemo,
    signInWithEmail,
    signUpWithEmail,
    signInWithOAuth,
    signInAsDemoUser,
    enterDemoMode,
    exitDemoMode,
    signOut,
    updateProfile,
  };
}
