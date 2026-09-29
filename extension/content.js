/**
 * Recurse Extension: LeetCode Solve Listener
 * Injected on LeetCode problem pages. When the user submits a solution and the
 * verdict is "Accepted", the solve is reported to Recurse via Supabase.
 */

(function () {
  'use strict';

  const SUPABASE_URL = 'https://nhsbgweplsbiodxbdbcc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_VoDVFwrmAavSi6FxXV0BHA_wwX-Zm9B';

  // A verdict only counts if it appears within this window after clicking Submit.
  // This keeps "Run" results, old submissions and the problem's "Accepted" stats
  // counter from being mistaken for a fresh solve.
  const SUBMIT_WINDOW_MS = 2 * 60 * 1000;

  let submitArmedAt = 0;
  // True once no "Accepted" verdict is on screen after Submit, so a stale verdict
  // from a previous submission can't be mistaken for this one's.
  let verdictCleared = false;
  let isProcessing = false;

  // Extract problem slug from URL pathname (e.g. /problems/two-sum/)
  function getProblemSlug() {
    const match = window.location.pathname.match(/\/problems\/([^/]+)/);
    return match ? match[1].toLowerCase() : null;
  }

  // "1. Two Sum - LeetCode" -> "Two Sum"
  function getProblemTitle() {
    const raw = (document.title || '').replace(/\s*-\s*LeetCode\s*$/i, '').trim();
    return raw.replace(/^\d+\.\s*/, '') || null;
  }

  function getProblemDifficulty() {
    const el = document.querySelector(
      '[class*="text-difficulty-easy"], [class*="text-difficulty-medium"], [class*="text-difficulty-hard"]'
    );
    const text = el && el.textContent ? el.textContent.trim() : '';
    return ['Easy', 'Medium', 'Hard'].indexOf(text) >= 0 ? text : null;
  }

  function localDateKey() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  // Display a refined Apple HIG style toast notification
  function showToast(message, tone) {
    const existing = document.getElementById('recurse-sync-toast');
    if (existing) {
      existing.remove();
    }

    const colors = {
      success: { dot: '#10B981', glow: 'rgba(16,185,129,0.6)', border: 'rgba(255,255,255,0.12)', bg: '#090D16' },
      info: { dot: '#38BDF8', glow: 'rgba(56,189,248,0.6)', border: 'rgba(255,255,255,0.12)', bg: '#090D16' },
      warning: { dot: '#F59E0B', glow: 'rgba(245,158,11,0.6)', border: 'rgba(245,158,11,0.45)', bg: '#1E1812' },
    }[tone || 'success'];

    const toast = document.createElement('div');
    toast.id = 'recurse-sync-toast';
    toast.setAttribute('role', 'status');
    toast.style.cssText = [
      'position: fixed',
      'bottom: 24px',
      'right: 24px',
      'z-index: 999999',
      'max-width: 360px',
      'padding: 12px 18px',
      'background-color: ' + colors.bg,
      'color: #F8FAFC',
      'border: 1px solid ' + colors.border,
      'border-radius: 10px',
      'box-shadow: 0 12px 28px -4px rgba(0,0,0,0.6)',
      'font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
      'font-size: 13px',
      'font-weight: 500',
      'line-height: 1.4',
      'display: flex',
      'align-items: center',
      'gap: 10px',
      'transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      'opacity: 0',
      'transform: translateY(8px)',
    ].join(';');

    const indicator = document.createElement('span');
    indicator.style.cssText = [
      'display: inline-block',
      'flex-shrink: 0',
      'width: 7px',
      'height: 7px',
      'border-radius: 50%',
      'background-color: ' + colors.dot,
      'box-shadow: 0 0 8px ' + colors.glow,
    ].join(';');

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(indicator);
    toast.appendChild(text);
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(function () { toast.remove(); }, 300);
    }, 4500);
  }

  function storageGet(keys) {
    return new Promise(function (resolve) {
      chrome.storage.local.get(keys, function (data) { resolve(data || {}); });
    });
  }

  function storageSet(values) {
    return new Promise(function (resolve) {
      chrome.storage.local.set(values, resolve);
    });
  }

  // POST to log_extension_solve. Falls back to the anon key if the stored
  // session token has expired, and to the v1 parameter set if the database
  // has not been migrated to accept title/difficulty yet.
  async function callLogSolveRpc(payload, accessToken) {
    async function post(body, bearer) {
      const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/log_extension_solve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: 'Bearer ' + bearer,
        },
        body: JSON.stringify(body),
      });
      let json = null;
      try { json = await res.json(); } catch (_e) { /* empty body */ }
      return { status: res.status, ok: res.ok, json: json };
    }

    let bearer = accessToken || SUPABASE_KEY;
    let res = await post(payload, bearer);

    if (res.status === 401 && bearer !== SUPABASE_KEY) {
      bearer = SUPABASE_KEY;
      res = await post(payload, bearer);
    }

    if (!res.ok && res.json && res.json.code === 'PGRST202') {
      res = await post({
        p_user_id: payload.p_user_id,
        p_problem_slug: payload.p_problem_slug,
        p_submission_url: payload.p_submission_url,
      }, bearer);
    }

    return Boolean(res.ok && res.json && res.json.success);
  }

  async function queueSolve(item) {
    const data = await storageGet(['pending_solves']);
    const pending = Array.isArray(data.pending_solves) ? data.pending_solves : [];
    const duplicate = pending.some(function (p) {
      return p.p_problem_slug === item.p_problem_slug && p.day === item.day;
    });
    if (!duplicate) {
      pending.push(item);
      await storageSet({ pending_solves: pending });
    }
  }

  // Report a confirmed solve to Recurse
  async function reportSolve(slug) {
    if (isProcessing) return;
    isProcessing = true;

    try {
      // After the extension is reloaded, scripts left in open tabs lose access to it.
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        showToast('Recurse was updated. Refresh this page to keep tracking solves.', 'warning');
        return;
      }
      if (!chrome.storage || !chrome.storage.local) return;

      const session = await storageGet([
        'recurse_user_id', 'recurse_token', 'recurse_access_token', 'recurse_connected', 'logged_solves',
      ]);

      const userId = session.recurse_user_id || session.recurse_token || '';
      if (!userId || session.recurse_connected === false) {
        showToast('Recurse: Open Recurse and sign in to start tracking solves.', 'warning');
        return;
      }

      // Already logged this problem today — the database de-duplicates too,
      // but skipping here avoids a pointless request and a repeat toast.
      const day = localDateKey();
      const logged = session.logged_solves && typeof session.logged_solves === 'object' ? session.logged_solves : {};
      if (logged[slug] === day) {
        showToast('Recurse: "' + (getProblemTitle() || slug) + '" is already logged for today.', 'info');
        return;
      }

      const payload = {
        p_user_id: userId,
        p_problem_slug: slug,
        p_submission_url: window.location.href,
        p_title: getProblemTitle(),
        p_difficulty: getProblemDifficulty(),
      };

      let recorded = false;
      try {
        recorded = await callLogSolveRpc(payload, session.recurse_access_token || '');
      } catch (_e) {
        recorded = false; // Network error
      }

      if (recorded) {
        // Keep only today's entries so the map doesn't grow forever.
        const nextLogged = {};
        Object.keys(logged).forEach(function (k) { if (logged[k] === day) nextLogged[k] = day; });
        nextLogged[slug] = day;
        await storageSet({ logged_solves: nextLogged });
        showToast('Recurse: "' + (payload.p_title || slug) + '" logged to your streak!', 'success');
      } else {
        await queueSolve(Object.assign({ day: day, timestamp: new Date().toISOString() }, payload));
        showToast('Recurse: Couldn\'t reach Recurse. This solve is saved and will sync next time you open Recurse.', 'warning');
      }
    } finally {
      setTimeout(function () { isProcessing = false; }, 3000);
    }
  }

  // Arm detection when the user clicks LeetCode's Submit button (or presses
  // Ctrl/Cmd+Enter, LeetCode's submit shortcut).
  function isSubmitControl(target) {
    const el = target && target.closest ? target.closest('button, [role="button"]') : null;
    if (!el) return false;
    if (el.getAttribute('data-e2e-locator') === 'console-submit-button') return true;
    return (el.textContent || '').trim() === 'Submit';
  }

  function armSubmit() {
    submitArmedAt = Date.now();
    verdictCleared = !findAcceptedVerdict();
  }

  document.addEventListener('click', function (e) {
    if (isSubmitControl(e.target)) armSubmit();
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      armSubmit();
    }
  }, true);

  function findAcceptedVerdict() {
    const result = document.querySelector('[data-e2e-locator="submission-result"]');
    if (result && (result.textContent || '').indexOf('Accepted') >= 0) return true;

    // Fallback for UI changes: a visible leaf node reading exactly "Accepted".
    const elements = document.querySelectorAll('span, div, h3, h4');
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (
        el.childNodes.length === 1 &&
        el.childNodes[0].nodeType === Node.TEXT_NODE &&
        el.textContent.trim() === 'Accepted' &&
        (el.offsetWidth > 0 || el.offsetHeight > 0)
      ) {
        return true;
      }
    }
    return false;
  }

  function scanForAcceptedResult() {
    if (!submitArmedAt || Date.now() - submitArmedAt > SUBMIT_WINDOW_MS) return;

    const slug = getProblemSlug();
    if (!slug) return;

    if (!findAcceptedVerdict()) {
      verdictCleared = true;
    } else if (verdictCleared) {
      submitArmedAt = 0; // One report per submission
      reportSolve(slug);
    }
  }

  // Observe DOM mutations to catch async LeetCode submission results
  let scanScheduled = false;
  const observer = new MutationObserver(function () {
    if (!submitArmedAt || scanScheduled) return;
    scanScheduled = true;
    setTimeout(function () {
      scanScheduled = false;
      scanForAcceptedResult();
    }, 250);
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
