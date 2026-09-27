/**
 * Recurse Extension: Popup Controller
 * Manages user credentials, target Cloudflare Pages endpoint, and connectivity tests.
 */

document.addEventListener('DOMContentLoaded', () => {
  const serverUrlInput = document.getElementById('serverUrl');
  const apiTokenInput = document.getElementById('apiToken');
  const btnSave = document.getElementById('btnSave');
  const btnTest = document.getElementById('btnTest');
  const statusBox = document.getElementById('statusBox');

  const storage =
    typeof chrome !== 'undefined' && chrome.storage
      ? chrome.storage.sync || chrome.storage.local
      : null;

  function showStatus(message, isSuccess = true) {
    statusBox.textContent = message;
    statusBox.className = isSuccess ? 'status success' : 'status error';
    statusBox.style.display = 'flex';

    setTimeout(() => {
      statusBox.style.display = 'none';
    }, 4000);
  }

  // Load existing configuration
  if (storage) {
    storage.get(['recurse_url', 'recurse_token'], (data) => {
      if (data) {
        if (data.recurse_url) {
          serverUrlInput.value = data.recurse_url;
        }
        if (data.recurse_token) {
          apiTokenInput.value = data.recurse_token;
        }
      }
    });
  } else {
    // LocalStorage fallback for local preview
    const url = localStorage.getItem('recurse_url');
    const token = localStorage.getItem('recurse_token');
    if (url) serverUrlInput.value = url;
    if (token) apiTokenInput.value = token;
  }

  // Save Settings handler
  btnSave.addEventListener('click', () => {
    const rawUrl = serverUrlInput.value.trim() || 'https://recurse.pages.dev';
    const cleanUrl = rawUrl.replace(/\/+$/, '');
    const token = apiTokenInput.value.trim();

    if (!token) {
      showStatus('Please enter an API Token.', false);
      return;
    }

    if (storage) {
      storage.set(
        {
          recurse_url: cleanUrl,
          recurse_token: token,
        },
        () => {
          showStatus('Settings saved successfully.', true);
        }
      );
    } else {
      localStorage.setItem('recurse_url', cleanUrl);
      localStorage.setItem('recurse_token', token);
      showStatus('Settings saved (localStorage).', true);
    }
  });

  // Test Connection handler
  btnTest.addEventListener('click', async () => {
    const rawUrl = serverUrlInput.value.trim() || 'https://recurse.pages.dev';
    const cleanUrl = rawUrl.replace(/\/+$/, '');
    const token = apiTokenInput.value.trim();

    if (!token) {
      showStatus('Enter an API Token first.', false);
      return;
    }

    btnTest.textContent = 'Testing...';
    btnTest.disabled = true;

    try {
      const res = await fetch(`${cleanUrl}/api/recap`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-API-Token': token,
        },
      });

      if (res.ok) {
        showStatus('Connection successful. Server reachable.', true);
      } else {
        showStatus(`Server responded with HTTP ${res.status}.`, false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      showStatus(`Connection failed: ${msg}`, false);
    } finally {
      btnTest.textContent = 'Test Connection';
      btnTest.disabled = false;
    }
  });
});
