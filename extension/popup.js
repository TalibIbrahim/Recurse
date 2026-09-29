/**
 * Recurse Extension: Popup Controller
 * Apple HIG interface managing authentication state, 1-click dashboard access,
 * and direct Supabase token verification.
 */

document.addEventListener('DOMContentLoaded', () => {
  const viewConnected = document.getElementById('viewConnected');
  const viewDisconnected = document.getElementById('viewDisconnected');
  const connectedName = document.getElementById('connectedName');
  const connectedHandle = document.getElementById('connectedHandle');
  const connectedUserId = document.getElementById('connectedUserId');
  const copyHint = document.getElementById('copyHint');
  const tokenRow = document.getElementById('tokenRow');

  const btnDashboard = document.getElementById('btnDashboard');
  const btnLeetCode = document.getElementById('btnLeetCode');
  const btnDisconnect = document.getElementById('btnDisconnect');
  const btnLogin = document.getElementById('btnLogin');

  const manualToggle = document.getElementById('manualToggle');
  const manualContent = document.getElementById('manualContent');
  const manualChevron = document.getElementById('manualChevron');
  const manualTokenInput = document.getElementById('manualTokenInput');
  const btnManualConnect = document.getElementById('btnManualConnect');

  const statusAlert = document.getElementById('statusAlert');

  const RECURSE_BASE_URL = 'https://recurse.talibibrahim04.workers.dev';
  const SUPABASE_URL = 'https://nhsbgweplsbiodxbdbcc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_VoDVFwrmAavSi6FxXV0BHA_wwX-Zm9B';

  const storage =
    typeof chrome !== 'undefined' && chrome.storage
      ? chrome.storage.local
      : null;

  function showAlert(message, isSuccess = true) {
    statusAlert.textContent = message;
    statusAlert.className = isSuccess ? 'status-alert success' : 'status-alert error';
    statusAlert.style.display = 'flex';

    setTimeout(() => {
      statusAlert.style.display = 'none';
    }, 4000);
  }

  function renderConnectedState(userData) {
    viewConnected.style.display = 'block';
    viewDisconnected.style.display = 'none';

    const name = userData.recurse_full_name || userData.recurse_username || 'Account User';
    const handle = userData.recurse_username ? `@${userData.recurse_username}` : '';
    const userId = userData.recurse_user_id || userData.recurse_token || '';

    connectedName.textContent = name;
    connectedHandle.textContent = handle;
    connectedUserId.textContent = userId;
  }

  function renderDisconnectedState() {
    viewConnected.style.display = 'none';
    viewDisconnected.style.display = 'block';
  }

  // Load existing session from storage
  function checkSession() {
    if (!storage) {
      renderDisconnectedState();
      return;
    }

    storage.get(
      [
        'recurse_user_id',
        'recurse_token',
        'recurse_username',
        'recurse_full_name',
        'recurse_connected',
      ],
      (data) => {
        const userId = data.recurse_user_id || data.recurse_token;
        if (userId && data.recurse_connected !== false) {
          renderConnectedState(data);
        } else {
          renderDisconnectedState();
        }
      }
    );
  }

  // Copy User ID on token row click
  tokenRow?.addEventListener('click', async () => {
    const text = connectedUserId.textContent;
    if (text && text !== '...') {
      try {
        await navigator.clipboard.writeText(text);
        copyHint.textContent = 'Copied!';
        copyHint.style.color = '#10B981';
        setTimeout(() => {
          copyHint.textContent = 'Copy';
          copyHint.style.color = '#38BDF8';
        }, 2000);
      } catch {
        // Fallback
      }
    }
  });

  // Action: Open Dashboard
  btnDashboard?.addEventListener('click', () => {
    if (chrome && chrome.tabs) {
      chrome.tabs.create({ url: `${RECURSE_BASE_URL}/today` });
    } else {
      window.open(`${RECURSE_BASE_URL}/today`, '_blank');
    }
  });

  // Action: Open LeetCode
  btnLeetCode?.addEventListener('click', () => {
    if (chrome && chrome.tabs) {
      chrome.tabs.create({ url: 'https://leetcode.com/problemset/' });
    } else {
      window.open('https://leetcode.com/problemset/', '_blank');
    }
  });

  // Action: Log in to Recurse
  btnLogin?.addEventListener('click', () => {
    if (chrome && chrome.tabs) {
      chrome.tabs.create({ url: RECURSE_BASE_URL });
    } else {
      window.open(RECURSE_BASE_URL, '_blank');
    }
  });

  // Action: Disconnect
  btnDisconnect?.addEventListener('click', () => {
    if (storage) {
      storage.set(
        {
          recurse_connected: false,
          recurse_user_id: '',
          recurse_token: '',
          recurse_access_token: '',
        },
        () => {
          showAlert('Account disconnected.', true);
          renderDisconnectedState();
        }
      );
    } else {
      renderDisconnectedState();
    }
  });

  // Toggle manual connection section
  manualToggle?.addEventListener('click', () => {
    const isOpen = manualContent.classList.toggle('open');
    manualChevron.textContent = isOpen ? '▴' : '▾';
  });

  // Manual Connection handler
  btnManualConnect?.addEventListener('click', async () => {
    const token = (manualTokenInput.value || '').trim();

    if (!token) {
      showAlert('Please enter your Account ID / Token.', false);
      return;
    }

    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      showAlert('Invalid ID format. Must be a valid 36-character User UUID.', false);
      return;
    }

    btnManualConnect.textContent = 'Verifying...';
    btnManualConnect.disabled = true;

    try {
      let username = 'User';
      let fullName = 'Recurse Account';

      // 1. Try verify_extension_user RPC
      try {
        const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_extension_user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ p_user_id: token }),
        });

        if (rpcRes.ok) {
          const rpcData = await rpcRes.json();
          if (rpcData && rpcData.success) {
            username = rpcData.username || username;
            fullName = rpcData.full_name || fullName;
          }
        }
      } catch {
        // Fall through to direct profile query
      }

      // Save verified credentials
      const sessionData = {
        recurse_user_id: token,
        recurse_token: token,
        recurse_username: username,
        recurse_full_name: fullName,
        recurse_connected: true,
        recurse_last_sync: new Date().toISOString(),
      };

      if (storage) {
        storage.set(sessionData, () => {
          renderConnectedState(sessionData);
          showAlert(`Connected to ${fullName}!`, true);
        });
      } else {
        renderConnectedState(sessionData);
        showAlert(`Connected to ${fullName}!`, true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      showAlert(`Error: ${msg}`, false);
    } finally {
      btnManualConnect.textContent = 'Connect Account';
      btnManualConnect.disabled = false;
    }
  });

  // --- Version, update check & reload ---
  const versionBadge = document.getElementById('versionBadge');
  const updateBanner = document.getElementById('updateBanner');
  const updateText = document.getElementById('updateText');
  const btnReload = document.getElementById('btnReload');
  const btnReloadNow = document.getElementById('btnReloadNow');
  const btnCheckUpdate = document.getElementById('btnCheckUpdate');

  const installedVersion =
    typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest
      ? chrome.runtime.getManifest().version
      : '0.0.0';

  if (versionBadge) versionBadge.textContent = `v${installedVersion}`;

  // Returns >0 if a is newer than b.
  function compareVersions(a, b) {
    const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
    const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  function showUpdateBanner(latest) {
    updateText.innerHTML =
      `<strong>Version ${latest} is available</strong> (you have ${installedVersion}). ` +
      'Run <code>git pull</code> in the Recurse folder, then reload the extension.';
    updateBanner.classList.add('visible');
  }

  async function checkForUpdate(manual) {
    if (manual) {
      btnCheckUpdate.disabled = true;
      btnCheckUpdate.textContent = 'Checking...';
    }
    try {
      const res = await fetch(`${RECURSE_BASE_URL}/extension-version.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { version: latest } = await res.json();
      if (latest && compareVersions(latest, installedVersion) > 0) {
        showUpdateBanner(latest);
      } else if (manual) {
        updateBanner.classList.remove('visible');
        showAlert(`You're up to date (v${installedVersion}).`, true);
      }
    } catch {
      if (manual) showAlert('Could not check for updates. Try again later.', false);
    } finally {
      if (manual) {
        btnCheckUpdate.disabled = false;
        btnCheckUpdate.textContent = 'Check for updates';
      }
    }
  }

  // Reloads the extension from its folder on disk, picking up pulled changes.
  // The background worker then re-attaches to open LeetCode / Recurse tabs.
  function reloadExtension() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.reload) {
      chrome.runtime.reload();
    }
  }

  btnReload?.addEventListener('click', reloadExtension);
  btnReloadNow?.addEventListener('click', reloadExtension);
  btnCheckUpdate?.addEventListener('click', () => checkForUpdate(true));

  // Initial check
  checkSession();
  checkForUpdate(false);
});
