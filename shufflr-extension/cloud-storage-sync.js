// Shufflr — Streaming-page cloud storage sync
// Runs on Max / Crunchyroll / Tubi (not the web app). Keeps shufflr_supabase_session
// fresh and pulls a full Your Shows snapshot into chrome.storage.local so ALL-mode
// cloud reads work without the web app tab being open.
// Safe alongside content.js: only touches shared chrome.storage.local keys.

(function () {
  const SHUFFLR_SUPABASE_SESSION_KEY = 'shufflr_supabase_session';
  const SHUFFLR_YOUR_SHOWS_KEY = 'shufflr_your_shows';
  const SUPABASE_URL = 'https://bzrwekraevbflypxahan.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_kNuk_g4uMWvhrexbh2MBmw_zxJ_7pFz';
  const SYNC_INTERVAL_MS = 5 * 60 * 1000;

  function isExtensionContextValid() {
    try {
      return !!(typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage?.local);
    } catch {
      return false;
    }
  }

  function storageGet(keys) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.get(keys, result => {
          if (chrome.runtime.lastError) {
            resolve({});
            return;
          }
          resolve(result || {});
        });
      } catch {
        resolve({});
      }
    });
  }

  function storageSet(items) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.set(items, () => {
          resolve(!chrome.runtime.lastError);
        });
      } catch {
        resolve(false);
      }
    });
  }

  async function getValidAuthSession() {
    const stored = await storageGet([SHUFFLR_SUPABASE_SESSION_KEY]);
    const session = stored[SHUFFLR_SUPABASE_SESSION_KEY];
    if (!session?.accessToken || !session?.userId) {
      console.log('[Shufflr] cloud-storage-sync: no session in chrome.storage.local (sign in via web app once)');
      return null;
    }

    const expiresAtMs = session.expiresAt ? Number(session.expiresAt) * 1000 : 0;
    const now = Date.now();
    const hardExpired = !!(expiresAtMs && now >= expiresAtMs);
    const expiringSoon = !expiresAtMs || now >= expiresAtMs - 60_000;
    if (!expiringSoon) return session;

    const refreshToken = session.refreshToken || session.refresh_token;
    if (!refreshToken) {
      console.log('[Shufflr] cloud-storage-sync: no refresh token — using existing access token');
      return session;
    }

    console.log(
      hardExpired
        ? '[Shufflr] cloud-storage-sync: session expired — refreshing'
        : '[Shufflr] cloud-storage-sync: session expiring soon — refreshing'
    );

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) {
        console.warn(
          '[Shufflr] cloud-storage-sync: refresh failed:',
          response.status,
          '— keeping existing access token'
        );
        return session;
      }
      const data = await response.json();
      if (!data?.access_token) {
        console.warn('[Shufflr] cloud-storage-sync: refresh returned no access_token — keeping existing');
        return session;
      }
      const updated = {
        userId: session.userId,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      };
      await storageSet({ [SHUFFLR_SUPABASE_SESSION_KEY]: updated });
      console.log('[Shufflr] cloud-storage-sync: session refreshed');
      return updated;
    } catch (err) {
      console.error('[Shufflr] cloud-storage-sync: refresh error — keeping existing token:', err);
      return session;
    }
  }

  async function refreshYourShowsSnapshot(session) {
    if (!session?.accessToken || !session?.userId) return;

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/your_shows?user_id=eq.${encodeURIComponent(session.userId)}&select=shows`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${session.accessToken}`,
            Accept: 'application/json',
          },
        }
      );
      if (!response.ok) {
        console.log('[Shufflr] cloud-storage-sync: your_shows fetch failed:', response.status);
        return;
      }
      const rows = await response.json();
      if (!Array.isArray(rows)) return;
      const cloudShows = rows.length === 0
        ? []
        : (Array.isArray(rows[0]?.shows) ? rows[0].shows : []);
      await storageSet({ [SHUFFLR_YOUR_SHOWS_KEY]: cloudShows });
      console.log('[Shufflr] cloud-storage-sync: Your Shows snapshot synced:', cloudShows.length);
    } catch (err) {
      console.log('[Shufflr] cloud-storage-sync: your_shows fetch error:', err);
    }
  }

  async function syncFromCloud() {
    if (!isExtensionContextValid()) return;
    const session = await getValidAuthSession();
    if (!session) return;
    await refreshYourShowsSnapshot(session);
  }

  function scheduleSync() {
    void syncFromCloud();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void syncFromCloud();
    });
    window.addEventListener('focus', () => {
      void syncFromCloud();
    });
    setInterval(() => {
      if (document.visibilityState === 'visible') void syncFromCloud();
    }, SYNC_INTERVAL_MS);
  }

  scheduleSync();
})();
