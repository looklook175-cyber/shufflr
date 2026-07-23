// Shufflr — Max Content Script v8
// Fetches episode lists via Max Bolt CMS API (fast) with DOM-scrape fallback

const SHUFFLR_PENDING_KEY = 'shufflr_pending';
const SHUFFLR_SHOW_PAGE_KEY = 'shufflr_show_page';
const SHUFFLR_ACTIVE_PLAYLIST_KEY = 'shufflr_active_playlist';
const SHUFFLR_PLAYLISTS_KEY = 'shufflr_playlists';
const SHUFFLR_EPISODE_STATE_KEY = 'shufflr_episode_state';
const SHUFFLR_SHUFFLE_SETTINGS_KEY = 'shufflr_shuffle_settings';
const SHUFFLR_PENDING_EPISODE_ID = 'shufflr_pending_episode_id';
const SHUFFLR_STANDALONE_SHUFFLE_KEY = 'shufflr_standalone_shuffle';
const SHUFFLR_LAUNCH_SHOW_URL_KEY = 'shufflr_launch_show_url';
const SHUFFLR_LAUNCH_STANDALONE_KEY = 'shufflr_launch_standalone';
const SHUFFLR_LAUNCH_STANDALONE_AT_KEY = 'shufflr_launch_standalone_at';
const SHUFFLR_LAUNCH_INTENT_KEY = 'shufflr_launch_intent';
const STANDALONE_LAUNCH_MAX_AGE_MS = 2 * 60 * 1000;
const SHUFFLR_MAX_SHOW_AUTOSTART_KEY = 'shufflr_max_show_autostart';
const SHUFFLR_SESSION_PIN_KEY = 'shufflr_session_pin';
const SHUFFLR_SUPABASE_SESSION_KEY = 'shufflr_supabase_session';
const SHUFFLR_WAS_FULLSCREEN_KEY = 'shufflr_was_fullscreen';
const SHUFFLR_AUTOPLAY_PENDING_KEY = 'shufflr_autoplay_pending';
const SHUFFLR_EPISODE_ENDED_KEY = 'shufflr_episode_ended';
const SHUFFLR_YOUR_SHOWS_KEY = 'shufflr_your_shows';
const MAX_WATCH_ORIGIN = 'https://play.max.com';
const MAX_SHOW_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeMaxId(id) {
  return id == null || id === '' ? '' : String(id).toLowerCase();
}

function extractMaxUuidsFromWatchPath(pathname) {
  const match = String(pathname).match(/\/video\/watch\/([^/?#]+)(?:\/([^/?#]+))?/i);
  if (!match) return null;

  const first = decodeURIComponent(match[1]);
  const second = match[2] ? decodeURIComponent(match[2]) : null;
  if (!MAX_SHOW_UUID_RE.test(first)) return null;
  if (second && !MAX_SHOW_UUID_RE.test(second)) return null;

  return { first, second };
}

function resolveMaxWatchIds(url, showMaxIdHint = null) {
  try {
    const pathname = new URL(url, MAX_WATCH_ORIGIN).pathname;
    const uuids = extractMaxUuidsFromWatchPath(pathname);
    if (!uuids) {
      const legacy = String(url).match(/\/video\/watch\/([^/?#]+)/i)
        || String(url).match(/\/video\/([^/?#]+)/i);
      if (!legacy) return null;
      const id = decodeURIComponent(legacy[1]);
      return { episodeId: id, showId: null, firstUuid: id, secondUuid: null };
    }

    const { first, second } = uuids;
    const hint = showMaxIdHint ? normalizeMaxId(showMaxIdHint) : null;

    if (!second) {
      return { episodeId: first, showId: null, firstUuid: first, secondUuid: null };
    }

    const firstNorm = normalizeMaxId(first);
    const secondNorm = normalizeMaxId(second);

    if (hint) {
      if (firstNorm === hint && secondNorm !== hint) {
        return { episodeId: second, showId: first, firstUuid: first, secondUuid: second };
      }
      if (secondNorm === hint && firstNorm !== hint) {
        return { episodeId: first, showId: second, firstUuid: first, secondUuid: second };
      }
    }

    return { episodeId: first, showId: second, firstUuid: first, secondUuid: second };
  } catch {
    return null;
  }
}

function getMaxEpisodeIdFromUrl(url, showMaxIdHint = null) {
  return resolveMaxWatchIds(url, showMaxIdHint)?.episodeId || null;
}

function buildMaxShowPageUrl(showMaxId) {
  const show = String(showMaxId || '').trim();
  if (!show) return `${MAX_WATCH_ORIGIN}/show`;
  return `${MAX_WATCH_ORIGIN}/show/${show}`;
}

function buildMaxEpisodeWatchUrl(episodeId, showMaxId = null) {
  const episode = String(episodeId || '');
  if (!episode) return `${MAX_WATCH_ORIGIN}/video/watch/`;

  const show = showMaxId ? String(showMaxId) : null;
  if (!show || normalizeMaxId(episode) === normalizeMaxId(show)) {
    return `${MAX_WATCH_ORIGIN}/video/watch/${episode}`;
  }

  return `${MAX_WATCH_ORIGIN}/video/watch/${episode}/${show}`;
}

function maxWatchUrlsRepresentSameEpisode(urlA, urlB, showMaxIdHint = null) {
  const epA = getMaxEpisodeIdFromUrl(urlA, showMaxIdHint);
  const epB = getMaxEpisodeIdFromUrl(urlB, showMaxIdHint);
  if (epA && epB) return normalizeMaxId(epA) === normalizeMaxId(epB);

  try {
    return normalizeEpisodeUrl(urlA).toLowerCase() === normalizeEpisodeUrl(urlB).toLowerCase();
  } catch {
    return String(urlA).split('?')[0] === String(urlB).split('?')[0];
  }
}
const CMS_CAPTURE_KEY = 'shufflr_cms_template';
const EPISODE_CACHE_PREFIX = 'shufflr_episodes_';
const SHUFFLR_CACHE_CLEARED_V2_KEY = 'shufflr_cache_cleared_v2';
const EPISODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SUPABASE_URL = 'https://bzrwekraevbflypxahan.supabase.co';
const SUPABASE_KEY = 'sb_publishable_kNuk_g4uMWvhrexbh2MBmw_zxJ_7pFz';
const MOVIE_MIN_DURATION_SEC = 4800;
const IS_SHUFFLR_WEB_APP = location.hostname === 'shufflr-app.netlify.app';
const IS_MAX = ['play.max.com', 'www.max.com', 'play.hbomax.com', 'www.hbomax.com'].includes(location.hostname);
const IS_TUBI = ['tubitv.com', 'www.tubitv.com'].includes(location.hostname);
const isCrunchyroll = window.location.hostname.includes('crunchyroll.com');
const TUBI_INJECT_POLL_MS = 200;
const TUBI_INJECT_MAX_MS = 15000;
const TUBI_EPISODE_CACHE_PREFIX = 'shufflr_tubi_episodes_';
const TUBI_SHUFFLE_ACTIVE_KEY = 'shufflr_tubi_shuffle_active';
const TUBI_PENDING_KEY = 'shufflr_tubi_pending_shuffle';
/** Episode video id Shufflr is about to land on (sessionStorage — survives full loads). */
const TUBI_EXPECTED_LANDING_KEY = 'shufflr_tubi_expected_landing';
/** Ordered mode: accept the next same-show episode landing after Tubi's own Play/resume click. */
const TUBI_ORDERED_ACCEPT_LANDING_KEY = 'shufflr_tubi_ordered_accept_landing';
const TUBI_WATCHER_ID_RETRY_MS = 400;
const TUBI_WATCHER_ID_MAX_RETRIES = 5;
const CRUNCHYROLL_EPISODE_CACHE_PREFIX = 'shufflr_crunchyroll_episodes_';
const CRUNCHYROLL_SHUFFLE_ACTIVE_KEY = 'shufflr_crunchyroll_shuffle_active';
const CRUNCHYROLL_PENDING_KEY = 'shufflr_crunchyroll_pending';
const CRUNCHYROLL_PENDING_TTL_MS = 2 * 60 * 1000;
const SHUFFLR_TAB_ID_KEY = 'shufflr_tab_id';
const ARMED_HANDOFF_CLAIM_MAX_AGE_MS = 2 * 60 * 1000;
/** Per-show Ordered Episodes resume: crunchyrollId | maxShowId → { lastPlayedEpisodeId, updatedAt }. */
const SHUFFLR_ORDERED_PROGRESS_KEY = 'shufflr_ordered_progress';
/** Timestamp of last Shufflr auto-navigation (sessionStorage — survives full page loads). */
const SHUFFLR_LAST_AUTO_NAV_AT_KEY = 'shufflr_last_auto_nav_at';
const SHUFFLR_AUTO_NAV_COOLDOWN_MS = 30000;
/** Set after an auto-nav so the next page load can detect error landings. */
const SHUFFLR_PENDING_ERROR_CHECK_KEY = 'shufflr_pending_error_check';
/** Latch: block further auto-nav after an error page until a user-initiated start. */
const SHUFFLR_AUTO_NAV_STOPPED_KEY = 'shufflr_auto_nav_stopped';

let extensionContextInvalidated = false;
let extensionContextHealthCheckTimer = null;
let armedUrlPopstateHandler = null;
let armedUrlPollTimer = null;
let shuffleWatchdogTimer = null;
let uiRecoveryGraceTimer = null;
let timeupdateWatcherVideo = null;
let timeupdateWatcherHandler = null;
let maxAutoNextObserver = null;
let maxAutoNextVisibilityHandler = null;
let maxAutoNextBeforeUnloadHandler = null;
let maxAutoNextArmedCache = false;
let maxAutoNextPollTimer = null;
let shufflrAboutToNavigate = false;
let shufflrTargetWatchUrl = null;
let shufflrTargetEpisodeId = null;
let shufflrTargetShowHint = null;
let orderedEpisodesCached = false;
let shuffleModeCached = 'single';
const YOUR_SHOWS_ALL_MODE_NAME = '__your_shows_all__';
let shufflrEpisodeEndedClearTimer = null;
const SHUFFLR_AUTO_HIDE_MS = 5000;
let shufflrAutoHideTimer = null;
let shufflrButtonHovered = false;
let shufflrButtonFirstShownAt = 0;
let shufflrButtonLastActivityAt = 0;
let shufflrAutoHideMouseMoveHandler = null;
let shufflrAutoHideEnterHandler = null;
let shufflrAutoHideLeaveHandler = null;
let lastWatchHistoryLogKey = null;
let lastWatchHistoryCurrentEpisode = null;
let domDebugLogged = false;

function isChromeContextValid() {
  try { return !!chrome.runtime?.id; } catch { return false; }
}

function isExtensionContextInvalidatedError(err) {
  const msg = String(err?.message || err || '');
  return msg.includes('Extension context invalidated');
}

function handleExtensionContextInvalidated() {
  if (extensionContextInvalidated) return;
  extensionContextInvalidated = true;

  if (extensionContextHealthCheckTimer) {
    clearInterval(extensionContextHealthCheckTimer);
    extensionContextHealthCheckTimer = null;
  }
  if (shuffleWatchdogTimer) {
    clearInterval(shuffleWatchdogTimer);
    shuffleWatchdogTimer = null;
  }
  if (armedUrlPollTimer) {
    clearInterval(armedUrlPollTimer);
    armedUrlPollTimer = null;
  }
  if (uiRecoveryGraceTimer) {
    clearTimeout(uiRecoveryGraceTimer);
    uiRecoveryGraceTimer = null;
  }
  if (showPageAutoplayPollTimer) {
    clearInterval(showPageAutoplayPollTimer);
    showPageAutoplayPollTimer = null;
  }
  clearNowPlayingHeartbeat();
  if (shufflrEpisodeEndedClearTimer) {
    clearTimeout(shufflrEpisodeEndedClearTimer);
    shufflrEpisodeEndedClearTimer = null;
  }
  uiMissingSince = null;

  teardownShufflrButtonAutoHide();
  teardownShufflrButtonHandlers();
  removeShufflrUI();
  dismissFullscreenRestorePrompt();

  if (timeupdateWatcherVideo && timeupdateWatcherHandler) {
    try {
      timeupdateWatcherVideo.removeEventListener('timeupdate', timeupdateWatcherHandler);
    } catch {}
  }
  timeupdateWatcherVideo = null;
  timeupdateWatcherHandler = null;

  try {
    const video = window.__shufflrAttachedVideo || document.querySelector('video');
    if (video) {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEpisodeEnded);
      video.removeEventListener('playing', onVideoPlaying);
    }
  } catch {}
  window.__shufflrAttachedVideo = null;

  if (window.__shufflrVideoObserver) {
    try {
      window.__shufflrVideoObserver.disconnect();
    } catch {}
    window.__shufflrVideoObserver = null;
  }

  if (window.__shufflrFullscreenListener) {
    try {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    } catch {}
    window.__shufflrFullscreenListener = false;
  }

  if (armedUrlPopstateHandler) {
    try {
      window.removeEventListener('popstate', armedUrlPopstateHandler);
    } catch {}
    armedUrlPopstateHandler = null;
  }
  window.__shufflrArmedUrlGuard = false;

  teardownMaxAutoNextSuppression();
  cancelScheduledShuffleCop();
  if (shufflrIsNavigatingTimer) {
    clearTimeout(shufflrIsNavigatingTimer);
    shufflrIsNavigatingTimer = null;
  }
  shufflrIsNavigating = false;
}

// Polls every 5s so we can tear down UI when the extension reloads mid-page.
function runExtensionContextHealthCheck() {
  try {
    if (!chrome.runtime?.id) {
      handleExtensionContextInvalidated();
    }
  } catch {
    handleExtensionContextInvalidated();
  }
}

function startExtensionContextHealthCheck() {
  if (extensionContextHealthCheckTimer) return;
  extensionContextHealthCheckTimer = setInterval(runExtensionContextHealthCheck, 5000);
}

function handleChromeRuntimeLastError() {
  if (!isChromeContextValid()) return false;
  try {
    if (chrome.runtime?.lastError && isExtensionContextInvalidatedError(chrome.runtime.lastError)) {
      handleExtensionContextInvalidated();
      return true;
    }
  } catch (err) {
    if (isExtensionContextInvalidatedError(err)) {
      handleExtensionContextInvalidated();
      return true;
    }
  }
  return false;
}

function chromeStorageLocalSet(items) {
  if (!isChromeContextValid()) return Promise.resolve(false);
  return new Promise(resolve => {
    try {
      chrome.storage.local.set(items, () => {
        try {
          if (handleChromeRuntimeLastError()) {
            resolve(false);
            return;
          }
          resolve(true);
        } catch (err) {
          if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
          resolve(false);
        }
      });
    } catch (err) {
      if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
      resolve(false);
    }
  });
}

function chromeStorageLocalRemove(keys) {
  if (!isChromeContextValid()) return Promise.resolve(false);
  return new Promise(resolve => {
    try {
      chrome.storage.local.remove(keys, () => {
        try {
          if (handleChromeRuntimeLastError()) {
            resolve(false);
            return;
          }
          resolve(true);
        } catch (err) {
          if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
          resolve(false);
        }
      });
    } catch (err) {
      if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
      resolve(false);
    }
  });
}

const MAX_TAB_URL_PATTERNS = [
  'https://play.max.com/*',
  'https://www.max.com/*',
  'https://play.hbomax.com/*',
  'https://www.hbomax.com/*',
];

// Push cloud-synced playlists from the web app to open Max tabs.
async function broadcastPlaylistsToMaxTabs(playlists) {
  if (!isChromeContextValid()) return;
  if (!chrome?.tabs?.query || !chrome?.tabs?.sendMessage) return;

  try {
    const tabs = await chrome.tabs.query({ url: MAX_TAB_URL_PATTERNS });
    await Promise.all(tabs.map(tab => new Promise(resolve => {
      try {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SHUFFLR_SYNC_PLAYLISTS',
          payload: playlists,
        }, () => {
          try {
            if (handleChromeRuntimeLastError()) {
              resolve();
              return;
            }
          } catch (err) {
            if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
          }
          resolve();
        });
      } catch (err) {
        if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
        resolve();
      }
    })));
  } catch (err) {
    if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
  }
}

async function syncPlaylistsToWebApp(playlists) {
  if (!isChromeContextValid()) return;
  if (!chrome?.tabs?.query || !chrome?.tabs?.sendMessage) return;

  try {
    const tabs = await chrome.tabs.query({ url: 'https://shufflr-app.netlify.app/*' });
    await Promise.all(tabs.map(tab => new Promise(resolve => {
      try {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SHUFFLR_SYNC_PLAYLISTS',
          payload: playlists,
        }, () => {
          try {
            if (handleChromeRuntimeLastError()) {
              resolve();
              return;
            }
            if (chrome.runtime.lastError) {
              console.log('[Shufflr] Web app sync skipped:', chrome.runtime.lastError.message);
            }
          } catch (err) {
            if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
          }
          resolve();
        });
      } catch (err) {
        if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
        resolve();
      }
    })));
  } catch (err) {
    if (isExtensionContextInvalidatedError(err)) {
      handleExtensionContextInvalidated();
      return;
    }
    console.error('[Shufflr] syncPlaylistsToWebApp error:', err);
  }
}

async function syncNowPlayingToWebApp(showName) {
  if (!isChromeContextValid()) return;
  if (!chrome?.tabs?.query || !chrome?.tabs?.sendMessage) return;
  const name = String(showName || '').trim();
  if (!name) return;

  const payload = { showName: name, timestamp: Date.now() };

  try {
    const tabs = await chrome.tabs.query({ url: 'https://shufflr-app.netlify.app/*' });
    console.log('[Shufflr] Now-playing tab query found:', tabs.length, 'tab(s)');
    await Promise.all(tabs.map(tab => new Promise(resolve => {
      try {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SHUFFLR_NOW_PLAYING',
          payload,
        }, () => {
          try {
            if (handleChromeRuntimeLastError()) {
              resolve();
              return;
            }
            if (chrome.runtime.lastError) {
              console.log('[Shufflr] Now-playing sync skipped:', chrome.runtime.lastError.message);
            }
          } catch (err) {
            if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
          }
          resolve();
        });
      } catch (err) {
        if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
        resolve();
      }
    })));
  } catch (err) {
    if (isExtensionContextInvalidatedError(err)) {
      handleExtensionContextInvalidated();
      return;
    }
    console.error('[Shufflr] syncNowPlayingToWebApp error:', err);
  }
}

let nowPlayingHeartbeatTimer = null;

function clearNowPlayingHeartbeat() {
  if (nowPlayingHeartbeatTimer) {
    clearInterval(nowPlayingHeartbeatTimer);
    nowPlayingHeartbeatTimer = null;
  }
}

function tickNowPlayingHeartbeat() {
  if (!isChromeContextValid()) {
    clearNowPlayingHeartbeat();
    return;
  }
  if (!isVideoWatchUrl(location.href)) {
    clearNowPlayingHeartbeat();
    return;
  }
  const showName = getMaxPlayerShowName();
  if (!showName || !String(showName).trim()) return;
  console.log('[Shufflr] Sending now-playing heartbeat:', showName);
  void syncNowPlayingToWebApp(showName);
}

function startNowPlayingHeartbeat() {
  if (IS_SHUFFLR_WEB_APP) return;
  if (!isVideoWatchUrl(location.href)) {
    clearNowPlayingHeartbeat();
    return;
  }
  if (nowPlayingHeartbeatTimer) return;
  nowPlayingHeartbeatTimer = setInterval(tickNowPlayingHeartbeat, 20000);
}

async function setShufflrPlaylistsInStorage(playlists, { syncToWebApp = false } = {}) {
  if (!isChromeContextValid()) return;
  const ok = await chromeStorageLocalSet({ [SHUFFLR_PLAYLISTS_KEY]: playlists });
  if (!ok) return;
  if (syncToWebApp) {
    await syncPlaylistsToWebApp(playlists);
  }
}

// Apply playlists from web-app cloud sync into chrome.storage.local (no Supabase upload).
async function applySyncedPlaylists(playlists, { syncToWebApp = false } = {}) {
  if (!Array.isArray(playlists)) return;
  if (!isChromeContextValid()) return;
  dropdownPlaylists = playlists;
  await setShufflrPlaylistsInStorage(playlists, { syncToWebApp });
  if (!IS_SHUFFLR_WEB_APP) {
    const dropdown = document.getElementById('shufflr-playlist-dropdown');
    if (dropdown?.classList.contains('open')) {
      await populatePlaylistDropdown();
    }
  }
}

function saveActivePlaylistHandoff(payload) {
  if (!isChromeContextValid()) return;
  if (!payload || typeof payload !== 'object') return;
  const handoff = {
    ...payload,
    createdAt: payload.createdAt || payload.sessionStartedAt || Date.now(),
  };
  const storagePayload = { [SHUFFLR_ACTIVE_PLAYLIST_KEY]: handoff };
  if (handoff.playedByShow) {
    storagePayload[SHUFFLR_EPISODE_STATE_KEY] = {
      playedByShow: handoff.playedByShow,
      lastPlayedShow: handoff.lastPlayedShow || null,
      roundPlayedShows: handoff.roundPlayedShows || [],
      nextEpisodeIndexByShow: handoff.nextEpisodeIndexByShow || {},
      playlistName: handoff.playlistName || '',
      playlistIndex: handoff.playlistIndex ?? 0,
    };
  }
  try {
    chrome.storage.local.set(storagePayload, () => {
      try {
        if (handleChromeRuntimeLastError()) return;
        if (chrome.runtime.lastError) {
          console.error('[Shufflr] Handoff storage error:', chrome.runtime.lastError.message);
          return;
        }
        console.log('[Shufflr] Active playlist saved to chrome.storage.local');
      } catch (err) {
        if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
      }
    });
  } catch (err) {
    if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
  }
}

function normalizeShowName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function extractAlternateIdFromWatchUrl(url, showMaxIdHint = null) {
  return getMaxEpisodeIdFromUrl(url, showMaxIdHint);
}

function episodeDetailsFromCacheEntry(entry) {
  if (entry.episodeDetails?.length) return entry.episodeDetails;
  return (entry.episodes || []).map(url => {
    const alternateId = extractAlternateIdFromWatchUrl(url);
    if (!alternateId) return null;
    return {
      alternateId,
      watchUrl: url.startsWith('http') ? url : `https://play.max.com/video/watch/${alternateId}`,
    };
  }).filter(Boolean);
}

async function readEpisodeCacheForShow(showName, tmdbId) {
  if (!isChromeContextValid()) return [];
  let all;
  try {
    all = await new Promise(resolve => {
      try {
        chrome.storage.local.get(null, result => {
          try {
            if (handleChromeRuntimeLastError()) {
              resolve({});
              return;
            }
            resolve(result || {});
          } catch (err) {
            if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
            resolve({});
          }
        });
      } catch (err) {
        if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
        resolve({});
      }
    });
  } catch (err) {
    if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
    return [];
  }
  const target = normalizeShowName(showName);

  for (const [key, entry] of Object.entries(all)) {
    if (!key.startsWith(EPISODE_CACHE_PREFIX)) continue;
    if (!entry?.cachedAt) continue;
    if (Date.now() - entry.cachedAt > EPISODE_CACHE_TTL_MS) continue;
    if (!entry.episodeDetails?.length && !entry.episodes?.length) continue;

    if (entry.tmdbId && tmdbId && entry.tmdbId === tmdbId) {
      return episodeDetailsFromCacheEntry(entry);
    }
    if (entry.showName && target && normalizeShowName(entry.showName) === target) {
      return episodeDetailsFromCacheEntry(entry);
    }
  }

  return [];
}

function installWebAppHandoffBridge() {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.source !== 'shufflr-web') return;

    if (event.data?.type === 'SHUFFLR_HANDOFF') {
      if (!isChromeContextValid()) return;
      saveActivePlaylistHandoff(event.data.payload);
      return;
    }

    if (event.data?.type === 'SHUFFLR_SYNC_PLAYLISTS') {
      if (!isChromeContextValid()) return;
      const playlists = event.data.playlists || [];
      applySyncedPlaylists(playlists, { syncToWebApp: false }).then(() => {
        console.log('[Shufflr] Playlists synced to chrome.storage.local');
        broadcastPlaylistsToMaxTabs(playlists);
      });
      return;
    }

    if (event.data?.type === 'SHUFFLR_SHUFFLE_SETTINGS') {
      if (!isChromeContextValid()) return;
      void applyShuffleSettingsFromWebApp(event.data.settings || {});
      return;
    }

    if (event.data?.type === 'SHUFFLR_READ_EPISODE_CACHE') {
      if (!isChromeContextValid()) return;
      readEpisodeCacheForShow(event.data.showName, event.data.tmdbId).then(episodeDetails => {
        window.postMessage({
          type: 'SHUFFLR_EPISODE_CACHE',
          source: 'shufflr-extension',
          requestId: event.data.requestId,
          episodeDetails,
        }, '*');
      });
    }
  });

  window.addEventListener('shufflr-handoff', (event) => {
    if (!isChromeContextValid()) return;
    saveActivePlaylistHandoff(event.detail);
  });

  window.addEventListener('shufflr-playlists-sync', (event) => {
    if (!isChromeContextValid()) return;
    applySyncedPlaylists(event.detail || [], { syncToWebApp: false });
  });

  console.log('[Shufflr] Web app handoff bridge ready');
}

let shufflrOrigFetch = null;

if (IS_SHUFFLR_WEB_APP) {
  installWebAppHandoffBridge();
} else {
  installCmsRequestCapture();
  installCmsPageCaptureListener();
}

let shufflrActive = false;
let hasInjectedButton = false;
let toggleShuffleInProgress = false;
let documentClickBound = false;
let lastUrl = location.href;
let knownShowPageUrl = sessionStorage.getItem(SHUFFLR_SHOW_PAGE_KEY);
let shuffleInProgress = false;
let lastPrefetchedEpisodeUrl = null;
let prefetchInFlightShowId = null;
let uiRecoveryInProgress = false;
let lastUiRecoveryAt = 0;
let uiMissingSince = null;
let shufflrNavigating = false;
let shufflrPendingEpisodeId = null;
let shufflrIsNavigating = false;
let shufflrIsNavigatingTimer = null;
let shuffleCopTimer = null;
let shufflrEpisodeTransitionLock = false;
let armedPlaylistCached = false;
let armedUrlPollLastHref = location.href;
let wasFullscreen = false;
let shufflrFullscreenActive = false;
let fullscreenRestorePromptActive = false;
let fullscreenRestoreSpaceHandler = null;
let fullscreenRestoreDismissHandler = null;
const FULLSCREEN_RESTORE_TOAST_MS = 5000;
const ARMED_URL_POLL_MS = 150;
const UI_RECOVERY_COOLDOWN_MS = 1000;
const UI_RECOVERY_GRACE_MS = 4000;
const EPISODE_TRANSITION_LOCK_MS = 8000;
const TIMEUPDATE_SHUFFLE_REMAINING_SEC = 8;
const SHUFFLR_ABOUT_TO_NAVIGATE_SEC = 10;
const SHUFFLE_COP_DELAY_MS = 400;
const SHUFFLR_NAVIGATION_FLAG_MS = 3000;
const MIN_EPISODE_DURATION_SEC = 300;
const NON_EPISODE_PLAYBACK_LOG_THROTTLE_MS = 5000;
let lastNonEpisodePlaybackLogAt = 0;

function isAdPlaying() {
  try {
    if (document.querySelector('[data-testid="player-ux-ad-skip-button"]')) {
      console.log('[Shufflr] ad detection reason: player-ux-ad-skip-button');
      return true;
    }
  } catch {}
  return false;
}

/** True for missing/invalid video or clips shorter than a real episode (trailers/promos). */
function isNonEpisodePlayback(video) {
  if (!video) return true;
  const duration = Number(video.duration);
  if (!Number.isFinite(duration) || duration <= 0) return true;
  return duration < MIN_EPISODE_DURATION_SEC;
}

function logNonEpisodePlaybackIgnored(video) {
  const now = Date.now();
  if (now - lastNonEpisodePlaybackLogAt < NON_EPISODE_PLAYBACK_LOG_THROTTLE_MS) return;
  lastNonEpisodePlaybackLogAt = now;
  const duration = Number(video?.duration);
  const label = Number.isFinite(duration) && duration > 0 ? Math.round(duration) : '?';
  console.log(`[Shufflr] Ignoring non-episode playback (duration ${label}s)`);
}

function isSingleUuidWatchUrl(url) {
  try {
    const uuids = extractMaxUuidsFromWatchPath(new URL(url, MAX_WATCH_ORIGIN).pathname);
    return !!(uuids && !uuids.second);
  } catch {
    return false;
  }
}

async function shouldRedirectSingleUuidPromo(prevUrl, nextUrl, active, showHint) {
  if (!isChromeContextValid()) return false;
  if (!isSingleUuidWatchUrl(nextUrl)) return false;

  const nextEp = getMaxEpisodeIdFromUrl(nextUrl, showHint);
  const currentAlt = active?.currentEpisode?.alternateId;
  if (currentAlt && nextEp && normalizeMaxId(nextEp) === normalizeMaxId(currentAlt)) {
    return false;
  }

  if (!isSingleUuidWatchUrl(prevUrl)) {
    return true;
  }

  const prepared = preparePlaylistForShuffle(await resolvePlaylistForShuffle(active));
  const showIds = getPlaylistMaxIds(prepared);
  if (nextEp && showIds.has(normalizeMaxId(nextEp))) {
    return true;
  }

  return false;
}

async function setPendingEpisodeIdInStorage(episodeId) {
  if (!isChromeContextValid()) return;
  const normalized = normalizeMaxId(episodeId);
  if (!normalized) {
    await chromeStorageLocalRemove(SHUFFLR_PENDING_EPISODE_ID);
    return;
  }
  await chromeStorageLocalSet({ [SHUFFLR_PENDING_EPISODE_ID]: normalized });
}

async function clearPendingEpisodeIdInStorage() {
  if (!isChromeContextValid()) return;
  await chromeStorageLocalRemove(SHUFFLR_PENDING_EPISODE_ID);
}

async function getPendingEpisodeIdFromStorage() {
  if (!isChromeContextValid()) return null;
  const value = await storageLocalGet(SHUFFLR_PENDING_EPISODE_ID);
  return value ? normalizeMaxId(value) : null;
}

function captureFullscreenBeforeShufflrNavigation() {
  if (document.fullscreenElement !== null) {
    wasFullscreen = true;
    try {
      sessionStorage.setItem(SHUFFLR_WAS_FULLSCREEN_KEY, 'true');
    } catch {}
    return;
  }
  wasFullscreen = false;
  try {
    sessionStorage.removeItem(SHUFFLR_WAS_FULLSCREEN_KEY);
  } catch {}
}

function shouldShowFullscreenRestorePrompt() {
  try {
    return sessionStorage.getItem(SHUFFLR_WAS_FULLSCREEN_KEY) === 'true';
  } catch {
    return false;
  }
}

function teardownFullscreenRestoreListeners() {
  if (fullscreenRestoreSpaceHandler) {
    document.removeEventListener('keydown', fullscreenRestoreSpaceHandler, true);
    fullscreenRestoreSpaceHandler = null;
  }
  const dismissBtn = document.getElementById('shufflr-toast-dismiss');
  if (dismissBtn && fullscreenRestoreDismissHandler) {
    dismissBtn.removeEventListener('click', fullscreenRestoreDismissHandler, true);
  }
  fullscreenRestoreDismissHandler = null;
}

function dismissFullscreenRestorePrompt() {
  if (!fullscreenRestorePromptActive) return;

  fullscreenRestorePromptActive = false;
  clearTimeout(window._shufflrFullscreenRestoreTimer);
  window._shufflrFullscreenRestoreTimer = null;
  teardownFullscreenRestoreListeners();

  const toast = document.getElementById('shufflr-toast');
  if (toast) {
    toast.classList.remove('show', 'shufflr-toast-interactive');
    toast.textContent = '';
  }
}

function tryRestoreFullscreenSync(source) {
  console.log(`[Shufflr] restoring fullscreen via ${source}`);
  try {
    document.documentElement.requestFullscreen();
  } catch (err) {
    console.log('[Shufflr] Could not restore fullscreen:', err);
  }
}

function onFullscreenRestoreDismissClick(event) {
  event.preventDefault();
  event.stopPropagation();
  dismissFullscreenRestorePrompt();
}

function onFullscreenRestoreSpace(event) {
  if (event.key !== ' ' && event.code !== 'Space') return;
  if (event.target?.closest?.('input, textarea, [contenteditable="true"]')) return;

  event.preventDefault();
  event.stopPropagation();

  tryRestoreFullscreenSync('space');

  const video = document.querySelector('video');
  if (video) {
    video.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  }

  dismissFullscreenRestorePrompt();
}

function showFullscreenRestorePrompt() {
  if (!shouldShowFullscreenRestorePrompt()) return;
  if (fullscreenRestorePromptActive) return;

  try {
    sessionStorage.removeItem(SHUFFLR_WAS_FULLSCREEN_KEY);
  } catch {}
  wasFullscreen = false;
  fullscreenRestorePromptActive = true;

  const toast = document.getElementById('shufflr-toast');
  if (!toast) {
    fullscreenRestorePromptActive = false;
    return;
  }

  toast.innerHTML = `
    <span class="shufflr-toast-message">Press Space to restore fullscreen</span>
    <button type="button" id="shufflr-toast-dismiss" class="shufflr-toast-dismiss" aria-label="Dismiss fullscreen restore prompt">✕</button>
  `;
  toast.classList.add('show', 'shufflr-toast-interactive');
  clearTimeout(window._shufflrToastTimer);

  teardownFullscreenRestoreListeners();
  fullscreenRestoreSpaceHandler = onFullscreenRestoreSpace;
  document.addEventListener('keydown', fullscreenRestoreSpaceHandler, true);

  const dismissBtn = document.getElementById('shufflr-toast-dismiss');
  if (dismissBtn) {
    fullscreenRestoreDismissHandler = onFullscreenRestoreDismissClick;
    dismissBtn.addEventListener('click', fullscreenRestoreDismissHandler, true);
  }

  clearTimeout(window._shufflrFullscreenRestoreTimer);
  window._shufflrFullscreenRestoreTimer = setTimeout(() => {
    dismissFullscreenRestorePrompt();
  }, FULLSCREEN_RESTORE_TOAST_MS);
}

function restoreShufflrUIFromFullscreenContainer() {
  const wrap = document.getElementById('shufflr-wrap');
  const toast = document.getElementById('shufflr-toast');
  if (wrap && wrap.parentElement !== document.body) {
    document.body.appendChild(wrap);
  }
  if (toast && toast.parentElement !== document.body) {
    document.body.appendChild(toast);
  }
}

function ensureShufflrButtonForFullscreen() {
  if (!document.fullscreenElement) return;
  const fs = document.fullscreenElement;
  if (!hasShufflrButtonInDom()) {
    void tryInjectButton();
  }
  const wrap = document.getElementById('shufflr-wrap');
  const toast = document.getElementById('shufflr-toast');
  if (wrap && !fs.contains(wrap)) {
    fs.appendChild(wrap);
  }
  if (toast && !fs.contains(toast)) {
    fs.appendChild(toast);
  }
}

function onFullscreenChange() {
  if (!isChromeContextValid()) return;
  if (document.fullscreenElement) {
    ensureShufflrButtonForFullscreen();
    return;
  }
  restoreShufflrUIFromFullscreenContainer();
  if (!hasShufflrButtonInDom()) {
    void tryInjectButton();
  }
}

function installFullscreenListener() {
  if (window.__shufflrFullscreenListener) return;
  window.__shufflrFullscreenListener = true;
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);
  if (document.fullscreenElement) {
    ensureShufflrButtonForFullscreen();
  }
}

function installAutoFullscreenRestore() {
  if (window.__shufflrAutoFullscreenRestore) return;
  window.__shufflrAutoFullscreenRestore = true;

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      shufflrFullscreenActive = true;
    } else {
      if (shufflrFullscreenActive) {
        setTimeout(() => {
          if (!document.fullscreenElement && shufflrFullscreenActive) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        }, 3000);
      }
      setTimeout(() => {
        if (!document.fullscreenElement) {
          shufflrFullscreenActive = false;
        }
      }, 8000);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.fullscreenElement === null) {
      shufflrFullscreenActive = false;
    }
  });
}

// shufflr_navigating flag: set true before any Shufflr-initiated navigation so shuffle cop
// ignores that URL change; cleared automatically after 3 seconds.
function beginShufflrNavigation(episodeId) {
  if (!isChromeContextValid()) return;
  if (isAdPlaying()) return;
  captureFullscreenBeforeShufflrNavigation();
  shufflrAboutToNavigate = false;
  const normalized = normalizeMaxId(episodeId);
  shufflrIsNavigating = true;
  shufflrPendingEpisodeId = normalized || null;
  shufflrNavigating = true;

  if (shufflrIsNavigatingTimer) clearTimeout(shufflrIsNavigatingTimer);
  shufflrIsNavigatingTimer = setTimeout(() => {
    if (!isChromeContextValid()) return;
    shufflrIsNavigating = false;
    shufflrNavigating = false;
    shufflrIsNavigatingTimer = null;
  }, SHUFFLR_NAVIGATION_FLAG_MS);

  void setPendingEpisodeIdInStorage(normalized);
}

function isShufflrAutoNavStopped() {
  try {
    return sessionStorage.getItem(SHUFFLR_AUTO_NAV_STOPPED_KEY) === '1';
  } catch {
    return false;
  }
}

function clearShufflrAutoNavStopped() {
  try {
    sessionStorage.removeItem(SHUFFLR_AUTO_NAV_STOPPED_KEY);
  } catch { /* ignore */ }
}

function getShufflrLastAutoNavAt() {
  try {
    const n = Number(sessionStorage.getItem(SHUFFLR_LAST_AUTO_NAV_AT_KEY));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function recordShufflrAutoNavigation(url) {
  try {
    sessionStorage.setItem(SHUFFLR_LAST_AUTO_NAV_AT_KEY, String(Date.now()));
    const service = IS_TUBI ? 'tubi' : (isCrunchyroll ? 'crunchyroll' : 'max');
    sessionStorage.setItem(SHUFFLR_PENDING_ERROR_CHECK_KEY, JSON.stringify({
      at: Date.now(),
      service,
      targetUrl: String(url || '').split('?')[0],
    }));
  } catch { /* ignore */ }
}

/** Wait out the global auto-nav cooldown. Returns false if stopped-on-error. */
async function waitForShufflrAutoNavCooldown(source = '') {
  if (isShufflrAutoNavStopped()) {
    console.log(`[Shufflr] auto-navigation blocked — stopped after error (${source || 'auto'})`);
    return false;
  }
  const last = getShufflrLastAutoNavAt();
  if (!last) return true;
  const elapsed = Date.now() - last;
  if (elapsed >= SHUFFLR_AUTO_NAV_COOLDOWN_MS) return true;
  const waitMs = SHUFFLR_AUTO_NAV_COOLDOWN_MS - elapsed;
  console.log(`[Shufflr] cooldown: delaying auto-navigation ${Math.ceil(waitMs / 1000)}s`);
  await new Promise(resolve => setTimeout(resolve, waitMs));
  if (isShufflrAutoNavStopped()) {
    console.log(`[Shufflr] auto-navigation blocked — stopped after error (${source || 'auto'})`);
    return false;
  }
  return true;
}

/**
 * Central navigation helper.
 * mode 'auto' — episode-end / cop / pending hops: 30s cooldown + error-check latch.
 * mode 'user' — toggle-ON / Play / dropdown: immediate; clears stop-on-error latch.
 */
async function shufflrNavigateTo(url, options = {}) {
  if (!isChromeContextValid() || !url) return false;
  const mode = options.mode === 'user' ? 'user' : 'auto';
  const source = options.source || mode;

  if (mode === 'auto') {
    if (!options.bypassCooldown) {
      const ok = await waitForShufflrAutoNavCooldown(source);
      if (!ok) return false;
    } else if (isShufflrAutoNavStopped()) {
      console.log(`[Shufflr] auto-navigation blocked — stopped after error (${source})`);
      return false;
    }
    if (typeof options.skipIfStale === 'function' && options.skipIfStale()) {
      console.log(`[Shufflr] cooldown: skipping stale auto-navigation (${source})`);
      return false;
    }
    recordShufflrAutoNavigation(url);
  } else {
    clearShufflrAutoNavStopped();
    // User navigations must not inherit a stale auto-nav error-check latch.
    try {
      if (sessionStorage.getItem(SHUFFLR_PENDING_ERROR_CHECK_KEY)) {
        sessionStorage.removeItem(SHUFFLR_PENDING_ERROR_CHECK_KEY);
        console.log('[Shufflr] latch hygiene: cleared stale pending error check (user navigation)');
      }
    } catch { /* ignore */ }
  }

  if (typeof options.beforeNavigate === 'function') {
    try { options.beforeNavigate(); } catch { /* ignore */ }
  }
  window.location.href = url;
  return true;
}

function detectStreamingErrorPage() {
  const path = location.pathname || '';
  const href = location.href || '';
  const title = document.title || '';
  const h1 = document.querySelector('h1')?.textContent || '';
  const bodyText = `${title}\n${h1}`;

  if (isCrunchyroll) {
    if (/\/(error|404|offline|access-denied|rate-limit)/i.test(path)) return 'Crunchyroll';
    if (/too many requests|access denied|something went wrong|page not found/i.test(bodyText)
      && !isCrunchyrollWatchPage()
      && !isCrunchyrollSeriesPage()) {
      return 'Crunchyroll';
    }
  }
  if (IS_TUBI) {
    // Tubi bot/unavailable pages: static 404 URL and/or "Oh Snap" copy.
    if (/\/static\/404\b/i.test(path) || /\/static\/404\b/i.test(href)) return 'Tubi';
    if (/\/(404|error|not-found|unavailable)\b/i.test(path)
      && !isTubiEpisodePage()
      && !isTubiSeriesPage()) {
      return 'Tubi';
    }
    if (/oh\s*snap|page not found|content (is )?unavailable|something went wrong/i.test(bodyText)
      && !isTubiEpisodePage()
      && !isTubiSeriesPage()) {
      return 'Tubi';
    }
  }
  if (IS_MAX) {
    if (/\/(error|404|not-found)/i.test(path)) return 'Max';
    if (/something went wrong|page not found|unavailable/i.test(bodyText)
      && !location.href.includes('/video/')
      && !location.href.includes('/play/')
      && !location.href.includes('/show/')) {
      return 'Max';
    }
  }
  return null;
}

function isExpectedWatchLandingAfterAutoNav() {
  if (isCrunchyroll) return isCrunchyrollWatchPage();
  if (IS_TUBI) return isTubiEpisodePage();
  if (IS_MAX) return location.href.includes('/video/') || location.href.includes('/play/');
  return false;
}

async function disarmShufflrAfterErrorPage(serviceLabel) {
  if (!isChromeContextValid()) return;
  try {
    sessionStorage.setItem(SHUFFLR_AUTO_NAV_STOPPED_KEY, '1');
    sessionStorage.removeItem(SHUFFLR_PENDING_ERROR_CHECK_KEY);
  } catch { /* ignore */ }

  console.log(`[Shufflr] stopped after error page (${serviceLabel})`);
  showToast(`Shufflr paused — ${serviceLabel} returned an error page`);

  shufflrActive = false;
  armedPlaylistCached = false;

  if (isCrunchyroll) {
    try { sessionStorage.removeItem(CRUNCHYROLL_SHUFFLE_ACTIVE_KEY); } catch { /* ignore */ }
    clearCrunchyrollSessionPin();
    clearCrunchyrollPending();
    teardownCrunchyrollEpisodeEndWatcher();
    const active = await getActivePlaylistFromStorage();
    if (isArmedPlaylistOwnedByThisTab(active)) await clearActivePlaylist();
    await resetShuffleModeToSingle();
    updateShuffleUI('');
    return;
  }

  if (IS_TUBI) {
    clearTubiSessionPin();
    try { sessionStorage.removeItem(TUBI_SHUFFLE_ACTIVE_KEY); } catch { /* ignore */ }
    try { sessionStorage.removeItem(TUBI_PENDING_KEY); } catch { /* ignore */ }
    try { sessionStorage.removeItem(TUBI_EXPECTED_LANDING_KEY); } catch { /* ignore */ }
    teardownTubiEpisodeEndWatcher();
    teardownTubiUpNextSuppressor();
    const active = await getActivePlaylistFromStorage();
    if (isArmedPlaylistOwnedByThisTab(active)) await clearActivePlaylist();
    await resetShuffleModeToSingle();
    updateShuffleUI('');
    return;
  }

  if (IS_MAX) {
    await setStandaloneShuffleEnabled(false);
    const active = await getActivePlaylistFromStorage();
    if (isArmedPlaylistOwnedByThisTab(active)) await clearActivePlaylist();
    clearMaxSessionPin();
    await resetShuffleModeToSingle();
    updateShuffleUI('');
  }
}

/**
 * After a Shufflr auto-navigation, stop the session if we landed on an error page
 * (or a watch URL with no player and clear error signals). One error must not cascade.
 */
async function checkShufflrAutoNavErrorLanding() {
  if (!isChromeContextValid()) return;
  if (window.__shufflrErrorCheckInFlight) return;

  let pending = null;
  try {
    const raw = sessionStorage.getItem(SHUFFLR_PENDING_ERROR_CHECK_KEY);
    if (!raw) return;
    pending = JSON.parse(raw);
  } catch {
    try { sessionStorage.removeItem(SHUFFLR_PENDING_ERROR_CHECK_KEY); } catch { /* ignore */ }
    return;
  }
  if (!pending?.at || Date.now() - pending.at > 60000) {
    try { sessionStorage.removeItem(SHUFFLR_PENDING_ERROR_CHECK_KEY); } catch { /* ignore */ }
    return;
  }

  window.__shufflrErrorCheckInFlight = true;
  try {
    const immediate = detectStreamingErrorPage();
    if (immediate) {
      await disarmShufflrAfterErrorPage(immediate);
      return;
    }

    // Series-page hops are valid intermediate landings — clear the check.
    if ((isCrunchyroll && isCrunchyrollSeriesPage())
      || (IS_TUBI && isTubiSeriesPage())
      || (IS_MAX && location.href.includes('/show/'))) {
      try { sessionStorage.removeItem(SHUFFLR_PENDING_ERROR_CHECK_KEY); } catch { /* ignore */ }
      return;
    }

    if (!isExpectedWatchLandingAfterAutoNav()) return;

    if (document.querySelector('video')) {
      try { sessionStorage.removeItem(SHUFFLR_PENDING_ERROR_CHECK_KEY); } catch { /* ignore */ }
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 4000));
    if (!isChromeContextValid()) return;
    try {
      if (!sessionStorage.getItem(SHUFFLR_PENDING_ERROR_CHECK_KEY)) return;
    } catch { return; }

    if (document.querySelector('video')) {
      try { sessionStorage.removeItem(SHUFFLR_PENDING_ERROR_CHECK_KEY); } catch { /* ignore */ }
      return;
    }

    const delayed = detectStreamingErrorPage();
    const bodyHint = /oh\s*snap|too many requests|something went wrong|page not found|unavailable|access denied/i
      .test(`${document.title || ''}\n${document.body?.innerText?.slice(0, 2000) || ''}`);
    if (delayed || bodyHint) {
      const fallbackLabel = isCrunchyroll ? 'Crunchyroll' : (IS_TUBI ? 'Tubi' : 'Max');
      await disarmShufflrAfterErrorPage(delayed || fallbackLabel);
    }
  } finally {
    window.__shufflrErrorCheckInFlight = false;
  }
}

function isVideoWatchUrl(url) {
  return String(url).includes('/video/') || String(url).includes('/play/');
}

function cancelScheduledShuffleCop() {
  if (shuffleCopTimer) {
    clearTimeout(shuffleCopTimer);
    shuffleCopTimer = null;
  }
}

function scheduleShuffleCopCheck(prevUrl) {
  if (!isChromeContextValid()) return;
  cancelScheduledShuffleCop();

  shuffleCopTimer = setTimeout(() => {
    if (!isChromeContextValid()) return;
    shuffleCopTimer = null;
    runShuffleCopCheck(prevUrl).catch(err => {
      console.error('[Shufflr] shuffle cop error:', err);
    });
  }, SHUFFLE_COP_DELAY_MS);
}

function triggerShuffleCopOnUrlChange(prevUrl) {
  if (!isChromeContextValid()) return;
  if (isAdPlaying()) return;
  if (prevUrl === location.href) return;

  runShuffleCopCheck(prevUrl).catch(err => {
    console.error('[Shufflr] shuffle cop error:', err);
  });
  scheduleShuffleCopCheck(prevUrl);
}

// Episode-end flag: timeupdate sets shufflr_episode_ended in the last 8s of playback so
// Ordered-mode shuffle cop only reacts to Max's post-episode auto-next, not manual navigation.
function setShufflrEpisodeEndedFlag() {
  sessionStorage.setItem(SHUFFLR_EPISODE_ENDED_KEY, 'true');
  if (shufflrEpisodeEndedClearTimer) {
    clearTimeout(shufflrEpisodeEndedClearTimer);
  }
  shufflrEpisodeEndedClearTimer = setTimeout(() => {
    sessionStorage.removeItem(SHUFFLR_EPISODE_ENDED_KEY);
    shufflrEpisodeEndedClearTimer = null;
  }, 5000);
}

function clearShufflrEpisodeEndedFlag() {
  sessionStorage.removeItem(SHUFFLR_EPISODE_ENDED_KEY);
  if (shufflrEpisodeEndedClearTimer) {
    clearTimeout(shufflrEpisodeEndedClearTimer);
    shufflrEpisodeEndedClearTimer = null;
  }
}

async function runShuffleCopCheck(prevUrl) {
  if (!isChromeContextValid()) return;
  if (isAdPlaying()) return;
  if (prevUrl === location.href) return;

  const active = await getActivePlaylistFromStorage();
  const settings = await readShuffleSettings();
  orderedEpisodesCached = !!settings.orderedEpisodes;
  const owned = isArmedPlaylistOwnedByThisTab(active);

  if (!owned) {
    const standaloneOn = shufflrActive || await isStandaloneShuffleEnabled();
    if (!standaloneOn || settings.orderedEpisodes) return;
    if (!isVideoWatchUrl(prevUrl) || !isVideoWatchUrl(location.href)) return;
    if (maxWatchUrlsRepresentSameEpisode(prevUrl, location.href)) return;
    if (shufflrNavigating || shufflrIsNavigating) return;

    console.log('[Shufflr] Shuffle cop (standalone): Max hijacked navigation, correcting...');
    showToast('Shufflr correcting...');
    // Pinned single-show stays on this show even when global mode is ALL.
    if (isMaxSessionPinnedToCurrentShow()) {
      await shuffleToRandomEpisode();
    } else if (settings.shuffleMode === 'all') {
      await shuffleFromYourShowsAllMode(null);
    } else {
      await shuffleToRandomEpisode();
    }
    return;
  }

  if (settings.orderedEpisodes) {
    if (sessionStorage.getItem(SHUFFLR_EPISODE_ENDED_KEY) !== 'true') return;
    if (shufflrIsNavigating) return;

    const onVideoPage = location.href.includes('/video/') || location.href.includes('/play/');
    const onShowPage = location.href.includes('/show/');
    if (!onVideoPage && !onShowPage) return;

    const prevShowId = resolveShowIdForCop(prevUrl, active);
    const currShowId = resolveShowIdForCop(location.href, active);

    if (prevShowId && currShowId && prevShowId === currShowId) {
      clearShufflrEpisodeEndedFlag();
      await clearPendingEpisodeIdInStorage();
      shufflrPendingEpisodeId = null;
      shufflrNavigating = false;
      await updateOrderedCurrentEpisodeFromUrl(active, location.href);
      if (IS_MAX) await restoreArmedShuffleSession();
      return;
    }

    if (!prevShowId || !currShowId) return;

    console.log('[Shufflr] Shuffle cop (ordered): episode ended on wrong show, redirecting...');
    showToast('Shufflr: next show...');
    clearShufflrEpisodeEndedFlag();
    await clearPendingEpisodeIdInStorage();
    await navigateToNextOrderedShow('shuffle-cop');
    return;
  }

  const showHint = getShowMaxIdHintFromActive(active);
  const onVideoPage = location.href.includes('/video/') || location.href.includes('/play/');
  if (!onVideoPage) return;

  if (maxWatchUrlsRepresentSameEpisode(prevUrl, location.href, showHint)) {
    await clearPendingEpisodeIdInStorage();
    return;
  }

  const arrivedEpisode = getMaxEpisodeIdFromUrl(location.href, showHint);
  const arrivedNorm = arrivedEpisode ? normalizeMaxId(arrivedEpisode) : null;
  const pendingId = await getPendingEpisodeIdFromStorage();

  if (pendingId && arrivedNorm && pendingId === arrivedNorm) {
    await clearPendingEpisodeIdInStorage();
    shufflrPendingEpisodeId = null;
    shufflrNavigating = false;
    shufflrIsNavigating = false;
    if (shufflrIsNavigatingTimer) {
      clearTimeout(shufflrIsNavigatingTimer);
      shufflrIsNavigatingTimer = null;
    }
    return;
  }

  if (shufflrNavigating || shufflrIsNavigating) return;

  console.log('[Shufflr] Shuffle cop: Max hijacked navigation, correcting...');
  showToast('Shufflr correcting...');
  await clearPendingEpisodeIdInStorage();
  await handleShufflrNextEpisode('shuffle-cop');
}

function notifyArmedUrlChange(prevUrl) {
  if (!isChromeContextValid()) return;
  const hrefChanged = location.href !== prevUrl;
  armedUrlPollLastHref = location.href;

  if (hrefChanged && lastUrl !== location.href) {
    lastUrl = location.href;
    timeupdateWatcherVideo = null;
    timeupdateWatcherHandler = null;
    removeShufflrUI();
    cancelUiRecoveryGraceTimer();
    setTimeout(() => {
      if (!isChromeContextValid()) return;
      tryInjectButton();
    }, 2500);
    setTimeout(() => {
      if (!isChromeContextValid()) return;
      if (!IS_MAX) return;
      restoreArmedShuffleSession().catch(err => {
        console.error('[Shufflr] restoreArmedShuffleSession error:', err);
      });
    }, 2500);
    setTimeout(runShuffleWatchdog, UI_RECOVERY_GRACE_MS + 500);
  }

  triggerShuffleCopOnUrlChange(prevUrl);
  handlePossibleMaxAutoAdvance(prevUrl).catch(err => {
    console.error('[Shufflr] handlePossibleMaxAutoAdvance error:', err);
  });
}

function installArmedUrlGuard() {
  if (!isChromeContextValid()) return;
  if (window.__shufflrArmedUrlGuard) return;
  window.__shufflrArmedUrlGuard = true;

  armedUrlPollLastHref = location.href;

  armedUrlPollTimer = setInterval(() => {
    if (!isChromeContextValid()) {
      clearInterval(armedUrlPollTimer);
      armedUrlPollTimer = null;
      return;
    }
    if (location.href === armedUrlPollLastHref) return;
    const prevUrl = armedUrlPollLastHref;
    notifyArmedUrlChange(prevUrl);
  }, ARMED_URL_POLL_MS);

  window.addEventListener('popstate', armedUrlPopstateHandler = () => {
    if (!isChromeContextValid()) return;
    if (location.href === armedUrlPollLastHref) return;
    const prevUrl = armedUrlPollLastHref;
    notifyArmedUrlChange(prevUrl);
  });

  console.log('[Shufflr] Armed URL guard ready');
}

async function navigateToNextShow() {
  if (!isChromeContextValid()) return;
  if (isAdPlaying()) return;
  const active = await getActivePlaylistFromStorage();
  if (!isArmedPlaylistOwnedByThisTab(active)) return;
  shufflrActive = true;
  armedPlaylistCached = true;
  await handleShufflrNextEpisode('timeupdate-watcher');
}

function installTimeupdateWatcher() {
  if (!isChromeContextValid()) return;
  const video = document.querySelector('video');
  if (!video) {
    setTimeout(() => {
      if (!isChromeContextValid()) return;
      installTimeupdateWatcher();
    }, 1000);
    return;
  }

  if (timeupdateWatcherVideo === video && timeupdateWatcherHandler) return;

  if (timeupdateWatcherVideo && timeupdateWatcherHandler) {
    timeupdateWatcherVideo.removeEventListener('timeupdate', timeupdateWatcherHandler);
  }

  timeupdateWatcherVideo = video;
  timeupdateWatcherHandler = async function handler() {
    const timeRemaining = video.duration > 0 ? video.duration - video.currentTime : null;
    console.log('[Shufflr] timeupdate fired, time remaining:', timeRemaining);
    console.log('[Shufflr] isAdPlaying:', isAdPlaying());
    console.log('[Shufflr] shufflrEnabled:', shufflrActive);
    if (!isChromeContextValid()) {
      handleExtensionContextInvalidated();
      return;
    }
    if (isAdPlaying()) return;
    if (video.duration <= 0 || video.paused) return;
    if (isNonEpisodePlayback(video)) {
      logNonEpisodePlaybackIgnored(video);
      return;
    }
    updateShufflrAboutToNavigateFromVideo(video);
    if (video.duration - video.currentTime > TIMEUPDATE_SHUFFLE_REMAINING_SEC) return;
    let result;
    try {
      result = await chrome.storage.local.get([SHUFFLR_ACTIVE_PLAYLIST_KEY]);
    } catch (err) {
      if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
      return;
    }
    if (!isArmedPlaylistOwnedByThisTab(result[SHUFFLR_ACTIVE_PLAYLIST_KEY])) return;
    if (orderedEpisodesCached) {
      setShufflrEpisodeEndedFlag();
      return;
    }
    video.removeEventListener('timeupdate', handler);
    timeupdateWatcherHandler = null;
    timeupdateWatcherVideo = null;
    navigateToNextShow();
  };
  video.addEventListener('timeupdate', timeupdateWatcherHandler);
}

function saveShowPageUrl(url) {
  knownShowPageUrl = url.split('?')[0];
  sessionStorage.setItem(SHUFFLR_SHOW_PAGE_KEY, knownShowPageUrl);
}

if (!IS_SHUFFLR_WEB_APP && location.href.includes('/show/')) {
  saveShowPageUrl(location.href);
}

// ── URL CHANGE WATCHER ─────────────────────────────────────────────────────
const urlObserver = new MutationObserver(() => {
  if (!isChromeContextValid()) return;
  if (location.href !== lastUrl) {
    const prevUrl = lastUrl;
    lastUrl = location.href;
    armedUrlPollLastHref = location.href;
    if (isVideoWatchUrl(prevUrl) && !isVideoWatchUrl(location.href)) {
      clearNowPlayingHeartbeat();
    }
    if (isVideoWatchUrl(location.href)) {
      startNowPlayingHeartbeat();
    }
    timeupdateWatcherVideo = null;
    timeupdateWatcherHandler = null;
    removeShufflrUI();
    cancelUiRecoveryGraceTimer();
    triggerShuffleCopOnUrlChange(prevUrl);
    handlePossibleMaxAutoAdvance(prevUrl).catch(err => {
      console.error('[Shufflr] handlePossibleMaxAutoAdvance error:', err);
    });
    // Save show page URL whenever we visit one
    if (location.href.includes('/show/')) {
      saveShowPageUrl(location.href);
      console.log(`[Shufflr] Saved show page: ${knownShowPageUrl}`);
      void prefetchShowPageEpisodeCacheIfStandalone();
      if (sessionStorage.getItem(SHUFFLR_PENDING_KEY)) {
        setTimeout(() => {
          if (!isChromeContextValid()) return;
          handleShowPageShuffle();
        }, 500);
      }
    }
    setTimeout(() => {
      if (!isChromeContextValid()) return;
      tryInjectButton();
    }, 2500);
    setTimeout(() => {
      if (!isChromeContextValid()) return;
      if (!IS_MAX) return;
      restoreArmedShuffleSession().catch(err => {
        console.error('[Shufflr] restoreArmedShuffleSession error:', err);
      });
    }, 2500);
    setTimeout(runShuffleWatchdog, UI_RECOVERY_GRACE_MS + 500);
  }
});
if (IS_MAX) {
urlObserver.observe(document.body, { childList: true, subtree: true });
}

// ── INJECT SHUFFLE BUTTON ──────────────────────────────────────────────────
let dropdownPlaylists = [];

function readPlaylistsFromStorage() {
  if (!isChromeContextValid()) return Promise.resolve([]);
  return new Promise(resolve => {
    try {
      chrome.storage.local.get(SHUFFLR_PLAYLISTS_KEY, result => {
        try {
          if (handleChromeRuntimeLastError()) {
            resolve([]);
            return;
          }
          const playlists = result[SHUFFLR_PLAYLISTS_KEY];
          resolve(Array.isArray(playlists) ? playlists : []);
        } catch (err) {
          if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
          resolve([]);
        }
      });
    } catch (err) {
      if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
      resolve([]);
    }
  });
}

function playlistShowCount(playlist) {
  return (playlist?.shows || []).length;
}

function generatePlaylistId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function renderPlaylistCreateSection() {
  return `
    <button type="button" class="shufflr-pl-create-btn" data-pl-action="create">+ Create New Playlist</button>
    <div class="shufflr-pl-create-form" id="shufflr-pl-create-form" hidden>
      <input
        type="text"
        class="shufflr-pl-create-input"
        id="shufflr-pl-create-input"
        placeholder="Playlist name..."
        maxlength="80"
        autocomplete="off"
      />
      <button type="button" class="shufflr-pl-create-confirm" aria-label="Create playlist">✓</button>
    </div>
  `;
}

function renderYourShowsAddButton() {
  return `<button type="button" class="shufflr-pl-your-shows-btn" data-pl-action="add-your-shows">+ Add to Your Shows</button>`;
}

function renderPlaylistRow(playlist, index) {
  const showCount = playlistShowCount(playlist);
  const name = escapePlaylistLabel(playlist.name || 'Untitled');
  return `
    <div class="shufflr-pl-row-wrap" data-pl-index="${index}">
      <div class="shufflr-pl-row shufflr-pl-row-header" data-pl-index="${index}">
        <span class="shufflr-pl-name">${name} <span class="shufflr-pl-count">(${showCount})</span></span>
        <div class="shufflr-pl-row-actions">
          <button
            type="button"
            class="shufflr-pl-action-btn"
            data-pl-action="shuffle"
            data-pl-index="${playlist._globalIndex !== undefined ? playlist._globalIndex : index}"
            aria-label="Shuffle ${name}"
          >▶</button>
          <button
            type="button"
            class="shufflr-pl-action-btn shufflr-pl-add-btn"
            data-pl-index="${playlist._globalIndex !== undefined ? playlist._globalIndex : index}"
            aria-label="Add current show to ${name}"
          >+</button>
          <button
            type="button"
            class="shufflr-pl-action-btn shufflr-pl-shows-toggle"
            data-pl-action="toggle-shows"
            data-pl-index="${index}"
            aria-label="Show shows in ${name}"
            aria-expanded="false"
          >▾</button>
        </div>
      </div>
      <div class="shufflr-pl-shows-list" data-pl-index="${index}" hidden>
        ${renderPlaylistShowListItems(playlist)}
      </div>
    </div>
  `;
}

function openCreatePlaylistForm() {
  const form = document.getElementById('shufflr-pl-create-form');
  const input = document.getElementById('shufflr-pl-create-input');
  if (!form || !input) return;
  form.hidden = false;
  input.value = '';
  input.focus();
}

function closeCreatePlaylistForm() {
  const form = document.getElementById('shufflr-pl-create-form');
  const input = document.getElementById('shufflr-pl-create-input');
  if (form) form.hidden = true;
  if (input) input.value = '';
}

async function submitCreatePlaylistForm() {
  if (!isChromeContextValid()) return;
  const input = document.getElementById('shufflr-pl-create-input');
  const name = input?.value?.trim();
  if (!name) {
    showToast('Enter a playlist name');
    input?.focus();
    return;
  }

  let showEntry, serviceTag;
  if (IS_TUBI) {
    const tubiId = getCurrentTubiSeriesId();
    if (!tubiId) {
      showToast('Could not find show ID');
      return;
    }
    const title = getTubiShowTitle() || 'Unknown Show';
    const tubiSeriesUrl = getCurrentTubiSeriesUrl(tubiId);
    showEntry = {
      title,
      tubiId,
      tubiSeriesUrl,
      service: 'tubi',
    };
    serviceTag = 'tubi';
  } else if (isCrunchyroll) {
    const crunchyrollId = getCurrentCrunchyrollSeriesId();
    if (!crunchyrollId) {
      showToast('Could not find show ID');
      return;
    }
    const title = getCrunchyrollShowTitle() || 'Unknown Show';
    const crunchyrollSeriesUrl = getCurrentCrunchyrollSeriesUrl(crunchyrollId, title);
    showEntry = {
      title,
      crunchyrollId,
      crunchyrollSeriesUrl,
      service: 'crunchyroll',
    };
    serviceTag = 'crunchyroll';
  } else {
    const uuid = getCurrentMaxShowUuid();
    if (!uuid) {
      showToast('Could not find show ID');
      return;
    }
    const title = getCurrentShowTitle();
    showEntry = { title, maxId: uuid };
    serviceTag = 'max';
  }
  const playlists = await readPlaylistsFromStorage();
  playlists.push({
    id: generatePlaylistId(),
    name,
    shows: [showEntry],
    episodes: [],
    service: serviceTag,
  });

  await writePlaylistsToStorage(playlists);
  showToast('Playlist created & show added');
  closeCreatePlaylistForm();
  await populatePlaylistDropdown();
}

function escapePlaylistLabel(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Renders the inline show title rows for a playlist's expandable panel list.
function renderPlaylistShowListItems(playlist) {
  const shows = playlist?.shows || [];
  if (!shows.length) {
    return '<div class="shufflr-pl-show-item">No shows yet</div>';
  }
  return shows.map(show => (
    `<div class="shufflr-pl-show-item">${escapePlaylistLabel(getPlaylistShowTitle(show))}</div>`
  )).join('');
}

// Toggles the inline show list under a playlist name row in the panel dropdown.
function togglePlaylistShowsList(playlistIndex) {
  const wrap = document.querySelector(`.shufflr-pl-row-wrap[data-pl-index="${playlistIndex}"]`);
  if (!wrap) return;
  const list = wrap.querySelector('.shufflr-pl-shows-list');
  const toggle = wrap.querySelector('.shufflr-pl-shows-toggle');
  if (!list || !toggle) return;

  const willOpen = list.hidden;
  list.hidden = !willOpen;
  toggle.textContent = willOpen ? '▴' : '▾';
  toggle.setAttribute('aria-expanded', String(willOpen));
  wrap.querySelector('.shufflr-pl-row-header')?.classList.toggle('open', willOpen);
}

function closePlaylistDropdown() {
  const dropdown = document.getElementById('shufflr-playlist-dropdown');
  const toggle = document.getElementById('shufflr-playlist-toggle');
  if (dropdown) dropdown.classList.remove('open');
  if (toggle) toggle.classList.remove('open');
}

function togglePlaylistDropdown(event) {
  event.preventDefault();
  event.stopPropagation();
  const dropdown = document.getElementById('shufflr-playlist-dropdown');
  const toggle = document.getElementById('shufflr-playlist-toggle');
  if (!dropdown || !toggle) return;
  const willOpen = !dropdown.classList.contains('open');
  closePlaylistDropdown();
  if (willOpen) {
    populatePlaylistDropdown().then(() => {
      dropdown.classList.add('open');
      toggle.classList.add('open');
    });
  }
}

function renderShuffleSettingsSection(settings = {}) {
  const ordered = !!settings.orderedEpisodes;
  return `
    <div class="shufflr-pl-settings">
      <label class="shufflr-pl-toggle-row">
        <input
          type="checkbox"
          class="shufflr-pl-toggle-input"
          data-pl-action="toggle-ordered"
          ${ordered ? 'checked' : ''}
        />
        <span class="shufflr-pl-toggle-label">
          <span class="shufflr-pl-toggle-title">Ordered Episodes</span>
          <span class="shufflr-pl-toggle-hint">Sequential per show · round-robin between shows</span>
        </span>
      </label>
    </div>
  `;
}

async function readShuffleSettings() {
  if (!isChromeContextValid()) return { orderedEpisodes: false, shuffleMode: 'single' };
  const stored = await storageLocalGet(SHUFFLR_SHUFFLE_SETTINGS_KEY);
  return {
    orderedEpisodes: !!stored?.orderedEpisodes,
    shuffleMode: stored?.shuffleMode === 'all' ? 'all' : 'single',
  };
}

async function applyShuffleSettingsFromWebApp(settings) {
  if (!isChromeContextValid()) return;
  const existing = await storageLocalGet(SHUFFLR_SHUFFLE_SETTINGS_KEY) || {};
  const payload = {
    orderedEpisodes: settings.orderedEpisodes != null
      ? !!settings.orderedEpisodes
      : !!existing.orderedEpisodes,
    shuffleMode: settings.shuffleMode === 'all' ? 'all' : (
      settings.shuffleMode === 'single' ? 'single' : (existing.shuffleMode === 'all' ? 'all' : 'single')
    ),
  };
  await storageLocalSet(SHUFFLR_SHUFFLE_SETTINGS_KEY, payload);
  orderedEpisodesCached = !!payload.orderedEpisodes;
  shuffleModeCached = payload.shuffleMode;
}

async function saveShuffleSettings(settings) {
  if (!isChromeContextValid()) return { orderedEpisodes: false, shuffleMode: 'single' };
  const existing = await storageLocalGet(SHUFFLR_SHUFFLE_SETTINGS_KEY) || {};
  const payload = {
    orderedEpisodes: settings.orderedEpisodes != null
      ? !!settings.orderedEpisodes
      : !!existing.orderedEpisodes,
    shuffleMode: settings.shuffleMode === 'all' ? 'all' : (
      settings.shuffleMode === 'single' ? 'single' : (existing.shuffleMode === 'all' ? 'all' : 'single')
    ),
  };
  await storageLocalSet(SHUFFLR_SHUFFLE_SETTINGS_KEY, payload);
  orderedEpisodesCached = !!payload.orderedEpisodes;
  shuffleModeCached = payload.shuffleMode;
  return payload;
}

async function resetShuffleModeToSingle() {
  if (!isChromeContextValid()) {
    shuffleModeCached = 'single';
    return;
  }
  await saveShuffleSettings({ shuffleMode: 'single' });
}

async function setOrderedEpisodesEnabled(enabled) {
  if (!isChromeContextValid()) return { orderedEpisodes: false };
  const next = await saveShuffleSettings({ orderedEpisodes: !!enabled });
  orderedEpisodesCached = !!next.orderedEpisodes;
  showToast(next.orderedEpisodes ? 'Ordered Episodes ON' : 'Ordered Episodes OFF');
  return next;
}

function renderPlaylistDropdownContent(playlists, settings = {}) {
  const emptyMessage = 'No playlists yet — create one below';
  const settingsSection = renderShuffleSettingsSection(settings);
  const playlistRows = playlists.length
    ? playlists.map((playlist, index) => renderPlaylistRow(playlist, index)).join('')
    : `<button type="button" class="shufflr-pl-row shufflr-pl-empty" disabled>${emptyMessage}</button>`;

  return `
    <div class="shufflr-pl-dropdown-top">
      ${renderYourShowsAddButton()}
    </div>
    <div class="shufflr-pl-dropdown-scroll">
      ${settingsSection}
      <div class="shufflr-pl-section">
        ${playlistRows}
      </div>
    </div>
    <div class="shufflr-pl-dropdown-footer">
      ${renderPlaylistCreateSection()}
    </div>
  `;
}

function extractMaxShowUuidFromUrl(url) {
  if (!url || !String(url).includes('/show/')) return null;
  const match = String(url).match(
    /\/show\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  return match ? match[1] : null;
}

function getCurrentMaxShowUuid() {
  const fromLocation = extractMaxShowUuidFromUrl(location.href);
  if (fromLocation) return fromLocation;

  const fromWatch = resolveMaxWatchIds(location.href);
  if (fromWatch?.showId) return fromWatch.showId;

  const showPage = knownShowPageUrl || sessionStorage.getItem(SHUFFLR_SHOW_PAGE_KEY);
  return extractMaxShowUuidFromUrl(showPage);
}

function getCurrentShowTitle() {
  const onVideoPage = location.href.includes('/video/') || location.href.includes('/play/');
  if (onVideoPage) {
    const showName = getMaxPlayerShowName();
    if (showName) return showName;
  }

  const h1 = document.querySelector('h1');
  if (h1?.textContent?.trim()) return h1.textContent.trim();

  const videoTitleSelectors = [
    '[data-testid="play-page-title"]',
    '[data-testid="title"]',
    'h2[data-testid]',
    '[class*="VideoTitle"]',
    '[class*="video-title"]',
    'meta[property="og:title"]',
  ];

  for (const selector of videoTitleSelectors) {
    const el = document.querySelector(selector);
    if (!el) continue;
    const raw = el.getAttribute?.('content') || el.textContent;
    const text = raw?.trim();
    if (text) return text.split('|')[0].trim();
  }

  return 'Unknown Show';
}

async function syncPlaylistsToSupabaseFromExtension(playlists) {
  if (!isChromeContextValid()) return playlists;
  const session = await getValidAuthSession();
  if (!session?.accessToken || !session?.userId) return playlists;

  const authHeaders = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json',
  };

  const synced = (playlists || []).map(pl => ({
    ...pl,
    shows: pl.shows || [],
    episodes: pl.episodes || [],
  }));

  for (const pl of synced) {
    const row = {
      user_id: session.userId,
      name: pl.name,
      shows: pl.shows,
      service: pl.service || 'max',
    };
    if (pl.cloudId) row.id = pl.cloudId;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/playlists?on_conflict=id`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          Prefer: 'return=representation,resolution=merge-duplicates',
        },
        body: JSON.stringify(row),
      });

      if (!response.ok) {
        console.error('[Shufflr] Cloud playlist save failed:', response.status);
        continue;
      }

      const data = await response.json();
      const saved = Array.isArray(data) ? data[0] : data;
      if (saved?.id) pl.cloudId = saved.id;
    } catch (err) {
      console.error('[Shufflr] Cloud playlist save error:', err);
    }
  }

  try {
    const listResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/playlists?user_id=eq.${encodeURIComponent(session.userId)}&select=id`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.accessToken}` } },
    );
    if (listResponse.ok) {
      const remoteRows = await listResponse.json();
      const localCloudIds = new Set(synced.map(p => p.cloudId).filter(Boolean));
      for (const remote of remoteRows || []) {
        if (!localCloudIds.has(remote.id)) {
          await fetch(`${SUPABASE_URL}/rest/v1/playlists?id=eq.${encodeURIComponent(remote.id)}`, {
            method: 'DELETE',
            headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.accessToken}` },
          });
        }
      }
    }
  } catch (err) {
    console.error('[Shufflr] Cloud playlist orphan cleanup error:', err);
  }

  await chromeStorageLocalSet({ [SHUFFLR_PLAYLISTS_KEY]: synced });
  dropdownPlaylists = synced;
  return synced;
}

async function syncYourShowsToSupabaseFromExtension(shows) {
  if (!isChromeContextValid()) return;
  const session = await getValidAuthSession();
  if (!session?.accessToken || !session?.userId) return;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/your_shows?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal,resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: session.userId,
        shows: Array.isArray(shows) ? shows : [],
      }),
    });

    if (!response.ok) {
      console.error('[Shufflr] your_shows upsert failed:', response.status);
    }
  } catch (err) {
    console.error('[Shufflr] your_shows upsert error:', err);
  }
}

async function writePlaylistsToStorage(playlists) {
  if (!isChromeContextValid()) return;
  dropdownPlaylists = playlists;
  await setShufflrPlaylistsInStorage(playlists, { syncToWebApp: true });
  void syncPlaylistsToSupabaseFromExtension(playlists);
}

async function readYourShowsFromStorage() {
  if (!isChromeContextValid()) return [];
  const stored = await storageLocalGet(SHUFFLR_YOUR_SHOWS_KEY);
  return Array.isArray(stored) ? stored : [];
}

/** Fetch Your Shows from Supabase and replace local storage. Returns the cloud list, or null if unreachable. */
async function refreshYourShowsFromCloudIfPossible() {
  if (!isChromeContextValid()) return null;
  const session = await getValidAuthSession();
  if (!session?.accessToken || !session?.userId) return null;

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
      console.log('[Shufflr] your_shows cloud fetch failed:', response.status);
      return null;
    }
    const rows = await response.json();
    if (!Array.isArray(rows)) return null;
    const cloudShows = rows.length === 0
      ? []
      : (Array.isArray(rows[0]?.shows) ? rows[0].shows : []);
    await chromeStorageLocalSet({ [SHUFFLR_YOUR_SHOWS_KEY]: cloudShows });
    return cloudShows;
  } catch (err) {
    console.log('[Shufflr] your_shows cloud fetch error:', err);
    return null;
  }
}

/**
 * Prefer cloud Your Shows when the fetch succeeds (including an empty list).
 * cloudReadSucceeded is false only on genuine failure (no auth, network, bad response)
 * — distinct from a successful cloud read that returned [].
 */
async function readYourShowsPreferCloud() {
  const cloudShows = await refreshYourShowsFromCloudIfPossible();
  if (cloudShows !== null) {
    return { shows: cloudShows, cloudReadSucceeded: true };
  }
  return {
    shows: await readYourShowsFromStorage(),
    cloudReadSucceeded: false,
  };
}

async function writeYourShowsToStorage(shows, { syncToCloud = true } = {}) {
  if (!isChromeContextValid()) return;
  await chromeStorageLocalSet({ [SHUFFLR_YOUR_SHOWS_KEY]: shows });
  if (syncToCloud) {
    void syncYourShowsToSupabaseFromExtension(shows);
  }
}

async function addCurrentShowToYourShows() {
  if (!isChromeContextValid()) return;

  if (IS_TUBI) {
    const tubiId = getCurrentTubiSeriesId();
    if (!tubiId) {
      showToast('Could not find show ID');
      return;
    }
    const title = getTubiShowTitle() || 'Unknown Show';
    const { shows: existingShows, cloudReadSucceeded } = await readYourShowsPreferCloud();
    const shows = Array.isArray(existingShows) ? [...existingShows] : [];
    const alreadyAdded = shows.some(show => String(show.tubiId) === String(tubiId));
    if (alreadyAdded) {
      showToast('Already in Your Shows');
      return;
    }
    const tubiSeriesUrl = getCurrentTubiSeriesUrl(tubiId);
    shows.push({
      title,
      tubiId,
      tubiSeriesUrl,
      service: 'tubi',
    });
    if (cloudReadSucceeded) {
      await writeYourShowsToStorage(shows);
    } else {
      console.warn('[Shufflr] Tubi Add: cloud read failed, adding locally only — will not overwrite cloud');
      await writeYourShowsToStorage(shows, { syncToCloud: false });
    }
    showToast(`Added ${title} to Your Shows`);
    return;
  }

  if (isCrunchyroll) {
    const crunchyrollId = getCurrentCrunchyrollSeriesId();
    if (!crunchyrollId) {
      showToast('Could not find show ID');
      return;
    }
    const title = getCrunchyrollShowTitle() || 'Unknown Show';
    const { shows: existingShows } = await readYourShowsPreferCloud();
    const shows = Array.isArray(existingShows) ? [...existingShows] : [];
    const alreadyAdded = shows.some(show => show.crunchyrollId === crunchyrollId);
    if (alreadyAdded) {
      showToast('Already in Your Shows');
      return;
    }
    const crunchyrollSeriesUrl = getCurrentCrunchyrollSeriesUrl(crunchyrollId, title);
    shows.push({
      title,
      crunchyrollId,
      crunchyrollSeriesUrl,
      service: 'crunchyroll',
    });
    await writeYourShowsToStorage(shows);
    showToast(`Added ${title} to Your Shows`);
    return;
  }

  const uuid = getCurrentMaxShowUuid();
  if (!uuid) {
    showToast('Could not find show ID');
    return;
  }

  const title = getCurrentShowTitle();
  const { shows: existingShows } = await readYourShowsPreferCloud();
  const shows = Array.isArray(existingShows) ? [...existingShows] : [];
  const alreadyAdded = shows.some(show => (
    show.maxId === uuid || show.maxShowId === uuid || show.max_id === uuid
  ));
  if (alreadyAdded) {
    showToast('Already in Your Shows');
    return;
  }

  shows.push({ title, maxId: uuid });
  await writeYourShowsToStorage(shows);
  showToast(`Added ${title} to Your Shows`);
}

async function addCurrentShowToPlaylist(playlistIndex) {
  if (!isChromeContextValid()) return;

  let showEntry, serviceTag, alreadyAddedCheck;

  if (IS_TUBI) {
    const tubiId = getCurrentTubiSeriesId();
    if (!tubiId) {
      showToast('Could not find show ID');
      return;
    }
    const title = getTubiShowTitle() || 'Unknown Show';
    const tubiSeriesUrl = getCurrentTubiSeriesUrl(tubiId);
    showEntry = {
      title,
      tubiId,
      tubiSeriesUrl,
      service: 'tubi',
    };
    serviceTag = 'tubi';
    alreadyAddedCheck = show => String(show.tubiId) === String(tubiId);
  } else if (isCrunchyroll) {
    const crunchyrollId = getCurrentCrunchyrollSeriesId();
    if (!crunchyrollId) {
      showToast('Could not find show ID');
      return;
    }
    const title = getCrunchyrollShowTitle() || 'Unknown Show';
    const crunchyrollSeriesUrl = getCurrentCrunchyrollSeriesUrl(crunchyrollId, title);
    showEntry = {
      title,
      crunchyrollId,
      crunchyrollSeriesUrl,
      service: 'crunchyroll',
    };
    serviceTag = 'crunchyroll';
    alreadyAddedCheck = show => show.crunchyrollId === crunchyrollId;
  } else {
    const showId = getCurrentMaxShowUuid();
    if (!showId) {
      showToast('Could not find show ID');
      return;
    }
    const title = getCurrentShowTitle();
    showEntry = { title, maxId: showId };
    serviceTag = 'max';
    alreadyAddedCheck = show => (
      show.maxId === showId || show.maxShowId === showId || show.max_id === showId
    );
  }

  const playlists = await readPlaylistsFromStorage();
  const playlist = playlists[playlistIndex];
  if (!playlist) {
    showToast('Playlist not found');
    return;
  }
  if (!playlist.shows) playlist.shows = [];

  if (playlist.shows.some(alreadyAddedCheck)) {
    showToast(`Already in ${playlist.name || 'playlist'}`);
    return;
  }

  playlist.shows.push(showEntry);
  if (!playlist.service) playlist.service = serviceTag;

  await writePlaylistsToStorage(playlists);
  showToast(`Added ${showEntry.title} to ${playlist.name || 'playlist'}`);

  const dropdown = document.getElementById('shufflr-playlist-dropdown');
  if (dropdown?.classList.contains('open')) {
    await populatePlaylistDropdown();
  }
}

async function populatePlaylistDropdown() {
  if (!isChromeContextValid()) return;
  const dropdown = document.getElementById('shufflr-playlist-dropdown');
  if (!dropdown) return;
  const allPlaylists = await readPlaylistsFromStorage();
  const currentService = IS_TUBI ? 'tubi' : (isCrunchyroll ? 'crunchyroll' : 'max');
  const filteredPlaylists = allPlaylists.filter(p => (p.service || 'max') === currentService);
  dropdownPlaylists = allPlaylists;
  const settings = await readShuffleSettings();
  const indexedPlaylists = filteredPlaylists.map(p => ({
    ...p,
    _globalIndex: allPlaylists.indexOf(p)
  }));
  dropdown.innerHTML = renderPlaylistDropdownContent(indexedPlaylists, settings);
}

function smartShuffleEpKey(seasonNum, epNum) {
  return `s${seasonNum}e${epNum}`;
}

function episodeCacheId(ep) {
  if (ep.seasonNum != null && ep.episode_number != null) {
    return smartShuffleEpKey(ep.seasonNum, ep.episode_number);
  }
  if (ep.alternateId) return `alt-${ep.alternateId}`;
  return null;
}

function serializePlayedByShow(playedByShow) {
  const out = {};
  Object.keys(playedByShow).forEach(showId => {
    out[showId] = [...(playedByShow[showId] || [])];
  });
  return out;
}

function deserializePlayedByShow(serialized) {
  const out = {};
  if (!serialized || typeof serialized !== 'object') return out;
  Object.keys(serialized).forEach(showId => {
    out[showId] = new Set(serialized[showId] || []);
  });
  return out;
}

function getPlaylistShowMaxId(show) {
  const explicit = show?.maxId || show?.maxShowId || show?.max_id;
  if (explicit) return String(explicit);

  const id = show?.id;
  if (typeof id === 'string' && MAX_SHOW_UUID_RE.test(id)) return id;
  return null;
}

function getPlaylistShowTitle(show) {
  return show?.title || show?.name || show?.original_name || 'Untitled';
}

// Returns a TMDB-relative poster path (e.g. /abc.jpg) from a playlist show entry.
function getPlaylistShowPosterPath(show) {
  const raw = show?.poster_path || show?.posterPath || show?.showPoster || show?.poster || '';
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const tmdbMatch = text.match(/\/t\/p\/(?:original|w\d+)\/(.+)$/);
  if (tmdbMatch?.[1]) return `/${tmdbMatch[1]}`;
  return text.startsWith('/') ? text : `/${text}`;
}

function findPlaylistShowPosterPathInActive(active, showId) {
  if (!showId) return null;
  const norm = normalizeMaxId(showId);
  for (const show of active?.shows || []) {
    if (normalizeMaxId(getPlaylistShowMaxId(show)) === norm) {
      return getPlaylistShowPosterPath(show);
    }
  }
  return null;
}

function getPlaylistMaxIds(playlist) {
  return new Set(
    (playlist?.shows || [])
      .map(getPlaylistShowMaxId)
      .filter(Boolean)
      .map(normalizeMaxId)
  );
}

function filterEnrichedToPlaylist(enriched, playlist) {
  const allowedMaxIds = getPlaylistMaxIds(playlist);
  return enriched.filter(show => allowedMaxIds.has(normalizeMaxId(show.id)));
}

async function resolvePlaylistForShuffle(activePayload) {
  if (!isChromeContextValid()) {
    return {
      name: activePayload?.playlistName || '',
      shows: activePayload?.shows || [],
      episodes: activePayload?.episodes || [],
    };
  }
  const playlists = await readPlaylistsFromStorage();
  const index = activePayload?.playlistIndex;
  const name = String(activePayload?.playlistName || '');

  if (Number.isFinite(index) && index >= 0 && playlists[index]) {
    const byIndex = playlists[index];
    if (!name || (byIndex.name || '') === name) return byIndex;
  }

  if (name) {
    const byName = playlists.find(playlist => (playlist.name || '') === name);
    if (byName) return byName;
  }

  return {
    name: activePayload?.playlistName || '',
    shows: activePayload?.shows || [],
    episodes: activePayload?.episodes || [],
  };
}

function deserializeRoundPlayedShows(serialized) {
  if (!Array.isArray(serialized)) return new Set();
  return new Set(serialized.map(id => String(id)));
}

function serializeRoundPlayedShows(roundPlayedShows) {
  return [...(roundPlayedShows || new Set())].map(id => String(id));
}

function resolveShowIdForCop(url, active) {
  const fromShowPage = extractMaxShowUuidFromUrl(url);
  if (fromShowPage) return normalizeMaxId(fromShowPage);

  const hint = getShowMaxIdHintFromActive(active);
  const resolved = resolveMaxWatchIds(url, hint);
  if (resolved?.showId) return normalizeMaxId(resolved.showId);
  if (active?.currentShow?.showId) return normalizeMaxId(active.currentShow.showId);
  if (active?.currentEpisode?.showId) return normalizeMaxId(active.currentEpisode.showId);
  if (hint) return normalizeMaxId(hint);
  return null;
}

function pickNextShowRoundRobin(playlistShows, lastPlayedShow, roundPlayedShows) {
  const validShows = (playlistShows || []).filter(showHasMaxId);
  if (!validShows.length) return null;

  const entries = validShows.map(show => ({
    show,
    id: normalizeMaxId(getPlaylistShowMaxId(show)),
  }));

  let roundPool = entries.filter(entry => !roundPlayedShows.has(entry.id));
  if (!roundPool.length) {
    roundPlayedShows.clear();
    roundPool = entries;
  }

  let pool = roundPool;
  if (lastPlayedShow && pool.length > 1) {
    const lastNorm = normalizeMaxId(lastPlayedShow);
    const withoutLast = pool.filter(entry => entry.id !== lastNorm);
    if (withoutLast.length) pool = withoutLast;
  }

  return pool[0]?.show || null;
}

async function saveOrderedShowRotationState(
  playlist,
  show,
  showId,
  playlistIndex,
  roundPlayedShows,
  options = {}
) {
  if (!isChromeContextValid()) return;
  const showTitle = getPlaylistShowTitle(show);
  const pick = options.episode || null;
  const watchUrl = pick?.alternateId
    ? (pick.watchUrl || buildMaxEpisodeWatchUrl(pick.alternateId, showId))
    : null;
  const activePayload = {
    armed: true,
    playlistName: playlist.name || '',
    playlistIndex,
    shows: [...(playlist.shows || [])],
    episodes: [...(playlist.episodes || [])],
    selectedService: 'max',
    currentShow: { showId, showName: showTitle },
    currentEpisode: pick?.alternateId
      ? {
        showId,
        showName: showTitle,
        posterPath: getPlaylistShowPosterPath(show),
        seasonNum: pick.seasonNum,
        episode_number: pick.episode_number,
        name: pick.name || '',
        alternateId: String(pick.alternateId),
      }
      : null,
    currentEpisodeUrl: watchUrl,
    createdAt: Date.now(),
    sessionStartedAt: Date.now(),
    ownerTabId: getShufflrTabId(),
  };
  const stored = await storageLocalGet(SHUFFLR_EPISODE_STATE_KEY);
  const episodeState = {
    ...(stored && typeof stored === 'object' ? stored : {}),
    lastPlayedShow: showId,
    roundPlayedShows: serializeRoundPlayedShows(roundPlayedShows),
    nextEpisodeIndexByShow: { ...(options.nextEpisodeIndexByShow || {}) },
    playlistName: playlist.name || '',
    playlistIndex,
  };

  await chromeStorageLocalSet({
    [SHUFFLR_ACTIVE_PLAYLIST_KEY]: activePayload,
    [SHUFFLR_EPISODE_STATE_KEY]: episodeState,
  });
}

async function updateOrderedCurrentEpisodeFromUrl(active, url) {
  if (!isChromeContextValid() || !isArmedPlaylistOwnedByThisTab(active)) return;
  const hint = getShowMaxIdHintFromActive(active);
  const episodeId = getMaxEpisodeIdFromUrl(url, hint);
  if (!episodeId) return;

  const showId = resolveShowIdForCop(url, active);
  if (showId) {
    await writeOrderedProgressForShow(showId, episodeId);
  }
  const updated = {
    ...active,
    currentEpisode: {
      showId,
      showName: active.currentEpisode?.showName
        || findPlaylistShowTitleByMaxId([{ shows: active?.shows || [] }], showId)
        || active.currentShow?.showName
        || '',
      posterPath: active.currentEpisode?.posterPath
        || findPlaylistShowPosterPathInActive(active, showId),
      alternateId: episodeId,
    },
    currentEpisodeUrl: String(url).split('?')[0],
  };
  await chromeStorageLocalSet({ [SHUFFLR_ACTIVE_PLAYLIST_KEY]: updated });
}

/** Sort Max CMS episode details by season then episode number (true airing order). */
function sortMaxEpisodesForOrderedMode(details) {
  return [...(details || [])]
    .filter(ep => ep?.alternateId)
    .sort((a, b) => {
      const sa = Number(a.seasonNum);
      const sb = Number(b.seasonNum);
      const ea = Number(a.episode_number);
      const eb = Number(b.episode_number);
      const aHas = Number.isFinite(sa) && Number.isFinite(ea);
      const bHas = Number.isFinite(sb) && Number.isFinite(eb);
      if (aHas && bHas) {
        if (sa !== sb) return sa - sb;
        return ea - eb;
      }
      if (aHas !== bHas) return aHas ? -1 : 1;
      return 0;
    });
}

/**
 * Sequential Max pick using season/episode order.
 * Persistent shufflr_ordered_progress (by maxShowId) is the source of truth;
 * nextEpisodeIndexByShow is kept as a per-session mirror.
 */
async function pickOrderedMaxEpisode(details, showMaxId, nextEpisodeIndexByShow = {}) {
  const ordered = sortMaxEpisodesForOrderedMode(details);
  if (!ordered.length) return null;

  const sid = normalizeMaxId(showMaxId);
  if (!sid) return null;

  const progress = await readOrderedProgress();
  const lastId = progress[sid]?.lastPlayedEpisodeId
    ? normalizeMaxId(progress[sid].lastPlayedEpisodeId)
    : null;

  let idx = 0;
  if (lastId) {
    const found = ordered.findIndex(ep => normalizeMaxId(ep.alternateId) === lastId);
    if (found >= 0) {
      idx = (found + 1) % ordered.length;
    }
  } else {
    const sessionIdx = Number(nextEpisodeIndexByShow[sid]);
    if (Number.isFinite(sessionIdx) && sessionIdx >= 0) {
      idx = sessionIdx % ordered.length;
    }
  }

  const pick = ordered[idx];
  if (!pick?.alternateId) return null;

  nextEpisodeIndexByShow[sid] = (idx + 1) % ordered.length;
  await writeOrderedProgressForShow(sid, pick.alternateId);
  return pick;
}

async function navigateToOrderedShowPageFallback(
  preparedPlaylist,
  nextShow,
  showMaxId,
  showId,
  playlistIndex,
  roundPlayedShows,
  nextEpisodeIndexByShow,
  showTitle,
  navMode = 'auto'
) {
  const status = document.getElementById('shufflr-status');
  await saveOrderedShowRotationState(
    preparedPlaylist,
    nextShow,
    showId,
    playlistIndex,
    roundPlayedShows,
    { nextEpisodeIndexByShow }
  );
  showToast(`Next show: ${showTitle}`);
  if (status) status.textContent = showTitle.toUpperCase().slice(0, 24);
  shufflrTargetWatchUrl = null;
  shufflrTargetEpisodeId = null;
  sessionStorage.setItem(SHUFFLR_AUTOPLAY_PENDING_KEY, 'true');
  await shufflrNavigateTo(buildMaxShowPageUrl(showMaxId), {
    mode: navMode === 'user' ? 'user' : 'auto',
    source: 'ordered-show-fallback',
  });
}

// Ordered Episodes: round-robin shows, then Shufflr picks the exact next episode in sequence.
async function navigateToNextOrderedShow(source, options = {}) {
  if (!isChromeContextValid()) return;
  if (isAdPlaying()) return;
  const navMode = options.mode === 'user' ? 'user' : 'auto';

  // handleShufflrNextEpisode may already hold the lock — proceed without re-acquiring.
  const ownsLock = !shufflrEpisodeTransitionLock;
  if (ownsLock) {
    shufflrEpisodeTransitionLock = true;
  }

  const active = await getActivePlaylistFromStorage();
  if (!isArmedPlaylistOwnedByThisTab(active)) {
    if (ownsLock) shufflrEpisodeTransitionLock = false;
    return;
  }

  shufflrActive = true;
  armedPlaylistCached = true;
  console.log(`[Shufflr] Ordered mode — next episode via ${source}`);

  try {
    const sourcePlaylist = await resolvePlaylistForShuffle(active);
    const playlistIndex = active.playlistIndex ?? 0;
    const preparedPlaylist = preparePlaylistForShuffle(sourcePlaylist);
    if (!preparedPlaylist.shows.length) {
      showToast('No shows with Max ID');
      return;
    }

    let { lastPlayedShow, roundPlayedShows, nextEpisodeIndexByShow } =
      await loadEpisodeStateForPlaylist(preparedPlaylist, playlistIndex);
    if (!(roundPlayedShows instanceof Set)) {
      roundPlayedShows = deserializeRoundPlayedShows(roundPlayedShows);
    }
    nextEpisodeIndexByShow = { ...(nextEpisodeIndexByShow || {}) };

    const nextShow = pickNextShowRoundRobin(preparedPlaylist.shows, lastPlayedShow, roundPlayedShows);
    if (!nextShow) {
      showToast('No shows available in playlist');
      return;
    }

    const showMaxId = getPlaylistShowMaxId(nextShow);
    if (!showMaxId) return;

    const showId = normalizeMaxId(showMaxId);
    roundPlayedShows.add(showId);

    const showTitle = getPlaylistShowTitle(nextShow);
    const status = document.getElementById('shufflr-status');
    const details = await ensureShowEpisodesFetched(nextShow);
    const pick = details?.length
      ? await pickOrderedMaxEpisode(details, showId, nextEpisodeIndexByShow)
      : null;

    if (!pick?.alternateId) {
      console.log(`[Shufflr] Ordered mode — no episode list for ${showTitle}, falling back to show page`);
      await navigateToOrderedShowPageFallback(
        preparedPlaylist,
        nextShow,
        showMaxId,
        showId,
        playlistIndex,
        roundPlayedShows,
        nextEpisodeIndexByShow,
        showTitle,
        navMode
      );
      return;
    }

    const watchUrl = pick.watchUrl || buildMaxEpisodeWatchUrl(pick.alternateId, showMaxId);
    await saveOrderedShowRotationState(
      preparedPlaylist,
      nextShow,
      showId,
      playlistIndex,
      roundPlayedShows,
      { episode: pick, nextEpisodeIndexByShow }
    );

    showToast(`Playing: ${showTitle}`);
    if (status) status.textContent = showTitle.toUpperCase().slice(0, 24);

    beginShufflrNavigation(pick.alternateId);
    await shufflrNavigateTo(watchUrl, {
      mode: navMode,
      source: `ordered-${source}`,
    });
  } catch (err) {
    console.error('[Shufflr] navigateToNextOrderedShow error:', err);
  } finally {
    if (!ownsLock) return;
    setTimeout(() => {
      if (!isChromeContextValid()) return;
      shufflrEpisodeTransitionLock = false;
    }, EPISODE_TRANSITION_LOCK_MS);
  }
}

function smartShuffle(enrichedShows, playedByShow, lastPlayedShow, allowedMaxIds = null, options = {}) {
  const roundPlayedShows = options.roundPlayedShows instanceof Set
    ? options.roundPlayedShows
    : deserializeRoundPlayedShows(options.roundPlayedShows);
  const nextEpisodeIndexByShow = { ...(options.nextEpisodeIndexByShow || {}) };

  let availableShows = enrichedShows.filter(show => show.episodes?.length);
  if (allowedMaxIds?.size) {
    availableShows = availableShows.filter(show => allowedMaxIds.has(normalizeMaxId(show.id)));
  }
  if (!availableShows.length) return null;

  let roundShows = availableShows.filter(show => !roundPlayedShows.has(String(show.id)));
  if (!roundShows.length) {
    roundPlayedShows.clear();
    roundShows = availableShows;
  }

  let showPool = roundShows;
  if (lastPlayedShow && showPool.length > 1) {
    const withoutLast = showPool.filter(show => String(show.id) !== String(lastPlayedShow));
    if (withoutLast.length) showPool = withoutLast;
  }

  let candidates = [];

  for (const show of showPool) {
    const showId = String(show.id);
    if (!playedByShow[showId]) playedByShow[showId] = new Set();

    let unplayed = show.episodes.filter(ep => !playedByShow[showId].has(ep.id));
    if (!unplayed.length) {
      playedByShow[showId].clear();
      unplayed = show.episodes;
    }

    candidates = candidates.concat(unplayed.map(ep => ({ ...ep, showId: show.id })));
  }

  if (!candidates.length) {
    candidates = availableShows.flatMap(show => (
      show.episodes.map(ep => ({ ...ep, showId: show.id }))
    ));
  }

  if (allowedMaxIds?.size) {
    candidates = candidates.filter(ep => allowedMaxIds.has(normalizeMaxId(ep.showId)));
  }

  if (!candidates.length) return null;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const pickShowId = String(pick.showId);
  if (!playedByShow[pickShowId]) playedByShow[pickShowId] = new Set();
  playedByShow[pickShowId].add(pick.id);
  roundPlayedShows.add(pickShowId);

  return {
    pick,
    lastPlayedShow: pickShowId,
    roundPlayedShows,
    nextEpisodeIndexByShow,
  };
}

async function getEpisodeDetailsForPlaylistShow(show) {
  if (!isChromeContextValid()) return [];
  const maxId = getPlaylistShowMaxId(show);
  if (!maxId) return [];

  const entry = await getCachedEpisodeEntry(maxId);
  if (entry) return episodeDetailsFromCacheEntry(entry);
  return [];
}

function getEpisodeDurationSeconds(attrs) {
  if (!attrs) return 0;
  const raw = attrs.duration ?? attrs.runTime ?? attrs.runtime ?? attrs.length;
  if (raw == null) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 10000 ? Math.round(n / 1000) : Math.round(n);
}

function isMovieEpisodeList(episodeDetails) {
  if (!Array.isArray(episodeDetails) || episodeDetails.length !== 1) return false;
  const duration = Number(episodeDetails[0]?.duration) || 0;
  return duration > MOVIE_MIN_DURATION_SEC;
}

async function ensureShowEpisodesFetched(show) {
  if (!isChromeContextValid()) return [];
  let details = await getEpisodeDetailsForPlaylistShow(show);
  if (details.length) return details;

  await fetchAndCachePlaylistShow(show);
  return getEpisodeDetailsForPlaylistShow(show);
}

function mapEpisodeDetailsToShuffleEpisodes(show, details) {
  const maxId = String(getPlaylistShowMaxId(show));
  return details.map(ep => {
    const id = episodeCacheId(ep);
    if (!id || !ep.alternateId) return null;
    return {
      id,
      showId: maxId,
      showName: getPlaylistShowTitle(show),
      posterPath: getPlaylistShowPosterPath(show),
      seasonNum: ep.seasonNum,
      episode_number: ep.episode_number,
      alternateId: String(ep.alternateId),
      watchUrl: ep.watchUrl || buildMaxEpisodeWatchUrl(ep.alternateId, maxId),
      name: ep.name || '',
    };
  }).filter(Boolean);
}

async function validateShowForShuffle(show) {
  if (!isChromeContextValid()) return null;
  const showName = getPlaylistShowTitle(show);
  const details = await ensureShowEpisodesFetched(show);

  if (!details.length) {
    console.log(`[Shufflr] Skipping show with no episodes: ${showName}`);
    return null;
  }

  if (isMovieEpisodeList(details)) {
    console.log(`[Shufflr] Skipping movie: ${showName}`);
    return null;
  }

  const episodes = mapEpisodeDetailsToShuffleEpisodes(show, details);
  if (!episodes.length) {
    console.log(`[Shufflr] Skipping show with no episodes: ${showName}`);
    return null;
  }

  return {
    id: String(getPlaylistShowMaxId(show)),
    name: showName,
    episodes,
  };
}

async function buildEnrichedPlaylistFromCache(playlist, excludedShowIds = null) {
  if (!isChromeContextValid()) return [];
  const allowedMaxIds = getPlaylistMaxIds(playlist);
  const excluded = excludedShowIds instanceof Set ? excludedShowIds : new Set();
  const shows = (playlist?.shows || []).filter(show => {
    const maxId = getPlaylistShowMaxId(show);
    return maxId && allowedMaxIds.has(normalizeMaxId(maxId));
  });
  const enriched = [];

  for (const show of shows) {
    const maxId = normalizeMaxId(getPlaylistShowMaxId(show));
    if (excluded.has(maxId)) continue;

    const enrichedShow = await validateShowForShuffle(show);
    if (enrichedShow) enriched.push(enrichedShow);
  }

  return enriched;
}

async function loadEpisodeStateForPlaylist(playlist, playlistIndex) {
  if (!isChromeContextValid()) {
    return {
      playedByShow: {},
      lastPlayedShow: null,
      roundPlayedShows: new Set(),
      nextEpisodeIndexByShow: {},
    };
  }
  const stored = await storageLocalGet(SHUFFLR_EPISODE_STATE_KEY);
  if (
    stored
    && stored.playlistIndex === playlistIndex
    && stored.playlistName === (playlist.name || '')
  ) {
    return {
      playedByShow: deserializePlayedByShow(stored.playedByShow),
      lastPlayedShow: stored.lastPlayedShow || null,
      roundPlayedShows: deserializeRoundPlayedShows(stored.roundPlayedShows),
      nextEpisodeIndexByShow: { ...(stored.nextEpisodeIndexByShow || {}) },
    };
  }

  return {
    playedByShow: {},
    lastPlayedShow: null,
    roundPlayedShows: new Set(),
    nextEpisodeIndexByShow: {},
  };
}

async function hasEpisodeCacheForPlaylistShow(show) {
  if (!isChromeContextValid()) return false;
  const details = await getEpisodeDetailsForPlaylistShow(show);
  return details.length > 0;
}

async function findShowsMissingCache(shows) {
  if (!isChromeContextValid()) return [];
  const checks = await Promise.all(shows.map(async show => ({
    show,
    missing: !(await hasEpisodeCacheForPlaylistShow(show)),
  })));
  return checks.filter(entry => entry.missing).map(entry => entry.show);
}

function showHasMaxId(show) {
  return !!getPlaylistShowMaxId(show);
}

function preparePlaylistForShuffle(playlist) {
  const allShows = playlist?.shows || [];
  const validShows = allShows.filter(showHasMaxId);
  const skippedCount = allShows.length - validShows.length;

  if (skippedCount > 0) {
    showToast(`${skippedCount} show${skippedCount !== 1 ? 's' : ''} skipped — add them from Max using +`);
  }

  return {
    ...playlist,
    shows: validShows,
  };
}

async function fetchAndCachePlaylistShow(show) {
  if (!isChromeContextValid()) return { show, success: false };
  const label = show.name || show.title || 'show';
  try {
    const maxId = getPlaylistShowMaxId(show);
    if (!maxId) return { show, success: false };

    const episodes = await collectEpisodesViaMaxShowId(
      maxId,
      getPlaylistShowTitle(show),
      show.id
    );
    if (!episodes?.length) {
      console.log(`[Shufflr] No episodes returned for "${label}"`);
      return { show, success: false };
    }

    return { show, success: true };
  } catch (err) {
    console.log(`[Shufflr] Episode fetch failed for "${label}":`, err);
    return { show, success: false };
  }
}

async function prefetchMissingPlaylistShows(shows) {
  if (!isChromeContextValid()) return { fetched: 0, failed: 0 };
  const missing = await findShowsMissingCache(shows);
  if (!missing.length) return { fetched: 0, failed: 0 };

  showToast(`Loading ${missing.length} show${missing.length !== 1 ? 's' : ''}...`);
  const results = await Promise.all(missing.map(show => fetchAndCachePlaylistShow(show)));
  return {
    fetched: results.filter(result => result.success).length,
    failed: results.filter(result => !result.success).length,
  };
}

async function saveArmedActivePlaylist(playlist, playlistIndex, extra = {}) {
  if (!isChromeContextValid()) return;
  const payload = {
    armed: true,
    playlistName: playlist.name || '',
    playlistIndex,
    shows: [...(playlist.shows || [])],
    episodes: [...(playlist.episodes || [])],
    selectedService: 'max',
    createdAt: Date.now(),
    sessionStartedAt: Date.now(),
    ownerTabId: getShufflrTabId(),
  };
  if (extra.pendingFirstShow) {
    payload.pendingFirstShow = true;
    if (extra.pendingFirstShowId) payload.pendingFirstShowId = String(extra.pendingFirstShowId);
  }

  clearMaxSessionPin(); // playlist arming in this tab replaces any single-show pin

  const ok = await chromeStorageLocalSet({ [SHUFFLR_ACTIVE_PLAYLIST_KEY]: payload });
  if (ok) {
    console.log('[Shufflr] Armed playlist saved to chrome.storage.local');
    console.log('[Shufflr] armed playlist owned by this tab');
  }
  return payload;
}

async function clearActivePlaylist() {
  if (!isChromeContextValid()) return;
  await chromeStorageLocalRemove(SHUFFLR_ACTIVE_PLAYLIST_KEY);
}

async function setStandaloneShuffleEnabled(enabled) {
  if (!isChromeContextValid()) return;
  await chromeStorageLocalSet({ [SHUFFLR_STANDALONE_SHUFFLE_KEY]: !!enabled });
}

async function isStandaloneShuffleEnabled() {
  if (!isChromeContextValid()) return false;
  const value = await storageLocalGet(SHUFFLR_STANDALONE_SHUFFLE_KEY);
  return value === true;
}

function attachShuffleListenersIfVideoPage() {
  const isVideoPage = location.href.includes('/video/') || location.href.includes('/play/');
  if (!isVideoPage) return;
  const video = document.querySelector('video');
  if (video) {
    attachVideoListeners(video);
    ensureVideoSwapObserver();
  }
}

async function getActivePlaylistFromStorage() {
  if (!isChromeContextValid()) return;
  const active = await storageLocalGet(SHUFFLR_ACTIVE_PLAYLIST_KEY);
  if (!active?.armed) return active;
  if (active.playlistIndex === -1) return active; // synthetic "Your Shows" session, not list-backed

  const playlists = await readPlaylistsFromStorage();
  const index = active.playlistIndex;
  const name = String(active.playlistName || '');
  const byIndex = Number.isFinite(index) && index >= 0 ? playlists[index] : null;
  const matchesByIndex = byIndex && (!name || (byIndex.name || '') === name);
  const matchesByName = name && playlists.some(playlist => (playlist.name || '') === name);

  if (!matchesByIndex && !matchesByName) {
    console.log('[Shufflr] Armed playlist no longer exists — clearing stale session');
    await clearActivePlaylist();
    return undefined;
  }

  return active;
}

function updateShuffleUI(playlistName) {
  if (!isChromeContextValid()) return;
  try {
    const btn = document.getElementById('shufflr-btn');
    const label = document.getElementById('shufflr-label');
    const status = document.getElementById('shufflr-status');
    if (!btn || !label || !status) return;

    if (shufflrActive) {
      btn.classList.add('active');
      label.textContent = 'ON';
      let statusName = '';
      if (playlistName === YOUR_SHOWS_ALL_MODE_NAME) {
        statusName = 'Your Shows';
      } else if (playlistName) {
        statusName = playlistName;
      } else {
        // Single-show idle: show the current title; omit if not available yet.
        statusName = (isCrunchyroll ? getCrunchyrollShowTitle() : getCurrentShowTitle()) || '';
      }
      status.textContent = statusName ? statusName.toUpperCase().slice(0, 24) : '';
    } else {
      btn.classList.remove('active');
      label.textContent = 'SHUFFLR';
      status.textContent = '';
    }
  } catch {
    return;
  }
}

async function fullyRestoreArmedShuffleSessionAfterInject() {
  if (!IS_MAX) return false;
  if (!isChromeContextValid()) return false;
  // Ensure tab ID exists early; web-Play claim may run below.
  getShufflrTabId();

  let active = await getActivePlaylistFromStorage();
  active = await maybeClaimUnownedMaxArmedHandoff(active);

  // Standalone web launch auto-start — only when not already in an owned armed playlist.
  if (!isArmedPlaylistOwnedByThisTab(active) && location.href.includes('/show/')) {
    const started = await maybeAutoStartMaxStandaloneLaunch();
    if (started) return true;
    active = await getActivePlaylistFromStorage();
  }

  const owned = isArmedPlaylistOwnedByThisTab(active);
  if (owned) {
    console.log('[Shufflr] armed playlist owned by this tab');
  } else if (active?.armed && !isCrunchyrollArmedPayload(active)) {
    console.log('[Shufflr] armed playlist ignored — owned by another tab (or unclaimed)');
  }

  armedPlaylistCached = owned;

  if (!owned) {
    const standaloneShuffle = await isStandaloneShuffleEnabled();
    if (!standaloneShuffle) {
      shufflrActive = false;
      if (hasShufflrButtonInDom()) {
        if (!isChromeContextValid()) return false;
        updateShuffleUI('');
      }
      return false;
    }

    shufflrActive = true;
    startShuffleWatchdog();

    if (hasShufflrButtonInDom()) {
      if (!isChromeContextValid()) return false;
      updateShuffleUI('');
    }

    attachShuffleListenersIfVideoPage();
    console.log('[Shufflr] Restored standalone shuffle (UI + episode listeners)');
    return true;
  }

  shufflrActive = true;
  startShuffleWatchdog();

  if (hasShufflrButtonInDom()) {
    if (!isChromeContextValid()) return false;
    updateShuffleUI(active.playlistName || '');
  }

  attachShuffleListenersIfVideoPage();

  console.log(
    `[Shufflr] Restored armed playlist "${active.playlistName || 'Untitled'}" ` +
    '(UI + episode listeners)'
  );

  if (location.href.includes('/show/')) {
    void maybeAutoStartMaxArmedPlaylistOnShowPage(active);
  }
  return true;
}

async function restoreArmedShuffleSession() {
  if (!IS_MAX) return false;
  if (!isChromeContextValid()) return false;
  return fullyRestoreArmedShuffleSessionAfterInject();
}

async function syncShuffleUIFromStorage() {
  if (!IS_MAX) return;
  if (!isChromeContextValid()) return;
  await fullyRestoreArmedShuffleSessionAfterInject();
}

function scheduleVideoListenerRestore(retryMs = 1000) {
  if (!isChromeContextValid()) return;
  setTimeout(() => {
    if (!isChromeContextValid()) return;
    if (!shufflrActive && !armedPlaylistCached) return;
    const video = document.querySelector('video');
    if (!video || !document.getElementById('shufflr-wrap')) return;
    attachVideoListeners(video);
    ensureVideoSwapObserver();
  }, retryMs);
}

function getShowMaxIdHintFromActive(active) {
  if (!active) return null;
  if (active.currentShow?.showId) return active.currentShow.showId;
  if (active.currentEpisode?.showId) return active.currentEpisode.showId;

  for (const show of active.shows || []) {
    const maxId = getPlaylistShowMaxId(show);
    if (maxId) return maxId;
  }

  return resolveMaxWatchIds(location.href)?.showId || null;
}

function hasShufflrButtonInDom() {
  return !!(document.getElementById('shufflr-wrap') && document.getElementById('shufflr-btn'));
}

function cancelUiRecoveryGraceTimer() {
  if (uiRecoveryGraceTimer) {
    clearTimeout(uiRecoveryGraceTimer);
    uiRecoveryGraceTimer = null;
  }
  uiMissingSince = null;
}

function scheduleUiRecoveryAfterGrace(reason) {
  if (!isChromeContextValid()) return;
  if (hasShufflrButtonInDom()) {
    cancelUiRecoveryGraceTimer();
    return;
  }
  if (uiRecoveryGraceTimer) return;

  if (!uiMissingSince) {
    uiMissingSince = Date.now();
    console.log(`[Shufflr] Watchdog: button missing — waiting ${UI_RECOVERY_GRACE_MS / 1000}s before recovery`);
  }

  uiRecoveryGraceTimer = setTimeout(() => {
    if (!isChromeContextValid()) return;
    uiRecoveryGraceTimer = null;
    runUiRecoveryAfterGrace(reason).catch(err => {
      console.error('[Shufflr] runUiRecoveryAfterGrace error:', err);
    });
  }, UI_RECOVERY_GRACE_MS);
}

async function runUiRecoveryAfterGrace(reason) {
  if (!isChromeContextValid()) return;
  const active = await getActivePlaylistFromStorage();
  const participates = isArmedPlaylistOwnedByThisTab(active);
  const maintainSession = shufflrActive || participates;
  if (!maintainSession) {
    cancelUiRecoveryGraceTimer();
    return;
  }

  if (hasShufflrButtonInDom()) {
    console.log('[Shufflr] Watchdog: button returned during grace period — no recovery needed');
    cancelUiRecoveryGraceTimer();
    if (IS_MAX) await restoreArmedShuffleSession();
    return;
  }

  cancelUiRecoveryGraceTimer();
  await recoverShufflrUI(reason);
  if (IS_MAX) await fullyRestoreArmedShuffleSessionAfterInject();
  scheduleVideoListenerRestore(500);
  scheduleVideoListenerRestore(1500);
}

async function handleShufflrNextEpisode(source) {
  if (!isChromeContextValid()) return;
  if (isAdPlaying()) return;
  if (shufflrEpisodeTransitionLock) {
    console.log(`[Shufflr] Episode transition already in progress (${source})`);
    return;
  }

  const active = await getActivePlaylistFromStorage();
  if (!isArmedPlaylistOwnedByThisTab(active)) return;

  const navMode = source === 'dropdown-play' ? 'user' : 'auto';
  if (navMode === 'auto' && isShufflrAutoNavStopped()) {
    console.log('[Shufflr] auto-navigation blocked — stopped after error');
    return;
  }

  shufflrEpisodeTransitionLock = true;
  shufflrActive = true;
  armedPlaylistCached = true;
  console.log(`[Shufflr] Playlist next episode via ${source}`);

  try {
    const settings = await readShuffleSettings();
    orderedEpisodesCached = !!settings.orderedEpisodes;
    shuffleModeCached = settings.shuffleMode;
    if (settings.orderedEpisodes) {
      await navigateToNextOrderedShow(source, { mode: navMode });
    } else if (settings.shuffleMode === 'all') {
      await shuffleFromYourShowsAllMode(active, { mode: navMode });
    } else {
      await shuffleFromActivePlaylist(active, { mode: navMode });
    }
  } catch (err) {
    console.error('[Shufflr] handleShufflrNextEpisode error:', err);
    shufflrEpisodeTransitionLock = false;
    return;
  }

  setTimeout(() => {
    if (!isChromeContextValid()) return;
    shufflrEpisodeTransitionLock = false;
  }, EPISODE_TRANSITION_LOCK_MS);
}

async function handlePossibleMaxAutoAdvance(prevUrl) {
  if (!isChromeContextValid()) return;
  if (isAdPlaying()) return;
  const active = await getActivePlaylistFromStorage();
  const showHint = getShowMaxIdHintFromActive(active);

  if (shufflrNavigating) {
    shufflrNavigating = false;
    const arrivedEpisode = getMaxEpisodeIdFromUrl(location.href, showHint);
    if (shufflrPendingEpisodeId && arrivedEpisode
      && normalizeMaxId(arrivedEpisode) === shufflrPendingEpisodeId) {
      shufflrPendingEpisodeId = null;
      void clearPendingEpisodeIdInStorage();
      if (IS_MAX) await restoreArmedShuffleSession();
      return;
    }
    shufflrPendingEpisodeId = null;
    if (maxWatchUrlsRepresentSameEpisode(prevUrl, location.href, showHint)) {
      if (IS_MAX) await restoreArmedShuffleSession();
    }
    return;
  }

  if (shufflrEpisodeTransitionLock) return;
  if (!isArmedPlaylistOwnedByThisTab(active)) return;

  shufflrActive = true;
  armedPlaylistCached = true;

  const onVideoPage = location.href.includes('/video/') || location.href.includes('/play/');
  if (!onVideoPage || prevUrl === location.href) return;

  const settings = await readShuffleSettings();
  orderedEpisodesCached = !!settings.orderedEpisodes;
  if (settings.orderedEpisodes) {
    const prevShowId = resolveShowIdForCop(prevUrl, active);
    const currShowId = resolveShowIdForCop(location.href, active);
    if (prevShowId && currShowId && prevShowId === currShowId) {
      if (IS_MAX) await restoreArmedShuffleSession();
    }
    return;
  }

  if (maxWatchUrlsRepresentSameEpisode(prevUrl, location.href, showHint)) {
    console.log('[Shufflr] URL format changed for same episode — restoring armed UI');
    if (IS_MAX) await restoreArmedShuffleSession();
    return;
  }

  if (await shouldRedirectSingleUuidPromo(prevUrl, location.href, active, showHint)) {
    if (isAdPlaying()) return;
    console.log('[Shufflr] Single-UUID promo/trailer navigation while armed — shuffling instead');
    await handleShufflrNextEpisode('single-uuid-promo');
    return;
  }
}

async function savePlaylistShuffleState(playlist, pick, playedByShow, lastPlayedShow, playlistIndex, extraState = {}) {
  if (!isChromeContextValid()) return;
  const watchUrl = buildMaxEpisodeWatchUrl(pick.alternateId, pick.showId);
  const activePayload = {
    armed: true,
    playlistName: playlist.name || '',
    playlistIndex,
    shows: [...(playlist.shows || [])],
    episodes: [...(playlist.episodes || [])],
    selectedService: 'max',
    currentEpisode: {
      showId: pick.showId,
      showName: pick.showName,
      posterPath: pick.posterPath || null,
      seasonNum: pick.seasonNum,
      episode_number: pick.episode_number,
      name: pick.name,
      id: pick.id,
      alternateId: pick.alternateId,
    },
    currentEpisodeUrl: watchUrl,
    createdAt: Date.now(),
    sessionStartedAt: Date.now(),
    ownerTabId: getShufflrTabId(),
  };
  const episodeState = {
    playedByShow: serializePlayedByShow(playedByShow),
    lastPlayedShow,
    roundPlayedShows: serializeRoundPlayedShows(extraState.roundPlayedShows),
    nextEpisodeIndexByShow: { ...(extraState.nextEpisodeIndexByShow || {}) },
    playlistName: playlist.name || '',
    playlistIndex,
  };

  await chromeStorageLocalSet({
    [SHUFFLR_ACTIVE_PLAYLIST_KEY]: activePayload,
    [SHUFFLR_EPISODE_STATE_KEY]: episodeState,
  });
  console.log('[Shufflr] Saved active playlist + episode state');
}

function getYourShowsDedupeKey(show) {
  if (show?.id != null && show.id !== '' && !MAX_SHOW_UUID_RE.test(String(show.id))) {
    return `id:${show.id}`;
  }
  const maxId = getPlaylistShowMaxId(show);
  if (maxId) return `max:${normalizeMaxId(maxId)}`;
  const nameKey = normalizePlaylistShowMatchName(getPlaylistShowTitle(show));
  if (nameKey) return `name:${nameKey}`;
  return '';
}

function collectYourShowsFromLists(playlists, standaloneShows = []) {
  const seen = new Set();
  const items = [];
  const addShow = (show) => {
    if (show?.release_date) return;
    if (!showHasMaxId(show)) return;
    const key = getYourShowsDedupeKey(show);
    if (!key || seen.has(key)) return;
    seen.add(key);
    items.push(show);
  };
  for (const playlist of playlists || []) {
    for (const show of playlist?.shows || []) addShow(show);
  }
  for (const show of standaloneShows || []) addShow(show);
  return items;
}

async function getYourShowsFromPlaylists(playlists) {
  const { shows: standaloneShows } = await readYourShowsPreferCloud();
  return collectYourShowsFromLists(playlists, standaloneShows);
}

/**
 * Arm the synthetic Your Shows ALL session (same shape episode-end expects).
 * Does not navigate — caller picks the first episode.
 */
async function armMaxYourShowsAllModeSession(options = {}) {
  if (!isChromeContextValid()) return null;

  const playlists = await readPlaylistsFromStorage();
  let yourShows = await getYourShowsFromPlaylists(playlists);
  if (!yourShows.length) return null;

  // Ensure the launched show is in the ALL pool when provided.
  const ensureMaxId = options.ensureMaxId ? normalizeMaxId(options.ensureMaxId) : null;
  if (ensureMaxId && !yourShows.some(s => normalizeMaxId(getPlaylistShowMaxId(s)) === ensureMaxId)) {
    yourShows = [
      ...yourShows,
      {
        maxId: options.ensureMaxId,
        title: options.ensureTitle || getCurrentShowTitle() || options.ensureMaxId,
        name: options.ensureTitle || getCurrentShowTitle() || options.ensureMaxId,
        url: location.href.split('?')[0],
      },
    ];
  }

  const prior = await getActivePlaylistFromStorage();
  const priorArmed = isArmedPlaylistOwnedByThisTab(prior);
  const createdAt = (priorArmed && getArmedSessionCreatedAt(prior)) || Date.now();
  const syntheticPayload = {
    ...(priorArmed ? prior : {}),
    armed: true,
    playlistName: YOUR_SHOWS_ALL_MODE_NAME,
    playlistIndex: -1,
    shows: yourShows,
    episodes: [],
    selectedService: 'max',
    createdAt,
    sessionStartedAt: Date.now(),
    ownerTabId: getShufflrTabId(),
  };
  if (options.seedLastPlayedShow && options.ensureMaxId) {
    syntheticPayload.lastPlayedShow = normalizeMaxId(options.ensureMaxId);
  } else {
    delete syntheticPayload.lastPlayedShow;
  }

  clearMaxSessionPin();
  await setStandaloneShuffleEnabled(false);
  await chromeStorageLocalSet({ [SHUFFLR_ACTIVE_PLAYLIST_KEY]: syntheticPayload });
  shufflrActive = true;
  armedPlaylistCached = true;
  if (hasShufflrButtonInDom()) {
    updateShuffleUI(YOUR_SHOWS_ALL_MODE_NAME);
  }
  console.log('[Shufflr] armed playlist owned by this tab');
  return syntheticPayload;
}

async function shuffleFromYourShowsAllMode(activePayload, options = {}) {
  if (!isChromeContextValid()) return;
  const syntheticPayload = await armMaxYourShowsAllModeSession({
    seedLastPlayedShow: true,
    ensureMaxId: getCurrentMaxShowUuid()
      || extractMaxShowUuidFromUrl(location.href)
      || extractShowId(location.href),
    ensureTitle: getCurrentShowTitle(),
  });
  if (!syntheticPayload) {
    showToast('No shows with Max ID in Your Shows');
    const status = document.getElementById('shufflr-status');
    if (status) status.textContent = 'NO YOUR SHOWS';
    return;
  }
  await shuffleFromActivePlaylist(syntheticPayload, options);
}

async function shuffleFromActivePlaylist(activePayload, options = {}) {
  if (!isChromeContextValid()) return;
  const navMode = options.mode === 'user' ? 'user' : 'auto';
  if (navMode === 'auto' && isShufflrAutoNavStopped()) return;
  const sourcePlaylist = await resolvePlaylistForShuffle(activePayload);
  const playlistIndex = activePayload.playlistIndex ?? 0;
  const status = document.getElementById('shufflr-status');

  const preparedPlaylist = preparePlaylistForShuffle(sourcePlaylist);
  if (!preparedPlaylist.shows.length) {
    showToast('No shows with Max ID — add shows using +');
    if (status) status.textContent = 'NO MAX SHOWS';
    return;
  }

  const allowedMaxIds = getPlaylistMaxIds(preparedPlaylist);

  if (status) status.textContent = 'SMART SHUFFLE...';
  showToast('Smart Shuffle...');

  await prefetchMissingPlaylistShows(preparedPlaylist.shows);

  let { playedByShow, lastPlayedShow, roundPlayedShows, nextEpisodeIndexByShow } =
    await loadEpisodeStateForPlaylist(preparedPlaylist, playlistIndex);
  const excludedShowIds = new Set();
  let result = null;

  for (let attempt = 0; attempt < preparedPlaylist.shows.length; attempt++) {
    const enriched = await buildEnrichedPlaylistFromCache(preparedPlaylist, excludedShowIds);
    const playlistShows = filterEnrichedToPlaylist(enriched, preparedPlaylist);
    console.log(
      `[Shufflr] Smart Shuffle attempt ${attempt + 1}/${preparedPlaylist.shows.length} — ` +
      `playlist "${preparedPlaylist.name || 'Untitled'}": ` +
      `allowed maxIds [${[...allowedMaxIds].join(', ')}], ` +
      `picking from [${playlistShows.map(show => show.name).join(', ')}]`
    );

    if (!playlistShows.length) break;

    result = smartShuffle(
      playlistShows,
      playedByShow,
      lastPlayedShow,
      allowedMaxIds,
      {
        roundPlayedShows,
        nextEpisodeIndexByShow,
      }
    );

    if (!result?.pick?.alternateId) break;

    const pickedShowId = normalizeMaxId(result.pick.showId);
    const pickedShow = playlistShows.find(show => normalizeMaxId(show.id) === pickedShowId);
    if (!pickedShow?.episodes?.length) {
      console.log(`[Shufflr] Skipping show with no episodes: ${result.pick.showName || pickedShowId}`);
      excludedShowIds.add(pickedShowId);
      result = null;
      continue;
    }

    break;
  }

  if (!result?.pick?.alternateId) {
    showToast('No playable episodes — playlist still armed');
    if (status) {
      status.textContent = preparedPlaylist.name?.toUpperCase().slice(0, 24) || '';
    }
    return;
  }

  const { pick, lastPlayedShow: newLast, roundPlayedShows: newRound, nextEpisodeIndexByShow: newIndexes } = result;
  await savePlaylistShuffleState(
    preparedPlaylist,
    pick,
    playedByShow,
    newLast,
    playlistIndex,
    {
      roundPlayedShows: newRound,
      nextEpisodeIndexByShow: newIndexes,
    }
  );

  const label = (pick.showName || 'Show').slice(0, 24);
  const watchUrl = buildMaxEpisodeWatchUrl(pick.alternateId, pick.showId);
  showToast(`Playing: ${label}`);
  if (status) status.textContent = label.toUpperCase().slice(0, 24);
  shufflrTargetWatchUrl = watchUrl.split('?')[0];
  shufflrTargetEpisodeId = normalizeMaxId(pick.alternateId);
  void refreshMaxAutoNextArmedCache();
  if (isAdPlaying()) return;
  beginShufflrNavigation(pick.alternateId);
  await shufflrNavigateTo(watchUrl, { mode: navMode, source: 'max-playlist-shuffle' });
}

async function armPlaylistFromDropdown(playlistIndex) {
  if (!isChromeContextValid()) return;
  const playlists = await readPlaylistsFromStorage();
  dropdownPlaylists = playlists;
  const playlist = playlists[playlistIndex];
  if (!playlist) return;

  const shows = playlist.shows || [];
  if (!shows.length) {
    showToast('No shows in this playlist');
    return;
  }

  closePlaylistDropdown();

  const preparedPlaylist = preparePlaylistForShuffle(playlist);
  if (!preparedPlaylist.shows.length) {
    showToast('No shows with Max ID — add shows using +');
    return;
  }

  await prefetchMissingPlaylistShows(preparedPlaylist.shows);
  await saveArmedActivePlaylist(preparedPlaylist, playlistIndex);
  await setStandaloneShuffleEnabled(false);

  shufflrActive = true;
  armedPlaylistCached = true;
  const playlistName = preparedPlaylist.name || 'Untitled';
  if (!isChromeContextValid()) return;
  updateShuffleUI(playlistName);

  // Start playback immediately (same path as armed episode-end).
  // On failure, shuffleFromActivePlaylist keeps the armed state and toasts.
  showToast(`Playlist: ${playlistName}`);
  await handleShufflrNextEpisode('dropdown-play');
}

async function playCrunchyrollPlaylistFromDropdown(playlistIndex) {
  if (!isChromeContextValid()) return;

  const playlists = await readPlaylistsFromStorage();
  dropdownPlaylists = playlists;
  const playlist = playlists[playlistIndex];
  if (!playlist) {
    showToast('Playlist not found');
    return;
  }

  const crunchyShows = (playlist.shows || []).filter(s => s.crunchyrollId);
  if (!crunchyShows.length) {
    showToast('No Crunchyroll shows in this playlist — add shows using +');
    return;
  }

  const pickShow = crunchyShows[Math.floor(Math.random() * crunchyShows.length)];
  const showId = String(pickShow.crunchyrollId);
  const seriesUrl = getCrunchyrollSeriesUrlFromPlaylistShow(pickShow);
  if (!seriesUrl) {
    showToast('No Crunchyroll shows in this playlist — add shows using +');
    return;
  }

  closePlaylistDropdown();

  // Same handoff shape as web-app playPlaylist for Crunchyroll (pending first-show auto-start).
  const enriched = crunchyShows.map(s => ({
    id: String(s.crunchyrollId),
    name: s.title || s.name || '',
    type: 'tv',
    episodes: [],
  }));
  const playedByShow = {};
  const roundPlayedShows = serializeRoundPlayedShows(new Set([showId]));
  const handoff = {
    armed: true,
    playlist: enriched,
    playlistName: playlist.name || '',
    playlistIndex,
    shows: [...(playlist.shows || [])],
    episodes: [...(playlist.episodes || [])],
    selectedService: 'crunchyroll',
    currentEpisode: {
      showId,
      showName: pickShow.title || pickShow.name || '',
      seasonNum: 0,
      episode_number: 0,
      name: pickShow.title || pickShow.name || '',
      isMovie: false,
      id: showId,
      alternateId: null,
    },
    currentEpisodeUrl: seriesUrl,
    playedByShow,
    lastPlayedShow: showId,
    roundPlayedShows,
    nextEpisodeIndexByShow: {},
    createdAt: Date.now(),
    sessionStartedAt: Date.now(),
    ownerTabId: getShufflrTabId(),
    pendingFirstShow: true,
    pendingFirstShowId: showId,
  };

  await chromeStorageLocalSet({
    [SHUFFLR_ACTIVE_PLAYLIST_KEY]: handoff,
    [SHUFFLR_EPISODE_STATE_KEY]: {
      playedByShow,
      lastPlayedShow: showId,
      roundPlayedShows,
      nextEpisodeIndexByShow: {},
      playlistName: playlist.name || '',
      playlistIndex,
    },
  });
  console.log('[Shufflr] Crunchyroll dropdown handoff written:', handoff.playlistName);
  console.log('[Shufflr] armed playlist owned by this tab');
  clearCrunchyrollSessionPin();

  shufflrActive = true;
  armedPlaylistCached = true;
  if (!isChromeContextValid()) return;
  updateShuffleUI(playlist.name || 'Playlist');

  const currentId = getCurrentCrunchyrollSeriesId();
  if (currentId && String(currentId) === showId) {
    await completeCrunchyrollSeriesCollectAndPlay(handoff, showId, 'dropdown-play-first');
    return;
  }

  writeCrunchyrollPending(showId, seriesUrl);
  showToast(`Opening: ${(pickShow.title || pickShow.name || '').slice(0, 24)}`);
  console.log(`[Shufflr] Dropdown CR play → ${seriesUrl}`);
  captureFullscreenBeforeShufflrNavigation();
  window.location.href = seriesUrl;
}

/** Tubi dropdown Play — same Phase A handoff + auto-start as web app Play. */
async function playTubiPlaylistFromDropdown(playlistIndex) {
  if (!isChromeContextValid()) return;

  const playlists = await readPlaylistsFromStorage();
  dropdownPlaylists = playlists;
  const playlist = playlists[playlistIndex];
  if (!playlist) {
    showToast('Playlist not found');
    return;
  }

  const tubiShows = (playlist.shows || []).filter(s => s.tubiId);
  if (!tubiShows.length) {
    showToast('No Tubi shows in this playlist — add shows using +');
    return;
  }

  const pickShow = tubiShows[Math.floor(Math.random() * tubiShows.length)];
  const showId = String(pickShow.tubiId);
  const seriesUrl = getTubiSeriesUrlFromPlaylistShow(pickShow)
    || `https://tubitv.com/series/${showId}`;
  if (!seriesUrl) {
    showToast('No Tubi shows in this playlist — add shows using +');
    return;
  }

  closePlaylistDropdown();
  getShufflrTabId();
  clearTubiSessionPin();

  // Same handoff shape as web-app playPlaylist for Tubi; this tab claims ownership immediately.
  const enriched = tubiShows.map(s => ({
    id: String(s.tubiId),
    name: s.title || s.name || '',
    type: 'tv',
    episodes: [],
  }));
  const playedByShow = {};
  const roundPlayedShows = serializeRoundPlayedShows(new Set([showId]));
  const handoff = {
    armed: true,
    playlist: enriched,
    playlistName: playlist.name || '',
    playlistIndex,
    shows: [...(playlist.shows || [])],
    episodes: [...(playlist.episodes || [])],
    selectedService: 'tubi',
    currentEpisode: {
      showId,
      showName: pickShow.title || pickShow.name || '',
      seasonNum: 0,
      episode_number: 0,
      name: pickShow.title || pickShow.name || '',
      isMovie: false,
      id: showId,
      alternateId: null,
    },
    currentEpisodeUrl: seriesUrl,
    playedByShow,
    lastPlayedShow: showId,
    roundPlayedShows,
    nextEpisodeIndexByShow: {},
    createdAt: Date.now(),
    sessionStartedAt: Date.now(),
    ownerTabId: getShufflrTabId(),
    pendingFirstShow: true,
    pendingFirstShowId: showId,
  };

  await chromeStorageLocalSet({
    [SHUFFLR_ACTIVE_PLAYLIST_KEY]: handoff,
    [SHUFFLR_EPISODE_STATE_KEY]: {
      playedByShow,
      lastPlayedShow: showId,
      roundPlayedShows,
      nextEpisodeIndexByShow: {},
      playlistName: playlist.name || '',
      playlistIndex,
    },
  });
  console.log('[Shufflr] Tubi dropdown handoff written:', handoff.playlistName);
  console.log('[Shufflr] armed playlist owned by this tab');

  shufflrActive = true;
  armedPlaylistCached = true;
  if (!isChromeContextValid()) return;
  updateTubiShuffleUI(playlist.name || 'Playlist');

  const settings = await readShuffleSettings();
  orderedEpisodesCached = !!settings.orderedEpisodes;

  // Ordered Episodes: land on series page and press Tubi's own Play/resume (no episode collect).
  if (settings.orderedEpisodes) {
    markTubiOrderedAutoplayPending(showId);
    setTubiActiveShuffleSeriesId(showId);
    const currentId = getCurrentTubiSeriesId();
    if (isTubiSeriesPage() && currentId && String(currentId) === showId) {
      await maybeAutoClickTubiSeriesPlayOrResume();
      return;
    }
    showToast(`Opening: ${(pickShow.title || pickShow.name || '').slice(0, 24)}`);
    console.log(`[Shufflr] Dropdown Tubi ordered play → ${seriesUrl}`);
    await shufflrNavigateTo(seriesUrl, {
      mode: 'user',
      source: 'tubi-dropdown-ordered-play',
      beforeNavigate: () => captureFullscreenBeforeShufflrNavigation(),
    });
    return;
  }

  // Already on this show's series page — collect/pick/navigate in place (Phase A path).
  const currentId = getCurrentTubiSeriesId();
  if (isTubiSeriesPage() && currentId && String(currentId) === showId) {
    await completeTubiSeriesCollectAndPlay(handoff, showId, 'dropdown-play-first');
    return;
  }

  // Otherwise hop to the series page; restore + pending-collect auto-starts (same as web Play).
  showToast(`Opening: ${(pickShow.title || pickShow.name || '').slice(0, 24)}`);
  console.log(`[Shufflr] Dropdown Tubi play → ${seriesUrl}`);
  setTubiActiveShuffleSeriesId(showId);
  await shufflrNavigateTo(seriesUrl, {
    mode: 'user',
    source: 'tubi-dropdown-play',
    beforeNavigate: () => captureFullscreenBeforeShufflrNavigation(),
  });
}

async function playPlaylistFromDropdown(playlistIndex) {
  if (!isChromeContextValid()) return;

  const session = await getStoredAuthSession();
  if (!session?.userId || !session?.accessToken) {
    showToast('You must sign in to use this feature.');
    return;
  }

  if (IS_TUBI) {
    await playTubiPlaylistFromDropdown(playlistIndex);
    return;
  }

  if (isCrunchyroll) {
    await playCrunchyrollPlaylistFromDropdown(playlistIndex);
    return;
  }

  await armPlaylistFromDropdown(playlistIndex);
}

function isShufflrPlayerPage() {
  const href = location.href;
  return href.includes('/video/') || href.includes('/play/') || href.includes('/show/');
}

function tryInjectButton() {
  if (!isChromeContextValid()) return Promise.resolve(false);
  if (document.getElementById('shufflr-wrap')) {
    const video = document.querySelector('video');
    if (video && IS_MAX) attachVideoListeners(video);
    if (isCrunchyrollWatchPage() || isCrunchyrollSeriesPage()) {
      restoreCrunchyrollShuffleSession();
    }
    return IS_MAX ? fullyRestoreArmedShuffleSessionAfterInject() : Promise.resolve(true);
  }
  const isVideoPage = location.href.includes('/video/') || location.href.includes('/play/');
  const isShowPage = location.href.includes('/show/');
  const isCrunchyrollPage = isCrunchyroll && (isCrunchyrollWatchPage() || isCrunchyrollSeriesPage());
  if (!isVideoPage && !isShowPage && !isCrunchyrollPage) return Promise.resolve(false);

  if (isCrunchyrollPage) {
    injectShufflrButton(null);
    return Promise.resolve(true);
  }

  if (isShowPage) {
    saveShowPageUrl(location.href);
    injectShufflrButton(null);
    return IS_MAX ? fullyRestoreArmedShuffleSessionAfterInject() : Promise.resolve(false);
  }

  // Save show page from referrer if we don't have it yet
  if (!knownShowPageUrl && document.referrer.includes('/show/')) {
    saveShowPageUrl(document.referrer);
    console.log(`[Shufflr] Got show page from referrer: ${knownShowPageUrl}`);
  }
  const video = document.querySelector('video');
  if (!video) {
    return new Promise(resolve => {
      setTimeout(() => {
        if (!isChromeContextValid()) {
          resolve(false);
          return;
        }
        tryInjectButton().then(resolve);
      }, 1500);
    });
  }
  injectShufflrButton(video);
  prefetchEpisodeList();
  return IS_MAX ? fullyRestoreArmedShuffleSessionAfterInject() : Promise.resolve(false);
}

async function recoverShufflrUI(reason) {
  if (!isChromeContextValid()) return;
  if (uiRecoveryInProgress) return;
  const now = Date.now();
  if (now - lastUiRecoveryAt < UI_RECOVERY_COOLDOWN_MS) return;

  uiRecoveryInProgress = true;
  lastUiRecoveryAt = now;

  try {
    console.log(`[Shufflr] Watchdog: ${reason} — re-injecting UI`);

    if (!isShufflrPlayerPage()) return;

    hasInjectedButton = false;

    const isVideoPage = location.href.includes('/video/') || location.href.includes('/play/');
    const isShowPage = location.href.includes('/show/');

    if (isShowPage) {
      saveShowPageUrl(location.href);
      injectShufflrButton(null);
      if (IS_MAX) await fullyRestoreArmedShuffleSessionAfterInject();
      return;
    }

    const video = document.querySelector('video');
    if (video) {
      injectShufflrButton(video);
      prefetchEpisodeList();
      if (IS_MAX) await fullyRestoreArmedShuffleSessionAfterInject();
      scheduleVideoListenerRestore(500);
      return;
    }

    setTimeout(() => {
      if (!isChromeContextValid()) return;
      tryInjectButton().then(() => {
        if (IS_MAX) {
          fullyRestoreArmedShuffleSessionAfterInject().catch(err => {
            console.error('[Shufflr] post-inject restore error:', err);
          });
        }
        scheduleVideoListenerRestore(500);
      });
    }, 500);
  } catch (err) {
    console.error('[Shufflr] recoverShufflrUI error:', err);
  } finally {
    uiRecoveryInProgress = false;
  }
}

async function resetShuffleState(options = {}) {
  if (!isChromeContextValid()) return;
  const { clearStorage = true } = options;
  shufflrActive = false;
  armedPlaylistCached = false;
  toggleShuffleInProgress = false;
  clearMaxSessionPin();
  cancelUiRecoveryGraceTimer();
  try {
    if (clearStorage) await clearActivePlaylist();
  } catch (err) {
    console.error('[Shufflr] resetShuffleState storage error:', err);
  }
  if (!isChromeContextValid()) return;
  updateShuffleUI('');
  closePlaylistDropdown();
}

function runShuffleWatchdog() {
  if (!isChromeContextValid()) {
    handleExtensionContextInvalidated();
    return;
  }
  runShuffleWatchdogAsync().catch(err => {
    if (isExtensionContextInvalidatedError(err)) {
      handleExtensionContextInvalidated();
      return;
    }
    console.error('[Shufflr] Watchdog error:', err);
  });
}

async function runShuffleWatchdogAsync() {
  if (!isChromeContextValid()) return;
  try {
    const active = await getActivePlaylistFromStorage();

    // Crunchyroll: only the owning tab treats storage as armed.
    if (isCrunchyroll) {
      const participates = isArmedPlaylistOwnedByThisTab(active);
      armedPlaylistCached = participates;
      const singleShow = isCrunchyrollShuffleActive();
      const maintainSession = shufflrActive || participates || singleShow;
      if (!maintainSession) {
        cancelUiRecoveryGraceTimer();
        return;
      }
      if (!participates && !singleShow) {
        shufflrActive = false;
        armedPlaylistCached = false;
        if (hasShufflrButtonInDom()) updateShuffleUI('');
        cancelUiRecoveryGraceTimer();
        return;
      }
      if (participates && !shufflrActive) {
        shufflrActive = true;
      }
      if (!isCrunchyrollWatchPage() && !isCrunchyrollSeriesPage()) return;
      if (hasShufflrButtonInDom()) {
        cancelUiRecoveryGraceTimer();
        return;
      }
      scheduleUiRecoveryAfterGrace('button still missing after grace period');
      return;
    }

    // Max: only the owning tab treats storage as armed (standalone uses shufflrActive).
    const participates = isArmedPlaylistOwnedByThisTab(active);
    armedPlaylistCached = participates;
    const maintainSession = shufflrActive || participates;
    if (!maintainSession) {
      cancelUiRecoveryGraceTimer();
      return;
    }

    if (participates && !shufflrActive) {
      shufflrActive = true;
    }

    if (!isShufflrPlayerPage()) return;

    if (hasShufflrButtonInDom()) {
      cancelUiRecoveryGraceTimer();

      const isVideoPage = location.href.includes('/video/') || location.href.includes('/play/');
      if (isVideoPage) {
        const video = document.querySelector('video');
        if (video) attachVideoListeners(video);
      }

      if (IS_MAX && shufflrActive && participates) {
        await restoreArmedShuffleSession();
      }
      return;
    }

    scheduleUiRecoveryAfterGrace('button still missing after grace period');
  } catch (err) {
    if (isExtensionContextInvalidatedError(err)) {
      handleExtensionContextInvalidated();
      return;
    }
    throw err;
  }
}

function startShuffleWatchdog() {
  if (!isChromeContextValid()) return;
  if (shuffleWatchdogTimer) return;
  shuffleWatchdogTimer = setInterval(() => {
    if (!isChromeContextValid()) {
      clearInterval(shuffleWatchdogTimer);
      shuffleWatchdogTimer = null;
      return;
    }
    runShuffleWatchdog();
  }, 2000);
}

function teardownShufflrButtonAutoHide() {
  if (shufflrAutoHideTimer) {
    clearTimeout(shufflrAutoHideTimer);
    shufflrAutoHideTimer = null;
  }
  const group = document.getElementById('shufflr-button-group');
  if (group && shufflrAutoHideEnterHandler) {
    group.removeEventListener('mouseenter', shufflrAutoHideEnterHandler);
    group.removeEventListener('mouseleave', shufflrAutoHideLeaveHandler);
  }
  if (shufflrAutoHideMouseMoveHandler) {
    document.removeEventListener('mousemove', shufflrAutoHideMouseMoveHandler);
  }
  shufflrButtonHovered = false;
  shufflrAutoHideEnterHandler = null;
  shufflrAutoHideLeaveHandler = null;
  shufflrAutoHideMouseMoveHandler = null;
}

function scheduleShufflrButtonHide() {
  if (shufflrAutoHideTimer) {
    clearTimeout(shufflrAutoHideTimer);
    shufflrAutoHideTimer = null;
  }
  if (shufflrButtonHovered) return;
  if (document.getElementById('shufflr-playlist-dropdown')?.classList.contains('open')) return;

  const hideAt = Math.max(
    shufflrButtonFirstShownAt + SHUFFLR_AUTO_HIDE_MS,
    shufflrButtonLastActivityAt + SHUFFLR_AUTO_HIDE_MS
  );
  const delayMs = Math.max(0, hideAt - Date.now());

  shufflrAutoHideTimer = setTimeout(() => {
    shufflrAutoHideTimer = null;
    if (shufflrButtonHovered) return;
    if (document.getElementById('shufflr-playlist-dropdown')?.classList.contains('open')) return;
    const group = document.getElementById('shufflr-button-group');
    if (!group) return;
    group.classList.remove('shufflr-visible');
    group.classList.add('shufflr-hidden');
  }, delayMs);
}

// Fades the Shufflr button group after 5s of mouse inactivity and restores it on mousemove or hover.
function initShufflrButtonAutoHide() {
  teardownShufflrButtonAutoHide();

  const group = document.getElementById('shufflr-button-group');
  if (!group) return;

  const now = Date.now();
  shufflrButtonFirstShownAt = now;
  shufflrButtonLastActivityAt = now;
  group.classList.add('shufflr-visible');
  group.classList.remove('shufflr-hidden');

  shufflrAutoHideEnterHandler = () => {
    shufflrButtonHovered = true;
    if (shufflrAutoHideTimer) {
      clearTimeout(shufflrAutoHideTimer);
      shufflrAutoHideTimer = null;
    }
    group.classList.remove('shufflr-hidden');
    group.classList.add('shufflr-visible');
  };

  shufflrAutoHideLeaveHandler = () => {
    shufflrButtonHovered = false;
    scheduleShufflrButtonHide();
  };

  shufflrAutoHideMouseMoveHandler = () => {
    shufflrButtonLastActivityAt = Date.now();
    group.classList.remove('shufflr-hidden');
    group.classList.add('shufflr-visible');
    scheduleShufflrButtonHide();
  };

  group.addEventListener('mouseenter', shufflrAutoHideEnterHandler);
  group.addEventListener('mouseleave', shufflrAutoHideLeaveHandler);
  document.addEventListener('mousemove', shufflrAutoHideMouseMoveHandler, { passive: true });

  scheduleShufflrButtonHide();
}

function removeShufflrUI() {
  teardownShufflrButtonAutoHide();
  document.getElementById('shufflr-wrap')?.remove();
  document.getElementById('shufflr-toast')?.remove();
  hasInjectedButton = false;
}

function onShuffleBtnClick(event) {
  if (!chrome.runtime?.id) return;
  event.preventDefault();
  event.stopPropagation();
  // Tubi rebuild step 2: single-show shuffle toggle.
  if (IS_TUBI && (isTubiSeriesPage() || isTubiEpisodePage())) {
    if (shufflrActive || isTubiShuffleActive()) {
      void stopTubiShuffle();
      return;
    }
    void startTubiShuffle();
    return;
  }
  if (isCrunchyroll && (isCrunchyrollWatchPage() || isCrunchyrollSeriesPage())) {
    if (shufflrActive) {
      void stopCrunchyrollShuffle();
      return;
    }
    void startCrunchyrollShuffle();
    return;
  }
  toggleShuffle();
}

function onPlaylistDropdownClick(event) {
  event.stopPropagation();

  const toggleInput = event.target.closest('[data-pl-action="toggle-ordered"]');
  if (toggleInput) {
    event.stopPropagation();
    return;
  }

  const createBtn = event.target.closest('[data-pl-action="create"]');
  if (createBtn) {
    event.preventDefault();
    openCreatePlaylistForm();
    return;
  }

  const confirmBtn = event.target.closest('.shufflr-pl-create-confirm');
  if (confirmBtn) {
    event.preventDefault();
    submitCreatePlaylistForm();
    return;
  }

  const yourShowsBtn = event.target.closest('[data-pl-action="add-your-shows"]');
  if (yourShowsBtn) {
    event.preventDefault();
    addCurrentShowToYourShows();
    return;
  }

  const addBtn = event.target.closest('.shufflr-pl-add-btn');
  if (addBtn) {
    event.preventDefault();
    addCurrentShowToPlaylist(Number(addBtn.dataset.plIndex));
    return;
  }

  const toggleShows = event.target.closest('.shufflr-pl-shows-toggle');
  if (toggleShows) {
    event.preventDefault();
    event.stopPropagation();
    const index = Number(toggleShows.dataset.plIndex);
    if (Number.isFinite(index)) togglePlaylistShowsList(index);
    return;
  }

  const shuffleRow = event.target.closest('[data-pl-action="shuffle"]');
  if (!shuffleRow) return;
  event.preventDefault();
  const index = Number(shuffleRow.dataset.plIndex);
  const playlist = dropdownPlaylists[index];
  if (playlist) playPlaylistFromDropdown(index);
}

function onPlaylistDropdownChange(event) {
  event.stopPropagation();
  const toggleInput = event.target.closest('[data-pl-action="toggle-ordered"]');
  if (!toggleInput) return;
  setOrderedEpisodesEnabled(toggleInput.checked);
}

function onPlaylistDropdownKeydown(event) {
  if (event.key !== 'Enter') return;
  const input = event.target.closest('#shufflr-pl-create-input');
  if (!input) return;
  event.preventDefault();
  event.stopPropagation();
  submitCreatePlaylistForm();
}

function bindShufflrButtonHandlers() {
  const shuffleBtn = document.getElementById('shufflr-btn');
  const playlistToggle = document.getElementById('shufflr-playlist-toggle');
  const dropdown = document.getElementById('shufflr-playlist-dropdown');

  if (shuffleBtn) {
    shuffleBtn.removeEventListener('click', onShuffleBtnClick);
    shuffleBtn.addEventListener('click', onShuffleBtnClick);
  }

  if (playlistToggle) {
    playlistToggle.removeEventListener('click', togglePlaylistDropdown);
    playlistToggle.addEventListener('click', togglePlaylistDropdown);
  }

  if (dropdown) {
    dropdown.removeEventListener('click', onPlaylistDropdownClick);
    dropdown.addEventListener('click', onPlaylistDropdownClick);
    dropdown.removeEventListener('change', onPlaylistDropdownChange);
    dropdown.addEventListener('change', onPlaylistDropdownChange);
    dropdown.removeEventListener('keydown', onPlaylistDropdownKeydown);
    dropdown.addEventListener('keydown', onPlaylistDropdownKeydown);
  }

  if (!documentClickBound) {
    document.addEventListener('click', closePlaylistDropdown);
    documentClickBound = true;
  }
}

function teardownShufflrButtonHandlers() {
  const shuffleBtn = document.getElementById('shufflr-btn');
  const playlistToggle = document.getElementById('shufflr-playlist-toggle');
  const dropdown = document.getElementById('shufflr-playlist-dropdown');

  if (shuffleBtn) {
    shuffleBtn.removeEventListener('click', onShuffleBtnClick);
  }
  if (playlistToggle) {
    playlistToggle.removeEventListener('click', togglePlaylistDropdown);
  }
  if (dropdown) {
    dropdown.removeEventListener('click', onPlaylistDropdownClick);
    dropdown.removeEventListener('change', onPlaylistDropdownChange);
    dropdown.removeEventListener('keydown', onPlaylistDropdownKeydown);
  }
  if (documentClickBound) {
    document.removeEventListener('click', closePlaylistDropdown);
    documentClickBound = false;
  }
}

function injectShufflrStyles() {
  if (document.getElementById('shufflr-styles')) return;

  const style = document.createElement('style');
  style.id = 'shufflr-styles';
  style.textContent = `
    #shufflr-wrap {
      position: fixed;
      bottom: 90px;
      right: 96px;
      z-index: 2147483647 !important;
      padding-bottom: 15px;
      box-sizing: border-box;
      user-select: none;
      pointer-events: none;
    }
    #shufflr-button-group {
      display: inline-flex;
      flex-direction: row;
      align-items: flex-end;
      gap: 8px;
      position: relative;
      pointer-events: auto;
      opacity: 1;
      transition: opacity 0.4s ease;
    }
    #shufflr-button-group.shufflr-visible {
      opacity: 1;
      pointer-events: auto;
    }
    #shufflr-button-group.shufflr-hidden {
      opacity: 0;
      pointer-events: none;
    }
    #shufflr-split,
    #shufflr-status {
      pointer-events: none;
    }
    #shufflr-btn,
    #shufflr-playlist-toggle,
    #shufflr-playlist-dropdown,
    .shufflr-pl-row,
    .shufflr-pl-action-btn,
    .shufflr-pl-shows-toggle,
    .shufflr-pl-add-btn,
    .shufflr-pl-your-shows-btn,
    .shufflr-pl-create-btn,
    .shufflr-pl-create-confirm,
    .shufflr-pl-toggle-row,
    .shufflr-pl-create-input {
      pointer-events: auto;
    }
    #shufflr-split {
      display: flex;
      align-items: stretch;
      flex-shrink: 0;
    }
    #shufflr-btn {
      cursor: pointer;
      flex: 1;
    }
    #shufflr-inner {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 100%;
      box-sizing: border-box;
      background: rgba(15, 15, 20, 0.75);
      border: 2px solid #1a6bff;
      border-right: 1px solid rgba(26,107,255,0.35);
      border-radius: 12px 0 0 12px;
      padding: 10px 16px;
      color: #1a6bff;
      font-family: monospace;
      font-size: 11px;
      letter-spacing: 1.5px;
      box-shadow: 0 0 20px rgba(26,107,255,0.4);
      transition: all 0.2s ease;
      backdrop-filter: blur(8px);
    }
    #shufflr-btn:hover #shufflr-inner {
      background: #1a6bff;
      color: #000;
      box-shadow: 0 0 30px rgba(26,107,255,0.7);
      transform: scale(1.04);
      transform-origin: center right;
    }
    #shufflr-btn.active #shufflr-inner {
      background: rgba(0, 195, 255, 1);
      color: #000;
      opacity: 0.90;
      box-shadow: 0 0 30px rgba(35,168,224,0.8);
      animation: shufflr-pulse 2s infinite;
    }
    #shufflr-btn.active #shufflr-icon {
      animation: shufflr-spin 1.5s linear infinite;
    }
    #shufflr-playlist-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 34px;
      padding: 0 10px;
      opacity: 0.90;
      background: rgba(15, 15, 20, 0.75);
      border: 2px solid #1a6bff;
      border-left: none;
      border-radius: 0 12px 12px 0;
      color: #1a6bff;
      font-family: monospace;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      box-shadow: 0 0 20px rgba(26,107,255,0.4);
      transition: all 0.2s ease;
      backdrop-filter: blur(8px);
    }
    #shufflr-playlist-toggle:hover,
    #shufflr-playlist-toggle.open {
      background: #1a6bff;
      color: #000;
      box-shadow: 0 0 30px rgba(26,107,255,0.7);
    }
    #shufflr-playlist-dropdown {
      display: none;
      flex-direction: column;
      position: absolute;
      right: 0;
      bottom: calc(100% + 8px);
      min-width: 230px;
      max-width: 280px;
      max-height: 320px;
      overflow: hidden;
      background: rgba(15, 15, 20, 0.75);
      border: 2px solid rgba(0, 140, 255, 0.5);
      border-radius: 10px;
      padding: 0;
      box-shadow: 0 0 24px rgba(26,107,255,0.35);
      backdrop-filter: blur(10px);
    }
    #shufflr-playlist-dropdown.open {
      display: flex;
    }
    .shufflr-pl-dropdown-top {
      flex-shrink: 0;
      padding: 6px;
      border-bottom: 1px solid rgba(26,107,255,0.25);
    }
    .shufflr-pl-dropdown-scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 6px;
    }
    .shufflr-pl-dropdown-footer {
      flex-shrink: 0;
      padding: 6px;
      border-top: 1px solid rgba(26,107,255,0.25);
    }
    .shufflr-pl-your-shows-btn {
      width: 100%;
      padding: 10px 12px;
      background: transparent;
      border: 1px solid #1a6bff;
      border-radius: 7px;
      color: #ffffff;
      font-family: monospace;
      font-size: 10px;
      letter-spacing: 0.5px;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }
    .shufflr-pl-your-shows-btn:hover {
      background: rgba(26,107,255,0.18);
    }
    .shufflr-pl-section {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .shufflr-pl-section-header {
      color: #ffffff;
      font-family: monospace;
      font-size: 8px;
      letter-spacing: 1.5px;
      padding: 6px 10px 4px;
      opacity: 0.9;
    }
    .shufflr-pl-settings {
      padding: 2px 4px 6px;
    }
    .shufflr-pl-toggle-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      width: 100%;
      padding: 8px 10px;
      border-radius: 7px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .shufflr-pl-toggle-row:hover {
      background: rgba(26,107,255,0.12);
    }
    .shufflr-pl-toggle-input {
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      margin-top: 1px;
      accent-color: #1a6bff;
      cursor: pointer;
    }
    .shufflr-pl-toggle-label {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .shufflr-pl-toggle-title {
      color: #fff;
      font-family: monospace;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .shufflr-pl-toggle-hint {
      color: #ffffff;
      font-family: monospace;
      font-size: 9px;
      letter-spacing: 0.3px;
      line-height: 1.35;
    }
    .shufflr-pl-divider {
      height: 1px;
      margin: 6px 4px;
      background: rgba(26,107,255,0.25);
    }
    .shufflr-pl-row-wrap {
      display: flex;
      flex-direction: column;
      width: 100%;
    }
    .shufflr-pl-row {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 3px;
      width: 100%;
      padding: 10px 12px;
      background: transparent;
      border: none;
      border-radius: 7px;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s ease;
      box-sizing: border-box;
    }
    .shufflr-pl-row.shufflr-pl-row-header {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding: 0 6px 0 0;
      cursor: default;
    }
    .shufflr-pl-row-header .shufflr-pl-name {
      flex: 1;
      min-width: 0;
      padding: 10px 0 10px 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .shufflr-pl-row-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }
    .shufflr-pl-action-btn,
    .shufflr-pl-shows-toggle,
    .shufflr-pl-add-btn {
      flex-shrink: 0;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      outline: none;
      border-radius: 0;
      color: #23A8E0;
      font-family: monospace;
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
      transition: color 0.2s ease, filter 0.2s ease, text-shadow 0.2s ease;
      padding: 0;
      box-shadow: none;
    }
    .shufflr-pl-add-btn {
      font-size: 18px;
      font-weight: 400;
    }
    .shufflr-pl-action-btn:hover,
    .shufflr-pl-shows-toggle:hover,
    .shufflr-pl-add-btn:hover {
      background: transparent;
      border: none;
      color: #23A8E0;
      text-shadow: 0 0 10px rgba(35, 168, 224, 0.85);
      filter: drop-shadow(0 0 6px rgba(35, 168, 224, 0.65));
    }
    .shufflr-pl-row:hover,
    .shufflr-pl-row-header.open {
      background: rgba(26,107,255,0.18);
    }
    .shufflr-pl-shows-list {
      max-height: 120px;
      overflow-y: auto;
      margin: 0 4px 6px;
      padding: 2px 0 4px 8px;
    }
    .shufflr-pl-shows-list[hidden] {
      display: none !important;
    }
    .shufflr-pl-show-item {
      padding: 4px 8px;
      color: #ffffff;
      font-family: monospace;
      font-size: 10px;
      letter-spacing: 0.3px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .shufflr-pl-show-item:last-child {
      border-bottom: none;
    }
    .shufflr-pl-row:disabled,
    .shufflr-pl-row.shufflr-pl-empty {
      cursor: default;
      opacity: 0.65;
    }
    .shufflr-pl-row:disabled:hover,
    .shufflr-pl-row.shufflr-pl-empty:hover {
      background: transparent;
    }
    .shufflr-pl-name {
      color: #fff;
      font-family: monospace;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .shufflr-pl-count {
      color: #1a6bff;
      font-family: monospace;
      font-size: 9px;
      letter-spacing: 1px;
      opacity: 0.85;
    }
    .shufflr-pl-add-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      padding: 8px 10px;
      border-radius: 7px;
      transition: background 0.15s ease;
    }
    .shufflr-pl-add-row:hover {
      background: rgba(26,107,255,0.12);
    }
    .shufflr-pl-add-name {
      flex: 1;
      min-width: 0;
      color: #fff;
      font-family: monospace;
      font-size: 11px;
      letter-spacing: 0.5px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .shufflr-pl-create-btn {
      width: 100%;
      margin-top: 0;
      padding: 10px 12px;
      background: transparent;
      border: 1px dashed rgba(26,107,255,0.45);
      border-radius: 7px;
      color: #ffffff;
      font-family: monospace;
      font-size: 10px;
      letter-spacing: 0.5px;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }
    .shufflr-pl-create-btn:hover {
      background: rgba(26,107,255,0.18);
    }
    .shufflr-pl-create-form {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
    }
    .shufflr-pl-create-form[hidden] {
      display: none !important;
    }
    .shufflr-pl-create-input {
      flex: 1;
      min-width: 0;
      padding: 8px 10px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(26,107,255,0.45);
      border-radius: 6px;
      color: #fff;
      font-family: monospace;
      font-size: 11px;
      outline: none;
    }
    .shufflr-pl-create-input:focus {
      border-color: #1a6bff;
      box-shadow: 0 0 0 2px rgba(26,107,255,0.2);
    }
    .shufflr-pl-create-input::placeholder {
      color: rgba(255,255,255,0.35);
    }
    .shufflr-pl-create-confirm {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1a6bff;
      border: none;
      border-radius: 6px;
      color: #000;
      font-family: monospace;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .shufflr-pl-create-confirm:hover {
      box-shadow: 0 0 12px rgba(26,107,255,0.6);
    }
    #shufflr-status {
      font-size: 11px;
      color: #ffffff;
      text-align: right;
      margin: 0;
      letter-spacing: 1px;
      min-height: 10px;
      font-family: monospace;
      opacity: 0.8;
      white-space: nowrap;
      flex-shrink: 0;
      line-height: 1;
      padding-bottom: 2px;
    }
    @keyframes shufflr-pulse {
      0%, 100% { box-shadow: 0 0 30px rgba(35,168,224,0.8); }
      50% { box-shadow: 0 0 50px rgba(35,168,224,1); }
    }
    @keyframes shufflr-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    #shufflr-toast {
      position: fixed;
      bottom: 170px;
      right: 24px;
      z-index: 999999;
      background: rgba(0,0,0,0.9);
      border: 1px solid #1a6bff;
      border-radius: 8px;
      padding: 10px 16px;
      color: #fff;
      font-family: monospace;
      font-size: 11px;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
      pointer-events: none;
      max-width: 240px;
      line-height: 1.6;
    }
    #shufflr-toast.show { opacity: 1; transform: translateY(0); }
    #shufflr-toast.shufflr-toast-interactive {
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: auto;
      padding-right: 10px;
      max-width: 280px;
    }
    .shufflr-toast-message {
      flex: 1;
      min-width: 0;
    }
    .shufflr-toast-dismiss {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      background: transparent;
      border: 1px solid rgba(26,107,255,0.55);
      border-radius: 4px;
      color: #1a6bff;
      font-family: monospace;
      font-size: 12px;
      line-height: 1;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .shufflr-toast-dismiss:hover {
      background: #1a6bff;
      color: #000;
      border-color: #1a6bff;
    }
  `;
  document.head.appendChild(style);
}

function ensureVideoSwapObserver() {
  if (!isChromeContextValid()) return;
  if (window.__shufflrVideoObserver) return;
  window.__shufflrVideoObserver = new MutationObserver(() => {
    if (!isChromeContextValid()) return;
    const video = document.querySelector('video');
    if (video && document.getElementById('shufflr-wrap')) attachVideoListeners(video);
  });
  window.__shufflrVideoObserver.observe(document.body, { childList: true, subtree: true });
}

function injectShufflrButton(video) {
  if (!isChromeContextValid()) return;
  if (document.getElementById('shufflr-wrap')) {
    if (video) attachVideoListeners(video);
    if (IS_MAX) void fullyRestoreArmedShuffleSessionAfterInject();
    else if (isCrunchyroll) restoreCrunchyrollShuffleSession();
    return;
  }

  removeShufflrUI();
  hasInjectedButton = true;

  injectShufflrStyles();

  const wrap = document.createElement('div');
  wrap.id = 'shufflr-wrap';
  wrap.innerHTML = `
    <div id="shufflr-button-group" class="shufflr-visible">
      <div id="shufflr-playlist-dropdown">
        ${renderPlaylistDropdownContent([])}
      </div>
      <div id="shufflr-status"></div>
      <div id="shufflr-split">
        <div id="shufflr-btn">
          <div id="shufflr-inner">
            <svg id="shufflr-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="16 3 21 3 21 8"></polyline>
              <line x1="4" y1="20" x2="21" y2="3"></line>
              <polyline points="21 16 21 21 16 21"></polyline>
              <line x1="15" y1="15" x2="21" y2="21"></line>
            </svg>
            <span id="shufflr-label">SHUFFLR</span>
          </div>
        </div>
        <button type="button" id="shufflr-playlist-toggle" title="Play from playlist" aria-label="Open playlist menu">▴</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  if (!document.getElementById('shufflr-toast')) {
    const toast = document.createElement('div');
    toast.id = 'shufflr-toast';
    document.body.appendChild(toast);
  }

  bindShufflrButtonHandlers();
  wrap.dataset.shufflrBound = '1';
  initShufflrButtonAutoHide();
  startShuffleWatchdog();
  populatePlaylistDropdown();

  if (video) {
    attachVideoListeners(video);
    ensureVideoSwapObserver();
  }

  installFullscreenListener();
  installAutoFullscreenRestore();
  if (document.fullscreenElement) {
    ensureShufflrButtonForFullscreen();
  }

  if (IS_MAX) void fullyRestoreArmedShuffleSessionAfterInject();
  else if (isCrunchyroll) restoreCrunchyrollShuffleSession();
}

function attachVideoListeners(video) {
  if (!video) return;
  video.removeEventListener('ended', onEpisodeEnded);
  video.addEventListener('ended', onEpisodeEnded);
  video.removeEventListener('timeupdate', onTimeUpdate);
  video.addEventListener('timeupdate', onTimeUpdate);
  video.removeEventListener('playing', onVideoPlaying);
  video.addEventListener('playing', onVideoPlaying);
  window.__shufflrAttachedVideo = video;
  installTimeupdateWatcher();
  suppressMaxAutoNext();
  if (!video.paused) {
    showFullscreenRestorePrompt();
  }
}

const MAX_AUTO_NEXT_OVERLAY_SELECTORS = [
  '[class*="NextEpisode"]',
  '[class*="next-episode"]',
  '[class*="autoplay"]',
  '[data-testid*="next"]',
  'button[class*="next"]',
].join(', ');

function getShufflrTargetFromActive(active) {
  if (!isArmedPlaylistOwnedByThisTab(active)) {
    return { watchUrl: null, episodeId: null, showHint: null };
  }

  const showHint = getShowMaxIdHintFromActive(active);
  let watchUrl = active.currentEpisodeUrl || null;
  if (!watchUrl && active.currentEpisode?.alternateId) {
    watchUrl = buildMaxEpisodeWatchUrl(active.currentEpisode.alternateId, active.currentEpisode.showId);
  }

  return {
    watchUrl: watchUrl ? watchUrl.split('?')[0] : null,
    episodeId: active.currentEpisode?.alternateId
      ? normalizeMaxId(active.currentEpisode.alternateId)
      : null,
    showHint,
  };
}

function findMaxAutoNextDismissButton(container) {
  const selectorMatches = [
    'button[class*="cancel"]',
    'button[class*="Cancel"]',
    'button[class*="dismiss"]',
    'button[class*="Dismiss"]',
    'button[class*="close"]',
    'button[class*="Close"]',
    'button[data-testid*="cancel"]',
    'button[data-testid*="dismiss"]',
    'button[data-testid*="close"]',
    '[role="button"][class*="cancel"]',
    '[role="button"][class*="dismiss"]',
    '[role="button"][class*="close"]',
  ];

  for (const selector of selectorMatches) {
    try {
      const btn = container.querySelector(selector);
      if (btn) return btn;
    } catch {}
  }

  const clickables = container.querySelectorAll('button, [role="button"]');
  for (const btn of clickables) {
    const text = `${btn.textContent || ''} ${btn.getAttribute('aria-label') || ''}`.toLowerCase();
    if (
      text.includes('cancel')
      || text.includes('dismiss')
      || text.includes('close')
      || text.includes('stay')
      || text.includes('not now')
      || text.trim() === '×'
      || text.trim() === 'x'
    ) {
      return btn;
    }
  }

  return null;
}

function refreshMaxAutoNextArmedCache() {
  if (!isChromeContextValid()) {
    maxAutoNextArmedCache = false;
    return Promise.resolve(false);
  }
  return getActivePlaylistFromStorage().then(active => {
    maxAutoNextArmedCache = isArmedPlaylistOwnedByThisTab(active);
    if (maxAutoNextArmedCache) {
      const target = getShufflrTargetFromActive(active);
      shufflrTargetWatchUrl = target.watchUrl;
      shufflrTargetEpisodeId = target.episodeId;
      shufflrTargetShowHint = target.showHint;
    } else {
      shufflrTargetWatchUrl = null;
      shufflrTargetEpisodeId = null;
      shufflrTargetShowHint = null;
    }
    return maxAutoNextArmedCache;
  }).catch(err => {
    if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
    maxAutoNextArmedCache = false;
    return false;
  });
}

function updateShufflrAboutToNavigateFromVideo(video) {
  if (isAdPlaying()) {
    shufflrAboutToNavigate = false;
    return;
  }
  if (orderedEpisodesCached) {
    shufflrAboutToNavigate = false;
    return;
  }
  if (!video || video.duration <= 0 || video.paused) return;
  if (!shufflrActive && !armedPlaylistCached) {
    shufflrAboutToNavigate = false;
    return;
  }
  const remaining = video.duration - video.currentTime;
  shufflrAboutToNavigate = remaining <= SHUFFLR_ABOUT_TO_NAVIGATE_SEC;
}

function suppressMaxAutoNextOverlayAggressive(element) {
  if (isAdPlaying()) return;
  if (!element || element.dataset?.shufflrAutoNextSuppressed) return;
  if (!shufflrAboutToNavigate) return;
  if (!maxAutoNextArmedCache) return;

  const height = element.getBoundingClientRect().height || element.offsetHeight || 0;
  if (height >= 200) return;

  const dismissBtn = findMaxAutoNextDismissButton(element);
  if (dismissBtn) {
    try {
      dismissBtn.click();
    } catch {}
  }

  element.style.display = 'none';
  element.dataset.shufflrAutoNextSuppressed = '1';
}

function suppressMaxAutoNextOverlay(element) {
  if (!isChromeContextValid()) return;
  if (isAdPlaying()) return;
  if (!element || element.dataset?.shufflrAutoNextSuppressed) return;

  getActivePlaylistFromStorage().then(active => {
    maxAutoNextArmedCache = isArmedPlaylistOwnedByThisTab(active);
    if (!maxAutoNextArmedCache) return;

    const target = getShufflrTargetFromActive(active);
    shufflrTargetWatchUrl = target.watchUrl;
    shufflrTargetEpisodeId = target.episodeId;
    shufflrTargetShowHint = target.showHint;

    suppressMaxAutoNextOverlayAggressive(element);
  }).catch(err => {
    if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
  });
}

function pollAndSuppressMaxAutoNextOverlays() {
  if (!isChromeContextValid()) {
    teardownMaxAutoNextSuppression();
    return;
  }
  if (isAdPlaying()) return;
  if (!shufflrAboutToNavigate) return;

  refreshMaxAutoNextArmedCache().then(armed => {
    if (!armed) return;

    try {
      document.querySelectorAll(MAX_AUTO_NEXT_OVERLAY_SELECTORS).forEach(suppressMaxAutoNextOverlayAggressive);
    } catch {}
  });
}

function scanForMaxAutoNextOverlays(root = document.body) {
  if (!root?.querySelectorAll) return;
  if (isAdPlaying()) return;
  if (!shufflrAboutToNavigate) return;

  try {
    if (root.matches?.(MAX_AUTO_NEXT_OVERLAY_SELECTORS)) {
      suppressMaxAutoNextOverlay(root);
    }
    root.querySelectorAll(MAX_AUTO_NEXT_OVERLAY_SELECTORS).forEach(suppressMaxAutoNextOverlay);
  } catch {}
}

function teardownMaxAutoNextSuppression() {
  if (maxAutoNextObserver) {
    maxAutoNextObserver.disconnect();
    maxAutoNextObserver = null;
  }
  if (maxAutoNextPollTimer) {
    clearInterval(maxAutoNextPollTimer);
    maxAutoNextPollTimer = null;
  }
  if (maxAutoNextVisibilityHandler) {
    document.removeEventListener('visibilitychange', maxAutoNextVisibilityHandler, true);
    maxAutoNextVisibilityHandler = null;
  }
  if (maxAutoNextBeforeUnloadHandler) {
    window.removeEventListener('beforeunload', maxAutoNextBeforeUnloadHandler, true);
    maxAutoNextBeforeUnloadHandler = null;
  }
  maxAutoNextArmedCache = false;
  shufflrAboutToNavigate = false;
  shufflrTargetWatchUrl = null;
  shufflrTargetEpisodeId = null;
  shufflrTargetShowHint = null;
}

function suppressMaxAutoNext() {
  if (!isChromeContextValid()) return;

  if (!maxAutoNextObserver) {
    maxAutoNextObserver = new MutationObserver(mutations => {
      if (!isChromeContextValid()) {
        teardownMaxAutoNextSuppression();
        return;
      }

      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          scanForMaxAutoNextOverlays(node);
        });
      }
    });

    maxAutoNextObserver.observe(document.body, { childList: true, subtree: true });

    maxAutoNextVisibilityHandler = (event) => {
      if (!isChromeContextValid()) return;
      if (maxAutoNextArmedCache) event.stopImmediatePropagation();
    };

    maxAutoNextBeforeUnloadHandler = (event) => {
      if (!isChromeContextValid()) return;
      if (maxAutoNextArmedCache) event.stopImmediatePropagation();
    };

    document.addEventListener('visibilitychange', maxAutoNextVisibilityHandler, true);
    window.addEventListener('beforeunload', maxAutoNextBeforeUnloadHandler, true);
  }

  if (!maxAutoNextPollTimer) {
    maxAutoNextPollTimer = setInterval(() => {
      if (!isChromeContextValid()) {
        clearInterval(maxAutoNextPollTimer);
        maxAutoNextPollTimer = null;
        return;
      }
      pollAndSuppressMaxAutoNextOverlays();
    }, 500);
  }

  refreshMaxAutoNextArmedCache();
}

function onVideoPlaying() {
  timeupdateWatcherVideo = null;
  timeupdateWatcherHandler = null;
  installTimeupdateWatcher();
  prefetchEpisodeList();
  showFullscreenRestorePrompt();
  void maybeLogWatchHistoryOnPlay();
  if (isVideoWatchUrl(location.href)) {
    startNowPlayingHeartbeat();
  }
  if (document.fullscreenElement) {
    ensureShufflrButtonForFullscreen();
  }
}

// Logs the current Max show to Supabase watch_history when the user is signed in.
async function getStoredAuthSession() {
  if (!isChromeContextValid()) return null;
  return storageLocalGet(SHUFFLR_SUPABASE_SESSION_KEY);
}

// Refresh the extension's Supabase access token after sleep when it has expired.
async function getValidAuthSession() {
  const session = await getStoredAuthSession();
  if (!session?.accessToken || !session?.userId) return null;

  const expiresAtMs = session.expiresAt ? Number(session.expiresAt) * 1000 : 0;
  const expiringSoon = !expiresAtMs || Date.now() >= expiresAtMs - 60_000;
  if (!expiringSoon) return session;

  const refreshToken = session.refreshToken || session.refresh_token;
  if (!refreshToken) return session;

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok) return null;

    const data = await response.json();
    const updated = {
      userId: session.userId,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    };
    await storageLocalSet(SHUFFLR_SUPABASE_SESSION_KEY, updated);
    return updated;
  } catch (err) {
    console.error('[Shufflr] Supabase session refresh failed:', err);
    return null;
  }
}

function normalizeWatchHistoryShowName(title) {
  if (!title) return '';
  let text = String(title).trim();
  if (!text || text === 'Unknown Show') return '';
  text = text.split('|')[0].trim();
  text = text.replace(/\s*[•·]\s*(HBO Max|Max|Netflix|Hulu|Disney\+|Prime Video).*$/i, '').trim();
  text = text.replace(/\s*-\s*(HBO Max|Max)\s*$/i, '').trim();
  text = text.replace(/\s+on\s+(HBO Max|Max)$/i, '').trim();
  return text;
}

function normalizePosterPathForStorage(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  const tmdbMatch = text.match(/\/t\/p\/(?:original|w\d+)\/(.+)$/);
  if (tmdbMatch?.[1]) return `/${tmdbMatch[1]}`;
  return text.startsWith('/') ? text : text;
}

function findPlaylistShowEntry(playlists, { tmdbId, maxId } = {}) {
  const normMax = maxId ? normalizeMaxId(maxId) : '';
  const normTmdb = tmdbId != null && tmdbId !== '' ? String(tmdbId) : '';

  for (const playlist of playlists || []) {
    for (const show of playlist?.shows || []) {
      const showMaxId = show.maxId || show.maxShowId || show.max_id;
      const showTmdbId = show.id || show.tmdbId;
      const maxMatch = normMax && showMaxId && normalizeMaxId(showMaxId) === normMax;
      const tmdbMatch = normTmdb && showTmdbId && String(showTmdbId) === normTmdb;
      if (maxMatch || tmdbMatch) return show;
    }
  }
  return null;
}

function findPosterPathInPlaylists(playlists, { tmdbId, maxId } = {}) {
  const show = findPlaylistShowEntry(playlists, { tmdbId, maxId });
  if (show) {
    const fromShow = getPlaylistShowPosterPath(show);
    if (fromShow) return normalizePosterPathForStorage(fromShow);
  }

  const normTmdb = tmdbId != null && tmdbId !== '' ? String(tmdbId) : '';
  for (const playlist of playlists || []) {
    for (const ep of playlist?.episodes || []) {
      if (!normTmdb || !ep.showId || String(ep.showId) !== normTmdb) continue;
      if (ep.showPoster) return normalizePosterPathForStorage(ep.showPoster);
    }
  }
  return null;
}

function findPlaylistShowTitleByMaxId(playlists, maxId) {
  const show = findPlaylistShowEntry(playlists, { maxId });
  return show ? getPlaylistShowTitle(show) : null;
}

function findPlaylistShowTitleByIds(playlists, { tmdbId, maxId } = {}) {
  const show = findPlaylistShowEntry(playlists, { tmdbId, maxId });
  return show ? getPlaylistShowTitle(show) : null;
}

function extractShowNameFromCacheEntry(cacheEntry) {
  if (!cacheEntry) return '';
  const direct = cacheEntry.showName
    || cacheEntry.show?.name
    || cacheEntry.show?.title
    || cacheEntry.meta?.name
    || cacheEntry.meta?.title;
  if (direct) return String(direct).trim();

  for (const ep of cacheEntry.episodeDetails || []) {
    if (ep.showName) return String(ep.showName).trim();
  }
  return '';
}

function extractPosterFromCacheEntry(cacheEntry) {
  if (!cacheEntry) return null;
  const direct = cacheEntry.posterPath
    || cacheEntry.poster_path
    || cacheEntry.poster
    || cacheEntry.show?.poster_path
    || cacheEntry.show?.posterPath
    || cacheEntry.show?.poster;
  if (direct) return normalizePosterPathForStorage(direct);
  return null;
}

function getPosterFromRouteJson(json) {
  if (!json) return null;
  const attrs = json.data?.attributes || {};
  const imageCandidates = [
    attrs.defaultImage?.url,
    attrs.coverImage?.url,
    attrs.posterImage?.url,
    attrs.image?.url,
    attrs.images?.default?.url,
    attrs.images?.cover?.url,
  ];
  for (const url of imageCandidates) {
    if (url) return normalizePosterPathForStorage(url);
  }

  for (const item of json.included || []) {
    const type = (item.type || '').toLowerCase();
    if (!type.includes('image')) continue;
    const url = item.attributes?.url || item.attributes?.src;
    if (url) return normalizePosterPathForStorage(url);
  }
  return null;
}

function getShowNameFromPageMetadata() {
  const candidates = [
    document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
    document.title,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const parts = String(raw).split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      if (last && !/^(max|hbo max)$/i.test(last)) return last;
    }
  }
  return '';
}

function logDomDebugForShowNameOnce() {
  if (domDebugLogged) return;
  domDebugLogged = true;
  console.log('[Shufflr] DOM debug - h1 elements:', Array.from(document.querySelectorAll('h1')).map(e => e.textContent.trim()));
  document.querySelectorAll('[data-testid]').forEach(el => {
    const text = el.textContent.trim();
    if (text && text.length < 100) {
      console.log('[Shufflr] testid:', el.getAttribute('data-testid'), '=', text);
    }
  });
  console.log('[Shufflr] DOM debug - og:title meta:', document.querySelector('meta[property="og:title"]')?.content);
  console.log('[Shufflr] DOM debug - document.title:', document.title);
}

// Series/show title on the Max player (distinct from episode title in h1).
function getMaxPlayerShowName() {
  const titleEl = document.querySelector('[class*="Title-Fuse-Web-Play"]');
  if (titleEl?.innerText?.trim()) return titleEl.innerText.trim();

  const subtitleEl = document.querySelector('[data-testid="player-ux-asset-subtitle"]');
  if (subtitleEl) {
    const text = subtitleEl.textContent.trim();
    if (text) {
      console.log('[Shufflr] getMaxPlayerShowName result:', text, '(from player-ux-asset-subtitle)');
      return text;
    }
  }

  const selectors = [
    '[data-testid="series-title"]',
    '[data-testid="show-title"]',
    '[data-testid="play-page-subtitle"]',
    '[data-testid="breadcrumb"] a[href*="/show/"]',
    '[class*="SeriesTitle"]',
    '[class*="series-title"]',
    '[class*="ShowTitle"]',
    '[class*="show-title"]',
    'a[href*="/show/"][class*="title"]',
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (!el) continue;
    const text = (el.getAttribute?.('aria-label') || el.textContent || '').trim();
    if (text && text.length > 1) {
      const result = text.split('|')[0].trim();
      console.log('[Shufflr] getMaxPlayerShowName result:', result || null);
      return result;
    }
  }

  const showMaxId = getCurrentMaxShowUuid();
  const showLinks = document.querySelectorAll('a[href*="/show/"]');
  for (const link of showLinks) {
    const href = link.getAttribute('href') || '';
    const linkShowId = extractMaxShowUuidFromUrl(href);
    if (!linkShowId) continue;
    if (showMaxId && normalizeMaxId(linkShowId) !== normalizeMaxId(showMaxId)) continue;
    const text = (link.textContent || '').trim();
    if (text && text.length > 1 && text.length < 80) {
      console.log('[Shufflr] getMaxPlayerShowName result:', text || null);
      return text;
    }
  }

  const episodeSelectors = [
    '[data-testid="play-page-title"]',
    'h1',
    '[data-testid="title"]',
    'h2[data-testid]',
    '[class*="VideoTitle"]',
    '[class*="video-title"]',
  ];

  let episodeEl = null;
  let episodeTitle = '';
  for (const selector of episodeSelectors) {
    const el = document.querySelector(selector);
    const text = (el?.textContent || '').trim();
    if (text) {
      episodeEl = el;
      episodeTitle = text.split('|')[0].trim();
      break;
    }
  }

  if (episodeEl) {
    let sibling = episodeEl.previousElementSibling;
    while (sibling) {
      const text = (sibling.textContent || '').trim();
      if (text && text.length > 1 && text.length < 80 && text !== episodeTitle) {
        const result = text.split('|')[0].trim();
        console.log('[Shufflr] getMaxPlayerShowName result:', result || null);
        return result;
      }
      sibling = sibling.previousElementSibling;
    }

    const parent = episodeEl.parentElement;
    if (parent) {
      for (const child of parent.children) {
        if (child === episodeEl || child.contains(episodeEl)) continue;
        const text = (child.textContent || '').trim();
        if (!text || text.length > 80 || text === episodeTitle) continue;
        const result = text.split('|')[0].trim();
        console.log('[Shufflr] getMaxPlayerShowName result:', result || null);
        return result;
      }
    }
  }

  logDomDebugForShowNameOnce();
  const result = getShowNameFromPageMetadata();
  console.log('[Shufflr] getMaxPlayerShowName result:', result || null);
  return result;
}

function posterPathToWatchHistoryUrl(relativePoster) {
  if (!relativePoster) return null;
  const normalized = normalizePosterPathForStorage(relativePoster);
  if (!normalized) return null;
  return normalized.startsWith('http')
    ? normalized
    : `https://image.tmdb.org/t/p/w300${normalized.startsWith('/') ? normalized : '/' + normalized}`;
}

// Match the current Max watch URL against cached episode details or URL list.
function findCachedEpisodeDetailMatchingUrl(cacheEntry, pageUrl, showMaxIdHint = null) {
  if (!cacheEntry) return null;

  const details = episodeDetailsFromCacheEntry(cacheEntry);
  const currentKeys = buildCurrentEpisodeKeys(pageUrl, showMaxIdHint);

  for (const ep of details) {
    if (ep.watchUrl && isCurrentEpisode(ep.watchUrl, currentKeys, showMaxIdHint)) return ep;
    if (ep.alternateId && currentKeys.has(normalizeMaxId(ep.alternateId))) return ep;
  }

  for (const url of cacheEntry.episodes || []) {
    if (!isCurrentEpisode(url, currentKeys, showMaxIdHint)) continue;
    const alternateId = extractAlternateIdFromWatchUrl(url, showMaxIdHint);
    if (!alternateId) continue;
    const norm = normalizeMaxId(alternateId);
    const fromDetails = details.find(ep => normalizeMaxId(ep.alternateId) === norm);
    if (fromDetails) return fromDetails;
    return {
      alternateId,
      watchUrl: url.startsWith('http') ? url : `https://play.max.com/video/watch/${alternateId}`,
    };
  }

  const episodeId = getMaxEpisodeIdFromUrl(pageUrl, showMaxIdHint);
  if (episodeId) {
    const norm = normalizeMaxId(episodeId);
    const fromDetails = details.find(ep => normalizeMaxId(ep.alternateId) === norm);
    if (fromDetails) return fromDetails;
  }

  return null;
}

// Build a currentEpisode object for watch history from a cache match.
function buildWatchHistoryCurrentEpisode(cachedEp, cacheEntry, showMaxId, active, playlists) {
  const showName = normalizeWatchHistoryShowName(
    extractShowNameFromCacheEntry(cacheEntry)
    || findPlaylistShowTitleByIds(playlists, { maxId: showMaxId, tmdbId: cacheEntry?.tmdbId })
    || getMaxPlayerShowName()
    || active?.currentShow?.showName
    || active?.currentEpisode?.showName
    || '',
  );
  const showId = cacheEntry?.tmdbId || showMaxId;
  const posterPath = active?.currentEpisode?.posterPath
    || findPlaylistShowPosterPathInActive(active, showMaxId)
    || findPosterPathInPlaylists(playlists, { maxId: showMaxId, tmdbId: cacheEntry?.tmdbId })
    || extractPosterFromCacheEntry(cacheEntry);

  return {
    showId,
    showName,
    posterPath,
    alternateId: cachedEp.alternateId || getMaxEpisodeIdFromUrl(location.href, showMaxId),
    seasonNum: cachedEp.seasonNum,
    episode_number: cachedEp.episode_number,
    name: cachedEp.name || '',
  };
}

// Populate currentEpisode from the episode cache when shuffle has not set it yet.
async function ensureCurrentEpisodeForWatchHistory() {
  const active = await getActivePlaylistFromStorage();
  const maxId = getCurrentMaxShowUuid();
  if (!maxId) return active?.currentEpisode || lastWatchHistoryCurrentEpisode || null;

  if (active?.currentEpisode?.showId && active?.currentEpisode?.showName) {
    lastWatchHistoryCurrentEpisode = active.currentEpisode;
    return active.currentEpisode;
  }

  const cacheEntry = await getCachedEpisodeEntry(maxId);
  if (!cacheEntry) return active?.currentEpisode || lastWatchHistoryCurrentEpisode || null;

  const cachedEp = findCachedEpisodeDetailMatchingUrl(cacheEntry, location.href, maxId);
  if (!cachedEp) {
    console.log('[Shufflr] No cache match for current URL:', location.href);
  }

  const playlists = await readPlaylistsFromStorage();
  const currentEpisode = buildWatchHistoryCurrentEpisode(
    cachedEp || { alternateId: getMaxEpisodeIdFromUrl(location.href, maxId) },
    cacheEntry,
    maxId,
    active,
    playlists,
  );
  lastWatchHistoryCurrentEpisode = currentEpisode;

  if (active && isArmedPlaylistOwnedByThisTab(active)) {
    await chromeStorageLocalSet({
      [SHUFFLR_ACTIVE_PLAYLIST_KEY]: {
        ...active,
        currentEpisode,
        currentEpisodeUrl: location.href.split('?')[0],
      },
    });
  }

  return currentEpisode;
}

// Build watch_history row fields from the episode cache keyed by the current Max show ID.
async function buildWatchHistoryPayloadFromCache() {
  const showMaxId = getCurrentMaxShowUuid();
  const active = await getActivePlaylistFromStorage();
  const playlists = await readPlaylistsFromStorage();

  const cacheEntry = showMaxId ? await getCachedEpisodeEntry(showMaxId) : null;

  let currentEpisode = active?.currentEpisode || lastWatchHistoryCurrentEpisode || null;
  if (cacheEntry && showMaxId && (!currentEpisode?.showId || !currentEpisode?.showName)) {
    const cachedEp = findCachedEpisodeDetailMatchingUrl(cacheEntry, location.href, showMaxId);
    currentEpisode = buildWatchHistoryCurrentEpisode(
      cachedEp || { alternateId: getMaxEpisodeIdFromUrl(location.href, showMaxId) },
      cacheEntry,
      showMaxId,
      active,
      playlists,
    );
    lastWatchHistoryCurrentEpisode = currentEpisode;
  }

  const episodeTmdbId = currentEpisode?.showId
    && /^\d+$/.test(String(currentEpisode.showId))
    ? String(currentEpisode.showId)
    : null;
  let tmdbId = cacheEntry?.tmdbId || episodeTmdbId || null;

  let show_id = tmdbId || null;
  if (showMaxId) {
    for (const playlist of playlists) {
      for (const show of playlist?.shows || []) {
        const playlistMaxId = show.maxId || show.maxShowId || show.max_id;
        if (playlistMaxId && normalizeMaxId(playlistMaxId) === normalizeMaxId(showMaxId) && show.id) {
          show_id = String(show.id);
          // Also capture the TMDB id from the matched playlist show for watch_history logging.
          if (!tmdbId && show.id && /^\d+$/.test(String(show.id))) tmdbId = String(show.id);
          break;
        }
      }
    }
  }
  if (!show_id) {
    show_id = showMaxId || active?.currentShow?.showId || currentEpisode?.showId || null;
  }
  if (show_id) show_id = String(show_id);

  let show_name = normalizeWatchHistoryShowName(extractShowNameFromCacheEntry(cacheEntry));
  if (!show_name && currentEpisode?.showName) {
    show_name = normalizeWatchHistoryShowName(currentEpisode.showName);
  }
  if (!show_name) {
    show_name = normalizeWatchHistoryShowName(
      findPlaylistShowTitleByIds(playlists, { maxId: showMaxId, tmdbId: show_id || tmdbId })
    );
  }
  if (!show_name) {
    show_name = normalizeWatchHistoryShowName(active?.currentShow?.showName);
  }
  if (!show_name) {
    show_name = normalizeWatchHistoryShowName(getMaxPlayerShowName());
  }

  let relativePoster = currentEpisode?.posterPath
    || findPlaylistShowPosterPathInActive(active, showMaxId)
    || findPosterPathInPlaylists(playlists, { tmdbId: show_id, maxId: showMaxId })
    || extractPosterFromCacheEntry(cacheEntry);

  const poster_path = posterPathToWatchHistoryUrl(relativePoster);

  console.log('[Shufflr] payload debug:', JSON.stringify({ show_id, show_name, poster_path }));
  return {
    show_id,
    show_name,
    // Store TMDB id for reliable card click navigation in the web app.
    tmdb_id: tmdbId ?? null,
    poster_path,
    episode_name: currentEpisode?.name || null,
    season_num: currentEpisode?.seasonNum ?? null,
    episode_number: currentEpisode?.episode_number ?? null,
  };
}

async function logWatchHistoryToSupabase(payload) {
  console.log('[Shufflr] Watch history function called');
  if (!isChromeContextValid()) return;

  const show_id = payload?.show_id ? String(payload.show_id).trim() : '';
  const show_name = payload?.show_name ? String(payload.show_name).trim() : '';
  const poster_path = payload?.poster_path ? String(payload.poster_path).trim() : null;

  if (!show_id || !show_name) {
    console.log('[Shufflr] Skipping watch history — missing show data');
    return;
  }

  const session = await getValidAuthSession();
  console.log('[Shufflr] Session found:', !!session);
  if (!session?.accessToken || !session?.userId) return;

  const body = {
    user_id: session.userId,
    show_id,
    show_name,
    // Store TMDB id for reliable card click navigation in the web app.
    tmdb_id: payload.tmdb_id ? String(payload.tmdb_id) : null,
    poster_path: poster_path || null,
    episode_name: payload.episode_name,
    season_num: payload.season_num,
    episode_number: payload.episode_number,
    watched_at: new Date().toISOString(),
  };

  try {
    console.log('[Shufflr] watch history show_name:', show_name, 'poster_path:', poster_path || null);
    console.log('[Shufflr] watch_history payload:', JSON.stringify(body));
    const response = await fetch(`${SUPABASE_URL}/rest/v1/watch_history`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(body),
    });

    const result = { ok: response.ok, status: response.status };
    console.log('[Shufflr] Supabase response:', result);

    if (!response.ok) {
      console.log('[Shufflr] watch_history insert failed:', response.status);
      return;
    }

    console.log('[Shufflr] Logged watch history:', show_name);
  } catch (err) {
    console.error('[Shufflr] watch_history insert error:', err);
  }
}

async function maybeLogWatchHistoryOnPlay() {
  if (!isChromeContextValid()) return;
  if (!isVideoWatchUrl(location.href)) return;

  const logKey = location.href.split('?')[0];
  console.log('[Shufflr] maybeLogWatchHistoryOnPlay called for', logKey, '— already attempted:', lastWatchHistoryLogKey === logKey);
  if (lastWatchHistoryLogKey === logKey) return;
  lastWatchHistoryLogKey = logKey;

  await ensureCurrentEpisodeForWatchHistory();
  const payload = await buildWatchHistoryPayloadFromCache();
  await logWatchHistoryToSupabase(payload);
}

// ── TOGGLE ─────────────────────────────────────────────────────────────────
async function toggleShuffle() {
  if (!isChromeContextValid()) return;
  if (toggleShuffleInProgress) return;

  const btn = document.getElementById('shufflr-btn');
  const label = document.getElementById('shufflr-label');
  if (!btn || !label) {
    const active = await getActivePlaylistFromStorage();
    if (isArmedPlaylistOwnedByThisTab(active) || await isStandaloneShuffleEnabled()) {
      await recoverShufflrUI('toggle click with missing UI');
      return;
    }
    await resetShuffleState();
    return;
  }

  toggleShuffleInProgress = true;
  const turningOn = !shufflrActive;

  try {
    shufflrActive = turningOn;

    if (turningOn) {
      clearShufflrAutoNavStopped();
      btn.classList.add('active');
      label.textContent = 'ON';
      const active = await getActivePlaylistFromStorage();
      if (isArmedPlaylistOwnedByThisTab(active) && active.playlistName) {
        await setStandaloneShuffleEnabled(false);
        if (!isChromeContextValid()) return;
        updateShuffleUI(active.playlistName);
        showToast(`Playlist: ${active.playlistName} — shuffling...`);
      } else {
        await setStandaloneShuffleEnabled(true);
        startShuffleWatchdog();
        attachShuffleListenersIfVideoPage();
        if (!isChromeContextValid()) return;
        updateShuffleUI('');

        const onWatchPage = location.href.includes('/video/') || location.href.includes('/play/');
        const onShowPage = IS_MAX && location.href.includes('/show/');
        const toggleOnFallbackToast =
          "Shufflr ON — couldn't start yet, will shuffle when the episode ends";

        // Neither watch nor show: arm only (no immediate shuffle target).
        if (!onWatchPage && !onShowPage) {
          showToast(toggleOnFallbackToast);
          return;
        }

        const settings = await readShuffleSettings();
        shuffleModeCached = settings.shuffleMode;
        orderedEpisodesCached = !!settings.orderedEpisodes;

        if (onShowPage) {
          // Show page: toggle-ON means shuffle this show now (cache → API → DOM fallback).
          saveShowPageUrl(location.href.split('?')[0]);
          const showId = extractShowId(location.href);
          if (showId) saveShowPageUrl(buildMaxShowPageUrl(showId));

          const showTitle = getCurrentShowTitle() || 'show';
          showToast(`Shuffling ${showTitle}...`);

          try {
            let started = false;
            if (isMaxSessionPinnedToCurrentShow()) {
              started = await shuffleToRandomEpisode({ quiet: true, mode: 'user' });
            } else if (settings.shuffleMode === 'all') {
              await shuffleFromYourShowsAllMode(null, { mode: 'user' });
              started = !location.href.includes('/show/')
                || !!sessionStorage.getItem(SHUFFLR_PENDING_KEY);
            } else {
              started = await shuffleToRandomEpisode({ quiet: true, mode: 'user' });
            }
            // Collection failed → stay armed; replace the start toast with an accurate wait message.
            if (!started) {
              showToast(toggleOnFallbackToast);
            }
          } catch (err) {
            console.error('[Shufflr] toggle-ON show-page shuffle error:', err);
            showToast(toggleOnFallbackToast);
          }
          return;
        }

        // Watch page: toggle-ON means shuffle now (same picks as episode-end standalone).
        showToast('Shufflr ON — shuffling...');
        const showId = getCurrentMaxShowUuid() || resolveMaxWatchIds(location.href)?.showId;
        if (showId && !(knownShowPageUrl || sessionStorage.getItem(SHUFFLR_SHOW_PAGE_KEY))) {
          saveShowPageUrl(buildMaxShowPageUrl(showId));
        }

        try {
          if (isMaxSessionPinnedToCurrentShow()) {
            await shuffleToRandomEpisode({ quiet: true, mode: 'user' });
          } else if (settings.shuffleMode === 'all') {
            await shuffleFromYourShowsAllMode(null, { mode: 'user' });
          } else {
            await shuffleToRandomEpisode({ quiet: true, mode: 'user' });
          }
        } catch (err) {
          console.error('[Shufflr] toggle-ON immediate shuffle error:', err);
          showToast(toggleOnFallbackToast);
        }
      }
    } else {
      await setStandaloneShuffleEnabled(false);
      await clearActivePlaylist();
      armedPlaylistCached = false;
      clearMaxSessionPin();
      await resetShuffleModeToSingle();
      if (!isChromeContextValid()) return;
      updateShuffleUI('');
      showToast('Shufflr OFF');
    }
  } catch (err) {
    console.error('[Shufflr] toggleShuffle error:', err);
    await resetShuffleState();
    showToast('Shufflr reset — tap again');
  } finally {
    toggleShuffleInProgress = false;
  }
}

// ── VIDEO EVENTS ────────────────────────────────────────────────────────────
function onTimeUpdate() {
  const video = document.querySelector('video');
  const timeRemaining = video?.duration > 0 ? video.duration - video.currentTime : null;
  console.log('[Shufflr] timeupdate fired, time remaining:', timeRemaining);
  console.log('[Shufflr] isAdPlaying:', isAdPlaying());
  console.log('[Shufflr] shufflrEnabled:', shufflrActive);
  if (isAdPlaying()) {
    shufflrAboutToNavigate = false;
    return;
  }
  if (!shufflrActive && !armedPlaylistCached) {
    shufflrAboutToNavigate = false;
    return;
  }
  if (orderedEpisodesCached) {
    shufflrAboutToNavigate = false;
    return;
  }

  if (!video || !video.duration || !Number.isFinite(video.duration)) return;
  if (isNonEpisodePlayback(video)) {
    logNonEpisodePlaybackIgnored(video);
    shufflrAboutToNavigate = false;
    return;
  }

  updateShufflrAboutToNavigateFromVideo(video);

  const remaining = video.duration - video.currentTime;
  const status = document.getElementById('shufflr-status');

  if (status && remaining <= 30 && remaining > TIMEUPDATE_SHUFFLE_REMAINING_SEC) {
    status.textContent = `SHUFFLING IN ${Math.floor(remaining)}s...`;
  }
}

async function onEpisodeEnded() {
  if (!isChromeContextValid()) return;
  if (isAdPlaying()) return;
  const video = window.__shufflrAttachedVideo || document.querySelector('video');
  if (isNonEpisodePlayback(video)) {
    logNonEpisodePlaybackIgnored(video);
    return;
  }
  const active = await getActivePlaylistFromStorage();
  const owned = isArmedPlaylistOwnedByThisTab(active);
  if (owned) {
    shufflrActive = true;
    armedPlaylistCached = true;
  } else if (!shufflrActive && await isStandaloneShuffleEnabled()) {
    shufflrActive = true;
  }
  if (!shufflrActive && !owned) return;
  if (owned) {
    if (orderedEpisodesCached) return;
    if (shufflrEpisodeTransitionLock) return;
    await handleShufflrNextEpisode('video-ended');
    return;
  }
  const settings = await readShuffleSettings();
  shuffleModeCached = settings.shuffleMode;
  // Your Shows card Play pin: stay on that show even when global mode is ALL.
  if (isMaxSessionPinnedToCurrentShow()) {
    await shuffleToRandomEpisode();
    return;
  }
  if (settings.shuffleMode === 'all') {
    await shuffleFromYourShowsAllMode(null);
    return;
  }
  shuffleToRandomEpisode();
}

// ── BOLT CMS API (default.*.prd.api.hbomax.com) ─────────────────────────────
const CMS_HEADER_KEYS = [
  'x-device-info',
  'x-disco-client',
  'x-disco-params',
  'x-wbd-ace',
  'x-wbd-device-consent',
  'x-wbd-preferred-language',
  'x-wbd-session-state',
  'x-wbd-time-zone',
];

function urlHasShowIdParam(url) {
  try {
    return new URL(url, location.origin).searchParams.has('pf[show.id]');
  } catch {
    return false;
  }
}

function saveCmsTemplateFromUrl(url, headers) {
  const match = url.match(/^(https:\/\/default\.[^/]+\.api\.hbomax\.com)\/cms\/collections\/(\d+)\?(.+)/);
  if (!match) return;

  const params = new URLSearchParams(match[3]);
  params.delete('pf[show.id]');
  params.delete('pf[seasonNumber]');

  const captured = {
    apiOrigin: match[1],
    collectionId: match[2],
    baseQuery: params.toString(),
    showId: new URL(url).searchParams.get('pf[show.id]') || undefined,
  };

  if (headers) {
    captured.headers = normalizeCapturedHeaders(headers);
  } else {
    const existing = getCmsConfig();
    if (existing?.headers) captured.headers = existing.headers;
  }

  sessionStorage.setItem(CMS_CAPTURE_KEY, JSON.stringify(captured));
  console.log('[Shufflr] Captured CMS template:', captured.apiOrigin, captured.collectionId);
}

function installCmsPageCaptureListener() {
  if (window.__shufflrCmsPageCaptureListener) return;
  window.__shufflrCmsPageCaptureListener = true;

  window.addEventListener('message', event => {
    if (event.source !== window) return;
    if (event.data?.source !== 'shufflr-cms-capture') return;
    if (typeof event.data.url !== 'string') return;
    saveCmsTemplateFromUrl(event.data.url, event.data.headers || null);
  });
}

function installCmsRequestCapture() {
  if (window.__shufflrCmsCapture) return;
  window.__shufflrCmsCapture = true;

  const saveFromUrl = (url, headers) => {
    saveCmsTemplateFromUrl(url, headers);
  };

  const origFetch = window.fetch;
  shufflrOrigFetch = origFetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    if (url?.includes('/cms/collections/') && urlHasShowIdParam(url)) {
      const headers = init?.headers || (input instanceof Request ? input.headers : null);
      saveFromUrl(url, headers);
    }
    return origFetch.call(this, input, init);
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (typeof url === 'string' && url.includes('/cms/collections/') && urlHasShowIdParam(url)) {
      saveFromUrl(url, null);
    }
    return origOpen.call(this, method, url, ...rest);
  };
}

function normalizeCapturedHeaders(headers) {
  const out = {};
  if (!headers) return out;

  if (headers instanceof Headers) {
    for (const key of CMS_HEADER_KEYS) {
      const val = headers.get(key);
      if (val) out[key] = val;
    }
    return out;
  }

  if (Array.isArray(headers)) {
    for (const [key, val] of headers) {
      if (CMS_HEADER_KEYS.includes(key.toLowerCase())) out[key.toLowerCase()] = val;
    }
    return out;
  }

  for (const key of CMS_HEADER_KEYS) {
    const val = headers[key] || headers[key.toLowerCase()];
    if (val) out[key] = val;
  }
  return out;
}

function getCmsConfig() {
  const raw = sessionStorage.getItem(CMS_CAPTURE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function guessCmsApiOrigin() {
  const country = document.cookie.match(/(?:^|;\s*)countryCode=([^;]+)/i)?.[1]?.toUpperCase() || 'US';
  const emea = new Set(['GB', 'DE', 'FR', 'NL', 'SE', 'NO', 'DK', 'FI', 'ES', 'IT', 'PL', 'BE', 'AT', 'CH', 'IE', 'PT']);
  const latam = new Set(['BR', 'MX', 'AR', 'CL', 'CO']);
  if (emea.has(country)) return 'https://default.any-emea.prd.api.hbomax.com';
  if (latam.has(country)) return 'https://default.any-latam.prd.api.hbomax.com';
  return 'https://default.any-amer.prd.api.hbomax.com';
}

function getCmsHeaders() {
  const config = getCmsConfig();
  return {
    accept: '*/*',
    'content-type': 'application/json',
    ...(config?.headers || {}),
  };
}

function extractShowId(showPageUrl) {
  const config = getCmsConfig();
  if (config?.showId) return config.showId;

  try {
    const path = decodeURIComponent(new URL(showPageUrl).pathname);
    const uuidMatch = path.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (uuidMatch) return uuidMatch[1];

    const segments = path.split('/').filter(Boolean);
    const showIdx = segments.indexOf('show');
    if (showIdx >= 0 && segments[showIdx + 1]) return segments[showIdx + 1];
  } catch { /* ignore */ }
  return null;
}

function buildSeasonCollectionUrl(showId, seasonNumber) {
  const config = getCmsConfig();
  const apiOrigin = config?.apiOrigin || guessCmsApiOrigin();
  const collectionId = config?.collectionId || '227084608563650952176059252419027445293';
  const params = new URLSearchParams(config?.baseQuery || 'include=default&decorators=viewingHistory,isFavorite,contentAction,badges');
  params.set('pf[show.id]', showId);
  params.set('pf[seasonNumber]', String(seasonNumber));
  return `${apiOrigin}/cms/collections/${collectionId}?${params}`;
}

async function fetchExpressContent(showId, seasonNumber) {
  const url = buildSeasonCollectionUrl(showId, seasonNumber);
  console.log(`[Shufflr] CMS fetch S${seasonNumber}: ${url}`);

  const response = await (shufflrOrigFetch || fetch)(url, {
    method: 'GET',
    credentials: 'include',
    headers: getCmsHeaders(),
  });

  if (!response.ok) {
    console.log(`[Shufflr] CMS API ${response.status} for show=${showId} season=${seasonNumber}`);
    return null;
  }
  return response.json();
}

function cmsItemToWatchUrl(item) {
  if (!item) return null;

  const attrs = item.attributes || {};
  const alternateId = attrs.alternateId || attrs.editId;
  if (alternateId) {
    return normalizeEpisodeUrl(`${location.origin}/video/watch/${alternateId}`);
  }

  const route = attrs.route || attrs.clickableUri || attrs.href;
  if (route && String(route).includes('/video/')) {
    const href = route.startsWith('http') ? route : `${location.origin}${route}`;
    return normalizeEpisodeUrl(href);
  }

  return null;
}

function parseEpisodesFromCmsResponse(json) {
  if (!json) return [];

  const episodes = [];
  const seen = new Set();
  const items = [...(json.included || [])];

  if (Array.isArray(json.data)) {
    items.push(...json.data);
  } else if (json.data) {
    items.push(json.data);
  }

  for (const item of items) {
    const type = (item.type || '').toLowerCase();
    const attrs = item.attributes || {};
    const isEpisode = attrs.episodeNumber != null
      || attrs.videoType === 'EPISODE'
      || type.includes('episode')
      || (type.includes('video') && attrs.videoType !== 'MOVIE');

    if (!isEpisode) continue;

    const url = cmsItemToWatchUrl(item);
    if (url && !seen.has(url)) {
      seen.add(url);
      episodes.push(url);
    }
  }

  return episodes;
}

function parseMaxCmsEpisodesDetailed(json, seasonNumber, showMaxId = null) {
  if (!json) return [];

  const episodes = [];
  const seen = new Set();
  const items = [...(json.included || [])];

  if (Array.isArray(json.data)) {
    items.push(...json.data);
  } else if (json.data) {
    items.push(json.data);
  }

  for (const item of items) {
    const type = (item.type || '').toLowerCase();
    const attrs = item.attributes || {};
    const isEpisode = attrs.episodeNumber != null
      || attrs.videoType === 'EPISODE'
      || type.includes('episode')
      || (type.includes('video') && attrs.videoType !== 'MOVIE');

    if (!isEpisode) continue;

    const alternateId = attrs.alternateId || attrs.editId;
    const episode_number = attrs.episodeNumber ?? attrs.number;
    const seasonNum = attrs.seasonNumber ?? seasonNumber;
    if (!alternateId || episode_number == null || seasonNum == null) continue;

    const key = `${seasonNum}-${episode_number}`;
    if (seen.has(key)) continue;
    seen.add(key);

    episodes.push({
      seasonNum: Number(seasonNum),
      episode_number: Number(episode_number),
      alternateId: String(alternateId),
      watchUrl: buildMaxEpisodeWatchUrl(alternateId, showMaxId),
      name: attrs.name || attrs.title || '',
      duration: getEpisodeDurationSeconds(attrs),
    });
  }

  return episodes;
}

function parseAllVideosFromCmsResponse(json, showMaxId = null) {
  if (!json) return [];

  const videos = [];
  const seen = new Set();
  const items = [...(json.included || [])];

  if (Array.isArray(json.data)) {
    items.push(...json.data);
  } else if (json.data) {
    items.push(json.data);
  }

  for (const item of items) {
    const type = (item.type || '').toLowerCase();
    if (!type.includes('video') && !type.includes('episode')) continue;

    const attrs = item.attributes || {};
    const alternateId = attrs.alternateId || attrs.editId;
    if (!alternateId || seen.has(String(alternateId))) continue;
    seen.add(String(alternateId));

    videos.push({
      alternateId: String(alternateId),
      watchUrl: buildMaxEpisodeWatchUrl(alternateId, showMaxId),
      name: attrs.name || attrs.title || '',
      duration: getEpisodeDurationSeconds(attrs),
      seasonNum: attrs.seasonNumber ?? null,
      episode_number: attrs.episodeNumber ?? attrs.number ?? null,
    });
  }

  return videos;
}

async function collectEpisodeDetailsViaApi(showPageUrl) {
  const showId = extractShowId(showPageUrl);
  if (!showId) return [];

  const cachedPayloads = new Map();
  const seasonNumbers = await discoverSeasonNumbers(showId, cachedPayloads);
  const payloads = await Promise.all(
    seasonNumbers.map(season => (
      cachedPayloads.has(season)
        ? Promise.resolve(cachedPayloads.get(season))
        : fetchExpressContent(showId, season)
    ))
  );

  const all = [];
  payloads.forEach((json, i) => {
    all.push(...parseMaxCmsEpisodesDetailed(json, seasonNumbers[i], showId));
  });
  return all;
}

function getSeasonNumbersFromRoute(json) {
  if (!json) return null;

  const seasons = new Set();
  const items = [...(json.included || [])];
  if (json.data) items.push(json.data);

  for (const item of items) {
    const type = (item.type || '').toLowerCase();
    const attrs = item.attributes || {};

    if (type.includes('season') && attrs.seasonNumber != null) {
      seasons.add(Number(attrs.seasonNumber));
    }

    const count = attrs.seasonCount ?? attrs.numberOfSeasons ?? attrs.totalSeasons;
    if (count != null && Number(count) > 0) {
      return Array.from({ length: Number(count) }, (_, i) => i + 1);
    }
  }

  if (!seasons.size) return null;
  return Array.from(seasons).sort((a, b) => a - b);
}

async function fetchShowRoute(showId) {
  const config = getCmsConfig();
  const apiOrigin = config?.apiOrigin || guessCmsApiOrigin();
  const url = `${apiOrigin}/cms/routes/show/${showId}?include=default`;

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: getCmsHeaders(),
  });

  if (!response.ok) {
    console.log(`[Shufflr] CMS routes ${response.status} for show=${showId}`);
    return null;
  }
  return response.json();
}

async function discoverSeasonNumbers(showId, cachedPayloads) {
  const routeJson = await fetchShowRoute(showId);
  const fromRoute = getSeasonNumbersFromRoute(routeJson);
  if (fromRoute?.length) {
    console.log(`[Shufflr] Found ${fromRoute.length} season(s) from show route`);
    return fromRoute;
  }

  const probeResults = await Promise.all(
    Array.from({ length: 40 }, (_, i) => i + 1).map(async season => {
      const json = await fetchExpressContent(showId, season);
      const episodes = parseEpisodesFromCmsResponse(json);
      return episodes.length ? { season, json } : null;
    })
  );

  const found = [];
  for (const result of probeResults) {
    if (!result) continue;
    found.push(result.season);
    cachedPayloads.set(result.season, result.json);
  }
  found.sort((a, b) => a - b);

  console.log(`[Shufflr] Probed ${found.length} season(s)`);
  return found.length ? found : [1];
}

// ── EPISODE CACHE (chrome.storage.local, 24h TTL) ─────────────────────────
function episodeCacheKey(showId) {
  return `${EPISODE_CACHE_PREFIX}${showId}`;
}

async function clearAllEpisodeCaches() {
  if (!isChromeContextValid()) return 0;
  const all = await new Promise(resolve => {
    try {
      chrome.storage.local.get(null, result => {
        try {
          if (handleChromeRuntimeLastError()) {
            resolve({});
            return;
          }
          resolve(result || {});
        } catch (err) {
          if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
          resolve({});
        }
      });
    } catch (err) {
      if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
      resolve({});
    }
  });

  const keys = Object.keys(all).filter(key => key.startsWith(EPISODE_CACHE_PREFIX));
  if (!keys.length) return 0;

  await chromeStorageLocalRemove(keys);
  console.log(`[Shufflr] Cleared ${keys.length} stale episode cache(s)`);
  return keys.length;
}

async function maybeClearStaleEpisodeCachesOnce() {
  if (!isChromeContextValid()) return;
  const flag = await storageLocalGet(SHUFFLR_CACHE_CLEARED_V2_KEY);
  if (flag) return;

  await clearAllEpisodeCaches();
  await storageLocalSet(SHUFFLR_CACHE_CLEARED_V2_KEY, true);
}

function storageLocalGet(key) {
  if (!isChromeContextValid()) return Promise.resolve(undefined);
  return new Promise(resolve => {
    try {
      chrome.storage.local.get(key, result => {
        try {
          if (handleChromeRuntimeLastError()) {
            resolve(undefined);
            return;
          }
          resolve(result[key]);
        } catch (err) {
          if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
          resolve(undefined);
        }
      });
    } catch (err) {
      if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
      resolve(undefined);
    }
  });
}

function storageLocalSet(key, value) {
  if (!isChromeContextValid()) return Promise.resolve(false);
  return chromeStorageLocalSet({ [key]: value });
}

async function getCachedEpisodeEntry(showId) {
  if (!isChromeContextValid()) return null;
  const entry = await storageLocalGet(episodeCacheKey(showId));
  if (!entry?.cachedAt) return null;
  if (!entry.episodeDetails?.length && !entry.episodes?.length) return null;

  const ageMs = Date.now() - entry.cachedAt;
  if (ageMs > EPISODE_CACHE_TTL_MS) {
    console.log(`[Shufflr] Cache expired for ${showId} (${Math.round(ageMs / 3600000)}h old)`);
    return null;
  }

  console.log(
    `[Shufflr] Cache hit for ${showId} — ${entry.episodes.length} episodes ` +
    `(${Math.round(ageMs / 1000)}s old)`
  );
  return entry;
}

async function getCachedEpisodes(showId) {
  if (!isChromeContextValid()) return null;
  const entry = await getCachedEpisodeEntry(showId);
  return entry?.episodes || null;
}

function getShowNameFromRouteJson(json) {
  if (!json) return null;
  const attrs = json.data?.attributes || {};
  return attrs.name || attrs.title || attrs.displayName || null;
}

async function setCachedEpisodes(showId, episodes, episodeDetails, showName, tmdbId) {
  if (!isChromeContextValid()) return;
  await storageLocalSet(episodeCacheKey(showId), {
    showId,
    showName: showName || null,
    tmdbId: tmdbId || null,
    episodes,
    episodeDetails: episodeDetails || [],
    cachedAt: Date.now(),
  });
  console.log(`[Shufflr] Cached ${episodes.length} episodes for ${showId}`);
}

async function collectEpisodesViaMaxShowId(maxShowId, showName, tmdbId) {
  if (!isChromeContextValid()) return null;
  if (!maxShowId) return null;

  console.log(`[Shufflr] === collectEpisodesViaMaxShowId: ${maxShowId} ===`);

  const cached = await getCachedEpisodes(maxShowId);
  if (cached) return cached;

  const started = performance.now();
  const cachedPayloads = new Map();

  const seasonNumbers = await discoverSeasonNumbers(maxShowId, cachedPayloads);
  const payloads = await Promise.all(
    seasonNumbers.map(season => (
      cachedPayloads.has(season)
        ? Promise.resolve(cachedPayloads.get(season))
        : fetchExpressContent(maxShowId, season)
    ))
  );

  const episodeDetails = [];
  const episodeSet = new Set();
  payloads.forEach((payload, i) => {
    parseMaxCmsEpisodesDetailed(payload, seasonNumbers[i], maxShowId).forEach(ep => {
      const key = `${ep.seasonNum}-${ep.episode_number}`;
      if (episodeDetails.some(e => `${e.seasonNum}-${e.episode_number}` === key)) return;
      episodeDetails.push(ep);
      episodeSet.add(ep.watchUrl);
    });
    parseEpisodesFromCmsResponse(payload).forEach(url => episodeSet.add(url));
  });

  if (!episodeDetails.length) {
    payloads.forEach(payload => {
      parseAllVideosFromCmsResponse(payload, maxShowId).forEach(video => {
        if (episodeDetails.some(ep => ep.alternateId === video.alternateId)) return;
        episodeDetails.push(video);
        if (video.watchUrl) episodeSet.add(video.watchUrl);
      });
    });
  }

  const episodes = Array.from(episodeSet);
  console.log(
    `[Shufflr] API collection done in ${Math.round(performance.now() - started)}ms — ` +
    `${episodes.length} episodes across ${seasonNumbers.length} season(s)`
  );

  if (episodes.length) {
    const routeJson = await fetchShowRoute(maxShowId);
    const resolvedName = getShowNameFromRouteJson(routeJson) || showName || null;
    await setCachedEpisodes(maxShowId, episodes, episodeDetails, resolvedName, tmdbId);
  }
  return episodes.length ? episodes : null;
}

async function collectEpisodesViaApi(showPageUrl) {
  if (!isChromeContextValid()) return null;
  const showId = extractShowId(showPageUrl);
  if (!showId) {
    console.log(`[Shufflr] Could not extract show ID from: ${showPageUrl}`);
    return null;
  }

  return collectEpisodesViaMaxShowId(showId);
}

async function prefetchEpisodeList() {
  if (!isChromeContextValid()) return;
  const isVideoPage = location.href.includes('/video/') || location.href.includes('/play/');
  if (!isVideoPage) return;

  const episodeUrl = location.href.split('?')[0];
  if (episodeUrl === lastPrefetchedEpisodeUrl) return;

  const showPage = knownShowPageUrl || sessionStorage.getItem(SHUFFLR_SHOW_PAGE_KEY);
  if (!showPage) {
    console.log('[Shufflr] Prefetch skipped — no show page URL');
    return;
  }

  const showId = extractShowId(showPage);
  if (!showId) return;

  const cached = await getCachedEpisodes(showId);
  if (cached) {
    lastPrefetchedEpisodeUrl = episodeUrl;
    console.log(`[Shufflr] Prefetch skipped — cache warm (${cached.length} episodes)`);
    return;
  }

  if (prefetchInFlightShowId === showId) return;

  lastPrefetchedEpisodeUrl = episodeUrl;
  prefetchInFlightShowId = showId;
  console.log('[Shufflr] Prefetching episode list in background...');

  try {
    const episodes = await collectEpisodesViaApi(showPage);
    if (episodes?.length) {
      console.log(`[Shufflr] Prefetch complete — ${episodes.length} episodes ready`);
    } else {
      console.log('[Shufflr] Prefetch returned no episodes');
      lastPrefetchedEpisodeUrl = null;
    }
  } catch (err) {
    console.log('[Shufflr] Prefetch error:', err);
    lastPrefetchedEpisodeUrl = null;
  } finally {
    if (prefetchInFlightShowId === showId) prefetchInFlightShowId = null;
  }
}

// ── SHUFFLE LOGIC ───────────────────────────────────────────────────────────
async function shuffleToRandomEpisode(options = {}) {
  if (isAdPlaying()) return false;
  const quiet = !!options.quiet;
  const navMode = options.mode === 'user' ? 'user' : 'auto';
  if (navMode === 'auto' && isShufflrAutoNavStopped()) return false;
  const status = document.getElementById('shufflr-status');
  const showPage = knownShowPageUrl || sessionStorage.getItem(SHUFFLR_SHOW_PAGE_KEY);
  const lastEpisodeUrl = location.href;

  if (!showPage) {
    if (!quiet) showToast('Visit the show page first so Shufflr can find all episodes.');
    if (status) status.textContent = 'NO SHOW PAGE';
    console.log('[Shufflr] Aborting — no knownShowPageUrl');
    return false;
  }

  console.log(`[Shufflr] Shuffle triggered from: ${lastEpisodeUrl}`);
  if (status) status.textContent = 'FETCHING EPISODES...';
  if (!quiet) showToast('Fetching episode list via API...');

  let episodes = null;
  try {
    episodes = await collectEpisodesViaApi(showPage);
  } catch (err) {
    console.log('[Shufflr] API fetch error:', err);
  }

  if (!episodes?.length) {
    console.log('[Shufflr] API empty/failed — falling back to show-page DOM scrape');
    sessionStorage.setItem(SHUFFLR_PENDING_KEY, JSON.stringify({ lastEpisodeUrl, showPageUrl: showPage, navMode }));
    if (status) status.textContent = 'LOADING SHOW PAGE...';

    // Already on this show page — same-URL assignment won't navigate; run DOM fallback now.
    const currentShowId = extractShowId(location.href);
    const targetShowId = extractShowId(showPage);
    const alreadyOnShowPage = !!(
      location.href.includes('/show/')
      && currentShowId
      && targetShowId
      && normalizeMaxId(currentShowId) === normalizeMaxId(targetShowId)
    );
    if (alreadyOnShowPage) {
      if (!quiet) showToast('API unavailable — scraping show page...');
      return handleShowPageShuffle();
    }

    if (!quiet) showToast('API unavailable — loading show page...');
    shufflrAboutToNavigate = false;
    captureFullscreenBeforeShufflrNavigation();
    await shufflrNavigateTo(showPage, { mode: navMode, source: 'max-show-page-fallback' });
    return true;
  }

  await navigateToRandomEpisode(episodes, lastEpisodeUrl, status, { mode: navMode, source: 'max-random-episode' });
  return true;
}

async function handleShowPageShuffle() {
  if (shuffleInProgress) return false;

  const raw = sessionStorage.getItem(SHUFFLR_PENDING_KEY);
  if (!raw) return false;

  shuffleInProgress = true;
  let pending;
  try {
    pending = JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(SHUFFLR_PENDING_KEY);
    shuffleInProgress = false;
    return false;
  }

  sessionStorage.removeItem(SHUFFLR_PENDING_KEY);
  console.log('[Shufflr] === handleShowPageShuffle: START (DOM fallback) ===');

  let episodes = null;
  try {
    episodes = await collectEpisodesViaApi(pending.showPageUrl);
  } catch (err) {
    console.log('[Shufflr] API retry on show page failed:', err);
  }

  if (!episodes?.length) {
    console.log('[Shufflr] Waiting for show page episode UI before DOM scrape...');
    await waitForShowPageScrapeReady(3000);
    episodes = await collectEpisodesFromAllSeasons();
    if (episodes?.length) {
      const showId = extractShowId(pending.showPageUrl);
      if (showId) {
        await setCachedEpisodes(showId, episodes, [], null, null);
      }
    }
  }

  if (!episodes?.length) {
    showToast('Could not find episodes on show page.');
    shuffleInProgress = false;
    return false;
  }

  await navigateToRandomEpisode(
    episodes,
    pending.lastEpisodeUrl,
    document.getElementById('shufflr-status'),
    { mode: pending.navMode === 'user' ? 'user' : 'auto', source: 'max-show-page-scrape' }
  );
  shuffleInProgress = false;
  return true;
}

async function navigateToRandomEpisode(episodes, lastEpisodeUrl, status, options = {}) {
  if (isAdPlaying()) return;
  const navMode = options.mode === 'user' ? 'user' : 'auto';
  if (navMode === 'auto' && isShufflrAutoNavStopped()) return;
  const showHint = getCurrentMaxShowUuid();
  const currentKeys = buildCurrentEpisodeKeys(lastEpisodeUrl, showHint);
  let pool = episodes.filter(ep => !isCurrentEpisode(ep, currentKeys, showHint));
  pool = await filterEpisodesByBlockedSeasons(pool, showHint);

  if (!pool.length) {
    showToast('No other episodes to shuffle to.');
    if (status) status.textContent = 'NO OTHER EPISODES';
    return;
  }

  const pickIndex = Math.floor(Math.random() * pool.length);
  const pick = pool[pickIndex];
  console.log(`[Shufflr] Picked ${pickIndex + 1}/${pool.length}: ${pick}`);

  if (status) status.textContent = 'SHUFFLING...';
  showToast(`Shuffling to episode ${pickIndex + 1} of ${pool.length}!`);
  shufflrAboutToNavigate = false;
  const episodeId = getMaxEpisodeIdFromUrl(pick, showHint);
  beginShufflrNavigation(episodeId);
  await shufflrNavigateTo(pick, { mode: navMode, source: options.source || 'max-random-episode' });
}

function readBlockedSeasonsFromLocalStorage(maxId) {
  if (!maxId) return [];
  try {
    const raw = localStorage.getItem(`shufflr_blocked_seasons_${maxId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map(Number).filter(n => Number.isFinite(n) && n > 0))];
  } catch {
    return [];
  }
}

async function filterEpisodesByBlockedSeasons(episodes, showMaxId) {
  const maxId = showMaxId || getCurrentMaxShowUuid();
  if (!maxId || !episodes?.length) return episodes;

  const blockedSeasons = readBlockedSeasonsFromLocalStorage(maxId);
  if (!blockedSeasons.length) return episodes;

  const blockedSet = new Set(blockedSeasons);
  const entry = await getCachedEpisodeEntry(maxId);
  const details = entry?.episodeDetails || [];
  if (!details.length) return episodes;

  const blockedUrls = new Set();
  details.forEach(ep => {
    if (ep.seasonNum == null || !blockedSet.has(Number(ep.seasonNum))) return;
    if (ep.watchUrl) blockedUrls.add(normalizeEpisodeUrl(ep.watchUrl).toLowerCase());
    if (ep.alternateId) {
      blockedUrls.add(normalizeEpisodeUrl(buildMaxEpisodeWatchUrl(ep.alternateId, maxId)).toLowerCase());
    }
  });

  return episodes.filter(url => {
    const normalized = normalizeEpisodeUrl(url).toLowerCase();
    if (blockedUrls.has(normalized)) return false;
    const episodeId = getMaxEpisodeIdFromUrl(url, maxId);
    if (!episodeId) return true;
    const normEpId = normalizeMaxId(episodeId);
    const detail = details.find(d => d.alternateId && normalizeMaxId(d.alternateId) === normEpId);
    if (!detail || detail.seasonNum == null) return true;
    return !blockedSet.has(Number(detail.seasonNum));
  });
}

function normalizeEpisodeUrl(url) {
  try {
    const u = new URL(url);
    u.search = '';
    u.hash = '';
    return u.href.replace(/\/$/, '');
  } catch {
    return url.split('?')[0].split('#')[0].replace(/\/$/, '');
  }
}

function extractVideoSlug(url, showMaxIdHint = null) {
  const episodeId = getMaxEpisodeIdFromUrl(url, showMaxIdHint);
  return episodeId ? normalizeMaxId(episodeId) : null;
}

function extractPlayerEpisodeUrn(url) {
  try {
    const match = new URL(url).pathname.match(/urn:hbo:episode:([a-z0-9-]+)/i);
    return match ? match[1].toLowerCase() : null;
  } catch { /* ignore */ }
  return null;
}

function buildCurrentEpisodeKeys(pageUrl, showMaxIdHint = null) {
  const keys = new Set();
  keys.add(normalizeEpisodeUrl(pageUrl).toLowerCase());

  const resolved = resolveMaxWatchIds(pageUrl, showMaxIdHint);
  if (resolved?.episodeId) {
    keys.add(normalizeMaxId(resolved.episodeId));
    keys.add(buildMaxEpisodeWatchUrl(resolved.episodeId).toLowerCase());
    if (resolved.showId) {
      keys.add(buildMaxEpisodeWatchUrl(resolved.episodeId, resolved.showId).toLowerCase());
      keys.add(`${MAX_WATCH_ORIGIN}/video/watch/${resolved.episodeId}/${resolved.showId}`.toLowerCase());
      keys.add(`${MAX_WATCH_ORIGIN}/video/watch/${resolved.showId}/${resolved.episodeId}`.toLowerCase());
    }
  }

  if (resolved?.firstUuid) keys.add(normalizeMaxId(resolved.firstUuid));
  if (resolved?.secondUuid) keys.add(normalizeMaxId(resolved.secondUuid));

  const videoSlug = extractVideoSlug(pageUrl, showMaxIdHint);
  if (videoSlug) keys.add(videoSlug);

  const urnId = extractPlayerEpisodeUrn(pageUrl);
  if (urnId) keys.add(urnId);

  return keys;
}

function isCurrentEpisode(episodeUrl, currentKeys, showMaxIdHint = null) {
  const normalized = normalizeEpisodeUrl(episodeUrl).toLowerCase();
  if (currentKeys.has(normalized)) return true;

  const episodeId = getMaxEpisodeIdFromUrl(episodeUrl, showMaxIdHint);
  if (episodeId && currentKeys.has(normalizeMaxId(episodeId))) return true;

  const slug = extractVideoSlug(episodeUrl, showMaxIdHint);
  if (slug && currentKeys.has(slug)) return true;

  return false;
}

function clickElement(el) {
  const target = el.closest('button, [role="tab"], [role="button"]') || el;
  target.scrollIntoView({ block: 'center', inline: 'center' });
  target.focus({ preventScroll: true });
  target.click();
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
}

function seasonNumberFromLabel(label) {
  const match = (label || '').match(/Season\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

function getSeasonLabel(el) {
  if (!el) return null;
  const blob = `${el.textContent || ''} ${el.getAttribute('aria-label') || ''}`.replace(/\s+/g, ' ');
  const match = blob.match(/Season\s+\d+/i);
  return match ? match[0].replace(/\s+/g, ' ') : null;
}

function isInsideDropdownList(el) {
  return !!el.closest('[role="listbox"], [role="menu"], [data-radix-popper-content-wrapper]');
}

function findSeasonDropdownButton() {
  const prioritySelectors = [
    '[role="combobox"]',
    'button[aria-haspopup="listbox"]',
    'button[aria-haspopup="true"]',
    'button[aria-expanded]',
  ];

  for (const selector of prioritySelectors) {
    for (const el of document.querySelectorAll(selector)) {
      const label = getSeasonLabel(el);
      if (label && !isInsideDropdownList(el)) {
        const btn = el.closest('button') || el;
        console.log(
          `[Shufflr] findSeasonDropdownButton: found via "${selector}" — ` +
          `"${label}" <${btn.tagName.toLowerCase()}>`
        );
        return { label, el: btn };
      }
    }
  }

  for (const el of document.querySelectorAll('button')) {
    const label = getSeasonLabel(el);
    if (label && !isInsideDropdownList(el)) {
      console.log(
        `[Shufflr] findSeasonDropdownButton: found via button text — ` +
        `"${label}" <${el.tagName.toLowerCase()}>`
      );
      return { label, el };
    }
  }

  console.log('[Shufflr] findSeasonDropdownButton: FAIL — no dropdown button found');
  return null;
}

function hasOpenSeasonDropdownOptions() {
  const optionSelectors = [
    '[role="listbox"] [role="option"]',
    '[role="menu"] [role="menuitem"]',
    '[role="listbox"] button',
    '[role="menu"] button',
    '[role="listbox"] li',
  ];

  for (const selector of optionSelectors) {
    for (const el of document.querySelectorAll(selector)) {
      const clickable = el.closest('button, [role="option"], [role="menuitem"], li') || el;
      if (getSeasonLabel(clickable)) return true;
    }
  }

  for (const el of document.querySelectorAll('button, [role="option"], [role="menuitem"], li')) {
    if (!isInsideDropdownList(el)) continue;
    if (getSeasonLabel(el)) return true;
  }

  return false;
}

function findSeasonDropdownOptions() {
  const byLabel = new Map();
  const optionSelectors = [
    '[role="listbox"] [role="option"]',
    '[role="menu"] [role="menuitem"]',
    '[role="listbox"] button',
    '[role="menu"] button',
    '[role="listbox"] li',
  ];

  const tryAdd = (el, source) => {
    const clickable = el.closest('button, [role="option"], [role="menuitem"], li') || el;
    const label = getSeasonLabel(clickable);
    if (!label || byLabel.has(label)) return;
    byLabel.set(label, { label, el: clickable, source });
  };

  for (const selector of optionSelectors) {
    document.querySelectorAll(selector).forEach(el => tryAdd(el, selector));
  }

  if (!byLabel.size) {
    document.querySelectorAll('button, [role="option"], [role="menuitem"], li').forEach(el => {
      if (!isInsideDropdownList(el)) return;
      tryAdd(el, 'fallback-inside-list');
    });
  }

  const options = Array.from(byLabel.values())
    .sort((a, b) => seasonNumberFromLabel(a.label) - seasonNumberFromLabel(b.label));

  console.log(`[Shufflr] findSeasonDropdownOptions: ${options.length} options in open dropdown`);
  options.forEach((opt, i) => {
    console.log(
      `[Shufflr] findSeasonDropdownOptions: [${i + 1}/${options.length}] ` +
      `"${opt.label}" via ${opt.source} <${opt.el.tagName.toLowerCase()}>`
    );
  });

  return options;
}

function episodeHrefSetKey(links) {
  return (links || []).slice().sort().join('\n');
}

/** Quiet href scrape for polling — same selectors/normalization as extractEpisodeLinksFromPage. */
function getEpisodeWatchHrefs() {
  const seen = new Set();
  const links = [];
  for (const a of document.querySelectorAll('a[href*="/video/watch/"]')) {
    const href = a.href;
    if (!href || href.includes('javascript')) continue;
    const normalized = normalizeEpisodeUrl(href);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    links.push(normalized);
  }
  return links;
}

async function waitForPollCondition(checkFn, timeoutMs, intervalMs = 100) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (!isChromeContextValid()) return false;
    if (checkFn()) return true;
    await wait(intervalMs);
  }
  return !!checkFn();
}

async function waitForShowPageScrapeReady(timeoutMs = 3000) {
  console.log('[Shufflr] Polling for show page episode links or season dropdown...');
  const ready = await waitForPollCondition(
    () => getEpisodeWatchHrefs().length > 0 || !!findSeasonDropdownButton(),
    timeoutMs
  );
  console.log(`[Shufflr] Show page scrape ready: ${ready}`);
  return ready;
}

async function waitForSeasonEpisodeLinks(previousLinks, { isFirstSeason, timeoutMs = 3000 } = {}) {
  const previousKey = episodeHrefSetKey(previousLinks || []);
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (!isChromeContextValid()) break;
    const links = getEpisodeWatchHrefs();
    const nonEmpty = links.length > 0;
    const changed = episodeHrefSetKey(links) !== previousKey;
    if (nonEmpty && (isFirstSeason || changed)) return links;
    await wait(100);
  }

  return getEpisodeWatchHrefs();
}

async function openSeasonDropdown(stepLabel) {
  console.log(`[Shufflr] ${stepLabel}: finding season dropdown button...`);
  const dropdown = findSeasonDropdownButton();
  if (!dropdown) return false;

  console.log(`[Shufflr] ${stepLabel}: clicking dropdown button "${dropdown.label}"...`);
  clickElement(dropdown.el);
  console.log(`[Shufflr] ${stepLabel}: click dispatched`);

  console.log(`[Shufflr] ${stepLabel}: polling for season options...`);
  const opened = await waitForPollCondition(() => hasOpenSeasonDropdownOptions(), 1500);
  console.log(`[Shufflr] ${stepLabel}: dropdown open poll complete — options=${opened}`);
  return opened;
}

async function collectEpisodesFromAllSeasons() {
  const allEpisodes = new Set();
  console.log('[Shufflr] === collectEpisodesFromAllSeasons: START ===');

  const addLinks = (links, stepLabel) => {
    console.log(`[Shufflr] ${stepLabel}: scanning DOM for episode links...`);
    const before = allEpisodes.size;
    links.forEach((link, j) => {
      const isNew = !allEpisodes.has(link);
      allEpisodes.add(link);
      console.log(`[Shufflr] ${stepLabel}: link ${j + 1} ${isNew ? '(new)' : '(dup)'} → ${link}`);
    });
    console.log(
      `[Shufflr] ${stepLabel}: ${links.length} on page, +${allEpisodes.size - before} new, master total ${allEpisodes.size}`
    );
  };

  console.log('[Shufflr] Step 1: collecting episodes from default visible season...');
  const defaultLinks = extractEpisodeLinksFromPage();
  addLinks(defaultLinks, 'Step 1 default season');
  let lastSeasonLinks = defaultLinks;

  let dropdownReady = false;
  for (let attempt = 1; attempt <= 8; attempt++) {
    console.log(`[Shufflr] Step 2.${attempt}: trying to open season dropdown...`);
    dropdownReady = await openSeasonDropdown(`Step 2.${attempt}`);
    if (dropdownReady) break;
    console.log(`[Shufflr] Step 2.${attempt}: polling for dropdown button before retry...`);
    await waitForPollCondition(() => !!findSeasonDropdownButton(), 500);
  }

  if (!dropdownReady) {
    console.log('[Shufflr] Step 3: SKIPPED — could not open season dropdown');
    console.log(`[Shufflr] Step 4: total unique episode count = ${allEpisodes.size}`);
    console.log('[Shufflr] === collectEpisodesFromAllSeasons: END ===');
    return Array.from(allEpisodes);
  }

  console.log('[Shufflr] Step 3: reading season options from open dropdown...');
  const seasonOptions = findSeasonDropdownOptions();

  if (!seasonOptions.length) {
    console.log('[Shufflr] Step 4: FAIL — dropdown open but no season options found');
    console.log(`[Shufflr] Step 5: total unique episode count = ${allEpisodes.size}`);
    console.log('[Shufflr] === collectEpisodesFromAllSeasons: END ===');
    return Array.from(allEpisodes);
  }

  console.log(`[Shufflr] Step 4: will click ${seasonOptions.length} season options`);

  for (let i = 0; i < seasonOptions.length; i++) {
    const sub = `5.${i + 1}`;
    const { label } = seasonOptions[i];

    if (i > 0) {
      console.log(`[Shufflr] Step ${sub}a: reopening dropdown before next season...`);
      const reopened = await openSeasonDropdown(`Step ${sub}a`);
      if (!reopened) {
        console.log(`[Shufflr] Step ${sub}a: FAIL — could not reopen dropdown, skipping "${label}"`);
        continue;
      }
    }

    console.log(`[Shufflr] Step ${sub}b: finding option "${label}" in dropdown...`);
    const freshOptions = findSeasonDropdownOptions();
    const option = freshOptions.find(opt => opt.label === label);
    if (!option) {
      console.log(`[Shufflr] Step ${sub}b: FAIL — "${label}" not found in dropdown, skipping`);
      continue;
    }
    console.log(
      `[Shufflr] Step ${sub}b: found option <${option.el.tagName.toLowerCase()}> "${label}"`
    );

    console.log(`[Shufflr] Step ${sub}c: clicking season option ${i + 1}/${seasonOptions.length} "${label}"...`);
    clickElement(option.el);
    console.log(`[Shufflr] Step ${sub}c: click dispatched`);

    console.log(`[Shufflr] Step ${sub}d: polling for season episode links (max 3s)...`);
    lastSeasonLinks = await waitForSeasonEpisodeLinks(lastSeasonLinks, { isFirstSeason: i === 0 });
    console.log(`[Shufflr] Step ${sub}d: poll complete — ${lastSeasonLinks.length} link(s)`);

    console.log(`[Shufflr] Step ${sub}e: collecting episode links for "${label}"...`);
    addLinks(extractEpisodeLinksFromPage(), `Step ${sub}e "${label}"`);
  }

  const deduped = Array.from(allEpisodes);
  console.log(`[Shufflr] Step 6: all seasons done — total unique episode count = ${deduped.length}`);
  deduped.forEach((url, i) => console.log(`[Shufflr] Step 6: master[${i + 1}] ${url}`));
  console.log('[Shufflr] === collectEpisodesFromAllSeasons: END ===');
  return deduped;
}

function extractEpisodeLinksFromPage() {
  const seen = new Set();
  const links = [];
  const anchors = document.querySelectorAll('a[href*="/video/watch/"]');

  console.log(`[Shufflr] extractEpisodeLinksFromPage: ${anchors.length} anchors matching a[href*="/video/watch/"]`);

  anchors.forEach((a, i) => {
    const href = a.href;
    if (!href || href.includes('javascript')) return;

    const normalized = normalizeEpisodeUrl(href);
    const isNew = !seen.has(normalized);
    if (isNew) {
      seen.add(normalized);
      links.push(normalized);
    }
    console.log(`[Shufflr] extractEpisodeLinksFromPage: [${i + 1}] ${isNew ? '(new)' : '(dup)'} → ${normalized}`);
  });

  console.log(`[Shufflr] extractEpisodeLinksFromPage: ${links.length} unique /video/watch/ links`);
  return links;
}

function logCollectedEpisodeLinks(episodes) {
  if (!episodes || episodes.length === 0) return;
  console.log(`[Shufflr] Collected episode URLs (${episodes.length}):`);
  episodes.forEach((href, i) => {
    console.log(`[Shufflr] ${i + 1}. ${href}`);
  });
}

function extractVideoLinks() {
  return extractEpisodeLinksFromPage();
}

function wait(ms) {
  if (!isChromeContextValid()) return Promise.resolve();
  return new Promise(resolve => {
    setTimeout(() => {
      if (!isChromeContextValid()) {
        resolve();
        return;
      }
      resolve();
    }, ms);
  });
}

function showToast(message) {
  if (!isChromeContextValid()) return;
  const toast = document.getElementById('shufflr-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(window._shufflrToastTimer);
  window._shufflrToastTimer = setTimeout(() => {
    if (!isChromeContextValid()) return;
    toast.classList.remove('show');
  }, 3500);
}

let showPageAutoplayPollTimer = null;

// Warm the CMS episode cache on show pages when standalone shuffle is active.
async function prefetchShowPageEpisodeCacheIfStandalone() {
  if (!isChromeContextValid()) return;
  if (!location.href.includes('/show/')) return;
  if (!shufflrActive || armedPlaylistCached || orderedEpisodesCached) return;

  const active = await getActivePlaylistFromStorage();
  if (isArmedPlaylistOwnedByThisTab(active)) return;

  const showId = extractShowId(location.href) || extractMaxShowUuidFromUrl(location.href);
  if (!showId) return;

  const cached = await getCachedEpisodes(showId);
  if (cached?.length) return;

  void collectEpisodesViaApi(location.href);
}

function findResumeOrWatchButton() {
  const candidates = document.querySelectorAll('button, a[role="button"], [role="button"]');
  for (const el of candidates) {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.includes('Resume')) return el;
  }
  for (const el of candidates) {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.includes('Watch')) return el;
  }
  return null;
}

// Ordered-mode show-page autoplay: shuffle cop sets shufflr_autoplay_pending before navigating
// to a show page; on load we clear the flag and poll once for Max's Resume/Watch button.
async function maybeAutoClickShowPageResume() {
  if (!isChromeContextValid()) return;
  if (showPageAutoplayPollTimer) return;
  if (!location.href.includes('/show/')) return;
  if (sessionStorage.getItem(SHUFFLR_AUTOPLAY_PENDING_KEY) !== 'true') return;

  const settings = await readShuffleSettings();
  if (!settings.orderedEpisodes) return;

  const active = await getActivePlaylistFromStorage();
  if (!isArmedPlaylistOwnedByThisTab(active)) return;

  sessionStorage.removeItem(SHUFFLR_AUTOPLAY_PENDING_KEY);

  const startedAt = Date.now();
  const maxMs = 5000;

  showPageAutoplayPollTimer = setInterval(() => {
    if (!isChromeContextValid()) {
      clearInterval(showPageAutoplayPollTimer);
      showPageAutoplayPollTimer = null;
      return;
    }

    const button = findResumeOrWatchButton();
    if (button) {
      clearInterval(showPageAutoplayPollTimer);
      showPageAutoplayPollTimer = null;
      try {
        button.click();
      } catch {}
      return;
    }

    if (Date.now() - startedAt >= maxMs) {
      clearInterval(showPageAutoplayPollTimer);
      showPageAutoplayPollTimer = null;
    }
  }, 300);
}

// Max tabs: accept SHUFFLR_SYNC_PLAYLISTS from web app and refresh storage-backed UI.
function installMaxPlaylistSyncListener() {
  if (IS_SHUFFLR_WEB_APP) return;
  if (!isChromeContextValid()) return;

  try {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== 'SHUFFLR_SYNC_PLAYLISTS') return;
      const playlists = message.payload || message.playlists || [];
      applySyncedPlaylists(playlists, { syncToWebApp: false }).then(() => {
        console.log('[Shufflr] Playlists updated from web app');
        sendResponse({ ok: true });
      });
      return true;
    });
  } catch (err) {
    if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
  }

  try {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes[SHUFFLR_PLAYLISTS_KEY]) return;
      const newValue = changes[SHUFFLR_PLAYLISTS_KEY].newValue;
      if (!Array.isArray(newValue)) return;
      dropdownPlaylists = newValue;
      const dropdown = document.getElementById('shufflr-playlist-dropdown');
      if (dropdown?.classList.contains('open')) {
        populatePlaylistDropdown();
      }
    });
  } catch (err) {
    if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
  }
}

function normalizePlaylistShowMatchName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function playlistShowMatchesCurrentPage(show, currentUrl) {
  const showMaxId = show.maxId || show.maxShowId || show.max_id;
  if (showMaxId && currentUrl.includes(String(showMaxId))) return true;

  const showName = normalizePlaylistShowMatchName(getPlaylistShowTitle(show));
  if (!showName) return false;

  const pageTitle = normalizePlaylistShowMatchName(document.title);
  if (!pageTitle) return false;

  if (pageTitle.includes(showName)) return true;
  const words = showName.split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every(word => pageTitle.includes(word));
}

async function updatePlaylistShowUrl() {
  if (!isChromeContextValid()) return;
  const currentUrl = window.location.href.split('?')[0];

  // Only run on show pages (not episode pages, home, search, etc.)
  if (!currentUrl.includes('/show/')) return;

  const playlists = await readPlaylistsFromStorage();
  if (!Array.isArray(playlists) || !playlists.length) return;

  let updated = false;

  for (const playlist of playlists) {
    for (const show of playlist.shows || []) {
      if (!playlistShowMatchesCurrentPage(show, currentUrl)) continue;
      if (show.url !== currentUrl) {
        show.url = currentUrl;
        updated = true;
      }
    }
  }

  if (updated) {
    await setShufflrPlaylistsInStorage(playlists, { syncToWebApp: true });
    console.log('[Shufflr] Updated Max URL for matched playlist show(s)');
  }
}

// ── INIT ────────────────────────────────────────────────────────────────────
async function clearMaxStandaloneLaunchKeys() {
  if (!isChromeContextValid()) return;
  await chromeStorageLocalRemove(SHUFFLR_LAUNCH_SHOW_URL_KEY);
  await chromeStorageLocalRemove(SHUFFLR_LAUNCH_STANDALONE_KEY);
  await chromeStorageLocalRemove(SHUFFLR_LAUNCH_STANDALONE_AT_KEY);
  await chromeStorageLocalRemove(SHUFFLR_LAUNCH_INTENT_KEY);
}

/**
 * Detect + consume a fresh standalone web launch targeting this Max show page.
 * Returns { maxId, launchUrl, launchIntent } or null.
 */
async function consumeMaxStandaloneLaunchIfMatching() {
  if (!isChromeContextValid() || !IS_MAX) return null;
  if (window.__shufflrMaxStandaloneLaunchConsumed) return null;

  const result = await chrome.storage.local.get([
    SHUFFLR_LAUNCH_SHOW_URL_KEY,
    SHUFFLR_LAUNCH_STANDALONE_KEY,
    SHUFFLR_LAUNCH_STANDALONE_AT_KEY,
    SHUFFLR_LAUNCH_INTENT_KEY,
  ]);
  const launchUrl = result[SHUFFLR_LAUNCH_SHOW_URL_KEY];
  const isStandalone = result[SHUFFLR_LAUNCH_STANDALONE_KEY] === true;
  if (!isStandalone || !launchUrl) return null;

  const currentUrl = window.location.href.split('?')[0];
  let launchPath = '';
  try {
    launchPath = new URL(launchUrl).pathname;
  } catch {
    return null;
  }
  if (!launchPath || !currentUrl.includes(launchPath)) return null;

  let launchedAt = Number(result[SHUFFLR_LAUNCH_STANDALONE_AT_KEY]);
  if (!Number.isFinite(launchedAt) || launchedAt <= 0) {
    launchedAt = Date.now();
  } else if (Date.now() - launchedAt > STANDALONE_LAUNCH_MAX_AGE_MS) {
    console.log('[Shufflr] Max standalone launch expired — clearing');
    await clearMaxStandaloneLaunchKeys();
    return null;
  }

  const launchMaxId = extractMaxShowUuidFromUrl(launchUrl)
    || extractMaxShowUuidFromUrl(location.href)
    || extractShowId(location.href);
  if (!launchMaxId) return null;

  if (launchMaxId) {
    const blockedKey = `shufflr_blocked_seasons_${launchMaxId}`;
    const blockedResult = await chrome.storage.local.get(blockedKey);
    const blockedSeasons = blockedResult[blockedKey];
    if (Array.isArray(blockedSeasons)) {
      try {
        localStorage.setItem(blockedKey, JSON.stringify(blockedSeasons));
      } catch { /* ignore */ }
    }
    await chromeStorageLocalRemove(blockedKey);
  }

  const launchIntent = result[SHUFFLR_LAUNCH_INTENT_KEY] === 'single' ? 'single' : 'mode';

  window.__shufflrMaxStandaloneLaunchConsumed = true;
  await clearMaxStandaloneLaunchKeys();

  console.log('[Shufflr] Consumed Max standalone launch for show', launchMaxId, `(intent=${launchIntent})`);
  return { maxId: launchMaxId, launchUrl, launchIntent };
}

/** Auto-start an episode of the current Max show page (cache → API → DOM fallback). */
async function autoStartMaxShowPageEpisode(source = 'standalone-launch') {
  if (!isChromeContextValid()) return false;
  if (location.href.includes('/show/')) {
    saveShowPageUrl(location.href);
  }
  const showPage = knownShowPageUrl || sessionStorage.getItem(SHUFFLR_SHOW_PAGE_KEY) || location.href.split('?')[0];
  if (!showPage || !String(showPage).includes('/show/')) {
    console.log(`[Shufflr] Max auto-start aborted — no show page (${source})`);
    return false;
  }
  saveShowPageUrl(showPage);

  showToast('Starting...');
  console.log(`[Shufflr] Max auto-start episode via ${source}`);
  await shuffleToRandomEpisode();
  return true;
}

/**
 * Auto-start after a web-app standalone launch. Playlist armed flows take priority.
 * Mode-following launches read shuffle settings first and adopt ALL immediately when set.
 */
async function maybeAutoStartMaxStandaloneLaunch() {
  if (!isChromeContextValid() || !IS_MAX) return false;
  if (!location.href.includes('/show/') && !location.href.includes('/video/')) return false;

  // Armed playlist owned by this tab wins — do not override with standalone.
  const existing = await getActivePlaylistFromStorage();
  if (isArmedPlaylistOwnedByThisTab(existing)) return false;

  const launch = await consumeMaxStandaloneLaunchIfMatching();
  if (!launch?.maxId) return false;

  // Never clear another tab's owned armed playlist — leave storage alone if not ours.
  armedPlaylistCached = false;

  const settings = await readShuffleSettings();
  shuffleModeCached = settings.shuffleMode;
  orderedEpisodesCached = !!settings.orderedEpisodes;

  if (location.href.includes('/show/')) {
    saveShowPageUrl(location.href);
  }

  // Your Shows card Play → pin + single-show auto-start (ignore global ALL).
  if (launch.launchIntent === 'single') {
    const title = getCurrentShowTitle() || launch.maxId;
    setMaxSessionPin(launch.maxId, title);
    await setStandaloneShuffleEnabled(true);
    shufflrActive = true;
    if (hasShufflrButtonInDom()) updateShuffleUI(title);
    console.log('[Shufflr] Max standalone launch → pinned single-show auto-start');
    await autoStartMaxShowPageEpisode('standalone-launch-single');
    return true;
  }

  // Power-button / mode-following launch — clear pin and follow global mode.
  clearMaxSessionPin();

  if (settings.shuffleMode === 'all') {
    const synthetic = await armMaxYourShowsAllModeSession({
      seedLastPlayedShow: false,
      ensureMaxId: launch.maxId,
      ensureTitle: getCurrentShowTitle() || launch.maxId,
    });
    if (!synthetic) {
      console.log('[Shufflr] ALL mode launch: no Your Shows — falling back to single-show');
      await setStandaloneShuffleEnabled(true);
      shufflrActive = true;
      const title = getCurrentShowTitle() || launch.maxId;
      if (hasShufflrButtonInDom()) updateShuffleUI(title);
      await autoStartMaxShowPageEpisode('standalone-launch-all-fallback');
      return true;
    }
    console.log('[Shufflr] Max standalone launch → ALL mode auto-start');
    await autoStartMaxShowPageEpisode('standalone-launch-all');
    return true;
  }

  await setStandaloneShuffleEnabled(true);
  shufflrActive = true;
  const title = getCurrentShowTitle() || launch.maxId;
  if (hasShufflrButtonInDom()) updateShuffleUI(title);
  console.log('[Shufflr] Max standalone launch → single-show auto-start (mode)');
  await autoStartMaxShowPageEpisode('standalone-launch-mode');
  return true;
}

async function checkForLaunchStandaloneShow() {
  if (!isChromeContextValid() || !IS_MAX) return;
  const started = await maybeAutoStartMaxStandaloneLaunch();
  if (started) {
    setTimeout(() => {
      if (!isChromeContextValid()) return;
      tryInjectButton();
    }, 1500);
    return;
  }

  // No fresh launch — leave page as-is (manual visits do not auto-start).
}

async function checkForLaunchPlaylist() {
  if (!isChromeContextValid()) return;
  const result = await chrome.storage.local.get([
    SHUFFLR_ACTIVE_PLAYLIST_KEY,
    SHUFFLR_LAUNCH_SHOW_URL_KEY,
    SHUFFLR_LAUNCH_STANDALONE_KEY,
  ]);
  // Standalone / Your Shows launches must never be treated as playlist Play.
  if (result[SHUFFLR_LAUNCH_STANDALONE_KEY] === true) return;

  const launchUrl = result[SHUFFLR_LAUNCH_SHOW_URL_KEY];
  const storedPlaylist = result[SHUFFLR_ACTIVE_PLAYLIST_KEY];
  if (!storedPlaylist || !launchUrl) return;

  const currentUrl = window.location.href.split('?')[0];
  let launchPath = '';
  try {
    launchPath = new URL(launchUrl).pathname;
  } catch {
    return;
  }
  if (!launchPath || !currentUrl.includes(launchPath)) return;

  await chromeStorageLocalRemove(SHUFFLR_LAUNCH_SHOW_URL_KEY);

  const playlists = await readPlaylistsFromStorage();
  let playlistIndex = playlists.findIndex(p => (
    (storedPlaylist.id && p.id === storedPlaylist.id)
    || (storedPlaylist.name && p.name === storedPlaylist.name)
  ));
  if (playlistIndex < 0) playlistIndex = 0;

  const prepared = preparePlaylistForShuffle(storedPlaylist);
  if (!prepared.shows.length) return;

  const pendingFirstShowId = extractMaxShowUuidFromUrl(location.href)
    || extractShowId(location.href)
    || null;
  clearMaxSessionPin(); // playlist arming in this tab replaces any single-show pin
  const armed = await saveArmedActivePlaylist(prepared, playlistIndex, {
    pendingFirstShow: true,
    pendingFirstShowId,
  });
  await setStandaloneShuffleEnabled(false);
  shufflrActive = true;
  armedPlaylistCached = true;

  void maybeAutoStartMaxArmedPlaylistOnShowPage(armed);

  setTimeout(() => {
    if (!isChromeContextValid()) return;
    tryInjectButton();
  }, 1500);
}


function installCrunchyrollUrlObserver() {
  if (window.__shufflrCrunchyrollUrlObserver) return;
  window.__shufflrCrunchyrollUrlObserver = true;

  let lastCrunchyrollUrl = location.href;
  let reinjectTimer = null;

  function routeCrunchyrollPageAfterUrlChange() {
    if (!isCrunchyroll || !isChromeContextValid()) return;
    if (location.href === lastCrunchyrollUrl) return;
    lastCrunchyrollUrl = location.href;

    removeShufflrUI();
    teardownCrunchyrollEpisodeEndWatcher();
    if (reinjectTimer) {
      clearTimeout(reinjectTimer);
      reinjectTimer = null;
    }

    if (!isCrunchyrollWatchPage() && !isCrunchyrollSeriesPage()) return;

    reinjectTimer = setTimeout(() => {
      reinjectTimer = null;
      if (!isChromeContextValid()) return;
      if (!isCrunchyrollWatchPage() && !isCrunchyrollSeriesPage()) return;
      console.log('[Shufflr] Crunchyroll URL changed — re-injecting');
      void tryInjectButton();
      restoreCrunchyrollShuffleSession();
    }, 2500);
  }

  const observer = new MutationObserver(routeCrunchyrollPageAfterUrlChange);
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    }, { once: true });
  }

  window.addEventListener('popstate', routeCrunchyrollPageAfterUrlChange);
  // Poll location — Crunchyroll SPA pushState runs in the page world and won't hit our history hooks.
  setInterval(routeCrunchyrollPageAfterUrlChange, 500);
}

// ── TUBI HELPERS (rebuild step 2: single-show shuffle) ─────────────────────

let tubiEpisodeEndTriggered = false;
let tubiTimeupdateVideo = null;
let tubiTimeupdateHandler = null;
let tubiSeekedHandler = null;
let tubiEndedHandler = null;
let tubiWatcherIdRetryCount = 0;
let tubiWatcherIdRetryTimer = null;
let tubiUpNextObserver = null;
let tubiUpNextPollTimer = null;
/** In-memory: this page load's landing was already judged — do not re-run the cop. */
let tubiLandingVerifiedThisPageLoad = false;
const TUBI_COP_MIN_INTERVAL_MS = 3000;
const TUBI_LAST_COP_AT_KEY = 'shufflr_tubi_last_cop_at';

function isTubiSeriesPage() {
  return IS_TUBI && location.pathname.includes('/series/');
}

function isTubiEpisodePage() {
  return IS_TUBI && location.pathname.includes('/tv-shows/');
}

function isTubiInjectablePage() {
  return isTubiSeriesPage() || isTubiEpisodePage();
}

function isTubiUnresolvedSeriesId(seriesId) {
  if (seriesId == null || seriesId === '') return true;
  return String(seriesId).startsWith('vid-');
}

function isTubiReliableSeriesId(seriesId) {
  return !isTubiUnresolvedSeriesId(seriesId);
}

function getTubiActiveShuffleSeriesId() {
  try {
    return sessionStorage.getItem(TUBI_SHUFFLE_ACTIVE_KEY) || null;
  } catch {
    return null;
  }
}

function setTubiActiveShuffleSeriesId(seriesId) {
  if (!isTubiReliableSeriesId(seriesId)) {
    console.log('[Shufflr] Tubi: refusing to write unresolved/vid-* as active series id', seriesId);
    return false;
  }
  sessionStorage.setItem(TUBI_SHUFFLE_ACTIVE_KEY, String(seriesId));
  return true;
}

function isTubiShuffleActive() {
  return !!getTubiActiveShuffleSeriesId();
}

function isTubiShuffleActiveForShow(seriesId) {
  const activeSeriesId = getTubiActiveShuffleSeriesId();
  if (!activeSeriesId) return false;
  // Unresolved page id on a watch landing — still treat as active for this tab.
  if (!seriesId) return true;
  return String(activeSeriesId) === String(seriesId);
}

function getTubiEpisodeIdFromUrl(url = location.href) {
  try {
    const match = new URL(url, location.origin).pathname.match(/\/tv-shows\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function markTubiExpectedLanding(urlOrEpisodeId) {
  if (urlOrEpisodeId == null || urlOrEpisodeId === '') return;
  const id = String(urlOrEpisodeId).includes('/')
    ? getTubiEpisodeIdFromUrl(String(urlOrEpisodeId))
    : String(urlOrEpisodeId);
  if (!id) return;
  try {
    sessionStorage.setItem(TUBI_EXPECTED_LANDING_KEY, id);
  } catch { /* ignore */ }
}

function consumeTubiExpectedLanding() {
  try {
    const value = sessionStorage.getItem(TUBI_EXPECTED_LANDING_KEY);
    sessionStorage.removeItem(TUBI_EXPECTED_LANDING_KEY);
    return value || null;
  } catch {
    return null;
  }
}

function peekTubiExpectedLanding() {
  try {
    return sessionStorage.getItem(TUBI_EXPECTED_LANDING_KEY) || null;
  } catch {
    return null;
  }
}

function getTubiShowTitle() {
  const selectors = [
    'h1',
    '[data-testid="title"]',
    '[data-testid="video-title"]',
    '[class*="video-title"]',
    'main h1',
  ];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.replace(/\s+/g, ' ').trim();
    if (text) return text;
  }
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  return ogTitle?.trim() || null;
}

function formatTubiEpisodeLabel(season, episode) {
  return `S${String(season).padStart(2, '0')}:E${String(episode).padStart(2, '0')}`;
}

function tubiEpisodeCacheKey(showId) {
  return `${TUBI_EPISODE_CACHE_PREFIX}${showId}`;
}

function extractBalancedBraceObject(text, openBraceIndex) {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = openBraceIndex; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return text.slice(openBraceIndex, i + 1);
    }
  }
  return null;
}

function parseTubiJsObjectLiteral(raw) {
  if (!raw) return null;
  let text = raw.trim();
  if (text.endsWith(';')) text = text.slice(0, -1).trim();
  text = text.replace(/\bundefined\b/g, 'null');
  text = text.replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(text);
}

function readTubiReactQueryStateFromScripts() {
  const marker = 'window.__REACT_QUERY_STATE__';
  const sources = [];
  for (const script of document.querySelectorAll('script:not([src])')) {
    const text = script.textContent;
    if (text?.includes(marker)) sources.push(text);
  }
  if (!sources.length) {
    const html = document.documentElement?.innerHTML;
    if (html?.includes(marker)) sources.push(html);
  }
  for (const text of sources) {
    const markerIndex = text.indexOf(marker);
    if (markerIndex === -1) continue;
    const eqIndex = text.indexOf('=', markerIndex);
    if (eqIndex === -1) continue;
    let braceIndex = eqIndex + 1;
    while (braceIndex < text.length && text[braceIndex] !== '{') braceIndex++;
    if (text[braceIndex] !== '{') continue;
    const objectText = extractBalancedBraceObject(text, braceIndex);
    if (!objectText) continue;
    try {
      return parseTubiJsObjectLiteral(objectText);
    } catch { /* try next */ }
  }
  return null;
}

function getTubiReactQueryState() {
  return readTubiReactQueryStateFromScripts();
}

function readTubiSeriesIdFromReactQueryState() {
  const state = getTubiReactQueryState();
  if (!state?.queries?.length) return null;
  for (const query of state.queries) {
    const data = query?.state?.data;
    if (!data) continue;
    if (data.id && Array.isArray(data.seasons)) return String(data.id);
    if (data.series_id) return String(data.series_id);
    for (const season of data.seasons || []) {
      for (const episode of season.episodes || []) {
        if (episode?.series_id) return String(episode.series_id);
      }
    }
  }
  return null;
}

function getTubiSeriesId(url = location.href) {
  try {
    const path = new URL(url, location.origin).pathname;
    const seriesMatch = path.match(/\/series\/(\d+)/);
    if (seriesMatch) return seriesMatch[1];
  } catch { /* ignore */ }
  const fromReactQuery = readTubiSeriesIdFromReactQueryState();
  if (fromReactQuery) return fromReactQuery;
  return null;
}

function getTubiShowIdFromUrl(url = location.href) {
  return getTubiSeriesId(url);
}

/**
 * Series ID for Add / Create Playlist.
 * Series page: /series/{tubiId}/… from the URL.
 * Watch page: same resolver episode collection uses — getTubiSeriesId →
 * readTubiSeriesIdFromReactQueryState (React Query page data), never a title-slug guess.
 */
function getCurrentTubiSeriesId() {
  const id = getTubiSeriesId();
  return isTubiReliableSeriesId(id) ? String(id) : null;
}

/**
 * Real series URL only — current /series/ path, or a matching DOM link for this id.
 * Never invents a title slug.
 */
function getCurrentTubiSeriesUrl(seriesId) {
  const id = seriesId != null ? String(seriesId) : null;
  if (!id) return null;

  if (isTubiSeriesPage()) {
    try {
      const pathMatch = location.pathname.match(/\/series\/\d+(?:\/[^/?#]*)?/);
      if (pathMatch) return `https://tubitv.com${pathMatch[0]}`;
    } catch { /* ignore */ }
  }

  for (const anchor of document.querySelectorAll('a[href*="/series/"]')) {
    const href = anchor.getAttribute('href') || '';
    const match = href.match(/\/series\/(\d+)(?:\/[^/?#]*)?/);
    if (!match || match[1] !== id) continue;
    if (href.startsWith('http')) return href.split(/[?#]/)[0];
    return `https://tubitv.com${href.split(/[?#]/)[0]}`;
  }

  // ID-canonical series URL (no guessed slug).
  return `https://tubitv.com/series/${id}`;
}

function findTubiSeriesDataInReactQueryState(state) {
  if (!state?.queries?.length) return null;
  for (const query of state.queries) {
    const data = query?.state?.data;
    if (!Array.isArray(data?.seasons)) continue;
    if (data.seasons.some(season => Array.isArray(season?.episodes) && season.episodes.length)) {
      return data;
    }
  }
  return null;
}

function tubiEpisodeTitleSlug(title) {
  const match = (title || '').match(/\bS\d+\s*:?\s*E\d+\s*[-–—]\s*(.+)/i);
  const name = (match?.[1] || title || '').trim();
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildTubiEpisodeUrl(id, season, episode, title) {
  const seasonPart = String(season).padStart(2, '0');
  const episodePart = String(episode).padStart(2, '0');
  const slug = tubiEpisodeTitleSlug(title);
  const path = slug
    ? `s${seasonPart}-e${episodePart}-${slug}`
    : `s${seasonPart}-e${episodePart}`;
  return `https://tubitv.com/tv-shows/${id}/${path}`;
}

function parseTubiEpisodesFromPageState() {
  const state = getTubiReactQueryState();
  const seriesData = findTubiSeriesDataInReactQueryState(state);
  if (!seriesData?.seasons?.length) return [];
  const episodes = [];
  const seen = new Set();
  for (const season of seriesData.seasons) {
    const seasonNumber = Number(season?.number);
    if (!Number.isFinite(seasonNumber) || seasonNumber <= 0) continue;
    for (const episode of season.episodes || []) {
      const id = episode?.id;
      const episodeNumber = Number(episode?.num ?? episode?.episode_number);
      if (!id || !Number.isFinite(episodeNumber) || episodeNumber <= 0) continue;
      const title = (episode?.title || '').trim()
        || formatTubiEpisodeLabel(seasonNumber, episodeNumber);
      const url = buildTubiEpisodeUrl(id, seasonNumber, episodeNumber, title);
      if (seen.has(url)) continue;
      seen.add(url);
      episodes.push({ url, title, season: seasonNumber, episode: episodeNumber });
    }
  }
  return episodes;
}

function parseTubiEpisodeLink(anchor) {
  const href = anchor.href?.split('?')[0];
  if (!href || !/\/tv-shows\/\d+/i.test(href)) return null;
  const text = (anchor.textContent || '').replace(/\s+/g, ' ').trim();
  const textMatch = text.match(/\bS(\d+)\s*:?\s*E(\d+)\s*[-–—]\s*(.+)/i)
    || text.match(/\bS(\d+)\s*:?\s*E(\d+)\b/i);
  if (textMatch) {
    return {
      url: href,
      title: textMatch[3]?.trim() || text,
      season: Number(textMatch[1]),
      episode: Number(textMatch[2]),
    };
  }
  const slugMatch = href.match(/s(\d+)-e(\d+)/i);
  if (!slugMatch) return null;
  return {
    url: href,
    title: text || formatTubiEpisodeLabel(slugMatch[1], slugMatch[2]),
    season: Number(slugMatch[1]),
    episode: Number(slugMatch[2]),
  };
}

function collectTubiEpisodesFromCurrentDom() {
  const episodes = [];
  const seen = new Set();
  for (const anchor of document.querySelectorAll('a[href*="/tv-shows/"]')) {
    const parsed = parseTubiEpisodeLink(anchor);
    if (!parsed || seen.has(parsed.url)) continue;
    seen.add(parsed.url);
    episodes.push(parsed);
  }
  return episodes;
}

function mergeTubiEpisodes(existing, found) {
  const seen = new Set(existing.map(ep => ep.url));
  for (const ep of found) {
    if (seen.has(ep.url)) continue;
    seen.add(ep.url);
    existing.push(ep);
  }
  return existing;
}

async function collectTubiEpisodesFromSeasonDropdown() {
  let all = collectTubiEpisodesFromCurrentDom();
  let dropdownReady = false;
  for (let attempt = 1; attempt <= 8; attempt++) {
    dropdownReady = await openSeasonDropdown(`Tubi collect ${attempt}`);
    if (dropdownReady) break;
    await wait(500);
  }
  if (!dropdownReady) return all;
  const seasonOptions = findSeasonDropdownOptions();
  if (!seasonOptions.length) return all;
  for (let i = 0; i < seasonOptions.length; i++) {
    const { label } = seasonOptions[i];
    if (i > 0) {
      const reopened = await openSeasonDropdown(`Tubi season ${i + 1}`);
      if (!reopened) continue;
    }
    const freshOptions = findSeasonDropdownOptions();
    const option = freshOptions.find(opt => opt.label === label);
    if (!option) continue;
    clickElement(option.el);
    await wait(2000);
    mergeTubiEpisodes(all, collectTubiEpisodesFromCurrentDom());
  }
  return all;
}

async function collectTubiEpisodes() {
  const fromPageState = parseTubiEpisodesFromPageState();
  if (fromPageState.length) {
    console.log(`[Shufflr] Tubi: collected ${fromPageState.length} episode(s) via React Query state`);
    return fromPageState;
  }
  console.log('[Shufflr] Tubi: React Query state unavailable — falling back to season dropdown');
  const fromDropdown = await collectTubiEpisodesFromSeasonDropdown();
  console.log(`[Shufflr] Tubi: collected ${fromDropdown.length} episode(s) via season dropdown`);
  return fromDropdown;
}

async function getCachedTubiEpisodes(showId) {
  if (!isChromeContextValid() || !showId) return null;
  const entry = await storageLocalGet(tubiEpisodeCacheKey(showId));
  if (!entry?.cachedAt || !Array.isArray(entry.episodes) || !entry.episodes.length) return null;
  if (Date.now() - entry.cachedAt > EPISODE_CACHE_TTL_MS) return null;
  return entry.episodes;
}

async function setCachedTubiEpisodes(showId, episodes, showName) {
  if (!isChromeContextValid() || !showId) return;
  await storageLocalSet(tubiEpisodeCacheKey(showId), {
    showId,
    showName: showName || null,
    episodes,
    cachedAt: Date.now(),
  });
}

function pickRandomTubiEpisode(episodes, currentUrl = null) {
  if (!episodes?.length) return null;
  const normalizedCurrent = currentUrl?.split('?')[0] || null;
  const pool = normalizedCurrent
    ? episodes.filter(ep => ep.url !== normalizedCurrent)
    : episodes;
  const pickFrom = pool.length ? pool : episodes;
  return pickFrom[Math.floor(Math.random() * pickFrom.length)];
}

function updateTubiShuffleUI(showName) {
  const btn = document.getElementById('shufflr-btn');
  const label = document.getElementById('shufflr-label');
  const status = document.getElementById('shufflr-status');
  if (!btn || !label) return;
  btn.classList.add('active');
  label.textContent = 'ON';
  if (status) {
    let name = showName || getTubiShowTitle() || '';
    if (name === YOUR_SHOWS_ALL_MODE_NAME) name = 'Your Shows';
    status.textContent = name ? name.toUpperCase().slice(0, 24) : '';
  }
}

// ── Up Next suppression (built in from day one) ───────────────────────────

function isTubiUpNextOverlayText(text) {
  if (!text) return false;
  const t = String(text).replace(/\s+/g, ' ').trim();
  if (!t) return false;
  if (/\bstarting\s+in\s+\d+\s*s(?:ec(?:onds?)?)?\b/i.test(t)) return true;
  if (/\bup\s*next\b/i.test(t)) return true;
  return false;
}

function elementHasTubiUpNextContext(el) {
  let node = el;
  for (let depth = 0; node && depth < 10; depth += 1) {
    const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
    if (isTubiUpNextOverlayText(text)) return true;
    node = node.parentElement;
  }
  return false;
}

function isTubiUpNextDismissControl(el) {
  if (!el) return false;
  const label = `${el.textContent || ''} ${el.getAttribute?.('aria-label') || ''}`.replace(/\s+/g, ' ').trim();
  if (!label) return false;
  if (/^hide$/i.test(label)) return true;
  if (label.length <= 24 && /\bhide\b/i.test(label) && !/\bhide\s+ads?\b/i.test(label)) return true;
  return false;
}

function findTubiUpNextHideButton(root = document) {
  const nodes = root.querySelectorAll?.('button, [role="button"], a, span') || [];
  for (const el of nodes) {
    if (!isTubiUpNextDismissControl(el)) continue;
    return el.closest('button, [role="button"], a') || el;
  }
  return null;
}

function findTubiUpNextContainers(root = document.body) {
  if (!root?.querySelectorAll) return [];
  const found = new Set();
  const selectorHits = root.querySelectorAll?.(
    '[class*="UpNext"], [class*="up-next"], [class*="upNext"], [class*="NextEpisode"], [class*="next-episode"], [data-testid*="up-next"], [data-testid*="next-episode"], [aria-label*="Up Next"], [aria-label*="up next"], [aria-label*="Starting in"]'
  ) || [];
  for (const el of selectorHits) {
    if (isTubiUpNextOverlayText(el.textContent || '') || findTubiUpNextHideButton(el)) {
      found.add(el);
    }
  }
  const walkRoots = root === document.body || !document.body ? [root] : [root, document.body];
  for (const scope of walkRoots) {
    if (!scope?.querySelectorAll) continue;
    for (const el of scope.querySelectorAll('div, section, aside, article, [role="dialog"]')) {
      if (found.has(el)) continue;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length > 500) continue;
      if (!isTubiUpNextOverlayText(text)) continue;
      const hasHide = !!findTubiUpNextHideButton(el);
      const hasNextCta = /\b(play|watch|next|start)\b/i.test(text);
      if (hasHide || hasNextCta) found.add(el);
    }
  }
  return [...found];
}

function clickTubiUpNextHide(hideBtn) {
  if (!hideBtn) return false;
  const now = Date.now();
  const last = Number(hideBtn.dataset.shufflrTubiHideClickedAt || 0);
  if (now - last < 700) return false;
  hideBtn.dataset.shufflrTubiHideClickedAt = String(now);
  try {
    const opts = { bubbles: true, cancelable: true, view: window };
    if (typeof PointerEvent === 'function') {
      hideBtn.dispatchEvent(new PointerEvent('pointerdown', opts));
      hideBtn.dispatchEvent(new PointerEvent('pointerup', opts));
    }
    hideBtn.dispatchEvent(new MouseEvent('mousedown', opts));
    hideBtn.dispatchEvent(new MouseEvent('mouseup', opts));
    hideBtn.dispatchEvent(new MouseEvent('click', opts));
    if (typeof hideBtn.click === 'function') hideBtn.click();
    console.log('[Shufflr] Tubi Up Next dismissed');
    return true;
  } catch (err) {
    console.log('[Shufflr] Tubi Up Next: Hide click failed', err);
    return false;
  }
}

function neutralizeTubiUpNextContainer(container) {
  if (!container) return false;
  const hideBtn = findTubiUpNextHideButton(container);
  if (hideBtn && elementHasTubiUpNextContext(hideBtn)) {
    clickTubiUpNextHide(hideBtn);
  }
  if (container.dataset?.shufflrTubiUpNextSuppressed === '1') return true;
  try {
    container.style.setProperty('display', 'none', 'important');
    container.style.setProperty('visibility', 'hidden', 'important');
    container.style.setProperty('pointer-events', 'none', 'important');
    container.setAttribute('aria-hidden', 'true');
    container.dataset.shufflrTubiUpNextSuppressed = '1';
  } catch { /* ignore */ }
  try {
    for (const link of container.querySelectorAll('a[href*="/tv-shows/"]')) {
      if (link.dataset.shufflrTubiNextBlocked === '1') continue;
      link.dataset.shufflrTubiNextBlocked = '1';
      link.addEventListener('click', (event) => {
        if (!isTubiShuffleActive()) return;
        event.preventDefault();
        event.stopPropagation();
      }, true);
    }
    for (const btn of container.querySelectorAll('button, [role="button"]')) {
      if (isTubiUpNextDismissControl(btn)) continue;
      const label = `${btn.textContent || ''} ${btn.getAttribute('aria-label') || ''}`.toLowerCase();
      if (!/\b(play|watch|next|start)\b/.test(label)) continue;
      if (btn.dataset.shufflrTubiNextBlocked === '1') continue;
      btn.dataset.shufflrTubiNextBlocked = '1';
      btn.addEventListener('click', (event) => {
        if (!isTubiShuffleActive()) return;
        event.preventDefault();
        event.stopPropagation();
      }, true);
    }
  } catch { /* ignore */ }
  return true;
}

function scanAndSuppressTubiUpNext(root = document.body) {
  if (!IS_TUBI || !isChromeContextValid()) return;
  if (!isTubiShuffleActive() || !isTubiEpisodePage()) return;
  const globalHide = findTubiUpNextHideButton(document);
  if (globalHide && elementHasTubiUpNextContext(globalHide)) {
    clickTubiUpNextHide(globalHide);
  }
  for (const container of findTubiUpNextContainers(root || document.body)) {
    neutralizeTubiUpNextContainer(container);
  }
}

function teardownTubiUpNextSuppressor() {
  if (tubiUpNextObserver) {
    try { tubiUpNextObserver.disconnect(); } catch { /* ignore */ }
    tubiUpNextObserver = null;
  }
  if (tubiUpNextPollTimer) {
    clearInterval(tubiUpNextPollTimer);
    tubiUpNextPollTimer = null;
  }
  window.__shufflrTubiUpNextSuppressor = false;
}

function ensureTubiUpNextSuppressor() {
  if (!isChromeContextValid() || !IS_TUBI) return;
  if (!isTubiShuffleActive()) {
    teardownTubiUpNextSuppressor();
    return;
  }
  if (window.__shufflrTubiUpNextSuppressor) {
    scanAndSuppressTubiUpNext();
    return;
  }
  window.__shufflrTubiUpNextSuppressor = true;
  console.log('[Shufflr] Tubi Up Next suppressor armed');

  let scanScheduled = false;
  const scheduleScan = () => {
    if (scanScheduled) return;
    scanScheduled = true;
    queueMicrotask(() => {
      scanScheduled = false;
      if (!isTubiShuffleActive()) {
        teardownTubiUpNextSuppressor();
        return;
      }
      scanAndSuppressTubiUpNext();
    });
  };

  tubiUpNextObserver = new MutationObserver(() => scheduleScan());
  if (document.body) {
    tubiUpNextObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
  tubiUpNextPollTimer = setInterval(() => {
    if (!isChromeContextValid() || !isTubiShuffleActive()) {
      teardownTubiUpNextSuppressor();
      return;
    }
    scanAndSuppressTubiUpNext();
  }, 300);
  scanAndSuppressTubiUpNext();
}

// ── Episode-end + safe video-swap ─────────────────────────────────────────

function clearTubiWatcherIdRetry() {
  if (tubiWatcherIdRetryTimer) {
    clearTimeout(tubiWatcherIdRetryTimer);
    tubiWatcherIdRetryTimer = null;
  }
  window.__shufflrTubiIdRetryScheduled = false;
}

function scheduleTubiWatcherIdRetry() {
  if (window.__shufflrTubiIdRetryScheduled) return;
  if (tubiWatcherIdRetryCount >= TUBI_WATCHER_ID_MAX_RETRIES) {
    console.log('[Shufflr] Tubi: giving up on series id resolution for now');
    return;
  }
  window.__shufflrTubiIdRetryScheduled = true;
  tubiWatcherIdRetryCount += 1;
  tubiWatcherIdRetryTimer = setTimeout(() => {
    tubiWatcherIdRetryTimer = null;
    window.__shufflrTubiIdRetryScheduled = false;
    installTubiEpisodeEndWatcher();
  }, TUBI_WATCHER_ID_RETRY_MS);
}

function teardownTubiEpisodeEndWatcher() {
  if (tubiTimeupdateVideo) {
    if (tubiTimeupdateHandler) {
      tubiTimeupdateVideo.removeEventListener('timeupdate', tubiTimeupdateHandler);
    }
    if (tubiSeekedHandler) {
      tubiTimeupdateVideo.removeEventListener('seeked', tubiSeekedHandler);
    }
    if (tubiEndedHandler) {
      tubiTimeupdateVideo.removeEventListener('ended', tubiEndedHandler);
    }
  }
  tubiTimeupdateVideo = null;
  tubiTimeupdateHandler = null;
  tubiSeekedHandler = null;
  tubiEndedHandler = null;
  tubiEpisodeEndTriggered = false;
  tubiWatcherIdRetryCount = 0;
  clearTubiWatcherIdRetry();
  window.__shufflrTubiNoVideoRetryScheduled = false;
}

function maybeShuffleTubiNearEnd(video, source, { requirePlaying = true, skipRemainingGate = false } = {}) {
  if (tubiEpisodeEndTriggered) return;
  if (!video?.duration || !Number.isFinite(video.duration)) return;
  if (requirePlaying && video.paused) return;
  if (isNonEpisodePlayback(video)) {
    logNonEpisodePlaybackIgnored(video);
    return;
  }
  if (!skipRemainingGate) {
    const remaining = video.duration - video.currentTime;
    if (remaining > TIMEUPDATE_SHUFFLE_REMAINING_SEC) return;
  }
  tubiEpisodeEndTriggered = true;
  console.log(`[Shufflr] Tubi episode-end shuffle fired (${source})`);
  void navigateToRandomTubiEpisode(source);
}

function ensureTubiVideoSwapObserver() {
  if (!isChromeContextValid() || !IS_TUBI) return;
  if (window.__shufflrTubiVideoSwapObserver) return;
  window.__shufflrTubiVideoSwapObserver = true;

  const checkForVideoSwap = (from = 'mutation') => {
    if (!isChromeContextValid() || !IS_TUBI) return;
    if (!isTubiEpisodePage() || !isTubiShuffleActive()) return;
    const liveVideo = document.querySelector('video');
    // Real reference inequality only — never reinstall on unrelated DOM churn.
    if (!liveVideo || !tubiTimeupdateVideo) return;
    if (liveVideo === tubiTimeupdateVideo) return;
    console.log('[Shufflr] Tubi video element swapped — reattaching watcher', { from });
    installTubiEpisodeEndWatcher();
  };

  const observer = new MutationObserver(() => checkForVideoSwap('mutation'));
  const observeBody = () => {
    if (!document.body) return;
    try {
      observer.observe(document.body, { childList: true, subtree: true });
    } catch { /* ignore */ }
  };
  if (document.body) observeBody();
  else document.addEventListener('DOMContentLoaded', observeBody, { once: true });
  setInterval(() => checkForVideoSwap('interval'), 2000);
}

function installTubiEpisodeEndWatcher() {
  if (!isChromeContextValid() || !isTubiEpisodePage()) return;
  if (!isTubiShuffleActive()) return;

  ensureTubiVideoSwapObserver();
  ensureTubiUpNextSuppressor();

  let showId = getTubiShowIdFromUrl();
  if (isTubiUnresolvedSeriesId(showId)) {
    const activeId = getTubiActiveShuffleSeriesId();
    if (isTubiReliableSeriesId(activeId)) {
      showId = activeId;
    } else {
      scheduleTubiWatcherIdRetry();
      return;
    }
  }

  if (!isTubiShuffleActiveForShow(showId)) return;
  clearTubiWatcherIdRetry();
  tubiWatcherIdRetryCount = 0;

  const video = document.querySelector('video');
  if (!video) {
    if (!window.__shufflrTubiNoVideoRetryScheduled) {
      window.__shufflrTubiNoVideoRetryScheduled = true;
      setTimeout(() => {
        window.__shufflrTubiNoVideoRetryScheduled = false;
        installTubiEpisodeEndWatcher();
      }, 1000);
    }
    return;
  }

  if (tubiTimeupdateVideo === video && tubiTimeupdateHandler && tubiSeekedHandler && tubiEndedHandler) {
    return;
  }

  if (tubiTimeupdateVideo) {
    if (tubiTimeupdateHandler) {
      tubiTimeupdateVideo.removeEventListener('timeupdate', tubiTimeupdateHandler);
    }
    if (tubiSeekedHandler) {
      tubiTimeupdateVideo.removeEventListener('seeked', tubiSeekedHandler);
    }
    if (tubiEndedHandler) {
      tubiTimeupdateVideo.removeEventListener('ended', tubiEndedHandler);
    }
  }

  tubiEpisodeEndTriggered = false;
  tubiTimeupdateVideo = video;
  tubiTimeupdateHandler = () => {
    maybeShuffleTubiNearEnd(video, 'timeupdate', { requirePlaying: true });
  };
  tubiSeekedHandler = () => {
    maybeShuffleTubiNearEnd(video, 'seeked', { requirePlaying: false });
  };
  tubiEndedHandler = () => {
    maybeShuffleTubiNearEnd(video, 'ended', { requirePlaying: false, skipRemainingGate: true });
  };

  video.addEventListener('timeupdate', tubiTimeupdateHandler);
  video.addEventListener('seeked', tubiSeekedHandler);
  video.addEventListener('ended', tubiEndedHandler);
  console.log('[Shufflr] Tubi episode-end watcher installed');
}

async function navigateToRandomTubiEpisodeForCurrentShow(source = 'episode-end') {
  if (!isChromeContextValid()) return;
  if (isShufflrAutoNavStopped()) return;

  let showId = getTubiShowIdFromUrl();
  if (isTubiUnresolvedSeriesId(showId)) {
    showId = getTubiActiveShuffleSeriesId();
  }
  if (!isTubiReliableSeriesId(showId) || !isTubiShuffleActiveForShow(showId)) return;

  let episodes = await getCachedTubiEpisodes(showId);
  if (!episodes?.length && isTubiSeriesPage()) {
    episodes = await collectTubiEpisodes();
    if (episodes.length) {
      await setCachedTubiEpisodes(showId, episodes, getTubiShowTitle());
    }
  }
  if (!episodes?.length) {
    console.log(`[Shufflr] Tubi: no cached episodes for shuffle (${source})`);
    return;
  }

  const pick = pickRandomTubiEpisode(episodes, location.href);
  if (!pick) return;

  const showName = getTubiShowTitle() || 'Tubi';
  showToast(`Shuffling ${showName}...`);
  console.log(`[Shufflr] Tubi shuffle (${source}): → ${pick.url}`);

  markTubiExpectedLanding(pick.url);
  await shufflrNavigateTo(pick.url, {
    mode: 'auto',
    source: `tubi-${source}`,
    // Cop is a single reactive fix for Tubi's own nav — don't wait out the 30s
    // throttle that exists to slow repeated Shufflr-initiated near-end hops.
    bypassCooldown: source === 'cop',
    beforeNavigate: () => {
      tubiEpisodeEndTriggered = true;
      captureFullscreenBeforeShufflrNavigation();
    },
  });
  setTimeout(() => {
    tubiEpisodeEndTriggered = false;
    installTubiEpisodeEndWatcher();
  }, 3000);
}

function getTubiSeriesUrlFromPlaylistShow(show) {
  if (!show) return null;
  if (show.tubiSeriesUrl) return show.tubiSeriesUrl;
  if (show.tubiId) return `https://tubitv.com/series/${String(show.tubiId)}`;
  return null;
}

/**
 * Tubi series-page CTA: Continue Watching / Resume / "Play S05:E01" / Play.
 * Prefers resume-style labels so Tubi itself picks the correct next episode.
 */
function findTubiSeriesPlayOrResumeButton() {
  const candidates = document.querySelectorAll('button, a, a[role="button"], [role="button"]');
  let best = null;
  let bestPriority = 0;
  for (const el of candidates) {
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
    const raw = `${el.textContent || ''} ${el.getAttribute('aria-label') || ''}`;
    const text = raw.replace(/\s+/g, ' ').trim();
    if (!text || text.length > 80) continue;
    const lower = text.toLowerCase();
    if (
      lower.includes('my list')
      || lower.includes('trailer')
      || lower.includes('share')
      || lower.includes('season')
    ) continue;

    let priority = 0;
    if (/continue watching/i.test(text)) priority = 4;
    else if (/\bresume\b/i.test(text)) priority = 3;
    else if (/^continue\b/i.test(text)) priority = 3;
    else if (/^play\s*s\s*\d+\s*:\s*e\s*\d+/i.test(text) || /^play\s+s\d+/i.test(text)) priority = 2;
    else if (/^play\b/i.test(text)) priority = 1;
    else continue;

    if (priority > bestPriority) {
      bestPriority = priority;
      best = el;
    }
  }
  return best;
}

function markTubiOrderedAutoplayPending(showId) {
  try {
    sessionStorage.setItem(SHUFFLR_AUTOPLAY_PENDING_KEY, 'true');
    if (showId) sessionStorage.setItem(TUBI_ORDERED_ACCEPT_LANDING_KEY, String(showId));
  } catch { /* ignore */ }
}

function consumeTubiOrderedAcceptLanding(pageSeriesId) {
  try {
    const accepted = sessionStorage.getItem(TUBI_ORDERED_ACCEPT_LANDING_KEY);
    if (!accepted) return false;
    if (pageSeriesId && String(accepted) !== String(pageSeriesId)) return false;
    sessionStorage.removeItem(TUBI_ORDERED_ACCEPT_LANDING_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ordered Episodes: after landing on a series page, click Tubi's own Play/resume CTA.
 * Mirrors Max's maybeAutoClickShowPageResume — Tubi decides which episode to start.
 */
async function maybeAutoClickTubiSeriesPlayOrResume() {
  if (!isChromeContextValid() || !IS_TUBI) return false;
  if (showPageAutoplayPollTimer) return false;
  if (!isTubiSeriesPage()) return false;
  if (sessionStorage.getItem(SHUFFLR_AUTOPLAY_PENDING_KEY) !== 'true') return false;

  const settings = await readShuffleSettings();
  orderedEpisodesCached = !!settings.orderedEpisodes;
  if (!settings.orderedEpisodes) return false;

  const active = await getActivePlaylistFromStorage();
  if (!isTubiArmedPayload(active) || !isArmedPlaylistOwnedByThisTab(active)) return false;

  sessionStorage.removeItem(SHUFFLR_AUTOPLAY_PENDING_KEY);

  const pageId = getTubiShowIdFromUrl();
  if (isTubiReliableSeriesId(pageId)) {
    setTubiActiveShuffleSeriesId(pageId);
    try {
      sessionStorage.setItem(TUBI_ORDERED_ACCEPT_LANDING_KEY, String(pageId));
    } catch { /* ignore */ }
  }

  shufflrActive = true;
  armedPlaylistCached = true;
  ensureTubiUpNextSuppressor();
  updateTubiShuffleUI(active.playlistName || getTubiShowTitle());

  const startedAt = Date.now();
  const maxMs = 8000;

  return await new Promise(resolve => {
    showPageAutoplayPollTimer = setInterval(() => {
      if (!isChromeContextValid()) {
        clearInterval(showPageAutoplayPollTimer);
        showPageAutoplayPollTimer = null;
        resolve(false);
        return;
      }

      const button = findTubiSeriesPlayOrResumeButton();
      if (button) {
        clearInterval(showPageAutoplayPollTimer);
        showPageAutoplayPollTimer = null;
        console.log('[Shufflr] Tubi ordered: clicking series Play/resume CTA');
        try {
          button.click();
        } catch { /* ignore */ }
        resolve(true);
        return;
      }

      if (Date.now() - startedAt >= maxMs) {
        clearInterval(showPageAutoplayPollTimer);
        showPageAutoplayPollTimer = null;
        console.log('[Shufflr] Tubi ordered: Play/resume CTA not found within timeout');
        resolve(false);
      }
    }, 300);
  });
}

/**
 * Ordered mode: persist show round-robin only — no episode URL / playedByShow episode tracking.
 * Writes both active handoff and episode-state so round resets survive navigations.
 */
async function saveTubiOrderedShowRotationState(
  active,
  pickShow,
  lastPlayedShow,
  roundPlayedShows,
  nextEpisodeIndexByShow = {},
  playedByShow = null
) {
  if (!isChromeContextValid()) return active;
  const showId = String(pickShow.tubiId || pickShow.id || lastPlayedShow);
  const title = pickShow.title || pickShow.name || '';
  const seriesUrl = getTubiSeriesUrlFromPlaylistShow(pickShow) || active.currentEpisodeUrl || null;
  const createdAt = active.createdAt || getArmedSessionCreatedAt(active) || Date.now();
  const played = playedByShow != null
    ? serializePlayedByShow(playedByShow)
    : (active.playedByShow && typeof active.playedByShow === 'object' ? active.playedByShow : {});
  const roundSerialized = serializeRoundPlayedShows(roundPlayedShows);
  const last = String(lastPlayedShow || showId);
  const indexes = { ...(nextEpisodeIndexByShow || {}) };
  const activePayload = {
    ...active,
    armed: true,
    selectedService: 'tubi',
    shows: [...(active.shows || [])],
    episodes: [...(active.episodes || [])],
    playlistName: active.playlistName || '',
    playlistIndex: active.playlistIndex ?? 0,
    ownerTabId: active.ownerTabId ?? getShufflrTabId(),
    createdAt,
    currentShow: {
      showId,
      showName: title,
      tubiId: showId,
    },
    currentEpisode: {
      showId,
      showName: title,
      seasonNum: 0,
      episode_number: 0,
      name: title,
      isMovie: false,
      id: showId,
      alternateId: null,
    },
    currentEpisodeUrl: seriesUrl,
    playedByShow: played,
    lastPlayedShow: last,
    roundPlayedShows: roundSerialized,
    nextEpisodeIndexByShow: indexes,
  };
  delete activePayload.pendingFirstShow;
  delete activePayload.pendingFirstShowId;
  const episodeState = {
    playedByShow: played,
    lastPlayedShow: last,
    roundPlayedShows: roundSerialized,
    nextEpisodeIndexByShow: indexes,
    playlistName: activePayload.playlistName || '',
    playlistIndex: activePayload.playlistIndex ?? 0,
  };
  await chromeStorageLocalSet({
    [SHUFFLR_ACTIVE_PLAYLIST_KEY]: activePayload,
    [SHUFFLR_EPISODE_STATE_KEY]: episodeState,
  });
  return activePayload;
}

/** Ordered Episodes: round-robin shows → series page → Tubi's own Play/resume. */
async function navigateToTubiOrderedPlaylistShow(
  active,
  pickShow,
  roundPlayedShows,
  nextEpisodeIndexByShow,
  playedByShow,
  source = 'episode-end',
  options = {}
) {
  if (!isChromeContextValid()) return;
  const showId = String(pickShow.tubiId);
  const title = pickShow.title || pickShow.name || showId;
  const seriesUrl = getTubiSeriesUrlFromPlaylistShow(pickShow);
  if (!seriesUrl) {
    console.log(`[Shufflr] Tubi ordered pick ${title} has no series URL — excluding`);
    await shuffleFromActiveTubiPlaylist(active, source, {
      excludeShowIds: new Set([...(options.excludeShowIds || []), showId]),
    });
    return;
  }

  roundPlayedShows.add(showId);
  const updated = await saveTubiOrderedShowRotationState(
    active,
    pickShow,
    showId,
    roundPlayedShows,
    nextEpisodeIndexByShow,
    playedByShow
  );

  setTubiActiveShuffleSeriesId(showId);
  shufflrActive = true;
  armedPlaylistCached = true;
  ensureTubiUpNextSuppressor();
  updateTubiShuffleUI(updated.playlistName || title);
  showToast(`Playing: ${title}`);
  console.log(`[Shufflr] Tubi ordered playlist (${source}): ${title} → series Play/resume`);

  markTubiOrderedAutoplayPending(showId);

  const currentId = getCurrentTubiSeriesId();
  if (isTubiSeriesPage() && currentId && String(currentId) === showId) {
    await maybeAutoClickTubiSeriesPlayOrResume();
    return;
  }

  const isFirstPlay = String(source).includes('play-first')
    || String(source).includes('dropdown-play')
    || String(source).includes('standalone-launch');
  await shufflrNavigateTo(seriesUrl, {
    mode: options.mode || (isFirstPlay ? 'user' : 'auto'),
    source: `tubi-ordered-${source}`,
    bypassCooldown: source === 'cop' || !isFirstPlay,
    beforeNavigate: () => {
      tubiEpisodeEndTriggered = true;
      captureFullscreenBeforeShufflrNavigation();
    },
  });
  setTimeout(() => {
    tubiEpisodeEndTriggered = false;
  }, 3000);
}

/**
 * Arm the synthetic Your Shows ALL session (same shape episode-end expects).
 * Does not navigate — caller picks the first episode.
 */
async function armTubiYourShowsAllModeSession(options = {}) {
  if (!isChromeContextValid()) return null;

  const { shows: libraryShows } = await readYourShowsPreferCloud();
  const yourShows = (libraryShows || []).filter(show => show?.tubiId);
  if (!yourShows.length) return null;

  const prior = await getActivePlaylistFromStorage();
  const currentId = getCurrentTubiSeriesId();
  const priorArmed = isArmedPlaylistOwnedByThisTab(prior);
  const createdAt = (priorArmed && getArmedSessionCreatedAt(prior)) || Date.now();
  const syntheticPayload = {
    ...(priorArmed ? prior : {}),
    armed: true,
    selectedService: 'tubi',
    playlistName: YOUR_SHOWS_ALL_MODE_NAME,
    playlistIndex: -1,
    shows: yourShows,
    episodes: [],
    createdAt,
    sessionStartedAt: Date.now(),
    ownerTabId: getShufflrTabId(),
  };
  if (options.seedLastPlayedShow && currentId) {
    syntheticPayload.lastPlayedShow = String(currentId);
  } else {
    delete syntheticPayload.lastPlayedShow;
  }
  delete syntheticPayload.pendingFirstShow;
  delete syntheticPayload.pendingFirstShowId;

  await chromeStorageLocalSet({ [SHUFFLR_ACTIVE_PLAYLIST_KEY]: syntheticPayload });
  shufflrActive = true;
  armedPlaylistCached = true;
  // ALL-mode session replaces any single-show pin.
  clearTubiSessionPin();
  if (hasShufflrButtonInDom()) {
    updateTubiShuffleUI(YOUR_SHOWS_ALL_MODE_NAME);
  }
  console.log('[Shufflr] armed playlist owned by this tab');
  return syntheticPayload;
}

async function shuffleFromActiveTubiPlaylist(activePayload, source = 'episode-end', options = {}) {
  if (!isChromeContextValid()) return;
  const active = activePayload || await getActivePlaylistFromStorage();
  if (!isTubiArmedPayload(active) || !isArmedPlaylistOwnedByThisTab(active)) return;

  const excludeShowIds = options.excludeShowIds instanceof Set
    ? options.excludeShowIds
    : new Set(options.excludeShowIds || []);

  const shows = getTubiPlaylistShows(active).filter(
    show => !excludeShowIds.has(String(show.tubiId))
  );
  if (!shows.length) {
    console.log('[Shufflr] Tubi playlist has no remaining shows to pick');
    await navigateToRandomTubiEpisodeForCurrentShow(source);
    return;
  }

  const settings = await readShuffleSettings();
  orderedEpisodesCached = !!settings.orderedEpisodes;
  const useOrdered = !!settings.orderedEpisodes;

  let { playedByShow, lastPlayedShow, roundPlayedShows, nextEpisodeIndexByShow } =
    await loadTubiPlaylistPlayState(active);

  // Round-robin: prefer shows not yet played this round; reset when the round completes.
  let pool = shows;
  if (roundPlayedShows?.size) {
    const unplayed = shows.filter(s => !roundPlayedShows.has(String(s.tubiId)));
    if (unplayed.length) pool = unplayed;
    else {
      roundPlayedShows.clear();
      pool = shows;
    }
  }
  // Avoid immediately repeating the last-played show when more than one remains.
  if (lastPlayedShow && pool.length > 1) {
    const withoutLast = pool.filter(s => String(s.tubiId) !== String(lastPlayedShow));
    if (withoutLast.length) pool = withoutLast;
  }

  const pickShow = pool[Math.floor(Math.random() * pool.length)];
  const showId = String(pickShow.tubiId);
  const title = pickShow.title || pickShow.name || showId;
  const seriesUrl = getTubiSeriesUrlFromPlaylistShow(pickShow);
  if (!seriesUrl) {
    console.log(`[Shufflr] Tubi playlist pick ${title} has no series URL — excluding`);
    await shuffleFromActiveTubiPlaylist(active, source, {
      excludeShowIds: new Set([...excludeShowIds, showId]),
    });
    return;
  }

  // Ordered Episodes: show round-robin only → series page → Tubi's own Play/resume.
  if (useOrdered) {
    await navigateToTubiOrderedPlaylistShow(
      active,
      pickShow,
      roundPlayedShows,
      nextEpisodeIndexByShow,
      playedByShow,
      source,
      { excludeShowIds, mode: options.mode }
    );
    return;
  }

  // Warm cache — pick an episode and navigate directly (no series hop).
  const cached = await getCachedTubiEpisodes(showId);
  if (cached?.length) {
    const pickEp = pickTubiEpisodeHonoringPlayed(cached, playedByShow, showId, location.href);
    if (!pickEp?.url) {
      console.log(`[Shufflr] Tubi playlist pick ${title} has no usable episode URLs — excluding`);
      await shuffleFromActiveTubiPlaylist(active, source, {
        excludeShowIds: new Set([...excludeShowIds, showId]),
      });
      return;
    }

    roundPlayedShows.add(showId);
    await saveTubiPlaylistShuffleState(
      active,
      pickShow,
      pickEp,
      playedByShow,
      showId,
      roundPlayedShows,
      nextEpisodeIndexByShow
    );
    setTubiActiveShuffleSeriesId(showId);
    shufflrActive = true;
    armedPlaylistCached = true;
    ensureTubiUpNextSuppressor();
    updateTubiShuffleUI(active.playlistName || title);
    showToast(`Playing: ${title}`);
    console.log(`[Shufflr] Tubi playlist shuffle (${source}): ${title} → ${pickEp.url}`);
    markTubiExpectedLanding(pickEp.url);
    await shufflrNavigateTo(pickEp.url, {
      mode: 'auto',
      source: `tubi-playlist-${source}`,
      bypassCooldown: source === 'cop',
      beforeNavigate: () => {
        tubiEpisodeEndTriggered = true;
        captureFullscreenBeforeShufflrNavigation();
      },
    });
    setTimeout(() => {
      tubiEpisodeEndTriggered = false;
      installTubiEpisodeEndWatcher();
    }, 3000);
    return;
  }

  // Cold cache — already on this show's series page: collect in place.
  const currentId = getCurrentTubiSeriesId();
  if (isTubiSeriesPage() && currentId && String(currentId) === showId) {
    console.log(`[Shufflr] Tubi playlist pick ${title} cold — collecting on series page`);
    const seeded = {
      ...active,
      pendingFirstShow: true,
      pendingFirstShowId: showId,
      currentEpisodeUrl: seriesUrl,
    };
    await chromeStorageLocalSet({ [SHUFFLR_ACTIVE_PLAYLIST_KEY]: seeded });
    await completeTubiSeriesCollectAndPlay(seeded, showId, `${source}-cold-collect`);
    return;
  }

  // Cold cache — write pending marker and hop to the series page to collect.
  console.log(`[Shufflr] Tubi playlist pick ${title} not cached — hopping to series page`);
  roundPlayedShows.add(showId);
  const indexes = { ...(nextEpisodeIndexByShow || {}) };
  const playedSerialized = serializePlayedByShow(playedByShow);
  const roundSerialized = serializeRoundPlayedShows(roundPlayedShows);
  const updated = {
    ...active,
    pendingFirstShow: true,
    pendingFirstShowId: showId,
    currentEpisodeUrl: seriesUrl,
    lastPlayedShow: showId,
    roundPlayedShows: roundSerialized,
    playedByShow: playedSerialized,
    nextEpisodeIndexByShow: indexes,
  };
  // Dual-write round state (same shape as saveTubiPlaylistShuffleState / CR).
  const episodeState = {
    playedByShow: playedSerialized,
    lastPlayedShow: showId,
    roundPlayedShows: roundSerialized,
    nextEpisodeIndexByShow: indexes,
    playlistName: updated.playlistName || '',
    playlistIndex: updated.playlistIndex ?? 0,
  };
  await chromeStorageLocalSet({
    [SHUFFLR_ACTIVE_PLAYLIST_KEY]: updated,
    [SHUFFLR_EPISODE_STATE_KEY]: episodeState,
  });
  setTubiActiveShuffleSeriesId(showId);
  shufflrActive = true;
  armedPlaylistCached = true;
  showToast(`Loading ${title}...`);
  await shufflrNavigateTo(seriesUrl, {
    mode: 'auto',
    source: `tubi-pending-hop-${source}`,
    bypassCooldown: source === 'cop',
    beforeNavigate: () => {
      tubiEpisodeEndTriggered = true;
      captureFullscreenBeforeShufflrNavigation();
    },
  });
  setTimeout(() => { tubiEpisodeEndTriggered = false; }, 3000);
}

async function shuffleFromTubiYourShowsAllMode(source = 'episode-end') {
  if (!isChromeContextValid()) return;

  const syntheticPayload = await armTubiYourShowsAllModeSession({
    seedLastPlayedShow: true,
  });
  if (!syntheticPayload) {
    showToast('No Tubi shows in Your Shows — add shows using +');
    await navigateToRandomTubiEpisodeForCurrentShow(source);
    return;
  }

  const currentId = getCurrentTubiSeriesId();
  const showCount = getTubiPlaylistShows(syntheticPayload).length;
  console.log(`[Shufflr] Tubi ALL mode: ${showCount} Your Shows — shuffling (${source})`);

  const excludeShowIds = (currentId && showCount > 1)
    ? new Set([String(currentId)])
    : new Set();
  await shuffleFromActiveTubiPlaylist(syntheticPayload, source, { excludeShowIds });
}

async function navigateToRandomTubiEpisode(source = 'episode-end') {
  if (!isChromeContextValid()) return;

  const active = await getActivePlaylistFromStorage();
  if (isTubiArmedPayload(active) && !isArmedPlaylistOwnedByThisTab(active)) {
    console.log('[Shufflr] armed playlist ignored — owned by another tab (or unclaimed)');
  }
  const armedOwned = isTubiArmedPayload(active) && isArmedPlaylistOwnedByThisTab(active);
  const isSyntheticYourShowsAll = !!(
    armedOwned
    && (active?.playlistIndex === -1 || active?.playlistName === YOUR_SHOWS_ALL_MODE_NAME)
  );
  const settings = await readShuffleSettings();
  shuffleModeCached = settings.shuffleMode;

  // Real armed playlists take priority over ALL / pin.
  if (armedOwned && !isSyntheticYourShowsAll) {
    await shuffleFromActiveTubiPlaylist(active, source);
    return;
  }

  // Your Shows card Play pin: stay on that show even when global mode is ALL.
  if (isTubiSessionPinnedToCurrentShow()) {
    await navigateToRandomTubiEpisodeForCurrentShow(source);
    return;
  }

  if (settings.shuffleMode === 'all' || isSyntheticYourShowsAll) {
    await shuffleFromTubiYourShowsAllMode(source);
    return;
  }

  if (armedOwned) {
    await shuffleFromActiveTubiPlaylist(active, source);
    return;
  }

  await navigateToRandomTubiEpisodeForCurrentShow(source);
}

/**
 * Tamed shuffle cop (backstop only).
 * — Our own landings: expected-episode marker matches → stand down.
 * — Non-watch or different series: user left → end session.
 * — Same-show watch without our marker (FIRST evaluation only) → Tubi sneaked through → redirect.
 */
function getTubiLastCopCorrectionAt() {
  try {
    const n = Number(sessionStorage.getItem(TUBI_LAST_COP_AT_KEY) || 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function markTubiCopCorrectionNow() {
  try {
    sessionStorage.setItem(TUBI_LAST_COP_AT_KEY, String(Date.now()));
  } catch { /* ignore */ }
}

function markTubiLandingVerifiedThisPageLoad() {
  tubiLandingVerifiedThisPageLoad = true;
}

async function handleTubiShuffleCop(reason = 'url-change') {
  if (!isChromeContextValid() || !IS_TUBI) return false;
  if (!isTubiShuffleActive()) return false;
  if (window.__shufflrTubiCopInFlight) return false;

  const lastCopAt = getTubiLastCopCorrectionAt();
  if (lastCopAt && Date.now() - lastCopAt < TUBI_COP_MIN_INTERVAL_MS) {
    console.log('[Shufflr] Tubi cop: skipping — corrected too recently');
    markTubiLandingVerifiedThisPageLoad();
    return false;
  }

  const expected = peekTubiExpectedLanding();
  const currentEp = getTubiEpisodeIdFromUrl();
  if (expected && currentEp && String(expected) === String(currentEp)) {
    consumeTubiExpectedLanding();
    markTubiLandingVerifiedThisPageLoad();
    return false;
  }

  // Ordered mode: Tubi's Play/resume click lands on an episode we didn't pre-mark.
  const pageSeriesIdEarly = getTubiShowIdFromUrl();
  if (isTubiEpisodePage() && consumeTubiOrderedAcceptLanding(pageSeriesIdEarly)) {
    if (isTubiReliableSeriesId(pageSeriesIdEarly)) {
      setTubiActiveShuffleSeriesId(pageSeriesIdEarly);
    }
    markTubiLandingVerifiedThisPageLoad();
    return false;
  }

  const active = await getActivePlaylistFromStorage();
  // Owned armed playlist (Phase B round-robin or Your Shows ALL) may hop between shows.
  const playlistRoaming = !!(
    isTubiArmedPayload(active) && isArmedPlaylistOwnedByThisTab(active)
  );

  if (!isTubiEpisodePage()) {
    // Same-series series page during toggle hydrate is fine — don't end.
    if (isTubiSeriesPage()) {
      const pageId = getTubiShowIdFromUrl();
      const activeId = getTubiActiveShuffleSeriesId();
      if (!isTubiReliableSeriesId(pageId) || String(pageId) === String(activeId)) {
        markTubiLandingVerifiedThisPageLoad();
        return false;
      }
      // Playlist/ALL pending hop onto another show's series page — adopt, don't end.
      if (playlistRoaming && isTubiReliableSeriesId(pageId)) {
        setTubiActiveShuffleSeriesId(pageId);
        markTubiLandingVerifiedThisPageLoad();
        return false;
      }
    }
    console.log('[Shufflr] Tubi cop: user left the show — ending session');
    await stopTubiShuffle();
    return true;
  }

  const pageSeriesId = getTubiShowIdFromUrl();
  const activeId = getTubiActiveShuffleSeriesId();
  if (isTubiReliableSeriesId(pageSeriesId) && String(pageSeriesId) !== String(activeId)) {
    if (playlistRoaming) {
      // Foreign nav to another show while playlist is armed — correct via round-robin
      // (same picker as episode-end), not end the session.
      setTubiActiveShuffleSeriesId(pageSeriesId);
      if (expected) consumeTubiExpectedLanding();
      markTubiLandingVerifiedThisPageLoad();
      markTubiCopCorrectionNow();
      window.__shufflrTubiCopInFlight = true;
      console.log('[Shufflr] Tubi cop: correcting unexpected navigation', { reason });
      showToast('Shufflr correcting...');
      try {
        await navigateToRandomTubiEpisode('cop');
      } finally {
        setTimeout(() => {
          window.__shufflrTubiCopInFlight = false;
        }, 1500);
      }
      return true;
    }
    console.log('[Shufflr] Tubi cop: user left the show — ending session');
    await stopTubiShuffle();
    return true;
  }

  // Same-show watch: marker absent/mismatch is foreign only on the first judgment
  // of this page load (restore sets the verified flag before calling us).
  if (expected) consumeTubiExpectedLanding();
  markTubiLandingVerifiedThisPageLoad();
  markTubiCopCorrectionNow();
  window.__shufflrTubiCopInFlight = true;
  console.log('[Shufflr] Tubi cop: correcting unexpected navigation', { reason });
  showToast('Shufflr correcting...');
  try {
    await navigateToRandomTubiEpisode('cop');
  } finally {
    setTimeout(() => {
      window.__shufflrTubiCopInFlight = false;
    }, 1500);
  }
  return true;
}

function isTubiArmedPayload(payload) {
  return !!(payload?.armed && payload.selectedService === 'tubi');
}

function getTubiPlaylistShows(active) {
  return (active?.shows || []).filter(show => show?.tubiId);
}

/** True when this handoff's launch target is the show currently on this page. */
function tubiArmedHandoffTargetsThisShow(active) {
  if (!isTubiArmedPayload(active)) return false;
  const pageId = getTubiShowIdFromUrl();
  if (!isTubiReliableSeriesId(pageId)) return false;
  const page = String(pageId);

  if (active.pendingFirstShow && active.pendingFirstShowId
    && String(active.pendingFirstShowId) === page) {
    return true;
  }
  if (active.currentEpisode?.showId && String(active.currentEpisode.showId) === page) {
    return true;
  }
  if (active.currentShow?.showId && String(active.currentShow.showId) === page) {
    return true;
  }
  const handoffUrl = active.currentEpisodeUrl || '';
  const seriesMatch = String(handoffUrl).match(/\/series\/(\d+)/);
  if (seriesMatch && seriesMatch[1] === page) return true;
  return false;
}

/**
 * Claim an unowned, fresh (~2 min) Tubi armed handoff targeting this show —
 * before any other Tubi armed reader touches it.
 */
async function maybeClaimUnownedTubiArmedHandoff(active) {
  if (!IS_TUBI || !isTubiArmedPayload(active)) return active;
  if (isArmedPlaylistOwnedByThisTab(active)) return active;
  if (active.ownerTabId != null && active.ownerTabId !== '') return active;
  if (!isArmedHandoffFreshForClaim(active)) return active;
  if (!tubiArmedHandoffTargetsThisShow(active)) return active;

  const claimed = await claimUnownedArmedPlaylist(active);
  if (claimed) {
    console.log('[Shufflr] Tubi: claimed armed playlist ownership for this tab');
  }
  return claimed || active;
}

function tubiEpisodePlayKey(ep) {
  if (!ep) return null;
  if (ep.id != null && ep.id !== '') return String(ep.id);
  return getTubiEpisodeIdFromUrl(ep.url) || ep.url || null;
}

function pickTubiEpisodeHonoringPlayed(episodes, playedByShow, showId, currentUrl = null) {
  if (!episodes?.length) return null;
  const sid = String(showId);
  if (!playedByShow[sid]) playedByShow[sid] = new Set();

  let unplayed = episodes.filter(ep => {
    const key = tubiEpisodePlayKey(ep);
    return key && !playedByShow[sid].has(key);
  });
  if (!unplayed.length) {
    playedByShow[sid].clear();
    unplayed = episodes.slice();
  }

  const normalizedCurrent = currentUrl ? String(currentUrl).split('?')[0] : null;
  let episodePool = unplayed.filter(ep => ep.url && (!normalizedCurrent || ep.url !== normalizedCurrent));
  if (!episodePool.length) episodePool = unplayed.filter(ep => ep.url);
  if (!episodePool.length) return null;

  const pickEp = episodePool[Math.floor(Math.random() * episodePool.length)];
  const key = tubiEpisodePlayKey(pickEp);
  if (key) playedByShow[sid].add(key);
  return pickEp;
}

async function loadTubiPlaylistPlayState(active) {
  const playlistIndex = active.playlistIndex ?? 0;
  let { playedByShow, lastPlayedShow, roundPlayedShows, nextEpisodeIndexByShow } =
    await loadEpisodeStateForPlaylist(
      { name: active.playlistName || '' },
      playlistIndex
    );
  if (!(roundPlayedShows instanceof Set)) {
    roundPlayedShows = deserializeRoundPlayedShows(roundPlayedShows);
  }
  if (
    (!nextEpisodeIndexByShow || !Object.keys(nextEpisodeIndexByShow).length)
    && active.nextEpisodeIndexByShow
  ) {
    nextEpisodeIndexByShow = { ...active.nextEpisodeIndexByShow };
  }
  // Prefer active handoff when present (mirrors playedByShow) so a cleared/updated
  // round on the handoff wins over a stale shufflr_episode_state snapshot.
  if (active.roundPlayedShows != null) {
    roundPlayedShows = deserializeRoundPlayedShows(active.roundPlayedShows);
  }
  if (active.lastPlayedShow) {
    lastPlayedShow = String(active.lastPlayedShow);
  }
  // Fresh Play handoffs ship empty playedByShow — prefer that over stale playlist storage.
  if (active.playedByShow && typeof active.playedByShow === 'object') {
    playedByShow = deserializePlayedByShow(active.playedByShow);
  }
  return {
    playedByShow,
    lastPlayedShow,
    roundPlayedShows,
    nextEpisodeIndexByShow: { ...(nextEpisodeIndexByShow || {}) },
  };
}

async function clearTubiPendingFirstShowFlag(active) {
  if (!isChromeContextValid() || !active) return active;
  if (!active.pendingFirstShow && !active.pendingFirstShowId) return active;
  const updated = { ...active };
  delete updated.pendingFirstShow;
  delete updated.pendingFirstShowId;
  await chromeStorageLocalSet({ [SHUFFLR_ACTIVE_PLAYLIST_KEY]: updated });
  return updated;
}

async function saveTubiPlaylistShuffleState(
  active,
  pickShow,
  pickEp,
  playedByShow,
  lastPlayedShow,
  roundPlayedShows,
  nextEpisodeIndexByShow = {}
) {
  if (!isChromeContextValid()) return active;
  const showId = String(pickShow.tubiId || pickShow.id || lastPlayedShow);
  const indexes = { ...(nextEpisodeIndexByShow || {}) };
  const createdAt = active.createdAt || getArmedSessionCreatedAt(active) || Date.now();
  const epId = tubiEpisodePlayKey(pickEp);
  const last = String(lastPlayedShow || showId);
  const roundSerialized = serializeRoundPlayedShows(roundPlayedShows);
  const playedSerialized = serializePlayedByShow(playedByShow);
  const activePayload = {
    ...active,
    armed: true,
    selectedService: 'tubi',
    shows: [...(active.shows || [])],
    episodes: [...(active.episodes || [])],
    playlistName: active.playlistName || '',
    playlistIndex: active.playlistIndex ?? 0,
    ownerTabId: active.ownerTabId ?? getShufflrTabId(),
    createdAt,
    currentShow: {
      showId,
      showName: pickShow.title || pickShow.name || '',
      tubiId: showId,
    },
    currentEpisode: {
      showId,
      showName: pickShow.title || pickShow.name || '',
      seasonNum: pickEp.season ?? pickEp.seasonNum ?? 0,
      episode_number: pickEp.episode ?? pickEp.episode_number ?? 0,
      name: pickEp.title || pickEp.name || '',
      isMovie: false,
      id: epId,
      alternateId: null,
    },
    currentEpisodeUrl: pickEp.url || active.currentEpisodeUrl || null,
    playedByShow: playedSerialized,
    lastPlayedShow: last,
    roundPlayedShows: roundSerialized,
    nextEpisodeIndexByShow: indexes,
  };
  delete activePayload.pendingFirstShow;
  delete activePayload.pendingFirstShowId;
  // Mirror saveCrunchyrollPlaylistShuffleState: keep episode-state in sync with the handoff
  // so loadTubiPlaylistPlayState does not keep a stale Play-seeded round forever.
  const episodeState = {
    playedByShow: playedSerialized,
    lastPlayedShow: last,
    roundPlayedShows: roundSerialized,
    nextEpisodeIndexByShow: indexes,
    playlistName: active.playlistName || '',
    playlistIndex: active.playlistIndex ?? 0,
  };
  await chromeStorageLocalSet({
    [SHUFFLR_ACTIVE_PLAYLIST_KEY]: activePayload,
    [SHUFFLR_EPISODE_STATE_KEY]: episodeState,
  });
  return activePayload;
}

async function completeTubiSeriesCollectAndPlay(activePayload, targetTubiId, source = 'pending-collect') {
  if (!isChromeContextValid()) return false;
  let active = activePayload || await getActivePlaylistFromStorage();
  if (!isTubiArmedPayload(active) || !isArmedPlaylistOwnedByThisTab(active)) return false;

  const showId = String(targetTubiId);
  const showEntry = getTubiPlaylistShows(active).find(s => String(s.tubiId) === showId)
    || { tubiId: showId, title: getTubiShowTitle() || showId };
  const title = showEntry.title || showEntry.name || getTubiShowTitle() || showId;

  // Clear first-play flag immediately so a series-page refresh does not restart playback.
  active = await clearTubiPendingFirstShowFlag(active);

  showToast(`Loading ${title}...`);
  console.log(`[Shufflr] Tubi pending collect starting for ${showId} (${source})`);

  let episodes = await getCachedTubiEpisodes(showId);
  if (!episodes?.length) {
    await wait(800);
    episodes = await collectTubiEpisodes();
  }
  if (!episodes?.length) {
    console.log(`[Shufflr] Tubi pending collect failed for ${showId} — no episodes`);
    // Loop guard: exclude this show for the round and pick another.
    await shuffleFromActiveTubiPlaylist(active, `${source}-failed`, {
      excludeShowIds: new Set([showId]),
    });
    return true;
  }
  await setCachedTubiEpisodes(showId, episodes, title);

  let { playedByShow, roundPlayedShows, nextEpisodeIndexByShow } =
    await loadTubiPlaylistPlayState(active);
  const pickEp = pickTubiEpisodeHonoringPlayed(episodes, playedByShow, showId, null);
  if (!pickEp?.url) {
    console.log(`[Shufflr] Tubi pending collect failed for ${showId} — no pick`);
    await shuffleFromActiveTubiPlaylist(active, `${source}-failed`, {
      excludeShowIds: new Set([showId]),
    });
    return true;
  }

  roundPlayedShows.add(showId);
  active = await saveTubiPlaylistShuffleState(
    active,
    showEntry,
    pickEp,
    playedByShow,
    showId,
    roundPlayedShows,
    nextEpisodeIndexByShow
  );

  setTubiActiveShuffleSeriesId(showId);
  shufflrActive = true;
  armedPlaylistCached = true;
  ensureTubiUpNextSuppressor();
  updateTubiShuffleUI(active.playlistName || title);

  showToast(`Playing: ${title}`);
  console.log(`[Shufflr] Tubi pending collect complete: ${title} → ${pickEp.url}`);
  markTubiExpectedLanding(pickEp.url);
  const isFirstPlay = String(source).includes('play-first') || String(source).includes('standalone-launch');
  await shufflrNavigateTo(pickEp.url, {
    mode: isFirstPlay ? 'user' : 'auto',
    bypassCooldown: !isFirstPlay,
    source: `tubi-${source}`,
    beforeNavigate: () => {
      tubiEpisodeEndTriggered = true;
      captureFullscreenBeforeShufflrNavigation();
    },
  });
  setTimeout(() => {
    tubiEpisodeEndTriggered = false;
    installTubiEpisodeEndWatcher();
  }, 3000);
  return true;
}

async function maybeResumeTubiPendingCollect(activeOverride = null) {
  if (!isChromeContextValid() || !isTubiSeriesPage()) return false;
  if (window.__shufflrTubiPendingResume) return false;

  const currentId = getTubiShowIdFromUrl();
  if (!isTubiReliableSeriesId(currentId)) return false;

  let active = activeOverride || await getActivePlaylistFromStorage();
  if (!isTubiArmedPayload(active)) return false;

  // Ownership required — claim happens in restore before this runs.
  if (!isArmedPlaylistOwnedByThisTab(active)) {
    console.log('[Shufflr] armed playlist ignored — owned by another tab (or unclaimed)');
    return false;
  }

  if (
    !(active.pendingFirstShow && active.pendingFirstShowId
      && String(active.pendingFirstShowId) === String(currentId))
  ) {
    return false;
  }

  window.__shufflrTubiPendingResume = true;
  try {
    const settings = await readShuffleSettings();
    orderedEpisodesCached = !!settings.orderedEpisodes;
    // Ordered Episodes: do not collect/pick episodes — click Tubi's Play/resume CTA instead.
    if (settings.orderedEpisodes) {
      active = await clearTubiPendingFirstShowFlag(active);
      setTubiActiveShuffleSeriesId(currentId);
      shufflrActive = true;
      armedPlaylistCached = true;
      ensureTubiUpNextSuppressor();
      updateTubiShuffleUI(active.playlistName || getTubiShowTitle());
      markTubiOrderedAutoplayPending(currentId);
      console.log(`[Shufflr] Tubi ordered pending → series Play/resume (${currentId})`);
      return await maybeAutoClickTubiSeriesPlayOrResume();
    }

    // Mid-session hops (Phase B) already have an active shuffle session → auto.
    // Fresh web Play landing does not → user-mode first play.
    const source = isTubiShuffleActive() ? 'pending-collect' : 'play-first-show';
    return await completeTubiSeriesCollectAndPlay(active, currentId, source);
  } finally {
    window.__shufflrTubiPendingResume = false;
  }
}

async function clearTubiStandaloneLaunchKeys() {
  if (!isChromeContextValid()) return;
  await chromeStorageLocalRemove(SHUFFLR_LAUNCH_SHOW_URL_KEY);
  await chromeStorageLocalRemove(SHUFFLR_LAUNCH_STANDALONE_KEY);
  await chromeStorageLocalRemove(SHUFFLR_LAUNCH_STANDALONE_AT_KEY);
  await chromeStorageLocalRemove(SHUFFLR_LAUNCH_INTENT_KEY);
}

function setTubiSessionPin(seriesId) {
  if (!seriesId) {
    clearTubiSessionPin();
    return;
  }
  try {
    sessionStorage.setItem(SHUFFLR_SESSION_PIN_KEY, String(seriesId));
    const label = getTubiShowTitle() || String(seriesId);
    console.log(`[Shufflr] single-intent launch — pinned to ${label}`);
  } catch { /* ignore */ }
}

function clearTubiSessionPin() {
  try {
    sessionStorage.removeItem(SHUFFLR_SESSION_PIN_KEY);
  } catch { /* ignore */ }
}

function getTubiSessionPin() {
  try {
    return sessionStorage.getItem(SHUFFLR_SESSION_PIN_KEY) || null;
  } catch {
    return null;
  }
}

/** True when this tab is pinned to a specific show (Your Shows card Play). */
function isTubiSessionPinnedToCurrentShow() {
  if (!IS_TUBI) return false;
  const pin = getTubiSessionPin();
  if (!pin) return false;
  const currentId = getCurrentTubiSeriesId() || getTubiActiveShuffleSeriesId();
  return !!(currentId && String(currentId) === String(pin));
}

function tubiLaunchUrlMatchesCurrentSeries(launchUrl) {
  if (!launchUrl) return false;
  try {
    const launch = new URL(launchUrl, location.origin);
    const launchSeries = launch.pathname.match(/\/series\/(\d+)/)?.[1];
    const currentSeries = getCurrentTubiSeriesId();
    if (launchSeries && currentSeries && String(launchSeries) === String(currentSeries)) {
      return true;
    }
    const launchPath = launch.pathname.replace(/\/$/, '');
    const currentPath = location.pathname.replace(/\/$/, '');
    return !!(launchPath && currentPath && (
      currentPath === launchPath || currentPath.startsWith(`${launchPath}/`)
    ));
  } catch {
    return false;
  }
}

/**
 * Peek standalone launch keys for this series page (does not consume).
 * Returns { launchUrl, launchIntent, launchedAt }, { expired: true }, or null.
 */
async function peekTubiStandaloneLaunchStorage() {
  if (!isChromeContextValid()) return null;
  const result = await chrome.storage.local.get([
    SHUFFLR_LAUNCH_SHOW_URL_KEY,
    SHUFFLR_LAUNCH_STANDALONE_KEY,
    SHUFFLR_LAUNCH_STANDALONE_AT_KEY,
    SHUFFLR_LAUNCH_INTENT_KEY,
  ]);
  const launchUrl = result[SHUFFLR_LAUNCH_SHOW_URL_KEY];
  const isStandalone = result[SHUFFLR_LAUNCH_STANDALONE_KEY] === true;
  if (!isStandalone || !launchUrl) return null;
  if (!tubiLaunchUrlMatchesCurrentSeries(launchUrl)) return null;

  let launchedAt = Number(result[SHUFFLR_LAUNCH_STANDALONE_AT_KEY]);
  if (!Number.isFinite(launchedAt) || launchedAt <= 0) {
    launchedAt = Date.now();
  } else if (Date.now() - launchedAt > STANDALONE_LAUNCH_MAX_AGE_MS) {
    return { expired: true };
  }

  const launchIntent = result[SHUFFLR_LAUNCH_INTENT_KEY] === 'single' ? 'single' : 'mode';
  return { launchUrl, launchIntent, launchedAt };
}

async function waitForTubiStandaloneLaunchKeys(maxMs = 2000, intervalMs = 150) {
  const started = Date.now();
  let first = await peekTubiStandaloneLaunchStorage();
  if (first?.expired) {
    console.log('[Shufflr] Standalone launch expired — clearing');
    await clearTubiStandaloneLaunchKeys();
    return null;
  }
  if (first?.launchUrl) return first;

  // No keys yet — only poll on fresh navigations (covers the open-tab race).
  // Skip a multi-second stall on later restore/inject passes of a series page.
  if (typeof performance !== 'undefined' && performance.now() > maxMs + 500) {
    return null;
  }

  while (Date.now() - started < maxMs) {
    await wait(intervalMs);
    if (!isChromeContextValid() || !isTubiSeriesPage()) return null;
    const next = await peekTubiStandaloneLaunchStorage();
    if (next?.expired) {
      console.log('[Shufflr] Standalone launch expired — clearing');
      await clearTubiStandaloneLaunchKeys();
      return null;
    }
    if (next?.launchUrl) return next;
  }
  return null;
}

/**
 * Detect + consume a fresh standalone web launch targeting this series page.
 * Returns { seriesId, launchUrl, launchIntent } or null.
 */
async function consumeTubiStandaloneLaunchIfMatching() {
  if (!isChromeContextValid() || !isTubiSeriesPage()) return null;
  if (window.__shufflrTubiStandaloneLaunchConsumed) return null;

  const matched = await waitForTubiStandaloneLaunchKeys(2000, 150);
  if (!matched?.launchUrl) return null;

  const seriesId = getCurrentTubiSeriesId();
  if (!seriesId) return null;

  window.__shufflrTubiStandaloneLaunchConsumed = true;
  await clearTubiStandaloneLaunchKeys();

  console.log(
    '[Shufflr] Consumed Tubi standalone launch for series',
    seriesId,
    `(intent=${matched.launchIntent})`
  );
  return { seriesId, launchUrl: matched.launchUrl, launchIntent: matched.launchIntent };
}

/**
 * Auto-start after a web-app standalone launch.
 */
async function maybeAutoStartTubiStandaloneLaunch() {
  if (!isChromeContextValid() || !isTubiSeriesPage()) return false;

  const launch = await consumeTubiStandaloneLaunchIfMatching();
  if (!launch?.seriesId) return false;

  const settings = await readShuffleSettings();
  shuffleModeCached = settings.shuffleMode;
  orderedEpisodesCached = !!settings.orderedEpisodes;

  // Your Shows card Play → always pin to this show (ignore global ALL).
  if (launch.launchIntent === 'single') {
    setTubiSessionPin(launch.seriesId);
    console.log('[Shufflr] Tubi standalone launch → pinned single-show auto-start');
    await startTubiShuffle();
    return true;
  }

  // Power-button / mode-following launch — clear any prior pin and follow global mode.
  clearTubiSessionPin();

  if (settings.shuffleMode === 'all') {
    let synthetic = await armTubiYourShowsAllModeSession({ seedLastPlayedShow: false });
    if (!synthetic) {
      console.log('[Shufflr] ALL mode launch: no Your Shows — falling back to single-show');
      await startTubiShuffle();
      return true;
    }

    // Ensure the launched series is in the ALL pool so collect-pick can target it.
    const sid = String(launch.seriesId);
    if (!getTubiPlaylistShows(synthetic).some(s => String(s.tubiId) === sid)) {
      synthetic = {
        ...synthetic,
        shows: [
          ...(synthetic.shows || []),
          {
            tubiId: sid,
            title: getTubiShowTitle() || sid,
            tubiSeriesUrl: location.href.split('?')[0],
            service: 'tubi',
          },
        ],
      };
      await chromeStorageLocalSet({ [SHUFFLR_ACTIVE_PLAYLIST_KEY]: synthetic });
    }

    // Pick any show from Your Shows (not forced to the currently-viewed/launched page).
    console.log('[Shufflr] Tubi standalone launch → ALL mode auto-start');
    await shuffleFromActiveTubiPlaylist(synthetic, 'standalone-launch-all');
    return true;
  }

  console.log('[Shufflr] Tubi standalone launch → single-show auto-start (mode)');
  await startTubiShuffle();
  return true;
}

async function restoreTubiShuffleSession() {
  if (!IS_TUBI) return false;
  // Ensure tab ID exists early; series-page auto-start claims ownership below.
  getShufflrTabId();

  let active = await getActivePlaylistFromStorage();
  // Claim immediately on a matching fresh unclaimed Tubi handoff — before other readers.
  if (isTubiArmedPayload(active)) {
    active = await maybeClaimUnownedTubiArmedHandoff(active);
  }

  // Fresh standalone launch for THIS show: wait briefly for keys, then beat a leftover
  // armed playlist that is not targeting this page (user explicitly asked to play this show).
  if (isTubiSeriesPage() && !window.__shufflrTubiStandaloneLaunchConsumed) {
    const pendingStandalone = await waitForTubiStandaloneLaunchKeys(2000, 150);
    if (pendingStandalone?.launchUrl) {
      const ownedArmed = isTubiArmedPayload(active) && isArmedPlaylistOwnedByThisTab(active);
      if (ownedArmed && tubiArmedHandoffTargetsThisShow(active)) {
        // Real playlist Play for this show wins — drop competing standalone keys.
        await clearTubiStandaloneLaunchKeys();
      } else {
        if (ownedArmed && !tubiArmedHandoffTargetsThisShow(active)) {
          console.log('[Shufflr] Tubi standalone launch takes priority over stale armed playlist');
          await clearActivePlaylist();
          active = null;
        }
        const started = await maybeAutoStartTubiStandaloneLaunch();
        if (started) return true;
        active = await getActivePlaylistFromStorage();
      }
    }
  }

  if (isTubiSeriesPage() && isTubiArmedPayload(active) && isArmedPlaylistOwnedByThisTab(active)) {
    await maybeResumeTubiPendingCollect(active);
    active = await getActivePlaylistFromStorage();
    // Ordered autoplay pending (dropdown / episode-end hop) — click Tubi's Play/resume.
    if (sessionStorage.getItem(SHUFFLR_AUTOPLAY_PENDING_KEY) === 'true') {
      await maybeAutoClickTubiSeriesPlayOrResume();
    }
  }

  // Standalone web launch auto-start — only when not already in an owned armed playlist.
  if (isTubiSeriesPage() && !isArmedPlaylistOwnedByThisTab(active)) {
    const started = await maybeAutoStartTubiStandaloneLaunch();
    if (started) return true;
    active = await getActivePlaylistFromStorage();
  }

  const armedOwned = isTubiArmedPayload(active) && isArmedPlaylistOwnedByThisTab(active);
  if (armedOwned) {
    console.log('[Shufflr] armed playlist owned by this tab');
  } else if (isTubiArmedPayload(active)) {
    console.log('[Shufflr] armed playlist ignored — owned by another tab (or unclaimed)');
  }

  // Not-owner tabs behave exactly as if nothing is armed.
  if (!isTubiShuffleActive() && !armedOwned) {
    shufflrActive = false;
    armedPlaylistCached = false;
    if (hasShufflrButtonInDom()) updateShuffleUI('');
    return false;
  }

  shufflrActive = true;
  if (armedOwned) armedPlaylistCached = true;

  // Judge this page load at most once. A later inject/sync restore must not
  // re-interpret "marker already consumed" as a foreign Tubi navigation.
  // Cop only when a single-show session is active (owner sets it on auto-start).
  if (isTubiShuffleActive() && !tubiLandingVerifiedThisPageLoad) {
    const orderedAccepted = isTubiEpisodePage()
      && consumeTubiOrderedAcceptLanding(getTubiShowIdFromUrl());
    if (orderedAccepted) {
      const pageId = getTubiShowIdFromUrl();
      if (isTubiReliableSeriesId(pageId)) setTubiActiveShuffleSeriesId(pageId);
      markTubiLandingVerifiedThisPageLoad();
    } else {
      const expected = peekTubiExpectedLanding();
      const currentEp = getTubiEpisodeIdFromUrl();
      if (expected && currentEp && String(expected) === String(currentEp)) {
        consumeTubiExpectedLanding();
        markTubiLandingVerifiedThisPageLoad();
      } else {
        // First evaluation only: absent or mismatched marker → potentially foreign.
        // Set verified before the async cop so a concurrent sync restore cannot re-enter.
        markTubiLandingVerifiedThisPageLoad();
        void handleTubiShuffleCop('landing');
      }
    }
  }

  ensureTubiUpNextSuppressor();
  if (hasShufflrButtonInDom()) {
    if (armedOwned) {
      updateTubiShuffleUI(active.playlistName || getTubiShowTitle());
    } else {
      updateTubiShuffleUI(getTubiShowTitle());
    }
  }
  if (isTubiEpisodePage() && isTubiShuffleActive()) {
    installTubiEpisodeEndWatcher();
  }
  return true;
}

async function stopTubiShuffle() {
  shufflrActive = false;
  clearTubiSessionPin();
  try { sessionStorage.removeItem(TUBI_SHUFFLE_ACTIVE_KEY); } catch { /* ignore */ }
  try { sessionStorage.removeItem(TUBI_PENDING_KEY); } catch { /* ignore */ }
  try { sessionStorage.removeItem(TUBI_EXPECTED_LANDING_KEY); } catch { /* ignore */ }
  teardownTubiEpisodeEndWatcher();
  teardownTubiUpNextSuppressor();
  const active = await getActivePlaylistFromStorage();
  // Only the owning tab may clear the armed handoff.
  if (isArmedPlaylistOwnedByThisTab(active)) {
    await clearActivePlaylist();
  }
  armedPlaylistCached = false;
  // Same shared reset Max/Crunchyroll OFF handlers use — ALL never survives past OFF.
  await resetShuffleModeToSingle();
  updateShuffleUI('');
  showToast('Shufflr OFF');
  console.log('[Shufflr] Tubi shuffle stopped');
}

async function startTubiShuffle() {
  if (!isChromeContextValid()) return;
  clearShufflrAutoNavStopped();

  let showId = null;
  for (let attempt = 0; attempt < 15; attempt++) {
    showId = getTubiShowIdFromUrl();
    if (isTubiReliableSeriesId(showId)) break;
    showId = null;
    await wait(500);
  }
  if (!isTubiReliableSeriesId(showId)) {
    showToast('Could not identify this show.');
    return;
  }

  // One reload to hydrate React Query / episode list (Tubi SPA often needs it).
  if (sessionStorage.getItem(TUBI_PENDING_KEY) !== 'reloaded') {
    sessionStorage.setItem(TUBI_PENDING_KEY, 'reloaded');
    location.reload();
    return;
  }
  sessionStorage.removeItem(TUBI_PENDING_KEY);

  const showName = getTubiShowTitle() || 'this show';
  showToast(`Shuffling ${showName}...`);

  let episodes = await getCachedTubiEpisodes(showId);
  if (!episodes?.length) {
    await wait(800);
    episodes = await collectTubiEpisodes();
  }
  if (!episodes?.length) {
    showToast('Could not find episodes.');
    return;
  }

  await setCachedTubiEpisodes(showId, episodes, showName);
  if (!setTubiActiveShuffleSeriesId(showId)) {
    showToast('Could not identify this show.');
    return;
  }

  shufflrActive = true;
  ensureTubiUpNextSuppressor();
  updateTubiShuffleUI(showName);
  console.log('[Shufflr] Tubi shuffle started', { showId, episodes: episodes.length });

  // Series page → jump to a random episode. Already on an episode → arm and keep watching.
  if (isTubiEpisodePage()) {
    // Mark current episode as our landing so the cop doesn't treat stay-here as foreign.
    markTubiExpectedLanding(location.href);
    installTubiEpisodeEndWatcher();
    return;
  }

  const pick = pickRandomTubiEpisode(episodes, location.href);
  if (!pick) {
    showToast('Could not pick an episode.');
    return;
  }

  markTubiExpectedLanding(pick.url);
  await shufflrNavigateTo(pick.url, {
    mode: 'user',
    source: 'tubi-toggle-start',
    beforeNavigate: () => captureFullscreenBeforeShufflrNavigation(),
  });
}

function syncTubiShuffleUiState() {
  if (!IS_TUBI) return;
  // Always restore — may claim a fresh Tubi armed handoff even without a single-show session.
  void restoreTubiShuffleSession();
}

/** Hydration-ready anchor near title/player — signals the SPA shell is ready enough to host UI. */
function findTubiInjectAnchor() {
  if (!isTubiInjectablePage()) return null;
  const video = document.querySelector('video');
  if (video) return video;
  const title = document.querySelector('h1');
  if (title && (title.textContent || '').trim()) return title;
  const shell = document.querySelector(
    '#root main, main, #root, [class*="web-player"], [class*="WebPlayer"], [class*="content-title"]'
  );
  if (shell) return shell;
  return null;
}

/** Skip double-inject, but re-bind handlers if the wrap lost its bound flag. */
function ensureTubiButtonHandlersBound() {
  const wrap = document.getElementById('shufflr-wrap');
  const btn = document.getElementById('shufflr-btn');
  if (!wrap || !btn) return false;
  if (wrap.dataset.shufflrBound !== '1') {
    bindShufflrButtonHandlers();
    wrap.dataset.shufflrBound = '1';
  }
  return true;
}

function injectTubiShufflrButtonIfNeeded(startedAt) {
  if (!isChromeContextValid() || !isTubiInjectablePage()) return false;

  if (document.getElementById('shufflr-wrap')) {
    ensureTubiButtonHandlersBound();
    syncTubiShuffleUiState();
    return true;
  }

  if (!findTubiInjectAnchor()) return false;

  injectShufflrButton(null);
  ensureTubiButtonHandlersBound();
  const elapsed = Math.max(0, Date.now() - (startedAt || Date.now()));
  console.log(`[Shufflr] Tubi button injected (after ${elapsed}ms)`);
  syncTubiShuffleUiState();
  return !!document.getElementById('shufflr-wrap');
}

function startTubiButtonInjectPolling() {
  if (!IS_TUBI || !isChromeContextValid()) return;
  if (window.__shufflrTubiInjectPolling) return;
  window.__shufflrTubiInjectPolling = true;

  const startedAt = Date.now();
  console.log('[Shufflr] Tubi inject attempt');

  const tick = () => {
    if (!isChromeContextValid() || !IS_TUBI) {
      window.__shufflrTubiInjectPolling = false;
      return;
    }

    if (isTubiInjectablePage() && injectTubiShufflrButtonIfNeeded(startedAt)) {
      window.__shufflrTubiInjectPolling = false;
      return;
    }

    if (Date.now() - startedAt >= TUBI_INJECT_MAX_MS) {
      console.log('[Shufflr] Tubi inject gave up after', TUBI_INJECT_MAX_MS, 'ms');
      window.__shufflrTubiInjectPolling = false;
      return;
    }

    setTimeout(tick, TUBI_INJECT_POLL_MS);
  };

  tick();
}

function installTubiUrlObserver() {
  if (!IS_TUBI || window.__shufflrTubiUrlObserver) return;
  window.__shufflrTubiUrlObserver = true;

  let lastHref = location.href;

  const onPossibleRouteChange = () => {
    if (!isChromeContextValid() || !IS_TUBI) return;
    if (location.href === lastHref) return;
    const prevHref = lastHref;
    lastHref = location.href;

    if (isTubiShuffleActive()) {
      // Ignore query-only changes on the same path.
      try {
        if (new URL(prevHref).pathname === location.pathname) {
          /* still sync UI below if injectable */
        } else {
          // Real path change = new page context for landing verification.
          tubiLandingVerifiedThisPageLoad = false;
          void handleTubiShuffleCop('url-change');
        }
      } catch {
        tubiLandingVerifiedThisPageLoad = false;
        void handleTubiShuffleCop('url-change');
      }
    }

    if (!isTubiInjectablePage()) return;

    if (document.getElementById('shufflr-wrap')) {
      ensureTubiButtonHandlersBound();
      syncTubiShuffleUiState();
      return;
    }
    window.__shufflrTubiInjectPolling = false;
    startTubiButtonInjectPolling();
  };

  const observer = new MutationObserver(onPossibleRouteChange);
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    }, { once: true });
  }
  window.addEventListener('popstate', onPossibleRouteChange);
  setInterval(onPossibleRouteChange, 500);
}

function installTubiButtonPersistenceObserver() {
  if (!IS_TUBI || window.__shufflrTubiButtonObserver) return;
  window.__shufflrTubiButtonObserver = true;

  const observer = new MutationObserver(() => {
    if (!isChromeContextValid() || !IS_TUBI) return;
    if (!isTubiInjectablePage()) return;

    if (document.getElementById('shufflr-wrap')) {
      ensureTubiButtonHandlersBound();
      return;
    }

    if (!window.__shufflrTubiInjectPolling) {
      startTubiButtonInjectPolling();
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    }, { once: true });
  }
}

if (IS_TUBI) {
  installTubiUrlObserver();
  installTubiButtonPersistenceObserver();
  startTubiButtonInjectPolling();

  // Inbound stop-on-error: same landing check Max/CR run after an auto-nav.
  void checkShufflrAutoNavErrorLanding();

  // Resume after reload hydrate or episode-end navigation.
  if (sessionStorage.getItem(TUBI_PENDING_KEY) === 'reloaded') {
    setTimeout(() => {
      if (!isChromeContextValid() || !IS_TUBI) return;
      void startTubiShuffle();
    }, 1200);
  } else {
    // Always restore: claim fresh Tubi armed handoffs and/or resume single-show session.
    // Run as soon as the document can host checks — no arbitrary 800ms landing delay.
    const runRestore = () => {
      if (!isChromeContextValid() || !IS_TUBI) return;
      void restoreTubiShuffleSession().then(() => {
        void maybeAutoClickTubiSeriesPlayOrResume();
      });
    };
    if (document.body) {
      runRestore();
    } else {
      document.addEventListener('DOMContentLoaded', runRestore, { once: true });
    }
  }
}

// ── CRUNCHYROLL HELPERS ──────────────────────────────────────────────────
let crunchyrollEpisodeEndTriggered = false;
let crunchyrollTimeupdateVideo = null;
let crunchyrollTimeupdateHandler = null;
let crunchyrollButtonObserver = null;

function isCrunchyrollWatchPage() {
  return isCrunchyroll && location.pathname.includes('/watch/');
}

function isCrunchyrollSeriesPage() {
  return isCrunchyroll && /\/series\/[^/]+/.test(location.pathname);
}

/** Series ID only (never the /watch/ episode id). */
function getCurrentCrunchyrollSeriesId() {
  const fromPath = location.pathname.match(/\/series\/([^/]+)/);
  if (fromPath) return fromPath[1];

  for (const anchor of document.querySelectorAll('a[href*="/series/"]')) {
    const href = anchor.getAttribute('href') || '';
    const match = href.match(/\/series\/([^/?#]+)/);
    if (match) return match[1];
  }
  return null;
}

function getCurrentCrunchyrollSeriesUrl(seriesId, title) {
  if (location.pathname.includes('/series/')) {
    const pathMatch = location.pathname.match(/\/series\/[^/]+(?:\/[^/]*)?/);
    if (pathMatch) return `https://www.crunchyroll.com${pathMatch[0]}`;
  }
  for (const anchor of document.querySelectorAll('a[href*="/series/"]')) {
    const href = anchor.getAttribute('href') || '';
    const match = href.match(/\/series\/([^/?#]+)(?:\/([^/?#]*))?/);
    if (!match || match[1] !== seriesId) continue;
    if (href.startsWith('http')) return href.split(/[?#]/)[0];
    return `https://www.crunchyroll.com${href.split(/[?#]/)[0]}`;
  }
  const slug = String(title || 'show').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `https://www.crunchyroll.com/series/${seriesId}/${slug}`;
}

function getCrunchyrollShowIdFromUrl() {
  const seriesId = getCurrentCrunchyrollSeriesId();
  if (seriesId) return seriesId;
  const watchMatch = location.pathname.match(/\/watch\/([^/]+)/);
  return watchMatch ? `ep-${watchMatch[1]}` : null;
}

function getCrunchyrollShowTitle() {
  if (isCrunchyrollSeriesPage()) {
    const h1 = document.querySelector('h1');
    const heading = h1?.textContent?.replace(/\s+/g, ' ').trim();
    if (heading) return heading;
  }
  const seriesLink = document.querySelector('a[href*="/series/"]');
  const text = seriesLink?.textContent?.replace(/\s+/g, ' ').trim();
  if (text) return text;
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  return ogTitle?.trim() || 'Crunchyroll';
}

function crunchyrollEpisodeCacheKey(showId) {
  return `${CRUNCHYROLL_EPISODE_CACHE_PREFIX}${showId}`;
}

async function getCachedCrunchyrollEpisodes(showId) {
  if (!isChromeContextValid() || !showId) return null;
  const entry = await storageLocalGet(crunchyrollEpisodeCacheKey(showId));
  if (!entry?.cachedAt || !Array.isArray(entry.episodes) || !entry.episodes.length) return null;
  if (Date.now() - entry.cachedAt > EPISODE_CACHE_TTL_MS) return null;
  return entry.episodes;
}

async function setCachedCrunchyrollEpisodes(showId, episodes, showName) {
  if (!isChromeContextValid() || !showId) return;
  await storageLocalSet(crunchyrollEpisodeCacheKey(showId), {
    showId,
    showName: showName || null,
    episodes,
    cachedAt: Date.now(),
  });
}

// Episode rows in Crunchyroll's expanded panel render as "E9 - Episode Title" link text.
function parseCrunchyrollEpisodeLink(anchor) {
  const href = anchor.getAttribute('href');
  if (!href || !href.startsWith('/watch/')) return null;
  const text = (anchor.textContent || '').replace(/\s+/g, ' ').trim();
  const match = text.match(/^E(\d+)\s*[-–—]\s*(.+)$/i);
  if (!match) return null;
  return {
    url: `https://www.crunchyroll.com${href.split('?')[0]}`,
    title: match[2].trim(),
    episode: Number(match[1]),
  };
}

function collectCrunchyrollEpisodesFromCurrentDom() {
  const episodes = [];
  const seen = new Set();
  for (const anchor of document.querySelectorAll('a[href*="/watch/"]')) {
    const parsed = parseCrunchyrollEpisodeLink(anchor);
    if (!parsed || seen.has(parsed.url)) continue;
    seen.add(parsed.url);
    episodes.push(parsed);
  }
  return episodes;
}

function crunchyrollEpisodeUrlSetKey(episodes) {
  return (episodes || []).map(ep => ep.url).slice().sort().join('\n');
}

async function waitForCrunchyrollSeasonEpisodes(previousEpisodes, { isFirstSeason, timeoutMs = 3000 } = {}) {
  const previousKey = crunchyrollEpisodeUrlSetKey(previousEpisodes || []);
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (!isChromeContextValid()) break;
    const episodes = collectCrunchyrollEpisodesFromCurrentDom();
    const nonEmpty = episodes.length > 0;
    const changed = crunchyrollEpisodeUrlSetKey(episodes) !== previousKey;
    if (nonEmpty && (isFirstSeason || changed)) return episodes;
    await wait(100);
  }

  return collectCrunchyrollEpisodesFromCurrentDom();
}

function mergeCrunchyrollEpisodes(existing, found) {
  const seen = new Set(existing.map(ep => ep.url));
  for (const ep of found) {
    if (seen.has(ep.url)) continue;
    seen.add(ep.url);
    existing.push(ep);
  }
  return existing;
}

// Expands the episode panel and opens the "Seasons" dropdown so every season's
// episodes are reachable, mirroring how a real user browses to other seasons.
async function openCrunchyrollSeasonDropdown() {
  const seeMoreBtn = document.querySelector('button[data-t="see-more-episodes-btn"]');
  if (seeMoreBtn) {
    const beforeKey = crunchyrollEpisodeUrlSetKey(collectCrunchyrollEpisodesFromCurrentDom());
    seeMoreBtn.click();
    await waitForPollCondition(
      () => {
        if (document.querySelector('[aria-label="Seasons"]')) return true;
        if (document.querySelectorAll('div[role="option"]').length > 0) return true;
        return crunchyrollEpisodeUrlSetKey(collectCrunchyrollEpisodesFromCurrentDom()) !== beforeKey;
      },
      3000
    );
  }
  const trigger = document.querySelector('[aria-label="Seasons"]');
  if (!trigger) return false;
  if (trigger.getAttribute('aria-expanded') !== 'true') {
    trigger.click();
    await waitForPollCondition(
      () => document.querySelectorAll('div[role="option"]').length > 0,
      3000
    );
  }
  return document.querySelectorAll('div[role="option"]').length > 0;
}

function findCrunchyrollSeasonOptions() {
  return Array.from(document.querySelectorAll('div[role="option"]')).map(el => ({
    el,
    label: el.textContent.trim(),
  }));
}

async function collectCrunchyrollEpisodesFromSeasonDropdown() {
  let all = collectCrunchyrollEpisodesFromCurrentDom();
  let lastSeasonEpisodes = all.slice();

  const dropdownReady = await openCrunchyrollSeasonDropdown();
  if (!dropdownReady) return all;

  const seasonOptions = findCrunchyrollSeasonOptions();
  if (!seasonOptions.length) return all;

  for (let i = 0; i < seasonOptions.length; i++) {
    const { label } = seasonOptions[i];

    if (i > 0) {
      const trigger = document.querySelector('[aria-label="Seasons"]');
      if (trigger && trigger.getAttribute('aria-expanded') !== 'true') {
        trigger.click();
        await waitForPollCondition(
          () => document.querySelectorAll('div[role="option"]').length > 0,
          3000
        );
      }
    }

    const freshOptions = findCrunchyrollSeasonOptions();
    const option = freshOptions.find(opt => opt.label === label);
    if (!option) continue;

    option.el.click();
    lastSeasonEpisodes = await waitForCrunchyrollSeasonEpisodes(lastSeasonEpisodes, {
      isFirstSeason: i === 0,
    });
    all = mergeCrunchyrollEpisodes(all, lastSeasonEpisodes);
  }

  return all;
}

async function collectCrunchyrollEpisodes() {
  const seriesId = getCurrentCrunchyrollSeriesId();
  if (!seriesId) {
    console.log('[Shufflr] Crunchyroll: no series id — cannot collect or cache episodes');
    return [];
  }

  const cached = await getCachedEpisodes(seriesId);
  if (cached?.length) return cached;

  console.log('[Shufflr] Crunchyroll: collecting episodes via season dropdown');
  const episodes = await collectCrunchyrollEpisodesFromSeasonDropdown();
  console.log(`[Shufflr] Crunchyroll: collected ${episodes.length} episode(s)`);
  if (episodes.length) {
    await setCachedEpisodes(seriesId, episodes, [], getCrunchyrollShowTitle() || null, null);
  }
  return episodes;
}

function pickRandomCrunchyrollEpisode(episodes, currentUrl = null) {
  if (!episodes?.length) return null;
  const normalizedCurrent = currentUrl?.split('?')[0] || null;
  const pool = normalizedCurrent
    ? episodes.filter(ep => ep.url !== normalizedCurrent)
    : episodes;
  const pickFrom = pool.length ? pool : episodes;
  return pickFrom[Math.floor(Math.random() * pickFrom.length)];
}

function isCrunchyrollShuffleActive() {
  return !!sessionStorage.getItem(CRUNCHYROLL_SHUFFLE_ACTIVE_KEY);
}

function isCrunchyrollShuffleActiveForShow(showId) {
  const activeShowId = sessionStorage.getItem(CRUNCHYROLL_SHUFFLE_ACTIVE_KEY);
  if (!activeShowId) return false;
  if (!showId) return true;
  return String(activeShowId) === String(showId);
}

function crunchyrollEpisodePlayKey(ep) {
  return ep?.url || `${ep?.episode || ''}:${ep?.title || ''}`;
}

/** Stable watch-path ID from a Crunchyroll episode URL (survives cache re-collection). */
function getCrunchyrollWatchEpisodeId(epOrUrl) {
  const url = typeof epOrUrl === 'string' ? epOrUrl : epOrUrl?.url;
  if (!url) return null;
  try {
    const path = new URL(url, 'https://www.crunchyroll.com').pathname;
    const match = path.match(/\/watch\/([^/]+)/i);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

async function readOrderedProgress() {
  if (!isChromeContextValid()) return {};
  const stored = await storageLocalGet(SHUFFLR_ORDERED_PROGRESS_KEY);
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
}

async function writeOrderedProgressForShow(showId, lastPlayedEpisodeId) {
  if (!isChromeContextValid() || !showId || !lastPlayedEpisodeId) return;
  const all = await readOrderedProgress();
  all[String(showId)] = {
    lastPlayedEpisodeId: String(lastPlayedEpisodeId),
    updatedAt: Date.now(),
  };
  await chromeStorageLocalSet({ [SHUFFLR_ORDERED_PROGRESS_KEY]: all });
}

async function readCrunchyrollOrderedProgress() {
  return readOrderedProgress();
}

async function writeCrunchyrollOrderedProgressForShow(showId, lastPlayedEpisodeId) {
  return writeOrderedProgressForShow(showId, lastPlayedEpisodeId);
}

function getCrunchyrollPlaylistShows(active) {
  return (active?.shows || []).filter(show => show?.crunchyrollId);
}

function isCrunchyrollArmedPayload(payload) {
  return !!(payload?.armed && payload.selectedService === 'crunchyroll');
}

/** Per-tab ID in sessionStorage — survives in-tab navigation, unique per tab. */
function getShufflrTabId() {
  try {
    let id = sessionStorage.getItem(SHUFFLR_TAB_ID_KEY);
    if (id) return id;
    id = `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SHUFFLR_TAB_ID_KEY, id);
    return id;
  } catch {
    return null;
  }
}

/** True only when this tab owns the armed handoff (Max, Crunchyroll, or Tubi). */
function isArmedPlaylistOwnedByThisTab(active = null) {
  if (!active?.armed) return false;
  const myId = getShufflrTabId();
  if (!myId || active.ownerTabId == null || active.ownerTabId === '') return false;
  return String(active.ownerTabId) === String(myId);
}

async function isArmedCrunchyrollPlaylist(active = null) {
  const payload = active || await getActivePlaylistFromStorage();
  return isCrunchyrollArmedPayload(payload) && isArmedPlaylistOwnedByThisTab(payload);
}

/** Handoff must be seconds/minutes old to claim via web Play launch (reject stale storage). */
function isArmedHandoffFreshForClaim(active) {
  const createdAt = getArmedSessionCreatedAt(active);
  if (!createdAt) return false;
  return Date.now() - createdAt <= ARMED_HANDOFF_CLAIM_MAX_AGE_MS;
}

/**
 * Claim an unowned armed handoff for this tab (web Play auto-start / Max launch).
 * Returns the owned payload, or null if another tab already owns it.
 */
async function claimUnownedArmedPlaylist(active) {
  if (!active?.armed || !isChromeContextValid()) return null;
  const myId = getShufflrTabId();
  if (!myId) return null;

  if (active.ownerTabId != null && active.ownerTabId !== '') {
    return String(active.ownerTabId) === String(myId) ? active : null;
  }

  const updated = { ...active, ownerTabId: myId };
  await chromeStorageLocalSet({ [SHUFFLR_ACTIVE_PLAYLIST_KEY]: updated });

  // Verify we won any race with another tab.
  const latest = await getActivePlaylistFromStorage();
  if (!isArmedPlaylistOwnedByThisTab(latest)) return null;
  return latest;
}

async function claimUnownedCrunchyrollArmedPlaylist(active) {
  if (!isCrunchyrollArmedPayload(active)) return null;
  return claimUnownedArmedPlaylist(active);
}

async function claimUnownedTubiArmedPlaylist(active) {
  if (!isTubiArmedPayload(active)) return null;
  return claimUnownedArmedPlaylist(active);
}

function maxHandoffTargetsThisTab(active) {
  const targetUrl = active?.currentEpisodeUrl;
  if (!targetUrl) {
    // Unclaimed handoffs without a URL may only be claimed when pendingFirstShow
    // explicitly targets this show page — never "any Max tab".
    if (active?.pendingFirstShow && active.pendingFirstShowId) {
      const pageId = extractMaxShowUuidFromUrl(location.href) || extractShowId(location.href);
      return !!(pageId && normalizeMaxId(pageId) === normalizeMaxId(active.pendingFirstShowId));
    }
    return false;
  }
  const hint = getShowMaxIdHintFromActive(active);
  if (maxWatchUrlsRepresentSameEpisode(location.href, targetUrl, hint)) return true;
  try {
    const launchPath = new URL(targetUrl, MAX_WATCH_ORIGIN).pathname;
    return !!(launchPath && location.href.includes(launchPath));
  } catch {
    return false;
  }
}

async function isMaxStandaloneLaunchPendingForThisPage() {
  if (!isChromeContextValid() || !IS_MAX) return false;
  try {
    const result = await chrome.storage.local.get([
      SHUFFLR_LAUNCH_SHOW_URL_KEY,
      SHUFFLR_LAUNCH_STANDALONE_KEY,
    ]);
    if (result[SHUFFLR_LAUNCH_STANDALONE_KEY] !== true) return false;
    const launchUrl = result[SHUFFLR_LAUNCH_SHOW_URL_KEY];
    if (!launchUrl) return false;
    let launchPath = '';
    try {
      launchPath = new URL(launchUrl).pathname;
    } catch {
      return false;
    }
    return !!(launchPath && location.href.includes(launchPath));
  } catch {
    return false;
  }
}

/**
 * Max web-Play / playlist claim: unclaimed + fresh (~2 min) + handoff URL targets this tab.
 * Standalone/single-show launches must never claim.
 * Returns the (possibly claimed) payload.
 */
async function maybeClaimUnownedMaxArmedHandoff(active) {
  if (!IS_MAX || !active?.armed || isCrunchyrollArmedPayload(active) || isTubiArmedPayload(active)) {
    return active;
  }
  if (isArmedPlaylistOwnedByThisTab(active)) return active;

  if (active.ownerTabId != null && active.ownerTabId !== '') {
    return active;
  }
  // Your Shows / standalone launches never adopt an unclaimed playlist handoff.
  if (await isMaxStandaloneLaunchPendingForThisPage()) return active;
  if (!isArmedHandoffFreshForClaim(active)) return active;
  if (!maxHandoffTargetsThisTab(active)) return active;

  const claimed = await claimUnownedArmedPlaylist(active);
  return claimed || active;
}

function isMaxShowPage() {
  return IS_MAX && location.href.includes('/show/');
}

/**
 * True only when the handoff's own launch target is this show page —
 * not merely "this show appears somewhere in the playlist".
 */
function maxArmedHandoffTargetsCurrentShowPage(active) {
  if (!active?.armed || !isMaxShowPage()) return false;
  const pageShowId = extractMaxShowUuidFromUrl(location.href) || extractShowId(location.href);
  if (!pageShowId) return false;
  const pageNorm = normalizeMaxId(pageShowId);

  if (active.pendingFirstShow && active.pendingFirstShowId
    && normalizeMaxId(active.pendingFirstShowId) === pageNorm) {
    return true;
  }
  if (active.currentEpisodeUrl && String(active.currentEpisodeUrl).includes('/show/')) {
    const handoffShow = extractMaxShowUuidFromUrl(active.currentEpisodeUrl);
    if (handoffShow && normalizeMaxId(handoffShow) === pageNorm) return true;
  }
  // Watch-URL handoffs that somehow landed on the matching show page.
  if (active.currentEpisode?.showId && normalizeMaxId(active.currentEpisode.showId) === pageNorm) {
    return true;
  }
  if (active.currentShow?.showId && normalizeMaxId(active.currentShow.showId) === pageNorm) {
    return true;
  }
  return false;
}

async function clearMaxPendingFirstShowFlag(active) {
  if (!isChromeContextValid() || !active) return active;
  if (!active.pendingFirstShow && !active.pendingFirstShowId) return active;
  const updated = { ...active };
  delete updated.pendingFirstShow;
  delete updated.pendingFirstShowId;
  await chromeStorageLocalSet({ [SHUFFLR_ACTIVE_PLAYLIST_KEY]: updated });
  return updated;
}

function hasConsumedMaxShowPageAutoStart(active) {
  const createdAt = getArmedSessionCreatedAt(active);
  if (!createdAt) return false;
  try {
    return sessionStorage.getItem(SHUFFLR_MAX_SHOW_AUTOSTART_KEY) === String(createdAt);
  } catch {
    return false;
  }
}

function markMaxShowPageAutoStartConsumed(active) {
  const createdAt = getArmedSessionCreatedAt(active);
  if (!createdAt) return;
  try {
    sessionStorage.setItem(SHUFFLR_MAX_SHOW_AUTOSTART_KEY, String(createdAt));
  } catch { /* ignore */ }
}

/**
 * Plan-B for Max playlist Play: show-page landing with a fresh armed handoff
 * auto-continues into an episode (same role as Crunchyroll pending collect).
 * Ordered mode keeps show-page + Max resume — skipped here.
 */
async function maybeAutoStartMaxArmedPlaylistOnShowPage(activeOverride = null) {
  if (!isChromeContextValid() || !isMaxShowPage()) return false;
  if (window.__shufflrMaxShowAutoStartInFlight) return false;

  let active = activeOverride || await getActivePlaylistFromStorage();
  if (!active?.armed || isCrunchyrollArmedPayload(active) || isTubiArmedPayload(active)) return false;

  active = await maybeClaimUnownedMaxArmedHandoff(active);
  if (!isArmedPlaylistOwnedByThisTab(active)) return false;
  if (!maxArmedHandoffTargetsCurrentShowPage(active)) return false;

  const settings = await readShuffleSettings();
  orderedEpisodesCached = !!settings.orderedEpisodes;
  if (settings.orderedEpisodes) return false;

  const pending = !!active.pendingFirstShow;
  const hasWatchTarget = !!(
    active.currentEpisode?.alternateId
    || (active.currentEpisodeUrl && String(active.currentEpisodeUrl).includes('/video/'))
  );
  // Auto-start only for this handoff's own show-page launch target.
  if (!pending && hasWatchTarget) return false;
  if (!pending && !maxArmedHandoffTargetsCurrentShowPage(active)) return false;
  if (!isArmedHandoffFreshForClaim(active)) return false;
  if (hasConsumedMaxShowPageAutoStart(active)) return false;

  window.__shufflrMaxShowAutoStartInFlight = true;
  markMaxShowPageAutoStartConsumed(active);
  try {
    active = await clearMaxPendingFirstShowFlag(active);
    showToast('Starting playlist...');
    console.log('[Shufflr] Max show-page auto-start — collecting episodes and playing');
    await shuffleFromActivePlaylist(active, { mode: 'user' });
    return true;
  } catch (err) {
    console.error('[Shufflr] Max show-page auto-start error:', err);
    return false;
  } finally {
    window.__shufflrMaxShowAutoStartInFlight = false;
  }
}

function getArmedSessionCreatedAt(active) {
  const raw = active?.createdAt ?? active?.sessionStartedAt;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function saveCrunchyrollPlaylistShuffleState(
  active,
  pickShow,
  pickEp,
  playedByShow,
  lastPlayedShow,
  roundPlayedShows,
  nextEpisodeIndexByShow = {}
) {
  if (!isChromeContextValid()) return;
  const showId = String(pickShow.crunchyrollId);
  const indexes = { ...(nextEpisodeIndexByShow || {}) };
  const createdAt = active.createdAt || getArmedSessionCreatedAt(active) || Date.now();
  const activePayload = {
    ...active,
    armed: true,
    selectedService: 'crunchyroll',
    shows: [...(active.shows || [])],
    episodes: [...(active.episodes || [])],
    playlistName: active.playlistName || '',
    playlistIndex: active.playlistIndex ?? 0,
    createdAt,
    ownerTabId: active.ownerTabId ?? getShufflrTabId(),
    currentEpisode: pickEp ? {
      showId,
      showName: pickShow.title || pickShow.name || '',
      name: pickEp.title || '',
      episode_number: pickEp.episode || null,
      id: crunchyrollEpisodePlayKey(pickEp),
      url: pickEp.url,
    } : (active.currentEpisode || null),
    currentEpisodeUrl: pickEp?.url || active.currentEpisodeUrl || null,
    lastPlayedShow,
    roundPlayedShows: serializeRoundPlayedShows(roundPlayedShows),
    nextEpisodeIndexByShow: indexes,
    sessionStartedAt: Date.now(),
  };
  const episodeState = {
    playedByShow: serializePlayedByShow(playedByShow),
    lastPlayedShow,
    roundPlayedShows: serializeRoundPlayedShows(roundPlayedShows),
    nextEpisodeIndexByShow: indexes,
    playlistName: active.playlistName || '',
    playlistIndex: active.playlistIndex ?? 0,
  };
  await chromeStorageLocalSet({
    [SHUFFLR_ACTIVE_PLAYLIST_KEY]: activePayload,
    [SHUFFLR_EPISODE_STATE_KEY]: episodeState,
  });
}

function clearCrunchyrollPending() {
  try {
    sessionStorage.removeItem(CRUNCHYROLL_PENDING_KEY);
  } catch { /* ignore */ }
}

function readCrunchyrollPending() {
  try {
    const raw = sessionStorage.getItem(CRUNCHYROLL_PENDING_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw);
    if (!pending?.targetCrunchyrollId || !pending?.createdAt) {
      clearCrunchyrollPending();
      return null;
    }
    if (Date.now() - pending.createdAt > CRUNCHYROLL_PENDING_TTL_MS) {
      console.log('[Shufflr] Crunchyroll pending expired — discarding');
      clearCrunchyrollPending();
      return null;
    }
    return pending;
  } catch {
    clearCrunchyrollPending();
    return null;
  }
}

function writeCrunchyrollPending(targetCrunchyrollId, seriesUrl) {
  sessionStorage.setItem(CRUNCHYROLL_PENDING_KEY, JSON.stringify({
    targetCrunchyrollId: String(targetCrunchyrollId),
    seriesUrl: seriesUrl || null,
    createdAt: Date.now(),
  }));
}

function pickCrunchyrollEpisodeHonoringPlayed(episodes, playedByShow, showId, currentUrl = null) {
  if (!episodes?.length) return null;
  const sid = String(showId);
  if (!playedByShow[sid]) playedByShow[sid] = new Set();

  let unplayed = episodes.filter(ep => !playedByShow[sid].has(crunchyrollEpisodePlayKey(ep)));
  if (!unplayed.length) {
    playedByShow[sid].clear();
    unplayed = episodes.slice();
  }

  const normalizedCurrent = currentUrl ? String(currentUrl).split('?')[0] : null;
  let episodePool = unplayed.filter(ep => ep.url && (!normalizedCurrent || ep.url !== normalizedCurrent));
  if (!episodePool.length) episodePool = unplayed.filter(ep => ep.url);
  if (!episodePool.length) return null;

  const pickEp = episodePool[Math.floor(Math.random() * episodePool.length)];
  playedByShow[sid].add(crunchyrollEpisodePlayKey(pickEp));
  return pickEp;
}

function getCrunchyrollSeriesUrlFromPlaylistShow(show) {
  if (!show) return null;
  if (show.crunchyrollSeriesUrl) return show.crunchyrollSeriesUrl;
  if (!show.crunchyrollId) return null;
  const slug = String(show.title || show.name || 'show')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `https://www.crunchyroll.com/series/${show.crunchyrollId}/${slug}`;
}

async function loadCrunchyrollPlaylistPlayState(active) {
  const playlistIndex = active.playlistIndex ?? 0;
  let { playedByShow, lastPlayedShow, roundPlayedShows, nextEpisodeIndexByShow } =
    await loadEpisodeStateForPlaylist(
      { name: active.playlistName || '' },
      playlistIndex
    );
  if (!(roundPlayedShows instanceof Set)) {
    roundPlayedShows = deserializeRoundPlayedShows(roundPlayedShows);
  }
  if (!lastPlayedShow && active.lastPlayedShow) {
    lastPlayedShow = String(active.lastPlayedShow);
  }
  if ((!roundPlayedShows || roundPlayedShows.size === 0) && active.roundPlayedShows) {
    roundPlayedShows = deserializeRoundPlayedShows(active.roundPlayedShows);
  }
  if (
    (!nextEpisodeIndexByShow || !Object.keys(nextEpisodeIndexByShow).length)
    && active.nextEpisodeIndexByShow
  ) {
    nextEpisodeIndexByShow = { ...active.nextEpisodeIndexByShow };
  }
  return {
    playedByShow,
    lastPlayedShow,
    roundPlayedShows,
    nextEpisodeIndexByShow: { ...(nextEpisodeIndexByShow || {}) },
  };
}

/**
 * Sequential pick using season-walk cache order.
 * Persistent shufflr_ordered_progress (by watch-URL ID) is the source of truth;
 * nextEpisodeIndexByShow is kept as a per-session mirror.
 */
async function pickOrderedCrunchyrollEpisode(episodes, showId, nextEpisodeIndexByShow) {
  if (!episodes?.length) return null;
  const sid = String(showId);

  const progress = await readCrunchyrollOrderedProgress();
  const lastId = progress[sid]?.lastPlayedEpisodeId
    ? String(progress[sid].lastPlayedEpisodeId)
    : null;

  let idx = 0;
  if (lastId) {
    const found = episodes.findIndex(ep => getCrunchyrollWatchEpisodeId(ep) === lastId);
    if (found >= 0) {
      idx = (found + 1) % episodes.length;
    }
    // Not found in current list → start at first episode.
  } else {
    const sessionIdx = Number(nextEpisodeIndexByShow[sid]);
    if (Number.isFinite(sessionIdx) && sessionIdx >= 0) {
      idx = sessionIdx % episodes.length;
    }
  }

  const pickEp = episodes[idx];
  if (!pickEp?.url) return null;

  nextEpisodeIndexByShow[sid] = (idx + 1) % episodes.length;

  const episodeId = getCrunchyrollWatchEpisodeId(pickEp);
  if (episodeId) {
    await writeCrunchyrollOrderedProgressForShow(sid, episodeId);
  }

  return pickEp;
}

async function restoreCrunchyrollShuffleSession() {
  if (!isCrunchyroll) return false;
  // Ensure tab ID exists early; series-page auto-start may claim ownership below.
  getShufflrTabId();

  let active = await getActivePlaylistFromStorage();
  if (isCrunchyrollSeriesPage() && isCrunchyrollArmedPayload(active)) {
    await maybeResumeCrunchyrollPendingCollect();
    active = await getActivePlaylistFromStorage();
  }

  // Standalone web launch auto-start — only when not already in an owned armed playlist.
  if (isCrunchyrollSeriesPage() && !isArmedPlaylistOwnedByThisTab(active)) {
    const started = await maybeAutoStartCrunchyrollStandaloneLaunch();
    if (started) return true;
    active = await getActivePlaylistFromStorage();
  }

  const armedCr = isArmedPlaylistOwnedByThisTab(active);
  if (armedCr) {
    console.log('[Shufflr] armed playlist owned by this tab');
  } else if (isCrunchyrollArmedPayload(active)) {
    console.log('[Shufflr] armed playlist ignored — owned by another tab (or unclaimed)');
  }

  if (!isCrunchyrollShuffleActive() && !armedCr) {
    shufflrActive = false;
    armedPlaylistCached = false;
    if (hasShufflrButtonInDom()) updateShuffleUI('');
    return false;
  }

  shufflrActive = true;
  if (armedCr) armedPlaylistCached = true;
  if (hasShufflrButtonInDom()) {
    updateShuffleUI(
      armedCr
        ? (active.playlistName || 'Playlist')
        : getCrunchyrollShowTitle()
    );
  }
  if (isCrunchyrollWatchPage()) {
    void installCrunchyrollEpisodeEndWatcher();
  }
  return true;
}

function teardownCrunchyrollEpisodeEndWatcher() {
  if (crunchyrollTimeupdateVideo && crunchyrollTimeupdateHandler) {
    crunchyrollTimeupdateVideo.removeEventListener('timeupdate', crunchyrollTimeupdateHandler);
  }
  crunchyrollTimeupdateVideo = null;
  crunchyrollTimeupdateHandler = null;
  crunchyrollEpisodeEndTriggered = false;
}

async function stopCrunchyrollShuffle() {
  shufflrActive = false;
  sessionStorage.removeItem(CRUNCHYROLL_SHUFFLE_ACTIVE_KEY);
  clearCrunchyrollSessionPin();
  clearCrunchyrollPending();
  teardownCrunchyrollEpisodeEndWatcher();
  const active = await getActivePlaylistFromStorage();
  // Only the owning tab may clear the armed handoff.
  if (isArmedPlaylistOwnedByThisTab(active)) {
    await clearActivePlaylist();
  }
  armedPlaylistCached = false;
  void resetShuffleModeToSingle();
  updateShuffleUI('');
  showToast('Shufflr OFF');
  console.log('[Shufflr] Crunchyroll shuffle turned off');
}

async function navigateToRandomCrunchyrollEpisodeForCurrentShow(source = 'episode-end', options = {}) {
  const requireActiveSession = options.requireActiveSession !== false;
  const navMode = options.mode === 'user' || source === 'toggle-start' ? 'user' : 'auto';
  if (navMode === 'auto' && isShufflrAutoNavStopped()) return;
  const seriesId = getCurrentCrunchyrollSeriesId();
  if (!seriesId) {
    console.log(`[Shufflr] Crunchyroll: no series id — cannot shuffle (${source})`);
    return;
  }
  if (requireActiveSession && !isCrunchyrollShuffleActiveForShow(seriesId)) return;

  const episodes = await collectCrunchyrollEpisodes();
  if (!episodes?.length) {
    console.log(`[Shufflr] Crunchyroll: no cached episodes for shuffle (${source})`);
    return;
  }

  const pick = pickRandomCrunchyrollEpisode(episodes, location.href);
  if (!pick) return;

  const showName = getCrunchyrollShowTitle() || 'Crunchyroll';
  showToast(`Shuffling ${showName}...`);
  console.log(`[Shufflr] Crunchyroll shuffle (${source}): → ${pick.url}`);
  await shufflrNavigateTo(pick.url, {
    mode: navMode,
    source: `crunchyroll-${source}`,
    skipIfStale: source === 'cop'
      ? () => !isCrunchyrollWatchPage() || !shufflrActive
      : null,
    beforeNavigate: () => {
      crunchyrollEpisodeEndTriggered = true;
      captureFullscreenBeforeShufflrNavigation();
    },
  });
  setTimeout(() => {
    crunchyrollEpisodeEndTriggered = false;
    void installCrunchyrollEpisodeEndWatcher();
  }, 3000);
}

async function clearCrunchyrollPendingFirstShowFlag(active) {
  if (!isChromeContextValid() || !active) return active;
  if (!active.pendingFirstShow && !active.pendingFirstShowId) return active;
  const updated = { ...active };
  delete updated.pendingFirstShow;
  delete updated.pendingFirstShowId;
  await chromeStorageLocalSet({ [SHUFFLR_ACTIVE_PLAYLIST_KEY]: updated });
  return updated;
}

async function completeCrunchyrollSeriesCollectAndPlay(activePayload, targetCrunchyrollId, source = 'pending-collect') {
  if (!isChromeContextValid()) return false;
  let active = activePayload || await getActivePlaylistFromStorage();
  if (!(await isArmedCrunchyrollPlaylist(active))) return false;

  const showId = String(targetCrunchyrollId);
  const showEntry = getCrunchyrollPlaylistShows(active).find(
    s => String(s.crunchyrollId) === showId
  );
  const title = showEntry?.title || showEntry?.name || showId;

  // Clear first-play flag immediately so a series-page refresh does not restart playback.
  active = await clearCrunchyrollPendingFirstShowFlag(active);
  clearCrunchyrollPending();

  showToast(`Loading ${title}...`);
  console.log(`[Shufflr] Pending collect starting for ${showId} (${source})`);

  const episodes = await collectCrunchyrollEpisodes();
  if (!episodes?.length) {
    console.log(`[Shufflr] Pending collect failed for ${showId}`);
    await shuffleFromActiveCrunchyrollPlaylist(active, `${source}-failed`, {
      excludeShowIds: new Set([showId]),
    });
    return true;
  }

  let { playedByShow, roundPlayedShows, nextEpisodeIndexByShow } =
    await loadCrunchyrollPlaylistPlayState(active);
  const settings = await readShuffleSettings();
  orderedEpisodesCached = !!settings.orderedEpisodes;
  const pickEp = settings.orderedEpisodes
    ? await pickOrderedCrunchyrollEpisode(episodes, showId, nextEpisodeIndexByShow)
    : pickCrunchyrollEpisodeHonoringPlayed(episodes, playedByShow, showId, null);
  if (!pickEp?.url) {
    console.log(`[Shufflr] Pending collect failed for ${showId}`);
    await shuffleFromActiveCrunchyrollPlaylist(active, `${source}-failed`, {
      excludeShowIds: new Set([showId]),
    });
    return true;
  }

  roundPlayedShows.add(showId);
  await saveCrunchyrollPlaylistShuffleState(
    active,
    showEntry || { crunchyrollId: showId, title },
    pickEp,
    playedByShow,
    showId,
    roundPlayedShows,
    nextEpisodeIndexByShow
  );

  shufflrActive = true;
  armedPlaylistCached = true;
  showToast(`Playing: ${title}`);
  console.log(`[Shufflr] Pending collect complete: ${title} → ${pickEp.url}`);
  const isFirstPlay = String(source).includes('play-first') || String(source).includes('standalone-launch');
  await shufflrNavigateTo(pickEp.url, {
    mode: isFirstPlay ? 'user' : 'auto',
    bypassCooldown: !isFirstPlay,
    source: `crunchyroll-${source}`,
    beforeNavigate: () => {
      crunchyrollEpisodeEndTriggered = true;
      captureFullscreenBeforeShufflrNavigation();
    },
  });
  setTimeout(() => {
    crunchyrollEpisodeEndTriggered = false;
    void installCrunchyrollEpisodeEndWatcher();
  }, 3000);
  return true;
}

async function maybeResumeCrunchyrollPendingCollect() {
  if (!isChromeContextValid() || !isCrunchyrollSeriesPage()) return false;
  if (window.__shufflrCrunchyrollPendingResume) return false;

  const currentId = getCurrentCrunchyrollSeriesId();
  if (!currentId) return false;

  let active = await getActivePlaylistFromStorage();
  if (!isCrunchyrollArmedPayload(active)) {
    clearCrunchyrollPending();
    return false;
  }

  const pending = readCrunchyrollPending();
  let targetId = null;
  let source = 'pending-collect';

  if (pending && String(pending.targetCrunchyrollId) === String(currentId)) {
    targetId = String(pending.targetCrunchyrollId);
    source = 'pending-collect';
  } else if (
    active.pendingFirstShow
    && active.pendingFirstShowId
    && String(active.pendingFirstShowId) === String(currentId)
  ) {
    targetId = String(active.pendingFirstShowId);
    source = 'play-first-show';
  } else if (pending) {
    console.log(
      `[Shufflr] Pending collect waiting for series ${pending.targetCrunchyrollId} ` +
      `(on ${currentId})`
    );
    return false;
  } else {
    return false;
  }

  // Ownership: claim unowned handoff when consuming auto-start; never steal from another tab.
  const myId = getShufflrTabId();
  if (
    active.ownerTabId != null
    && active.ownerTabId !== ''
    && String(active.ownerTabId) !== String(myId)
  ) {
    console.log('[Shufflr] armed playlist ignored — owned by another tab (or unclaimed)');
    return false;
  }
  if (active.ownerTabId == null || active.ownerTabId === '') {
    const claimed = await claimUnownedCrunchyrollArmedPlaylist(active);
    if (!claimed) {
      console.log('[Shufflr] armed playlist ignored — owned by another tab (or unclaimed)');
      return false;
    }
    active = claimed;
  }
  if (!isArmedPlaylistOwnedByThisTab(active)) {
    console.log('[Shufflr] armed playlist ignored — owned by another tab (or unclaimed)');
    return false;
  }
  console.log('[Shufflr] armed playlist owned by this tab');
  // Playlist auto-start wins — drop any standalone launch keys so they cannot re-trigger.
  await clearCrunchyrollStandaloneLaunchKeys();
  clearCrunchyrollSessionPin();

  window.__shufflrCrunchyrollPendingResume = true;
  try {
    return await completeCrunchyrollSeriesCollectAndPlay(active, targetId, source);
  } finally {
    window.__shufflrCrunchyrollPendingResume = false;
  }
}

async function shuffleFromActiveCrunchyrollPlaylist(activePayload, source = 'episode-end', options = {}) {
  if (!isChromeContextValid()) return;
  const active = activePayload || await getActivePlaylistFromStorage();
  if (!(await isArmedCrunchyrollPlaylist(active))) return;

  const excludeShowIds = options.excludeShowIds instanceof Set
    ? options.excludeShowIds
    : new Set(options.excludeShowIds || []);

  const shows = getCrunchyrollPlaylistShows(active).filter(
    show => !excludeShowIds.has(String(show.crunchyrollId))
  );
  if (!shows.length) {
    console.log('[Shufflr] Crunchyroll playlist has no remaining shows to pick');
    await navigateToRandomCrunchyrollEpisodeForCurrentShow(source, { requireActiveSession: false });
    return;
  }

  let { playedByShow, lastPlayedShow, roundPlayedShows, nextEpisodeIndexByShow } =
    await loadCrunchyrollPlaylistPlayState(active);

  const settings = await readShuffleSettings();
  orderedEpisodesCached = !!settings.orderedEpisodes;
  // ALL mode forces unordered picks — Max treats ordered as playlist-only.
  const useOrdered = !options.forceUnordered && !!settings.orderedEpisodes;

  const entries = shows.map(show => ({
    show,
    id: String(show.crunchyrollId),
    title: show.title || show.name || String(show.crunchyrollId),
  }));

  let roundPool = entries.filter(entry => !roundPlayedShows.has(entry.id));
  if (!roundPool.length) {
    roundPlayedShows.clear();
    roundPool = entries.slice();
  }
  let pool = roundPool;
  if (lastPlayedShow && pool.length > 1) {
    const withoutLast = pool.filter(entry => entry.id !== String(lastPlayedShow));
    if (withoutLast.length) pool = withoutLast;
  }

  const chosenEntry = pool[Math.floor(Math.random() * pool.length)];
  if (!chosenEntry) {
    await navigateToRandomCrunchyrollEpisodeForCurrentShow(source, { requireActiveSession: false });
    return;
  }

  const showId = chosenEntry.id;
  const cached = await getCachedEpisodes(showId);

  // Cache hit — jump straight to an episode (Phase B path).
  if (cached?.length) {
    const pickEp = useOrdered
      ? await pickOrderedCrunchyrollEpisode(cached, showId, nextEpisodeIndexByShow)
      : pickCrunchyrollEpisodeHonoringPlayed(
        cached,
        playedByShow,
        showId,
        location.href
      );
    if (!pickEp?.url) {
      console.log(`[Shufflr] Playlist pick ${chosenEntry.title} has no usable episode URLs`);
      await shuffleFromActiveCrunchyrollPlaylist(active, source, {
        excludeShowIds: new Set([...excludeShowIds, showId]),
        forceUnordered: options.forceUnordered,
      });
      return;
    }

    roundPlayedShows.add(showId);
    await saveCrunchyrollPlaylistShuffleState(
      active,
      chosenEntry.show,
      pickEp,
      playedByShow,
      showId,
      roundPlayedShows,
      nextEpisodeIndexByShow
    );

    shufflrActive = true;
    armedPlaylistCached = true;
    showToast(`Playing: ${chosenEntry.title}`);
    console.log(
      `[Shufflr] Crunchyroll playlist ${useOrdered ? 'ordered' : 'shuffle'} (${source}): ` +
      `${chosenEntry.title} → ${pickEp.url}`
    );
    await shufflrNavigateTo(pickEp.url, {
      mode: 'auto',
      source: `crunchyroll-playlist-${source}`,
      beforeNavigate: () => {
        crunchyrollEpisodeEndTriggered = true;
        captureFullscreenBeforeShufflrNavigation();
      },
    });
    setTimeout(() => {
      crunchyrollEpisodeEndTriggered = false;
      void installCrunchyrollEpisodeEndWatcher();
    }, 3000);
    return;
  }

  // Cache miss — hop to series page, collect, then resume (Phase C).
  const seriesUrl = getCrunchyrollSeriesUrlFromPlaylistShow(chosenEntry.show);
  if (!seriesUrl) {
    console.log(`[Shufflr] Playlist pick ${chosenEntry.title} has no series URL — excluding`);
    await shuffleFromActiveCrunchyrollPlaylist(active, source, {
      excludeShowIds: new Set([...excludeShowIds, showId]),
      forceUnordered: options.forceUnordered,
    });
    return;
  }

  console.log(`[Shufflr] Playlist pick ${chosenEntry.title} not cached — hopping to series page`);
  roundPlayedShows.add(showId);
  await saveCrunchyrollPlaylistShuffleState(
    active,
    chosenEntry.show,
    null,
    playedByShow,
    showId,
    roundPlayedShows,
    nextEpisodeIndexByShow
  );
  writeCrunchyrollPending(showId, seriesUrl);
  shufflrActive = true;
  armedPlaylistCached = true;
  showToast(`Loading ${chosenEntry.title}...`);
  await shufflrNavigateTo(seriesUrl, {
    mode: 'auto',
    source: `crunchyroll-pending-hop-${source}`,
    beforeNavigate: () => {
      crunchyrollEpisodeEndTriggered = true;
      captureFullscreenBeforeShufflrNavigation();
    },
  });
  setTimeout(() => {
    crunchyrollEpisodeEndTriggered = false;
  }, 3000);
}

async function navigateToRandomCrunchyrollEpisode(source = 'episode-end') {
  if (!isChromeContextValid()) return;

  const active = await getActivePlaylistFromStorage();
  if (isCrunchyrollArmedPayload(active) && !isArmedPlaylistOwnedByThisTab(active)) {
    console.log('[Shufflr] armed playlist ignored — owned by another tab (or unclaimed)');
  }
  const armedCr = isArmedPlaylistOwnedByThisTab(active);
  if (armedCr) {
    console.log('[Shufflr] armed playlist owned by this tab');
  }
  const isSyntheticYourShowsAll = !!(
    armedCr
    && (active?.playlistIndex === -1 || active?.playlistName === YOUR_SHOWS_ALL_MODE_NAME)
  );
  const settings = await readShuffleSettings();
  orderedEpisodesCached = !!settings.orderedEpisodes;
  shuffleModeCached = settings.shuffleMode;

  // Real armed playlists take priority. Ordered also wins over ALL when armed (Max).
  if (armedCr && (!isSyntheticYourShowsAll || settings.orderedEpisodes)) {
    await shuffleFromActiveCrunchyrollPlaylist(active, source);
    return;
  }

  // Your Shows card Play pin: stay on that show even when global mode is ALL.
  if (isCrunchyrollSessionPinnedToCurrentShow()) {
    await navigateToRandomCrunchyrollEpisodeForCurrentShow(source);
    return;
  }

  if (settings.shuffleMode === 'all') {
    await shuffleFromCrunchyrollYourShowsAllMode(source);
    return;
  }

  if (armedCr) {
    await shuffleFromActiveCrunchyrollPlaylist(active, source);
    return;
  }

  await navigateToRandomCrunchyrollEpisodeForCurrentShow(source);
}

async function shuffleFromCrunchyrollYourShowsAllMode(source = 'episode-end') {
  if (!isChromeContextValid()) return;

  const syntheticPayload = await armCrunchyrollYourShowsAllModeSession({
    seedLastPlayedShow: true,
  });
  if (!syntheticPayload) {
    showToast('No Crunchyroll shows in Your Shows — add shows using +');
    await navigateToRandomCrunchyrollEpisodeForCurrentShow(source);
    return;
  }

  const currentId = getCurrentCrunchyrollSeriesId();
  const showCount = getCrunchyrollPlaylistShows(syntheticPayload).length;
  console.log(
    `[Shufflr] Crunchyroll ALL mode: ${showCount} Your Shows — shuffling (${source})`
  );

  const excludeShowIds = (currentId && showCount > 1)
    ? new Set([String(currentId)])
    : new Set();
  await shuffleFromActiveCrunchyrollPlaylist(syntheticPayload, source, {
    excludeShowIds,
    forceUnordered: true,
  });
}

/**
 * Arm the synthetic Your Shows ALL session (same shape episode-end expects).
 * Does not navigate — caller picks the first episode.
 */
async function armCrunchyrollYourShowsAllModeSession(options = {}) {
  if (!isChromeContextValid()) return null;

  const { shows: libraryShows } = await readYourShowsPreferCloud();
  const yourShows = (libraryShows || []).filter(show => show?.crunchyrollId);
  if (!yourShows.length) return null;

  const prior = await getActivePlaylistFromStorage();
  const currentId = getCurrentCrunchyrollSeriesId();
  const priorArmed = isArmedPlaylistOwnedByThisTab(prior);
  const createdAt = (priorArmed && getArmedSessionCreatedAt(prior)) || Date.now();
  const syntheticPayload = {
    ...(priorArmed ? prior : {}),
    armed: true,
    selectedService: 'crunchyroll',
    playlistName: YOUR_SHOWS_ALL_MODE_NAME,
    playlistIndex: -1,
    shows: yourShows,
    episodes: [],
    createdAt,
    sessionStartedAt: Date.now(),
    ownerTabId: getShufflrTabId(),
  };
  if (options.seedLastPlayedShow && currentId) {
    syntheticPayload.lastPlayedShow = String(currentId);
  } else {
    delete syntheticPayload.lastPlayedShow;
  }

  await chromeStorageLocalSet({ [SHUFFLR_ACTIVE_PLAYLIST_KEY]: syntheticPayload });
  shufflrActive = true;
  armedPlaylistCached = true;
  // ALL-mode session replaces any single-show pin.
  clearCrunchyrollSessionPin();
  if (hasShufflrButtonInDom()) {
    updateShuffleUI(YOUR_SHOWS_ALL_MODE_NAME);
  }
  console.log('[Shufflr] armed playlist owned by this tab');
  return syntheticPayload;
}

async function clearCrunchyrollStandaloneLaunchKeys() {
  if (!isChromeContextValid()) return;
  await chromeStorageLocalRemove(SHUFFLR_LAUNCH_SHOW_URL_KEY);
  await chromeStorageLocalRemove(SHUFFLR_LAUNCH_STANDALONE_KEY);
  await chromeStorageLocalRemove(SHUFFLR_LAUNCH_STANDALONE_AT_KEY);
  await chromeStorageLocalRemove(SHUFFLR_LAUNCH_INTENT_KEY);
}

function setCrunchyrollSessionPin(seriesId) {
  if (!seriesId) {
    clearCrunchyrollSessionPin();
    return;
  }
  try {
    sessionStorage.setItem(SHUFFLR_SESSION_PIN_KEY, String(seriesId));
  } catch { /* ignore */ }
}

function clearCrunchyrollSessionPin() {
  try {
    sessionStorage.removeItem(SHUFFLR_SESSION_PIN_KEY);
  } catch { /* ignore */ }
}

function getCrunchyrollSessionPin() {
  try {
    return sessionStorage.getItem(SHUFFLR_SESSION_PIN_KEY) || null;
  } catch {
    return null;
  }
}

/** True when this tab is pinned to a specific show (Your Shows card Play). */
function isCrunchyrollSessionPinnedToCurrentShow() {
  const pin = getCrunchyrollSessionPin();
  if (!pin) return false;
  const currentId = getCurrentCrunchyrollSeriesId();
  return !!(currentId && String(currentId) === String(pin));
}

// ── Max single-show pin (Your Shows card Play) — same sessionStorage key, Max origin ──
function setMaxSessionPin(maxId, title = null) {
  if (!maxId) {
    clearMaxSessionPin();
    return;
  }
  try {
    sessionStorage.setItem(SHUFFLR_SESSION_PIN_KEY, String(maxId));
    const label = title || getCurrentShowTitle() || String(maxId);
    console.log(`[Shufflr] single-intent launch — pinned to ${label}`);
  } catch { /* ignore */ }
}

function clearMaxSessionPin() {
  try {
    sessionStorage.removeItem(SHUFFLR_SESSION_PIN_KEY);
  } catch { /* ignore */ }
}

function getMaxSessionPin() {
  try {
    return sessionStorage.getItem(SHUFFLR_SESSION_PIN_KEY) || null;
  } catch {
    return null;
  }
}

/** True when this Max tab is pinned to the current show (Your Shows card Play). */
function isMaxSessionPinnedToCurrentShow() {
  if (!IS_MAX) return false;
  const pin = getMaxSessionPin();
  if (!pin) return false;
  const currentId = getCurrentMaxShowUuid()
    || extractMaxShowUuidFromUrl(location.href)
    || extractShowId(location.href)
    || resolveMaxWatchIds(location.href)?.showId;
  return !!(currentId && normalizeMaxId(currentId) === normalizeMaxId(pin));
}

function crunchyrollLaunchUrlMatchesCurrentSeries(launchUrl) {
  if (!launchUrl) return false;
  try {
    const launch = new URL(launchUrl, location.origin);
    const launchSeries = launch.pathname.match(/\/series\/([^/]+)/i)?.[1];
    const currentSeries = getCurrentCrunchyrollSeriesId();
    if (launchSeries && currentSeries && String(launchSeries) === String(currentSeries)) {
      return true;
    }
    const launchPath = launch.pathname.replace(/\/$/, '');
    const currentPath = location.pathname.replace(/\/$/, '');
    return !!(launchPath && currentPath && (
      currentPath === launchPath || currentPath.startsWith(`${launchPath}/`)
    ));
  } catch {
    return false;
  }
}

/**
 * Detect + consume a fresh standalone web launch targeting this series page.
 * Returns { seriesId } or null. Clears launch keys so refreshes do not re-trigger.
 */
async function consumeCrunchyrollStandaloneLaunchIfMatching() {
  if (!isChromeContextValid() || !isCrunchyrollSeriesPage()) return null;
  if (window.__shufflrCrStandaloneLaunchConsumed) return null;

  const result = await chrome.storage.local.get([
    SHUFFLR_LAUNCH_SHOW_URL_KEY,
    SHUFFLR_LAUNCH_STANDALONE_KEY,
    SHUFFLR_LAUNCH_STANDALONE_AT_KEY,
    SHUFFLR_LAUNCH_INTENT_KEY,
  ]);
  const launchUrl = result[SHUFFLR_LAUNCH_SHOW_URL_KEY];
  const isStandalone = result[SHUFFLR_LAUNCH_STANDALONE_KEY] === true;
  if (!isStandalone || !launchUrl) return null;
  if (!crunchyrollLaunchUrlMatchesCurrentSeries(launchUrl)) return null;

  let launchedAt = Number(result[SHUFFLR_LAUNCH_STANDALONE_AT_KEY]);
  if (!Number.isFinite(launchedAt) || launchedAt <= 0) {
    // Bridge may omit a time — treat first matching consume as now.
    launchedAt = Date.now();
  } else if (Date.now() - launchedAt > STANDALONE_LAUNCH_MAX_AGE_MS) {
    console.log('[Shufflr] Standalone launch expired — clearing');
    await clearCrunchyrollStandaloneLaunchKeys();
    return null;
  }

  const launchIntent = result[SHUFFLR_LAUNCH_INTENT_KEY] === 'single' ? 'single' : 'mode';

  window.__shufflrCrStandaloneLaunchConsumed = true;
  await clearCrunchyrollStandaloneLaunchKeys();

  const seriesId = getCurrentCrunchyrollSeriesId();
  if (!seriesId) return null;
  console.log('[Shufflr] Consumed standalone launch for series', seriesId, `(intent=${launchIntent})`);
  return { seriesId, launchUrl, launchIntent };
}

/**
 * Auto-start after a web-app standalone launch. Playlist armed flows take priority
 * (caller should skip when this tab already owns an armed playlist).
 */
async function maybeAutoStartCrunchyrollStandaloneLaunch() {
  if (!isChromeContextValid() || !isCrunchyrollSeriesPage()) return false;

  const launch = await consumeCrunchyrollStandaloneLaunchIfMatching();
  if (!launch?.seriesId) return false;

  const settings = await readShuffleSettings();
  shuffleModeCached = settings.shuffleMode;
  orderedEpisodesCached = !!settings.orderedEpisodes;

  // Your Shows card Play → always pin to this show (ignore global ALL).
  if (launch.launchIntent === 'single') {
    setCrunchyrollSessionPin(launch.seriesId);
    console.log('[Shufflr] Standalone launch → pinned single-show auto-start');
    await startCrunchyrollShuffle();
    return true;
  }

  // Power-button / mode-following launch — clear any prior pin and follow global mode.
  clearCrunchyrollSessionPin();

  if (settings.shuffleMode === 'all') {
    let synthetic = await armCrunchyrollYourShowsAllModeSession({ seedLastPlayedShow: false });
    if (!synthetic) {
      console.log('[Shufflr] ALL mode launch: no Your Shows — falling back to single-show');
      await startCrunchyrollShuffle();
      return true;
    }

    // Ensure the launched series is in the ALL pool so collect-pick can target it.
    const sid = String(launch.seriesId);
    if (!getCrunchyrollPlaylistShows(synthetic).some(s => String(s.crunchyrollId) === sid)) {
      synthetic = {
        ...synthetic,
        shows: [
          ...(synthetic.shows || []),
          {
            crunchyrollId: sid,
            title: getCrunchyrollShowTitle() || sid,
            crunchyrollSeriesUrl: location.href.split('?')[0],
            service: 'crunchyroll',
          },
        ],
      };
      await chromeStorageLocalSet({ [SHUFFLR_ACTIVE_PLAYLIST_KEY]: synthetic });
    }

    console.log('[Shufflr] Standalone launch → ALL mode auto-start');
    await completeCrunchyrollSeriesCollectAndPlay(synthetic, sid, 'standalone-launch-all');
    return true;
  }

  console.log('[Shufflr] Standalone launch → single-show auto-start (mode)');
  await startCrunchyrollShuffle();
  return true;
}

async function startCrunchyrollShuffle() {
  if (!isChromeContextValid()) return;
  clearShufflrAutoNavStopped();
  let seriesId = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    seriesId = getCurrentCrunchyrollSeriesId();
    if (seriesId) break;
    await new Promise(r => setTimeout(r, 500));
  }
  if (!seriesId) {
    showToast('Could not identify this show.');
    return;
  }
  const showName = getCrunchyrollShowTitle() || 'this show';
  showToast(`Shuffling ${showName}...`);

  const episodes = await collectCrunchyrollEpisodes();
  if (!episodes?.length) {
    showToast('Could not find episodes.');
    return;
  }

  sessionStorage.setItem(CRUNCHYROLL_SHUFFLE_ACTIVE_KEY, String(seriesId));
  shufflrActive = true;
  updateShuffleUI(showName);

  const pick = pickRandomCrunchyrollEpisode(episodes, location.href);
  if (!pick) {
    showToast('Could not pick an episode.');
    return;
  }

  console.log(`[Shufflr] Crunchyroll shuffle start: ${episodes.length} episodes → ${pick.url}`);
  await shufflrNavigateTo(pick.url, {
    mode: 'user',
    source: 'crunchyroll-toggle-start',
    beforeNavigate: () => {
      crunchyrollEpisodeEndTriggered = true;
      captureFullscreenBeforeShufflrNavigation();
    },
  });
  setTimeout(() => {
    crunchyrollEpisodeEndTriggered = false;
    void installCrunchyrollEpisodeEndWatcher();
  }, 3000);
}

async function installCrunchyrollEpisodeEndWatcher() {
  if (!isChromeContextValid() || !isCrunchyrollWatchPage()) return;

  const seriesId = getCurrentCrunchyrollSeriesId();
  const singleShowActive = isCrunchyrollShuffleActiveForShow(seriesId);
  const armedCr = await isArmedCrunchyrollPlaylist();
  if (!singleShowActive && !armedCr) return;

  const video = document.querySelector('video');
  if (!video) {
    setTimeout(() => { void installCrunchyrollEpisodeEndWatcher(); }, 1000);
    return;
  }

  if (crunchyrollTimeupdateVideo === video && crunchyrollTimeupdateHandler) return;

  if (crunchyrollTimeupdateVideo && crunchyrollTimeupdateHandler) {
    crunchyrollTimeupdateVideo.removeEventListener('timeupdate', crunchyrollTimeupdateHandler);
  }

  crunchyrollEpisodeEndTriggered = false;
  crunchyrollTimeupdateVideo = video;
  crunchyrollTimeupdateHandler = () => {
    if (crunchyrollEpisodeEndTriggered) return;
    if (!video.duration || !Number.isFinite(video.duration) || video.paused) return;
    if (isNonEpisodePlayback(video)) {
      logNonEpisodePlaybackIgnored(video);
      return;
    }
    const remaining = video.duration - video.currentTime;
    if (remaining > TIMEUPDATE_SHUFFLE_REMAINING_SEC) return;
    crunchyrollEpisodeEndTriggered = true;
    void navigateToRandomCrunchyrollEpisode('timeupdate');
  };

  video.addEventListener('timeupdate', crunchyrollTimeupdateHandler);
  video.addEventListener('playing', () => {
    showFullscreenRestorePrompt();
  }, { once: true });
  console.log('[Shufflr] Crunchyroll: episode-end watcher installed');
}

function installCrunchyrollButtonPersistenceObserver() {
  if (!isChromeContextValid()) return;
  if (window.__shufflrCrunchyrollButtonObserver) return;
  window.__shufflrCrunchyrollButtonObserver = true;

  crunchyrollButtonObserver = new MutationObserver(() => {
    if (!isCrunchyroll) return;
    if (!isCrunchyrollWatchPage() && !isCrunchyrollSeriesPage()) return;
    if (document.getElementById('shufflr-wrap')) return;
    void tryInjectButton();
  });
  crunchyrollButtonObserver.observe(document.body, { childList: true, subtree: true });
}

if (isCrunchyroll) {
  // Install immediately so SPA series↔watch navigation is tracked from any landing page.
  installCrunchyrollUrlObserver();

  setTimeout(() => {
    if (!isCrunchyroll) return;
    installCrunchyrollButtonPersistenceObserver();
    if (isCrunchyrollWatchPage() || isCrunchyrollSeriesPage()) {
      console.log('[Shufflr] Crunchyroll page — injecting Shufflr button');
      void tryInjectButton();
      restoreCrunchyrollShuffleSession();
    }
  }, 2500);

  // Crunchyroll shuffle cop — corrects native "up next" autoplay (watch→watch only).
  let crunchyrollLastUrl = location.href;
  const crunchyrollCopObserver = new MutationObserver(() => {
    if (!isChromeContextValid()) return;
    if (location.href === crunchyrollLastUrl) return;
    const previousUrl = crunchyrollLastUrl;
    crunchyrollLastUrl = location.href;
    if (!shufflrActive) return;
    // Video autoplay correction only applies on watch pages, and only for watch→watch jumps.
    if (!isCrunchyrollWatchPage()) return;
    let previousWasWatch = false;
    try {
      previousWasWatch = new URL(previousUrl).pathname.includes('/watch/');
    } catch {
      previousWasWatch = false;
    }
    if (!previousWasWatch) return;
    if (crunchyrollEpisodeEndTriggered) {
      crunchyrollEpisodeEndTriggered = false;
      return;
    }
    console.log('[Shufflr] Crunchyroll cop: native autoplay detected, correcting...');
    showToast('Shufflr correcting...');
    setTimeout(async () => {
      crunchyrollEpisodeEndTriggered = false;
      const seriesId = getCurrentCrunchyrollSeriesId();
      const armedCr = await isArmedCrunchyrollPlaylist();
      if (!armedCr && (!seriesId || !isCrunchyrollShuffleActiveForShow(seriesId))) return;
      await navigateToRandomCrunchyrollEpisode('cop');
    }, 500);
  });
  crunchyrollCopObserver.observe(document.body, { childList: true, subtree: true });

  void checkShufflrAutoNavErrorLanding();
}

if (IS_MAX) {
installMaxPlaylistSyncListener();
void maybeClearStaleEpisodeCachesOnce();
void checkForLaunchStandaloneShow();
void checkForLaunchPlaylist();
void readShuffleSettings().then(settings => {
  orderedEpisodesCached = !!settings.orderedEpisodes;
  shuffleModeCached = settings.shuffleMode;
});
void maybeAutoClickShowPageResume();
void checkShufflrAutoNavErrorLanding();
setTimeout(() => {
  if (!isChromeContextValid()) return;
  startExtensionContextHealthCheck();
  handleShowPageShuffle();
  void updatePlaylistShowUrl();
  tryInjectButton();
  installFullscreenListener();
  installAutoFullscreenRestore();
  startShuffleWatchdog();
  installTimeupdateWatcher();
  installArmedUrlGuard();
  void syncShuffleUIFromStorage().then(() => {
    void maybeAutoClickShowPageResume();
    void prefetchShowPageEpisodeCacheIfStandalone();
  });
  void checkShufflrAutoNavErrorLanding();
}, 2500);
}
