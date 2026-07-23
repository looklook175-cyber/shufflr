// Shufflr — Web app bridge (content script on shufflr-app.netlify.app)
// Receives SHUFFLR_SYNC_PLAYLISTS from Max via chrome.tabs.sendMessage and forwards to the page.

(function () {
  const SHUFFLR_SUPABASE_SESSION_KEY = 'shufflr_supabase_session';
  const SHUFFLR_YOUR_SHOWS_KEY = 'shufflr_your_shows';
  const SHUFFLR_SHUFFLE_SETTINGS_KEY = 'shufflr_shuffle_settings';

  function syncSupabaseSessionToExtension() {
    try {
      const raw = localStorage.getItem(SHUFFLR_SUPABASE_SESSION_KEY);
      if (!raw) {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.runtime?.id) return;
        try {
          chrome.storage.local.remove(SHUFFLR_SUPABASE_SESSION_KEY);
        } catch (err) {
          console.error('[Shufflr] bridge.js — session remove failed:', err);
        }
        return;
      }

      const session = JSON.parse(raw);
      if (!session?.userId || !session?.accessToken) {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.runtime?.id) return;
        try {
          chrome.storage.local.remove(SHUFFLR_SUPABASE_SESSION_KEY);
        } catch (err) {
          console.error('[Shufflr] bridge.js — session remove failed:', err);
        }
        return;
      }

      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.runtime?.id) return;
      try {
        chrome.storage.local.set({
          [SHUFFLR_SUPABASE_SESSION_KEY]: {
            userId: session.userId,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken || null,
            expiresAt: session.expiresAt || null,
          },
        }, () => {
          if (chrome.runtime.lastError) {
            console.log('[Shufflr] bridge.js — session sync skipped:', chrome.runtime.lastError.message);
            return;
          }
          console.log('[Shufflr] bridge.js — synced Supabase session to extension');
        });
      } catch (err) {
        console.error('[Shufflr] bridge.js — session set failed:', err);
      }
    } catch (err) {
      console.error('[Shufflr] bridge.js — session sync failed:', err);
    }
  }

  function pushAuthSessionPayloadToExtension(session) {
    if (!session?.user?.id || !session?.access_token) {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.runtime?.id) return;
      try {
        chrome.storage.local.remove(SHUFFLR_SUPABASE_SESSION_KEY);
      } catch (err) {
        console.error('[Shufflr] bridge.js — session remove failed:', err);
      }
      return;
    }

    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.runtime?.id) return;
    try {
      chrome.storage.local.set({
        [SHUFFLR_SUPABASE_SESSION_KEY]: {
          userId: session.user.id,
          accessToken: session.access_token,
          refreshToken: session.refresh_token || null,
          expiresAt: session.expires_at || null,
        },
      }, () => {
        if (chrome.runtime.lastError) {
          console.log('[Shufflr] bridge.js — session sync skipped:', chrome.runtime.lastError.message);
          return;
        }
        console.log('[Shufflr] bridge.js — synced Supabase session to extension');
      });
    } catch (err) {
      console.error('[Shufflr] bridge.js — session set failed:', err);
    }
  }

  function syncYourShowsToExtensionStorage(shows) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.runtime?.id) return;
    const list = Array.isArray(shows) ? shows : [];
    try {
      chrome.storage.local.set({ [SHUFFLR_YOUR_SHOWS_KEY]: list }, () => {
        if (chrome.runtime.lastError) {
          console.log('[Shufflr] bridge.js — Your Shows sync skipped:', chrome.runtime.lastError.message);
          return;
        }
        console.log('[Shufflr] bridge.js — synced Your Shows to extension:', list.length);
      });
    } catch (err) {
      console.error('[Shufflr] bridge.js — Your Shows sync failed:', err);
    }
  }

  function syncYourShowsFromLocalStorage() {
    try {
      const raw = localStorage.getItem(SHUFFLR_YOUR_SHOWS_KEY);
      if (!raw) return;
      const shows = JSON.parse(raw);
      if (!Array.isArray(shows) || !shows.length) return;
      syncYourShowsToExtensionStorage(shows);
    } catch (err) {
      console.error('[Shufflr] bridge.js — Your Shows localStorage read failed:', err);
    }
  }

  function scheduleSupabaseSessionSyncOnPageLoad() {
    const syncAll = () => {
      syncSupabaseSessionToExtension();
      syncYourShowsFromLocalStorage();
    };
    syncAll();
    window.addEventListener('load', syncAll);
    window.addEventListener('pageshow', syncAll);
    window.addEventListener('focus', syncAll);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        syncAll();
      }
    });
    window.addEventListener('storage', (event) => {
      if (event.key === SHUFFLR_SUPABASE_SESSION_KEY) {
        syncSupabaseSessionToExtension();
      }
      if (event.key === SHUFFLR_YOUR_SHOWS_KEY) {
        syncYourShowsFromLocalStorage();
      }
    });
    setTimeout(syncAll, 500);
    setTimeout(syncAll, 2000);
    // Keep session + Your Shows warm while the web app tab stays open.
    setInterval(() => {
      if (document.visibilityState === 'visible') syncAll();
    }, 5 * 60 * 1000);
  }

  scheduleSupabaseSessionSyncOnPageLoad();

  try {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes[SHUFFLR_SHUFFLE_SETTINGS_KEY]) return;
      const next = changes[SHUFFLR_SHUFFLE_SETTINGS_KEY].newValue;
      if (!next || typeof next !== 'object') return;
      window.postMessage({
        type: 'SHUFFLR_SHUFFLE_SETTINGS_FROM_EXTENSION',
        source: 'shufflr-extension',
        settings: next,
      }, '*');
    });
  } catch (err) {
    console.error('[Shufflr] bridge.js — shuffle settings listener failed:', err);
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type === 'SHUFFLR_GET_PLAYLISTS') {
      chrome.storage.local.get('shufflr_playlists', (result) => {
        const playlists = result.shufflr_playlists || [];
        window.postMessage({ type: 'SHUFFLR_PLAYLISTS_RESPONSE', playlists }, '*');
      });
      return;
    }
    if (event.data?.type === 'SHUFFLR_SET_ACTIVE_PLAYLIST') {
      chrome.storage.local.set({
        shufflr_active_playlist: event.data.playlist,
        shufflr_launch_show_url: event.data.launchUrl,
      });
      return;
    }
    if (event.data?.type === 'SHUFFLR_LAUNCH_STANDALONE_SHOW') {
      const payload = {
        shufflr_launch_show_url: event.data.launchUrl,
        shufflr_launch_standalone: true,
        shufflr_launch_intent: event.data.launchIntent === 'single' ? 'single' : 'mode',
        shufflr_launch_standalone_at: Date.now(),
      };
      const maxId = event.data.maxId;
      if (maxId && Array.isArray(event.data.blockedSeasons)) {
        payload[`shufflr_blocked_seasons_${maxId}`] = event.data.blockedSeasons;
      }
      chrome.storage.local.set(payload);
      return;
    }
    if (event.data?.type === 'SHUFFLR_SAVE_PLAYLISTS') {
      chrome.storage.local.set({ shufflr_playlists: event.data.playlists || [] });
      return;
    }
    if (event.data?.type === 'SHUFFLR_SYNC_YOUR_SHOWS' || event.data?.type === 'SHUFFLR_SAVE_YOUR_SHOWS') {
      syncYourShowsToExtensionStorage(event.data.shows);
      return;
    }
    if (event.data?.type === 'SHUFFLR_SHUFFLE_SETTINGS') {
      const settings = event.data.settings || {};
      chrome.storage.local.get('shufflr_shuffle_settings', (result) => {
        const existing = result.shufflr_shuffle_settings || {};
        chrome.storage.local.set({
          shufflr_shuffle_settings: {
            ...existing,
            ...settings,
          },
        });
      });
      return;
    }
    if (event.data?.source !== 'shufflr-web') return;
    if (event.data?.type === 'SHUFFLR_AUTH_SESSION') {
      pushAuthSessionPayloadToExtension(event.data.session);
      return;
    }
    if (event.data?.type !== 'SHUFFLR_SUPABASE_SESSION_SYNC') return;
    syncSupabaseSessionToExtension();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log('[Shufflr] bridge.js received message:', message?.type);
    if (message?.type === 'SHUFFLR_SYNC_PLAYLISTS') {
      window.postMessage({
        type: 'SHUFFLR_SYNC_PLAYLISTS',
        source: 'shufflr-extension',
        payload: message.payload || [],
      }, '*');

      console.log('[Shufflr] bridge.js — forwarded playlist sync to web app');
      sendResponse({ ok: true });
      return true;
    }

    if (message?.type === 'SHUFFLR_NOW_PLAYING') {
      console.log('[Shufflr] Forwarding now-playing to page:', message.payload);
      window.postMessage({
        type: 'SHUFFLR_NOW_PLAYING',
        source: 'shufflr-extension',
        payload: message.payload || {},
      }, '*');
      sendResponse({ ok: true });
      return true;
    }
  });
})();
