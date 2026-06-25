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
const EPISODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SUPABASE_URL = 'https://bzrwekraevbflypxahan.supabase.co';
const SUPABASE_KEY = 'sb_publishable_kNuk_g4uMWvhrexbh2MBmw_zxJ_7pFz';
const MOVIE_MIN_DURATION_SEC = 4800;
const IS_SHUFFLR_WEB_APP = location.hostname === 'shufflr-app.netlify.app';

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

  if (window.__shufflrShowPageClickInterceptor) {
    try {
      document.removeEventListener('click', handleShowPageEpisodeClick, true);
    } catch {}
    window.__shufflrShowPageClickInterceptor = false;
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
  const storagePayload = { [SHUFFLR_ACTIVE_PLAYLIST_KEY]: payload };
  if (payload.playedByShow) {
    storagePayload[SHUFFLR_EPISODE_STATE_KEY] = {
      playedByShow: payload.playedByShow,
      lastPlayedShow: payload.lastPlayedShow || null,
      roundPlayedShows: payload.roundPlayedShows || [],
      nextEpisodeIndexByShow: payload.nextEpisodeIndexByShow || {},
      playlistName: payload.playlistName || '',
      playlistIndex: payload.playlistIndex ?? 0,
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

if (IS_SHUFFLR_WEB_APP) {
  installWebAppHandoffBridge();
} else {
  installCmsRequestCapture();
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
function isAdPlaying() {
  try {
    if (document.querySelector('[data-testid="player-ux-ad-skip-button"]')) {
      console.log('[Shufflr] ad detection reason: player-ux-ad-skip-button');
      return true;
    }
  } catch {}
  return false;
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

  if (!active?.armed) {
    const standaloneOn = shufflrActive || await isStandaloneShuffleEnabled();
    if (!standaloneOn || settings.orderedEpisodes) return;
    if (!isVideoWatchUrl(prevUrl) || !isVideoWatchUrl(location.href)) return;
    if (maxWatchUrlsRepresentSameEpisode(prevUrl, location.href)) return;
    if (shufflrNavigating || shufflrIsNavigating) return;

    console.log('[Shufflr] Shuffle cop (standalone): Max hijacked navigation, correcting...');
    showToast('Shufflr correcting...');
    if (settings.shuffleMode === 'all') {
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
      await restoreArmedShuffleSession();
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
  if (!active?.armed) return;
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
    updateShufflrAboutToNavigateFromVideo(video);
    if (video.duration - video.currentTime > TIMEUPDATE_SHUFFLE_REMAINING_SEC) return;
    let result;
    try {
      result = await chrome.storage.local.get([SHUFFLR_ACTIVE_PLAYLIST_KEY]);
    } catch (err) {
      if (isExtensionContextInvalidatedError(err)) handleExtensionContextInvalidated();
      return;
    }
    if (!result[SHUFFLR_ACTIVE_PLAYLIST_KEY]?.armed) return;
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
      restoreArmedShuffleSession().catch(err => {
        console.error('[Shufflr] restoreArmedShuffleSession error:', err);
      });
    }, 2500);
    setTimeout(runShuffleWatchdog, UI_RECOVERY_GRACE_MS + 500);
  }
});
if (!IS_SHUFFLR_WEB_APP) {
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
            data-pl-index="${index}"
            aria-label="Shuffle ${name}"
          >▶</button>
          <button
            type="button"
            class="shufflr-pl-action-btn shufflr-pl-add-btn"
            data-pl-index="${index}"
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

  const uuid = getCurrentMaxShowUuid();
  if (!uuid) {
    showToast('Could not find show ID');
    return;
  }

  const title = getCurrentShowTitle();
  const playlists = await readPlaylistsFromStorage();
  playlists.push({
    id: generatePlaylistId(),
    name,
    shows: [{ title, maxId: uuid }],
    episodes: [],
    service: 'max',
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

async function writeYourShowsToStorage(shows) {
  if (!isChromeContextValid()) return;
  await chromeStorageLocalSet({ [SHUFFLR_YOUR_SHOWS_KEY]: shows });
  void syncYourShowsToSupabaseFromExtension(shows);
}

async function addCurrentShowToYourShows() {
  if (!isChromeContextValid()) return;
  const uuid = getCurrentMaxShowUuid();
  if (!uuid) {
    showToast('Could not find show ID');
    return;
  }

  const title = getCurrentShowTitle();
  const shows = await readYourShowsFromStorage();
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
  const uuid = getCurrentMaxShowUuid();
  if (!uuid) {
    showToast('Could not find show ID');
    return;
  }

  const title = getCurrentShowTitle();
  const playlists = await readPlaylistsFromStorage();
  const playlist = playlists[playlistIndex];
  if (!playlist) {
    showToast('Playlist not found');
    return;
  }

  if (!playlist.shows) playlist.shows = [];

  const alreadyAdded = playlist.shows.some(show => (
    show.maxId === uuid || show.maxShowId === uuid || show.max_id === uuid
  ));
  if (alreadyAdded) {
    showToast(`Already in ${playlist.name || 'playlist'}`);
    return;
  }

  playlist.shows.push({ title, maxId: uuid });
  // Tag the playlist with the service it belongs to if not already set.
  if (!playlist.service) playlist.service = 'max';
  await writePlaylistsToStorage(playlists);
  showToast(`Added ${title} to ${playlist.name || 'playlist'}`);

  const dropdown = document.getElementById('shufflr-playlist-dropdown');
  if (dropdown?.classList.contains('open')) {
    await populatePlaylistDropdown();
  }
}

async function populatePlaylistDropdown() {
  if (!isChromeContextValid()) return;
  const dropdown = document.getElementById('shufflr-playlist-dropdown');
  if (!dropdown) return;
  dropdownPlaylists = await readPlaylistsFromStorage();
  const settings = await readShuffleSettings();
  dropdown.innerHTML = renderPlaylistDropdownContent(dropdownPlaylists, settings);
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

async function saveOrderedShowRotationState(playlist, show, showId, playlistIndex, roundPlayedShows) {
  if (!isChromeContextValid()) return;
  const showTitle = getPlaylistShowTitle(show);
  const activePayload = {
    armed: true,
    playlistName: playlist.name || '',
    playlistIndex,
    shows: [...(playlist.shows || [])],
    episodes: [...(playlist.episodes || [])],
    selectedService: 'max',
    currentShow: { showId, showName: showTitle },
    currentEpisode: null,
    currentEpisodeUrl: null,
    sessionStartedAt: Date.now(),
  };
  const stored = await storageLocalGet(SHUFFLR_EPISODE_STATE_KEY);
  const episodeState = {
    ...(stored && typeof stored === 'object' ? stored : {}),
    lastPlayedShow: showId,
    roundPlayedShows: serializeRoundPlayedShows(roundPlayedShows),
    playlistName: playlist.name || '',
    playlistIndex,
  };

  await chromeStorageLocalSet({
    [SHUFFLR_ACTIVE_PLAYLIST_KEY]: activePayload,
    [SHUFFLR_EPISODE_STATE_KEY]: episodeState,
  });
}

async function updateOrderedCurrentEpisodeFromUrl(active, url) {
  if (!isChromeContextValid() || !active?.armed) return;
  const hint = getShowMaxIdHintFromActive(active);
  const episodeId = getMaxEpisodeIdFromUrl(url, hint);
  if (!episodeId) return;

  const showId = resolveShowIdForCop(url, active);
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

// Ordered Episodes: round-robin across show pages only — Max handles episode order and resume.
async function navigateToNextOrderedShow(source) {
  if (!isChromeContextValid()) return;
  if (isAdPlaying()) return;
  if (shufflrEpisodeTransitionLock) {
    console.log(`[Shufflr] Show transition already in progress (${source})`);
    return;
  }

  const active = await getActivePlaylistFromStorage();
  if (!active?.armed) return;

  shufflrEpisodeTransitionLock = true;
  shufflrActive = true;
  armedPlaylistCached = true;
  console.log(`[Shufflr] Ordered mode — next show via ${source}`);

  try {
    const sourcePlaylist = await resolvePlaylistForShuffle(active);
    const playlistIndex = active.playlistIndex ?? 0;
    const preparedPlaylist = preparePlaylistForShuffle(sourcePlaylist);
    if (!preparedPlaylist.shows.length) {
      showToast('No shows with Max ID');
      return;
    }

    let { lastPlayedShow, roundPlayedShows } =
      await loadEpisodeStateForPlaylist(preparedPlaylist, playlistIndex);
    if (!(roundPlayedShows instanceof Set)) {
      roundPlayedShows = deserializeRoundPlayedShows(roundPlayedShows);
    }

    const nextShow = pickNextShowRoundRobin(preparedPlaylist.shows, lastPlayedShow, roundPlayedShows);
    if (!nextShow) {
      showToast('No shows available in playlist');
      return;
    }

    const showMaxId = getPlaylistShowMaxId(nextShow);
    if (!showMaxId) return;

    const showId = normalizeMaxId(showMaxId);
    roundPlayedShows.add(showId);

    const showUrl = buildMaxShowPageUrl(showMaxId);
    const showTitle = getPlaylistShowTitle(nextShow);
    const status = document.getElementById('shufflr-status');

    await saveOrderedShowRotationState(
      preparedPlaylist,
      nextShow,
      showId,
      playlistIndex,
      roundPlayedShows
    );

    showToast(`Next show: ${showTitle}`);
    if (status) status.textContent = showTitle.toUpperCase().slice(0, 24);

    shufflrTargetWatchUrl = null;
    shufflrTargetEpisodeId = null;
    sessionStorage.setItem(SHUFFLR_AUTOPLAY_PENDING_KEY, 'true');
    location.href = showUrl;
  } catch (err) {
    console.error('[Shufflr] navigateToNextOrderedShow error:', err);
  } finally {
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

async function saveArmedActivePlaylist(playlist, playlistIndex) {
  if (!isChromeContextValid()) return;
  const payload = {
    armed: true,
    playlistName: playlist.name || '',
    playlistIndex,
    shows: [...(playlist.shows || [])],
    episodes: [...(playlist.episodes || [])],
    selectedService: 'max',
    sessionStartedAt: Date.now(),
  };

  const ok = await chromeStorageLocalSet({ [SHUFFLR_ACTIVE_PLAYLIST_KEY]: payload });
  if (ok) {
    console.log('[Shufflr] Armed playlist saved to chrome.storage.local');
  }
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
  return storageLocalGet(SHUFFLR_ACTIVE_PLAYLIST_KEY);
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
      const statusName = playlistName && playlistName !== YOUR_SHOWS_ALL_MODE_NAME
        ? playlistName
        : (playlistName === YOUR_SHOWS_ALL_MODE_NAME ? 'Your Shows' : '');
      status.textContent = statusName
        ? statusName.toUpperCase().slice(0, 24)
        : 'WAITING FOR EP END...';
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
  if (!isChromeContextValid()) return false;
  const active = await getActivePlaylistFromStorage();
  armedPlaylistCached = !!active?.armed;

  if (!active?.armed) {
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
  return true;
}

async function restoreArmedShuffleSession() {
  if (!isChromeContextValid()) return false;
  return fullyRestoreArmedShuffleSessionAfterInject();
}

async function syncShuffleUIFromStorage() {
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
  const maintainSession = shufflrActive || active?.armed;
  if (!maintainSession) {
    cancelUiRecoveryGraceTimer();
    return;
  }

  if (hasShufflrButtonInDom()) {
    console.log('[Shufflr] Watchdog: button returned during grace period — no recovery needed');
    cancelUiRecoveryGraceTimer();
    await restoreArmedShuffleSession();
    return;
  }

  cancelUiRecoveryGraceTimer();
  await recoverShufflrUI(reason);
  await fullyRestoreArmedShuffleSessionAfterInject();
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
  if (!active?.armed) return;

  shufflrEpisodeTransitionLock = true;
  shufflrActive = true;
  armedPlaylistCached = true;
  console.log(`[Shufflr] Playlist next episode via ${source}`);

  try {
    const settings = await readShuffleSettings();
    orderedEpisodesCached = !!settings.orderedEpisodes;
    shuffleModeCached = settings.shuffleMode;
    if (settings.orderedEpisodes) {
      await navigateToNextOrderedShow(source);
    } else if (settings.shuffleMode === 'all') {
      await shuffleFromYourShowsAllMode(active);
    } else {
      await shuffleFromActivePlaylist(active);
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
      await restoreArmedShuffleSession();
      return;
    }
    shufflrPendingEpisodeId = null;
    if (maxWatchUrlsRepresentSameEpisode(prevUrl, location.href, showHint)) {
      await restoreArmedShuffleSession();
    }
    return;
  }

  if (shufflrEpisodeTransitionLock) return;
  if (!active?.armed) return;

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
      await restoreArmedShuffleSession();
    }
    return;
  }

  if (maxWatchUrlsRepresentSameEpisode(prevUrl, location.href, showHint)) {
    console.log('[Shufflr] URL format changed for same episode — restoring armed UI');
    await restoreArmedShuffleSession();
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
    sessionStartedAt: Date.now(),
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
  const standaloneShows = await readYourShowsFromStorage();
  return collectYourShowsFromLists(playlists, standaloneShows);
}

async function shuffleFromYourShowsAllMode(activePayload) {
  if (!isChromeContextValid()) return;
  const playlists = await readPlaylistsFromStorage();
  const yourShows = await getYourShowsFromPlaylists(playlists);
  if (!yourShows.length) {
    showToast('No shows with Max ID in Your Shows');
    const status = document.getElementById('shufflr-status');
    if (status) status.textContent = 'NO YOUR SHOWS';
    return;
  }

  const syntheticPayload = {
    ...(activePayload || {}),
    playlistName: YOUR_SHOWS_ALL_MODE_NAME,
    playlistIndex: -1,
    shows: yourShows,
    episodes: [],
  };
  await shuffleFromActivePlaylist(syntheticPayload);
}

async function shuffleFromActivePlaylist(activePayload) {
  if (!isChromeContextValid()) return;
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
      status.textContent = preparedPlaylist.name?.toUpperCase().slice(0, 24) || 'WAITING FOR EP END...';
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
  location.href = watchUrl;
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

  shufflrActive = true;
  armedPlaylistCached = true;
  const playlistName = preparedPlaylist.name || 'Untitled';
  if (!isChromeContextValid()) return;
  updateShuffleUI(playlistName);
  showToast(`Playlist: ${playlistName} — will shuffle when episode ends`);
}

async function playPlaylistFromDropdown(playlistIndex) {
  if (!isChromeContextValid()) return;
  const session = await getStoredAuthSession();
  if (!session?.userId || !session?.accessToken) {
    showToast('You must sign in to use this feature.');
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
    if (video) attachVideoListeners(video);
    return fullyRestoreArmedShuffleSessionAfterInject();
  }
  const isVideoPage = location.href.includes('/video/') || location.href.includes('/play/');
  const isShowPage = location.href.includes('/show/');
  if (!isVideoPage && !isShowPage) return Promise.resolve(false);

  if (isShowPage) {
    saveShowPageUrl(location.href);
    injectShufflrButton(null);
    return fullyRestoreArmedShuffleSessionAfterInject();
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
  return fullyRestoreArmedShuffleSessionAfterInject();
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
      await fullyRestoreArmedShuffleSessionAfterInject();
      return;
    }

    const video = document.querySelector('video');
    if (video) {
      injectShufflrButton(video);
      prefetchEpisodeList();
      await fullyRestoreArmedShuffleSessionAfterInject();
      scheduleVideoListenerRestore(500);
      return;
    }

    setTimeout(() => {
      if (!isChromeContextValid()) return;
      tryInjectButton().then(() => {
        fullyRestoreArmedShuffleSessionAfterInject().catch(err => {
          console.error('[Shufflr] post-inject restore error:', err);
        });
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
    armedPlaylistCached = !!active?.armed;
    const maintainSession = shufflrActive || active?.armed;
    if (!maintainSession) {
      cancelUiRecoveryGraceTimer();
      return;
    }

    if (active?.armed && !shufflrActive) {
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

      if (shufflrActive && active?.armed) {
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
    void fullyRestoreArmedShuffleSessionAfterInject();
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

  void fullyRestoreArmedShuffleSessionAfterInject();
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
  if (!active?.armed) {
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
    maxAutoNextArmedCache = !!active?.armed;
    if (active?.armed) {
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
    maxAutoNextArmedCache = !!active?.armed;
    if (!active?.armed) return;

    if (active?.armed) {
      const target = getShufflrTargetFromActive(active);
      shufflrTargetWatchUrl = target.watchUrl;
      shufflrTargetEpisodeId = target.episodeId;
      shufflrTargetShowHint = target.showHint;
    }

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

  if (active) {
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
    if (active?.armed || await isStandaloneShuffleEnabled()) {
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
      btn.classList.add('active');
      label.textContent = 'ON';
      const active = await getActivePlaylistFromStorage();
      if (active?.armed && active.playlistName) {
        await setStandaloneShuffleEnabled(false);
        if (!isChromeContextValid()) return;
        updateShuffleUI(active.playlistName);
        showToast(`Playlist: ${active.playlistName} — will shuffle when episode ends`);
      } else {
        await setStandaloneShuffleEnabled(true);
        startShuffleWatchdog();
        attachShuffleListenersIfVideoPage();
        if (!isChromeContextValid()) return;
        updateShuffleUI('');
        showToast('Shufflr ON — will shuffle when episode ends');
      }
    } else {
      await setStandaloneShuffleEnabled(false);
      await clearActivePlaylist();
      armedPlaylistCached = false;
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
  const active = await getActivePlaylistFromStorage();
  if (active?.armed) {
    shufflrActive = true;
    armedPlaylistCached = true;
  } else if (!shufflrActive && await isStandaloneShuffleEnabled()) {
    shufflrActive = true;
  }
  if (!shufflrActive && !active?.armed) return;
  if (active?.armed) {
    if (orderedEpisodesCached) return;
    if (shufflrEpisodeTransitionLock) return;
    await handleShufflrNextEpisode('video-ended');
    return;
  }
  const settings = await readShuffleSettings();
  shuffleModeCached = settings.shuffleMode;
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
  'x-wbd-device-consent',
  'x-wbd-preferred-language',
  'x-wbd-session-state',
  'x-wbd-time-zone',
];

function installCmsRequestCapture() {
  if (window.__shufflrCmsCapture) return;
  window.__shufflrCmsCapture = true;

  const saveFromUrl = (url, headers) => {
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
  };

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    if (url?.includes('/cms/collections/') && url.includes('pf[show.id]')) {
      const headers = init?.headers || (input instanceof Request ? input.headers : null);
      saveFromUrl(url, headers);
    }
    return origFetch.call(this, input, init);
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (typeof url === 'string' && url.includes('/cms/collections/') && url.includes('pf[show.id]')) {
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

  const response = await fetch(url, {
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

  const found = [];
  for (let season = 1; season <= 40; season++) {
    const json = await fetchExpressContent(showId, season);
    const episodes = parseEpisodesFromCmsResponse(json);
    if (!episodes.length) break;
    found.push(season);
    cachedPayloads.set(season, json);
  }

  console.log(`[Shufflr] Probed ${found.length} season(s)`);
  return found.length ? found : [1];
}

// ── EPISODE CACHE (chrome.storage.local, 24h TTL) ─────────────────────────
function episodeCacheKey(showId) {
  return `${EPISODE_CACHE_PREFIX}${showId}`;
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
async function shuffleToRandomEpisode() {
  if (isAdPlaying()) return;
  const status = document.getElementById('shufflr-status');
  const showPage = knownShowPageUrl || sessionStorage.getItem(SHUFFLR_SHOW_PAGE_KEY);
  const lastEpisodeUrl = location.href;

  if (!showPage) {
    showToast('Visit the show page first so Shufflr can find all episodes.');
    if (status) status.textContent = 'NO SHOW PAGE';
    console.log('[Shufflr] Aborting — no knownShowPageUrl');
    return;
  }

  console.log(`[Shufflr] Shuffle triggered from: ${lastEpisodeUrl}`);
  if (status) status.textContent = 'FETCHING EPISODES...';
  showToast('Fetching episode list via API...');

  let episodes = null;
  try {
    episodes = await collectEpisodesViaApi(showPage);
  } catch (err) {
    console.log('[Shufflr] API fetch error:', err);
  }

  if (!episodes?.length) {
    console.log('[Shufflr] API empty/failed — falling back to show-page DOM scrape');
    sessionStorage.setItem(SHUFFLR_PENDING_KEY, JSON.stringify({ lastEpisodeUrl, showPageUrl: showPage }));
    if (status) status.textContent = 'LOADING SHOW PAGE...';
    showToast('API unavailable — loading show page...');
    shufflrAboutToNavigate = false;
    captureFullscreenBeforeShufflrNavigation();
    location.href = showPage;
    return;
  }

  await navigateToRandomEpisode(episodes, lastEpisodeUrl, status);
}

async function handleShowPageShuffle() {
  if (shuffleInProgress) return;

  const raw = sessionStorage.getItem(SHUFFLR_PENDING_KEY);
  if (!raw) return;

  shuffleInProgress = true;
  let pending;
  try {
    pending = JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(SHUFFLR_PENDING_KEY);
    shuffleInProgress = false;
    return;
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
    console.log('[Shufflr] Waiting 2000ms then scraping DOM...');
    await wait(2000);
    episodes = await collectEpisodesFromAllSeasons();
  }

  if (!episodes?.length) {
    showToast('Could not find episodes on show page.');
    shuffleInProgress = false;
    return;
  }

  await navigateToRandomEpisode(episodes, pending.lastEpisodeUrl, document.getElementById('shufflr-status'));
  shuffleInProgress = false;
}

async function navigateToRandomEpisode(episodes, lastEpisodeUrl, status) {
  if (isAdPlaying()) return;
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
  location.href = pick;
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

async function openSeasonDropdown(stepLabel) {
  console.log(`[Shufflr] ${stepLabel}: finding season dropdown button...`);
  const dropdown = findSeasonDropdownButton();
  if (!dropdown) return false;

  console.log(`[Shufflr] ${stepLabel}: clicking dropdown button "${dropdown.label}"...`);
  clickElement(dropdown.el);
  console.log(`[Shufflr] ${stepLabel}: click dispatched`);

  console.log(`[Shufflr] ${stepLabel}: waiting 500ms for dropdown to open...`);
  await wait(500);
  console.log(`[Shufflr] ${stepLabel}: dropdown open wait complete`);
  return true;
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
  addLinks(extractEpisodeLinksFromPage(), 'Step 1 default season');

  let dropdownReady = false;
  for (let attempt = 1; attempt <= 8; attempt++) {
    console.log(`[Shufflr] Step 2.${attempt}: trying to open season dropdown...`);
    dropdownReady = await openSeasonDropdown(`Step 2.${attempt}`);
    if (dropdownReady) break;
    console.log(`[Shufflr] Step 2.${attempt}: retrying in 500ms...`);
    await wait(500);
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

    console.log(`[Shufflr] Step ${sub}d: waiting 2000ms for episodes to load...`);
    await wait(2000);
    console.log(`[Shufflr] Step ${sub}d: wait complete`);

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

// Returns true when the click target is inside Shufflr's injected UI.
function isShufflrUiClick(target) {
  return !!target?.closest('[id^="shufflr"], [class*="shufflr-"]');
}

// Finds the nearest episode watch link from a show-page click target.
function findEpisodeLinkFromClick(target) {
  const anchor = target?.closest('a[href*="/video/watch/"], a[href*="/video/"], a[href*="/play/"]');
  if (!anchor?.href || anchor.href.includes('javascript')) return null;
  if (!isVideoWatchUrl(anchor.href)) return null;
  return anchor;
}

// Sync pre-checks before intercepting a show-page episode click.
function shouldInterceptShowPageEpisodeClick() {
  if (!location.href.includes('/show/')) return false;
  if (!shufflrActive) return false;
  if (armedPlaylistCached) return false;
  if (orderedEpisodesCached) return false;
  return true;
}

// Standalone mode: intercept show-page episode clicks and redirect to a random episode.
async function handleShowPageEpisodeClick(e) {
  if (!isChromeContextValid()) return;
  if (!shouldInterceptShowPageEpisodeClick()) return;
  if (isShufflrUiClick(e.target)) return;

  const anchor = findEpisodeLinkFromClick(e.target);
  if (!anchor) return;

  const clickedUrl = normalizeEpisodeUrl(anchor.href);

  e.preventDefault();
  e.stopPropagation();
  if (typeof e.stopImmediatePropagation === 'function') {
    e.stopImmediatePropagation();
  }

  const active = await getActivePlaylistFromStorage();
  if (active?.armed) {
    location.href = clickedUrl;
    return;
  }

  const settings = await readShuffleSettings();
  orderedEpisodesCached = !!settings.orderedEpisodes;
  if (settings.orderedEpisodes) {
    location.href = clickedUrl;
    return;
  }

  if (!shufflrActive && !(await isStandaloneShuffleEnabled())) {
    location.href = clickedUrl;
    return;
  }

  const showId = extractShowId(location.href) || extractMaxShowUuidFromUrl(location.href);
  if (!showId) {
    location.href = clickedUrl;
    return;
  }

  saveShowPageUrl(location.href);

  let episodes = await getCachedEpisodes(showId);
  if (!episodes?.length) {
    showToast('Loading episodes...');
    episodes = await collectEpisodesViaApi(location.href);
  }

  if (!episodes?.length) {
    showToast('Could not load episode list.');
    location.href = clickedUrl;
    return;
  }

  const showHint = showId;
  const currentKeys = buildCurrentEpisodeKeys(clickedUrl, showHint);
  const pool = episodes.filter(ep => !isCurrentEpisode(ep, currentKeys, showHint));

  if (!pool.length) {
    showToast('No other episodes to shuffle to.');
    location.href = clickedUrl;
    return;
  }

  const pick = pool[Math.floor(Math.random() * pool.length)];
  console.log(`[Shufflr] Show-page click shuffle: ${clickedUrl} → ${pick}`);

  const episodeId = getMaxEpisodeIdFromUrl(pick, showHint);
  beginShufflrNavigation(episodeId);
  console.log('[Shufflr] Show-page intercept fired, navigating to:', pick.id);
  beginShufflrNavigation(pick.id);
}

// Capture-phase listener so we intercept episode clicks before Max navigates.
function installShowPageEpisodeClickInterceptor() {
  if (window.__shufflrShowPageClickInterceptor) return;
  window.__shufflrShowPageClickInterceptor = true;
  document.addEventListener('click', handleShowPageEpisodeClick, true);
}

// Warm the CMS episode cache on show pages when standalone shuffle is active.
async function prefetchShowPageEpisodeCacheIfStandalone() {
  if (!isChromeContextValid()) return;
  if (!location.href.includes('/show/')) return;
  if (!shufflrActive || armedPlaylistCached || orderedEpisodesCached) return;

  const active = await getActivePlaylistFromStorage();
  if (active?.armed) return;

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
  if (!active?.armed) return;

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
async function checkForLaunchStandaloneShow() {
  if (!isChromeContextValid()) return;
  const result = await chrome.storage.local.get([
    SHUFFLR_LAUNCH_SHOW_URL_KEY,
    SHUFFLR_LAUNCH_STANDALONE_KEY,
  ]);
  const launchUrl = result[SHUFFLR_LAUNCH_SHOW_URL_KEY];
  const isStandaloneLaunch = result[SHUFFLR_LAUNCH_STANDALONE_KEY];
  if (!isStandaloneLaunch || !launchUrl) return;

  const currentUrl = window.location.href.split('?')[0];
  let launchPath = '';
  try {
    launchPath = new URL(launchUrl).pathname;
  } catch {
    return;
  }
  if (!launchPath || !currentUrl.includes(launchPath)) return;

  const launchMaxId = extractMaxShowUuidFromUrl(launchUrl);
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

  await chromeStorageLocalRemove(SHUFFLR_LAUNCH_SHOW_URL_KEY);
  await chromeStorageLocalRemove(SHUFFLR_LAUNCH_STANDALONE_KEY);
  await clearActivePlaylist();
  armedPlaylistCached = false;
  await setStandaloneShuffleEnabled(true);
  shufflrActive = true;

  setTimeout(() => {
    if (!isChromeContextValid()) return;
    tryInjectButton();
  }, 1500);
}

async function checkForLaunchPlaylist() {
  if (!isChromeContextValid()) return;
  const result = await chrome.storage.local.get([
    SHUFFLR_ACTIVE_PLAYLIST_KEY,
    SHUFFLR_LAUNCH_SHOW_URL_KEY,
  ]);
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

  await saveArmedActivePlaylist(prepared, playlistIndex);
  await setStandaloneShuffleEnabled(true);
  shufflrActive = true;
  armedPlaylistCached = true;

  setTimeout(() => {
    if (!isChromeContextValid()) return;
    tryInjectButton();
  }, 1500);
}

if (!IS_SHUFFLR_WEB_APP) {
installMaxPlaylistSyncListener();
void checkForLaunchStandaloneShow();
void checkForLaunchPlaylist();
void readShuffleSettings().then(settings => {
  orderedEpisodesCached = !!settings.orderedEpisodes;
  shuffleModeCached = settings.shuffleMode;
});
void maybeAutoClickShowPageResume();
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
  installShowPageEpisodeClickInterceptor();
  void syncShuffleUIFromStorage().then(() => {
    void maybeAutoClickShowPageResume();
    void prefetchShowPageEpisodeCacheIfStandalone();
  });
}, 2500);
}
