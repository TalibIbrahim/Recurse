/**
 * Recurse Extension: Background Service Worker
 * After the extension is installed, updated or reloaded, content scripts in
 * already-open tabs are detached from the extension and stop working until the
 * page is refreshed. Re-inject them so open LeetCode and Recurse tabs keep
 * syncing without the user having to refresh anything.
 */

const INJECTIONS = [
  { file: 'content.js', patterns: ['*://leetcode.com/problems/*'] },
  {
    file: 'auth-bridge.js',
    patterns: [
      'https://recurse.talibibrahim04.workers.dev/*',
      'https://*.workers.dev/*',
      'http://localhost/*',
    ],
  },
];

chrome.runtime.onInstalled.addListener(async () => {
  for (const { file, patterns } of INJECTIONS) {
    let tabs = [];
    try {
      tabs = await chrome.tabs.query({ url: patterns });
    } catch {
      continue;
    }
    for (const tab of tabs) {
      if (tab.id === undefined || tab.discarded) continue;
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [file] });
      } catch {
        // Tab may be closing or not yet loaded — it will get the script on next load.
      }
    }
  }
});
