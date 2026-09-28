/**
 * Recurse Extension: Content Script
 * Injected on LeetCode problem pages to detect "Accepted" submissions
 * and seamlessly report solves to the Recurse backend.
 */

(function () {
  'use strict';

  const DEFAULT_SERVER_URL = 'https://recurse.talibibrahim04.workers.dev';
  let lastLoggedSubmissionId = '';
  let isProcessing = false;

  // Extract problem slug from URL pathname (e.g. /problems/two-sum/)
  function getProblemSlug() {
    const match = window.location.pathname.match(/\/problems\/([^/]+)/);
    return match ? match[1].toLowerCase() : null;
  }

  // Display a refined Apple HIG style toast notification
  function showToast(message, isError = false) {
    const existing = document.getElementById('recurse-sync-toast');
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'recurse-sync-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.zIndex = '999999';
    toast.style.padding = '12px 18px';
    toast.style.backgroundColor = isError ? '#1E1B2E' : '#0B0F19';
    toast.style.color = '#F8FAFC';
    toast.style.border = isError ? '1px solid #EF4444' : '1px solid #1E293B';
    toast.style.borderRadius = '10px';
    toast.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)';
    toast.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    toast.style.fontSize = '13px';
    toast.style.fontWeight = '500';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';
    toast.style.transition = 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';

    const indicator = document.createElement('span');
    indicator.style.display = 'inline-block';
    indicator.style.width = '8px';
    indicator.style.height = '8px';
    indicator.style.borderRadius = '50%';
    indicator.style.backgroundColor = isError ? '#EF4444' : '#10B981';

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(indicator);
    toast.appendChild(text);
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // Report solve to Recurse Pages API
  async function reportSolve(problemSlug) {
    if (isProcessing) return;
    isProcessing = true;

    try {
      const storage = typeof chrome !== 'undefined' && chrome.storage ? chrome.storage.sync || chrome.storage.local : null;

      let serverUrl = DEFAULT_SERVER_URL;
      let apiToken = '';

      if (storage) {
        const stored = await new Promise((resolve) => {
          storage.get(['recurse_url', 'recurse_token'], (items) => resolve(items || {}));
        });
        if (stored.recurse_url) serverUrl = stored.recurse_url.replace(/\/+$/, '');
        if (stored.recurse_token) apiToken = stored.recurse_token;
      }

      if (!apiToken) {
        showToast('Recurse: Please set your User ID / Sync Token in the extension popup.', true);
        isProcessing = false;
        return;
      }

      const payload = {
        problem_slug: problemSlug,
        user_id: apiToken,
        status: 'solved',
        submission_url: window.location.href,
        solved_at: new Date().toISOString(),
      };

      let loggedSuccessfully = false;

      try {
        const res = await fetch(`${serverUrl}/api/extension/log-solve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
            'X-User-Id': apiToken,
            'X-API-Token': apiToken,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          loggedSuccessfully = true;
        }
      } catch {
        // Fall back to direct Supabase REST insertion
      }

      if (!loggedSuccessfully) {
        try {
          const sbRes = await fetch('https://nhsbgweplsbiodxbdbcc.supabase.co/rest/v1/attempts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: 'sb_publishable_VoDVFwrmAavSi6FxXV0BHA_wwX-Zm9B',
              Authorization: 'Bearer sb_publishable_VoDVFwrmAavSi6FxXV0BHA_wwX-Zm9B',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              user_id: apiToken,
              problem_id: problemSlug,
              status: 'solved',
              approach_notes: 'Logged via Recurse Extension',
              submission_url: window.location.href,
              solved_at: new Date().toISOString(),
            }),
          });

          if (sbRes.ok) {
            loggedSuccessfully = true;
          }
        } catch {
          // Fall through
        }
      }

      if (loggedSuccessfully) {
        showToast(`Recurse: Solved "${problemSlug}" logged to streak.`);
      } else {
        showToast(`Recurse: Solve detected, could not reach server. Check token.`, true);
      }
    } finally {
      setTimeout(() => {
        isProcessing = false;
      }, 5000);
    }
  }

  // Check DOM for "Accepted" state
  function scanForAcceptedResult() {
    const slug = getProblemSlug();
    if (!slug) return;

    let isAccepted = false;
    const resultElement =
      document.querySelector('[data-e2e-locator="submission-result"]') ||
      document.querySelector('[data-e2e-locator="console-result"]') ||
      document.querySelector('span[data-state="success"]') ||
      document.querySelector('.text-green-s') ||
      document.querySelector('.text-success');

    if (resultElement && resultElement.textContent && resultElement.textContent.includes('Accepted')) {
      isAccepted = true;
    } else {
      const elements = document.querySelectorAll('span, div');
      for (const el of elements) {
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
      const submissionKey = `${slug}-${Math.floor(Date.now() / 15000)}`;
      if (submissionKey !== lastLoggedSubmissionId) {
        lastLoggedSubmissionId = submissionKey;
        reportSolve(slug);
      }
    }
  }

  // Setup DOM MutationObserver to catch asynchronous submission results
  const observer = new MutationObserver(() => {
    scanForAcceptedResult();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial check on load
  scanForAcceptedResult();
})();
