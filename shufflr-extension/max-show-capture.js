// Shufflr — MAIN-world Max show-ID observer
// Observe-only: never modifies requests or responses.
// Sniffs /cms/routes/show/{uuid} (same endpoint Max uses for Episodes UI).

(function () {
  if (window.__shufflrMaxShowCapture) return;
  window.__shufflrMaxShowCapture = true;

  const SHOW_ROUTE_RE = /\/cms\/routes\/show\/([0-9a-f-]{36})/i;

  function reportShowIdFromUrl(url) {
    if (typeof url !== 'string') return;
    const match = url.match(SHOW_ROUTE_RE);
    if (!match) return;
    const showId = match[1];
    window.postMessage(
      {
        source: 'shufflr-max-capture',
        type: 'SHOW_ID_FOUND',
        showId,
      },
      '*'
    );
  }

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : input?.url;
      reportShowIdFromUrl(url);
    } catch {
      /* observe-only — never block the request */
    }
    return origFetch.apply(this, arguments);
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    try {
      if (typeof url === 'string') reportShowIdFromUrl(url);
    } catch {
      /* observe-only — never block the request */
    }
    return origOpen.apply(this, arguments);
  };
})();
