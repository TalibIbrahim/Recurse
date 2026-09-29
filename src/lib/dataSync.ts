import { useEffect, useRef } from 'react';

// ============================================================================
// Cross-hook refresh
// ----------------------------------------------------------------------------
// Each data hook loads independently, so a write in one (e.g. logging a solve)
// would otherwise leave rings, streaks and the leaderboard stale until reload.
// Writers call notifyDataChanged(); readers subscribe with useDataRefresh().
// Readers also refresh when the tab regains focus, which picks up solves the
// browser extension logged while the user was on LeetCode.
// ============================================================================

const EVENT = 'recurse:data-changed';

export function notifyDataChanged(): void {
  window.dispatchEvent(new Event(EVENT));
}

export function useDataRefresh(reload: () => unknown, enabled: boolean = true): void {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      reloadRef.current();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') run();
    };

    // The extension's auth bridge posts this after syncing queued solves.
    const onMessage = (event: MessageEvent) => {
      if (event.source === window && event.data?.type === 'RECURSE_SOLVES_SYNCED') run();
    };

    window.addEventListener(EVENT, run);
    window.addEventListener('message', onMessage);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener(EVENT, run);
      window.removeEventListener('message', onMessage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);
}

// ============================================================================
// Schema-drift tolerance
// ----------------------------------------------------------------------------
// If supabase/fix_schema_drift.sql has not been applied, writes that include a
// newer column fail with PGRST204. Retry without the unknown column so the core
// write still succeeds; the dropped columns are returned for the caller to log.
// ============================================================================

interface PostgrestLikeError {
  code?: string;
  message: string;
}

const MISSING_COLUMN_RE = /Could not find the '([^']+)' column/;

export async function writeWithColumnFallback<T>(
  payload: Record<string, unknown>,
  write: (body: Record<string, unknown>) => PromiseLike<{ data: T | null; error: PostgrestLikeError | null }>
): Promise<{ data: T | null; error: PostgrestLikeError | null; droppedColumns: string[] }> {
  const body = { ...payload };
  const droppedColumns: string[] = [];

  for (let i = 0; i < 6; i++) {
    const { data, error } = await write(body);
    const missing = error?.code === 'PGRST204' ? error.message.match(MISSING_COLUMN_RE)?.[1] : undefined;
    if (!missing || !(missing in body)) {
      if (droppedColumns.length > 0) {
        console.warn(
          `[Recurse] Database is missing column(s): ${droppedColumns.join(', ')}. ` +
            'Run supabase/fix_schema_drift.sql to enable them.'
        );
      }
      return { data, error, droppedColumns };
    }
    delete body[missing];
    droppedColumns.push(missing);
  }

  return { data: null, error: { message: 'Too many missing columns' }, droppedColumns };
}
