/**
 * Recurse Extension: LeetCode network hook (runs in the page's MAIN world)
 *
 * Watches LeetCode's own submission API instead of scraping the page, which is
 * far more reliable than matching "Accepted" text (the problem description
 * shows an "Accepted" statistic, and "Run" results say "Accepted" too).
 *
 *   POST /problems/<slug>/submit/                 -> { submission_id }
 *   GET  /submissions/detail/<id>/check/          -> { state, status_msg, ... }
 *
 * "Run" uses /interpret_solution/ and ids prefixed "runcode_", which are ignored.
 * Verdicts are relayed to the isolated content script (content.js) via postMessage.
 */

(function () {
  'use strict';

  if (window.__recurseHookInstalled) return;
  window.__recurseHookInstalled = true;

  const SUBMIT_RE = /\/problems\/([^/]+)\/submit\/?(?:\?|$)/;
  const CHECK_RE = /\/submissions\/detail\/([^/]+)\/check\/?(?:\?|$)/;

  const slugBySubmission = new Map();
  const reported = new Set();

  function toUrl(input) {
    try {
      if (typeof input === 'string') return new URL(input, location.href).href;
      if (input && input.url) return input.url;
    } catch (_e) { /* ignore */ }
    return '';
  }

  function slugFromLocation() {
    const m = location.pathname.match(/\/problems\/([^/]+)/);
    return m ? m[1].toLowerCase() : null;
  }

  function handleResponse(url, data) {
    if (!url || !data || typeof data !== 'object') return;

    const submit = url.match(SUBMIT_RE);
    if (submit && data.submission_id != null) {
      slugBySubmission.set(String(data.submission_id), submit[1].toLowerCase());
      return;
    }

    const check = url.match(CHECK_RE);
    if (!check) return;

    const id = String(check[1]);
    if (id.indexOf('runcode') === 0) return; // "Run", not "Submit"
    if (String(data.task_name || '').indexOf('RunCode') >= 0) return;
    if (data.state !== 'SUCCESS') return; // Still judging
    if (reported.has(id)) return;
    reported.add(id);

    const accepted = data.status_msg === 'Accepted' || data.status_code === 10;
    window.postMessage(
      {
        source: 'recurse-leetcode-hook',
        type: accepted ? 'accepted' : 'rejected',
        submissionId: id,
        slug: slugBySubmission.get(id) || slugFromLocation(),
        statusMsg: data.status_msg || '',
      },
      location.origin
    );
  }

  function interesting(url) {
    return SUBMIT_RE.test(url) || CHECK_RE.test(url);
  }

  // fetch
  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = function () {
      const url = toUrl(arguments[0]);
      const promise = originalFetch.apply(this, arguments);
      if (interesting(url)) {
        promise
          .then(function (res) { return res.clone().json(); })
          .then(function (data) { handleResponse(url, data); })
          .catch(function () { /* non-JSON or network error */ });
      }
      return promise;
    };
  }

  // XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__recurseUrl = toUrl(url);
    return originalOpen.apply(this, arguments);
  };

  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    const url = this.__recurseUrl;
    if (url && interesting(url)) {
      this.addEventListener('load', function () {
        try {
          const data = this.responseType === 'json' ? this.response : JSON.parse(this.responseText);
          handleResponse(url, data);
        } catch (_e) { /* non-JSON */ }
      });
    }
    return originalSend.apply(this, arguments);
  };
})();
