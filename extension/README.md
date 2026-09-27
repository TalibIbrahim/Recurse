# Recurse Browser Extension: LeetCode Solve Sync

A lightweight Manifest V3 browser extension that automatically captures accepted problem submissions on LeetCode and relays them directly to your Recurse deployment.

---

## Capabilities

- Real-time submission tracking on `*://leetcode.com/problems/*`
- Automatic extraction of problem slug, submission URL, and timestamp
- Non-intrusive on-page status indicators
- Rate-limited and debounced solve reporting
- Zero third-party dependencies

---

## Installation Instructions

### Chromium-Based Browsers (Google Chrome, Microsoft Edge, Brave, Opera)

1. Open your browser and navigate to the extensions manager:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`
2. Enable **Developer mode** via the toggle switch in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the `extension` folder located in the root of this project:
   ```
   d:/Programming/LeetCode Tracker/extension
   ```
5. The extension will appear in your extensions list as **Recurse - LeetCode Solve Sync**.

---

### Mozilla Firefox

1. Open Firefox and navigate to:
   ```
   about:debugging#/runtime/this-firefox
   ```
2. Click the **Load Temporary Add-on...** button.
3. Select the `manifest.json` file located in the `extension` folder.
4. The extension is now active for your current browsing session.

---

## Configuration

1. Click the **Recurse** extension icon pinned to your browser toolbar.
2. Verify or update the **Recurse Server URL** (defaults to `https://recurse.pages.dev` or your local development URL `http://localhost:5173`).
3. Enter your personal **API Authorization Token**.
4. Click **Save Settings**.
5. Click **Test Connection** to confirm connectivity to the Cloudflare Pages edge endpoint.

---

## Usage Workflow

1. Navigate to any problem on LeetCode, for example:
   ```
   https://leetcode.com/problems/two-sum/
   ```
2. Write and submit your code.
3. Upon receiving an **Accepted** verdict, the extension detects the result via a mutation observer and dispatches an authenticated POST request to `/api/extension/log-solve`.
4. A subtle notification toast will confirm that your solve has been credited to your Recurse streak.
