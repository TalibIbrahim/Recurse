/**
 * Recurse Extension: LeetCode Solve Listener
 * Injected on LeetCode problem pages to detect "Accepted" submissions
 * and seamlessly report solves to the Recurse backend & Supabase.
 */

(function () {
  'use strict';

  const SUPABASE_URL = 'https://nhsbgweplsbiodxbdbcc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_VoDVFwrmAavSi6FxXV0BHA_wwX-Zm9B';

  let lastLoggedSubmissionId = '';
  let isProcessing = false;

  // Extract problem slug from URL pathname (e.g. /problems/two-sum/)
  function getProblemSlug() {
    const match = window.location.pathname.match(/\/problems\/([^/]+)/);
    return match ? match[1].toLowerCase() : null;
  }

  // Display a refined Apple HIG style toast notification
  function showToast(message, isError) {
    const existing = document.getElementById('recurse-sync-toast');
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'recurse-sync-toast';
    toast.style.cssText = [
      'position: fixed',
      'bottom: 24px',
      'right: 24px',
      'z-index: 999999',
      'padding: 12px 18px',
      'background-color: ' + (isError ? '#1E1418' : '#090D16'),
      'color: #F8FAFC',
      'border: 1px solid ' + (isError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'),
      'border-radius: 10px',
      'box-shadow: 0 12px 28px -4px rgba(0,0,0,0.6)',
      'font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
      'font-size: 13px',
      'font-weight: 500',
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
      'width: 7px',
      'height: 7px',
      'border-radius: 50%',
      'background-color: ' + (isError ? '#F59E0B' : '#10B981'),
      'box-shadow: 0 0 8px ' + (isError ? 'rgba(245,158,11,0.6)' : 'rgba(16,185,129,0.6)'),
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

  // Report a confirmed solve to Recurse
  async function reportSolve(problemSlug) {
    if (isProcessing) return;
    isProcessing = true;

    try {
      // Get chrome.storage.local
      var storage = null;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        storage = chrome.storage.local;
      }

      if (!storage) {
        // Extension storage unavailable — silently skip
        return;
      }

      // Load session from extension storage
      var session = await new Promise(function (resolve) {
        storage.get(
          ['recurse_user_id', 'recurse_token', 'recurse_access_token', 'recurse_connected'],
          function (data) { resolve(data || {}); }
        );
      });

      var userId = session.recurse_user_id || session.recurse_token || '';
      var accessToken = session.recurse_access_token || '';

      // If not connected, show a soft prompt (not an error) and exit
      if (!userId || session.recurse_connected === false) {
        showToast('Recurse: Sign in to track this solve.', false);
        return;
      }

      var recorded = false;

      // --- Path 1: Supabase RPC log_extension_solve (SECURITY DEFINER — bypasses RLS) ---
      // This works once the extension_migration.sql has been applied in Supabase.
      try {
        var rpcBody = JSON.stringify({
          p_user_id: userId,
          p_problem_slug: problemSlug,
          p_submission_url: window.location.href,
        });
        var rpcRes = await fetch(SUPABASE_URL + '/rest/v1/rpc/log_extension_solve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + (accessToken || SUPABASE_KEY),
          },
          body: rpcBody,
        });

        if (rpcRes.ok) {
          var rpcJson = await rpcRes.json();
          if (rpcJson && rpcJson.success) {
            recorded = true;
          }
        }
      } catch (_e) {
        // Network error — fall through
      }

      // --- Path 2: Direct REST insert with user's real JWT (bypasses RLS as authenticated user) ---
      if (!recorded && accessToken) {
        try {
          var restBody = JSON.stringify({
            user_id: userId,
            problem_id: problemSlug,
            status: 'solved',
            approach_notes: 'Logged via Recurse Extension',
            submission_url: window.location.href,
            solved_at: new Date().toISOString(),
          });
          var restRes = await fetch(SUPABASE_URL + '/rest/v1/attempts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': 'Bearer ' + accessToken,
              'Prefer': 'return=minimal',
            },
            body: restBody,
          });

          if (restRes.ok || restRes.status === 201) {
            recorded = true;
          }
        } catch (_e2) {
          // Fall through to queue
        }
      }

      // --- Path 3: Queue locally — never lose a solve ---
      storage.get(['pending_solves'], function (data) {
        var pending = (data && Array.isArray(data.pending_solves)) ? data.pending_solves : [];

        // Deduplicate: skip if queued for same slug in last 30 seconds
        var now = Date.now();
        var alreadyQueued = pending.some(function (item) {
          return item.slug === problemSlug && (now - new Date(item.timestamp).getTime()) < 30000;
        });

        if (!alreadyQueued) {
          pending.push({
            slug: problemSlug,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            synced: recorded,
          });
          storage.set({ pending_solves: pending });
        }
      });

      // Always show a positive confirmation — the solve is tracked regardless of sync status
      showToast('Recurse: "' + problemSlug + '" logged to your streak!', false);

    } finally {
      setTimeout(function () { isProcessing = false; }, 5000);
    }
  }

  // Scan DOM for LeetCode "Accepted" result
  function scanForAcceptedResult() {
    var slug = getProblemSlug();
    if (!slug) return;

    var isAccepted = false;

    // Primary: check known LeetCode UI selectors
    var resultElement =
      document.querySelector('[data-e2e-locator="submission-result"]') ||
      document.querySelector('[data-e2e-locator="console-result"]') ||
      document.querySelector('span[data-state="success"]') ||
      document.querySelector('.text-green-s') ||
      document.querySelector('.text-success');

    if (resultElement && resultElement.textContent && resultElement.textContent.includes('Accepted')) {
      isAccepted = true;
    }

    // Fallback: scan all visible text nodes for literal "Accepted"
    if (!isAccepted) {
      var elements = document.querySelectorAll('span, div, p');
      for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        if (
          el.childNodes.length === 1 &&
          el.childNodes[0].nodeType === Node.TEXT_NODE &&
          el.textContent.trim() === 'Accepted' &&
          (el.offsetWidth > 0 || el.offsetHeight > 0)
        ) {
          isAccepted = true;
          break;
        }
      }
    }

    if (isAccepted) {
      // Use a time-windowed key to avoid double-reporting within 15 seconds
      var submissionKey = slug + '-' + Math.floor(Date.now() / 15000);
      if (submissionKey !== lastLoggedSubmissionId) {
        lastLoggedSubmissionId = submissionKey;
        reportSolve(slug);
      }
    }
  }

  // Observe DOM mutations to catch async LeetCode submission results
  var observer = new MutationObserver(function () {
    scanForAcceptedResult();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial scan on load
  scanForAcceptedResult();
})();
