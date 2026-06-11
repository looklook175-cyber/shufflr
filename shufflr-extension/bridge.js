// Shufflr — Web app bridge (content script on shufflr-app.netlify.app)
// Receives SHUFFLR_SYNC_PLAYLISTS from Max via chrome.tabs.sendMessage and forwards to the page.

(function () {
  const SHUFFLR_SUPABASE_SESSION_KEY = 'shufflr_supabase_session';

  function syncSupabaseSessionToExtension() {
    try {
      const raw = localStorage.getItem(SHUFFLR_SUPABASE_SESSION_KEY);
      if (!raw) {
        chrome.storage.local.remove(SHUFFLR_SUPABASE_SESSION_KEY);
        return;
      }

      const session = JSON.parse(raw);
      if (!session?.userId || !session?.accessToken) {
        chrome.storage.local.remove(SHUFFLR_SUPABASE_SESSION_KEY);
        return;
      }

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
      console.error('[Shufflr] bridge.js — session sync failed:', err);
    }
  }

  function pushAuthSessionPayloadToExtension(session) {
    if (!session?.user?.id || !session?.access_token) {
      chrome.storage.local.remove(SHUFFLR_SUPABASE_SESSION_KEY);
      return;
    }

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
  }

  function scheduleSupabaseSessionSyncOnPageLoad() {
    syncSupabaseSessionToExtension();
    window.addEventListener('load', syncSupabaseSessionToExtension);
    window.addEventListener('pageshow', syncSupabaseSessionToExtension);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        syncSupabaseSessionToExtension();
      }
    });
    window.addEventListener('storage', (event) => {
      if (event.key === SHUFFLR_SUPABASE_SESSION_KEY) {
        syncSupabaseSessionToExtension();
      }
    });
    setTimeout(syncSupabaseSessionToExtension, 500);
    setTimeout(syncSupabaseSessionToExtension, 2000);
  }

  scheduleSupabaseSessionSyncOnPageLoad();

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.source !== 'shufflr-web') return;
    if (event.data?.type === 'SHUFFLR_AUTH_SESSION') {
      pushAuthSessionPayloadToExtension(event.data.session);
      return;
    }
    if (event.data?.type !== 'SHUFFLR_SUPABASE_SESSION_SYNC') return;
    syncSupabaseSessionToExtension();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'SHUFFLR_SYNC_PLAYLISTS') return;

    window.postMessage({
      type: 'SHUFFLR_SYNC_PLAYLISTS',
      source: 'shufflr-extension',
      payload: message.payload || [],
    }, '*');

    console.log('[Shufflr] bridge.js — forwarded playlist sync to web app');
    sendResponse({ ok: true });
    return true;
  });
})();
