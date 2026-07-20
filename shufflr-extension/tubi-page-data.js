// Shufflr — MAIN-world Tubi page-data bridge
// Reads page-world globals (__REACT_QUERY_STATE__ / __data) and posts to the
// isolated content script. CSP-safe replacement for inline <script> injection.

(function () {
  if (window.__shufflrTubiPageDataBridge) return;
  window.__shufflrTubiPageDataBridge = true;

  let lastHref = location.href;
  let lastPayloadKey = '';

  function extractSeriesIdFromData(d) {
    if (!d) return null;
    try {
      const path = location.pathname;
      const m = path.match(/\/tv-shows\/(\d+)/);
      const vid = m && m[1];
      let seriesId = null;
      if (vid && d.video && d.video.byId && d.video.byId[vid]) {
        seriesId = d.video.byId[vid].series_id;
      }
      if (!seriesId && d.video && d.video.byId) {
        for (const k in d.video.byId) {
          if (d.video.byId[k] && d.video.byId[k].series_id) {
            seriesId = d.video.byId[k].series_id;
            break;
          }
        }
      }
      return seriesId != null ? String(seriesId) : null;
    } catch {
      return null;
    }
  }

  function extractSeriesIdFromReactQueryState(state) {
    if (!state || !Array.isArray(state.queries)) return null;
    try {
      for (const query of state.queries) {
        const data = query && query.state && query.state.data;
        if (!data) continue;
        if (data.id && Array.isArray(data.seasons)) return String(data.id);
        if (data.series_id) return String(data.series_id);
        for (const season of data.seasons || []) {
          for (const episode of season.episodes || []) {
            if (episode && episode.series_id) return String(episode.series_id);
          }
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  function snapshot() {
    let reactQueryState = null;
    let seriesId = null;

    try {
      if (window.__REACT_QUERY_STATE__) {
        reactQueryState = JSON.parse(JSON.stringify(window.__REACT_QUERY_STATE__));
        seriesId = extractSeriesIdFromReactQueryState(reactQueryState);
      }
    } catch {
      reactQueryState = null;
    }

    try {
      if (!seriesId && window.__data) {
        seriesId = extractSeriesIdFromData(window.__data);
      }
    } catch {
      /* ignore */
    }

    return { reactQueryState, seriesId };
  }

  function post() {
    if (location.href !== lastHref) {
      lastHref = location.href;
      lastPayloadKey = '';
    }

    const { reactQueryState, seriesId } = snapshot();
    if (!reactQueryState && !seriesId) return;

    const key = `${location.pathname}|${seriesId || ''}|${reactQueryState ? '1' : '0'}`;
    if (key === lastPayloadKey) return;
    lastPayloadKey = key;

    window.postMessage(
      {
        source: 'shufflr-tubi-page-data',
        href: location.href,
        seriesId: seriesId || null,
        reactQueryState: reactQueryState || null,
      },
      '*'
    );
  }

  // Poll — Tubi hydrates page globals after first paint / SPA navigations.
  setInterval(post, 250);
  post();
})();
