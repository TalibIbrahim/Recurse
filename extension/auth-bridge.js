/**
 * Recurse Extension: Web Authentication Bridge
 * Automatically synchronizes the user's active Recurse session to the extension,
 * eliminates manual token copying, and flushes any pending solves queued offline.
 */

(function () {
  'use strict';

  const STORAGE_KEY_PREFIX = 'sb-';
  const STORAGE_KEY_SUFFIX = '-auth-token';

  function extractSessionFromStorage() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX) && key.endsWith(STORAGE_KEY_SUFFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.user && parsed.user.id) {
              return parsed;
            }
          }
        }
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  }

  function syncAuthToExtension() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return;
    }

    const session = extractSessionFromStorage();

    if (session && session.user && session.user.id) {
      const user = session.user;
      const meta = user.user_metadata || {};
      const email = user.email || '';
      const username = meta.username || meta.user_name || email.split('@')[0] || 'user';
      const fullName = meta.full_name || meta.name || username;

      chrome.storage.local.set(
        {
          recurse_user_id: user.id,
          recurse_token: user.id,
          recurse_access_token: session.access_token || '',
          recurse_username: username,
          recurse_full_name: fullName,
          recurse_email: email,
          recurse_avatar_url: meta.avatar_url || meta.picture || '',
          recurse_connected: true,
          recurse_last_sync: new Date().toISOString(),
        },
        () => {
          // Announce to web page that extension is active and paired
          window.postMessage(
            {
              type: 'RECURSE_EXTENSION_STATUS',
              connected: true,
              userId: user.id,
              username: username,
              fullName: fullName,
            },
            '*'
          );
        }
      );

      // Flush any solves queued while working offline
      flushPendingSolves(user.id, session.access_token);
    } else {
      // Mark as not connected if session was cleared
      chrome.storage.local.get(['recurse_connected'], (res) => {
        if (res && res.recurse_connected) {
          chrome.storage.local.set({
            recurse_connected: false,
            recurse_access_token: '',
          });
        }
      });
    }
  }

  // Flush any pending solves stored in extension queue
  function flushPendingSolves(userId, accessToken) {
    if (!chrome.storage || !chrome.storage.local) return;

    chrome.storage.local.get(['pending_solves'], async (data) => {
      const pending = data.pending_solves || [];
      if (!Array.isArray(pending) || pending.length === 0) return;

      const remaining = [];

      for (const item of pending) {
        try {
          const res = await fetch(
            'https://nhsbgweplsbiodxbdbcc.supabase.co/rest/v1/rpc/log_extension_solve',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: 'sb_publishable_VoDVFwrmAavSi6FxXV0BHA_wwX-Zm9B',
                Authorization: `Bearer ${accessToken || 'sb_publishable_VoDVFwrmAavSi6FxXV0BHA_wwX-Zm9B'}`,
              },
              body: JSON.stringify({
                p_user_id: userId,
                p_problem_slug: item.slug,
                p_submission_url: item.url || null,
              }),
            }
          );

          if (!res.ok) {
            remaining.push(item);
          }
        } catch {
          remaining.push(item);
        }
      }

      chrome.storage.local.set({ pending_solves: remaining });
    });
  }

  // Notify webpage about extension availability
  function announceExtensionPresence() {
    window.__RECURSE_EXTENSION_AVAILABLE__ = true;
    window.dispatchEvent(
      new CustomEvent('recurse:extension-ready', {
        detail: { version: '1.1.0' },
      })
    );
  }

  // Listen for storage events (e.g., login / logout in another tab)
  window.addEventListener('storage', () => {
    syncAuthToExtension();
  });

  // Listen for custom sign-in/out messages from the web app
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'RECURSE_SESSION_UPDATE') {
      syncAuthToExtension();
    }
  });

  // Initial sync on page load
  syncAuthToExtension();
  announceExtensionPresence();

  // Periodic heartbeat sync every 15 seconds while tab is active
  setInterval(syncAuthToExtension, 15000);
})();
